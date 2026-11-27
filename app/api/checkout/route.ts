import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface CheckoutItemPayload {
  productId: string;
  quantity: number;
  sugarLevel?: "normal" | "less" | "tawar";
  unitPrice?: number;
  isPromoFree?: boolean;
  isPromoVoucher?: boolean;
  voucherCode?: string;
}

interface IssuedVoucherPayload {
  code: string;
  productName?: string;
  expiresAt: string;
  notes?: string;
}

interface CheckoutRequestBody {
  outletId: string;
  items: CheckoutItemPayload[];
  paymentMethod: "QRIS" | "Cash";
  offlineId?: string; // Client UUID for idempotent offline-first sync
  issuedVouchers?: IssuedVoucherPayload[];
  redeemedVoucherCode?: string;
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

    const currentOutlet = await prisma.outlet.findFirst({
      where: {
        OR: [{ id: outletId }, { code: outletId }],
      },
    });

    if (!currentOutlet) {
      return NextResponse.json(
        { error: "Outlet/Kedai tidak ditemukan dalam sistem!" },
        { status: 404 }
      );
    }
    const resolvedOutletId = currentOutlet.id;

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

    // 3. Ambil data produk unik & resep BOM
    const uniqueProductIds = Array.from(new Set(items.map((i) => i.productId)));
    
    // Query seluruh produk berdasarkan ID yang ada di keranjang
    const allMatchingProducts = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
      },
      include: {
        recipes: {
          include: {
            raw_material: true,
          },
        },
      },
    });

    const foundProductMap = new Map(allMatchingProducts.map((p) => [p.id, p]));
    const missingProductIds = uniqueProductIds.filter((id) => !foundProductMap.has(id));
    const inactiveProducts = allMatchingProducts.filter((p) => !p.active_status);

    // Validasi 3A: Cek produk tidak ditemukan atau dinonaktifkan
    if (missingProductIds.length > 0 || inactiveProducts.length > 0) {
      const errorDetails: string[] = [];
      const problematicIds: string[] = [];
      const problematicNames: string[] = [];

      for (const p of inactiveProducts) {
        errorDetails.push(`"${p.name}" (Status: Dinonaktifkan di master menu)`);
        problematicIds.push(p.id);
        problematicNames.push(p.name);
      }

      for (const id of missingProductIds) {
        errorDetails.push(`ID "${id}" (Tidak terdaftar di database master menu)`);
        problematicIds.push(id);
        problematicNames.push(`ID: ${id}`);
      }

      return NextResponse.json(
        {
          error: `Transaksi Gagal: Produk berikut tidak dapat diproses checkout: ${errorDetails.join(", ")}. Silakan hapus produk ini dari keranjang pesanan.`,
          problematicProductIds: problematicIds,
          problematicProductNames: problematicNames,
        },
        { status: 400 }
      );
    }

    // Validasi 3B: Cek Ketersediaan Menu per Kedai (OutletProduct)
    const outletProducts = await prisma.outletProduct.findMany({
      where: {
        outlet_id: resolvedOutletId,
        product_id: { in: uniqueProductIds },
      },
      include: { product: true },
    });

    const disabledAtOutlet = outletProducts.filter((op) => !op.is_available);
    if (disabledAtOutlet.length > 0) {
      const disabledNames = disabledAtOutlet.map((op) => `"${op.product.name}"`).join(", ");
      return NextResponse.json(
        {
          error: `Transaksi Gagal: Menu ${disabledNames} sedang dinonaktifkan di ${currentOutlet.name}. Silakan hapus dari keranjang.`,
          problematicProductIds: disabledAtOutlet.map((op) => op.product_id),
          problematicProductNames: disabledAtOutlet.map((op) => op.product.name),
        },
        { status: 400 }
      );
    }

    const products = allMatchingProducts;
    const productMap = foundProductMap;

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
      const effectiveUnitPrice =
        item.isPromoFree || item.unitPrice === 0
          ? 0
          : item.unitPrice !== undefined
          ? item.unitPrice
          : product.price;

      totalAmount += effectiveUnitPrice * item.quantity;

      // Jika item merupakan voucher klaim nanti (karena stok teh/gula habis saat order),
      // jangan kurangi bahan baku fisik (Cup, Gula, dll) sekarang karena belum disajikan.
      if (item.isPromoVoucher) {
        continue;
      }

      for (const bom of product.recipes) {
        let requiredAmount = bom.quantity * item.quantity;

        // Potong stok gula cair sesuai opsi gula: Full portion (Jumbo 50ml, Reguler 40ml), Less sugar (20ml), Tawar (0ml)
        const isSugar = bom.raw_material.name.toLowerCase().includes("gula");
        if (isSugar) {
          if (item.sugarLevel === "tawar") {
            requiredAmount = 0; // Tanpa gula sama sekali
          } else if (item.sugarLevel === "less") {
            const perCupSugar = 20; // Standar less sugar: 20ml untuk semua jenis cup (Jumbo & Reguler)
            requiredAmount = perCupSugar * item.quantity;
          } else {
            requiredAmount = bom.quantity * item.quantity; // Normal full portion (Jumbo 50ml, Reguler 40ml)
          }
        }

        if (requiredAmount <= 0) continue;

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
              outlet_id: resolvedOutletId,
              raw_material_id: deduction.rawMaterialId,
            },
          },
        });

        if (!boothStock) {
          const affectedProducts = items
            .map((i) => productMap.get(i.productId))
            .filter((p) => p && p.recipes.some((r) => r.raw_material_id === deduction.rawMaterialId));
          const affectedNames = Array.from(new Set(affectedProducts.map((p) => `"${p?.name}"`))).join(", ");
          throw new Error(`Data stok bahan "${deduction.name}" untuk menu ${affectedNames || "pesanan"} belum terdaftar di ${currentOutlet.name}.`);
        }

        const dedNameLower = deduction.name.toLowerCase();
        // Kantong teh / premix cair diseduh per teko besar dan bukan acuan disable checkout
        if (
          dedNameLower.includes("kantong teh") ||
          dedNameLower.includes("teh jasmine") ||
          dedNameLower.includes("teh vanilla") ||
          dedNameLower.includes("tea premix") ||
          dedNameLower.includes("teh seduh") ||
          dedNameLower.includes("liquid tea")
        ) {
          continue;
        }

        // Strict Check: Larang jika stok tidak mencukupi / menjadi minus (Termasuk Gula Cair, Cup, Sachet)
        if (boothStock.current_stock < deduction.deductQuantity) {
          const affectedProducts = items
            .map((i) => productMap.get(i.productId))
            .filter((p) => p && p.recipes.some((r) => r.raw_material_id === deduction.rawMaterialId));
          const affectedNames = Array.from(new Set(affectedProducts.map((p) => `"${p?.name}"`))).join(", ");
          throw new Error(
            `Stok "${deduction.name}" untuk menu ${affectedNames || "pesanan"} di ${currentOutlet.name} tidak mencukupi! Sisa: ${Math.round(
              boothStock.current_stock
            )} ${deduction.unit}, dibutuhkan: ${deduction.deductQuantity} ${deduction.unit}.`
          );
        }

        // Potong stok mandiri outlet
        const updated = await tx.boothStock.update({
          where: {
            outlet_id_raw_material_id: {
              outlet_id: resolvedOutletId,
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
          outlet_id: resolvedOutletId,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          offline_id: offlineId || null,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              const effectivePrice =
                item.isPromoFree || item.unitPrice === 0
                  ? 0
                  : item.unitPrice !== undefined
                  ? item.unitPrice
                  : product.price;

              return {
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: effectivePrice,
              };
            }),
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

      // Simpan data voucher promo baru yang diterbitkan di transaksi ini (jika ada)
      if (body.issuedVouchers && Array.isArray(body.issuedVouchers) && body.issuedVouchers.length > 0) {
        for (const v of body.issuedVouchers) {
          await tx.promoVoucher.create({
            data: {
              code: v.code.trim().toUpperCase(),
              outlet_id: resolvedOutletId,
              product_name: v.productName || "Jasmine Poci Iced Tea (Jumbo)",
              status: "active",
              expires_at: new Date(v.expiresAt),
              notes: v.notes || "Diterbitkan pada pesanan #" + (offlineId || "POS"),
            },
          });
        }
      }

      // Jika transaksi ini menukarkan voucher, tandai voucher sebagai "redeemed"
      if (body.redeemedVoucherCode) {
        await tx.promoVoucher.updateMany({
          where: {
            code: body.redeemedVoucherCode.trim().toUpperCase(),
            status: "active",
          },
          data: {
            status: "redeemed",
            redeemed_at: new Date(),
            redeemed_tx_id: createdTransaction.id,
          },
        });
      }

      return {
        transaction: createdTransaction,
        materialsDeducted: updatedMaterials,
      };
    });

    // Trigger Stock Manager agent (non-blocking)
    import("@/lib/agents/dispatcher")
      .then((d) => d.onCheckout(resolvedOutletId, result.materialsDeducted || []))
      .catch(() => {});

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
