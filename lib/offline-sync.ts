// Offline-first sync manager for Es Teh Poci Multi-Booth Terminal

export interface OfflineTransaction {
  offlineId: string;
  outletId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  paymentMethod: "QRIS" | "Cash";
  totalAmount: number;
  timestamp: string;
}

const STORAGE_KEY = "teh_poci_offline_tx_queue";

export const getPendingTransactions = (): OfflineTransaction[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read offline tx queue", e);
    return [];
  }
};

export const saveOfflineTransaction = (
  tx: Omit<OfflineTransaction, "offlineId" | "timestamp">
): OfflineTransaction => {
  const offlineId = "tx_off_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const newTx: OfflineTransaction = {
    ...tx,
    offlineId,
    timestamp: new Date().toISOString(),
  };

  const queue = getPendingTransactions();
  queue.push(newTx);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  return newTx;
};

export const syncPendingTransactions = async (): Promise<{
  syncedCount: number;
  failedCount: number;
}> => {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const queue = getPendingTransactions();
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  const remainingQueue: OfflineTransaction[] = [];
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: item.outletId,
          items: item.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          paymentMethod: item.paymentMethod,
          offlineId: item.offlineId,
        }),
      });

      if (res.ok) {
        syncedCount++;
      } else {
        remainingQueue.push(item);
        failedCount++;
      }
    } catch {
      remainingQueue.push(item);
      failedCount++;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));
  return { syncedCount, failedCount };
};
