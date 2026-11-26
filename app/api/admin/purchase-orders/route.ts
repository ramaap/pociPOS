import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateDemandForecast,
  createDraftPurchaseOrder,
  formatSupplierDraftMessage,
  POItemPayload,
} from "@/lib/agents/po-planner";

export async function GET() {
  try {
    const [forecast, purchaseOrders, suppliers] = await Promise.all([
      calculateDemandForecast(),
      prisma.purchaseOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { supplier: true },
      }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({ forecast, purchaseOrders, suppliers });
  } catch (error) {
    console.error("GET purchase-orders error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data prediksi & PO" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supplierId = body?.supplier_id || null;
    const notes = body?.notes || null;
    const customItems: POItemPayload[] | undefined = Array.isArray(body?.items)
      ? body.items
      : undefined;

    const po = await createDraftPurchaseOrder({
      createdBy: "owner",
      supplierId,
      items: customItems,
      notes,
    });

    if (!po) {
      return NextResponse.json(
        { error: "Semua stok Central Kitchen masih aman, tidak ada item yang perlu di-order." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, purchaseOrder: po }, { status: 201 });
  } catch (error) {
    console.error("POST purchase-order error:", error);
    return NextResponse.json({ error: "Gagal membuat draft PO" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, supplier_id, draft_message } = body;

    if (!id) {
      return NextResponse.json({ error: "ID PO wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
    }

    // Jika ditandai "received" (dan sebelumnya belum "received"), otomatis masukkan stok ke Central Kitchen
    if (status === "received" && existing.status !== "received") {
      const items: POItemPayload[] = JSON.parse(existing.items_json || "[]");
      await prisma.$transaction(async (tx) => {
        for (const it of items) {
          if (it.raw_material_id && it.order_qty > 0) {
            await tx.rawMaterial.update({
              where: { id: it.raw_material_id },
              data: { master_stock: { increment: it.order_qty } },
            });
            await tx.stockTransferLog.create({
              data: {
                raw_material_id: it.raw_material_id,
                from_location: "supplier",
                to_location: "central",
                quantity: it.order_qty,
                type: "central_in",
                notes: `Penerimaan ${existing.po_number}`,
              },
            });
          }
        }

        await tx.purchaseOrder.update({
          where: { id },
          data: { status: "received" },
        });
      });

      const updated = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { supplier: true },
      });
      return NextResponse.json({ success: true, purchaseOrder: updated });
    }

    // Update status, supplier, atau regenerate draft message
    let nextMessage = draft_message ?? existing.draft_message;
    let nextSupplierId = supplier_id !== undefined ? supplier_id : existing.supplier_id;

    if (supplier_id !== undefined && !draft_message) {
      const sup = supplier_id
        ? await prisma.supplier.findUnique({ where: { id: supplier_id } })
        : null;
      const items: POItemPayload[] = JSON.parse(existing.items_json || "[]");
      nextMessage = formatSupplierDraftMessage(
        existing.po_number,
        sup?.name,
        items,
        existing.notes
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: status || existing.status,
        supplier_id: nextSupplierId || null,
        draft_message: nextMessage,
      },
      include: { supplier: true },
    });

    return NextResponse.json({ success: true, purchaseOrder: updated });
  } catch (error) {
    console.error("PATCH purchase-order error:", error);
    return NextResponse.json({ error: "Gagal memperbarui PO" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID PO diperlukan" }, { status: 400 });
    }
    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE purchase-order error:", error);
    return NextResponse.json({ error: "Gagal menghapus PO" }, { status: 500 });
  }
}
