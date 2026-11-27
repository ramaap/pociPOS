# Test Case End-to-End Sisi Kasir (POS & Operasional Kedai)

Dokumen ini berisi daftar lengkap skenario pengujian (**Positif** dan **Negatif**) untuk seluruh alur transaksi sisi kasir pada aplikasi **Teh Cap Poci Multi-Kedai POS**.

> **Catatan Penting Sebelum Pengujian (Pra-Peluncuran 1 Desember 2026):**
> - Karena database saat ini sudah diamankan dengan Master Checkpoint `MASTER_CHECKPOINT_PRE_1_DES_2026.sqlite`, Anda bebas menjalankan simulasi transaksi kasir apa pun sebelum tanggal 1 Desember lalu melakukan **Restore** sebelum buka operasional.
> - **Perhatian Tanggal:** Laporan Keuangan / Neraca pada backend (`app/api/admin/financial-report/route.ts`) mengunci awal perhitungan omzet operasional mulai `2026-12-01`. Pengujian transaksi kasir tetap dapat diuji langsung di sisi **POS Kasir**, **BoothStock**, **Mutasi/Log**, **PromoVoucher**, **Expense**, dan **ShiftClosing** (sedangkan di halaman POS counter shift aktif membaca `shiftStartTime = last_opened_at`).
> - **Urutan Eksekusi:** Pengujian **Keamanan Gerbang & Kunci Outlet (Modul J)** sengaja ditempatkan paling akhir karena skenario *rate-limit* (`TC-J05`) memblokir IP selama 15 menit setelah 5 kali percobaan gagal, sehingga seluruh modul operasional (`Modul A`–`Modul I`) dipastikan tuntas terlebih dahulu.

---

## Ringkasan Cakupan Modul (48 Skenario — Sesuai Urutan Eksekusi)

| Urutan & Kode | Area Pengujian | Endpoint / Halaman Terkait | Positif | Negatif | Total |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1. TC-A** | Opening Kedai & Buka Shift | `/api/opening`, Modal Opening di `/` | 2 | 2 | **4** |
| **2. TC-B** | Keranjang, Level Gula & Validasi Stok BOM | `/`, `/api/products`, `/api/checkout` | 4 | 6 | **10** |
| **3. TC-C** | Pembayaran Cash, QRIS & Kembalian | `/`, `/api/checkout` | 3 | 2 | **5** |
| **4. TC-D** | Promo Beli 2 Gratis 1 & Voucher Struk | `/`, `/api/vouchers`, `/api/checkout` | 5 | 2 (multi-kasus) | **7** |
| **5. TC-E** | Masak Teh Dispenser 8L & Gula Cair | `/`, `/api/sugar-refill` | 3 | 1 | **4** |
| **6. TC-F** | Pengeluaran Kasir (Kas Keluar Laci) | `/`, `/api/expenses` | 2 | 1 (multi-kasus) | **3** |
| **7. TC-G** | Mode Offline, Antrean & Idempotent Sync | `lib/offline-sync.ts`, `/api/checkout` | 3 | 1 | **4** |
| **8. TC-H** | Cetak Struk Thermal (COM / BT / Browser) | `/api/print/com`, `lib/escpos-printer.ts` | 1 | 1 (multi-kasus) | **2** |
| **9. TC-I** | Tutup Shift (Blind Count) & Rekonsiliasi | `/closing`, `/api/closing` | 3 | 1 (multi-kasus) | **4** |
| **10. TC-J** | Keamanan Gerbang & Kunci Outlet *(Terakhir — ada blokir 15 menit)* | `/gate`, `/api/gate/verify`, `/api/admin/pin` | 2 | 3 | **5** |
| **Total** | | | **28** | **20** | **48** |

---

## Modul A — Opening Kedai & Buka Shift

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-A01** | Positif | Opening shift dengan modal kas laci & verifikasi stok | 1. Pada kedai berstatus `closed`, buka modal **Opening Shift**<br>2. Isi `cash_float = 100000` dan sesuaikan stok fisik awal<br>3. Simpan (`POST /api/opening`) | `outlet.shift_status` berubah menjadi `"open"`, `initial_cash = 100000`, `last_opened_at` terisi waktu sekarang, menu kasir aktif kembali. |
| **TC-A02** | Positif | Opening shift sambil bawa sirup gula matang dari rumah/pusat | 1. Buka modal **Opening Shift**<br>2. Isi `added_sugar_brought_ml = 1600`<br>3. Submit opening | Stok `Gula Cair` di `BoothStock` bertambah `+1600 ml`, terbuat log `SugarRefillLog` dengan `type = "opening_brought"`. |
| **TC-A03** | Negatif | Menambah produk ke keranjang saat shift masih tutup | 1. Pastikan kedai berstatus `shift_status: "closed"`<br>2. Klik item minuman mana saja di kasir POS | Penambahan ke keranjang ditolak dengan alert `"Shift kedai masih tutup. Silakan klik 'Opening Shift' terlebih dahulu."`; saldo laci menampilkan `Rp 0`. |
| **TC-A04** | Negatif | Input modal kas laci negatif / tidak valid / outlet tidak ada | 1. Kirim `POST /api/opening` dengan `cash_float = -5000` (atau `NaN`)<br>2. Kirim dengan `outlet_id` tidak dikenal | Respon `400` (`"Nominal uang cash yang dibawa harus berupa angka 0 atau lebih"`) atau `404` (`"Kedai tidak ditemukan"`). |

---

## Modul B — Keranjang, Level Gula & Validasi Stok BOM Ketat

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-B01** | Positif | Pemesanan multi-level gula (`Normal`, `Less Sugar`, `Tawar`) | 1. Tambah 1x Jasmine Jumbo (**Normal** = 50 ml gula)<br>2. Tambah 1x produk sama (**Less Sugar** = 20 ml gula)<br>3. Tambah 1x produk sama (**Tawar** = 0 ml gula)<br>4. Checkout | Ketiga cup tergabung dalam 1 kartu dengan `sugarBreakdown` (`normal:1, less:1, tawar:1`); pemakaian gula cair di `BoothStock` terpotong tepat **70 ml** (`50 + 20 + 0`); struk memecah label `(Less Sugar)` dan `(Tawar)`. |
| **TC-B02** | Positif | Penambahan add-on `Extra Creamy Topping` | 1. Tambah 1 minuman + 1 `Extra Creamy Topping`<br>2. Selesaikan checkout | Topping tidak memotong cairan teh barrel (`0 ml`), tidak dihitung dalam `todayCupsSold`, tidak memicu bonus varian rasa, dan stok bahan topping di `BoothStock` tetap terpotong sesuai BOM. |
| **TC-B03** | Positif | Modifikasi `sugarBreakdown` & pengurangan kuantitas item | 1. Pada item berjumlah 3 cup Normal, geser 1 cup menjadi `Less` lalu kurangi qty hingga `0` | Total qty tetap konsisten saat geser level gula; saat qty `0`, item terhapus bersih dari keranjang. |
| **TC-B04** | Negatif | Stok `Cup Reguler` atau `Cup Jumbo` habis/kurang | 1. Set stok `Cup Reguler = 1` di kedai<br>2. Tambah 1 cup Reguler (berhasil)<br>3. Coba tambah cup Reguler ke-2 | UI menolak dengan `"Stok Cup Reguler di kedai ini habis! Sisa: 0 pcs."`; jika ditembak langsung ke `POST /api/checkout`, server me-rollback & mengembalikan `400`. |
| **TC-B05** | Negatif | Stok sachet/perisa varian rasa habis | 1. Set stok sachet `Poci Mix Thai Tea 12g = 0` di `BoothStock`<br>2. Pastikan Cup & Gula masih cukup<br>3. Klik menu Thai Tea | Penambahan ditolak dengan pesan `"Stok ... kedai ini tidak cukup! Sisa: 0 ..."`, menu lain yang stok sachet-nya ada tetap bisa dipesan. |
| **TC-B06** | Negatif & Edge | Stok `Gula Cair = 0 ml` (Normal/Less ditolak vs Tawar lolos) | 1. Set `Gula Cair = 0 ml` di `BoothStock`<br>2. Coba tambah minuman dengan level `Normal` dan `Less Sugar`<br>3. Coba tambah minuman sama dengan level `Tawar` | `Normal` & `Less Sugar` ditolak (`"Stok Gula Cair di kedai ini tidak cukup! Sisa: 0 ml."`), sedangkan **`Tawar` diizinkan** karena kebutuhan gula `0 ml` dan checkout sukses memotong Cup + Sachet saja. |
| **TC-B07** | Negatif | Cairan teh di dispenser barrel habis/kurang (`< 180 ml` / `< 200 ml`) | 1. Turunkan stok dispenser lokal (`brewLiquidMl`) menjadi `150 ml`<br>2. Coba tambah minuman Reguler (butuh `180 ml`) / Jumbo (`200 ml`) | UI memblokir dengan `"Stok teh di dispenser habis/kurang! Sisa: 150 ml ... Silakan Re-Brew teh 8L terlebih dahulu."` *(Add-on Topping tetap dapat ditambahkan).* |
| **TC-B08** | Negatif | Menu dinonaktifkan di master (`active_status: false`) atau per kedai (`is_available: false`) | 1. Keranjang sudah berisi Produk X<br>2. Admin menonaktifkan Produk X untuk kedai tersebut<br>3. Kasir klik bayar/checkout | `POST /api/checkout` mengembalikan `400` dengan `problematicProductIds`, muncul dialog konfirmasi hapus produk bermasalah dari keranjang. |
| **TC-B09** | Negatif | Payload API checkout ilegal / korup | Kirim `POST /api/checkout` dengan:<br>a. `outletId` kosong / ID palsu<br>b. `items: []`<br>c. `quantity: 0` atau `-2` | Server menolak dengan `400` atau `404`, tidak ada transaksi tercipta, stok `BoothStock` tidak berubah. |
| **TC-B10** | Positif | Transaksi dengan BOM mengandung `Kantong Teh` / `Liquid Tea Premix` | 1. Pastikan stok `Kantong Teh` di `BoothStock = 0`, namun barrel dispenser memiliki `8000 ml`, Cup & Gula cukup<br>2. Tambah Jasmine Ori & checkout | Transaksi **tetap berhasil** karena sistem memakai acuan barrel dispenser 8L (bukan stok kantong teh) sebagai guard checkout. |

---

## Modul C — Pembayaran Cash, QRIS & Kalkulator Kembalian

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-C01** | Positif | Pembayaran tunai dengan tombol **Uang Pas** | 1. Checkout pesanan total `Rp 12.000`<br>2. Pilih `Cash` → klik **Uang Pas**<br>3. Klik konfirmasi bayar | Kembalian tampil `Rp 0`, API menyimpan `payment_method: "Cash"`, `todayCashIn` & kas laci kasir naik `+Rp 12.000`. |
| **TC-C02** | Positif | Pembayaran tunai via Numpad & Tombol Cepat (dengan kembalian) | 1. Checkout total `Rp 14.000`<br>2. Coba tombol cepat `10.000` (harus disabled), klik `20.000` (atau ketik via numpad + `000`)<br>3. Konfirmasi bayar | Tampil `"Kembalian Pelanggan: Rp 6.000"`, struk mencetak `Bayar: Rp 20.000` & `Kembali: Rp 6.000`, `todayCashIn` naik sebesar **`totalAmount` (`Rp 14.000`)**, bukan `Rp 20.000`. |
| **TC-C03** | Positif | Pembayaran non-tunai **QRIS** | 1. Pilih metode `QRIS`<br>2. Klik **Simulasi Pelanggan Sukses Scan QRIS** | Input numpad tunai disembunyikan, transaksi tersimpan `payment_method: "QRIS"`, `todayCupsSold` bertambah, **`todayCashIn` laci kasir TIDAK bertambah**. |
| **TC-C04** | Negatif | Pembayaran tunai kosong atau nominal kurang | 1. Pilih `Cash`, biarkan input kosong (`0`) → cek tombol bayar<br>2. Ketik nominal `10.000` untuk tagihan `Rp 15.000` | Panel merah `"Uang Kurang: Rp 5.000"`, tombol bayar dalam kondisi `disabled` (`"Masukkan Nominal Uang Tunai"` / `"Uang Kurang (Rp 5.000)"`). |
| **TC-C05** | Negatif | Atomisitas rollback saat multi-item gagal di tengah proses | 1. Masukkan Item A (stok cukup) + Item B (stok di DB diubah jadi `0` sebelum submit)<br>2. Kirim `POST /api/checkout` | Transaksi gagal total (`400`); **stok Item A di DB tidak ikut terpotong** (rollback atomik `prisma.$transaction`). |

---

## Modul D — Promo Otomatis, Voucher Struk & Redeem Voucher

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-D01** | Positif | Promo otomatis **Beli 2 Varian Rasa Gratis 1 Ori Jumbo** (kelipatan) | 1. Pastikan kampanye `buy2_get1` aktif<br>2. Tambah 2 cup varian rasa (non-Jasmine, non-Topping)<br>3. Tambah lagi 2 cup varian rasa (total 4) | Muncul otomatis 1 bonus `Jasmine Poci Iced Tea (Jumbo)` (`Rp 0`), lalu naik otomatis menjadi **2 cup gratis** saat varian rasa mencapai 4; stok fisik cup/gula/teh terpotong untuk item bonus. |
| **TC-D02** | Positif | Fallback otomatis ke **Voucher Struk (Opsi C)** saat stok bonus kurang | 1. Set sisa teh barrel atau `Gula Cair` / `Cup Jumbo` cukup untuk 2 varian rasa saja, tapi kurang untuk menyajikan bonus fisik<br>2. Masukkan 2 varian rasa & checkout | Bonus otomatis bertanda `isPromoVoucher: true` dengan kode `VCR-POC-XXXXXX`; setelah checkout, baris `PromoVoucher` tercipta dengan `status: "active"` (masa berlaku 3 hari) dan **stok fisik bonus tidak dipotong sekarang**. |
| **TC-D03** | Positif | Toggle manual antara Sajikan Fisik vs Cetak Jadi Voucher | 1. Saat item bonus promo ada di keranjang, klik tombol toggle mode voucher pada kartu bonus | Mode berganti antara `"Bonus Promo Otomatis"` dan `"Voucher Struk"`, kode `VCR-POC-XXXXXX` terbentuk/dihapus sesuai status toggle. |
| **TC-D04** | Positif | Penukaran / Redeem Voucher Struk (termasuk normalisasi 6 digit) | 1. Input kode `123456` (atau `POC-123456` / `VCR-POC-123456`) milik voucher berstatus `active` & belum expired<br>2. Terapkan & checkout | `GET /api/vouchers` valid, 1 `Jasmine Poci Iced Tea (Jumbo)` gratis masuk ke keranjang; setelah checkout, `PromoVoucher.status` berubah menjadi `"redeemed"`, `redeemed_at` & `redeemed_tx_id` terisi, stok fisik terpotong. |
| **TC-D05** | Positif | Pengecualian item gratis terhadap hitungan target penjualan (`todayCupsSold`) | 1. Transaksi berisi 2 varian rasa berbayar + 1 promo gratis (atau 1 redeem voucher)<br>2. Cek `todayCupsSold` sebelum vs sesudah checkout | `todayCupsSold` hanya bertambah **+2 cup** (cup berbayar dengan `unit_price > 0`), bukan +3 cup. |
| **TC-D06** | Negatif | Syarat promo tidak terpenuhi / kampanye nonaktif / dicabut saat dikurangi | Uji kasus:<br>a. Beli 2 `Jasmine Poci` (bukan varian rasa) atau 1 varian rasa + 1 Topping<br>b. Tambah 2 varian rasa (bonus muncul), lalu kurangi menjadi 1<br>c. Admin set kampanye `inactive` / `expired` / `scheduled` / `outlet_not_targeted` | Kasus (a) & (c): tidak ada bonus otomatis.<br>Kasus (b): item bonus promo langsung hilang otomatis dari keranjang. |
| **TC-D07** | Negatif | Validasi negatif saat menukar kode voucher | Uji kasus:<br>a. Kode tidak ada (`VCR-POC-000000`)<br>b. Voucher sudah berstatus `redeemed`<br>c. Voucher kedaluwarsa (`expires_at < now`)<br>d. Tukar 2 voucher sekaligus dalam 1 keranjang<br>e. Tukar voucher saat stok `Cup Jumbo` / `Gula` / teh dispenser habis | (a) `404` kode tidak ditemukan.<br>(b) `400` sudah pernah digunakan.<br>(c) `400` masa berlaku habis.<br>(d) UI menolak karena 1 voucher sudah terpasang.<br>(e) UI menolak dengan alasan stok kedai tidak mencukupi. |

---

## Modul E — Masak Ulang Teh 8L & Gula Cair + Potong Gula Pasir

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-E01** | Positif | Re-Brew batch teh dispenser (`8.000 ml`) & trigger alert | 1. Turunkan barrel ke `3.000 ml` (zona low) lalu `1.500 ml` (zona kritis)<br>2. Klik **Re-Brew 8L** | Banner alert & chime aktif pada batas `<= 3000 ml` dan `<= 1500 ml`; setelah Re-Brew, barrel kembali `8.000 ml` dan alert hilang. |
| **TC-E02** | Positif | Masak sirup gula (`+1.600 ml`) memotong stok `Gula Pasir` (`-1.000 gr`) | 1. Catat stok awal `Gula Cair` & `Gula Pasir` (`>= 1.000 gr`)<br>2. Klik konfirmasi Masak Sirup `+1.600 ml` (`POST /api/sugar-refill`) | `Gula Cair` naik `+1.600 ml`, `Gula Pasir` otomatis berkurang `1.000 gr`, tercipta `StockTransferLog` (`sugar_brew`) & `SugarRefillLog` (`brew`). |
| **TC-E03** | Positif | Penyesuaian manual volume gula cair (`setMl`) | 1. Kirim `setMl: 2000` (tanpa `addedMl`) | `Gula Cair` diset menjadi `2.000 ml`, tercatat `SugarRefillLog` (`manual_adjust`), **`Gula Pasir` tidak terpotong**. |
| **TC-E04** | Negatif | Validasi negatif refill gula | Kirim `POST /api/sugar-refill` dengan:<br>a. `outletId` tidak ada<br>b. Body tanpa `addedMl` dan tanpa `setMl` | (a) `404` (`"Outlet tidak ditemukan"`).<br>(b) `400` (`"addedMl atau setMl wajib disertakan"`). |

---

## Modul F — Pengeluaran Kasir (Kas Keluar Laci)

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-F01** | Positif | Catat pengeluaran operasional saat shift aktif | 1. Buka modal Pengeluaran Kasir<br>2. Isi kategori `es_batu`, deskripsi `"Es Batu 2 Bal"`, nominal `15000`<br>3. Simpan (`POST /api/expenses`) | Record `Expense` tersimpan, `todayExpenseTotal` naik `+Rp 15.000`, saldo kas laci (`todayCashBalance`) otomatis berkurang `Rp 15.000`. |
| **TC-F02** | Positif | Hapus catatan pengeluaran salah input | 1. Klik hapus pada item pengeluaran di daftar hari ini (`DELETE /api/expenses?id=...`) | Record terhapus dari DB, `todayExpenseTotal` turun dan kas laci kembali seperti semula. |
| **TC-F03** | Negatif | Pengeluaran saat shift tutup atau input tidak valid | Uji kasus:<br>a. `shift_status === "closed"` pada outlet terpilih<br>b. Deskripsi kosong `""` / spasi<br>c. Nominal `0` atau `-10000`<br>d. `DELETE /api/expenses` tanpa `id` | (a) `400` (`"Shift kedai masih tutup. Silakan buka shift terlebih dahulu..."`).<br>(b) `400` (`"Deskripsi pengeluaran wajib diisi"`).<br>(c) `400` (`"Nominal pengeluaran harus berupa angka positif"`).<br>(d) `400` (`"ID pengeluaran wajib disertakan"`). |

---

## Modul G — Mode Offline, Antrean Lokal & Idempotent Sync

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-G01** | Positif | Checkout transaksi saat internet mati (Offline-First) | 1. Aktifkan mode *Offline* di DevTools / putuskan jaringan<br>2. Checkout 1 transaksi Cash & 1 QRIS | UI menampilkan badge **Offline**, transaksi disimpan ke `localStorage` (`teh_poci_offline_tx_queue`) dengan `offlineId` (`tx_off_...`), `Sync (2)` muncul di header, struk tampil dengan penanda offline. |
| **TC-G02** | Positif | Sinkronisasi otomatis saat kembali online | 1. Sambungkan jaringan kembali (`online` event) atau klik tombol **Sync (N)** | `syncPendingTransactions()` memanggil `/api/checkout` untuk tiap antrean; transaksi & pemotongan `BoothStock` masuk DB, `pendingSyncCount` menjadi `0`. |
| **TC-G03** | Positif | Idempotency Check (`offlineId` kembar / double-send) | 1. Kirim `POST /api/checkout` 2 kali berturut-turut dengan `offlineId: "tx_off_test_001"` identik | Request ke-1: `201 Created`, transaksi dibuat & stok terpotong.<br>Request ke-2: `200 OK` (`"Transaksi sudah tersimpan sebelumnya (Idempotent replay)"`), **stok tidak terpotong ganda**. |
| **TC-G04** | Negatif | Sync offline gagal karena stok server sudah habis | 1. Buat antrean offline untuk Produk Y<br>2. Sebelum online, habiskan stok Cup/Sachet Produk Y di DB<br>3. Aktifkan internet & jalankan sync | `/api/checkout` menolak `400`; transaksi tetap **tertahan di `teh_poci_offline_tx_queue`** (`failedCount: 1`) sehingga bukti transaksi kasir tidak hilang. |

---

## Modul H — Cetak Struk Thermal

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-H01** | Positif | Cetak struk normal, multi-gula, voucher, dan auto-close | 1. Setelah checkout sukses, verifikasi countdown auto-close `5 detik`<br>2. Klik **Cetak Struk** (Browser Print / COM Port / Bluetooth)<br>3. Verifikasi layout item gula, `[PROMO GRATIS]`, dan blok `[VOUCHER STRUK]` | Saat dialog pairing dipicu, timer auto-close otomatis ter-pause (`isTimerPaused: true`); struk menampilkan rincian qty, harga, kembalian/QRIS, dan kode voucher jika ada. |
| **TC-H02** | Negatif | Gagal cetak & validasi keamanan endpoint COM Port | Uji kasus:<br>a. `POST /api/print/com` dengan `port: "COM0"` atau `"COM1; whoami"`<br>b. `escposBase64` kosong / non-base64 / `> 100.000` char<br>c. Port COM fisik belum nyala / tidak ada<br>d. Cancel dialog Bluetooth di browser | (a) `400` format port tidak valid.<br>(b) `400` data ESC/POS tidak valid.<br>(c) `500` tampil pesan error cetak tanpa menghapus transaksi yang sudah tersimpan.<br>(d) Warning `"Pencarian printer Bluetooth dibatalkan oleh kasir."` tanpa crash UI. |

---

## Modul I — Tutup Shift (Blind Count) & Rekonsiliasi

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-I01** | Positif | Tutup shift akurat tanpa selisih (`Cup`, `Teh`, `Gula`, `Kas`) | 1. Buka `/closing`<br>2. Input sisa fisik `Cup Reguler`, `Cup Jumbo`, `Kantong Teh`, `Gula Cair`, dan `Kas Laci` sama persis dengan hitungan sistem<br>3. Submit | `POST /api/closing` mengembalikan `201`; `employee_debt = 0`, `theft_flag = false`, `waste_flag = false`; `BoothStock` disinkronkan; `outlet.shift_status = "closed"`; `actual_cash` masuk ke `CentralVault` (`closing_deposit`). |
| **TC-I02** | Positif | Submit tutup shift saat internet mati (Offline Fallback) | 1. Putuskan internet di halaman `/closing`<br>2. Lengkapi form & submit | Data tersimpan ke `localStorage` key `offline_shift_closing`, halaman menampilkan konfirmasi sukses & mengirim event sinkronisasi antar tab. |
| **TC-I03** | Positif (Audit) | Perhitungan otomatis denda selisih (`theft_flag` & `waste_flag`) | 1. Input fisik `Cup Reguler` kurang 2 pcs, atau `Kas Laci` kurang `Rp 10.000`, atau `Kantong Teh` defisit `> 2%`<br>2. Submit form | Kasir tetap melihat layar sukses **Blind Count** (tidak bocor angka sistem); di server: `theft_flag = true`, `employee_debt` terisi (`2 * hargaReguler + 10.000`), `waste_flag = true` jika defisit kantong teh `> 2%`. |
| **TC-I04** | Negatif | Validasi input form closing & otorisasi ubah outlet | Uji kasus:<br>a. Submit dengan salah satu field kosong<br>b. Isi angka negatif (atau kirim via API `actual_cash: -100`)<br>c. Klik **Ubah (PIN Admin)** di `/closing` dengan PIN salah | (a) Alert `"Mohon lengkapi semua isian hitungan fisik..."`.<br>(b) Alert UI & `POST /api/closing` `400` (`"Isian hitungan fisik tidak valid..."`).<br>(c) Ditolak `"PIN Admin salah."`. |

---

## Modul J — Keamanan Gerbang & Penguncian Outlet *(Dijalankan Terakhir)*

> **Catatan:** Jalankan modul ini **paling akhir** setelah `Modul A` s/d `Modul I` selesai, karena `TC-J05` memicu pemblokiran IP lokal selama 15 menit pada memori server `/api/gate/verify`.

| ID | Tipe | Judul Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :---: | :--- | :--- | :--- |
| **TC-J01** | Positif | Ganti kedai terkunci dengan PIN Admin valid | 1. Pastikan keranjang berisi minimal 1 item<br>2. Klik tombol **Kedai** di header POS<br>3. Masukkan PIN Admin valid (`1234`) & pilih outlet lain<br>4. Terapkan pergantian outlet | Verifikasi `/api/admin/pin` sukses, `poci_locked_outlet_id` berubah ke outlet baru, **keranjang otomatis kosong**, daftar menu & stok memuat milik outlet baru. |
| **TC-J02** | Negatif | Ganti kedai terkunci dengan PIN Admin salah | 1. Klik tombol **Kedai** di header POS<br>2. Masukkan PIN salah (`9999`) | Alert `"PIN Admin salah."` tampil, dropdown pilihan outlet tetap terkunci dan outlet aktif tidak berubah. |
| **TC-J03** | Positif | Login Gerbang Keamanan dengan kunci valid *(uji sebelum memicu blokir)* | 1. Buka `/gate`<br>2. Masukkan passphrase valid (`GATE_SECRET`, default `tehpoci2024`)<br>3. Klik **Buka Gerbang** | `POST /api/gate/verify` mengembalikan `200`, cookie `gate_token` (`httpOnly`, 30 hari) tersimpan, halaman redirect ke `/`. |
| **TC-J04** | Negatif | Login Gerbang dengan kunci salah (1–4x) | 1. Buka `/gate`<br>2. Masukkan kunci acak `salah123`<br>3. Submit 1–4 kali | `POST /api/gate/verify` mengembalikan `401` (`"Kunci akses salah."`), halaman tetap di `/gate`, alert merah muncul. |
| **TC-J05** | Negatif | Rate limit brute-force setelah 5x gagal *(Memicu Blokir 15 Menit)* | 1. Lanjutkan masukkan kunci salah pada percobaan **ke-5** dalam 5 menit dari IP sama<br>2. Coba lagi percobaan ke-6 (bahkan dengan kunci benar) | `POST /api/gate/verify` mengembalikan `429` (`"Terlalu banyak percobaan. Coba lagi dalam 15 menit."`), IP diblokir 15 menit. |
