import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/ai-config";

export async function GET() {
  try {
    const apiKey = getGeminiApiKey();
    const hasApiKey = Boolean(apiKey && apiKey.length > 5);
    return NextResponse.json({
      hasApiKey,
      maskedKey: hasApiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memeriksa konfigurasi AI" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Simpan API Key Baru
    if (action === "save_api_key") {
      const { apiKey } = body;
      if (!apiKey || String(apiKey).trim().length < 6) {
        return NextResponse.json({ error: "Gemini API Key tidak valid." }, { status: 400 });
      }
      setGeminiApiKey(apiKey.trim());
      return NextResponse.json({
        success: true,
        message: "Gemini API Key berhasil disimpan untuk pemindaian foto struk & nota.",
      });
    }

    // 2. Simpan Batch Aset ke Database
    if (action === "save_batch") {
      const { items, defaultOutletId } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Tidak ada data aset untuk disimpan." }, { status: 400 });
      }

      const validItems = items
        .filter((it: any) => it.name && Number(it.cost) > 0)
        .map((it: any) => {
          const finalOutletId =
            it.outletId && it.outletId !== "all"
              ? it.outletId
              : defaultOutletId && defaultOutletId !== "all"
              ? defaultOutletId
              : null;

          const finalAssetType =
            it.asset_type === "tidak_bergerak" || it.category === "booth"
              ? "tidak_bergerak"
              : "bergerak";

          return {
            name: String(it.name).trim(),
            category: String(it.category || "peralatan").toLowerCase(),
            asset_type: finalAssetType,
            cost: Math.round(Number(it.cost)),
            outlet_id: finalOutletId,
            purchase_date: it.purchase_date ? new Date(it.purchase_date) : new Date(),
            notes: it.notes ? String(it.notes).trim() : null,
          };
        });

      if (validItems.length === 0) {
        return NextResponse.json(
          { error: "Semua item tidak valid (nama barang dan nominal harga wajib diisi)." },
          { status: 400 }
        );
      }

      const created = await prisma.capitalAsset.createMany({
        data: validItems,
      });

      return NextResponse.json({
        success: true,
        count: created.count,
        message: `Berhasil menambahkan ${created.count} aset baru ke dalam pembukuan modal usaha.`,
      });
    }

    // 3. Scan & Ekstrak Item dari Gambar Nota / Screenshot
    if (action === "scan") {
      const { imageBase64, mimeType = "image/jpeg" } = body;
      if (!imageBase64) {
        return NextResponse.json({ error: "File gambar tidak ditemukan." }, { status: 400 });
      }

      const apiKey = body.apiKey || getGeminiApiKey();
      if (!apiKey || String(apiKey).trim().length < 6) {
        return NextResponse.json(
          {
            error:
              "Google Gemini API Key belum diset. Silakan masukkan API Key Anda (dapatkan gratis di aistudio.google.com).",
            needApiKey: true,
          },
          { status: 400 }
        );
      }

      // Bersihkan data URL prefix jika ada
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

      const todayStr = new Date().toISOString().split("T")[0];
      const prompt = `Anda adalah asisten auditor akuntansi dan inventaris aset untuk waralaba/kedai "Teh Cap Poci".
Tugas Anda adalah membaca gambar struk nota fisik, invoice kasir, faktur belanja, atau screenshot pesanan e-commerce (Shopee, Tokopedia, Bukalapak, TikTok Shop, dsb.) ini dengan sangat cermat.

Instruksi Analisis:
1. Ekstrak setiap item pembelian aset tetap / peralatan / barang perlengkapan operasional kedai (contoh: booth gerobak, meja bar, mesin cup sealer, dispenser stainless, termos es, cooler box, blender, tablet POS, printer bluetooth thermal, kabel terminal, kipas angin, wadah shaker, saringan teh, dsb.).
2. Untuk setiap item yang ditemukan, buat objek dengan struktur:
   - "name": nama barang aset yang bersih dan jelas (contoh: "Mesin Cup Sealer D8 Eton", "Dispenser Stainless Steel 12L", "Cooler Box 35L", "Booth Kayu Display").
   - "cost": nominal harga total per item dalam satuan rupiah berupa ANGKA BULAT (integer tanpa titik, tanpa koma, tanpa Rp). Jika ada diskon produk, gunakan harga bersih final.
   - "category": pilih SATU kategori yang paling sesuai dari daftar berikut:
     * "booth" (Gerobak booth, meja kasir, tenda, display kayu)
     * "mesin" (Mesin sealer cup, mesin es kristal, blender shaker, kompor)
     * "peralatan" (Dispenser termos stainless, cooler box es, wadah bahan, saringan)
     * "pos" (Tablet android kasir, printer thermal bluetooth, laci uang cash drawer)
     * "elektronik" (Kipas angin, lampu sorot, colokan roll listrik)
     * "lainnya" (Perlengkapan aset fisik lainnya)
   - "asset_type": klasifikasikan ke dalam salah satu dari dua tipe:
     * "tidak_bergerak": jika masa pakainya panjang dan memiliki stabilitas nilai jangka panjang (contoh: booth gerobak display, meja bar kasir, tenda kanopi permanen).
     * "bergerak": jika masa pakainya terbatas dan nilainya menyusut/berfluktuasi (contoh: mesin sealer, dispenser termos stainless, cooler box, tablet POS, printer bluetooth, kabel, timbangan, shaker).
   - "purchase_date": tanggal transaksi dalam format "YYYY-MM-DD" jika terbaca di struk/nota. Jika tidak ada tanggal tertera, isi dengan "${todayStr}".
   - "notes": keterangan pendukung (contoh: nama toko/penjual, nomor pesanan, atau spesifikasi ringkas).

KEMBALIKAN HANYA FORMAT JSON VALID BERUPA ARRAY OF OBJECTS:
[
  {
    "name": "Nama Barang",
    "category": "booth|mesin|peralatan|pos|elektronik|lainnya",
    "asset_type": "bergerak|tidak_bergerak",
    "cost": 1500000,
    "purchase_date": "YYYY-MM-DD",
    "notes": "Nama Toko / Keterangan"
  }
]
JANGAN gunakan pembungkus markdown (tanpa \`\`\`json atau \`\`\`), dan JANGAN sertakan kalimat pengantar atau penutup.`;

      const models = ["gemini-3.5-flash", "gemini-flash-latest"];
      let rawTextResult: string | null = null;
      let lastErrorMessage = "";

      for (const model of models) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType: mimeType || "image/jpeg",
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 4096,
                  responseMimeType: "application/json",
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              rawTextResult = text;
              break;
            }
          } else {
            const errText = await geminiRes.text();
            console.warn(`Gemini Vision API (${model}) error:`, errText);
            lastErrorMessage = errText;
          }
        } catch (err: any) {
          console.warn(`Connection error to ${model}:`, err);
          lastErrorMessage = err.message || "Gagal menghubungi Gemini";
        }
      }

      if (!rawTextResult) {
        return NextResponse.json(
          {
            error: `Gagal memproses gambar struk dengan Gemini AI. Silakan periksa koneksi internet atau validitas API Key. (${lastErrorMessage.slice(0, 100)})`,
          },
          { status: 502 }
        );
      }

      // Parsing JSON
      let parsedItems: any[] = [];
      try {
        const stripped = rawTextResult
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/, "")
          .replace(/```$/g, "")
          .trim();
        const arrStart = stripped.indexOf("[");
        const arrEnd = stripped.lastIndexOf("]");
        const cleanJsonStr =
          arrStart !== -1 && arrEnd > arrStart ? stripped.slice(arrStart, arrEnd + 1) : stripped;
        parsedItems = JSON.parse(cleanJsonStr);
        if (!Array.isArray(parsedItems)) {
          if (typeof parsedItems === "object" && (parsedItems as any).items) {
            parsedItems = (parsedItems as any).items;
          } else {
            parsedItems = [parsedItems];
          }
        }
      } catch (parseErr) {
        console.error("Gagal parse output AI ke JSON:", parseErr, rawTextResult);
        return NextResponse.json(
          {
            error: "Format respon AI tidak dapat dibaca sebagai data tabel. Silakan coba gambar dengan tulisan lebih jelas.",
            raw: rawTextResult,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        items: parsedItems.map((item, idx) => ({
          id: `extracted-${Date.now()}-${idx}`,
          name: item.name || "Aset Terdeteksi",
          category: ["booth", "mesin", "peralatan", "pos", "elektronik"].includes(item.category?.toLowerCase())
            ? item.category.toLowerCase()
            : "peralatan",
          asset_type: item.asset_type === "tidak_bergerak" || item.category === "booth" ? "tidak_bergerak" : "bergerak",
          cost: Number(item.cost) || 0,
          purchase_date: item.purchase_date || todayStr,
          notes: item.notes || "",
          selected: true,
        })),
        count: parsedItems.length,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error: any) {
    console.error("Scan Asset Receipt API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
