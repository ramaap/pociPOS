@echo off
REM Script Pendaftaran Cron Task Scheduler Windows untuk Backup Database Teh Poci
REM Menjalankan backup otomatis setiap 2 hari sekali pukul 02:00 WIB dini hari

cd /d "%~dp0.."
echo =======================================================
echo  PENDAFTARAN CRON BACKUP DATABASE TEH CAP POCI
echo  Jadwal: Setiap 2 Hari Sekali (Pukul 02:00 Pagi)
echo =======================================================
echo.

schtasks /create /tn "TehPoci_DB_Backup" /tr "cmd /c cd /d \"%cd%\" && npm run backup-db" /sc daily /mo 2 /st 02:00 /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [BERHASIL] Jadwal cron backup database berhasil didaftarkan di Windows Task Scheduler!
    echo Next Run: Setiap 2 hari pukul 02:00:00
) else (
    echo.
    echo [PERINGATAN] Gagal mendaftarkan task scheduler secara otomatis. Jalankan sebagai Administrator jika diperlukan.
)

echo.
pause

