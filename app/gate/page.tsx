"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function GatePage() {
  const [key, setKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/gate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (res.status === 200) {
        window.location.href = "/";
      } else if (res.status === 429) {
        setErrorMessage("Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
      } else if (res.status === 401) {
        setErrorMessage("Kunci akses salah.");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Gagal membuka gerbang. Silakan coba lagi.");
      }
    } catch {
      setErrorMessage("Koneksi gagal. Pastikan jaringan server aktif.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle Decorative Glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="h-20 w-20 mx-auto mb-4 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg border border-amber-400">
            <img src="/logo.jpg" alt="Logo Teh Cap Poci" className="w-full h-full object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20 mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lapisan Keamanan Perimeter</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            🔐 Gerbang Keamanan Kedai
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Masukkan Kunci Akses untuk membuka sistem kasir
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs sm:text-sm animate-shake">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Kunci Akses Master (Passphrase)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Masukkan kunci akses..."
                autoFocus
                required
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-850 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi Kunci...</span>
              </span>
            ) : (
              <>
                <span>Buka Gerbang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Sistem POS Teh Cap Poci Multi-Kedai &bull; Terproteksi Otentikasi Perimeter
          </p>
        </div>
      </div>
    </div>
  );
}
