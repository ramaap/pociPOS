@echo off
chcp 65001 >nul
echo ========================================================
echo   PELACAK ERROR LOG CRASH (KASIR TEH POCI ANDROID)
echo ========================================================
echo.
echo 1. Pastikan HP / Tab tersambung ke PC via kabel USB.
echo 2. Pastikan Opsi Pengembang (Developer Options) dan USB Debugging aktif di HP.
echo.
echo Mengecek koneksi perangkat...
"%~dp0..\tools\platform-tools\adb.exe" devices
echo.
echo Silakan buka aplikasi Kasir di HP Anda sampai force close,
echo lalu tekan tombol apapun di keyboard untuk menarik log error...
pause >nul

echo.
echo Menarik crash log dari sistem Android...
"%~dp0..\tools\platform-tools\adb.exe" logcat -d -b crash > "%~dp0..\crash_log.txt"
"%~dp0..\tools\platform-tools\adb.exe" logcat -d -s AndroidRuntime:E *:F >> "%~dp0..\crash_log.txt"

echo.
echo ================= HASIL CRASH LOG =================
type "%~dp0..\crash_log.txt"
echo ===================================================
echo.
echo Log lengkap berhasil disimpan di: crash_log.txt
echo Silakan copy-paste teks di atas ke chat ini.
pause
