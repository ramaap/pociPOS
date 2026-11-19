import os
import sys
import zipfile
import json
from sign_apk import keys as keysmod
from sign_apk.signer import sign_apk
from sign_apk.verify import verify_apk

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_APK = os.path.join(BASE_DIR, "template.apk")
OUTPUT_APK = os.path.join(BASE_DIR, "public", "KasirTehPoci.apk")
KEY_PEM = os.path.join(BASE_DIR, "scripts", "tehpoci-key.pem")
CERT_CRT = os.path.join(BASE_DIR, "scripts", "tehpoci-cert.crt")
TEMP_UNSIGNED = os.path.join(BASE_DIR, "scripts", "temp_unsigned.apk")

TARGET_URL = "https://kasir.ya-kasir-tehpoci.my.id"

REDIRECT_HTML = """<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Kasir Teh Poci</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 24px;
            overflow: hidden;
        }
        .card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 28px;
            padding: 36px 28px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .icon-circle {
            width: 80px;
            height: 80px;
            background: #ffffff;
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin-bottom: 20px;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
            animation: bounce 2s infinite ease-in-out;
        }
        h1 {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            color: #ffffff;
        }
        p {
            font-size: 14px;
            color: #a7f3d0;
            margin-bottom: 28px;
            font-weight: 500;
        }
        .spinner {
            width: 46px;
            height: 46px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top: 4px solid #34d399;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
        }
        .status-txt {
            font-size: 13px;
            color: #d1fae5;
            letter-spacing: 0.3px;
        }
        .btn-launch {
            display: none;
            margin-top: 24px;
            padding: 14px 28px;
            background: #f59e0b;
            color: #111827;
            font-weight: 700;
            font-size: 15px;
            border-radius: 14px;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
            text-decoration: none;
            transition: transform 0.1s ease;
        }
        .btn-launch:active {
            transform: scale(0.97);
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-circle">🍵</div>
        <h1>Kasir Teh Poci</h1>
        <p>Terminal POS & Manajemen Bahan Baku</p>
        <div class="spinner" id="spinner"></div>
        <div class="status-txt" id="status">Menghubungkan ke terminal kasir...</div>
        <button id="btnLaunch" class="btn-launch" onclick="redirectNow()">Buka Kasir Sekarang</button>
    </div>

    <script>
        const APP_URL = "https://kasir.ya-kasir-tehpoci.my.id";

        function redirectNow() {
            window.location.replace(APP_URL);
        }

        // Segera navigasi ke aplikasi kasir
        setTimeout(redirectNow, 350);

        // Jika koneksi lambat, berikan tombol fallback manual
        setTimeout(function() {
            document.getElementById('status').innerText = "Sedang memuat server cloud...";
            document.getElementById('btnLaunch').style.display = 'block';
        }, 2500);
    </script>
</body>
</html>
"""

SETTINGS_JSON = {
    "sites": [
        {
            "url": TARGET_URL,
            "title": "Kasir Teh Poci"
        }
    ],
    "other": TARGET_URL,
    "match": [
        ["host", "contains", "ya-kasir-tehpoci.my.id"],
        ["host", "contains", "kasir.ya-kasir-tehpoci.my.id"],
        ["host", "contains", "cloudflare"],
        ["host", "contains", "appassets"]
    ],
    "skip": [],
    "remote_debug": True,
    "console_log": False,
    "js_interface": False,
    "context_menu": False,
    "not_matching": False,
    "local_sites": False,
    "update_zip": "",
    "web_settings": {
        "JavaScriptEnabled": True,
        "DomStorageEnabled": True,
        "DatabaseEnabled": True
    },
    "source": "assets",
    "timestamp": "2026-11-19T12:00:00Z"
}

def get_or_create_keys():
    if os.path.exists(KEY_PEM) and os.path.exists(CERT_CRT):
        print(f"[1/4] Memuat signing key yang ada: {KEY_PEM}")
        return keysmod.load_pem(KEY_PEM, CERT_CRT)
    else:
        print(f"[1/4] Membuat signing key baru untuk Teh Poci POS...")
        key_material = keysmod.generate_debug_key(common_name="Teh Poci POS Release", key_size=2048)
        keysmod.save_pem(key_material, KEY_PEM, CERT_CRT)
        print(f"      Key tersimpan di {KEY_PEM}")
        return key_material

def build_apk():
    print(f"--- MULAI BUILD APK KASIR TEH POCI ---")
    if not os.path.exists(TEMPLATE_APK):
        print(f"ERROR: Template APK tidak ditemukan di {TEMPLATE_APK}")
        sys.exit(1)

    key_material = get_or_create_keys()

    print("[2/4] Melakukan modifikasi aset APK...")
    html_bytes = REDIRECT_HTML.encode("utf-8")
    settings_bytes = json.dumps(SETTINGS_JSON, indent=2).encode("utf-8")

    redirect_files = {
        "assets/web/index.html": html_bytes,
        "assets/web/about.html": html_bytes,
        "assets/web/deeplinks.html": html_bytes,
        "assets/web/result.html": html_bytes,
        "assets/web/update.html": html_bytes,
        "assets/web/privacy.html": html_bytes,
        "assets/local/index.html": html_bytes,
        "assets/local/result.html": html_bytes,
        "assets/local/sites.html": html_bytes,
        "assets/settings.json": settings_bytes
    }

    with zipfile.ZipFile(TEMPLATE_APK, "r") as src_zip:
        with zipfile.ZipFile(TEMP_UNSIGNED, "w") as dst_zip:
            for item in src_zip.infolist():
                filename = item.filename
                
                # Lewati signature file lama jika ada
                if filename.startswith("META-INF/") and filename.upper().endswith((".SF", ".RSA", ".DSA", ".EC")):
                    continue

                # Salin ZipInfo dasar
                new_info = zipfile.ZipInfo(filename)
                new_info.compress_type = item.compress_type
                new_info.date_time = item.date_time
                new_info.external_attr = item.external_attr

                if filename in redirect_files:
                    dst_zip.writestr(new_info, redirect_files[filename])
                elif filename == "resources.arsc":
                    arsc_data = src_zip.read(filename)
                    # Ganti "My WebView" dengan "Kasir Poci" (panjang sama persis: 10 byte)
                    arsc_data_mod = arsc_data.replace(b"My WebView", b"Kasir Poci")
                    dst_zip.writestr(new_info, arsc_data_mod)
                else:
                    data = src_zip.read(filename)
                    dst_zip.writestr(new_info, data)

    print(f"      Unsigned APK berhasil dibuat: {TEMP_UNSIGNED} ({os.path.getsize(TEMP_UNSIGNED)} bytes)")

    print("[3/4] Melakukan penandatanganan (Signing v2 + v3 Scheme)...")
    os.makedirs(os.path.dirname(OUTPUT_APK), exist_ok=True)
    sign_result = sign_apk(
        input_path=TEMP_UNSIGNED,
        output_path=OUTPUT_APK,
        key_material=key_material,
        v2=True,
        v3=True,
        min_sdk_version=24
    )
    print(f"      Sign sukses: v2={sign_result['v2']}, v3={sign_result['v3']}")
    print(f"      File output: {OUTPUT_APK} ({os.path.getsize(OUTPUT_APK)} bytes)")

    print("[4/4] Memverifikasi integritas APK...")
    verify_result = verify_apk(OUTPUT_APK)
    print(f"      Verifikasi: VALID (APK Signature Scheme {'+'.join(verify_result['schemes'])})")
    for signer in verify_result['signers']:
        print(f"      Signer: {signer['scheme']} -> {signer['subject']}")

    # Hapus file temporary unsigned
    if os.path.exists(TEMP_UNSIGNED):
        os.remove(TEMP_UNSIGNED)

    print(f"\nSUCCESS! File APK Kasir Teh Poci siap di:\n{OUTPUT_APK}")
    print(f"URL Unduh Langsung Real Device: {TARGET_URL}/KasirTehPoci.apk")

if __name__ == "__main__":
    build_apk()
