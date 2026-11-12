import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminPin } from "@/lib/pin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outletId,
      rawMaterialId,
      addedQuantity,
      quantity,
      mode = "add", // "add" | "restock" | "return" | "central_in" | "central_set" | "set" | "zero_all" | "bulk_set"
      updates, // for bulk_set: [{ rawMaterialId, currentStock }]
      notes,
      pin,
    } = body;

    const ADMIN_PIN = getAdminPin();
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "PIN Admin tidak valid." }, { status: 401 });
    }

    // 1. Mode: Zero All (Kosongkan Semua Stok Kedai ke 0)
    if (mode === "zero_all") {
      if (!outletId) {
        return NextResponse.json({ error: "Outlet ID wajib dipilih." }, { status: 400 });
      }
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

    // 2. Mode: Bulk Set (Opname Semua Stok Kedai Sekaligus)
    if (mode === "bulk_set" && Array.isArray(updates)) {
      if (!outletId) {
        return NextResponse.json({ error: "Outlet ID wajib dipilih." }, { status: 400 });
      }
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

    // 3. Mode: Central In (Penerimaan dari Supplier ke Gudang Pusat / Central Kitchen)
    if (mode === "central_in") {
      const targetQty = typeof quantity === "number" ? quantity : addedQuantity;
      if (!rawMaterialId || typeof targetQty !== "number" || targetQty <= 0) {
        return NextResponse.json({ error: "Bahan baku dan jumlah pasokan masuk tidak valid (> 0)." }, { status: 400 });
      }

      const rawMat = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
      if (!rawMat) {
        return NextResponse.json({ error: "Bahan baku tidak ditemukan." }, { status: 404 });
      }

      const updated = await prisma.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
          master_stock: { increment: targetQty },
        },
      });

      await prisma.stockTransferLog.create({
        data: {
          raw_material_id: rawMaterialId,
          from_location: "supplier",
          to_location: "central",
          quantity: targetQty,
          type: "central_in",
          notes: notes || "Penerimaan pasokan baru dari supplier ke Gudang Pusat",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil menerima pasokan +${targetQty.toLocaleString("id-ID")} ${updated.unit} ke Master Stock Gudang Pusat. Total stok pusat: ${updated.master_stock.toLocaleString("id-ID")} ${updated.unit}.`,
        rawMaterial: updated,
      });
    }

    // 4. Mode: Central Set (Opname / Koreksi Stok Gudang Pusat Langsung)
    if (mode === "central_set") {
      const targetQty = typeof quantity === "number" ? quantity : addedQuantity;
      if (!rawMaterialId || typeof targetQty !== "number" || targetQty < 0) {
        return NextResponse.json({ error: "Bahan baku dan nilai stok pusat tidak valid (>= 0)." }, { status: 400 });
      }

      const updated = await prisma.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
          master_stock: targetQty,
        },
      });

      await prisma.stockTransferLog.create({
        data: {
          raw_material_id: rawMaterialId,
          from_location: "adjustment",
          to_location: "central",
          quantity: targetQty,
          type: "adjustment",
          notes: notes || "Koreksi opname stok fisik Gudang Pusat",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Stok Gudang Pusat untuk ${updated.name} berhasil diset menjadi ${targetQty.toLocaleString("id-ID")} ${updated.unit}.`,
        rawMaterial: updated,
      });
    }

    // Operasi berikut membutuhkan outletId
    if (!outletId) {
      return NextResponse.json({ error: "Outlet ID wajib dipilih." }, { status: 400 });
    }

    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet) {
      return NextResponse.json({ error: "Kedai tidak ditemukan." }, { status: 404 });
    }

    const targetQty = typeof quantity === "number" ? quantity : addedQuantity;

    if (!rawMaterialId || typeof targetQty !== "number" || targetQty < 0) {
      return NextResponse.json(
        { error: "Bahan baku dan nilai stok tidak valid (harus berupa angka >= 0)." },
        { status: 400 }
      );
    }

    const rawMat = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    if (!rawMat) {
      return NextResponse.json({ error: "Bahan baku tidak ditemukan." }, { status: 404 });
    }

    // 5. Mode: Return (Retur Bahan Baku dari Kedai ke Gudang Pusat)
    // "demikian juga sebaliknya" -> potong stok kedai, tambah master stock
    if (mode === "return") {
      if (targetQty <= 0) {
        return NextResponse.json({ error: "Jumlah retur harus lebih dari 0." }, { status: 400 });
      }

      const currentBoothStock = await prisma.boothStock.findUnique({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: outletId,
            raw_material_id: rawMaterialId,
          },
        },
      });

      const availableInBooth = currentBoothStock?.current_stock || 0;
      if (availableInBooth < targetQty) {
        return NextResponse.json(
          {
            error: `Stok di ${outlet.name} tidak cukup untuk diretur! Tersedia: ${availableInBooth.toLocaleString("id-ID")} ${rawMat.unit}, diminta retur: ${targetQty.toLocaleString("id-ID")} ${rawMat.unit}.`,
          },
          { status: 400 }
        );
      }

      const updatedBooth = await prisma.boothStock.update({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: outletId,
            raw_material_id: rawMaterialId,
          },
        },
        data: {
          current_stock: { decrement: targetQty },
        },
        include: { outlet: true, raw_material: true },
      });

      const updatedMaster = await prisma.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
          master_stock: { increment: targetQty },
        },
      });

      await prisma.stockTransferLog.create({
        data: {
          raw_material_id: rawMaterialId,
          from_location: outletId,
          to_location: "central",
          quantity: targetQty,
          type: "return",
          notes: notes || `Retur bahan baku dari ${outlet.name} kembali ke Central Kitchen`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil retur ${rawMat.name} sebanyak ${targetQty.toLocaleString("id-ID")} ${rawMat.unit} dari ${outlet.name} ke Gudang Pusat. (Sisa kedai: ${updatedBooth.current_stock.toLocaleString("id-ID")} ${rawMat.unit}, Stok Pusat: ${updatedMaster.master_stock.toLocaleString("id-ID")} ${rawMat.unit}).`,
        boothStock: updatedBooth,
        rawMaterial: updatedMaster,
      });
    }

    // 6. Mode: Set (Opname Mandiri Kedai)
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
        message: `Stok ${updated.raw_material.name} di ${updated.outlet.name} diset menjadi ${targetQty.toLocaleString("id-ID")} ${updated.raw_material.unit}.`,
        boothStock: updated,
      });
    }

    // 7. Mode: Add / Restock (Kirim dari Central Kitchen ke Kedai)
    // "setiap stock di kasir akan memotong master stock"
    if (targetQty <= 0) {
      return NextResponse.json({ error: "Jumlah restock harus lebih dari 0." }, { status: 400 });
    }

    // Potong Master Stock Gudang Pusat
    const updatedMaster = await prisma.rawMaterial.update({
      where: { id: rawMaterialId },
      data: {
        master_stock: { decrement: targetQty },
      },
    });

    // Tambah Booth Stock Kedai
    const updatedBooth = await prisma.boothStock.upsert({
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

    // Catat log perpindahan stok
    await prisma.stockTransferLog.create({
      data: {
        raw_material_id: rawMaterialId,
        from_location: "central",
        to_location: outletId,
        quantity: targetQty,
        type: "restock",
        notes: notes || `Restock dari Central Kitchen ke ${outlet.name}`,
      },
    });

    let warningText = "";
    if (updatedMaster.master_stock < 0) {
      warningText = ` ⚠️ Perhatian: Master stock di Gudang Pusat kini negatif (${updatedMaster.master_stock.toLocaleString("id-ID")} ${updatedMaster.unit}). Segera lakukan penerimaan pasokan supplier!`;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil restock ${updatedBooth.raw_material.name} sebanyak +${targetQty.toLocaleString("id-ID")} ${updatedBooth.raw_material.unit} ke ${updatedBooth.outlet.name}. Master Stock terpotong -${targetQty.toLocaleString("id-ID")} (Sisa Pusat: ${updatedMaster.master_stock.toLocaleString("id-ID")} ${updatedMaster.unit}).${warningText}`,
      boothStock: updatedBooth,
      rawMaterial: updatedMaster,
    });
  } catch (error) {
    console.error("Stock update error:", error);
    return NextResponse.json({ error: "Gagal memperbarui stok bahan baku outlet." }, { status: 500 });
  }
}
