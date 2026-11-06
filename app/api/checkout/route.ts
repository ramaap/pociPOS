import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface CheckoutItemPayload {
  productId: string;
  quantity: number;
}

interface CheckoutRequestBody {
  outletId: string;
  items: CheckoutItemPayload[];
  paymentMethod: "QRIS" | "Cash";
  offlineId?: string; // Client UUID for idempotent offline-first sync
}

export async function POST(req: Request) {
  try {
    const body: CheckoutRequestBody = await req.json();
    const { outletId, items, paymentMethod = "QRIS", offlineId } = body;

    // 1. Validation
    if (!outletId) {
      return NextResponse.json(
        { error: "Outlet ID (Kedai) wajib dipilih!" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Keranjang pesanan masih kosong!" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Item atau jumlah tidak valid untuk productId: ${item.productId}` },
          { status: 400 }
        );
      }
    }

    // 2. Idempotency Check (Idempotent replay untuk sinkronisasi offline)
    if (offlineId) {
      const existingTx = await prisma.transaction.findUnique({
        where: { offline_id: offlineId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (existingTx) {
        return NextResponse.json(
          {
            message: "Transaksi sudah tersimpan sebelumnya (Idempotent replay)",
            transaction: existingTx,
            synced: true,
          },
          { status: 200 }
        );
      }
    }

    // 3. Ambil data produk & resep BOM
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        active_status: true,
      },
      include: {
        recipes: {
          include: {
            raw_material: true,
          },
        },
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Beberapa produk tidak ditemukan atau dinonaktifkan." },
        { status: 404 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 4. Hitung total amount & agregasi pengurangan BOM
    let totalAmount = 0;
    const rawMaterialDeductionMap = new Map<
      string,
      {
        rawMaterialId: string;
        name: string;
        unit: string;
        deductQuantity: number;
      }
    >();

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      totalAmount += product.price * item.quantity;

      for (const bom of product.recipes) {
        const requiredAmount = bom.quantity * item.quantity;
        const existing = rawMaterialDeductionMap.get(bom.raw_material_id);

        if (existing) {
          existing.deductQuantity += requiredAmount;
        } else {
          rawMaterialDeductionMap.set(bom.raw_material_id, {
            rawMaterialId: bom.raw_material_id,
            name: bom.raw_material.name,
            unit: bom.raw_material.unit,
            deductQuantity: requiredAmount,
          });
        }
      }
    }

    // 5. Eksekusi Atomic Transaction untuk Outlet Terpilih
    const result = await prisma.$transaction(async (tx) => {
      const deductions = Array.from(rawMaterialDeductionMap.values());
      const updatedMaterials = [];

      for (const deduction of deductions) {
        // Cari stok bahan baku khusus di kedai/outlet ini
        const boothStock = await tx.boothStock.findUnique({
          where: {
            outlet_id_raw_material_id: {
              outlet_id: outletId,
              raw_material_id: deduction.rawMaterialId,
            },
          },
        });

        if (!boothStock) {
          throw new Error(`Data stok ${deduction.name} belum terdaftar di kedai ini.`);
        }

        const dedNameLower = deduction.name.toLowerCase();
        if (dedNameLower.includes("kantong teh") || dedNameLower.includes("tea premix") || dedNameLower.includes("cair")) {
          // Kantong teh / premix diseduh teko besar dan bukan acuan penghambat checkout kasir
          continue;
        }

        // Strict Check: Larang jika stok tidak mencukupi / menjadi minus
        if (boothStock.current_stock < deduction.deductQuantity) {
          throw new Error(
            `Stok ${deduction.name} di kedai ini tidak mencukupi! Sisa: ${Math.round(
              boothStock.current_stock
            )} ${deduction.unit}, dibutuhkan: ${deduction.deductQuantity} ${deduction.unit}.`
          );
        }

        // Potong stok mandiri outlet
        const updated = await tx.boothStock.update({
          where: {
            outlet_id_raw_material_id: {
              outlet_id: outletId,
              raw_material_id: deduction.rawMaterialId,
            },
          },
          data: {
            current_stock: {
              decrement: deduction.deductQuantity,
            },
          },
        });

        updatedMaterials.push({
          id: deduction.rawMaterialId,
          name: deduction.name,
          unit: deduction.unit,
          deducted: deduction.deductQuantity,
          remainingStock: updated.current_stock,
        });
      }

      // Buat Transaksi Penjualan yang terikat dengan Outlet
      const createdTransaction = await tx.transaction.create({
        data: {
          outlet_id: outletId,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          offline_id: offlineId || null,
          items: {
            create: items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              unit_price: productMap.get(item.productId)!.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true },
              },
            },
          },
        },
      });

      return {
        transaction: createdTransaction,
        materialsDeducted: updatedMaterials,
      };
    });

    return NextResponse.json(
      {
        success: true,
        transaction: result.transaction,
        inventoryDeductions: result.materialsDeducted,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Multi-outlet checkout error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal memproses transaksi checkout.",
      },
      { status: 400 }
    );
  }
}
