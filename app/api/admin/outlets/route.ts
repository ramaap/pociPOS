import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ outlets });
  } catch (error) {
    console.error("Failed to fetch outlets:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar kedai" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, code, name, address, active_status, target_cups } = body;

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

      const newOutlet = await prisma.outlet.create({
        data: {
          code: finalCode,
          name: name.trim(),
          address: address?.trim() || null,
          active_status: active_status ?? true,
          target_cups: !isNaN(targetCupsNum) && targetCupsNum > 0 ? targetCupsNum : 100,
        },
      });

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

      const updated = await prisma.outlet.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(code && { code: code.trim().toUpperCase() }),
          ...(address !== undefined && { address: address?.trim() || null }),
          ...(active_status !== undefined && { active_status: Boolean(active_status) }),
          ...(targetCupsNum !== undefined && !isNaN(targetCupsNum) && targetCupsNum > 0 && { target_cups: targetCupsNum }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Data kedai ${updated.name} berhasil diperbarui.`,
        outlet: updated,
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

