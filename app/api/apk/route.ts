import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'KasirTehPoci.apk');
  if (!fs.existsSync(filePath)) {
    return new NextResponse('APK file not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="KasirTehPoci.apk"',
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
