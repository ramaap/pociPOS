import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCentralVault, mutateCentralCash } from "@/lib/centralCash";

export async function GET() {
  try {
    const outlets = await prisma.outlet.findMany({
      include: {
        _count: {
          select: {
            transactions: true,
            shiftClosings: true,
            stocks: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const enrichedOutlets = await Promise.all(
      outlets.map(async (outlet) => {
        const isShiftClosed = outlet.shift_status === "closed";
        const shiftStartTime = outlet.last_opened_at ? new Date(outlet.last_opened_at) : todayStart;

        let todayCupsSold = 0;
        let todayCashIn = 0;
        let todayExpenseTotal = 0;

        if (!isShiftClosed) {
          // Total cup terjual pada shift aktif (hanya cup berbayar, promo gratis dikecualikan dari target)
          const todayItems = await prisma.transactionItem.findMany({
            where: {
              unit_price: { gt: 0 },
              transaction: {
                outlet_id: outlet.id,
                created_at: { gte: shiftStartTime },
              },
            },
            select: { quantity: true },
          });
          todayCupsSold = todayItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

          // Pemasukan kas tunai pada shift aktif
          const cashTxs = await prisma.transaction.findMany({
            where: {
              outlet_id: outlet.id,
              created_at: { gte: shiftStartTime },
              payment_method: { in: ["Cash", "cash", "tunai", "Tunai"] },
            },
            select: { total_amount: true },
          });
          todayCashIn = cashTxs.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

          // Pengeluaran kasir pada shift aktif
          const expenses = await prisma.expense.findMany({
            where: {
              outlet_id: outlet.id,
              date: { gte: shiftStartTime },
            },
            select: { amount: true },
          });
          todayExpenseTotal = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        }

        const initialCash = outlet.initial_cash || 0;
        let currentCashBalance = initialCash + todayCashIn - todayExpenseTotal;
        let lastClosingCash: number | null = null;
        if (isShiftClosed) {
          const lastClosing = await prisma.shiftClosing.findFirst({
            where: { outlet_id: outlet.id },
            orderBy: { created_at: "desc" },
            select: { actual_cash: true },
          });
          if (lastClosing && lastClosing.actual_cash !== undefined) {
            lastClosingCash = lastClosing.actual_cash;
          }
          // Saat shift kasir ditutup dari FE, kas fisik di laci bernilai 0 (uang disetor/disimpan)
          currentCashBalance = 0;
        }

        return {
          ...outlet,
          todayCupsSold,
          todayCashIn,
          todayExpenseTotal,
          currentCashBalance,
          lastClosingCash,
        };
      })
    );

    const centralVault = await getCentralVault();

    return NextResponse.json({ outlets: enrichedOutlets, centralVault });
  } catch (error) {
    console.error("Failed to fetch outlets:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar kedai" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, code, name, address, active_status, target_cups, initial_cash } = body;

    // 1. TAMBAH KEDAI BARU
    if (action === "create") {
      if (!name) {
        return NextResponse.json({ error: "Nama kedai wajib diisi" }, { status: 400 });
      }

      // Generate kode outlet otomatis jika kosong (misal OUT-03, OUT-04)
      let finalCode = code?.trim()?.toUpperCase();
      if (!finalCode) {
        const count = await prisma.outlet.count();
        finalCode = `OUT-${String(count + 1).padStart(2, "0")}`;
      }

      // Cek apakah kode sudah digunakan
      const existing = await prisma.outlet.findUnique({ where: { code: finalCode } });
      if (existing) {
        return NextResponse.json({ error: `Kode kedai '${finalCode}' sudah terdaftar` }, { status: 400 });
      }

      const targetCupsNum = target_cups !== undefined ? Number(target_cups) : 100;
      const initialCashNum = initial_cash !== undefined ? Number(initial_cash) : 0;
      const validInitialCash = !isNaN(initialCashNum) && initialCashNum >= 0 ? initialCashNum : 0;

      const newOutlet = await prisma.outlet.create({
        data: {
          code: finalCode,
          name: name.trim(),
          address: address?.trim() || null,
          active_status: active_status ?? true,
          target_cups: !isNaN(targetCupsNum) && targetCupsNum > 0 ? targetCupsNum : 100,
          initial_cash: validInitialCash,
        },
      });

      if (validInitialCash > 0) {
        await mutateCentralCash({
          amount: -validInitialCash,
          type: "disburse_float",
          outletId: newOutlet.id,
          notes: `Alokasi modal kas awal pendirian ${newOutlet.name}: -Rp ${validInitialCash.toLocaleString("id-ID")} (memotong Kas Induk Pusat)`,
        });
      }

      // Otomatis inisialisasi semua stok bahan baku (RawMaterial) untuk kedai baru ini dengan nilai 0
      const allMaterials = await prisma.rawMaterial.findMany();
      if (allMaterials.length > 0) {
        await prisma.boothStock.createMany({
          data: allMaterials.map((m) => ({
            outlet_id: newOutlet.id,
            raw_material_id: m.id,
            current_stock: 0,
          })),
        });
      }

      // Otomatis inisialisasi ketersediaan seluruh menu aktif untuk kedai baru ini
      const allProducts = await prisma.product.findMany({ where: { active_status: true } });
      if (allProducts.length > 0) {
        await prisma.outletProduct.createMany({
          data: allProducts.map((p) => ({
            outlet_id: newOutlet.id,
            product_id: p.id,
            is_available: true,
          })),
        });
      }

      return NextResponse.json({
        success: true,
        message: `Kedai ${newOutlet.name} (${newOutlet.code}) berhasil ditambahkan.`,
        outlet: newOutlet,
      });
    }

    // 2. UPDATE KEDAI
    if (action === "update") {
      if (!id) {
        return NextResponse.json({ error: "ID kedai wajib disertakan" }, { status: 400 });
      }

      if (code) {
        const cleanCode = code.trim().toUpperCase();
        const checkExisting = await prisma.outlet.findFirst({
          where: {
            code: cleanCode,
            NOT: { id },
          },
        });
        if (checkExisting) {
          return NextResponse.json({ error: `Kode kedai '${cleanCode}' sudah digunakan oleh kedai lain.` }, { status: 400 });
        }
      }

      const targetCupsNum = target_cups !== undefined ? Number(target_cups) : undefined;
      const initialCashNum = initial_cash !== undefined ? Number(initial_cash) : undefined;

      const existingOutlet = await prisma.outlet.findUnique({ where: { id } });

      const updated = await prisma.outlet.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(code && { code: code.trim().toUpperCase() }),
          ...(address !== undefined && { address: address?.trim() || null }),
          ...(active_status !== undefined && { active_status: Boolean(active_status) }),
          ...(targetCupsNum !== undefined && !isNaN(targetCupsNum) && targetCupsNum > 0 && { target_cups: targetCupsNum }),
          ...(initialCashNum !== undefined && !isNaN(initialCashNum) && initialCashNum >= 0 && { initial_cash: initialCashNum }),
        },
      });

      // Sinkronisasi otomatis dua arah Modal Kas Awal dengan Kas Induk Gudang Pusat
      if (initialCashNum !== undefined && !isNaN(initialCashNum) && initialCashNum >= 0 && existingOutlet) {
        const oldCash = existingOutlet.initial_cash || 0;
        const delta = initialCashNum - oldCash;
        if (delta !== 0) {
          await mutateCentralCash({
            amount: -delta, // delta > 0 memotong kas pusat, delta < 0 menambah kas pusat
            type: delta > 0 ? "disburse_float" : "return_float",
            outletId: id,
            notes: delta > 0
              ? `Alokasi penambahan modal kas awal ${existingOutlet.name}: +Rp ${delta.toLocaleString("id-ID")} (memotong Kas Induk Pusat)`
              : `Pengurangan modal kas awal ${existingOutlet.name}: -Rp ${Math.abs(delta).toLocaleString("id-ID")} (dikembalikan menambah Kas Induk Pusat)`,
          });
        }
      }

      const centralVault = await getCentralVault();

      return NextResponse.json({
        success: true,
        message: `Data kedai ${updated.name} berhasil diperbarui dan disinkronkan dengan Kas Induk Pusat.`,
        outlet: updated,
        centralVault,
      });
    }

    // 3. HAPUS KEDAI
    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ error: "ID kedai wajib disertakan" }, { status: 400 });
      }

      const target = await prisma.outlet.findUnique({
        where: { id },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      });

      if (!target) {
        return NextResponse.json({ error: "Kedai tidak ditemukan" }, { status: 404 });
      }

      // Jika kedai memiliki histori transaksi penjualan, lakukan soft delete (nonaktifkan) demi integritas audit keuangan
      if (target._count.transactions > 0) {
        await prisma.outlet.update({
          where: { id },
          data: { active_status: false },
        });
        return NextResponse.json({
          success: true,
          message: `Kedai ${target.name} dinonaktifkan (arsip aman karena memiliki histori penjualan).`,
        });
      } else {
        // Jika belum ada penjualan sama sekali, boleh di-hard delete bersih
        await prisma.outlet.delete({ where: { id } });
        return NextResponse.json({
          success: true,
          message: `Kedai ${target.name} (${target.code}) berhasil dihapus permanen.`,
        });
      }
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("Outlet management error:", error);
    return NextResponse.json({ error: error?.message || "Gagal memproses kedai" }, { status: 500 });
  }
}

