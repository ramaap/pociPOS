import { prisma } from "@/lib/prisma";

export async function getCentralVault() {
  let vault = await prisma.centralVault.findUnique({
    where: { id: "default" },
  });

  if (!vault) {
    vault = await prisma.centralVault.create({
      data: {
        id: "default",
        cash_balance: 5000000, // Default Rp 5.000.000
      },
    });
  }

  return vault;
}

export async function mutateCentralCash({
  amount, // Positif = Uang Masuk ke Pusat (Inflow), Negatif = Uang Keluar dari Pusat (Outflow ke Kedai)
  type,
  outletId,
  notes,
}: {
  amount: number;
  type: string;
  outletId?: string;
  notes?: string;
}) {
  const vault = await getCentralVault();
  const nextBalance = Math.max(0, vault.cash_balance + amount);

  const updatedVault = await prisma.centralVault.update({
    where: { id: "default" },
    data: { cash_balance: nextBalance },
  });

  const log = await prisma.centralCashLog.create({
    data: {
      outlet_id: outletId || null,
      amount: Math.abs(amount),
      type,
      balance_after: nextBalance,
      notes: notes || null,
    },
  });

  return { vault: updatedVault, log };
}

export async function setCentralVaultCash(newBalance: number, notes?: string) {
  const vault = await getCentralVault();
  const oldBalance = vault.cash_balance;
  const delta = newBalance - oldBalance;

  const updatedVault = await prisma.centralVault.update({
    where: { id: "default" },
    data: { cash_balance: Math.max(0, newBalance) },
  });

  const log = await prisma.centralCashLog.create({
    data: {
      outlet_id: null,
      amount: Math.abs(delta),
      type: "central_set",
      balance_after: Math.max(0, newBalance),
      notes: notes || `Koreksi saldo Kas Induk Gudang Pusat: Rp ${oldBalance.toLocaleString("id-ID")} ➔ Rp ${newBalance.toLocaleString("id-ID")}`,
    },
  });

  return { vault: updatedVault, log };
}
