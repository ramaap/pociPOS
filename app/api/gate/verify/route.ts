import { NextResponse } from "next/server";
import crypto from "crypto";

// In-memory rate limiting map
// key: IP, value: { count: number, firstAttempt: number, blockedUntil: number }
const rateLimitMap = new Map<string, { count: number; firstAttempt: number; blockedUntil: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const now = Date.now();

  const record = rateLimitMap.get(ip);
  if (record) {
    if (record.blockedUntil > now) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
        { status: 429 }
      );
    }
    // Jika window 5 menit telah berlalu, reset hitungan
    if (now - record.firstAttempt > 5 * 60 * 1000) {
      rateLimitMap.delete(ip);
    }
  }

  try {
    const body = await req.json();
    const inputKey = typeof body?.key === "string" ? body.key : "";
    const gateSecret = process.env.GATE_SECRET || "tehpoci2024";
    const signKey = process.env.GATE_SIGN_KEY || "c8f4a1b9e2d7e5f3a6b8c1d4e7f9a2b5";

    // Timing-safe comparison for inputKey and gateSecret
    const inputBuf = Buffer.from(inputKey);
    const secretBuf = Buffer.from(gateSecret);

    const isMatch =
      inputBuf.length === secretBuf.length && crypto.timingSafeEqual(inputBuf, secretBuf);

    if (!isMatch) {
      const existing = rateLimitMap.get(ip) || { count: 0, firstAttempt: now, blockedUntil: 0 };
      existing.count += 1;
      if (existing.count >= 5) {
        existing.blockedUntil = now + 15 * 60 * 1000; // Blokir 15 menit
      }
      rateLimitMap.set(ip, existing);

      if (existing.count >= 5) {
        return NextResponse.json(
          { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: "Kunci akses salah." }, { status: 401 });
    }

    // Sukses: Bersihkan catatan rate limit IP
    rateLimitMap.delete(ip);

    // Hitung HMAC-SHA256 dari GATE_SECRET menggunakan GATE_SIGN_KEY
    const hmac = crypto.createHmac("sha256", signKey).update(gateSecret).digest("hex");

    const res = NextResponse.json({ success: true });
    res.cookies.set("gate_token", hmac, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 hari
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
}
