import fs from "fs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTtsAudioFilePath, synthesizeDraftVoiceover } from "@/lib/agents/social-media";
import { GEMINI_TTS_VOICES } from "@/lib/agents/gemini";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get("draftId") || "";
    const download = searchParams.get("download") === "1";

    if (!draftId) {
      return NextResponse.json({ error: "draftId wajib disertakan" }, { status: 400 });
    }

    const filePath = getTtsAudioFilePath(draftId);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File audio voiceover belum tersedia" }, { status: 404 });
    }

    const fileBuf = fs.readFileSync(filePath);
    return new NextResponse(new Uint8Array(fileBuf), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(fileBuf.length),
        "Content-Disposition": download
          ? `attachment; filename="voiceover-${draftId}.wav"`
          : `inline; filename="voiceover-${draftId}.wav"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET social-content tts error:", error);
    return NextResponse.json({ error: "Gagal membaca file voiceover" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const draftId = String(body?.draftId || "").trim();
    const voiceName = String(body?.voiceName || "Kore").trim();

    if (!draftId) {
      return NextResponse.json({ error: "draftId wajib diisi" }, { status: 400 });
    }

    const draft = await prisma.socialContentDraft.findUnique({ where: { id: draftId } });
    if (!draft) {
      return NextResponse.json({ error: "Draft konten tidak ditemukan" }, { status: 404 });
    }

    const scriptText = String(body?.text || draft.voiceover_script || draft.post_idea || "").trim();
    if (!scriptText) {
      return NextResponse.json({ error: "Naskah voiceover kosong" }, { status: 400 });
    }

    if (body?.text && String(body.text).trim() !== draft.voiceover_script) {
      await prisma.socialContentDraft.update({
        where: { id: draftId },
        data: { voiceover_script: scriptText },
      });
    }

    const result = await synthesizeDraftVoiceover(draftId, scriptText, voiceName);
    if (!result) {
      return NextResponse.json(
        {
          error: "Gemini TTS tidak aktif atau gagal merender audio. Gunakan Preview Suara Browser sebagai fallback.",
          fallbackToBrowserSpeech: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      audioUrl: result.audioUrl,
      voiceName: result.voiceName,
      availableVoices: GEMINI_TTS_VOICES,
    });
  } catch (error) {
    console.error("POST social-content tts error:", error);
    return NextResponse.json(
      { error: "Gagal memproses TTS voiceover", fallbackToBrowserSpeech: true },
      { status: 500 }
    );
  }
}
