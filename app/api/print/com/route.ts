import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Endpoint cetak langsung ke COM Port Windows (khusus host laptop dengan printer Bluetooth SPP seperti EPPOS RPPO2N)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const port = typeof body?.port === "string" ? body.port.trim().toUpperCase() : "COM7";
    const escposBase64 = typeof body?.escposBase64 === "string" ? body.escposBase64.trim() : "";

    // Validasi ketat nama COM port agar aman dari injection
    if (!/^COM[1-9][0-9]?$/.test(port)) {
      return NextResponse.json({ error: "Format nama port COM tidak valid (contoh: COM7)." }, { status: 400 });
    }

    if (!escposBase64 || escposBase64.length > 100000 || !/^[A-Za-z0-9+/=]+$/.test(escposBase64)) {
      return NextResponse.json({ error: "Data ESC/POS base64 tidak valid." }, { status: 400 });
    }

    const psScript = `
      $bytes = [Convert]::FromBase64String($env:ESCPOS_B64)
      $p = New-Object System.IO.Ports.SerialPort $env:COM_PORT, 9600, "None", 8, "One"
      $p.WriteTimeout = 6000
      $p.ReadTimeout = 6000
      $p.DtrEnable = $true
      $p.RtsEnable = $true
      try {
        $p.Open()
        $p.Write($bytes, 0, $bytes.Length)
      } finally {
        if ($p.IsOpen) { $p.Close() }
        $p.Dispose()
      }
    `;

    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", psScript],
      {
        timeout: 12000,
        env: {
          ...process.env,
          COM_PORT: port,
          ESCPOS_B64: escposBase64,
        },
      }
    );

    return NextResponse.json({ success: true, port });
  } catch (err: any) {
    const msg = err?.stderr || err?.message || "Gagal mencetak ke port COM.";
    return NextResponse.json(
      { error: `Gagal cetak ke COM Port: ${String(msg).split("\n")[0]}` },
      { status: 500 }
    );
  }
}
