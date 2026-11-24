import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|logo.jpg|gate|api/gate).*)",
  ],
};

async function computeExpectedToken(secret: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(secret));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  const gateToken = request.cookies.get("gate_token")?.value;
  const gateSecret = process.env.GATE_SECRET || "tehpoci2024";
  const signKey = process.env.GATE_SIGN_KEY || "c8f4a1b9e2d7e5f3a6b8c1d4e7f9a2b5";

  if (!gateToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    return NextResponse.redirect(url);
  }

  try {
    const expectedToken = await computeExpectedToken(gateSecret, signKey);
    if (!timingSafeEqualStr(gateToken, expectedToken)) {
      const url = request.nextUrl.clone();
      url.pathname = "/gate";
      return NextResponse.redirect(url);
    }
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
