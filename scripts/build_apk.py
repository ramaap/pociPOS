import os
import sys
import zipfile
import json
import io
import struct
import base64
import hashlib
import zlib
from PIL import Image, ImageDraw
from sign_apk import keys as keysmod
from sign_apk.signer import sign_apk
from sign_apk.verify import verify_apk

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_APK = os.path.join(BASE_DIR, "template.apk")
OUTPUT_APK = os.path.join(BASE_DIR, "public", "KasirTehPoci.apk")
KEY_PEM = os.path.join(BASE_DIR, "scripts", "tehpoci-key.pem")
CERT_CRT = os.path.join(BASE_DIR, "scripts", "tehpoci-cert.crt")
TEMP_UNSIGNED = os.path.join(BASE_DIR, "scripts", "temp_unsigned.apk")
USER_ICON_PATH = r"C:/Users/acer/.gemini/antigravity/brain/9cc57ad6-e5ad-4316-8f44-7f59ae480ea2/.user_uploaded/media_1795068383082_998ae90d.jpg"

TARGET_URL = "https://kasir.ya-kasir-tehpoci.my.id"

def generate_icons():
    """Menghasilkan icon berkualitas tinggi (Standard & Adaptive Icon Foreground)"""
    print("[1/5] Memproses icon aplikasi dari gambar Teh Poci YA!...")
    img = Image.open(USER_ICON_PATH).convert("RGBA")
    
    # Buat circular mask anti-alias dengan 2x supersampling pada resolusi asli (1024x1024)
    orig_w, orig_h = img.size
    mask = Image.new("L", (orig_w * 2, orig_h * 2), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((8, 8, orig_w * 2 - 9, orig_h * 2 - 9), fill=255)
    mask = mask.resize((orig_w, orig_h), Image.Resampling.LANCZOS)
    img.putalpha(mask)
    
    # 1. Standard circular 512x512 icon (untuk web, PWA, dan fallback legacy)
    std_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # 2. Adaptive Foreground 512x512
    # Android Adaptive Icon safe-zone adalah lingkaran 72dp di dalam canvas 108dp (~70% canvas)
    badge_size = 372
    badge_resized = img.resize((badge_size, badge_size), Image.Resampling.LANCZOS)
    fg_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    offset = (512 - badge_size) // 2
    fg_512.paste(badge_resized, (offset, offset), badge_resized)
    
    # Simpan ke assets web & PWA
    std_512.save(os.path.join(BASE_DIR, "public", "icon-512.png"))
    img_192 = std_512.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(os.path.join(BASE_DIR, "public", "icon-192.png"))
    img_64 = std_512.resize((64, 64), Image.Resampling.LANCZOS)
    img_64.save(os.path.join(BASE_DIR, "public", "favicon.png"))
    
    # Format JPEG untuk fallback logo
    img_rgb = img.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    img_rgb.save(os.path.join(BASE_DIR, "public", "logo-poci.jpg"), quality=95)
    std_512.save(os.path.join(BASE_DIR, "public", "logo.png"))

    buf_std = io.BytesIO()
    std_512.save(buf_std, format="PNG")
    std_png_bytes = buf_std.getvalue()

    buf_fg = io.BytesIO()
    fg_512.save(buf_fg, format="PNG")
    fg_png_bytes = buf_fg.getvalue()

    # Base64 untuk splash screen HTML
    b64_icon = base64.b64encode(std_png_bytes).decode("ascii")
    print(f"      Icon Standard ({len(std_png_bytes)} bytes) & Adaptive Foreground ({len(fg_png_bytes)} bytes) berhasil dibuat")
    return std_png_bytes, fg_png_bytes, b64_icon

def get_redirect_html(b64_icon):
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Kasir Teh Poci</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body, html {{
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 40%, #064e3b 100%);
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 24px;
            overflow: hidden;
        }}
        .card {{
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 28px;
            padding: 32px 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
        }}
        .logo-img {{
            width: 110px;
            height: 110px;
            border-radius: 50%;
            margin-bottom: 18px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            animation: pulse 2s infinite ease-in-out;
            background: #ffffff;
        }}
        h1 {{
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            color: #fef08a;
        }}
        p {{
            font-size: 13px;
            color: #f1f5f9;
            margin-bottom: 24px;
            font-weight: 500;
        }}
        .spinner {{
            width: 42px;
            height: 42px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top: 4px solid #facc15;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 14px;
        }}
        .status-txt {{
            font-size: 12px;
            color: #e2e8f0;
            letter-spacing: 0.3px;
        }}
        .btn-launch {{
            display: none;
            margin-top: 20px;
            padding: 12px 28px;
            background: #facc15;
            color: #78350f;
            font-weight: 800;
            font-size: 14px;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(250, 204, 21, 0.4);
            text-decoration: none;
        }}
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
        @keyframes pulse {{
            0%, 100% {{ transform: scale(1); }}
            50% {{ transform: scale(1.04); }}
        }}
    </style>
</head>
<body>
    <div class="card">
        <img class="logo-img" src="data:image/png;base64,{b64_icon}" alt="Teh Poci YA!" />
        <h1>Kasir Teh Poci</h1>
        <p>Terminal POS Multi-Kedai & Stok</p>
        <div class="spinner" id="spinner"></div>
        <div class="status-txt" id="status">Menghubungkan ke server kasir...</div>
        <button id="btnLaunch" class="btn-launch" onclick="redirectNow()">Buka Kasir Sekarang</button>
    </div>

    <script>
        const APP_URL = "https://kasir.ya-kasir-tehpoci.my.id";

        function redirectNow() {{
            window.location.replace(APP_URL);
        }}

        // Segera navigasi ke sistem kasir
        setTimeout(redirectNow, 300);

        // Fallback tombol manual jika koneksi lambat
        setTimeout(function() {{
            document.getElementById('status').innerText = "Sedang membuka halaman kasir...";
            document.getElementById('btnLaunch').style.display = 'block';
        }}, 2500);
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
    "remote_debug": False,
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
    "timestamp": "2026-11-25T10:07:00Z"
}

def patch_min_sdk(axml_data, new_min_sdk=21):
    """Mengubah minSdkVersion dari 31 ke 21 (Android 5.0+) secara biner di AndroidManifest.xml"""
    reader = io.BytesIO(axml_data)
    magic, size = struct.unpack('<II', reader.read(8))
    strings = []
    min_sdk_idx = -1
    while reader.tell() < size:
        chunk_type, chunk_size = struct.unpack('<II', reader.read(8))
        chunk_data = reader.read(chunk_size - 8)
        if chunk_type == 0x001C0001:
            str_count, style_count, flags, str_offset, style_offset = struct.unpack('<IIIII', chunk_data[:20])
            is_utf8 = bool(flags & (1 << 8))
            offsets = struct.unpack(f'<{str_count}I', chunk_data[20:20+str_count*4])
            str_data = chunk_data[str_offset-8:]
            for i, off in enumerate(offsets):
                if is_utf8:
                    l = str_data[off+1]
                    s = str_data[off+2:off+2+l].decode('utf-8', errors='ignore')
                else:
                    l = struct.unpack('<H', str_data[off:off+2])[0]
                    s = str_data[off+2:off+2+l*2].decode('utf-16le', errors='ignore')
                strings.append(s)
                if s == 'minSdkVersion':
                    min_sdk_idx = i
        elif chunk_type == 0x00100102:
            attr_count = struct.unpack_from('<H', chunk_data, 20)[0]
            name_idx = struct.unpack_from('<I', chunk_data, 12)[0]
            tag_name = strings[name_idx] if name_idx < len(strings) else ''
            if tag_name == 'uses-sdk':
                chunk_start = reader.tell() - (chunk_size - 8)
                attrs_start = chunk_start + 28
                for i in range(attr_count):
                    attr_offset = attrs_start + i * 20
                    a_name = struct.unpack_from('<I', axml_data, attr_offset + 4)[0]
                    if a_name == min_sdk_idx:
                        old_val = struct.unpack_from('<I', axml_data, attr_offset + 16)[0]
                        print(f"      Ditemukan minSdkVersion: {old_val} -> Diubah ke: {new_min_sdk} (Android 5.0 - 14+)")
                        struct.pack_into('<I', axml_data, attr_offset + 16, new_min_sdk)
                        return True
    return False

def noop_method_at(dex_data, code_off):
    """
    Mengubah method menjadi return-void diikuti oleh nop sampai akhir blok instruksi.
    code_off menunjuk ke DexCode item:
      offset 0..11: registers_size, ins_size, outs_size, tries_size, debug_info_off (12 bytes)
      offset 12..15: insns_size (uint32, jumlah unit 16-bit)
      offset 16..: instruksi bytecode
    """
    insns_size = struct.unpack_from('<I', dex_data, code_off + 12)[0]
    insns_start = code_off + 16
    insns_bytes_len = insns_size * 2
    
    # 0x000e = return-void di Dalvik/ART bytecode
    dex_data[insns_start] = 0x0e
    dex_data[insns_start + 1] = 0x00
    
    # Sisa instruksi diisi dengan 0x0000 (nop)
    for i in range(insns_start + 2, insns_start + insns_bytes_len):
        dex_data[i] = 0x00

def patch_return_zero_at(dex_data, code_off):
    """
    Mengubah method returning int agar langsung return 0:
      const/4 v0, 0 (0x12, 0x00)
      return v0 (0x0f, 0x00)
      nop (0x00, 0x00) untuk sisa instruksi
    """
    insns_size = struct.unpack_from('<I', dex_data, code_off + 12)[0]
    insns_start = code_off + 16
    insns_bytes_len = insns_size * 2
    
    dex_data[insns_start] = 0x12
    dex_data[insns_start + 1] = 0x00
    dex_data[insns_start + 2] = 0x0f
    dex_data[insns_start + 3] = 0x00
    for i in range(insns_start + 4, insns_start + insns_bytes_len):
        dex_data[i] = 0x00

ADAPTIVE_ICON_XML_B64 = (
    "AwAIAMABAAABABwAoAAAAAYAAAAAAAAAAAEAADQAAAAAAAAAAAAAAAsAAAAbAAAAJQAAADIAAAA/AAAACAhkcmF3"
    "YWJsZQANDWFkYXB0aXZlLWljb24ABwdhbmRyb2lkAAoKYmFja2dyb3VuZAAKCmZvcmVncm91bmQAKipodHRwOi"
    "8vc2NoZW1hcy5hbmRyb2lkLmNvbS9hcGsvcmVzL2FuZHJvaWQAgAEIAAwAAACZAQEBAAEQABgAAAACAAAA/////w"
    "IAAAAFAAAAAgEQACQAAAACAAAA//////////8BAAAAFAAUAAAAAAAAAAAAAgEQADgAAAADAAAA//////////8DAA"
    "AAFAAUAAEAAAAAAAAABQAAAAAAAAD/////CAAAATgABn8DARAAGAAAAAMAAAD//////////wMAAAACARAAOAAAAA"
    "QAAAD//////////wQAAAAUABQAAQAAAAAAAAAFAAAAAAAAAP////8IAAABXQAIfwMBEAAYAAAABAAAAP////////"
    "//BAAAAAMBEAAYAAAAAgAAAP//////////AQAAAAEBEAAYAAAAAgAAAP////8CAAAABQAAAA=="
)

def patch_classes_dex(dex_bytes):
    """
    Memodifikasi classes.dex untuk:
    1. Null-safe fix pada MainActivity.onCreate (instruction 69: 0x32 -> 0x23)
    2. Menonaktifkan pemanggilan method registerReceiver API 33+
    3. Menonaktifkan SdkExtensions API 30+ yang menyebabkan NoClassDefFoundError pada Android 10 ke bawah.
    """
    import logging
    logging.getLogger('androguard').setLevel(logging.ERROR)
    from androguard.core.dex import DEX
    
    d = DEX(dex_bytes)
    dex_data = bytearray(dex_bytes)
    
    # 0. Null-safe fix pada MainActivity.onCreate (instruction 69: v2.equals(v3) -> v3.equals(v2) [0x32 -> 0x23])
    # v3 adalah String constant 'android.intent.action.VIEW', v2 adalah intent.getAction() yang bisa bernilai null.
    if len(dex_data) > 3455425 and dex_data[3455424] == 0x32 and dex_data[3455420:3455424] == b'\x6e\x20\x21\x6e':
        dex_data[3455424] = 0x23
        print("      Patched MainActivity.onCreate instruction 69 (0x32 -> 0x23: null-safe equals)")
    
    void_targets = [
        ('Lnet/mikespub/mywebview/MainActivity;', 'startDownloadReceiver'),
        ('Lnet/mikespub/mywebview/MainActivity;', 'stopDownloadReceiver'),
        ('Lnet/mikespub/mywebview/MyAppWebViewClient;', 'setReceiver')
    ]
    
    zero_targets = [
        ('Landroidx/core/os/BuildCompat$Api30Impl;', 'getExtensionVersion')
    ]
    
    patched_count = 0
    for cls in d.get_classes():
        cname = cls.get_name()
        for m in cls.get_methods():
            for target_cls, target_name in void_targets:
                if cname == target_cls and m.get_name() == target_name:
                    if m.code_off > 0:
                        noop_method_at(dex_data, m.code_off)
                        print(f"      Patched {cname}::{m.get_name()} (off={m.code_off}) -> return-void + nop")
                        patched_count += 1
            for target_cls, target_name in zero_targets:
                if cname == target_cls and m.get_name() == target_name:
                    if m.code_off > 0:
                        patch_return_zero_at(dex_data, m.code_off)
                        print(f"      Patched {cname}::{m.get_name()} (off={m.code_off}) -> return-0 + nop")
                        patched_count += 1
                        
    if patched_count < 4:
        print("      Fallback patching by known offsets if any missed...")
        # Api30Impl.getExtensionVersion known offset: 1983812
        patch_return_zero_at(dex_data, 1983812)
            
    # Hitung ulang checksum DEX
    # 1. SHA-1 signature pada bytes 12..31 dari konten bytes 32..end
    sha1 = hashlib.sha1(dex_data[32:]).digest()
    dex_data[12:32] = sha1
    
    # 2. Adler-32 checksum pada bytes 8..11 dari konten bytes 12..end
    adler = zlib.adler32(dex_data[12:]) & 0xFFFFFFFF
    struct.pack_into('<I', dex_data, 8, adler)
    
    print(f"      DEX checksum & SHA1 berhasil diperbarui (Adler-32: {hex(adler)})")
    return bytes(dex_data)

def get_or_create_keys():
    if os.path.exists(KEY_PEM) and os.path.exists(CERT_CRT):
        print(f"[2/5] Memuat signing key: {KEY_PEM}")
        return keysmod.load_pem(KEY_PEM, CERT_CRT, None)
    else:
        print(f"[2/5] Membuat signing key baru untuk Teh Poci POS...")
        key_material = keysmod.generate_debug_key(common_name="Teh Poci POS Release", key_size=2048)
        keysmod.save_pem(key_material, KEY_PEM, CERT_CRT)
        print(f"      Key tersimpan di {KEY_PEM}")
        return key_material

def build_apk():
    print("=== MULAI BUILD APK KASIR TEH POCI (HUAWEI & TAB COMPATIBLE) ===")
    
    source_apk = TEMPLATE_APK if os.path.exists(TEMPLATE_APK) else OUTPUT_APK
    if not os.path.exists(source_apk):
        print(f"ERROR: File sumber APK tidak ditemukan di {source_apk}")
        sys.exit(1)

    std_icon_bytes, fg_icon_bytes, b64_icon = generate_icons()
    key_material = get_or_create_keys()

    print("[3/5] Memodifikasi aset APK, icon aplikasi, dan minSdkVersion...")
    redirect_html_bytes = get_redirect_html(b64_icon).encode("utf-8")
    settings_bytes = json.dumps(SETTINGS_JSON, indent=2).encode("utf-8")
    adaptive_xml_bytes = base64.b64decode(ADAPTIVE_ICON_XML_B64)

    redirect_files = {
        "assets/web/index.html": redirect_html_bytes,
        "assets/web/about.html": redirect_html_bytes,
        "assets/web/deeplinks.html": redirect_html_bytes,
        "assets/web/result.html": redirect_html_bytes,
        "assets/web/update.html": redirect_html_bytes,
        "assets/web/privacy.html": redirect_html_bytes,
        "assets/local/index.html": redirect_html_bytes,
        "assets/local/result.html": redirect_html_bytes,
        "assets/local/sites.html": redirect_html_bytes,
        "assets/settings.json": settings_bytes
    }

    with zipfile.ZipFile(source_apk, "r") as src_zip:
        with zipfile.ZipFile(TEMP_UNSIGNED, "w") as dst_zip:
            written_files = set()
            for item in src_zip.infolist():
                filename = item.filename
                
                # Lewati signature lama
                if filename.startswith("META-INF/") and filename.upper().endswith((".SF", ".RSA", ".DSA", ".EC")):
                    continue

                # Lewati file icon custom yang akan kita generate ulang
                if filename in ["res/0K.png", "res/BW.png", "res/Qr.png"]:
                    continue

                if filename in written_files:
                    continue

                new_info = zipfile.ZipInfo(filename)
                new_info.compress_type = item.compress_type
                new_info.date_time = item.date_time
                new_info.external_attr = item.external_attr

                if filename in redirect_files:
                    dst_zip.writestr(new_info, redirect_files[filename])
                    written_files.add(filename)
                elif filename == "AndroidManifest.xml":
                    manifest_data = bytearray(src_zip.read(filename))
                    patch_min_sdk(manifest_data, new_min_sdk=21)
                    dst_zip.writestr(new_info, bytes(manifest_data))
                    written_files.add(filename)
                elif filename == "resources.arsc":
                    arsc_data = bytearray(src_zip.read(filename))
                    # 1. Ganti nama aplikasi
                    arsc_data = arsc_data.replace(b"My WebView", b"Kasir Poci")
                    # 2. Kembalikan ic_launcher & round ke Adaptive Icon XML (res/BW.xml dan res/0K.xml)
                    arsc_data = arsc_data.replace(b"res/0K.png", b"res/0K.xml")
                    arsc_data = arsc_data.replace(b"res/BW.png", b"res/BW.xml")
                    # 3. Pastikan foreground icon menunjuk ke PNG foreground (res/Qr.png)
                    arsc_data = arsc_data.replace(b"res/Qr.xml", b"res/Qr.png")
                    # 4. Ganti warna background ic_launcher_background teal (#FF008577) ke pure white (#FFFFFFFF)
                    arsc_data = arsc_data.replace(b"\x77\x85\x00\xff", b"\xff\xff\xff\xff")
                    dst_zip.writestr(new_info, bytes(arsc_data))
                    written_files.add(filename)
                elif filename == "classes.dex":
                    dex_data = src_zip.read(filename)
                    patched_dex = patch_classes_dex(dex_data)
                    dst_zip.writestr(new_info, patched_dex)
                    written_files.add(filename)
                else:
                    data = src_zip.read(filename)
                    dst_zip.writestr(new_info, data)
                    written_files.add(filename)

            # Pastikan file binary XML adaptive-icon ada di APK
            for xml_name in ["res/BW.xml", "res/0K.xml"]:
                if xml_name not in written_files:
                    xml_info = zipfile.ZipInfo(xml_name)
                    xml_info.compress_type = zipfile.ZIP_DEFLATED
                    dst_zip.writestr(xml_info, adaptive_xml_bytes)
                    written_files.add(xml_name)
                    print(f"      Sisipkan default Adaptive Icon XML: {xml_name}")

            # Sisipkan foreground adaptive icon ke res/Qr.png
            if "res/Qr.png" not in written_files:
                fg_info = zipfile.ZipInfo("res/Qr.png")
                fg_info.compress_type = zipfile.ZIP_DEFLATED
                dst_zip.writestr(fg_info, fg_icon_bytes)
                written_files.add("res/Qr.png")
                print("      Sisipkan Adaptive Foreground: res/Qr.png")

            # Sisipkan standard icon ke res/0K.png dan res/BW.png (fallback bila launcher meminta bitmap murni)
            for icon_name in ["res/0K.png", "res/BW.png"]:
                if icon_name not in written_files:
                    icon_info = zipfile.ZipInfo(icon_name)
                    icon_info.compress_type = zipfile.ZIP_DEFLATED
                    dst_zip.writestr(icon_info, std_icon_bytes)
                    written_files.add(icon_name)
                    print(f"      Sisipkan Fallback Standard Icon: {icon_name}")

    print(f"      Unsigned APK dibuat: {TEMP_UNSIGNED} ({os.path.getsize(TEMP_UNSIGNED)} bytes)")

    print("[4/5] Melakukan penandatanganan resmi (v2 + v3 Scheme, minSdkVersion 21)...")
    os.makedirs(os.path.dirname(OUTPUT_APK), exist_ok=True)
    sign_result = sign_apk(
        input_path=TEMP_UNSIGNED,
        output_path=OUTPUT_APK,
        key_material=key_material,
        v2=True,
        v3=True,
        min_sdk_version=21
    )
    print(f"      Sign sukses: v2={sign_result['v2']}, v3={sign_result['v3']}")
    print(f"      File output: {OUTPUT_APK} ({os.path.getsize(OUTPUT_APK)} bytes)")

    print("[5/5] Memverifikasi integritas APK...")
    verify_result = verify_apk(OUTPUT_APK)
    print(f"      Verifikasi: VALID (APK Signature Scheme {'+'.join(verify_result['schemes'])})")
    for signer in verify_result['signers']:
        print(f"      Signer: {signer['scheme']} -> {signer['subject']}")

    if os.path.exists(TEMP_UNSIGNED):
        os.remove(TEMP_UNSIGNED)

    print(f"\nSUCCESS! File APK Kasir Teh Poci siap di:\n{OUTPUT_APK}")
    print(f"URL Unduh Langsung Real Device: {TARGET_URL}/KasirTehPoci.apk")

if __name__ == "__main__":
    build_apk()
