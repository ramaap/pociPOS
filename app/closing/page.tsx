"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowLeft, Send, Store } from "lucide-react";
import Link from "next/link";

interface Outlet {
  id: string;
  code: string;
  name: string;
}

export default function ShiftClosingPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");

  const [actualCupReg, setActualCupReg] = useState<string>("");
  const [actualCupJumbo, setActualCupJumbo] = useState<string>("");
  const [actualLiquidMl, setActualLiquidMl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Outlets
  useEffect(() => {
    fetch("/api/closing")
      .then((res) => res.json())
      .then((data) => {
        if (data.outlets) {
          setOutlets(data.outlets);
          const savedOutletId = localStorage.getItem("poci_selected_outlet_id");
          if (savedOutletId && data.outlets.some((o: Outlet) => o.id === savedOutletId)) {
            setSelectedOutletId(savedOutletId);
          } else if (data.outlets.length > 0) {
            setSelectedOutletId(data.outlets[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedOutletId) {
      setErrorMessage("Silakan pilih kedai / booth terlebih dahulu.");
      return;
    }

    if (actualCupReg === "" || actualCupJumbo === "" || actualLiquidMl === "") {
      setErrorMessage("Mohon lengkapi semua isian hitungan fisik sebelum submit.");
      return;
    }

    const regNum = parseInt(actualCupReg, 10);
    const jumboNum = parseInt(actualCupJumbo, 10);
    const liquidNum = parseFloat(actualLiquidMl);

    if (isNaN(regNum) || regNum < 0 || isNaN(jumboNum) || jumboNum < 0 || isNaN(liquidNum) || liquidNum < 0) {
      setErrorMessage("Angka tidak valid. Pastikan semua angka bernilai 0 atau lebih.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: selectedOutletId,
          actual_cup_reg: regNum,
          actual_cup_jumbo: jumboNum,
          actual_liquid_ml: liquidNum,
          notes: notes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengirim laporan closing");
      }

      setSubmitSuccess(true);
      try {
        localStorage.setItem("poci_sync_event", String(Date.now()));
        const ch = new BroadcastChannel("poci_pos_sync");
        ch.postMessage({ type: "SHIFT_CLOSING_COMPLETED", timestamp: Date.now() });
        ch.close();
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan koneksi";
      if (!navigator.onLine) {
        const offlineQueue = JSON.parse(localStorage.getItem("offline_shift_closing") || "[]");
        offlineQueue.push({
          outlet_id: selectedOutletId,
          actual_cup_reg: regNum,
          actual_cup_jumbo: jumboNum,
          actual_liquid_ml: liquidNum,
          notes: notes.trim(),
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("offline_shift_closing", JSON.stringify(offlineQueue));
        setSubmitSuccess(true);
      try {
        localStorage.setItem("poci_sync_event", String(Date.now()));
        const ch = new BroadcastChannel("poci_pos_sync");
        ch.postMessage({ type: "SHIFT_CLOSING_COMPLETED", timestamp: Date.now() });
        ch.close();
      } catch {}
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOutletObj = outlets.find((o) => o.id === selectedOutletId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-xl mx-auto w-full">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Kembali ke Kasir POS
          </Link>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Blind Count Enforced
          </span>
        </div>

        {submitSuccess ? (
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Shift Closing Berhasil Terkirim!
            </h2>
            <p className="text-emerald-700 font-bold text-sm mb-4">
              {selectedOutletObj?.name}
            </p>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              Data hitungan fisik telah dicatat ke dalam server pusat Franchise Es Teh Poci.
              Terima kasih atas kerja keras Anda hari ini. Silakan bersihkan booth dan selamat beristirahat!
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-500 mb-6 space-y-1">
              <p>🔒 <strong>Kebijakan Blind Count:</strong> Hasil audit stok sistem hanya dapat diakses melalui Dashboard Admin.</p>
              <p>🕒 <strong>Waktu Submit:</strong> {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
            </div>

            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition"
            >
              Mulai Shift Baru (Kasir)
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shrink-0 border border-emerald-300 overflow-hidden">
                <img src="/logo.jpg" alt="Logo Teh Cap Poci" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Laporan Tutup Shift (Blind Count)
                </h1>
                <p className="text-emerald-100 text-xs sm:text-sm mt-1">
                  Hitung persediaan fisik yang tersisa di booth secara riil tanpa melihat stok sistem.
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="m-6 mb-0 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Outlet Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-700" />
                  Pilih Lokasi Kedai / Booth
                </label>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 1: Cup Reguler */}
              <div>
                <label
                  htmlFor="cup-reg"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  1. Total Gelas Reguler Tersisa Fisik <span className="text-emerald-600 font-bold">(pcs)</span>
                </label>
                <div className="relative">
                  <input
                    id="cup-reg"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Contoh: 142"
                    value={actualCupReg}
                    onChange={(e) => setActualCupReg(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-mono font-medium text-slate-900"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-semibold text-slate-400 uppercase">
                    Pcs
                  </span>
                </div>
              </div>

              {/* Field 2: Cup Jumbo */}
              <div>
                <label
                  htmlFor="cup-jumbo"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  2. Total Gelas Jumbo Tersisa Fisik <span className="text-emerald-600 font-bold">(pcs)</span>
                </label>
                <div className="relative">
                  <input
                    id="cup-jumbo"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Contoh: 98"
                    value={actualCupJumbo}
                    onChange={(e) => setActualCupJumbo(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-mono font-medium text-slate-900"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-semibold text-slate-400 uppercase">
                    Pcs
                  </span>
                </div>
              </div>

              {/* Field 3: Kantong Teh */}
              <div>
                <label
                  htmlFor="liquid-ml"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  3. Sisa Kantong Teh <span className="text-amber-600 font-bold">(pcs)</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Hitung fisik sisa persediaan kantong teh di booth / kedai.
                </p>
                <div className="relative">
                  <input
                    id="liquid-ml"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Contoh: 28 (pcs kantong teh)"
                    value={actualLiquidMl}
                    onChange={(e) => setActualLiquidMl(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-mono font-medium text-slate-900"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-semibold text-slate-400 uppercase">
                    Pcs
                  </span>
                </div>
              </div>

              {/* Field 4: Catatan */}
              <div>
                <label
                  htmlFor="closing-notes"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  Catatan Insiden / Spillage (Opsional)
                </label>
                <textarea
                  id="closing-notes"
                  rows={2}
                  placeholder="Contoh: 1 cup reguler retak, kran barrel sempat menetes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-base shadow-lg transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Menyimpan Laporan...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Simpan Laporan Shift Closing Kedai
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-slate-400 mt-8 py-2">
        Es Teh Poci POS &bull; Multi-Outlet Central Kitchen Strict BOM
      </footer>
    </div>
  );
}
