// ESC/POS Bluetooth & Thermal Printing Engine for Teh Poci POS
import {
  RECEIPT_LOGO_HEIGHT,
  RECEIPT_LOGO_RASTER_B64,
  RECEIPT_LOGO_WIDTH_BYTES,
} from "./receipt-logo";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

export interface ReceiptData {
  orderId: string;
  outletName: string;
  outletCode: string;
  outletAddress?: string;
  cashierName?: string;
  items: ReceiptItem[];
  totalAmount: number;
  paymentMethod: "QRIS" | "Cash";
  cashReceived?: number;
  cashChange?: number;
  timestamp: string;
  isOffline?: boolean;
  promoVoucher?: {
    code: string;
    title: string;
    validUntil: string;
    reason?: string;
    outletName?: string;
    outletAddress?: string;
  };
}

// Helper untuk membungkus teks panjang agar pas pada batas kolom kertas thermal 58mm (default 32 karakter)
export const wrapText58mm = (text: string, maxLen = 32): string[] => {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const result: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxLen) {
      currentLine += " " + word;
    } else {
      result.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    result.push(currentLine);
  }
  return result;
};

// Format 32 kolom untuk kertas struk thermal 58mm standar
export const format58mmLine = (left: string, right: string, maxLen = 32): string => {
  const spaceLen = Math.max(1, maxLen - left.length - right.length);
  return left + " ".repeat(spaceLen) + right;
};

// Bangun representasi teks struk thermal rapi
export const generateReceiptText = (data: ReceiptData): string => {
  const line = "-".repeat(32);
  const doubleLine = "=".repeat(32);

  const dateObj = new Date(data.timestamp);
  const formattedDate = dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [
    "            Teh Poci            ",
    "   Teh Asli, Segar & Nikmat     ",
    line,
    data.outletName.substring(0, 32),
    data.outletAddress ? data.outletAddress.substring(0, 32) : "",
    `No. Nota : ${data.orderId}`,
    `Waktu    : ${formattedDate} ${formattedTime}`,
    `Kasir    : Booth Stand / POS`,
    line,
  ];

  data.items.forEach((item) => {
    // Baris 1: Nama produk
    lines.push(item.name.substring(0, 32));
    if (item.notes) {
      lines.push(` * Note: ${item.notes}`.substring(0, 32));
    }
    // Baris 2: Qty x Harga = Subtotal
    const qtyPrice = ` ${item.quantity}x @${item.price.toLocaleString("id-ID")}`;
    const subtotalStr = `Rp ${item.subtotal.toLocaleString("id-ID")}`;
    lines.push(format58mmLine(qtyPrice, subtotalStr));
  });

  lines.push(doubleLine);
  lines.push(format58mmLine("TOTAL AKHIR", `Rp ${data.totalAmount.toLocaleString("id-ID")}`));
  lines.push(format58mmLine("METODE BAYAR", data.paymentMethod));
  if (data.paymentMethod === "Cash" && data.cashReceived !== undefined) {
    lines.push(format58mmLine("DITERIMA", `Rp ${data.cashReceived.toLocaleString("id-ID")}`));
    lines.push(format58mmLine("KEMBALI", `Rp ${(data.cashChange ?? 0).toLocaleString("id-ID")}`));
  }
  lines.push(format58mmLine("STATUS", "LUNAS"));
  if (data.isOffline) {
    lines.push(format58mmLine("MODE", "[TERCATAT OFFLINE]"));
  }

  // Bagian Kupon / Voucher Promo Klaim Nanti (Jika Ada)
  if (data.promoVoucher) {
    lines.push(doubleLine);
    lines.push("   *** VOUCHER PROMO KEDAI ***  ");
    lines.push(format58mmLine("KODE", data.promoVoucher.code));
    lines.push(data.promoVoucher.title.substring(0, 32));
    lines.push(format58mmLine("BERLAKU S/D", data.promoVoucher.validUntil));
    lines.push(line);
    lines.push(" * HANYA BERLAKU DI KEDAI INI * ");
    const oName = data.promoVoucher.outletName || data.outletName;
    const oAddr = data.promoVoucher.outletAddress || data.outletAddress;
    if (oName) {
      wrapText58mm(oName, 32).forEach((l) => lines.push(l));
    }
    if (oAddr) {
      wrapText58mm(oAddr, 32).forEach((l) => lines.push(l));
    }
    lines.push(line);
    lines.push("Tunjukkan struk ini untuk klaim");
    lines.push(doubleLine);
  }

  lines.push(line);
  lines.push("  Terima Kasih Atas Kunjungan   ");
  lines.push("          Anda! ^_^             ");
  lines.push("  Follow IG: @estehpoci.id      ");
  lines.push("\n\n\n");

  return lines.filter(Boolean).join("\n");
};

// Buat bytes ESC/POS untuk dicetak via Bluetooth langsung
export const generateEscPosBuffer = (data: ReceiptData): Uint8Array => {
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  // ESC @: Inisialisasi printer
  bytes.push(0x1b, 0x40);

  // ESC a 1: Center align
  bytes.push(0x1b, 0x61, 0x01);

  // Cetak Logo Teh Poci (GS v 0 raster bit image)
  if (typeof window !== "undefined") {
    try {
      const raw = window.atob(RECEIPT_LOGO_RASTER_B64);
      bytes.push(
        0x1d,
        0x76,
        0x30,
        0x00,
        RECEIPT_LOGO_WIDTH_BYTES & 0xff,
        (RECEIPT_LOGO_WIDTH_BYTES >> 8) & 0xff,
        RECEIPT_LOGO_HEIGHT & 0xff,
        (RECEIPT_LOGO_HEIGHT >> 8) & 0xff
      );
      for (let i = 0; i < raw.length; i++) {
        bytes.push(raw.charCodeAt(i));
      }
      bytes.push(0x0a);
    } catch {}
  }

  // Bold on + Double Height
  bytes.push(0x1b, 0x45, 0x01);
  bytes.push(0x1d, 0x21, 0x11);
  bytes.push(...encoder.encode("Teh Poci\n"));

  // Normal text
  bytes.push(0x1d, 0x21, 0x00);
  bytes.push(0x1b, 0x45, 0x00);
  bytes.push(...encoder.encode("Teh Asli, Segar & Nikmat\n"));
  bytes.push(...encoder.encode(data.outletName + "\n"));
  if (data.outletAddress) {
    bytes.push(...encoder.encode(data.outletAddress + "\n"));
  }

  // Divider
  bytes.push(...encoder.encode("--------------------------------\n"));

  // ESC a 0: Left align
  bytes.push(0x1b, 0x61, 0x00);

  const dateObj = new Date(data.timestamp);
  const formattedDate = dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  bytes.push(...encoder.encode(`Nota : ${data.orderId}\n`));
  bytes.push(...encoder.encode(`Waktu: ${formattedDate} ${formattedTime}\n`));
  bytes.push(...encoder.encode("--------------------------------\n"));

  // Daftar item
  data.items.forEach((item) => {
    bytes.push(...encoder.encode(`${item.name}\n`));
    if (item.notes) {
      bytes.push(...encoder.encode(`  * Note: ${item.notes}\n`));
    }
    const qtyPrice = ` ${item.quantity}x @${item.price.toLocaleString("id-ID")}`;
    const subtotalStr = `Rp ${item.subtotal.toLocaleString("id-ID")}`;
    bytes.push(...encoder.encode(format58mmLine(qtyPrice, subtotalStr) + "\n"));
  });

  bytes.push(...encoder.encode("================================\n"));

  // Bold on for total
  bytes.push(0x1b, 0x45, 0x01);
  bytes.push(...encoder.encode(format58mmLine("TOTAL AKHIR", `Rp ${data.totalAmount.toLocaleString("id-ID")}`) + "\n"));
  bytes.push(0x1b, 0x45, 0x00);

  bytes.push(...encoder.encode(format58mmLine("METODE", data.paymentMethod) + "\n"));
  if (data.paymentMethod === "Cash" && data.cashReceived !== undefined) {
    bytes.push(...encoder.encode(format58mmLine("DITERIMA", `Rp ${data.cashReceived.toLocaleString("id-ID")}`) + "\n"));
    bytes.push(...encoder.encode(format58mmLine("KEMBALI", `Rp ${(data.cashChange ?? 0).toLocaleString("id-ID")}`) + "\n"));
  }
  bytes.push(...encoder.encode(format58mmLine("STATUS", "LUNAS") + "\n"));
  if (data.isOffline) {
    bytes.push(...encoder.encode(format58mmLine("CATATAN", "[OFFLINE SYNC]") + "\n"));
  }

  // Bagian Kupon / Voucher Promo Klaim Nanti (Thermal ESC/POS)
  if (data.promoVoucher) {
    bytes.push(...encoder.encode("================================\n"));
    bytes.push(0x1b, 0x61, 0x01); // Center align
    bytes.push(0x1b, 0x45, 0x01); // Bold on
    bytes.push(...encoder.encode("*** VOUCHER PROMO KEDAI ***\n"));
    bytes.push(0x1b, 0x45, 0x00); // Bold off
    bytes.push(...encoder.encode(`KODE: ${data.promoVoucher.code}\n`));
    bytes.push(...encoder.encode(`${data.promoVoucher.title}\n`));
    bytes.push(...encoder.encode(`Berlaku s/d: ${data.promoVoucher.validUntil}\n`));
    bytes.push(...encoder.encode("--------------------------------\n"));
    bytes.push(0x1b, 0x45, 0x01); // Bold on
    bytes.push(...encoder.encode("* HANYA BERLAKU DI KEDAI INI *\n"));
    bytes.push(0x1b, 0x45, 0x00); // Bold off
    const oName = data.promoVoucher.outletName || data.outletName;
    const oAddr = data.promoVoucher.outletAddress || data.outletAddress;
    if (oName) {
      wrapText58mm(oName, 32).forEach((l) => bytes.push(...encoder.encode(l + "\n")));
    }
    if (oAddr) {
      wrapText58mm(oAddr, 32).forEach((l) => bytes.push(...encoder.encode(l + "\n")));
    }
    bytes.push(...encoder.encode("--------------------------------\n"));
    bytes.push(...encoder.encode("Tunjukkan struk ini untuk klaim\n"));
    bytes.push(0x1b, 0x61, 0x00); // Left align
    bytes.push(...encoder.encode("================================\n"));
  }

  // Footer
  bytes.push(...encoder.encode("--------------------------------\n"));
  bytes.push(0x1b, 0x61, 0x01); // Center
  bytes.push(...encoder.encode("Terima Kasih Atas Kunjungan Anda!\n"));
  bytes.push(...encoder.encode("Follow IG: @estehpoci.id\n"));

  // Feed lines & cut
  bytes.push(0x0a, 0x0a, 0x0a, 0x0a);
  bytes.push(0x1d, 0x56, 0x41, 0x10); // GS V A 16 (Cut paper partial)

  return new Uint8Array(bytes);
};

// Web Bluetooth Printing Manager
export class BluetoothUserCancelledError extends Error {
  constructor(message = "Pencarian printer Bluetooth dibatalkan.") {
    super(message);
    this.name = "BluetoothUserCancelledError";
  }
}

class BluetoothThermalManager {
  private device: any = null;
  private characteristic: any = null;

  isSupported(): boolean {
    return typeof window !== "undefined" && "bluetooth" in navigator;
  }

  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error("Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome di Android/PC.");
    }

    try {
      // Standard Bluetooth POS & EPPOS/RPP02N Service UUIDs
      const nav = navigator as any;
      this.device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "0000ffe0-0000-1000-8000-00805f9b34fb",
          "0000ff00-0000-1000-8000-00805f9b34fb",
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
          "49535343-fe7d-4ae5-8fa9-9fafd205e455",
          "0000fee7-0000-1000-8000-00805f9b34fb",
          "0000af30-0000-1000-8000-00805f9b34fb",
          "0000ae30-0000-1000-8000-00805f9b34fb",
        ],
      });

      const server = await this.device.gatt.connect();
      const services = await server.getPrimaryServices();

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            return true;
          }
        }
      }

      throw new Error("Tidak menemukan kanal printer bluetooth yang siap cetak.");
    } catch (err: any) {
      // Periksa jika dibatalkan oleh pengguna (User cancelled chooser)
      const msgLower = (err?.message || "").toLowerCase();
      const isCancelled =
        msgLower.includes("cancel") ||
        msgLower.includes("batal") ||
        msgLower.includes("user selected no device");

      if (isCancelled) {
        throw new BluetoothUserCancelledError();
      }

      // Log sebagai warning biasa untuk error teknis
      console.warn("Bluetooth status notice:", err?.message || err);
      throw err;
    }
  }

  async print(data: ReceiptData): Promise<void> {
    if (!this.characteristic) {
      const connected = await this.connect();
      if (!connected) throw new Error("Gagal menghubungkan printer bluetooth.");
    }

    const buffer = generateEscPosBuffer(data);
    const CHUNK_SIZE = 100; // Kirim per potongan 100 bytes agar buffer printer tidak overflow

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const chunk = buffer.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  isConnected(): boolean {
    return !!(this.device && this.device.gatt?.connected && this.characteristic);
  }

  getDeviceName(): string | null {
    return this.isConnected() ? this.device?.name || "Printer BT" : null;
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }
}

export const bluetoothPrinter = new BluetoothThermalManager();

// Web Serial Printing Manager (untuk Printer Bluetooth Classic SPP via COM Port Windows, misal COM7)
class SerialThermalManager {
  private port: any = null;
  private isOpen = false;
  private isPrinting = false;

  isSupported(): boolean {
    return typeof window !== "undefined" && "serial" in navigator;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms)),
    ]);
  }

  async connect(baudRate = 9600): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error("Web Serial tidak didukung di browser ini. Gunakan Google Chrome atau Edge di Windows.");
    }

    try {
      const nav = navigator as any;
      this.port = await nav.serial.requestPort();
      if (!this.port.readable && !this.port.writable) {
        await this.withTimeout(
          this.port.open({ baudRate }),
          7000,
          "Waktu koneksi Port COM habis (7 detik). Pastikan printer menyala dan Bluetooth HP lain sudah diputus."
        );
        try {
          await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
        } catch {}
      }
      this.isOpen = true;
      return true;
    } catch (err: any) {
      const msgLower = (err?.message || "").toLowerCase();
      if (err?.name === "NotFoundError" || msgLower.includes("no port selected")) {
        throw new BluetoothUserCancelledError("Pemilihan port COM dibatalkan oleh kasir.");
      }
      await this.disconnect();
      throw err;
    }
  }

  async print(data: ReceiptData): Promise<void> {
    if (this.isPrinting) {
      return; // Hindari cetak ganda bersamaan yang mengunci WritableStream
    }
    this.isPrinting = true;

    try {
      if (!this.port || !this.isOpen || !this.port.writable) {
        const connected = await this.connect();
        if (!connected) throw new Error("Gagal membuka port COM printer.");
      }

      // Tunggu jika stream kebetulan masih terkunci sesaat
      let waitMs = 0;
      while (this.port.writable.locked && waitMs < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitMs += 100;
      }

      if (this.port.writable.locked) {
        throw new Error("Port COM sedang sibuk. Silakan klik Port COM lagi.");
      }

      const buffer = generateEscPosBuffer(data);
      const writer = this.port.writable.getWriter();
      try {
        await this.withTimeout(
          writer.write(buffer),
          7000,
          "Gagal mengirim data struk (timeout). Pastikan printer tidak terhubung ke perangkat lain."
        );
      } finally {
        try {
          writer.releaseLock();
        } catch {}
      }
    } catch (err) {
      await this.disconnect();
      throw err;
    } finally {
      this.isPrinting = false;
    }
  }

  isConnected(): boolean {
    return !!(this.port && this.isOpen && this.port.writable);
  }

  async disconnect() {
    try {
      if (this.port) {
        await this.port.close();
      }
    } catch {}
    this.port = null;
    this.isOpen = false;
  }
}

export const serialPrinter = new SerialThermalManager();

// Deteksi apakah berjalan di perangkat Android (APK WebView atau Browser Android)
export const isAndroidDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
};

// Encode ESC/POS ReceiptData menjadi string Base64
export const encodeReceiptBase64 = (data: ReceiptData): string => {
  const buffer = generateEscPosBuffer(data);
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
};

// Cetak langsung via RawBT Print Service (untuk Android APK / Huawei / Tablet)
export const printReceiptViaRawBT = (data: ReceiptData): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const base64 = encodeReceiptBase64(data);
    const link = document.createElement("a");
    link.href = `rawbt:base64,${base64}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.warn("RawBT print error:", err);
    return false;
  }
};

// Fallback: Browser Print Window (58mm Thermal Roll)
export const printReceiptViaBrowser = () => {
  if (typeof window !== "undefined") {
    window.print();
  }
};

