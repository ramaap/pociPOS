import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminPin } from "@/lib/pin";
import { getCentralVault, mutateCentralCash, setCentralVaultCash } from "@/lib/centralCash";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outletId,
      rawMaterialId,
      addedQuantity,
      quantity,
      amount,
      direction,
      mode = "add", // "add" | "restock" | "return" | "central_in" | "central_set" | "set" | "zero_all" | "bulk_set" | "central_cash_topup" | "central_cash_set" | "cash_transfer"
      updates, // for bulk_set: [{ rawMaterialId, targetStock, currentStock }]
      notes,
      pin,
    } = body;

    const ADMIN_PIN = getAdminPin();
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "PIN Admin tidak valid." }, { status: 401 });
    }

    // 1. Mode: Zero All (Kosongkan Semua Stok Kedai ke 0 -> Seluruh sisa stok otomatis dikembalikan ke Master Stock)
    if (mode === "zero_all") {
      if (!outletId) {
        return NextResponse.json({ error: "Outlet ID wajib dipilih." }, { status: 400 });
      }
      const existingStocks = await prisma.boothStock.findMany({
        where: { outlet_id: outletId },
        include: { raw_material: true },
      });

      for (const bs of existingStocks) {
        if (bs.current_stock > 0) {
          await prisma.rawMaterial.update({
            where: { id: bs.raw_material_id },
            data: { master_stock: { increment: bs.current_stock } },
          });

          await prisma.stockTransferLog.create({
            data: {
              raw_material_id: bs.raw_material_id,
              from_location: outletId,
              to_location: "central",
              quantity: bs.current_stock,
              type: "return",
              notes: `Reset stok kedai ke 0: seluruh sisa ${bs.current_stock} ${bs.raw_material.unit} dikembalikan ke Gudang Pusat`,
            },
          });
        }
      }

      await prisma.boothStock.updateMany({
        where: { outlet_id: outletId },
        data: { current_stock: 0 },
      });

      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });

      return NextResponse.json({
        success: true,
        message: `Seluruh sisa stok bahan baku di ${outlet?.name || "kedai"} berhasil diset ke 0 dan dikembalikan menambah Master Stock Gudang Pusat.`,
      });
    }

    // 2. Mode: Bulk Set (Opname Semua Stok Kedai Sekaligus -> Selisih otomatis memotong/menambah Master Stock)
    if (mode === "bulk_set" && Array.isArray(updates)) {
      if (!outletId) {
        return NextResponse.json({ error: "Outlet ID wajib dipilih." }, { status: 400 });
      }
      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });

      for (const item of updates) {
        const targetVal = typeof item.targetStock === "number"
          ? item.targetStock
          : typeof item.currentStock === "number"
          ? item.currentStock
          : undefined;

        if (item.rawMaterialId && typeof targetVal === "number" && targetVal >= 0) {
          const oldStockRecord = await prisma.boothStock.findUnique({
            where: {
              outlet_id_raw_material_id: {
                outlet_id: outletId,
                raw_material_id: item.rawMaterialId,
              },
            },
            include: { raw_material: true },
          });

          const oldVal = oldStockRecord?.current_stock || 0;
          const delta = targetVal - oldVal;

          await prisma.boothStock.upsert({
            where: {
              outlet_id_raw_material_id: {
                outlet_id: outletId,
                raw_material_id: item.rawMaterialId,
              },
            },
            update: {
              current_stock: targetVal,
            },
            create: {
              outlet_id: outletId,
              raw_material_id: item.rawMaterialId,
              current_stock: targetVal,
            },
          });

          if (delta !== 0) {
            await prisma.rawMaterial.update({
              where: { id: item.rawMaterialId },
              data: {
                master_stock: { decrement: delta },
              },
            });

            const unit = oldStockRecord?.raw_material?.unit || "";
            await prisma.stockTransferLog.create({
              data: {
                raw_material_id: item.rawMaterialId,
                from_location: delta > 0 ? "central" : outletId,
                to_location: delta > 0 ? outletId : "central",
                quantity: Math.abs(delta),
                type: delta > 0 ? "restock" : "return",
                notes: delta > 0
                  ? `Opname ${outlet?.name || "kedai"}: tambah +${delta} ${unit} (memotong Master Stock Pusat)`
                  : `Opname ${outlet?.name || "kedai"}: kurang -${Math.abs(delta)} ${unit} (dikembalikan menambah Master Stock Pusat)`,
              },
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Seluruh stok bahan baku berhasil diperbarui dan disinkronkan dua arah dengan Master Stock Gudang Pusat.",
      });
    }

    // 2B. Mode: Central Cash Top-up (Tambah Kas Induk Gudang Pusat dari Bank / Pemilik)
    if (mode === "central_cash_topup") {
      const topupAmt = typeof amount === "number" ? amount : typeof quantity === "number" ? quantity : 0;
      if (topupAmt <= 0) {
        return NextResponse.json({ error: "Nominal penambahan kas pusat harus lebih dari 0." }, { status: 400 });
      }
      const { vault } = await mutateCentralCash({
        amount: topupAmt,
        type: "topup_central",
        notes: notes || `Top-up Saldo Kas Induk Gudang Pusat: +Rp ${topupAmt.toLocaleString("id-ID")}`,
      });
      return NextResponse.json({
        success: true,
        message: `Saldo Kas Induk Gudang Pusat berhasil ditambah Rp ${topupAmt.toLocaleString("id-ID")}. Total saldo sekarang Rp ${vault.cash_balance.toLocaleString("id-ID")}.`,
        centralVault: vault,
      });
    }

    // 2C. Mode: Central Cash Set (Koreksi Opname Kas Fisik Brankas Pusat)
    if (mode === "central_cash_set") {
      const setAmt = typeof amount === "number" ? amount : typeof quantity === "number" ? quantity : 0;
      if (setAmt < 0) {
        return NextResponse.json({ error: "Nominal saldo kas pusat tidak valid." }, { status: 400 });
      }
      const { vault } = await setCentralVaultCash(setAmt, notes);
      return NextResponse.json({
        success: true,
        message: `Saldo Kas Induk Gudang Pusat berhasil diset ke Rp ${setAmt.toLocaleString("id-ID")}.`,
        centralVault: vault,
      });
    }

    // 2D. Mode: Cash Transfer (Kirim Kas Modal Pusat ke Kedai atau Retur Kas Kedai ke Pusat)
    if (mode === "cash_transfer") {
      const xferAmt = typeof amount === "number" ? amount : typeof quantity === "number" ? quantity : 0;
      if (!outletId || xferAmt <= 0) {
        return NextResponse.json({ error: "Kedai tujuan dan nominal kas wajib diisi dengan benar." }, { status: 400 });
      }
      const targetOutlet = await prisma.outlet.findUnique({ where: { id: outletId } });
      if (!targetOutlet) {
        return NextResponse.json({ error: "Kedai tidak ditemukan." }, { status: 404 });
      }

      const dir = direction || "to_outlet"; // "to_outlet" | "to_central"
      if (dir === "to_outlet") {
        const updatedOutlet = await prisma.outlet.update({
          where: { id: outletId },
          data: { initial_cash: { increment: xferAmt } },
        });
        const { vault } = await mutateCentralCash({
          amount: -xferAmt,
          type: "disburse_float",
          outletId,
          notes: notes || `Transfer Kas Modal dari Pusat ke ${targetOutlet.name}: Rp ${xferAmt.toLocaleString("id-ID")}`,
        });
        return NextResponse.json({
          success: true,
          message: `Berhasil mengirim kas modal Rp ${xferAmt.toLocaleString("id-ID")} dari Gudang Pusat ke ${targetOutlet.name}. Modal awal kedai sekarang Rp ${updatedOutlet.initial_cash.toLocaleString("id-ID")}.`,
          outlet: updatedOutlet,
          centralVault: vault,
        });
      } else {
        const newInitial = Math.max(0, (targetOutlet.initial_cash || 0) - xferAmt);
        const updatedOutlet = await prisma.outlet.update({
          where: { id: outletId },
          data: { initial_cash: newInitial },
        });
        const { vault } = await mutateCentralCash({
          amount: xferAmt,
          type: "return_float",
          outletId,
          notes: notes || `Retur Kas Modal dari ${targetOutlet.name} ke Pusat: Rp ${xferAmt.toLocaleString("id-ID")}`,
        });
        return NextResponse.json({
          success: true,
          message: `Berhasil mengembalikan kas modal Rp ${xferAmt.toLocaleString("id-ID")} dari ${targetOutlet.name} ke Kas Induk Pusat. Modal awal kedai sekarang Rp ${updatedOutlet.initial_cash.toLocaleString("id-ID")}.`,
          outlet: updatedOutlet,
          centralVault: vault,
        });
      }
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

    // 6. Mode: Set (Ubah Jumlah Stok di Kedai -> Selisih mutasi otomatis memotong / menambah Master Stock)
    if (mode === "set") {
      const currentBoothStock = await prisma.boothStock.findUnique({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: outletId,
            raw_material_id: rawMaterialId,
          },
        },
      });

      const oldStock = currentBoothStock?.current_stock || 0;
      const delta = targetQty - oldStock; // delta > 0: kedai bertambah (pusat berkurang). delta < 0: kedai berkurang (pusat bertambah)

      const updatedBooth = await prisma.boothStock.upsert({
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

      let updatedMaster = rawMat;
      if (delta !== 0) {
        updatedMaster = await prisma.rawMaterial.update({
          where: { id: rawMaterialId },
          data: {
            master_stock: { decrement: delta },
          },
        });

        await prisma.stockTransferLog.create({
          data: {
            raw_material_id: rawMaterialId,
            from_location: delta > 0 ? "central" : outletId,
            to_location: delta > 0 ? outletId : "central",
            quantity: Math.abs(delta),
            type: delta > 0 ? "restock" : "return",
            notes: notes || (delta > 0
              ? `Penyesuaian stok di ${outlet.name} (+${delta} ${rawMat.unit}): otomatis memotong Master Stock Pusat`
              : `Penyesuaian stok di ${outlet.name} (-${Math.abs(delta)} ${rawMat.unit}): otomatis dikembalikan menambah Master Stock Pusat`),
          },
        });
      }

      const mutasiMsg = delta === 0
        ? `Stok tetap ${targetQty} ${rawMat.unit}.`
        : delta > 0
        ? `Stok kedai bertambah +${delta} ${rawMat.unit} (Master Stock Pusat terpotong -${delta}, sisa: ${updatedMaster.master_stock.toLocaleString("id-ID")} ${rawMat.unit}).`
        : `Stok kedai berkurang -${Math.abs(delta)} ${rawMat.unit} (Master Stock Pusat bertambah +${Math.abs(delta)}, total: ${updatedMaster.master_stock.toLocaleString("id-ID")} ${rawMat.unit}).`;

      return NextResponse.json({
        success: true,
        message: `Stok ${updatedBooth.raw_material.name} di ${updatedBooth.outlet.name} diset menjadi ${targetQty.toLocaleString("id-ID")} ${updatedBooth.raw_material.unit}. ${mutasiMsg}`,
        boothStock: updatedBooth,
        rawMaterial: updatedMaster,
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
