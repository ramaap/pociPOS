import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outletId,
      rawMaterialId,
      addedQuantity,
      quantity,
      mode = "add", // "add" | "set" | "zero_all" | "bulk_set"
      updates, // for bulk_set: [{ rawMaterialId, currentStock }]
      pin,
    } = body;

    const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "PIN Admin tidak valid." }, { status: 401 });
    }

    if (!outletId) {
      return NextResponse.json({ error: "Outlet ID wajib dipilih." }, { status: 400 });
    }

    // 1. Mode: Zero All (Kosongkan Semua Stok Kedai ke 0)
    if (mode === "zero_all") {
      await prisma.boothStock.updateMany({
        where: { outlet_id: outletId },
        data: { current_stock: 0 },
      });

      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });

      return NextResponse.json({
        success: true,
        message: `Seluruh stok bahan baku di ${outlet?.name || "kedai"} berhasil diset ke 0.`,
      });
    }

    // 2. Mode: Bulk Set (Atur/Opname Semua Stok Sekaligus dari form)
    if (mode === "bulk_set" && Array.isArray(updates)) {
      for (const item of updates) {
        if (item.rawMaterialId && typeof item.currentStock === "number" && item.currentStock >= 0) {
          await prisma.boothStock.upsert({
            where: {
              outlet_id_raw_material_id: {
                outlet_id: outletId,
                raw_material_id: item.rawMaterialId,
              },
            },
            update: {
              current_stock: item.currentStock,
            },
            create: {
              outlet_id: outletId,
              raw_material_id: item.rawMaterialId,
              current_stock: item.currentStock,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Seluruh stok bahan baku berhasil diperbarui sesuai stok fisik riil.",
      });
    }

    // 3. Mode: Set (Setel ke nilai pasti tertentu, misalnya 0, 15, 200, dst)
    const targetQty = typeof quantity === "number" ? quantity : addedQuantity;

    if (!rawMaterialId || typeof targetQty !== "number" || targetQty < 0) {
      return NextResponse.json(
        { error: "Bahan baku dan nilai stok tidak valid (harus berupa angka >= 0)." },
        { status: 400 }
      );
    }

    if (mode === "set") {
      const updated = await prisma.boothStock.upsert({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: outletId,
            raw_material_id: rawMaterialId,
          },
        },
        update: {
          current_stock: targetQty,
        },
        create: {
          outlet_id: outletId,
          raw_material_id: rawMaterialId,
          current_stock: targetQty,
        },
        include: {
          outlet: true,
          raw_material: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Stok ${updated.raw_material.name} di ${updated.outlet.name} diset menjadi ${targetQty} ${updated.raw_material.unit}.`,
        boothStock: updated,
      });
    }

    // 4. Mode: Add (Tambah Stok / Restock)
    if (targetQty <= 0) {
      return NextResponse.json({ error: "Jumlah restock harus lebih dari 0." }, { status: 400 });
    }

    const updated = await prisma.boothStock.upsert({
      where: {
        outlet_id_raw_material_id: {
          outlet_id: outletId,
          raw_material_id: rawMaterialId,
        },
      },
      update: {
        current_stock: {
          increment: targetQty,
        },
      },
      create: {
        outlet_id: outletId,
        raw_material_id: rawMaterialId,
        current_stock: targetQty,
      },
      include: {
        outlet: true,
        raw_material: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil restock ${updated.raw_material.name} sebanyak +${targetQty} ${updated.raw_material.unit} ke ${updated.outlet.name}.`,
      boothStock: updated,
    });
  } catch (error) {
    console.error("Stock update error:", error);
    return NextResponse.json({ error: "Gagal memperbarui stok bahan baku outlet." }, { status: 500 });
  }
}
