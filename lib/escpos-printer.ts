// ESC/POS Bluetooth & Thermal Printing Engine for Es Teh Poci POS

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
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
  timestamp: string;
  isOffline?: boolean;
}

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
    "      ES TEH POCI INDONESIA     ",
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
    // Baris 2: Qty x Harga = Subtotal
    const qtyPrice = ` ${item.quantity}x @${item.price.toLocaleString("id-ID")}`;
    const subtotalStr = `Rp ${item.subtotal.toLocaleString("id-ID")}`;
    lines.push(format58mmLine(qtyPrice, subtotalStr));
  });

  lines.push(doubleLine);
  lines.push(format58mmLine("TOTAL AKHIR", `Rp ${data.totalAmount.toLocaleString("id-ID")}`));
  lines.push(format58mmLine("METODE BAYAR", data.paymentMethod));
  lines.push(format58mmLine("STATUS", "LUNAS"));
  if (data.isOffline) {
    lines.push(format58mmLine("MODE", "[TERCATAT OFFLINE]"));
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

  // Bold on + Double Height
  bytes.push(0x1b, 0x45, 0x01);
  bytes.push(0x1d, 0x21, 0x11);
  bytes.push(...encoder.encode("ES TEH POCI\n"));

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
  bytes.push(...encoder.encode(format58mmLine("STATUS", "LUNAS") + "\n"));
  if (data.isOffline) {
    bytes.push(...encoder.encode(format58mmLine("CATATAN", "[OFFLINE SYNC]") + "\n"));
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
      // Standard Bluetooth POS Service UUIDs
      const nav = navigator as any;
      this.device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
          "49535343-fe7d-4ae5-8fa9-9fafd205e455",
          "0000ff00-0000-1000-8000-00805f9b34fb",
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
      const isCancelled =
        err?.name === "NotFoundError" ||
        err?.message?.toLowerCase().includes("cancel") ||
        err?.message?.toLowerCase().includes("batal") ||
        err?.message?.toLowerCase().includes("user selected no device");

      if (isCancelled) {
        // Jangan panggil console.error agar tidak memicu dev overlay Next.js
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

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }
}

export const bluetoothPrinter = new BluetoothThermalManager();

// Fallback: Browser Print Window (58mm Thermal Roll)
export const printReceiptViaBrowser = () => {
  if (typeof window !== "undefined") {
    window.print();
  }
};

