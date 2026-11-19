'use client';

import React from 'react';
import Link from 'next/link';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans">
      <div className="max-w-xl mx-auto w-full pt-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-600 rounded-3xl shadow-lg shadow-emerald-500/30 mb-4 text-4xl">
            🍵
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Download APK Kasir Teh Poci
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            Aplikasi POS & Manajemen Bahan Baku Resmi Real Device Android
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur mb-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-700 mb-6">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-emerald-400">Versi Terbaru</div>
              <div className="text-lg font-bold text-white">KasirTehPoci-v1.0.apk</div>
              <div className="text-xs text-slate-400">Ukuran: ~7.3 MB • Android 7.0 - 14+</div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30">
              Siap Pasang
            </span>
          </div>

          <a
            href="/api/apk"
            download="KasirTehPoci.apk"
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 text-base sm:text-lg mb-4"
          >
            <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download File APK Sekarang
          </a>

          <div className="text-center text-xs text-slate-400">
            Diuji & kompatibel penuh dengan Samsung Galaxy Tab A series, Tab A8, A10, & HP Android.
          </div>
        </div>

        {/* Petunjuk Instalasi */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center text-xs font-bold">1</span>
            Langkah Pasang di Android Tablet / HP:
          </h2>
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Klik tombol hijau di atas untuk mengunduh <b>KasirTehPoci.apk</b>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Setelah selesai, buka menu notifikasi atau <b>File Manager / My Files &gt; Downloads</b>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Ketuk file APK. Jika muncul peringatan keamanan, pilih <b>Setelan / Settings &gt; Izinkan dari sumber ini (Allow from this source)</b>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Ketuk <b>Install / Pasang</b>. Buka aplikasi <b>Kasir Poci</b> dan siap jualan!</span>
            </li>
          </ol>
        </div>

        {/* Alternatif PWA */}
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 inline-flex items-center justify-center text-xs font-bold">2</span>
            Alternatif Cepat (Instal PWA via Chrome):
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Bisa juga diinstall langsung seperti aplikasi asli tanpa download APK:
          </p>
          <ol className="space-y-2 text-xs sm:text-sm text-slate-300">
            <li>1. Buka browser Chrome di tablet ke: <code className="bg-slate-900 px-2 py-0.5 rounded text-emerald-300">https://kasir.ya-kasir-tehpoci.my.id</code></li>
            <li>2. Ketuk ikon titik tiga (⋮) di pojok kanan atas Chrome.</li>
            <li>3. Pilih <b>"Tambahkan ke Layar Utama"</b> atau <b>"Instal Aplikasi"</b>.</li>
          </ol>
        </div>

        {/* Tombol kembali ke POS */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
          >
            ← Buka Terminal Kasir Web
          </Link>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 py-6">
        © 2026 Es Teh Poci Multi-Kedai System • POS & Inventory
      </div>
    </div>
  );
}
