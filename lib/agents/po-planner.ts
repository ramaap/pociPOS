import { AGENT_CONFIG } from "./config";
import { logAgentEvent } from "./memory";

export interface MaterialForecast {
  raw_material_id: string;
  name: string;
  unit: string;
  central_stock: number;
  booth_stock_total: number;
  avg_daily_usage: number;
  days_left_central: number;
  reorder_threshold: number;
  needs_order: boolean;
  recommended_qty: number;
}

export interface POItemPayload {
  raw_material_id: string;
  name: string;
  unit: string;
  current_stock: number;
  avg_daily_usage: number;
  days_left: number;
  order_qty: number;
  unit_cost?: number;
}

/**
 * Menghitung kecepatan pemakaian bahan baku 14 hari terakhir (Sales Velocity)
 * & memprediksi kebutuhan order ke Supplier.
 */
export async function calculateDemandForecast(): Promise<MaterialForecast[]> {
  const { prisma } = await import("@/lib/prisma");
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [materials, recentTxItems] = await Promise.all([
    prisma.rawMaterial.findMany({
      orderBy: { name: "asc" },
      include: { boothStocks: true },
    }),
    prisma.transactionItem.findMany({
      where: {
        transaction: {
          created_at: { gte: fourteenDaysAgo },
        },
      },
      include: {
        transaction: { select: { created_at: true } },
        product: {
          include: {
            recipes: true,
          },
        },
      },
    }),
  ]);

  // Hitung jumlah hari aktif transaksi dalam 14 hari terakhir (minimal 1 hari)
  const activeDaysSet = new Set<string>();
  const usage14dMap = new Map<string, number>();

  for (const item of recentTxItems) {
    const dayKey = item.transaction.created_at.toISOString().slice(0, 10);
    activeDaysSet.add(dayKey);

    for (const bom of item.product.recipes) {
      const prev = usage14dMap.get(bom.raw_material_id) || 0;
      usage14dMap.set(bom.raw_material_id, prev + bom.quantity * item.quantity);
    }
  }

  const activeDays = Math.max(1, activeDaysSet.size);

  return materials.map((m) => {
    const totalUsed = usage14dMap.get(m.id) || 0;
    const avgDaily = Number((totalUsed / activeDays).toFixed(2));
    const centralStock = Math.round(m.master_stock);
    const boothTotal = Math.round(
      m.boothStocks.reduce((acc, s) => acc + s.current_stock, 0)
    );
    const daysLeft =
      avgDaily > 0 ? Number((centralStock / avgDaily).toFixed(1)) : 999;

    const threshold =
      AGENT_CONFIG.CENTRAL_REORDER_POINTS[m.name] ??
      AGENT_CONFIG.CENTRAL_REORDER_POINTS.default;

    const needsOrder =
      centralStock < threshold || (avgDaily > 0 && daysLeft <= 3);

    // Target cakupan stok: 8 hari pemakaian (7 hari operasional + 1 hari buffer pengiriman)
    const targetStock = Math.max(threshold * 2, Math.ceil(avgDaily * 8));
    const recommendedQty = needsOrder
      ? Math.max(threshold, targetStock - centralStock)
      : 0;

    return {
      raw_material_id: m.id,
      name: m.name,
      unit: m.unit,
      central_stock: centralStock,
      booth_stock_total: boothTotal,
      avg_daily_usage: avgDaily,
      days_left_central: daysLeft,
      reorder_threshold: threshold,
      needs_order: needsOrder,
      recommended_qty: recommendedQty,
    };
  });
}

export function formatSupplierDraftMessage(
  poNumber: string,
  supplierName: string | null | undefined,
  items: POItemPayload[],
  notes?: string | null
): string {
  const todayStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const sapaan = supplierName ? `Halo ${supplierName},` : "Halo Bapak/Ibu Supplier,";
  const itemLines = items.map(
    (it, idx) =>
      `${idx + 1}. ${it.name}: ${it.order_qty.toLocaleString("id-ID")} ${it.unit}`
  );

  return [
    sapaan,
    `Kami dari *Teh Poci* ingin melakukan pemesanan bahan baku (${poNumber} - ${todayStr}):`,
    "",
    ...itemLines,
    ...(notes ? ["", `Catatan: ${notes}`] : []),
    "",
    "Mohon konfirmasi ketersediaan stok, total tagihan, dan estimasi pengirimannya. Terima kasih!",
  ].join("\n");
}

/**
 * Membuat Draft PO (HANYA berstatus "draft" — tidak pernah mengirim otomatis ke supplier).
 */
export async function createDraftPurchaseOrder(params: {
  createdBy: "owner" | "agent_draft";
  supplierId?: string | null;
  items?: POItemPayload[];
  notes?: string | null;
}) {
  const { prisma } = await import("@/lib/prisma");
  let orderItems = params.items;

  if (!orderItems || orderItems.length === 0) {
    const forecast = await calculateDemandForecast();
    const needed = forecast.filter((f) => f.needs_order && f.recommended_qty > 0);
    if (needed.length === 0) {
      return null;
    }
    orderItems = needed.map((n) => ({
      raw_material_id: n.raw_material_id,
      name: n.name,
      unit: n.unit,
      current_stock: n.central_stock,
      avg_daily_usage: n.avg_daily_usage,
      days_left: n.days_left_central,
      order_qty: n.recommended_qty,
      unit_cost: 0,
    }));
  }

  const supplier = params.supplierId
    ? await prisma.supplier.findUnique({ where: { id: params.supplierId } })
    : null;

  const dateCode = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  const randSuffix = Math.floor(100 + Math.random() * 900);
  const poNumber = `PO-${dateCode}-${randSuffix}`;

  const draftMessage = formatSupplierDraftMessage(
    poNumber,
    supplier?.name,
    orderItems,
    params.notes
  );

  const totalEstimated = orderItems.reduce(
    (acc, it) => acc + (it.unit_cost || 0) * it.order_qty,
    0
  );

  const po = await prisma.purchaseOrder.create({
    data: {
      po_number: poNumber,
      supplier_id: supplier?.id || null,
      status: "draft",
      created_by: params.createdBy,
      items_json: JSON.stringify(orderItems),
      draft_message: draftMessage,
      total_estimated: totalEstimated,
      notes: params.notes || null,
    },
    include: { supplier: true },
  });

  await logAgentEvent({
    agentName: "stock_manager",
    eventType: "po_draft_created",
    summary: `Draft ${poNumber} dibuat (${orderItems.length} item, status: draft)`,
    details: { poNumber, createdBy: params.createdBy, itemCount: orderItems.length },
  });

  return po;
}
