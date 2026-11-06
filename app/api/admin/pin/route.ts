import { NextResponse } from "next/server";
import { getAdminPin, setAdminPin } from "@/lib/pin";

export async function GET() {
  try {
    const activePin = getAdminPin();
    return NextResponse.json({
      isDefault: activePin === "1234",
    });
  } catch (error) {
    console.error("Gagal memeriksa status PIN:", error);
    return NextResponse.json({ error: "Gagal memeriksa status PIN" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentPin, newPin } = body;

    const activePin = getAdminPin();

    if (!currentPin || String(currentPin).trim() !== activePin) {
      return NextResponse.json(
        { error: "PIN Admin saat ini (lama) salah. Masukkan PIN yang benar." },
        { status: 401 }
      );
    }

    const cleanNewPin = String(newPin || "").trim();
    if (!cleanNewPin || cleanNewPin.length < 4) {
      return NextResponse.json(
        { error: "PIN baru harus memiliki panjang minimal 4 digit angka/karakter." },
        { status: 400 }
      );
    }

    setAdminPin(cleanNewPin);

    return NextResponse.json({
      success: true,
      message: "PIN Admin berhasil diperbarui. Gunakan PIN baru ini untuk sesi berikutnya.",
    });
  } catch (error) {
    console.error("Gagal mengubah PIN Admin:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memperbarui PIN" }, { status: 500 });
  }
}

