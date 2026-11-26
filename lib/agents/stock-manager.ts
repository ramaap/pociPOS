import { escapeHtml, sendMessage } from "@/lib/telegram";
import { AGENT_CONFIG } from "./config";
import { logAgentEvent } from "./memory";

const lastAlertMap = new Map<string, number>();

/**
 * Cek threshold stok gerai setelah checkout selesai (dengan debounce 30 menit per bahan per outlet)
 */
export async function checkThresholds(
  outletId: string,
  materialsDeducted: Array<{ name: string; remainingStock: number; unit: string }>
): Promise<void> {
  if (!Array.isArray(materialsDeducted) || materialsDeducted.length === 0) return;

  try {
    const { prisma } = await import("@/lib/prisma");
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    const outletName = outlet?.name || outletId;
    const now = Date.now();
    const debounceMs = AGENT_CONFIG.ALERT_DEBOUNCE_MINUTES * 60 * 1000;

    for (const mat of materialsDeducted) {
      const reorderPoint =
        AGENT_CONFIG.BOOTH_REORDER_POINTS[mat.name] ??
        AGENT_CONFIG.BOOTH_REORDER_POINTS.default;

      if (mat.remainingStock < reorderPoint) {
        const key = `${outletId}_${mat.name}`;
        const lastSent = lastAlertMap.get(key) || 0;
        if (now - lastSent < debounceMs) continue;

        lastAlertMap.set(key, now);
        const isZero = mat.remainingStock <= 0;
        const qtyDisplay = Math.max(0, Math.round(mat.remainingStock));

        const summary = isZero
          ? `${mat.name} HABIS (0 ${mat.unit}) di ${outletName}`
          : `${mat.name} menipis di ${outletName} (sisa ${qtyDisplay} ${mat.unit})`;

        await logAgentEvent({
          agentName: "stock_manager",
          eventType: isZero ? "stock_zero" : "stock_low",
          outletId,
          summary,
          details: { material: mat.name, remaining: mat.remainingStock, unit: mat.unit },
        });

        const icon = isZero ? "🛑" : "⚠️";
        const statusTitle = isZero ? "STOK HABIS" : "STOK MENIPIS";

        await sendMessage(
          `${icon} <b>${statusTitle} (${escapeHtml(outletName)})</b>\n` +
            `Bahan: <b>${escapeHtml(mat.name)}</b>\n` +
            `Sisa di kedai: <b>${qtyDisplay} ${escapeHtml(mat.unit)}</b> (batas aman: ${reorderPoint} ${escapeHtml(mat.unit)})\n` +
            `Segera siapkan restock dari Central Kitchen.`
        );
        console.log("[Agent:StockManager]", summary);
      }
    }
  } catch (err) {
    console.warn("[Agent:StockManager] Error checkThresholds:", err);
  }
}

/**
 * Briefing stok pagi pukul 06:00 WIB untuk Central Kitchen & seluruh cabang
 */
export async function sendMorningBriefing(): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const [materials, outlets] = await Promise.all([
      prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
      prisma.outlet.findMany({
        where: { active_status: true },
        orderBy: { code: "asc" },
        include: {
          stocks: {
            include: { raw_material: true },
          },
        },
      }),
    ]);

    const lines: string[] = [
      `☀️ <b>BRIEFING STOK PAGI — TEH POCI</b>`,
      ``,
      `🏭 <b>Central Kitchen (Gudang Pusat):</b>`,
    ];

    let criticalCentralCount = 0;
    for (const m of materials) {
      const limit =
        AGENT_CONFIG.CENTRAL_REORDER_POINTS[m.name] ??
        AGENT_CONFIG.CENTRAL_REORDER_POINTS.default;
      const qty = Math.round(m.master_stock);
      if (qty <= 0) {
        criticalCentralCount++;
        lines.push(`• ${escapeHtml(m.name)}: <b>0 ${escapeHtml(m.unit)}</b> 🛑 HABIS`);
      } else if (qty < limit) {
        criticalCentralCount++;
        lines.push(`• ${escapeHtml(m.name)}: <b>${qty} ${escapeHtml(m.unit)}</b> ⚠️ Menipis`);
      }
    }
    if (criticalCentralCount === 0) {
      lines.push(`• Semua bahan gudang pusat aman ✅`);
    }

    for (const outlet of outlets) {
      lines.push(``);
      lines.push(`🏪 <b>${escapeHtml(outlet.name)} (${escapeHtml(outlet.code)}):</b>`);
      const lowItems: string[] = [];

      for (const s of outlet.stocks) {
        const mName = s.raw_material.name;
        const limit =
          AGENT_CONFIG.BOOTH_REORDER_POINTS[mName] ??
          AGENT_CONFIG.BOOTH_REORDER_POINTS.default;
        const qty = Math.round(s.current_stock);
        if (qty <= 0) {
          lowItems.push(`• ${escapeHtml(mName)}: <b>0 ${escapeHtml(s.raw_material.unit)}</b> 🛑`);
        } else if (qty < limit) {
          lowItems.push(`• ${escapeHtml(mName)}: <b>${qty} ${escapeHtml(s.raw_material.unit)}</b> ⚠️`);
        }
      }

      if (lowItems.length === 0) {
        lines.push(`• Semua stok kedai aman ✅`);
      } else {
        lines.push(...lowItems);
      }
    }

    await logAgentEvent({
      agentName: "stock_manager",
      eventType: "morning_briefing",
      summary: `Briefing stok pagi terkirim (${criticalCentralCount} bahan gudang kritis)`,
    });

    await sendMessage(lines.join("\n"));
    console.log("[Agent:StockManager] Morning briefing terkirim.");
  } catch (err) {
    console.warn("[Agent:StockManager] Error sendMorningBriefing:", err);
  }
}
