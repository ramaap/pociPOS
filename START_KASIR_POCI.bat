@echo off
title ES TEH POCI - SERVER & TUNNEL LAUNCHER
echo ========================================================
echo    MENJALANKAN SERVER KASIR & CLOUDFLARE TUNNEL
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Menjalankan Server POS (Port 3000)...
start "POCI Next.js Server" cmd /k "npm run start"

timeout /t 3 /nobreak >nul

echo [2/2] Menjalankan Cloudflare Tunnel (kasir.ya-kasir-tehpoci.my.id)...
start "POCI Cloudflare Tunnel" cmd /k "cloudflared tunnel run tehpoci-pos"

echo.
echo ========================================================
echo   SEMUA SISTEM SUDAH BERJALAN DENGAN SUKSES!
echo.
echo   Tablet Kasir dapat membuka:
echo   https://kasir.ya-kasir-tehpoci.my.id
echo.
echo   CATATAN: 
echo   JANGAN TUTUP DUA JENDELA HITAM YANG MUNCUL
echo   SELAMA JAM OPERASIONAL BERJUALAN!
echo ========================================================
pause

