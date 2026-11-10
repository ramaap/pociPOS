# 🍵 Teh Cap Poci - Smart Multi-Outlet POS & Strict BOM System

Sistem Point of Sale (POS) modern, manajemen inventaris bahan baku ketat (*Strict Bill of Materials*), alur operasional shift (Buka Shift Kasir & *Blind Count Shift Closing*), pemantauan seduhan dispenser teh 8L (*Re-Brew Alert*), promo otomatis (*Buy 2 Flavors Get 1 Ori Jumbo*), kustomisasi takaran gula cair, laporan keuangan otomatis, dan motivasi kerja berbasis Google Gemini AI untuk jaringan franchise/gerai **Teh Cap Poci**.

---

## 🚀 Fitur Unggulan

### 1. Terminal Kasir POS Multi-Kedai (Tablet & Mobile Ready)
- **Katalog Menu Vendor Resmi:**
  - 15 Varian Rasa Sachet (Jumbo only): Thai Tea, Cappuccino, Lemon Honey, Lychee, Chocolate, Apple, Orange, Blackcurrant, Mango, Milk Tea, Matcha, Aren Latte, Coconut Latte, Teh Tarik Gula Aren, Teh Krampul Selasih.
  - Varian Original Melati (Jasmine Poci): Reguler & Jumbo.
  - Topping Tambahan: Extra Creamy Topping.
- **Promo Otomatis Bundling:**
  - Beli 2 Teh Varian Rasa otomatis mendapatkan gratis 1 Jasmine Poci Jumbo (memotong stok cup dan teh dispenser secara akurat).
- **Kustomisasi Takaran Gula Cair Per Cup:**
  - Pilihan *Full Sugar* (100% / 30ml), *Less Sugar* (50% / 15ml), dan *Tawar* (0ml) yang memotong stok sirup gula cair di kedai secara real-time per mililiter.
- **Pelacakan Dispenser Teh 8L & Notifikasi Re-Brewing:**
  - Kalkulasi sisa teh dispenser batch 8.000 ml (Reguler = 180 ml, Jumbo = 250 ml).
  - Peringatan audio chime dan banner visual mencolok saat teh tersisa $\le 3\text{ Liter}$ agar barista menyeduh batch baru tepat waktu (estimasi seduh & dinginkan 50–60 menit).
  - Modal panduan SOP seduhan teh dan tombol 1-klik `[Selesai Brew (Isi 8L)]`.
- **Manajemen Alur Shift Kasir:**
  - **Buka Shift:** Pencatatan modal awal kasir (*initial cash float*) yang tersinkronisasi real-time.
  - **Uang Kas di Laci:** Perhitungan kas fisik real-time (`Modal Awal + Kas Masuk Tunai - Pengeluaran Kas Operasional`).
  - **Pencatatan Pengeluaran Kas (Petty Cash):** Kas keluar langsung tercatat dan memotong saldo kas laci secara live.
  - **Tutup Shift (*Blind Count*):** Kasir menginput sisa fisik cup reguler, cup jumbo, kantong teh, sirup gula cair (ml), dan total uang fisik di laci tanpa melihat angka sistem untuk mencegah manipulasi.
- **Transaksi & Cetak Struk:**
  - Pembayaran QRIS Dinamis & Tunai (Cash).
  - Cetak struk kasir Bluetooth printer (ESC/POS 58mm) & Browser Print.
  - Transaksi offline queue jika koneksi internet terputus.

---

### 2. Strict BOM Inventory & Material Tracking
- Pengurangan otomatis bahan baku per porsi/sachet hingga tingkat mililiter (ml) dan gram sesuai formula *Standard Operating Procedure (SOP)*.
- Pengurangan stok cup, sachet varian rasa, gula cair, dan teh poci tersinkronisasi per outlet.
- Restock bahan baku masuk dari gudang pusat dan opname stok mandiri per kedai.

---

### 3. Owner Portal & Financial Reconciliation
- **Rekonsiliasi Kas & Stok (*Theft Detection*):**
  - Analisis selisih stok fisik vs sistem (*variance analysis*).
  - Analisis selisih kas fisik laci kasir vs ekspektasi sistem dengan penandaan otomatis piutang kasir jika terjadi minus kas.
- **Laporan Finansial Komprehensif:**
  - Laporan Laba Rugi (*Profit & Loss*), Harga Pokok Penjualan (HPP / COGS), Arus Kas (*Cash Flow*), dan Neraca Keuangan.
- **Manajemen Cabang & Menu:**
  - Pengaturan cabang kedai (nama, alamat, target harian cup, modal awal kasir).
  - Pengaturan ketersediaan menu per cabang (*toggle on/off* per kedai).
  - Edit master menu dan harga jual langsung dari portal admin.
- **Keamanan & Backup:**
  - PIN Keamanan Owner Portal (default: `1234`, dapat diubah via dashboard).
  - Backup otomatis berkala dan fitur restore database SQLite 1-klik.

---

### 4. AI Pantun Motivasi Karyawan (Gemini AI)
- Generator pantun jenaka dan motivatif khas booth Teh Poci untuk membakar semangat tim mengejar target penjualan cup harian.
- Terintegrasi dengan Google Gemini API (`gemini-2.0-flash` / `gemini-1.5-flash`).
- Diperbarui otomatis setiap 15 menit atau via tombol interaktif *Acak Pantun*.

---

## 🛠️ Persyaratan Sistem

- **Node.js:** Versi 18.18.0 atau lebih baru ([Unduh Node.js](https://nodejs.org/))
- **Git:** Versi terbaru ([Unduh Git](https://git-scm.com/))
- **Cloudflare Tunnel (`cloudflared`):** Diperlukan jika ingin mengakses kasir via domain publik/internet ([Unduh Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/))
- **Sistem Operasi:** Windows / macOS / Linux

---

## 📦 Panduan Instalasi Awal (Initial Installation)

### Opsi A: Instalasi 1-Klik Otomatis (Khusus Windows)
1. Double-click file **`SETUP_INSTALLATION.bat`**.
2. Skrip akan secara otomatis:
   - Memeriksa instalasi Node.js.
   - Menyiapkan file `.env` dari `.env.example`.
   - Menginstall seluruh dependensi (`npm install`).
   - Melakukan sinkronisasi skema SQLite Prisma (`npx prisma db push`).
   - Mengisi data katalog menu, BOM, dan kedai awal (`npm run seed`).
   - Melakukan build optimasi produksi Next.js (`npm run build`).

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
   *Opsional: Masukkan `GEMINI_API_KEY` dari [Google AI Studio](https://aistudio.google.com/) ke dalam file `.env` untuk mengaktifkan pantun AI.*

4. **Inisialisasi Database SQLite & Skema Prisma:**
   ```bash
   npx prisma db push
   ```

5. **Isi Data Master Menu & Resep BOM Awal (Seed Data):**
   ```bash
   npm run seed
   ```

6. **Build Produksi:**
   ```bash
   npm run build
   ```

---

## 🚦 Menjalankan Aplikasi

### Mode Operasional Kasir & Cloudflare Tunnel (Windows)
Cukup jalankan file:
```bash
START_KASIR_POCI.bat
```
Skrip ini akan otomatis membuka:
1. **Next.js Production Server** pada `http://localhost:3000`.
2. **Cloudflare Tunnel Client** agar aplikasi dapat diakses secara publik melalui domain `https://kasir.ya-kasir-tehpoci.my.id`.

### Mode Developer (Pengujian & Koding)
```bash
npm run dev
```
Akses di browser: `http://localhost:3000`.

---

## 🌐 Panduan Migrasi ke PC / Laptop Lain (Cloudflare Tunnel Setup)

Agar domain `https://kasir.ya-kasir-tehpoci.my.id` dapat berjalan lancar saat proyek dipindahkan ke PC/laptop baru tanpa error **HTTP 503**, ikuti langkah berikut:

1. **Install Cloudflared di PC Baru:**
   - Download dan install `cloudflared-windows-amd64.msi` dari portal Cloudflare.
2. **Salin Folder Kredensial & Ingress Config:**
   - Salin folder konfigurasi Cloudflare dari PC lama:
     ```text
     C:\Users\<UserLama>\.cloudflared\
     ```
     ke folder profil user di PC baru:
     ```text
     C:\Users\<UserBaru>\.cloudflared\
     ```
   - Pastikan di dalam folder tersebut terdapat file `config.yml` dengan ingress rule mengarah ke port 3000:
     ```yaml
     tunnel: 1f9a2d5a-e7ba-4316-abb6-ae3141ed46f4
     credentials-file: C:\Users\<UserBaru>\.cloudflared\1f9a2d5a-e7ba-4316-abb6-ae3141ed46f4.json

     ingress:
       - hostname: kasir.ya-kasir-tehpoci.my.id
         service: http://localhost:3000
       - service: http_status:404
     ```
3. **Jalankan `START_KASIR_POCI.bat`:**
   - Server lokal dan tunnel Cloudflare akan langsung aktif dan terhubung tanpa error 503.

---

## 🔐 Kredensial & Navigasi

- **Terminal Kasir:** Akses di `http://localhost:3000` (atau via URL Cloudflare Tunnel).
- **Owner Portal / Admin:** Klik menu **Admin** di navigasi atas atau akses `http://localhost:3000/admin`.
- **Default PIN Admin:** `1234` *(Dapat diubah kapan saja di Admin $\rightarrow$ Ganti PIN)*.
- **Formulir Tutup Shift Kasir:** Akses di `http://localhost:3000/closing`.

---

## 📂 Struktur Direktori Proyek

```text
├── app/
│   ├── page.tsx                  # Terminal POS Kasir, Pelacakan Dispenser 8L, Cart, & Pantun AI
│   ├── admin/page.tsx            # Owner Portal, Finansial, Stok, Menu, & Rekonsiliasi Kas
│   ├── closing/page.tsx          # Formulir Tutup Shift Kasir (Blind Count Stok & Uang Fisik Laci)
│   ├── layout.tsx                # Root Layout & Metadata
│   └── api/
│       ├── checkout/route.ts     # Endpoint Transaksi POS (Pengurangan BOM & Validasi Promo)
│       ├── opening/route.ts      # Endpoint Buka Shift Kasir & Pencatatan Modal Awal
│       ├── closing/route.ts      # Endpoint Tutup Shift & Rekonsiliasi Selisih Stok/Kas
│       ├── expenses/route.ts     # Endpoint Pengeluaran Kas Operasional (Petty Cash)
│       ├── products/route.ts     # Endpoint Produk Aktif & Stok Bahan Baku Per Outlet
│       ├── gemini/pantun/        # Endpoint Generator Pantun Motivasi Otomatis (Gemini API)
│       └── admin/                # Endpoint Administrasi (Financial, Menus, Outlets, Backup, Restore)
├── prisma/
│   ├── schema.prisma             # Skema Database SQLite (Outlets, Products, ShiftClosing, dll)
│   ├── seed.ts                   # Master Seed 15 Varian Sachet Resmi, BOM, & Outlet
│   └── dev.db                    # Database SQLite Lokal
├── public/                       # Aset Gambar, Logo Resmi Es Teh Poci, & Ikon
├── backups/                      # Snapshot Cadangan Database SQLite Berkala
├── lib/
│   ├── escpos-printer.ts         # Utility Cetak Struk Thermal Bluetooth (ESC/POS 58mm)
│   └── prisma.ts                 # Prisma Client Singleton Instance
├── SETUP_INSTALLATION.bat        # Skrip Otomatis Instalasi Awal Proyek
├── START_KASIR_POCI.bat          # Skrip Otomatis Menjalankan Server POS & Cloudflare Tunnel
└── README.md                     # Dokumentasi Resmi Proyek
```

---

## 📄 Lisensi

Hak Cipta (c) 2026. Dikembangkan untuk efisiensi operasional dan standarisasi jaringan gerai **Teh Cap Poci**.
