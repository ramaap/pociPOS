import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndSendSocialIdea } from "@/lib/agents/social-media";

export async function GET() {
  try {
    const drafts = await prisma.socialContentDraft.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({
      drafts,
      hasSerperKey: Boolean((process.env.SERPER_API_KEY || "").trim()),
    });
  } catch (error) {
    console.error("GET social-content error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar konten sosmed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const platformHint = body?.platformHint ? String(body.platformHint).trim() : undefined;
    const customTopic = body?.customTopic ? String(body.customTopic).trim() : undefined;
    const voiceName = body?.voiceName ? String(body.voiceName).trim() : undefined;
    const notifyTelegram = Boolean(body?.notifyTelegram);

    const result = await generateAndSendSocialIdea({
      platformHint,
      customTopic,
      voiceName,
      createdBy: "manual_trigger",
      notifyTelegram,
    });

    return NextResponse.json({
      draft: result.draft,
      googleSearchLink: result.googleSearchLink,
    });
  } catch (error) {
    console.error("POST social-content error:", error);
    return NextResponse.json({ error: "Gagal membuat ide konten sosmed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || "").trim();
    const status = String(body?.status || "").trim();

    if (!id || !["draft", "posted", "skipped"].includes(status)) {
      return NextResponse.json({ error: "Parameter id atau status tidak valid" }, { status: 400 });
    }

    const updated = await prisma.socialContentDraft.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ draft: updated });
  } catch (error) {
    console.error("PATCH social-content error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status konten" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID draft wajib disertakan" }, { status: 400 });
    }

    await prisma.socialContentDraft.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE social-content error:", error);
    return NextResponse.json({ error: "Gagal menghapus draft konten" }, { status: 500 });
  }
}
