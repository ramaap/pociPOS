# 🍵 Teh Cap Poci - Smart Multi-Outlet POS & Strict BOM System

Sistem Point of Sale (POS) modern, manajemen inventaris bahan baku (Strict Bill of Materials), rekonsiliasi kasir harian (*Blind Count Shift Closing*), laporan keuangan otomatis, dan motivasi kerja berbasis Google Gemini AI untuk jaringan franchise/gerai **Teh Cap Poci**.

---

## 🚀 Fitur Unggulan

1. **Terminal Kasir POS Multi-Kedai:**
   - Deteksi stok real-time (Cup Reguler, Cup Jumbo, Daun Teh Poci, Sirup, Powder).
   - Validasi stok mandiri per outlet: tombol menu otomatis disable jika bahan baku habis.
   - Pembayaran QRIS Dinamis & Tunai (Cash).
   - Cetak struk thermal via Bluetooth printer (ESC/POS 58mm) & Browser Print.
   - Dukungan transaksi offline otomatis jika koneksi internet terputus.

2. **Strict BOM Inventory Tracking:**
   - Pengurangan stok otomatis hingga tingkat mililiter (ml) dan gram sesuai resep standar *Central Kitchen*.
   - Input restock bahan baku pusat dan opname fisik harian.

3. **Tutup Shift & Rekonsiliasi Kasir (Blind Count):**
   - Kasir menghitung fisik sisa stok tanpa melihat angka sistem untuk mencegah manipulasi.
   - Deteksi selisih otomatis (*variance analysis*) di Dashboard Owner.

4. **Owner Portal & Financial Dashboard:**
   - Laporan Laba Rugi (*Profitability & HPP*), Arus Kas (*Cash Flow*), dan Neraca Keuangan.
   - Manajemen cabang kedai (tambah, edit nama, kode, alamat, status buka/tutup, dan target penjualan cup per hari).
   - Backup otomatis database SQLite berkala dan fitur restore 1-klik.

5. **AI Pantun Motivasi Karyawan (Gemini AI):**
   - Pantun jenaka berima lucu khas booth Teh Poci untuk menyemangati karyawan mengejar target cup harian.
   - Terintegrasi langsung dengan Google Gemini API (`gemini-2.0-flash` / `gemini-1.5-flash`).
   - Terupdate otomatis setiap 15 menit sekali atau via tombol *Acak Pantun*.

---

## 🛠️ Persyaratan Sistem

- **Node.js:** Versi 18.18.0 atau lebih baru ([Unduh Node.js](https://nodejs.org/))
- **Git:** Versi terbaru ([Unduh Git](https://git-scm.com/))
- **OS:** Windows / macOS / Linux

---

## 📦 Panduan Instalasi Awal (Initial Installation)

### Opsi A: Instalasi 1-Klik Otomatis (Windows)
Jika Anda menggunakan Windows, cukup jalankan skrip otomatis:
1. Double-click file **`SETUP_INSTALLATION.bat`**.
2. Skrip akan otomatis menginstall dependensi, membuat database SQLite, mengisi data master menu awal (*seed*), dan membangun build produksi.

---

### Opsi B: Instalasi Manual (Semua OS)

1. **Clone Repository:**
   ```bash
   git clone https://github.com/ramaap/pociPOS.git
   cd pociPOS
   ```

2. **Install Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable:**
   Salin file `.env.example` menjadi `.env`:
   ```bash
   # Windows Command Prompt:
   copy .env.example .env

   # Linux / macOS / PowerShell:
   cp .env.example .env
   ```
   *Opsional: Masukkan `GEMINI_API_KEY` gratis Anda dari [Google AI Studio](https://aistudio.google.com/) ke dalam file `.env` untuk mengaktifkan pantun AI dinamis.*

4. **Inisialisasi Database SQLite & Skema Prisma:**
   ```bash
   npx prisma db push
   ```

5. **Isi Data Master Menu & Resep BOM Awal (Seed Data):**
   ```bash
   npm run seed
   ```

6. **Jalankan Aplikasi:**
   * **Mode Development (Untuk Pengujian & Koding):**
     ```bash
     npm run dev
     ```
     Buka browser di `http://localhost:3000`.

   * **Mode Produksi (Untuk Kasir Operasional Booth):**
     ```bash
     npm run build
     npm run start
     ```
     Atau double-click **`START_KASIR_POCI.bat`** pada Windows.

---

## 🔐 Kredensial & Akses Awal

* **Terminal Kasir:** Akses langsung di `http://localhost:3000`
* **Owner Portal / Admin:** Klik menu **Admin** di pojok kanan atas atau akses `http://localhost:3000/admin`
* **Default PIN Admin:** `1234` *(Dapat diganti langsung di dalam menu Admin $\rightarrow$ Ganti PIN)*

---

## 📂 Struktur Direktori Proyek

```text
├── app/
│   ├── page.tsx               # Terminal Kasir POS Utama & Banner Pantun
│   ├── admin/page.tsx         # Dashboard Owner, Finansial & Manage Kedai
│   ├── closing/page.tsx       # Formulir Tutup Shift Kasir (Blind Count)
│   └── api/                   # REST API Endpoints (Checkout, Expenses, Gemini, dll)
├── prisma/
│   ├── schema.prisma          # Skema Database Relasional SQLite
│   └── seed.ts                # Master Data Menu, Resep BOM & Kedai Awal
├── public/                    # Aset Logo Resmi & Favicon
├── backups/                   # Direktori Snapshot Backup Database SQLite
├── SETUP_INSTALLATION.bat     # Skrip 1-Klik Instalasi Awal Proyek
├── START_KASIR_POCI.bat       # Skrip 1-Klik Operasional Kasir
└── README.md                  # Dokumentasi Proyek
```

---

## 📄 Lisensi

Hak Cipta (c) 2026. Dikembangkan untuk efisiensi operasional jaringan outlet Teh Cap Poci.

