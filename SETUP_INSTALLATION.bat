@echo off
title ES TEH POCI POS - INITIAL SETUP & INSTALLATION
echo ========================================================
echo   SISTEM POS & INVENTARIS STRICT BOM - TEH CAP POCI
echo               INITIAL INSTALLATION SCRIPT
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Cek Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terinstall!
    echo Silakan install Node.js versi 18 atau lebih baru dari https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Memeriksa file konfigurasi .env...
if not exist .env (
    echo       Membuat file .env dari .env.example...
    copy .env.example .env >nul
) else (
    echo       File .env sudah tersedia.
)

echo [2/5] Menginstall dependensi proyek (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstall dependensi!
    pause
    exit /b 1
)

echo [3/5] Sinkronisasi skema database SQLite (prisma db push)...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Gagal sinkronisasi database!
    pause
    exit /b 1
)

echo [4/5] Mengisi data awal master menu, BOM, & outlet (npm run seed)...
call npm run seed

echo [5/5] Membangun build produksi Next.js (npm run build)...
call npm run build

echo.
echo ========================================================
echo    INSTALASI AWAL BERHASIL DISELESAIKAN DENGAN SUKSES!
echo.
echo    Untuk menjalankan kasir:
echo    1. Jalankan 'START_KASIR_POCI.bat' untuk mode operasional
echo    2. Atau jalankan 'npm run dev' untuk mode developer
echo ========================================================
echo.
pause
