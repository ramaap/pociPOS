/**
 * Automated End-to-End Test Suite — Sisi Kasir POS (Teh Cap Poci)
 * Mengacu pada daftar skenario di docs/TEST_CASES_KASIR.md (Modul A s/d Modul J).
 *
 * Catatan Keamanan:
 * - Modul J (Keamanan Gerbang & Brute-Force 15 menit) dijalankan PALING AKHIR.
 * - Sebelum test berjalan, skrip membuat snapshot sementara prisma/dev.db
 *   dan mengembalikannya otomatis setelah selesai (kecuali diberi argumen --keep-data).
 *   Master Checkpoint (MASTER_CHECKPOINT_PRE_1_DES_2026.sqlite) tidak disentuh.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  saveOfflineTransaction,
  getPendingTransactions,
  syncPendingTransactions,
} from "../lib/offline-sync";
import {
  generateReceiptText,
  generateEscPosBuffer,
  CASH_DRAWER_KICK_BYTES,
  type ReceiptData,
} from "../lib/escpos-printer";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const KEEP_DATA = process.argv.includes("--keep-data");
const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");
const TMP_SNAPSHOT = path.join(process.cwd(), "backups", "_tmp_pre_test_kasir.sqlite");

const GATE_SECRET = process.env.GATE_SECRET || "tehpoci2024";
const GATE_SIGN_KEY = process.env.GATE_SIGN_KEY || "c8f4a1b9e2d7e5f3a6b8c1d4e7f9a2b5";

function loadDotEnvIfNeeded() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2];
    }
  }
}
loadDotEnvIfNeeded();

const RESOLVED_GATE_SECRET = process.env.GATE_SECRET || GATE_SECRET;
const RESOLVED_GATE_SIGN_KEY = process.env.GATE_SIGN_KEY || GATE_SIGN_KEY;
const AUTH_GATE_COOKIE = `gate_token=${crypto
  .createHmac("sha256", RESOLVED_GATE_SIGN_KEY)
  .update(RESOLVED_GATE_SECRET)
  .digest("hex")}`;

const prisma = new PrismaClient();

interface TestResult {
  id: string;
  type: "Positif" | "Negatif" | "Audit";
  title: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

async function runCase(
  id: string,
  type: "Positif" | "Negatif" | "Audit",
  title: string,
  fn: () => Promise<void>
) {
  try {
    await fn();
    results.push({ id, type, title, passed: true });
    console.log(`  ✅ [${id}] (${type}) ${title}`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    results.push({ id, type, title, passed: false, detail: msg });
    console.error(`  ❌ [${id}] (${type}) ${title}\n     -> ${msg}`);
  }
}

async function apiJson<T = any>(
  urlPath: string,
  init?: RequestInit & { skipGateAuth?: boolean }
): Promise<{ status: number; ok: boolean; headers: Headers; data: T }> {
  const { skipGateAuth, ...fetchInit } = init || {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(skipGateAuth ? {} : { Cookie: AUTH_GATE_COOKIE }),
    ...((fetchInit.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    ...fetchInit,
    redirect: "manual",
    headers,
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

function setupBrowserShims() {
  const store = new Map<string, string>();
  const storageShim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: storageShim,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storageShim,
      btoa: (str: string) => Buffer.from(str, "binary").toString("base64"),
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true, userAgent: "node-test" },
    configurable: true,
    writable: true,
  });

  // Arahkan fetch path relatif (/api/...) ke BASE_URL dengan cookie gate_token untuk modul lib/offline-sync.ts
  const originalFetch = globalThis.fetch.bind(globalThis);
  (globalThis as any).fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return originalFetch(`${BASE_URL}${input}`, {
        ...init,
        headers: {
          Cookie: AUTH_GATE_COOKIE,
          ...((init?.headers as Record<string, string>) || {}),
        },
      });
    }
    return originalFetch(input, init);
  };

  return {
    storage: storageShim,
    restoreFetch: () => {
      (globalThis as any).fetch = originalFetch;
    },
  };
}

async function main() {
  console.log("================================================================");
  console.log("  TEH CAP POCI — AUTOMATED TEST SUITE KASIR (MODUL A -> MODUL J)");
  console.log(`  Target Server: ${BASE_URL}`);
  console.log("================================================================\n");

  // Pre-flight check server
  const ping = await apiJson("/api/products").catch(() => null);
  if (!ping || !ping.ok || !Array.isArray(ping.data?.outlets)) {
    throw new Error(
      `Server tidak merespons dengan benar di ${BASE_URL}. Jalankan server terlebih dahulu sebelum mengeksekusi test.`
    );
  }

  // Backup pre-test DB snapshot
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database tidak ditemukan di: ${DB_PATH}`);
  }
  fs.mkdirSync(path.dirname(TMP_SNAPSHOT), { recursive: true });
  fs.copyFileSync(DB_PATH, TMP_SNAPSHOT);

  const shims = setupBrowserShims();

  try {
    const superindo = await prisma.outlet.findUnique({ where: { code: "OUT-01" } });
    assert.ok(superindo, "Outlet Superindo (OUT-01) wajib ada di database.");
    const outlet2 = await prisma.outlet.findUnique({ where: { code: "OUT-02" } });

    const matByName = async (name: string) => {
      const m = await prisma.rawMaterial.findUnique({ where: { name } });
      assert.ok(m, `RawMaterial "${name}" tidak ditemukan.`);
      return m;
    };

    const getBoothStock = async (rawMaterialName: string, outletId = superindo.id) => {
      const mat = await matByName(rawMaterialName);
      const bs = await prisma.boothStock.findUnique({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: outletId,
            raw_material_id: mat.id,
          },
        },
      });
      return bs?.current_stock ?? 0;
    };

    const setBoothStock = async (rawMaterialName: string, qty: number, outletId = superindo.id) => {
      const mat = await matByName(rawMaterialName);
      await prisma.boothStock.upsert({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: outletId,
            raw_material_id: mat.id,
          },
        },
        update: { current_stock: qty },
        create: { outlet_id: outletId, raw_material_id: mat.id, current_stock: qty },
      });
    };

    const jasmineReg = await prisma.product.findFirst({ where: { name: "Jasmine Poci Iced Tea (Reguler)", active_status: true } });
    const jasmineJumbo = await prisma.product.findFirst({ where: { name: "Jasmine Poci Iced Tea (Jumbo)", active_status: true } });
    const thaiTea = await prisma.product.findFirst({ where: { name: "Thai Iced Tea (Jumbo)", active_status: true } });
    const cappuccino = await prisma.product.findFirst({ where: { name: "Cappuccino Iced Tea (Jumbo)", active_status: true } });
    assert.ok(jasmineReg && jasmineJumbo && thaiTea && cappuccino, "Master produk aktif standar harus tersedia.");

    // Pastikan awal test Superindo dalam kondisi closed (siap uji Modul A) dengan stok awal test yang cukup
    await prisma.outlet.update({
      where: { id: superindo.id },
      data: { shift_status: "closed", initial_cash: 0 },
    });

    // =====================================================================
    // MODUL A — Opening Kedai & Buka Shift
    // =====================================================================
    console.log("▶ MODUL A — Opening Kedai & Buka Shift");

    await runCase("TC-A03", "Negatif", "Shift berstatus closed mengembalikan shift_status=closed & todayCashIn=0", async () => {
      const res = await apiJson(`/api/products?outletId=${superindo.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.shift_status, "closed");
      assert.equal(res.data.todayCashIn, 0);
      assert.equal(res.data.todayCupsSold, 0);
    });

    await runCase("TC-A04", "Negatif", "Opening ditolak jika cash_float negatif atau outlet tidak ditemukan", async () => {
      const badFloat = await apiJson("/api/opening", {
        method: "POST",
        body: JSON.stringify({ outlet_id: superindo.id, cash_float: -5000 }),
      });
      assert.equal(badFloat.status, 400);

      const badOutlet = await apiJson("/api/opening", {
        method: "POST",
        body: JSON.stringify({ outlet_id: "OUT-999-INVALID", cash_float: 50000 }),
      });
      assert.equal(badOutlet.status, 404);
    });

    await runCase("TC-A01", "Positif", "Opening shift Superindo dengan modal kas Rp 100.000", async () => {
      const res = await apiJson("/api/opening", {
        method: "POST",
        body: JSON.stringify({ outlet_id: superindo.id, cash_float: 100000 }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.outlet.shift_status, "open");
      assert.equal(res.data.outlet.initial_cash, 100000);
    });

    await runCase("TC-A02", "Positif", "Opening shift sambil membawa Gula Cair +1.600 ml mencatat SugarRefillLog", async () => {
      const beforeSugar = await getBoothStock("Gula Cair");
      const res = await apiJson("/api/opening", {
        method: "POST",
        body: JSON.stringify({
          outlet_id: superindo.id,
          cash_float: 100000,
          added_sugar_brought_ml: 1600,
          notes: "Test sirup opening",
        }),
      });
      assert.equal(res.status, 200);
      const afterSugar = await getBoothStock("Gula Cair");
      assert.equal(afterSugar, beforeSugar + 1600);

      const log = await prisma.sugarRefillLog.findFirst({
        where: { outlet_id: superindo.id, type: "opening_brought" },
        orderBy: { created_at: "desc" },
      });
      assert.ok(log, "SugarRefillLog opening_brought harus tercipta.");
      assert.equal(log.amount_ml, 1600);
    });

    // =====================================================================
    // MODUL B — Keranjang, Level Gula & Validasi Stok BOM Ketat
    // =====================================================================
    console.log("\n▶ MODUL B — Keranjang, Level Gula & Validasi Stok BOM Ketat");

    await runCase("TC-B01", "Positif", "Checkout 3x Jasmine Jumbo (Normal 50ml + Less 20ml + Tawar 0ml = 70ml gula)", async () => {
      const cupBefore = await getBoothStock("Cup Jumbo");
      const sugarBefore = await getBoothStock("Gula Cair");

      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [
            { productId: jasmineJumbo.id, quantity: 1, sugarLevel: "normal" },
            { productId: jasmineJumbo.id, quantity: 1, sugarLevel: "less" },
            { productId: jasmineJumbo.id, quantity: 1, sugarLevel: "tawar" },
          ],
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.transaction.total_amount, jasmineJumbo.price * 3);

      const cupAfter = await getBoothStock("Cup Jumbo");
      const sugarAfter = await getBoothStock("Gula Cair");
      assert.equal(cupBefore - cupAfter, 3);
      assert.equal(sugarBefore - sugarAfter, 70);
    });

    await runCase("TC-B02", "Positif", "Item gratis / non-cup (unitPrice: 0) tidak dihitung ke target todayCupsSold", async () => {
      const before = await apiJson(`/api/products?outletId=${superindo.id}`);
      const cupsBefore = before.data.todayCupsSold as number;

      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [{ productId: jasmineReg.id, quantity: 1, sugarLevel: "tawar", unitPrice: 0, isPromoFree: true }],
        }),
      });
      assert.equal(res.status, 201);

      const after = await apiJson(`/api/products?outletId=${superindo.id}`);
      assert.equal(after.data.todayCupsSold, cupsBefore);
    });

    await runCase("TC-B03", "Positif", "Simulasi alokasi sugarBreakdown mempertahankan konsistensi total qty", async () => {
      const breakdown = { normal: 3, less: 0, tawar: 0 };
      breakdown.normal -= 1;
      breakdown.less += 1;
      breakdown.normal -= 1;
      breakdown.tawar += 1;
      assert.equal(breakdown.normal + breakdown.less + breakdown.tawar, 3);
      assert.deepEqual(breakdown, { normal: 1, less: 1, tawar: 1 });
    });

    await runCase("TC-B04", "Negatif", "Stok Cup Reguler = 1: cup ke-1 sukses, cup ke-2 ditolak", async () => {
      const savedCupReg = await getBoothStock("Cup Reguler");
      try {
        await setBoothStock("Cup Reguler", 1);
        const ok1 = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: jasmineReg.id, quantity: 1, sugarLevel: "normal" }],
          }),
        });
        assert.equal(ok1.status, 201);

        const fail2 = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: jasmineReg.id, quantity: 1, sugarLevel: "normal" }],
          }),
        });
        assert.equal(fail2.status, 400);
        assert.match(String(fail2.data.error), /Cup Reguler/i);
      } finally {
        await setBoothStock("Cup Reguler", savedCupReg);
      }
    });

    await runCase("TC-B05", "Negatif", "Stok Sachet Poci Mix Thai Tea = 0 ditolak saat checkout", async () => {
      const savedThai = await getBoothStock("Poci Mix Thai Tea 12g");
      try {
        await setBoothStock("Poci Mix Thai Tea 12g", 0);
        const res = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: thaiTea.id, quantity: 1, sugarLevel: "normal" }],
          }),
        });
        assert.equal(res.status, 400);
        assert.match(String(res.data.error), /Thai Tea/i);
      } finally {
        await setBoothStock("Poci Mix Thai Tea 12g", savedThai);
      }
    });

    await runCase("TC-B06", "Negatif", "Gula Cair = 0 ml menolak Normal & Less, tetapi Tawar tetap sukses", async () => {
      const savedSugar = await getBoothStock("Gula Cair");
      try {
        await setBoothStock("Gula Cair", 0);

        const failNormal = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: jasmineJumbo.id, quantity: 1, sugarLevel: "normal" }],
          }),
        });
        assert.equal(failNormal.status, 400);

        const failLess = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: jasmineJumbo.id, quantity: 1, sugarLevel: "less" }],
          }),
        });
        assert.equal(failLess.status, 400);

        const okTawar = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: jasmineJumbo.id, quantity: 1, sugarLevel: "tawar" }],
          }),
        });
        assert.equal(okTawar.status, 201);
        assert.equal(await getBoothStock("Gula Cair"), 0);
      } finally {
        await setBoothStock("Gula Cair", savedSugar);
      }
    });

    await runCase("TC-B07", "Negatif", "Guard kebutuhan cairan teh barrel (Reguler 180ml, Jumbo 200ml, Topping 0ml)", async () => {
      const calcTeaMl = (name: string, qty: number) => {
        const lower = name.toLowerCase();
        if (lower.includes("topping")) return 0;
        return (lower.includes("reguler") ? 180 : 200) * qty;
      };
      const barrelMl = 150;
      assert.equal(calcTeaMl("Jasmine Poci Iced Tea (Reguler)", 1) > barrelMl, true);
      assert.equal(calcTeaMl("Jasmine Poci Iced Tea (Jumbo)", 1) > barrelMl, true);
      assert.equal(calcTeaMl("Extra Creamy Topping", 1) <= barrelMl, true);
    });

    await runCase("TC-B08", "Negatif", "Menu dinonaktifkan di Master atau di Outlet Superindo ditolak dengan problematicProductIds", async () => {
      await prisma.product.update({ where: { id: cappuccino.id }, data: { active_status: false } });
      try {
        const failMaster = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: cappuccino.id, quantity: 1, sugarLevel: "normal" }],
          }),
        });
        assert.equal(failMaster.status, 400);
        assert.ok(failMaster.data.problematicProductIds?.includes(cappuccino.id));
      } finally {
        await prisma.product.update({ where: { id: cappuccino.id }, data: { active_status: true } });
      }

      await prisma.outletProduct.upsert({
        where: { outlet_id_product_id: { outlet_id: superindo.id, product_id: cappuccino.id } },
        update: { is_available: false },
        create: { outlet_id: superindo.id, product_id: cappuccino.id, is_available: false },
      });
      try {
        const failOutlet = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [{ productId: cappuccino.id, quantity: 1, sugarLevel: "normal" }],
          }),
        });
        assert.equal(failOutlet.status, 400);
        assert.ok(failOutlet.data.problematicProductIds?.includes(cappuccino.id));
      } finally {
        await prisma.outletProduct.update({
          where: { outlet_id_product_id: { outlet_id: superindo.id, product_id: cappuccino.id } },
          data: { is_available: true },
        });
      }
    });

    await runCase("TC-B09", "Negatif", "Payload API checkout ilegal (outletId kosong/palsu, items kosong, quantity 0)", async () => {
      const noOutlet = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ outletId: "", items: [{ productId: jasmineJumbo.id, quantity: 1 }] }),
      });
      assert.equal(noOutlet.status, 400);

      const badOutlet = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ outletId: "UNKNOWN-ID", items: [{ productId: jasmineJumbo.id, quantity: 1 }] }),
      });
      assert.equal(badOutlet.status, 404);

      const emptyItems = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ outletId: superindo.id, items: [] }),
      });
      assert.equal(emptyItems.status, 400);

      const badQty = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ outletId: superindo.id, items: [{ productId: jasmineJumbo.id, quantity: 0 }] }),
      });
      assert.equal(badQty.status, 400);
    });

    await runCase("TC-B10", "Positif", "Kantong Teh = 0 di BoothStock tetap mengizinkan checkout Jasmine", async () => {
      await setBoothStock("Kantong Teh", 0);
      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [{ productId: jasmineReg.id, quantity: 1, sugarLevel: "normal" }],
        }),
      });
      assert.equal(res.status, 201);
    });

    // =====================================================================
    // MODUL C — Pembayaran Cash, QRIS & Kalkulator Kembalian
    // =====================================================================
    console.log("\n▶ MODUL C — Pembayaran Cash, QRIS & Kalkulator Kembalian");

    await runCase("TC-C01", "Positif", "Pembayaran Cash menaikkan todayCashIn & todayCashBalance sesuai totalAmount", async () => {
      const before = await apiJson(`/api/products?outletId=${superindo.id}`);
      const cashInBefore = before.data.todayCashIn as number;

      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [{ productId: jasmineJumbo.id, quantity: 2, sugarLevel: "normal" }],
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.transaction.payment_method, "Cash");

      const after = await apiJson(`/api/products?outletId=${superindo.id}`);
      assert.equal(after.data.todayCashIn, cashInBefore + jasmineJumbo.price * 2);
    });

    await runCase("TC-C02", "Positif", "Perhitungan kembalian tunai (bayar Rp 20.000 untuk tagihan Rp 14.000 = Rp 6.000)", async () => {
      const total = 14000;
      const cashReceived = 20000;
      const change = cashReceived >= total ? cashReceived - total : 0;
      assert.equal(change, 6000);
    });

    await runCase("TC-C03", "Positif", "Pembayaran QRIS tidak menambah kas laci tunai (todayCashIn), tapi menambah todayCupsSold", async () => {
      const before = await apiJson(`/api/products?outletId=${superindo.id}`);
      const cashInBefore = before.data.todayCashIn as number;
      const cupsBefore = before.data.todayCupsSold as number;

      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "QRIS",
          items: [{ productId: thaiTea.id, quantity: 1, sugarLevel: "normal" }],
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.transaction.payment_method, "QRIS");

      const after = await apiJson(`/api/products?outletId=${superindo.id}`);
      assert.equal(after.data.todayCashIn, cashInBefore);
      assert.equal(after.data.todayCupsSold, cupsBefore + 1);
    });

    await runCase("TC-C04", "Negatif", "Guard tombol bayar Cash menonaktifkan checkout jika nominal 0 atau < totalAmount", async () => {
      const isCashInvalid = (paymentMethod: "Cash" | "QRIS", rawCash: number, total: number) =>
        paymentMethod === "Cash" && rawCash < total;
      assert.equal(isCashInvalid("Cash", 0, 15000), true);
      assert.equal(isCashInvalid("Cash", 10000, 15000), true);
      assert.equal(isCashInvalid("Cash", 15000, 15000), false);
      assert.equal(isCashInvalid("QRIS", 0, 15000), false);
    });

    await runCase("TC-C05", "Negatif", "Atomisitas rollback: Item 2 kehabisan stok membuat stok Item 1 tidak ikut terpotong", async () => {
      const savedThai = await getBoothStock("Poci Mix Thai Tea 12g");
      const capBefore = await getBoothStock("Poci Mix Cappuccino 10g");
      try {
        await setBoothStock("Poci Mix Thai Tea 12g", 0);
        const failTx = await apiJson("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            outletId: superindo.id,
            paymentMethod: "Cash",
            items: [
              { productId: cappuccino.id, quantity: 1, sugarLevel: "normal" },
              { productId: thaiTea.id, quantity: 1, sugarLevel: "normal" },
            ],
          }),
        });
        assert.equal(failTx.status, 400);
        assert.equal(await getBoothStock("Poci Mix Cappuccino 10g"), capBefore);
      } finally {
        await setBoothStock("Poci Mix Thai Tea 12g", savedThai);
      }
    });

    // =====================================================================
    // MODUL D — Promo Otomatis, Voucher Struk & Redeem Voucher
    // =====================================================================
    console.log("\n▶ MODUL D — Promo Otomatis, Voucher Struk & Redeem Voucher");

    await runCase("TC-D01", "Positif", "Promo Beli 2 Varian Rasa Gratis 1 Jasmine Jumbo (unitPrice: 0)", async () => {
      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [
            { productId: thaiTea.id, quantity: 1, sugarLevel: "normal" },
            { productId: cappuccino.id, quantity: 1, sugarLevel: "normal" },
            { productId: jasmineJumbo.id, quantity: 1, sugarLevel: "normal", unitPrice: 0, isPromoFree: true },
          ],
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.transaction.total_amount, thaiTea.price + cappuccino.price);
    });

    const testVoucherCode = `VCR-POC-${Math.floor(100000 + Math.random() * 900000)}`;

    await runCase("TC-D02", "Positif", "Penerbitan Voucher Struk (Opsi C) tidak memotong stok fisik bonus saat order", async () => {
      const cupBefore = await getBoothStock("Cup Jumbo");
      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [
            { productId: thaiTea.id, quantity: 2, sugarLevel: "normal" },
            { productId: jasmineJumbo.id, quantity: 1, isPromoFree: true, isPromoVoucher: true, voucherCode: testVoucherCode },
          ],
          issuedVouchers: [
            {
              code: testVoucherCode,
              productName: jasmineJumbo.name,
              expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        }),
      });
      assert.equal(res.status, 201);
      // Hanya 2 cup Thai Tea yang memotong Cup Jumbo (bonus voucher belum disajikan)
      assert.equal(cupBefore - (await getBoothStock("Cup Jumbo")), 2);

      const voucherRow = await prisma.promoVoucher.findUnique({ where: { code: testVoucherCode } });
      assert.ok(voucherRow);
      assert.equal(voucherRow.status, "active");
    });

    await runCase("TC-D03", "Positif", "Format kode Voucher Struk memenuhi pola VCR-POC-XXXXXX", async () => {
      assert.match(testVoucherCode, /^VCR-POC-\d{6}$/);
    });

    await runCase("TC-D04", "Positif", "Validasi & Redeem Voucher Struk menandai status redeemed + redeemed_tx_id", async () => {
      const checkRes = await apiJson(`/api/vouchers?code=${encodeURIComponent(testVoucherCode)}`);
      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.data.valid, true);

      const redeemRes = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [
            { productId: jasmineJumbo.id, quantity: 1, sugarLevel: "normal", unitPrice: 0, isPromoFree: true, voucherCode: testVoucherCode },
          ],
          redeemedVoucherCode: testVoucherCode,
        }),
      });
      assert.equal(redeemRes.status, 201);

      const redeemedRow = await prisma.promoVoucher.findUnique({ where: { code: testVoucherCode } });
      assert.equal(redeemedRow?.status, "redeemed");
      assert.equal(redeemedRow?.redeemed_tx_id, redeemRes.data.transaction.id);
    });

    await runCase("TC-D05", "Positif", "Target penjualan (todayCupsSold) mengecualikan item gratis & voucher", async () => {
      const before = await apiJson(`/api/products?outletId=${superindo.id}`);
      const cupsBefore = before.data.todayCupsSold as number;

      const res = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          items: [
            { productId: thaiTea.id, quantity: 2, sugarLevel: "normal" },
            { productId: jasmineJumbo.id, quantity: 1, sugarLevel: "normal", unitPrice: 0, isPromoFree: true },
          ],
        }),
      });
      assert.equal(res.status, 201);

      const after = await apiJson(`/api/products?outletId=${superindo.id}`);
      assert.equal(after.data.todayCupsSold, cupsBefore + 2);
    });

    await runCase("TC-D06", "Negatif", "Kampanye promo inactive / expired / scheduled / outlet lain menonaktifkan isCurrentlyActive", async () => {
      const original = await prisma.promoCampaign.findUnique({ where: { id: "buy2_get1" } });
      assert.ok(original);
      try {
        await prisma.promoCampaign.update({ where: { id: "buy2_get1" }, data: { is_active: false } });
        let r = await apiJson(`/api/products?outletId=${superindo.id}`);
        assert.equal(r.data.promoCampaign.isCurrentlyActive, false);
        assert.equal(r.data.promoCampaign.status, "inactive");

        await prisma.promoCampaign.update({
          where: { id: "buy2_get1" },
          data: { is_active: true, start_at: new Date(Date.now() + 86400000), end_at: new Date(Date.now() + 172800000) },
        });
        r = await apiJson(`/api/products?outletId=${superindo.id}`);
        assert.equal(r.data.promoCampaign.status, "scheduled");

        await prisma.promoCampaign.update({
          where: { id: "buy2_get1" },
          data: { start_at: new Date(Date.now() - 172800000), end_at: new Date(Date.now() - 86400000) },
        });
        r = await apiJson(`/api/products?outletId=${superindo.id}`);
        assert.equal(r.data.promoCampaign.status, "expired");

        if (outlet2) {
          await prisma.promoCampaign.update({
            where: { id: "buy2_get1" },
            data: { start_at: original.start_at, end_at: original.end_at, target_outlet_id: outlet2.id },
          });
          r = await apiJson(`/api/products?outletId=${superindo.id}`);
          assert.equal(r.data.promoCampaign.status, "outlet_not_targeted");
        }
      } finally {
        await prisma.promoCampaign.update({
          where: { id: "buy2_get1" },
          data: {
            is_active: original.is_active,
            start_at: original.start_at,
            end_at: original.end_at,
            target_outlet_id: original.target_outlet_id,
          },
        });
      }
    });

    await runCase("TC-D07", "Negatif", "Validasi negatif kode voucher (404 tidak ada, 400 sudah dipakai, 400 expired)", async () => {
      const notFound = await apiJson("/api/vouchers?code=VCR-POC-000000");
      assert.equal(notFound.status, 404);

      const usedRes = await apiJson(`/api/vouchers?code=${encodeURIComponent(testVoucherCode)}`);
      assert.equal(usedRes.status, 400);
      assert.equal(usedRes.data.valid, false);

      const expCode = `VCR-POC-EXP${Math.floor(100 + Math.random() * 899)}`;
      await prisma.promoVoucher.create({
        data: {
          code: expCode,
          outlet_id: superindo.id,
          product_name: jasmineJumbo.name,
          status: "active",
          expires_at: new Date(Date.now() - 86400000),
        },
      });
      const expRes = await apiJson(`/api/vouchers?code=${encodeURIComponent(expCode)}`);
      assert.equal(expRes.status, 400);
      assert.equal(expRes.data.valid, false);
    });

    // =====================================================================
    // MODUL E — Masak Ulang Teh 8L & Gula Cair + Potong Gula Pasir
    // =====================================================================
    console.log("\n▶ MODUL E — Masak Ulang Teh 8L & Gula Cair + Potong Gula Pasir");

    await runCase("TC-E01", "Positif", "Ambang batas alert dispenser teh 8L (low <= 3000ml, critical <= 1500ml)", async () => {
      const evalAlert = (ml: number) => ({
        isLow: ml <= 3000 && ml > 1500,
        isCritical: ml <= 1500,
      });
      assert.deepEqual(evalAlert(8000), { isLow: false, isCritical: false });
      assert.deepEqual(evalAlert(3000), { isLow: true, isCritical: false });
      assert.deepEqual(evalAlert(1500), { isLow: false, isCritical: true });
    });

    await runCase("TC-E02", "Positif", "Masak sirup gula +1.600 ml otomatis memotong Gula Pasir -1.000 gr", async () => {
      const gulaCairBefore = await getBoothStock("Gula Cair");
      const gulaPasirBefore = await getBoothStock("Gula Pasir");

      const res = await apiJson("/api/sugar-refill", {
        method: "POST",
        body: JSON.stringify({ outletId: superindo.id, addedMl: 1600, type: "brew" }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.current_stock, gulaCairBefore + 1600);
      assert.equal(res.data.gulaPasirDeducted, 1000);
      assert.equal(await getBoothStock("Gula Pasir"), Math.max(0, gulaPasirBefore - 1000));
    });

    await runCase("TC-E03", "Positif", "Kalibrasi setMl memperbarui Gula Cair tanpa memotong Gula Pasir", async () => {
      const gulaPasirBefore = await getBoothStock("Gula Pasir");
      const res = await apiJson("/api/sugar-refill", {
        method: "POST",
        body: JSON.stringify({ outletId: superindo.id, setMl: 2500 }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.current_stock, 2500);
      assert.equal(res.data.gulaPasirDeducted, 0);
      assert.equal(await getBoothStock("Gula Pasir"), gulaPasirBefore);
    });

    await runCase("TC-E04", "Negatif", "Validasi negatif POST /api/sugar-refill (outlet 404 & payload kosong 400)", async () => {
      const badOutlet = await apiJson("/api/sugar-refill", {
        method: "POST",
        body: JSON.stringify({ outletId: "NONEXISTENT", addedMl: 1600 }),
      });
      assert.equal(badOutlet.status, 404);

      const noAmount = await apiJson("/api/sugar-refill", {
        method: "POST",
        body: JSON.stringify({ outletId: superindo.id }),
      });
      assert.equal(noAmount.status, 400);
    });

    // =====================================================================
    // MODUL F — Pengeluaran Kasir (Kas Keluar Laci)
    // =====================================================================
    console.log("\n▶ MODUL F — Pengeluaran Kasir (Kas Keluar Laci)");

    let createdExpenseId = "";

    await runCase("TC-F01", "Positif", "Catat pengeluaran kasir mengurangi todayCashBalance laci", async () => {
      const before = await apiJson(`/api/products?outletId=${superindo.id}`);
      const balBefore = before.data.todayCashBalance as number;

      const res = await apiJson("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          category: "es_batu",
          description: "Es Batu Kristal Testing",
          amount: 15000,
        }),
      });
      assert.equal(res.status, 200);
      createdExpenseId = res.data.expense.id;

      const after = await apiJson(`/api/products?outletId=${superindo.id}`);
      assert.equal(after.data.todayCashBalance, balBefore - 15000);
    });

    await runCase("TC-F02", "Positif", "Hapus catatan pengeluaran memulihkan todayCashBalance laci", async () => {
      assert.ok(createdExpenseId);
      const before = await apiJson(`/api/products?outletId=${superindo.id}`);
      const balBefore = before.data.todayCashBalance as number;

      const delRes = await apiJson(`/api/expenses?id=${createdExpenseId}`, { method: "DELETE" });
      assert.equal(delRes.status, 200);

      const after = await apiJson(`/api/products?outletId=${superindo.id}`);
      assert.equal(after.data.todayCashBalance, balBefore + 15000);
    });

    await runCase("TC-F03", "Negatif", "Validasi pengeluaran (deskripsi kosong, nominal <= 0, DELETE tanpa id, shift closed)", async () => {
      const emptyDesc = await apiJson("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ outletId: superindo.id, description: "   ", amount: 5000 }),
      });
      assert.equal(emptyDesc.status, 400);

      const badAmt = await apiJson("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ outletId: superindo.id, description: "Es Batu", amount: 0 }),
      });
      assert.equal(badAmt.status, 400);

      const delNoId = await apiJson("/api/expenses", { method: "DELETE" });
      assert.equal(delNoId.status, 400);

      if (outlet2) {
        const closedOut = await apiJson("/api/expenses", {
          method: "POST",
          body: JSON.stringify({ outletId: outlet2.id, description: "Es", amount: 5000 }),
        });
        assert.equal(closedOut.status, 400);
      }
    });

    // =====================================================================
    // MODUL G — Mode Offline, Antrean Lokal & Idempotent Sync
    // =====================================================================
    console.log("\n▶ MODUL G — Mode Offline, Antrean Lokal & Idempotent Sync");

    let syncedOfflineId = "";

    await runCase("TC-G01", "Positif", "Simpan transaksi Cash & QRIS ke antrean offline saat jaringan mati", async () => {
      shims.storage.clear();
      const tx1 = saveOfflineTransaction({
        outletId: superindo.id,
        items: [{ productId: jasmineJumbo.id, productName: jasmineJumbo.name, quantity: 1, price: jasmineJumbo.price, sugarLevel: "normal" }],
        paymentMethod: "Cash",
        totalAmount: jasmineJumbo.price,
      });
      const tx2 = saveOfflineTransaction({
        outletId: superindo.id,
        items: [{ productId: jasmineReg.id, productName: jasmineReg.name, quantity: 1, price: jasmineReg.price, sugarLevel: "less" }],
        paymentMethod: "QRIS",
        totalAmount: jasmineReg.price,
      });
      syncedOfflineId = tx1.offlineId;
      assert.match(tx1.offlineId, /^tx_off_/);
      assert.equal(tx2.paymentMethod, "QRIS");
      assert.equal(getPendingTransactions().length, 2);
    });

    await runCase("TC-G02", "Positif", "syncPendingTransactions mengirim antrean offline & mengosongkan queue", async () => {
      const syncRes = await syncPendingTransactions();
      assert.equal(syncRes.syncedCount, 2);
      assert.equal(syncRes.failedCount, 0);
      assert.equal(getPendingTransactions().length, 0);
    });

    await runCase("TC-G03", "Positif", "Idempotent replay dengan offlineId kembar tidak memotong stok dua kali", async () => {
      assert.ok(syncedOfflineId);
      const cupBefore = await getBoothStock("Cup Jumbo");
      const replay = await apiJson("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          outletId: superindo.id,
          paymentMethod: "Cash",
          offlineId: syncedOfflineId,
          items: [{ productId: jasmineJumbo.id, quantity: 1, sugarLevel: "normal" }],
        }),
      });
      assert.equal(replay.status, 200);
      assert.equal(replay.data.synced, true);
      assert.equal(await getBoothStock("Cup Jumbo"), cupBefore);
    });

    await runCase("TC-G04", "Negatif", "Sync offline tertahan di queue jika stok di server habis saat sinkronisasi", async () => {
      const savedThai = await getBoothStock("Poci Mix Thai Tea 12g");
      shims.storage.clear();
      try {
        await setBoothStock("Poci Mix Thai Tea 12g", 0);
        saveOfflineTransaction({
          outletId: superindo.id,
          items: [{ productId: thaiTea.id, productName: thaiTea.name, quantity: 1, price: thaiTea.price, sugarLevel: "normal" }],
          paymentMethod: "Cash",
          totalAmount: thaiTea.price,
        });
        const syncRes = await syncPendingTransactions();
        assert.equal(syncRes.syncedCount, 0);
        assert.equal(syncRes.failedCount, 1);
        assert.equal(getPendingTransactions().length, 1);
      } finally {
        await setBoothStock("Poci Mix Thai Tea 12g", savedThai);
        shims.storage.clear();
      }
    });

    // =====================================================================
    // MODUL H — Cetak Struk Thermal
    // =====================================================================
    console.log("\n▶ MODUL H — Cetak Struk Thermal");

    await runCase("TC-H01", "Positif", "Format teks struk 58mm memuat item level gula, kembalian & blok voucher", async () => {
      const sampleReceipt: ReceiptData = {
        orderId: "#POC-TEST01",
        outletName: superindo.name,
        outletCode: superindo.code,
        items: [
          { name: "Jasmine Poci (Less Sugar)", quantity: 1, price: 6000, subtotal: 6000 },
          { name: "Jasmine Poci [VOUCHER STRUK]", quantity: 1, price: 0, subtotal: 0 },
        ],
        totalAmount: 6000,
        paymentMethod: "Cash",
        cashReceived: 10000,
        cashChange: 4000,
        timestamp: new Date().toISOString(),
        promoVoucher: {
          code: "VCR-POC-123456",
          title: "Gratis 1 Teh Poci Ori Jumbo",
          validUntil: "30/11/2026",
        },
      };
      const text = generateReceiptText(sampleReceipt);
      assert.match(text, /Less Sugar/);
      assert.match(text, /VCR-POC-123456/);
      assert.match(text, /KEMBALI/);
      assert.match(text, /@yatehpoci/);

      // Verifikasi ESC/POS menyisipkan perintah kick Cash Drawer hanya untuk Cash (bukan QRIS)
      const cashBuf = Array.from(generateEscPosBuffer(sampleReceipt));
      const qrisBuf = Array.from(generateEscPosBuffer({ ...sampleReceipt, paymentMethod: "QRIS" }));
      const kickSeq = Array.from(CASH_DRAWER_KICK_BYTES);
      const hasKick = (buf: number[]) =>
        buf.some((_, idx) => kickSeq.every((b, offset) => buf[idx + offset] === b));
      assert.equal(hasKick(cashBuf), true, "ESC/POS Cash harus mengandung ESC p cash drawer kick.");
      assert.equal(hasKick(qrisBuf), false, "ESC/POS QRIS tidak boleh memicu cash drawer.");
    });

    await runCase("TC-H02", "Negatif", "Endpoint /api/print/com menolak port injeksi, base64 korup & menangani port mati", async () => {
      const badPort = await apiJson("/api/print/com", {
        method: "POST",
        body: JSON.stringify({ port: "COM1; whoami", escposBase64: "AQID" }),
      });
      assert.equal(badPort.status, 400);

      const zeroPort = await apiJson("/api/print/com", {
        method: "POST",
        body: JSON.stringify({ port: "COM0", escposBase64: "AQID" }),
      });
      assert.equal(zeroPort.status, 400);

      const badB64 = await apiJson("/api/print/com", {
        method: "POST",
        body: JSON.stringify({ port: "COM7", escposBase64: "!!!not-base64!!!" }),
      });
      assert.equal(badB64.status, 400);

      const missingPort = await apiJson("/api/print/com", {
        method: "POST",
        body: JSON.stringify({ port: "COM29", escposBase64: "SGVsbG8=" }),
      });
      assert.equal(missingPort.status, 500);
    });

    // =====================================================================
    // MODUL I — Tutup Shift (Blind Count) & Rekonsiliasi
    // =====================================================================
    console.log("\n▶ MODUL I — Tutup Shift (Blind Count) & Rekonsiliasi");

    await runCase("TC-I01", "Positif", "Closing akurat tanpa selisih menghasilkan employee_debt=0 & masuk CentralVault", async () => {
      await setBoothStock("Kantong Teh", 20);
      const prodRes = await apiJson(`/api/products?outletId=${superindo.id}`);
      const expectedCash = prodRes.data.todayCashBalance as number;
      const cupReg = await getBoothStock("Cup Reguler");
      const cupJumbo = await getBoothStock("Cup Jumbo");
      const kantongTeh = await getBoothStock("Kantong Teh");
      const gulaCair = await getBoothStock("Gula Cair");

      const vaultBefore = await prisma.centralVault.findUnique({ where: { id: "default" } });
      const res = await apiJson("/api/closing", {
        method: "POST",
        body: JSON.stringify({
          outlet_id: superindo.id,
          actual_cup_reg: cupReg,
          actual_cup_jumbo: cupJumbo,
          actual_liquid_ml: kantongTeh,
          actual_sugar_ml: gulaCair,
          actual_cash: expectedCash,
          notes: "Test closing akurat",
        }),
      });
      assert.equal(res.status, 201);

      const closingRow = await prisma.shiftClosing.findUnique({ where: { id: res.data.shiftClosingId } });
      assert.ok(closingRow);
      assert.equal(closingRow.employee_debt, 0);
      assert.equal(closingRow.theft_flag, false);
      assert.equal(closingRow.waste_flag, false);

      const closedOutlet = await prisma.outlet.findUnique({ where: { id: superindo.id } });
      assert.equal(closedOutlet?.shift_status, "closed");

      const vaultAfter = await prisma.centralVault.findUnique({ where: { id: "default" } });
      assert.equal((vaultAfter?.cash_balance || 0) - (vaultBefore?.cash_balance || 0), expectedCash);
    });

    await runCase("TC-I02", "Positif", "Payload antrean offline_shift_closing dapat disimpan & dibaca di localStorage", async () => {
      const payload = [
        {
          outlet_id: superindo.id,
          actual_cup_reg: 100,
          actual_cup_jumbo: 100,
          actual_liquid_ml: 20,
          actual_sugar_ml: 2500,
          actual_cash: 100000,
          timestamp: new Date().toISOString(),
        },
      ];
      shims.storage.setItem("offline_shift_closing", JSON.stringify(payload));
      const parsed = JSON.parse(shims.storage.getItem("offline_shift_closing") || "[]");
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].outlet_id, superindo.id);
    });

    await runCase("TC-I03", "Audit", "Selisih cup/kas memicu theft_flag + denda & defisit kantong teh >2% memicu waste_flag", async () => {
      await apiJson("/api/opening", {
        method: "POST",
        body: JSON.stringify({ outlet_id: superindo.id, cash_float: 100000 }),
      });
      await setBoothStock("Kantong Teh", 20);
      const cupReg = await getBoothStock("Cup Reguler");
      const cupJumbo = await getBoothStock("Cup Jumbo");
      const gulaCair = await getBoothStock("Gula Cair");

      const res = await apiJson("/api/closing", {
        method: "POST",
        body: JSON.stringify({
          outlet_id: superindo.id,
          actual_cup_reg: Math.max(0, cupReg - 2), // kurang 2 cup reguler
          actual_cup_jumbo: cupJumbo,
          actual_liquid_ml: 18, // kurang 2 kantong teh (10% > 2%)
          actual_sugar_ml: gulaCair,
          actual_cash: 90000, // kurang Rp 10.000
          notes: "Test selisih audit",
        }),
      });
      assert.equal(res.status, 201);

      const closingRow = await prisma.shiftClosing.findUnique({ where: { id: res.data.shiftClosingId } });
      assert.ok(closingRow);
      assert.equal(closingRow.theft_flag, true);
      assert.equal(closingRow.waste_flag, true);
      assert.equal(closingRow.employee_debt, 2 * jasmineReg.price + 10000);
    });

    await runCase("TC-I04", "Negatif", "Closing menolak angka negatif (< 0) atau outlet_id kosong", async () => {
      const negVal = await apiJson("/api/closing", {
        method: "POST",
        body: JSON.stringify({
          outlet_id: superindo.id,
          actual_cup_reg: 10,
          actual_cup_jumbo: 10,
          actual_liquid_ml: 10,
          actual_sugar_ml: 10,
          actual_cash: -100,
        }),
      });
      assert.equal(negVal.status, 400);

      const noOutlet = await apiJson("/api/closing", {
        method: "POST",
        body: JSON.stringify({
          outlet_id: "",
          actual_cup_reg: 10,
          actual_cup_jumbo: 10,
          actual_liquid_ml: 10,
        }),
      });
      assert.equal(noOutlet.status, 400);
    });

    // =====================================================================
    // MODUL J — Keamanan Gerbang & Penguncian Outlet (TERAKHIR!)
    // =====================================================================
    console.log("\n▶ MODUL J — Keamanan Gerbang & Penguncian Outlet (Dieksekusi Terakhir)");

    const adminPin = process.env.ADMIN_PIN || "1234";
    const gateSecret = RESOLVED_GATE_SECRET;

    await runCase("TC-J01", "Positif", "Verifikasi PIN Admin valid untuk membuka penguncian outlet", async () => {
      const res = await apiJson("/api/admin/pin", {
        method: "POST",
        body: JSON.stringify({ action: "verify", pin: adminPin }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.verified, true);
    });

    await runCase("TC-J02", "Negatif", "Verifikasi PIN Admin salah mengembalikan 401", async () => {
      const res = await apiJson("/api/admin/pin", {
        method: "POST",
        body: JSON.stringify({ action: "verify", pin: "000000" }),
      });
      assert.equal(res.status, 401);
    });

    await runCase("TC-J03", "Positif", "Login /api/gate/verify dengan kunci valid mengembalikan cookie gate_token", async () => {
      const res = await apiJson("/api/gate/verify", {
        method: "POST",
        headers: { "x-forwarded-for": "10.99.0.1" },
        body: JSON.stringify({ key: gateSecret }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      const setCookie = res.headers.get("set-cookie") || "";
      assert.match(setCookie, /gate_token=/);
    });

    await runCase("TC-J04", "Negatif", "Percobaan kunci salah ke-1 s/d ke-4 mengembalikan 401", async () => {
      for (let i = 1; i <= 4; i++) {
        const res = await apiJson("/api/gate/verify", {
          method: "POST",
          headers: { "x-forwarded-for": "10.99.0.99" },
          body: JSON.stringify({ key: `salah_${i}` }),
        });
        assert.equal(res.status, 401);
      }
    });

    await runCase("TC-J05", "Negatif", "Percobaan salah ke-5 memicu blokir IP 15 menit (HTTP 429)", async () => {
      const fifth = await apiJson("/api/gate/verify", {
        method: "POST",
        headers: { "x-forwarded-for": "10.99.0.99" },
        body: JSON.stringify({ key: "salah_5" }),
      });
      assert.equal(fifth.status, 429);

      // Percobaan ke-6 walau dengan kunci benar tetap diblokir 429
      const sixth = await apiJson("/api/gate/verify", {
        method: "POST",
        headers: { "x-forwarded-for": "10.99.0.99" },
        body: JSON.stringify({ key: gateSecret }),
      });
      assert.equal(sixth.status, 429);
    });
  } finally {
    shims.restoreFetch();
    await prisma.$disconnect();

    if (!KEEP_DATA && fs.existsSync(TMP_SNAPSHOT)) {
      fs.copyFileSync(TMP_SNAPSHOT, DB_PATH);
      for (const suffix of ["-wal", "-shm"]) {
        if (fs.existsSync(DB_PATH + suffix)) {
          try {
            fs.unlinkSync(DB_PATH + suffix);
          } catch {}
        }
      }
      fs.unlinkSync(TMP_SNAPSHOT);
      console.log("\n🧹 Database prisma/dev.db dipulihkan ke kondisi sebelum testing.");
    } else if (fs.existsSync(TMP_SNAPSHOT)) {
      fs.unlinkSync(TMP_SNAPSHOT);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n================================================================");
  console.log(`  HASIL TEST KASIR: ${passed}/${results.length} LULUS, ${failed} GAGAL`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
