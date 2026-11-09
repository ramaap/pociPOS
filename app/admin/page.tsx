"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  DollarSign,
  Droplets,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Lock,
  PlusCircle,
  RefreshCw,
  Layers,
  Sparkles,
  TrendingUp,
  Store,
  RotateCcw,
  Database,
  Trash2,
  Sliders,
  Edit3,
  Check,
  Calendar,
  Coffee,
  X,
  Plus,
  ShoppingBag,
  FileText,
  Download,
  Scale,
  PieChart,
  BarChart3,
  CreditCard,
  Wallet,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  KeyRound,
  LogOut,
  Target,
  Banknote,
} from "lucide-react";

interface Outlet {
  id: string;
  code: string;
  name: string;
  address?: string;
  target_cups?: number;
  initial_cash?: number;
  active_status?: boolean;
}

interface ShiftClosingRecord {
  id: string;
  date: string;
  actual_cup_reg: number;
  actual_cup_jumbo: number;
  actual_liquid_ml: number;
  actual_sugar_ml?: number;
  system_expected_cup_reg: number;
  system_expected_cup_jumbo: number;
  system_expected_liquid_ml: number;
  system_expected_sugar_ml?: number;
  discrepancy_cup: number;
  discrepancy_cup_reg: number;
  discrepancy_cup_jumbo: number;
  discrepancy_liquid: number;
  discrepancy_sugar_ml?: number;
  employee_debt: number;
  theft_flag: boolean;
  waste_flag: boolean;
  notes: string | null;
  created_at: string;
  outlet: Outlet;
}

interface BoothStockRecord {
  id: string;
  current_stock: number;
  outlet: Outlet;
  raw_material: {
    id: string;
    name: string;
    unit: string;
  };
}

interface AdminData {
  outlets: Outlet[];
  summary: {
    totalSalesToday: number;
    qrisSalesToday: number;
    cashSalesToday: number;
    transactionCount: number;
    totalRegCupsSold: number;
    totalJumboCupsSold: number;
    totalLiquidMlSold: number;
    flavorStats?: Record<string, number>;
    outletSalesList?: { name: string; sales: number; cups: number }[];
  };
  closings: ShiftClosingRecord[];
  boothStocks: BoothStockRecord[];
}

export default function AdminDashboardPage() {
  const [pin, setPin] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPinDefault, setIsPinDefault] = useState<boolean>(true);

  // Change PIN State
  const [isChangePinOpen, setIsChangePinOpen] = useState<boolean>(false);
  const [changePinForm, setChangePinForm] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [changePinLoading, setChangePinLoading] = useState<boolean>(false);
  const [changePinMessage, setChangePinMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Database Backup State
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Real-time Live Auto-Sync State (Penjualan & Pengeluaran Otomatis)
  const [isAutoSync, setIsAutoSync] = useState<boolean>(true);
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState<number>(3);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());

  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>("all");

  // Admin Navigation Tabs: "financial" | "stocks" | "outlets" | "master_menus" | "outlet_menus"
  const [activeAdminTab, setActiveAdminTab] = useState<"financial" | "stocks" | "outlets" | "master_menus" | "outlet_menus">("financial");

  // ================= TAB 1: FINANCIAL REPORT STATE =================
  const [financeOutlet, setFinanceOutlet] = useState<string>("all");
  const [financePeriod, setFinancePeriod] = useState<string>("30d");
  const [financeData, setFinanceData] = useState<any>(null);
  const [financeLoading, setFinanceLoading] = useState<boolean>(false);
  const [financeModule, setFinanceModule] = useState<"forecast" | "cashflow" | "profitability" | "balancesheet" | "expenses" | "ledger">("forecast");
  const [financeChartSubTab, setFinanceChartSubTab] = useState<"timeline" | "seasonality" | "accuracy">("timeline");
  const [financeSearch, setFinanceSearch] = useState<string>("");

  // Refs untuk sinkronisasi real-time anti stale closure
  const financeOutletRef = React.useRef(financeOutlet);
  const financePeriodRef = React.useRef(financePeriod);
  const selectedOutletFilterRef = React.useRef(selectedOutletFilter);

  useEffect(() => {
    financeOutletRef.current = financeOutlet;
  }, [financeOutlet]);

  useEffect(() => {
    financePeriodRef.current = financePeriod;
  }, [financePeriod]);

  useEffect(() => {
    selectedOutletFilterRef.current = selectedOutletFilter;
  }, [selectedOutletFilter]);

  // Expense logging modal state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState({
    outletId: "all",
    category: "operasional",
    description: "",
    amount: "",
  });
  const [expenseLoading, setExpenseLoading] = useState<boolean>(false);
  const [expenseMessage, setExpenseMessage] = useState<string | null>(null);

  // ================= TAB 3: OUTLET MANAGEMENT STATE =================
  const [outletsList, setOutletsList] = useState<any[]>([]);
  const [isAddOutletOpen, setIsAddOutletOpen] = useState<boolean>(false);
  const [newOutletForm, setNewOutletForm] = useState({ name: "", code: "", address: "", target_cups: 100, initial_cash: 0 });
  const [outletLoading, setOutletLoading] = useState<boolean>(false);
  const [outletMessage, setOutletMessage] = useState<string | null>(null);

  // Edit Outlet State
  const [isEditOutletOpen, setIsEditOutletOpen] = useState<boolean>(false);
  const [editOutletForm, setEditOutletForm] = useState<{
    id: string;
    name: string;
    code: string;
    address: string;
    active_status: boolean;
    target_cups: number;
    initial_cash: number;
  }>({
    id: "",
    name: "",
    code: "",
    address: "",
    active_status: true,
    target_cups: 100,
    initial_cash: 0,
  });
  const [editOutletLoading, setEditOutletLoading] = useState<boolean>(false);
  const [editOutletMessage, setEditOutletMessage] = useState<string | null>(null);

  // Quick Edit Modal: Uang Cash yang Dibawa (Modal Kas Awal per Kedai)
  const [isCashFloatModalOpen, setIsCashFloatModalOpen] = useState<boolean>(false);
  const [cashFloatOutlet, setCashFloatOutlet] = useState<{ id: string; name: string; code: string; initial_cash?: number } | null>(null);
  const [cashFloatValue, setCashFloatValue] = useState<number>(0);
  const [cashFloatLoading, setCashFloatLoading] = useState<boolean>(false);
  const [cashFloatMessage, setCashFloatMessage] = useState<string | null>(null);

  // ================= TAB 4: MENU MANAGEMENT STATE =================
  const [menuProducts, setMenuProducts] = useState<any[]>([]);
  const [menuMaterials, setMenuMaterials] = useState<any[]>([]);
  const [menuTargetOutlet, setMenuTargetOutlet] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("poci_admin_menu_outlet") || "";
    }
    return "";
  });
  const menuTargetOutletRef = React.useRef(menuTargetOutlet);

  useEffect(() => {
    menuTargetOutletRef.current = menuTargetOutlet;
    if (menuTargetOutlet && typeof window !== "undefined") {
      try {
        localStorage.setItem("poci_admin_menu_outlet", menuTargetOutlet);
      } catch {}
    }
  }, [menuTargetOutlet]);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);
  const [newMenuForm, setNewMenuForm] = useState({
    baseName: "",
    category: "fruity",
    flavorMaterialId: "",
    enableReguler: false,
    regulerPrice: "7000",
    regulerTeaMl: "300",
    regulerFlavorQty: "1",
    enableJumbo: true,
    jumboPrice: "9000",
    jumboTeaMl: "450",
    jumboFlavorQty: "1",
  });
  const [menuLoading, setMenuLoading] = useState<boolean>(false);
  const [menuMessage, setMenuMessage] = useState<string | null>(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState<boolean>(false);
  const [editMenuForm, setEditMenuForm] = useState({
    oldBaseName: "",
    baseName: "",
    category: "fruity",
    flavorMaterialId: "",
    enableReguler: false,
    regulerPrice: "7000",
    enableJumbo: true,
    jumboPrice: "9000",
    price: "3000",
  });
  const [editMenuLoading, setEditMenuLoading] = useState<boolean>(false);
  const [editMenuMessage, setEditMenuMessage] = useState<string | null>(null);

  // ================= STOCK / RESTOCK / OPNAME MODALS =================
  const [isRestockOpen, setIsRestockOpen] = useState<boolean>(false);
  const [restockOutletId, setRestockOutletId] = useState<string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [restockQty, setRestockQty] = useState<string>("");
  const [restockMode, setRestockMode] = useState<"add" | "set">("add");
  const [restockMessage, setRestockMessage] = useState<string | null>(null);

  const [isSingleStockOpen, setIsSingleStockOpen] = useState<boolean>(false);
  const [singleStockOutlet, setSingleStockOutlet] = useState<{ id: string; name: string } | null>(null);
  const [singleStockMaterial, setSingleStockMaterial] = useState<{ id: string; name: string; unit: string; currentStock: number } | null>(null);
  const [singleStockMode, setSingleStockMode] = useState<"set" | "add">("set");
  const [singleStockValue, setSingleStockValue] = useState<string>("0");
  const [singleStockMessage, setSingleStockMessage] = useState<string | null>(null);
  const [singleStockLoading, setSingleStockLoading] = useState<boolean>(false);

  const [isOpnameOpen, setIsOpnameOpen] = useState<boolean>(false);
  const [opnameOutlet, setOpnameOutlet] = useState<{ id: string; name: string } | null>(null);
  const [opnameValues, setOpnameValues] = useState<Record<string, number>>({});
  const [opnameMessage, setOpnameMessage] = useState<string | null>(null);
  const [opnameLoading, setOpnameLoading] = useState<boolean>(false);

  // Reset Authorization state
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetType, setResetType] = useState<"reset_pos" | "reset_database">("reset_pos");
  const [resetTargetOutlet, setResetTargetOutlet] = useState<string>("all");
  const [confirmText, setConfirmText] = useState<string>("");
  const [adminAuthPin, setAdminAuthPin] = useState<string>("");
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetStatusMessage, setResetStatusMessage] = useState<string | null>(null);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. DATA LOADERS
  const loadFinancialReport = async (
    targetOutlet = financeOutletRef.current,
    targetPeriod = financePeriodRef.current,
    silent: boolean = false
  ) => {
    if (!silent) setFinanceLoading(true);
    try {
      const res = await fetch(
        `/api/admin/financial-report?outletId=${targetOutlet}&period=${targetPeriod}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        setFinanceData(json);
      }
    } catch (e) {
      console.error("Failed to load financial report", e);
    } finally {
      if (!silent) setFinanceLoading(false);
    }
  };

  const exportFinancialCSV = () => {
    if (!financeData?.transactions || financeData.transactions.length === 0) {
      alert("Belum ada data transaksi untuk diekspor pada filter ini.");
      return;
    }
    const headers = ["Waktu", "No Nota", "Kedai", "Item Pesanan", "Metode Pembayaran", "Total Penjualan (Rp)"];
    const rows = financeData.transactions.map((t: any) => [
      `"${new Date(t.createdAt).toLocaleString("id-ID")}"`,
      `"${t.orderCode}"`,
      `"${t.outletName}"`,
      `"${(t.itemsSummary || "").replace(/"/g, '""')}"`,
      `"${t.paymentMethod}"`,
      t.totalAmount,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Keuangan_Poci_${financeOutlet}_${financePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setExpenseMessage("Deskripsi dan nominal biaya wajib diisi dengan benar.");
      return;
    }
    setExpenseLoading(true);
    setExpenseMessage(null);
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_expense",
          outletId: expenseForm.outletId,
          category: expenseForm.category,
          description: expenseForm.description,
          amount: Number(expenseForm.amount),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIsAddExpenseOpen(false);
        setExpenseForm({ outletId: "all", category: "operasional", description: "", amount: "" });
        loadFinancialReport(financeOutlet, financePeriod);
      } else {
        setExpenseMessage(json.error || "Gagal mencatat pengeluaran");
      }
    } catch (err: any) {
      setExpenseMessage(err.message || "Gagal terhubung ke server");
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_expense", expenseId }),
      });
      if (res.ok) {
        loadFinancialReport(financeOutlet, financePeriod);
      }
    } catch (err) {
      console.error("Gagal menghapus catatan beban", err);
    }
  };

  const handleClearAllExpenses = async () => {
    if (!confirm(`Hapus seluruh ${financeData?.expenses?.length || 0} catatan pengeluaran?`)) return;
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_expenses",
          outletId: financeOutlet,
          pin: sessionStorage.getItem("poci_admin_pin") || pin || "1234",
        }),
      });
      if (res.ok) {
        loadFinancialReport(financeOutlet, financePeriod);
      }
    } catch (err) {
      console.error("Gagal membersihkan pengeluaran", err);
    }
  };

  const loadOutlets = async () => {
    try {
      const res = await fetch("/api/admin/outlets");
      if (res.ok) {
        const json = await res.json();
        setOutletsList(json.outlets || []);
      }
    } catch (e) {
      console.error("Failed to load outlets", e);
    }
  };

  const loadMenus = async () => {
    try {
      const res = await fetch("/api/admin/menus");
      if (res.ok) {
        const json = await res.json();
        setMenuProducts(json.products || []);
        setMenuMaterials(json.rawMaterials || []);
        setMenuTargetOutlet((prev) => {
          if (prev && json.outlets?.some((o: any) => o.id === prev)) {
            return prev;
          }
          if (menuTargetOutletRef.current && json.outlets?.some((o: any) => o.id === menuTargetOutletRef.current)) {
            return menuTargetOutletRef.current;
          }
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem("poci_admin_menu_outlet");
            if (saved && json.outlets?.some((o: any) => o.id === saved)) {
              menuTargetOutletRef.current = saved;
              return saved;
            }
          }
          const defaultOutlet = json.outlets?.[0]?.id || "";
          menuTargetOutletRef.current = defaultOutlet;
          return defaultOutlet;
        });
      }
    } catch (e) {
      console.error("Failed to load menus", e);
    }
  };

  const refreshData = async (targetFilter?: string, silent: boolean = false) => {
    const savedPin = sessionStorage.getItem("poci_admin_pin") || pin;
    if (!savedPin) return;
    if (!silent) setLoading(true);
    const filter = targetFilter !== undefined ? targetFilter : selectedOutletFilterRef.current;
    try {
      const res = await fetch(
        `/api/admin/reconciliation?pin=${savedPin}&outletId=${filter}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      await loadFinancialReport(financeOutletRef.current, financePeriodRef.current, silent);
      await loadOutlets();
      await loadMenus();
      setLastSyncedTime(new Date());
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/reconciliation?pin=${pin}&outletId=${selectedOutletFilter}`);
      if (!res.ok) {
        throw new Error(isPinDefault ? "PIN Admin Salah. Default PIN: 1234" : "PIN Admin Salah. Silakan coba lagi.");
      }
      const json = await res.json();
      setData(json);
      setIsAuthenticated(true);
      sessionStorage.setItem("poci_admin_pin", pin);
      loadFinancialReport();
      loadOutlets();
      loadMenus();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Gagal otentikasi");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("poci_admin_pin");
    setIsAuthenticated(false);
    setPin("");
    setAuthError(null);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePinForm.currentPin) {
      setChangePinMessage({ text: "Masukkan PIN lama saat ini.", isError: true });
      return;
    }
    if (!changePinForm.newPin || changePinForm.newPin.length < 4) {
      setChangePinMessage({ text: "PIN baru minimal 4 angka / karakter.", isError: true });
      return;
    }
    if (changePinForm.newPin !== changePinForm.confirmPin) {
      setChangePinMessage({ text: "Konfirmasi PIN baru tidak cocok.", isError: true });
      return;
    }

    setChangePinLoading(true);
    setChangePinMessage(null);

    try {
      const res = await fetch("/api/admin/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: changePinForm.currentPin,
          newPin: changePinForm.newPin,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setChangePinMessage({ text: "✅ " + resJson.message, isError: false });
        sessionStorage.setItem("poci_admin_pin", changePinForm.newPin);
        setPin(changePinForm.newPin);
        setIsPinDefault(false);
        setTimeout(() => {
          setIsChangePinOpen(false);
          setChangePinMessage(null);
          setChangePinForm({ currentPin: "", newPin: "", confirmPin: "" });
        }, 1500);
      } else {
        setChangePinMessage({ text: "❌ " + (resJson.error || "Gagal mengubah PIN"), isError: true });
      }
    } catch {
      setChangePinMessage({ text: "❌ Terjadi gangguan koneksi.", isError: true });
    } finally {
      setChangePinLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const res = await fetch("/api/admin/backup");
      if (res.ok) {
        const json = await res.json();
        setBackupList(json.backups || []);
      }
    } catch (e) {
      console.error("Gagal memuat histori backup:", e);
    }
  };

  const handleTriggerBackup = async () => {
    setBackupLoading(true);
    setBackupMessage(null);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      });
      const json = await res.json();
      if (res.ok) {
        setBackupMessage("✅ " + json.message);
        loadBackups();
      } else {
        setBackupMessage("❌ " + (json.error || "Gagal membuat backup database."));
      }
    } catch {
      setBackupMessage("❌ Terjadi gangguan jaringan saat memproses backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleTriggerRestore = async (filename: string) => {
    if (
      !confirm(
        `⚠️ PERHATIAN:\n\nApakah Anda yakin ingin memulihkan (restore) database dari file:\n"${filename}"?\n\nSemua data transaksi dan stok saat ini akan digantikan oleh isi backup ini.\n(Sistem akan otomatis membuat cadangan darurat sebelum proses restore).`
      )
    ) {
      return;
    }

    setBackupLoading(true);
    setBackupMessage(null);
    try {
      const activePin = sessionStorage.getItem("poci_admin_pin") || pin || "1234";
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, pin: activePin }),
      });
      const json = await res.json();
      if (res.ok) {
        setBackupMessage("✅ " + json.message);
        loadBackups();
        refreshData();
      } else {
        setBackupMessage("❌ " + (json.error || "Gagal melakukan restore."));
      }
    } catch {
      setBackupMessage("❌ Terjadi gangguan jaringan saat memproses restore.");
    } finally {
      setBackupLoading(false);
    }
  };

  useEffect(() => {
    // Periksa status apakah PIN masih default "1234"
    fetch("/api/admin/pin")
      .then((res) => res.json())
      .then((d) => {
        if (typeof d?.isDefault === "boolean") {
          setIsPinDefault(d.isDefault);
        }
      })
      .catch(() => {});

    const savedPin = sessionStorage.getItem("poci_admin_pin");
    if (savedPin) {
      setPin(savedPin);
      fetch(`/api/admin/reconciliation?pin=${savedPin}&outletId=all`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Invalid session");
        })
        .then((json) => {
          setData(json);
          setIsAuthenticated(true);
          loadFinancialReport();
          loadOutlets();
          loadMenus();
        })
        .catch(() => {
          sessionStorage.removeItem("poci_admin_pin");
        });
    }
  }, []);

  // ================= REAL-TIME AUTO SYNC (BROADCAST, STORAGE & HEARTBEAT POLLING) =================
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. BroadcastChannel untuk sinkronisasi seketika (<50ms) jika kasir berada di browser yang sama
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("poci_pos_sync");
      channel.onmessage = () => {
        refreshData(undefined, true);
      };
    } catch (err) {
      console.warn("BroadcastChannel tidak didukung di browser ini", err);
    }

    // 2. Storage Event Listener: Terpicu seketika saat kasir melakukan checkout / pengeluaran di tab/jendela lain
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "poci_sync_event") {
        refreshData(undefined, true);
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Auto-refresh saat window kembali fokus / aktif
    const handleFocus = () => {
      refreshData(undefined, true);
    };
    window.addEventListener("focus", handleFocus);

    // 4. Heartbeat Polling otomatis (setiap 3-5 detik) untuk mendeteksi penjualan & pengeluaran dari perangkat kasir lain (tablet/HP)
    let intervalId: NodeJS.Timeout | null = null;
    if (isAutoSync) {
      intervalId = setInterval(() => {
        refreshData(undefined, true);
      }, syncIntervalSeconds * 1000);
    }

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, isAutoSync, syncIntervalSeconds]);

  // 2. OUTLET MANAGEMENT HANDLERS
  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletForm.name.trim()) {
      setOutletMessage("Nama kedai wajib diisi.");
      return;
    }

    setOutletLoading(true);
    setOutletMessage(null);

    try {
      const res = await fetch("/api/admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newOutletForm.name,
          code: newOutletForm.code,
          address: newOutletForm.address,
          target_cups: Number(newOutletForm.target_cups) || 100,
          initial_cash: Number(newOutletForm.initial_cash) || 0,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setOutletMessage("✅ " + resJson.message);
        setNewOutletForm({ name: "", code: "", address: "", target_cups: 100, initial_cash: 0 });
        loadOutlets();
        refreshData();
        try {
          localStorage.setItem("poci_sync_event", String(Date.now()));
          const ch = new BroadcastChannel("poci_pos_sync");
          ch.postMessage({ type: "OUTLET_UPDATED", timestamp: Date.now() });
          ch.close();
        } catch {}
        setTimeout(() => {
          setIsAddOutletOpen(false);
          setOutletMessage(null);
        }, 1500);
      } else {
        setOutletMessage("❌ " + resJson.error);
      }
    } catch {
      setOutletMessage("❌ Gagal membuat kedai baru.");
    } finally {
      setOutletLoading(false);
    }
  };

  const handleDeleteOutlet = async (outletId: string, outletName: string) => {
    if (!confirm(`Yakin ingin menghapus / menonaktifkan kedai "${outletName}"?`)) return;

    try {
      const res = await fetch("/api/admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: outletId }),
      });
      const resJson = await res.json();
      if (res.ok) {
        alert(resJson.message);
        loadOutlets();
        refreshData();
      } else {
        alert("Gagal: " + resJson.error);
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleOpenEditOutlet = (outlet: any) => {
    setEditOutletForm({
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      address: outlet.address || "",
      active_status: outlet.active_status !== false,
      target_cups: outlet.target_cups || 100,
      initial_cash: outlet.initial_cash || 0,
    });
    setEditOutletMessage(null);
    setIsEditOutletOpen(true);
  };

  const handleUpdateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOutletForm.id || !editOutletForm.name.trim()) {
      setEditOutletMessage("❌ Nama kedai wajib diisi.");
      return;
    }

    setEditOutletLoading(true);
    setEditOutletMessage(null);

    try {
      const res = await fetch("/api/admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editOutletForm.id,
          name: editOutletForm.name,
          code: editOutletForm.code,
          address: editOutletForm.address,
          active_status: editOutletForm.active_status,
          target_cups: Number(editOutletForm.target_cups) || 100,
          initial_cash: Number(editOutletForm.initial_cash) || 0,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setEditOutletMessage("✅ " + resJson.message);
        loadOutlets();
        refreshData();
        try {
          localStorage.setItem("poci_sync_event", String(Date.now()));
          const ch = new BroadcastChannel("poci_pos_sync");
          ch.postMessage({ type: "OUTLET_UPDATED", timestamp: Date.now() });
          ch.close();
        } catch {}
        setTimeout(() => {
          setIsEditOutletOpen(false);
          setEditOutletMessage(null);
        }, 1200);
      } else {
        setEditOutletMessage("❌ " + (resJson.error || "Gagal memperbarui kedai"));
      }
    } catch {
      setEditOutletMessage("❌ Terjadi kesalahan jaringan.");
    } finally {
      setEditOutletLoading(false);
    }
  };

  const openCashFloatModal = (outlet: any) => {
    setCashFloatOutlet(outlet);
    setCashFloatValue(outlet.initial_cash || 0);
    setCashFloatMessage(null);
    setIsCashFloatModalOpen(true);
  };

  const handleSaveCashFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashFloatOutlet) return;
    const amountNum = Number(cashFloatValue);
    if (isNaN(amountNum) || amountNum < 0) {
      setCashFloatMessage("❌ Nominal uang cash yang dibawa harus berupa angka 0 atau lebih.");
      return;
    }

    setCashFloatLoading(true);
    setCashFloatMessage(null);

    try {
      const res = await fetch("/api/admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: cashFloatOutlet.id,
          initial_cash: amountNum,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setCashFloatMessage("✅ " + resJson.message);
        loadOutlets();
        refreshData();

        // Broadcast ke POS terminal agar saldo cash di laci langsung ter-update live
        try {
          localStorage.setItem("poci_sync_event", String(Date.now()));
          const ch = new BroadcastChannel("poci_pos_sync");
          ch.postMessage({ type: "OUTLET_UPDATED", timestamp: Date.now() });
          ch.close();
        } catch {}

        setTimeout(() => {
          setIsCashFloatModalOpen(false);
          setCashFloatMessage(null);
        }, 1200);
      } else {
        setCashFloatMessage("❌ " + (resJson.error || "Gagal menyimpan uang cash"));
      }
    } catch {
      setCashFloatMessage("❌ Gagal menyimpan uang cash yang dibawa.");
    } finally {
      setCashFloatLoading(false);
    }
  };

  // 3. MENU MANAGEMENT HANDLERS
  const handleToggleOutletMenu = async (outletId: string, productId: string, currentAvailable: boolean) => {
    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_outlet_menu",
          outletId,
          productId,
          isAvailable: !currentAvailable,
        }),
      });

      if (res.ok) {
        // Update local state
        setMenuProducts((prev) =>
          prev.map((p) => {
            if (p.id !== productId) return p;
            const updatedOP = (p.outletProducts || []).filter((op: any) => op.outlet_id !== outletId);
            updatedOP.push({ outlet_id: outletId, product_id: productId, is_available: !currentAvailable });
            return { ...p, outletProducts: updatedOP };
          })
        );
      }
    } catch (e) {
      console.error("Failed to toggle menu availability", e);
    }
  };

  const handleToggleOutletMenuGroup = async (outletId: string, productIds: string[], currentAvailable: boolean) => {
    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_outlet_menu_group",
          outletId,
          productIds,
          isAvailable: !currentAvailable,
        }),
      });

      if (res.ok) {
        // Update local state for all matching products
        setMenuProducts((prev) =>
          prev.map((p) => {
            if (!productIds.includes(p.id)) return p;
            const updatedOP = (p.outletProducts || []).filter((op: any) => op.outlet_id !== outletId);
            updatedOP.push({ outlet_id: outletId, product_id: p.id, is_available: !currentAvailable });
            return { ...p, outletProducts: updatedOP };
          })
        );
      }
    } catch (e) {
      console.error("Failed to toggle menu group availability", e);
    }
  };

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuForm.baseName.trim()) {
      setMenuMessage("Nama varian menu wajib diisi.");
      return;
    }

    if (newMenuForm.category !== "topping" && !newMenuForm.enableReguler && !newMenuForm.enableJumbo) {
      setMenuMessage("Pilih minimal salah satu ukuran (Reguler atau Jumbo).");
      return;
    }

    setMenuLoading(true);
    setMenuMessage(null);

    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_menu",
          baseName: newMenuForm.baseName,
          category: newMenuForm.category,
          flavorMaterialId: newMenuForm.flavorMaterialId || undefined,
          enableReguler: newMenuForm.enableReguler,
          regulerPrice: newMenuForm.regulerPrice,
          regulerTeaMl: newMenuForm.regulerTeaMl,
          regulerFlavorQty: newMenuForm.regulerFlavorQty,
          enableJumbo: newMenuForm.enableJumbo,
          jumboPrice: newMenuForm.jumboPrice,
          jumboTeaMl: newMenuForm.jumboTeaMl,
          jumboFlavorQty: newMenuForm.jumboFlavorQty,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setMenuMessage("✅ " + resJson.message);
        setNewMenuForm({
          baseName: "",
          category: "fruity",
          flavorMaterialId: "",
          enableReguler: false,
          regulerPrice: "7000",
          regulerTeaMl: "300",
          regulerFlavorQty: "1",
          enableJumbo: true,
          jumboPrice: "9000",
          jumboTeaMl: "450",
          jumboFlavorQty: "1",
        });
        loadMenus();
        setTimeout(() => {
          setIsAddMenuOpen(false);
          setMenuMessage(null);
        }, 1500);
      } else {
        setMenuMessage("❌ " + resJson.error);
      }
    } catch {
      setMenuMessage("❌ Gagal menambahkan menu baru.");
    } finally {
      setMenuLoading(false);
    }
  };

  const handleOpenEditMenu = (item: any) => {
    const allRecipes = [
      ...(item.jumbo?.recipes || []),
      ...(item.reguler?.recipes || []),
      ...(item.single?.recipes || []),
    ];
    const flavorRecipe = allRecipes.find((r: any) => {
      const n = (r.raw_material?.name || "").toLowerCase();
      return !n.includes("cup") && !n.includes("kantong teh") && !n.includes("tea premix");
    });

    setEditMenuForm({
      oldBaseName: item.baseName,
      baseName: item.baseName,
      category: item.category || "fruity",
      flavorMaterialId: flavorRecipe ? flavorRecipe.raw_material_id : "",
      enableReguler: Boolean(item.reguler && item.reguler.active_status !== false),
      regulerPrice: item.reguler ? String(item.reguler.price) : "7000",
      enableJumbo: Boolean(item.jumbo && item.jumbo.active_status !== false),
      jumboPrice: item.jumbo ? String(item.jumbo.price) : "9000",
      price: item.single ? String(item.single.price) : item.reguler ? String(item.reguler.price) : "3000",
    });
    setEditMenuMessage(null);
    setIsEditMenuOpen(true);
  };

  const handleUpdateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMenuForm.baseName.trim()) {
      setEditMenuMessage("Nama varian menu wajib diisi.");
      return;
    }

    if (editMenuForm.category !== "topping" && !editMenuForm.enableReguler && !editMenuForm.enableJumbo) {
      setEditMenuMessage("Pilih minimal salah satu ukuran (Reguler atau Jumbo).");
      return;
    }

    setEditMenuLoading(true);
    setEditMenuMessage(null);

    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_menu",
          oldBaseName: editMenuForm.oldBaseName,
          baseName: editMenuForm.baseName,
          category: editMenuForm.category,
          flavorMaterialId: editMenuForm.flavorMaterialId || undefined,
          enableReguler: editMenuForm.enableReguler,
          regulerPrice: editMenuForm.regulerPrice,
          enableJumbo: editMenuForm.enableJumbo,
          jumboPrice: editMenuForm.jumboPrice,
          price: editMenuForm.price,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setEditMenuMessage("✅ " + resJson.message);
        loadMenus();
        setTimeout(() => {
          setIsEditMenuOpen(false);
          setEditMenuMessage(null);
        }, 1200);
      } else {
        setEditMenuMessage("❌ " + resJson.error);
      }
    } catch {
      setEditMenuMessage("❌ Gagal memperbarui menu.");
    } finally {
      setEditMenuLoading(false);
    }
  };

  const handleDeleteMenuGroup = async (baseName: string, productIds: string[]) => {
    if (!confirm(`Yakin ingin menghapus / menonaktifkan seluruh varian untuk menu "${baseName}"?`)) return;

    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_menu_group", baseName, productIds }),
      });
      const resJson = await res.json();
      if (res.ok) {
        alert(resJson.message);
        loadMenus();
      } else {
        alert("Gagal: " + resJson.error);
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleDeleteMenu = async (productId: string, productName: string) => {
    if (!confirm(`Yakin ingin menghapus / menonaktifkan menu "${productName}"?`)) return;

    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_product", productId }),
      });
      const resJson = await res.json();
      if (res.ok) {
        alert(resJson.message);
        loadMenus();
      } else {
        alert("Gagal: " + resJson.error);
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  // 4. STOCK & OPNAME HANDLERS
  const openSingleStockEdit = (
    outlet: { id: string; name: string },
    stock: { id: string; current_stock: number; raw_material: { id: string; name: string; unit: string } }
  ) => {
    setSingleStockOutlet(outlet);
    setSingleStockMaterial({
      id: stock.raw_material.id,
      name: stock.raw_material.name,
      unit: stock.raw_material.unit,
      currentStock: stock.current_stock,
    });
    setSingleStockMode("set");
    setSingleStockValue(String(stock.current_stock));
    setSingleStockMessage(null);
    setIsSingleStockOpen(true);
  };

  const handleSingleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleStockOutlet || !singleStockMaterial) return;

    const val = parseFloat(singleStockValue);
    if (isNaN(val) || val < 0) {
      setSingleStockMessage("Masukkan angka stok yang valid (>= 0).");
      return;
    }

    setSingleStockLoading(true);
    setSingleStockMessage(null);

    try {
      const res = await fetch("/api/admin/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: singleStockOutlet.id,
          rawMaterialId: singleStockMaterial.id,
          quantity: val,
          addedQuantity: val,
          mode: singleStockMode,
          pin: sessionStorage.getItem("poci_admin_pin") || pin,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setSingleStockMessage("✅ " + resData.message);
        refreshData();
        setTimeout(() => {
          setIsSingleStockOpen(false);
          setSingleStockMessage(null);
        }, 1200);
      } else {
        setSingleStockMessage("❌ " + resData.error);
      }
    } catch {
      setSingleStockMessage("❌ Terjadi kesalahan jaringan.");
    } finally {
      setSingleStockLoading(false);
    }
  };

  const handleZeroAll = async (outletId: string, outletName: string) => {
    if (!confirm(`APAKAH ANDA YAKIN ingin mengosongkan SEMUA stok bahan baku untuk "${outletName}" menjadi 0?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          mode: "zero_all",
          pin: sessionStorage.getItem("poci_admin_pin") || pin,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        alert("✅ " + resData.message);
        refreshData();
      } else {
        alert("❌ " + resData.error);
      }
    } catch {
      alert("❌ Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  const openOpnameModal = (outlet: Outlet) => {
    setOpnameOutlet(outlet);
    const initialMap: Record<string, number> = {};
    if (data) {
      data.boothStocks
        .filter((bs) => bs.outlet.id === outlet.id)
        .forEach((bs) => {
          initialMap[bs.raw_material.id] = bs.current_stock;
        });
    }
    setOpnameValues(initialMap);
    setOpnameMessage(null);
    setIsOpnameOpen(true);
  };

  const handleOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameOutlet) return;

    setOpnameLoading(true);
    setOpnameMessage(null);

    const updates = Object.entries(opnameValues).map(([rawMaterialId, targetStock]) => ({
      rawMaterialId,
      targetStock: Number(targetStock) || 0,
    }));

    try {
      const res = await fetch("/api/admin/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: opnameOutlet.id,
          mode: "bulk_set",
          updates,
          pin: sessionStorage.getItem("poci_admin_pin") || pin,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setOpnameMessage("✅ " + resData.message);
        refreshData();
        setTimeout(() => {
          setIsOpnameOpen(false);
          setOpnameMessage(null);
        }, 1200);
      } else {
        setOpnameMessage("❌ " + resData.error);
      }
    } catch {
      setOpnameMessage("❌ Gagal menyimpan opname stok.");
    } finally {
      setOpnameLoading(false);
    }
  };

  const setAllOpnameToZero = () => {
    const zeroed: Record<string, number> = {};
    Object.keys(opnameValues).forEach((k) => (zeroed[k] = 0));
    setOpnameValues(zeroed);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatusMessage(null);

    if (resetType === "reset_database" && confirmText.trim().toUpperCase() !== "RESET DATABASE") {
      setResetStatusMessage("❌ Ketik teks konfirmasi persis: RESET DATABASE");
      return;
    }

    if (!adminAuthPin) {
      setResetStatusMessage("❌ Masukkan PIN Otorisasi Admin.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resetType,
          outletId: resetTargetOutlet,
          pin: adminAuthPin,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setResetStatusMessage("✅ " + resData.message);
        if (typeof window !== "undefined") {
          localStorage.removeItem("teh_poci_offline_tx_queue");
          localStorage.removeItem("offline_shift_closing");
        }
        setTimeout(() => {
          refreshData();
          setIsResetModalOpen(false);
          setResetStatusMessage(null);
          setConfirmText("");
          setAdminAuthPin("");
        }, 1800);
      } else {
        setResetStatusMessage("❌ " + resData.error);
      }
    } catch {
      setResetStatusMessage("❌ Terjadi kesalahan jaringan saat mengeksekusi reset.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestockMessage(null);

    const qty = parseFloat(restockQty);
    if (!restockOutletId || !selectedMaterialId || isNaN(qty) || (restockMode === "add" && qty <= 0) || qty < 0) {
      setRestockMessage("Pilih kedai, bahan baku, dan masukkan jumlah yang valid (>= 0).");
      return;
    }

    try {
      const res = await fetch("/api/admin/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: restockOutletId,
          rawMaterialId: selectedMaterialId,
          quantity: qty,
          addedQuantity: qty,
          mode: restockMode,
          pin: sessionStorage.getItem("poci_admin_pin") || pin,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setRestockMessage("✅ " + resData.message);
        setRestockQty("");
        refreshData();
        setTimeout(() => {
          setIsRestockOpen(false);
          setRestockMessage(null);
        }, 1500);
      } else {
        setRestockMessage("❌ " + resData.error);
      }
    } catch {
      setRestockMessage("❌ Terjadi kesalahan pengiriman restock.");
    }
  };

  const uniqueMaterials = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { id: string; name: string; unit: string }>();
    for (const bs of data.boothStocks) {
      map.set(bs.raw_material.id, bs.raw_material);
    }
    return Array.from(map.values());
  }, [data]);

  const groupedAdminMenus = useMemo(() => {
    const map = new Map<
      string,
      {
        baseName: string;
        category: string;
        reguler?: any;
        jumbo?: any;
        single?: any;
        allProducts: any[];
      }
    >();

    for (const p of menuProducts) {
      // Abaikan produk yang telah dinonaktifkan / dihapus
      if (p.active_status === false) continue;

      const isReg = /\((reguler|regular)\)/i.test(p.name);
      const isJum = /\(jumbo\)/i.test(p.name);
      let base = p.name.replace(/\s*[\(\[]?(reguler|regular|jumbo)[\)\]]?/gi, "").trim();
      if (!base) base = p.name.trim();

      if (!map.has(base)) {
        map.set(base, {
          baseName: base,
          category: p.category || "fruity",
          allProducts: [],
        });
      }

      const entry = map.get(base)!;
      entry.allProducts.push(p);

      const hasRegCup = p.recipes?.some((r: any) => r.raw_material?.name?.toLowerCase().includes("reguler"));
      const hasJumboCup = p.recipes?.some((r: any) => r.raw_material?.name?.toLowerCase().includes("jumbo"));

      if (p.category === "topping" || (!isReg && !isJum && !hasRegCup && !hasJumboCup)) {
        entry.single = p;
      } else if (isReg || hasRegCup) {
        entry.reguler = p;
      } else if (isJum || hasJumboCup) {
        entry.jumbo = p;
      }
    }

    return Array.from(map.values());
  }, [menuProducts]);

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center">
          <div className="w-20 h-20 bg-white rounded-2xl p-2 flex items-center justify-center mx-auto mb-4 border border-amber-400 shadow-xl overflow-hidden">
            <img src="/logo.jpg" alt="Logo Teh Cap Poci" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-white">Owner Portal</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Dashboard Rekonsiliasi, Laporan Keuangan &amp; Multi-Kedai
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder={isPinDefault ? "Masukkan PIN Admin (Default: 1234)" : "Masukkan PIN Admin"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center tracking-widest text-lg py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-400 font-semibold">{authError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-slate-950 font-bold rounded-xl shadow-lg transition"
            >
              {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Terminal Kasir
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shrink-0 border border-amber-400 overflow-hidden">
              <img src="/logo.jpg" alt="Logo Teh Cap Poci" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight">
                  PANEL OWNER MULTI-KEDAI
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                  Es Teh Poci
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Laporan Keuangan, Stok BOM &amp; Kontrol Cabang
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setRestockOutletId(data?.outlets[0]?.id || "");
                setIsRestockOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Restock Central Kitchen</span>
            </button>

            {/* Tombol Otorisasi Reset Admin */}
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => {
                  setResetType("reset_pos");
                  setResetTargetOutlet(selectedOutletFilter);
                  setResetStatusMessage(null);
                  setConfirmText("");
                  setAdminAuthPin("");
                  setIsResetModalOpen(true);
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
                title="Reset Transaksi & Shift Closing POS"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset POS</span>
              </button>

              <button
                onClick={() => {
                  setResetType("reset_database");
                  setResetTargetOutlet("all");
                  setResetStatusMessage(null);
                  setConfirmText("");
                  setAdminAuthPin("");
                  setIsResetModalOpen(true);
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition"
                title="Reset Total Database (Khusus Testing)"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset DB</span>
              </button>

              <button
                onClick={() => {
                  setBackupMessage(null);
                  loadBackups();
                  setIsBackupModalOpen(true);
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-300 hover:bg-blue-600 hover:text-white transition"
                title="Backup & Unduh Database SQLite"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Backup DB</span>
              </button>
            </div>

            <button
              onClick={() => refreshData()}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Manual Sekarang"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* Live Auto-Sync Status Indicator & Toggle */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
              <span className="relative flex h-2 w-2">
                {isAutoSync && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isAutoSync ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                ></span>
              </span>
              <button
                onClick={() => setIsAutoSync(!isAutoSync)}
                className="text-[11px] font-bold text-slate-300 hover:text-white transition flex items-center gap-1"
                title={
                  isAutoSync
                    ? `Live Auto-Sync Aktif (Pembaruan otomatis data setiap ${syncIntervalSeconds} detik). Klik untuk menjeda.`
                    : "Live Auto-Sync Dijeda. Klik untuk mengaktifkan kembali."
                }
              >
                <span className="hidden sm:inline">{isAutoSync ? "Live Sync" : "Sync Dijeda"}</span>
                <span className="text-[10px] text-emerald-400 font-mono">({syncIntervalSeconds}s)</span>
              </button>
            </div>

            {/* Tombol Ganti PIN */}
            <button
              onClick={() => {
                setChangePinForm({ currentPin: "", newPin: "", confirmPin: "" });
                setChangePinMessage(null);
                setIsChangePinOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition border border-amber-500/30"
              title="Ganti PIN Keamanan Admin"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ganti PIN</span>
            </button>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Terminal POS
            </Link>

            {/* Tombol Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 transition"
              title="Keluar dari Owner Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setActiveAdminTab("financial");
              loadFinancialReport();
            }}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "financial"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>📊 Laporan Keuangan</span>
          </button>

          <button
            onClick={() => setActiveAdminTab("stocks")}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "stocks"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📦 Stok &amp; Closing</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab("outlets");
              loadOutlets();
            }}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "outlets"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>🏪 Cabang Kedai ({outletsList.length || data?.outlets.length || 0})</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab("master_menus");
              loadMenus();
            }}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "master_menus"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>📋 Master Menu ({groupedAdminMenus.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab("outlet_menus");
              loadMenus();
            }}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "outlet_menus"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>🥤 Menu per Kedai</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: LAPORAN KEUANGAN & PENJUALAN                            */}
        {/* ============================================================== */}
        {activeAdminTab === "financial" && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col xl:flex-row min-h-[750px]">
            {/* ============================================================== */}
            {/* SUB-SIDEBAR HASHMICRO STYLE                                    */}
            {/* ============================================================== */}
            <aside className="w-full xl:w-64 bg-slate-50/70 border-b xl:border-b-0 xl:border-r border-slate-200 p-4 flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                {/* Company Dropdown / Badge */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs overflow-hidden">
                      <img src="/logo.jpg" alt="Logo Teh Cap Poci" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Company</span>
                      <p className="text-xs font-black text-slate-900 leading-tight">Teh Cap Poci</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>

                {/* Team Tag Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                    Poci Group <span className="text-purple-500 font-normal">+20</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                    Kedai POS <span className="text-blue-500 font-normal">Active</span>
                  </span>
                </div>

                {/* Finance Section Indicator */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                        F
                      </span>
                      <span>Finance Core</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Quick Search inside Sidebar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search menu..."
                    value={financeSearch}
                    onChange={(e) => setFinanceSearch(e.target.value)}
                    className="w-full pl-8 pr-12 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                    Alt+S
                  </span>
                </div>

                {/* Navigation Module Pills */}
                <nav className="space-y-1 pt-1 text-xs">
                  <button
                    onClick={() => setFinanceModule("forecast")}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                      financeModule === "forecast"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Revenue Forecast
                    </span>
                    <TrendingUp className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  <button
                    onClick={() => setFinanceModule("cashflow")}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                      financeModule === "cashflow"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Cash Flow
                    </span>
                    <Wallet className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  <button
                    onClick={() => setFinanceModule("profitability")}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                      financeModule === "profitability"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Profitability &amp; HPP
                    </span>
                    <DollarSign className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  <button
                    onClick={() => setFinanceModule("balancesheet")}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                      financeModule === "balancesheet"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Neraca Keuangan
                    </span>
                    <Scale className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  <button
                    onClick={() => setFinanceModule("expenses")}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                      financeModule === "expenses"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      Catatan Biaya &amp; Beban
                    </span>
                    <CreditCard className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  <button
                    onClick={() => setFinanceModule("ledger")}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                      financeModule === "ledger"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      Audit Transaksi
                    </span>
                    <FileText className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </nav>
              </div>

              {/* Bottom Sync Info */}
              <div className="pt-4 border-t border-slate-200/70 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>SQLite DB Synced</span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live POS
                </span>
              </div>
            </aside>

            {/* ============================================================== */}
            {/* MAIN WORKSPACE CONTENT AREA                                    */}
            {/* ============================================================== */}
            <main className="flex-1 p-5 md:p-7 flex flex-col gap-6 bg-white overflow-y-auto">
              {/* Top Bar: Search & AI Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFinanceModule("forecast")}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs transition"
                    title="Kembali ke Dashboard Utama"
                  >
                    &lt;
                  </button>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari transaksi / menu..."
                      value={financeSearch}
                      onChange={(e) => setFinanceSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-slate-300 w-48 sm:w-64 transition"
                    />
                  </div>
                </div>

                {/* AI Badge matching HashMicro reference */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Powered by Hashy AI</span>
                </div>
              </div>

              {/* Title & Action Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    {financeModule === "cashflow"
                      ? "Laporan Arus Kas Operasional (Cash Flow)"
                      : financeModule === "profitability"
                      ? "Laporan Laba Rugi & HPP"
                      : financeModule === "balancesheet"
                      ? "Neraca Keuangan Konsolidasi"
                      : financeModule === "expenses"
                      ? "Catatan Biaya & Beban Operasional"
                      : financeModule === "ledger"
                      ? "Audit Riwayat Transaksi"
                      : financePeriod === "30d"
                      ? "Proyeksi Penjualan 30 Hari (Forecast)"
                      : financePeriod === "7d"
                      ? "Proyeksi Penjualan 7 Hari (Forecast)"
                      : financePeriod === "today"
                      ? "Proyeksi Penjualan Hari Ini (Forecast)"
                      : "Proyeksi Penjualan & Revenue Forecast"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {financeModule === "cashflow"
                      ? "Pemantauan aliran kas riil masuk (inflow) vs kas keluar operasional toko (outflow)"
                      : "Proyeksi arus kas masuk dan tren penjualan dibandingkan target perusahaan"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Outlet Selector */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
                    <Store className="w-3.5 h-3.5 text-emerald-700 mr-1.5 shrink-0" />
                    <select
                      value={financeOutlet}
                      onChange={(e) => {
                        setFinanceOutlet(e.target.value);
                        loadFinancialReport(e.target.value, financePeriod);
                      }}
                      className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="all">Semua Kedai (Konsolidasi)</option>
                      {data?.outlets?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
                    <select
                      value={financePeriod}
                      onChange={(e) => {
                        setFinancePeriod(e.target.value);
                        loadFinancialReport(financeOutlet, e.target.value);
                      }}
                      className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="30d">30 Hari Terakhir</option>
                      <option value="7d">7 Hari Terakhir</option>
                      <option value="today">Hari Ini</option>
                      <option value="yesterday">Kemarin</option>
                      <option value="all">Semua Waktu</option>
                    </select>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={exportFinancialCSV}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Export</span>
                  </button>

                  {/* + Add Expense Button */}
                  <button
                    onClick={() => {
                      setExpenseMessage(null);
                      setIsAddExpenseOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add</span>
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={() => loadFinancialReport(financeOutlet, financePeriod)}
                    disabled={financeLoading}
                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                    title="Muat Ulang Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${financeLoading ? "animate-spin text-emerald-600" : ""}`} />
                  </button>
                </div>
              </div>

              {/* 4 Top KPI Cards: Dynamic between Cash Flow vs Forecast */}
              {financeModule === "cashflow" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1: KAS MASUK (INFLOW) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      TOTAL KAS MASUK (INFLOW)
                    </span>
                    <div className="mt-2">
                      <h3 className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                        +{formatRupiah(financeData?.cashFlow?.totalInflow ?? financeData?.summary?.totalRevenue ?? 0)}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      Tunai: {formatRupiah(financeData?.summary?.cashRevenue || 0)} • QRIS: {formatRupiah(financeData?.summary?.qrisRevenue || 0)}
                    </p>
                  </div>

                  {/* KPI 2: KAS KELUAR (OUTFLOW) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      TOTAL KAS KELUAR (OUTFLOW)
                    </span>
                    <div className="mt-2">
                      <h3 className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                        -{formatRupiah(financeData?.cashFlow?.totalOutflow ?? financeData?.summary?.totalExpenses ?? 0)}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono truncate" title="Belanja Es Batu, Gas LPG, Sedotan, dsb">
                      Belanja Es, Gas, Kresek, dll
                    </p>
                  </div>

                  {/* KPI 3: ARUS KAS BERSIH (NET CASH) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      ARUS KAS BERSIH (NET CASH)
                    </span>
                    <div className="mt-2">
                      <h3
                        className={`text-2xl font-black font-mono tracking-tight ${
                          (financeData?.cashFlow?.netCashFlow ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {(financeData?.cashFlow?.netCashFlow ?? 0) >= 0 ? "+" : ""}
                        {formatRupiah(financeData?.cashFlow?.netCashFlow ?? 0)}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-bold">
                      {(financeData?.cashFlow?.netCashFlow ?? 0) >= 0 ? "🟢 Surplus Kas Operasional" : "🔴 Defisit Kas Operasional"}
                    </p>
                  </div>

                  {/* KPI 4: SALDO LIKUIDITAS KAS */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      SALDO LIKUIDITAS KAS
                    </span>
                    <div className="mt-2">
                      <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {formatRupiah(financeData?.cashFlow?.closingLiquidity ?? 0)}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      Total Saldo Kas Fisik &amp; Bank
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1: KAS AKHIR PROYEKSI */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      KAS AKHIR PROYEKSI
                    </span>
                    <div className="mt-2">
                      <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {formatRupiah(financeData?.summary?.totalRevenue || 0)}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                      <span className="font-bold text-slate-700 font-mono">{financeData?.summary?.totalTransactions || 0}</span> nota penjualan
                    </p>
                  </div>

                  {/* KPI 2: GAP VS TARGET */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      GAP VS TARGET
                    </span>
                    <div className="mt-2">
                      <h3
                        className={`text-2xl font-black font-mono tracking-tight ${
                          Number(financeData?.summary?.gapVsTarget || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {Number(financeData?.summary?.gapVsTarget || 0) >= 0 ? "+" : ""}
                        {financeData?.summary?.gapVsTarget || "0.0"}%
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      Target: {formatRupiah(financeData?.summary?.targetRevenue || 0)}
                    </p>
                  </div>

                  {/* KPI 3: RISIKO DEFISIT */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      RISIKO DEFISIT
                    </span>
                    <div className="mt-2">
                      <h3
                        className={`text-2xl font-black tracking-tight ${
                          financeData?.summary?.deficitRisk === "Rendah" ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {financeData?.summary?.deficitRisk || "Rendah"}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Likuiditas &amp; saldo kas aman
                    </p>
                  </div>

                  {/* KPI 4: HPP & BEBAN OPERASIONAL */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      HPP &amp; BEBAN OPERASIONAL
                    </span>
                    <div className="mt-2">
                      <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {formatRupiah(
                          (financeData?.summary?.totalHPP || 0) + (financeData?.summary?.totalExpenses || 0)
                        )}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono truncate" title={`HPP: ${formatRupiah(financeData?.summary?.totalHPP || 0)} | Beban: ${formatRupiah(financeData?.summary?.totalExpenses || 0)}`}>
                      HPP: {formatRupiah(financeData?.summary?.totalHPP || 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* AI INSIGHT Banner (HashMicro Reference Visuals) */}
              <div className="bg-purple-50/80 border border-purple-200/70 rounded-2xl p-4 flex items-start gap-3 text-xs text-purple-900 shadow-xs">
                <div className="flex items-center gap-1.5 shrink-0 font-black text-purple-700">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="uppercase tracking-wider text-[11px]">AI INSIGHT</span>
                </div>
                <p className="leading-relaxed font-medium">
                  {financeData?.aiInsight ||
                    "Arus kas diproyeksikan tetap di atas target selama periode berjalan. Pertahankan rasio margin dengan audit rutin stok fisik bahan baku."}
                </p>
              </div>

              {/* MODULE 1: REVENUE FORECAST (Proyeksi Penjualan & Target) */}
              {financeModule === "forecast" && (
                <div className="space-y-6">
                  {/* Chart Container Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                    {/* Sub-tabs header matching HashMicro reference */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <button
                        onClick={() => setFinanceChartSubTab("timeline")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          financeChartSubTab === "timeline"
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Revenue Timeline
                      </button>
                      <button
                        onClick={() => setFinanceChartSubTab("seasonality")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          financeChartSubTab === "seasonality"
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Seasonality Index
                      </button>
                      <button
                        onClick={() => setFinanceChartSubTab("accuracy")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          financeChartSubTab === "accuracy"
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Forecast Accuracy
                      </button>
                    </div>

                    {/* Interactive SVG Chart */}
                    {(() => {
                      const timeline = financeData?.timeline || [];
                      const count = timeline.length;
                      if (count === 0) {
                        return (
                          <div className="py-20 text-center text-slate-400 text-xs">
                            Belum ada data timeline transaksi di rentang waktu ini
                          </div>
                        );
                      }

                      const maxVal =
                        Math.max(
                          ...timeline.map((t: any) =>
                            Math.max(t.revenue || 0, t.target || 0, t.projection || 0)
                          ),
                          100000
                        ) * 1.15;

                      const svgW = 860;
                      const svgH = 260;
                      const padL = 72;
                      const padR = 24;
                      const padT = 24;
                      const padB = 40;
                      const plotW = svgW - padL - padR;
                      const plotH = svgH - padT - padB;

                      const getX = (i: number) => {
                        if (count <= 1) return padL + plotW / 2;
                        return padL + (i / (count - 1)) * plotW;
                      };

                      const getY = (val: number) => {
                        const clamped = Math.max(0, val);
                        return padT + plotH - (clamped / maxVal) * plotH;
                      };

                      const revCoords = timeline.map((t: any, i: number) => ({
                        x: getX(i),
                        y: getY(t.revenue),
                        val: t.revenue,
                        label: t.label,
                        target: t.target,
                        projection: t.projection,
                      }));

                      const revPathD =
                        revCoords.length > 0 ? `M ${revCoords.map((c: any) => `${c.x} ${c.y}`).join(" L ")}` : "";
                      const targetPathD =
                        revCoords.length > 0
                          ? `M ${revCoords.map((c: any) => `${c.x} ${getY(c.target)}`).join(" L ")}`
                          : "";
                      const projPathD =
                        revCoords.length > 0
                          ? `M ${revCoords.map((c: any) => `${c.x} ${getY(c.projection)}`).join(" L ")}`
                          : "";

                      // Shaded projection band (cone area)
                      const projUpper = revCoords.map((c: any) => `${c.x},${getY(Math.round(c.projection * 1.12))}`);
                      const projLower = [...revCoords]
                        .reverse()
                        .map((c: any) => `${c.x},${getY(Math.round(c.projection * 0.88))}`);
                      const projPolygonPoints = [...projUpper, ...projLower].join(" ");

                      // Y ticks
                      const yTicks = [0, 0.33, 0.66, 1].map((p) => {
                        const v = Math.round(maxVal * p);
                        return { val: v, y: getY(v), label: formatRupiah(v) };
                      });

                      return (
                        <div className="relative w-full overflow-x-auto pt-2">
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[650px] overflow-visible">
                            {/* Horizontal Grid lines */}
                            {yTicks.map((t, idx) => (
                              <g key={idx}>
                                <line
                                  x1={padL}
                                  y1={t.y}
                                  x2={svgW - padR}
                                  y2={t.y}
                                  stroke="#f1f5f9"
                                  strokeDasharray="4 4"
                                  strokeWidth="1"
                                />
                                <text
                                  x={padL - 10}
                                  y={t.y + 4}
                                  textAnchor="end"
                                  fontSize="10"
                                  fill="#94a3b8"
                                  fontFamily="monospace"
                                >
                                  {t.label}
                                </text>
                              </g>
                            ))}

                            {/* Shaded Projection Area Band */}
                            <polygon points={projPolygonPoints} fill="#f97316" fillOpacity="0.10" />

                            {/* Target Line (Green dashed) */}
                            <path
                              d={targetPathD}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2"
                              strokeDasharray="5 4"
                            />

                            {/* Projection Line (Amber dotted) */}
                            <path
                              d={projPathD}
                              fill="none"
                              stroke="#f97316"
                              strokeWidth="1.8"
                              strokeDasharray="3 3"
                            />

                            {/* Actual Revenue Line (Deep Blue solid) */}
                            <path d={revPathD} fill="none" stroke="#2563eb" strokeWidth="2.5" />

                            {/* Data points markers on Actual Revenue */}
                            {revCoords.map((c: any, i: number) => (
                              <g key={i} className="group cursor-pointer">
                                <circle
                                  cx={c.x}
                                  cy={c.y}
                                  r="4"
                                  fill="#2563eb"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  className="transition-transform duration-150 hover:scale-125"
                                />
                                <title>{`${c.label}: Penjualan ${formatRupiah(c.val)} | Target ${formatRupiah(
                                  c.target
                                )} | Proyeksi ${formatRupiah(c.projection)}`}</title>
                              </g>
                            ))}

                            {/* X-axis date labels */}
                            {revCoords
                              .filter((_: any, i: number) =>
                                count <= 7 ? true : i % Math.ceil(count / 7) === 0 || i === count - 1
                              )
                              .map((c: any, i: number) => (
                                <text
                                  key={i}
                                  x={c.x}
                                  y={svgH - 10}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="#64748b"
                                  fontWeight="600"
                                >
                                  {c.label}
                                </text>
                              ))}
                          </svg>

                          {/* Chart Legend */}
                          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-1 bg-blue-600 rounded"></span>
                              <span>Omset Riil (Actual Revenue)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-1 bg-emerald-500 rounded border-dashed border-t-2 border-emerald-500"></span>
                              <span>Target Perusahaan</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3 bg-amber-500/20 border border-amber-500/70 rounded-xs"></span>
                              <span>Band Proyeksi Tren</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 2-Column Details: Best Selling Menu & Outlet Contribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ranking Menu Terlaris */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <span>🏆</span> Peringkat Penjualan Menu
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400">
                          {financeData?.productSales?.length || 0} varian
                        </span>
                      </div>

                      <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
                        {!financeData?.productSales || financeData.productSales.length === 0 ? (
                          <p className="text-xs text-slate-400 py-8 text-center">
                            Belum ada transaksi di periode ini
                          </p>
                        ) : (
                          financeData.productSales
                            .filter(
                              (p: any) =>
                                !financeSearch ||
                                p.name.toLowerCase().includes(financeSearch.toLowerCase())
                            )
                            .map((p: any, i: number) => (
                              <div
                                key={p.id}
                                className="p-3 bg-slate-50/80 hover:bg-slate-100/80 transition rounded-xl border border-slate-200/70 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                                    {i + 1}
                                  </span>
                                  <div>
                                    <p className="font-bold text-slate-900">{p.name}</p>
                                    <p className="text-[10px] text-slate-500">
                                      {p.quantity} cup terjual • Margin {p.marginPercent}%
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono font-bold text-slate-900 block">
                                    {formatRupiah(p.revenue)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {p.percent}% omset
                                  </span>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* Kontribusi Penjualan per Kedai */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <Store className="w-4 h-4 text-emerald-700" />
                          Kontribusi Omset per Kedai
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400">
                          {financeData?.outletSales?.length || 0} kedai aktif
                        </span>
                      </div>

                      <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
                        {!financeData?.outletSales || financeData.outletSales.length === 0 ? (
                          <p className="text-xs text-slate-400 py-8 text-center">Belum ada data kedai</p>
                        ) : (
                          financeData.outletSales.map((o: any) => (
                            <div
                              key={o.id}
                              className="p-3 bg-slate-50/80 hover:bg-slate-100/80 transition rounded-xl border border-slate-200/70 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800">
                                    {o.code}
                                  </span>
                                  <span className="font-bold text-slate-900">{o.name}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {o.cupCount} cup • {o.transactionCount} transaksi
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-slate-900 block">
                                  {formatRupiah(o.revenue)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {o.percent}% omset
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 2: CASH FLOW (Arus Kas Masuk vs Kas Keluar Riil) */}
              {financeModule === "cashflow" && (
                <div className="space-y-6">
                  {/* Grafik Arus Kas Harian (Dual Bar Inflow vs Outflow) */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-700" />
                          Grafik Arus Kas Harian (Inflow vs Outflow)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Membandingkan penerimaan omset masuk terhadap kas keluar belanja toko
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                        {financeData?.timeline?.length || 0} Hari Dipantau
                      </span>
                    </div>

                    {/* SVG Dual-Bar Chart */}
                    {(() => {
                      const timeline = financeData?.timeline || [];
                      const count = timeline.length;
                      if (count === 0) {
                        return (
                          <div className="py-20 text-center text-slate-400 text-xs">
                            Belum ada data arus kas di periode ini
                          </div>
                        );
                      }

                      const maxVal =
                        Math.max(
                          ...timeline.map((t: any) =>
                            Math.max(t.inflow || t.revenue || 0, t.outflow || 0)
                          ),
                          50000
                        ) * 1.25;

                      const svgW = 860;
                      const svgH = 260;
                      const padL = 72;
                      const padR = 24;
                      const padT = 24;
                      const padB = 40;
                      const plotW = svgW - padL - padR;
                      const plotH = svgH - padT - padB;

                      const getX = (i: number) => {
                        if (count <= 1) return padL + plotW / 2;
                        return padL + (i / (count - 1)) * plotW;
                      };

                      const getY = (val: number) => {
                        const clamped = Math.max(0, val);
                        return padT + plotH - (clamped / maxVal) * plotH;
                      };

                      const barWidth = Math.min(18, Math.max(6, (plotW / count) * 0.35));

                      const yTicks = [0, 0.33, 0.66, 1].map((p) => {
                        const v = Math.round(maxVal * p);
                        return { val: v, y: getY(v), label: formatRupiah(v) };
                      });

                      const netCoords = timeline.map((t: any, i: number) => ({
                        x: getX(i),
                        y: getY(Math.max(0, (t.inflow || t.revenue || 0) - (t.outflow || 0))),
                        net: (t.inflow || t.revenue || 0) - (t.outflow || 0),
                      }));
                      const netPathD = netCoords.length > 0 ? `M ${netCoords.map((c: any) => `${c.x} ${c.y}`).join(" L ")}` : "";

                      return (
                        <div className="relative w-full overflow-x-auto pt-2">
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[650px] overflow-visible">
                            {/* Horizontal Grid lines */}
                            {yTicks.map((t, idx) => (
                              <g key={idx}>
                                <line
                                  x1={padL}
                                  y1={t.y}
                                  x2={svgW - padR}
                                  y2={t.y}
                                  stroke="#f1f5f9"
                                  strokeDasharray="4 4"
                                  strokeWidth="1"
                                />
                                <text
                                  x={padL - 10}
                                  y={t.y + 4}
                                  textAnchor="end"
                                  fontSize="10"
                                  fill="#94a3b8"
                                  fontFamily="monospace"
                                >
                                  {t.label}
                                </text>
                              </g>
                            ))}

                            {/* Dual Bars for Inflow vs Outflow */}
                            {timeline.map((t: any, i: number) => {
                              const cx = getX(i);
                              const inflowVal = t.inflow || t.revenue || 0;
                              const outflowVal = t.outflow || 0;

                              const inflowH = (inflowVal / maxVal) * plotH;
                              const inflowY = padT + plotH - inflowH;

                              const outflowH = (outflowVal / maxVal) * plotH;
                              const outflowY = padT + plotH - outflowH;

                              return (
                                <g key={i} className="group cursor-pointer">
                                  {/* Inflow Bar (Green) */}
                                  {inflowVal > 0 && (
                                    <rect
                                      x={cx - barWidth - 1}
                                      y={inflowY}
                                      width={barWidth}
                                      height={Math.max(2, inflowH)}
                                      fill="#10b981"
                                      rx="3"
                                      className="transition-opacity hover:opacity-80"
                                    />
                                  )}

                                  {/* Outflow Bar (Rose / Red) */}
                                  {outflowVal > 0 && (
                                    <rect
                                      x={cx + 1}
                                      y={outflowY}
                                      width={barWidth}
                                      height={Math.max(2, outflowH)}
                                      fill="#f43f5e"
                                      rx="3"
                                      className="transition-opacity hover:opacity-80"
                                    />
                                  )}

                                  <title>{`${t.label}: Kas Masuk +${formatRupiah(inflowVal)} | Kas Keluar -${formatRupiah(outflowVal)} | Net: ${formatRupiah(inflowVal - outflowVal)}`}</title>
                                </g>
                              );
                            })}

                            {/* Net Cash Line (Blue) */}
                            <path d={netPathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="3 3" />

                            {/* Net Cash Markers */}
                            {netCoords.map((c: any, i: number) => (
                              <circle
                                key={i}
                                cx={c.x}
                                cy={c.y}
                                r="3.5"
                                fill="#2563eb"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                            ))}

                            {/* X-axis date labels */}
                            {timeline
                              .filter((_: any, i: number) =>
                                count <= 7 ? true : i % Math.ceil(count / 7) === 0 || i === count - 1
                              )
                              .map((t: any, i: number) => {
                                const realIdx = timeline.findIndex((item: any) => item.date === t.date);
                                return (
                                  <text
                                    key={i}
                                    x={getX(realIdx >= 0 ? realIdx : i)}
                                    y={svgH - 10}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#64748b"
                                    fontWeight="600"
                                  >
                                    {t.label}
                                  </text>
                                );
                              })}
                          </svg>

                          {/* Chart Legend */}
                          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3 bg-emerald-500 rounded-xs"></span>
                              <span>Kas Masuk / Inflow (Penjualan)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3 bg-rose-500 rounded-xs"></span>
                              <span>Kas Keluar / Outflow (Belanja Es, Gas, Beban)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-0.5 bg-blue-600 border-dashed border-t-2 border-blue-600"></span>
                              <span>Arus Kas Bersih (Net Cash Flow)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Alokasi Pengeluaran Kas Keluar per Kategori (Es Batu, Gas, Kresek, dll) */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <span>📦</span> Alokasi Kas Keluar per Kategori Biaya
                        </h4>
                        <p className="text-xs text-slate-500">
                          Total beban operasional periode ini: {formatRupiah(financeData?.cashFlow?.totalOutflow || 0)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-rose-600 font-mono">
                        {financeData?.expenses?.length || 0} Bukti Pengeluaran
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {financeData?.cashFlow?.categories?.map((cat: any) => (
                        <div
                          key={cat.key}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xl">{cat.icon}</span>
                            <span className="text-[10px] font-bold font-mono text-slate-400">
                              {cat.percent}%
                            </span>
                          </div>
                          <div className="mt-2">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{cat.label}</p>
                            <p className="text-xs font-black font-mono text-slate-900 mt-0.5">
                              {formatRupiah(cat.amount)}
                            </p>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono mt-1">
                            {cat.count}x belanja
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabel Rekonsiliasi Aliran Kas Masuk vs Kas Keluar Harian */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        Tabel Rekonsiliasi Aliran Kas Harian
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        Laporan Arus Kas Rinci
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="py-2.5 px-3">Tanggal</th>
                            <th className="py-2.5 px-3 text-right">Kas Masuk (Inflow)</th>
                            <th className="py-2.5 px-3 text-right">Kas Keluar (Outflow)</th>
                            <th className="py-2.5 px-3 text-right">Arus Kas Bersih (Net)</th>
                            <th className="py-2.5 px-3 text-center">Status Arus Kas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {!financeData?.timeline || financeData.timeline.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                                Belum ada riwayat pergerakan kas di periode ini
                              </td>
                            </tr>
                          ) : (
                            financeData.timeline.map((d: any, idx: number) => {
                              const net = (d.inflow || d.revenue || 0) - (d.outflow || 0);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                                    {d.label} ({d.date})
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                    +{formatRupiah(d.inflow || d.revenue || 0)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                    {d.outflow > 0 ? `-${formatRupiah(d.outflow)}` : "Rp 0"}
                                  </td>
                                  <td
                                    className={`py-2.5 px-3 text-right font-black ${
                                      net >= 0 ? "text-emerald-700" : "text-rose-600"
                                    }`}
                                  >
                                    {net >= 0 ? "+" : ""}
                                    {formatRupiah(net)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-sans">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        net > 0
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : net === 0
                                          ? "bg-slate-50 text-slate-500"
                                          : "bg-rose-50 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      {net > 0 ? "Surplus" : net === 0 ? "Impas (Rp 0)" : "Defisit"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE: PROFITABILITY & HPP LABA RUGI */}
              {financeModule === "profitability" && (
                <div className="space-y-6">
                  {/* Ringkasan P&L Income Statement */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-base text-slate-900">
                          Laporan Laba Rugi Komprehensif (Income Statement)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Berdasarkan biaya bahan baku standar (BOM) dan biaya operasional
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Margin: {financeData?.summary?.grossMarginPercent || 0}%
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      {/* Pendapatan Kotor */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                        <span className="font-bold font-sans text-slate-700">1. Pendapatan Penjualan Bersih (Gross Revenue)</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatRupiah(financeData?.summary?.totalRevenue || 0)}
                        </span>
                      </div>

                      {/* HPP Bahan Baku */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 text-rose-800">
                        <span className="font-bold font-sans">2. Harga Pokok Penjualan (HPP BOM Resep Bahan Baku)</span>
                        <span className="font-bold text-sm">
                          - {formatRupiah(financeData?.summary?.totalHPP || 0)}
                        </span>
                      </div>

                      {/* Laba Kotor */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-900">
                        <span className="font-bold font-sans">3. Laba Kotor Usaha (Gross Profit)</span>
                        <span className="font-black text-base">
                          {formatRupiah(financeData?.summary?.grossProfit || 0)}
                        </span>
                      </div>

                      {/* Beban Operasional */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 text-amber-900">
                        <span className="font-bold font-sans">4. Beban &amp; Pengeluaran Operasional Toko</span>
                        <span className="font-bold text-sm">
                          - {formatRupiah(financeData?.summary?.totalExpenses || 0)}
                        </span>
                      </div>

                      {/* Laba Bersih */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 text-white">
                        <div>
                          <p className="font-black font-sans text-sm">5. Laba Bersih Berjalan (Net Profit)</p>
                          <p className="text-[10px] text-slate-400 font-sans font-normal">
                            Pendapatan setelah dikurangi HPP bahan dan biaya operasional
                          </p>
                        </div>
                        <span className="font-black text-xl text-emerald-400">
                          {formatRupiah(financeData?.summary?.netProfit || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown HPP per Produk Minuman */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="font-black text-sm text-slate-900">
                        Breakdown HPP BOM &amp; Margin per Menu Minuman
                      </h4>
                      <span className="text-xs text-slate-400">Dihitung otomatis dari resep BOM</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="py-2.5 px-3">Menu</th>
                            <th className="py-2.5 px-3">Kategori</th>
                            <th className="py-2.5 px-3 text-center">Volume</th>
                            <th className="py-2.5 px-3 text-right">Omset</th>
                            <th className="py-2.5 px-3 text-right">Total HPP</th>
                            <th className="py-2.5 px-3 text-right">Laba Kotor</th>
                            <th className="py-2.5 px-3 text-center">Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {!financeData?.productSales || financeData.productSales.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                                Belum ada data penjualan menu
                              </td>
                            </tr>
                          ) : (
                            financeData.productSales.map((p: any) => (
                              <tr key={p.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-3 font-bold font-sans text-slate-900">{p.name}</td>
                                <td className="py-2.5 px-3 font-sans text-slate-500 capitalize">{p.category}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700">{p.quantity} cup</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRupiah(p.revenue)}</td>
                                <td className="py-2.5 px-3 text-right text-rose-600">{formatRupiah(p.hpp)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatRupiah(p.grossProfit)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800">
                                    {p.marginPercent}%
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE: NERACA KEUANGAN (BALANCE SHEET) */}
              {financeModule === "balancesheet" && (
                <div className="space-y-6">
                  {/* Balance Verification Pill */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-emerald-700" />
                      <div>
                        <h4 className="font-extrabold text-sm text-emerald-900">
                          Neraca Keuangan Konsolidasi (Balance Sheet)
                        </h4>
                        <p className="text-xs text-emerald-700">
                          Persamaan Akuntansi Dasar: Aktiva (Aset) = Kewajiban (Liabilitas) + Ekuitas (Modal)
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                      <Check className="w-3.5 h-3.5" /> 100% Balanced
                    </span>
                  </div>

                  {/* 2-Column Neraca Grid: Aktiva vs Pasiva */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* AKTIVA / ASET */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <span>🏛️</span> AKTIVA (ASET USAHA)
                        </h4>
                        <span className="text-xs font-mono font-bold text-emerald-700">Aset Lancar</span>
                      </div>

                      <div className="space-y-3 text-xs font-mono">
                        <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold font-sans text-slate-800">Kas Fisik Tunai (Cash on Hand)</p>
                            <p className="text-[10px] text-slate-400 font-sans">Penerimaan transaksi tunai di kasir</p>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatRupiah(financeData?.neraca?.aktiva?.kasTunai || 0)}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold font-sans text-slate-800">Kas Bank QRIS Settlement</p>
                            <p className="text-[10px] text-slate-400 font-sans">Saldo rekening penerimaan QRIS</p>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatRupiah(financeData?.neraca?.aktiva?.kasBankQRIS || 0)}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold font-sans text-slate-800">Persediaan Bahan Baku Fisik</p>
                            <p className="text-[10px] text-slate-400 font-sans">Valuasi stok cup, sirup &amp; premix di kedai</p>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatRupiah(financeData?.neraca?.aktiva?.persediaanBahanBaku || 0)}
                          </span>
                        </div>

                        {/* Total Aktiva */}
                        <div className="p-4 bg-emerald-600 text-white rounded-xl flex items-center justify-between text-sm mt-4">
                          <span className="font-bold font-sans">TOTAL AKTIVA (ASET)</span>
                          <span className="font-black text-base">
                            {formatRupiah(financeData?.neraca?.totalAktiva || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PASIVA (KEWAJIBAN & EKUITAS) */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <span>⚖️</span> PASIVA (KEWAJIBAN &amp; EKUITAS)
                        </h4>
                        <span className="text-xs font-mono font-bold text-indigo-700">Liabilitas + Modal</span>
                      </div>

                      <div className="space-y-3 text-xs font-mono">
                        {/* Kewajiban */}
                        <div className="p-3 bg-rose-50/60 rounded-xl flex items-center justify-between text-rose-900">
                          <div>
                            <p className="font-bold font-sans">Hutang Selisih Cup Karyawan</p>
                            <p className="text-[10px] text-rose-600 font-sans">Piutang/kewajiban potongan gaji shift</p>
                          </div>
                          <span className="font-bold">
                            {formatRupiah(financeData?.neraca?.pasiva?.kewajibanLancar?.hutangSelisihCup || 0)}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold font-sans text-slate-800">Beban Operasional Terutang</p>
                            <p className="text-[10px] text-slate-400 font-sans">Biaya operasional berjalan</p>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatRupiah(financeData?.neraca?.pasiva?.kewajibanLancar?.bebanOperasionalTerutang || 0)}
                          </span>
                        </div>

                        {/* Ekuitas */}
                        <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold font-sans text-slate-800">Modal Disetor Awal Booth</p>
                            <p className="text-[10px] text-slate-400 font-sans">Estimasi modal perlengkapan awal booth</p>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatRupiah(financeData?.neraca?.pasiva?.ekuitas?.modalDisetor || 0)}
                          </span>
                        </div>

                        <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-between text-emerald-900">
                          <div>
                            <p className="font-bold font-sans">Laba Ditahan (Retained Earnings)</p>
                            <p className="text-[10px] text-emerald-700 font-sans">Akumulasi keuntungan bersih berjalan</p>
                          </div>
                          <span className="font-bold">
                            {formatRupiah(financeData?.neraca?.pasiva?.ekuitas?.labaDitahan || 0)}
                          </span>
                        </div>

                        {/* Total Pasiva */}
                        <div className="p-4 bg-indigo-700 text-white rounded-xl flex items-center justify-between text-sm mt-4">
                          <span className="font-bold font-sans">TOTAL PASIVA (KEWAJIBAN + EKUITAS)</span>
                          <span className="font-black text-base">
                            {formatRupiah(financeData?.neraca?.totalPasiva || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE: CATATAN BIAYA & BEBAN (EXPENSES) */}
              {financeModule === "expenses" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-rose-600" />
                          Log Pengeluaran &amp; Biaya Operasional
                        </h4>
                        <p className="text-xs text-slate-500">
                          Total beban terdata: {formatRupiah(financeData?.summary?.totalExpenses || 0)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {financeData?.expenses && financeData.expenses.length > 0 && (
                          <button
                            onClick={handleClearAllExpenses}
                            className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition"
                            title="Hapus seluruh catatan pengeluaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Semua Biaya</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setExpenseMessage(null);
                            setIsAddExpenseOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Catat Pengeluaran Baru</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="py-2.5 px-3">Tanggal</th>
                            <th className="py-2.5 px-3">Kedai</th>
                            <th className="py-2.5 px-3">Kategori</th>
                            <th className="py-2.5 px-3">Deskripsi Biaya</th>
                            <th className="py-2.5 px-3 text-right">Nominal</th>
                            <th className="py-2.5 px-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {!financeData?.expenses || financeData.expenses.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                Belum ada pengeluaran yang dicatat di periode ini
                              </td>
                            </tr>
                          ) : (
                            financeData.expenses.map((e: any) => (
                              <tr key={e.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                  {new Date(e.date).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-800">
                                  {e.outlet?.name || "Semua Kedai"}
                                </td>
                                <td className="py-2.5 px-3 capitalize">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {e.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-800">{e.description}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                                  {formatRupiah(e.amount)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleDeleteExpense(e.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Hapus Biaya"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE: AUDIT TRANSAKSI & LEDGER */}
              {financeModule === "ledger" && (
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        Audit Buku Transaksi Penjualan
                      </h4>
                      <p className="text-xs text-slate-500">
                        {financeData?.transactions?.length || 0} transaksi tercatat di periode ini
                      </p>
                    </div>

                    <button
                      onClick={exportFinancialCSV}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">No. Nota</th>
                          <th className="py-2.5 px-3">Kedai</th>
                          <th className="py-2.5 px-3">Item Pesanan</th>
                          <th className="py-2.5 px-3">Metode</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {!financeData?.transactions || financeData.transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                              Tidak ada transaksi yang sesuai filter
                            </td>
                          </tr>
                        ) : (
                          financeData.transactions
                            .filter(
                              (t: any) =>
                                !financeSearch ||
                                t.orderCode.toLowerCase().includes(financeSearch.toLowerCase()) ||
                                t.outletName.toLowerCase().includes(financeSearch.toLowerCase()) ||
                                (t.itemsSummary &&
                                  t.itemsSummary.toLowerCase().includes(financeSearch.toLowerCase()))
                            )
                            .map((t: any) => (
                              <tr key={t.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap font-mono">
                                  {new Date(t.createdAt).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}{" "}
                                  {new Date(t.createdAt).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{t.orderCode}</td>
                                <td className="py-2.5 px-3 font-sans text-slate-700">{t.outletName}</td>
                                <td
                                  className="py-2.5 px-3 font-sans text-slate-600 max-w-xs truncate"
                                  title={t.itemsSummary}
                                >
                                  {t.itemsSummary}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.paymentMethod === "QRIS"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-900"
                                    }`}
                                  >
                                    {t.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                  {formatRupiah(t.totalAmount)}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: STOK BAHAN BAKU & AUDIT CLOSING (CORE)                  */}
        {/* ============================================================== */}
        {activeAdminTab === "stocks" && (
          <div className="space-y-6">
            {/* Sisa Stok Bahan Baku Mandiri per Kedai */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-700" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Sisa Stok Bahan Baku Mandiri per Kedai
                    </h3>
                    <p className="text-xs text-slate-500">
                      Klik kotak bahan baku untuk ubah langsung dari angka 0 atau klik Opname Stok
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Filter Kedai:</span>
                  <select
                    value={selectedOutletFilter}
                    onChange={(e) => {
                      setSelectedOutletFilter(e.target.value);
                      refreshData(e.target.value);
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="all">Semua Kedai (Konsolidasi)</option>
                    {data?.outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid Kartu Stok Kedai */}
              <div className="space-y-6">
                {data?.outlets
                  .filter((o) => selectedOutletFilter === "all" || o.id === selectedOutletFilter)
                  .map((outlet) => {
                    const outletStocks = (data?.boothStocks || []).filter((bs) => bs.outlet.id === outlet.id);

                    return (
                      <div key={outlet.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-emerald-700" />
                            <h4 className="font-extrabold text-sm text-slate-900">{outlet.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                              {outlet.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Tombol Uang Cash yang Dibawa (Modal Kas Awal) */}
                            <button
                              onClick={() => openCashFloatModal(outlet)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer group"
                              title="Ubah Uang Cash yang Dibawa (Modal Kas Awal) untuk kedai ini"
                            >
                              <Banknote className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition" />
                              <span>Cash Dibawa: <strong>Rp {(outlet.initial_cash || 0).toLocaleString("id-ID")}</strong></span>
                              <Edit3 className="w-3 h-3 text-amber-600 opacity-60 group-hover:opacity-100" />
                            </button>

                            <button
                              onClick={() => openOpnameModal(outlet)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Opname Stok</span>
                            </button>

                            <button
                              onClick={() => handleZeroAll(outlet.id, outlet.name)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Set 0</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {outletStocks.map((stock) => (
                            <div
                              key={stock.id}
                              onClick={() => openSingleStockEdit(outlet, stock)}
                              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm cursor-pointer transition flex items-center justify-between group"
                              title="Klik untuk ubah stok ini"
                            >
                              <div>
                                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]">
                                  {stock.raw_material.name}
                                </p>
                                <p className="font-mono font-black text-sm text-slate-900 mt-0.5">
                                  {Math.round(stock.current_stock).toLocaleString("id-ID")}{" "}
                                  <span className="text-[10px] font-normal text-slate-400">
                                    {stock.raw_material.unit}
                                  </span>
                                </p>
                              </div>
                              <Edit3 className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Log Rekonsiliasi End-of-Day Multi-Kedai */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Log Rekonsiliasi End-of-Day Multi-Kedai (Blind Count)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audit selisih fisik vs sistem: Merah (Zero Tolerance Cup), Kuning (Waste cairan &gt; 2%)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">Tanggal / Waktu</th>
                      <th className="py-2.5 px-3">Kedai</th>
                      <th className="py-2.5 px-3">Fisik Cup (Reg / Jumbo)</th>
                      <th className="py-2.5 px-3">Sistem (Reg / Jumbo)</th>
                      <th className="py-2.5 px-3">Sisa Teh (Fisik / Sist)</th>
                      <th className="py-2.5 px-3">Sisa Gula Cair (Fisik / Sist)</th>
                      <th className="py-2.5 px-3">Selisih Cup</th>
                      <th className="py-2.5 px-3">Potongan Gaji</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!data?.closings || data.closings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Belum ada data rekonsiliasi closing
                        </td>
                      </tr>
                    ) : (
                      data.closings.map((c) => {
                        const isRed = c.theft_flag;
                        const isYellow = c.waste_flag && !isRed;

                        return (
                          <tr
                            key={c.id}
                            className={`font-mono transition ${
                              isRed ? "bg-rose-50/70" : isYellow ? "bg-amber-50/60" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {new Date(c.created_at).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-2.5 px-3 font-sans font-bold text-slate-800">{c.outlet?.name}</td>
                            <td className="py-2.5 px-3">
                              {c.actual_cup_reg} / {c.actual_cup_jumbo}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {c.system_expected_cup_reg} / {c.system_expected_cup_jumbo}
                            </td>
                            <td className="py-2.5 px-3">
                              {c.actual_liquid_ml} pcs <span className="text-slate-400">/ {c.system_expected_liquid_ml} pcs</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <strong>{Math.round(c.actual_sugar_ml ?? 0).toLocaleString("id-ID")} ml</strong>{" "}
                              <span className="text-slate-400">/ {Math.round(c.system_expected_sugar_ml ?? 0).toLocaleString("id-ID")} ml</span>
                              {c.discrepancy_sugar_ml !== undefined && c.discrepancy_sugar_ml !== 0 && (
                                <span className={`ml-1 text-[10px] font-bold ${c.discrepancy_sugar_ml < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                  ({c.discrepancy_sugar_ml > 0 ? `+${Math.round(c.discrepancy_sugar_ml)}` : Math.round(c.discrepancy_sugar_ml)} ml)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={c.discrepancy_cup < 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                                {c.discrepancy_cup > 0 ? `+${c.discrepancy_cup}` : c.discrepancy_cup}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-rose-700">
                              {c.employee_debt > 0 ? formatRupiah(c.employee_debt) : "-"}
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              {isRed ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                                  HUTANG CUP
                                </span>
                              ) : isYellow ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                                  BOROS CAIRAN
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  MATCHED
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MANAJEMEN KEDAI (TAMBAH / KURANGI KEDAI)                */}
        {/* ============================================================== */}
        {activeAdminTab === "outlets" && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-700" />
                  Manajemen Cabang Kedai
                </h3>
                <p className="text-xs text-slate-500">
                  Tambah kedai baru secara dinamis atau nonaktifkan cabang yang tutup
                </p>
              </div>

              <button
                onClick={() => {
                  setNewOutletForm({ name: "", code: "", address: "", target_cups: 100, initial_cash: 0 });
                  setOutletMessage(null);
                  setIsAddOutletOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Kedai Baru</span>
              </button>
            </div>

            {/* List Kedai Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outletsList.map((outlet) => (
                <div
                  key={outlet.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    outlet.active_status !== false
                      ? "bg-slate-50/70 border-slate-200 hover:border-emerald-300"
                      : "bg-slate-100 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                        {outlet.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          outlet.active_status !== false
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {outlet.active_status !== false ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900">{outlet.name}</h4>
                    <p className="text-xs text-slate-500">{outlet.address || "Belum ada alamat terdaftar"}</p>
                    
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-850 border border-sky-200 text-xs font-bold">
                        <Target className="w-3.5 h-3.5 text-sky-600" />
                        <span>Target: <strong>{outlet.target_cups || 100} cup / hari</strong></span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold">
                        <Banknote className="w-3.5 h-3.5 text-amber-700" />
                        <span>Cash Dibawa: <strong>Rp {(outlet.initial_cash || 0).toLocaleString("id-ID")}</strong></span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {outlet._count?.transactions || 0} Transaksi
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditOutlet(outlet)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1 transition"
                        title="Edit data cabang kedai"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold flex items-center gap-1 transition"
                        title="Hapus / nonaktifkan kedai"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MASTER KATALOG MENU (PUSAT TAMBAH & HAPUS MENU)         */}
        {/* ============================================================== */}
        {activeAdminTab === "master_menus" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-emerald-700" />
                    Katalog Master Menu Pusat (Central Kitchen)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftar seluruh menu resmi Es Teh Poci. Tambah varian baru atau hapus menu dari katalog pusat di sini.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMenuMessage(null);
                    setIsAddMenuOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Menu Baru</span>
                </button>
              </div>

              {/* Master Menu Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedAdminMenus.map((item) => {
                  const { baseName, category, reguler, jumbo, single, allProducts } = item;
                  const allProductIds = allProducts.map((p) => p.id);

                  // Hitung kedai yang menjual menu ini
                  let soldInOutletsCount = 0;
                  if (data?.outlets) {
                    for (const o of data.outlets) {
                      const regOp = reguler?.outletProducts?.find((x: any) => x.outlet_id === o.id);
                      const jumOp = jumbo?.outletProducts?.find((x: any) => x.outlet_id === o.id);
                      const singleOp = single?.outletProducts?.find((x: any) => x.outlet_id === o.id);
                      const isAvail =
                        (reguler && (regOp ? regOp.is_available : true)) ||
                        (jumbo && (jumOp ? jumOp.is_available : true)) ||
                        (single && (singleOp ? singleOp.is_available : true));
                      if (isAvail) soldInOutletsCount++;
                    }
                  }

                  return (
                    <div
                      key={baseName}
                      className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs transition flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              category === "original"
                                ? "bg-emerald-100 text-emerald-800"
                                : category === "milky"
                                ? "bg-amber-100 text-amber-800"
                                : category === "topping"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {category === "original"
                              ? "Original Poci"
                              : category === "milky"
                              ? "Milky Fusion"
                              : category === "topping"
                              ? "Topping"
                              : "Fruit Tea"}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditMenu(item)}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition"
                              title={`Edit menu "${baseName}"`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenuGroup(baseName, allProductIds)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                              title={`Hapus / Nonaktifkan menu "${baseName}" dari seluruh sistem`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{baseName}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Aktif di {soldInOutletsCount} dari {data?.outlets?.length || 0} cabang
                          </p>
                        </div>
                      </div>

                      {/* Detail Ukuran & Resep BOM */}
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        {reguler && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">🌿 Porsi Reguler</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-emerald-800">
                                  {formatRupiah(reguler.price)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMenu(reguler.id, reguler.name)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title={`Hapus Porsi Reguler untuk ${baseName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {reguler.recipes && reguler.recipes.length > 0 && (
                              <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">
                                BOM: {reguler.recipes.map((r: any) => `${r.quantity} ${r.raw_material?.name}`).join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {jumbo && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">🥤 Porsi Jumbo</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-emerald-800">
                                  {formatRupiah(jumbo.price)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMenu(jumbo.id, jumbo.name)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title={`Hapus Porsi Jumbo untuk ${baseName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {jumbo.recipes && jumbo.recipes.length > 0 && (
                              <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">
                                BOM: {jumbo.recipes.map((r: any) => `${r.quantity} ${r.raw_material?.name}`).join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {single && !reguler && !jumbo && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">Standar / Topping</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-emerald-800">
                                  {formatRupiah(single.price)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMenu(single.id, single.name)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title={`Hapus menu ${single.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {single.recipes && single.recipes.length > 0 && (
                              <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">
                                BOM: {single.recipes.map((r: any) => `${r.quantity} ${r.raw_material?.name}`).join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: MANAGEMENT MENU PER KEDAI (ACTIVATE / DEACTIVATE)       */}
        {/* ============================================================== */}
        {activeAdminTab === "outlet_menus" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-700" />
                  Ketersediaan Menu per Cabang Kedai
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih kedai di bawah ini, lalu klik tombol <strong>Aktifkan / Nonaktifkan</strong> untuk menambah atau mencopot menu di kedai tersebut.
                </p>
              </div>

              {/* Selector Kedai (Visual Tabs / Pills Tanpa Dropdown) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pilih Cabang Kedai:
                </span>
                <div className="flex flex-wrap gap-2">
                  {data?.outlets.map((o) => {
                    const isSelected = (menuTargetOutlet || data.outlets[0]?.id) === o.id;
                    const activeCount = groupedAdminMenus.filter((m) => {
                      const regOp = m.reguler?.outletProducts?.find((x: any) => x.outlet_id === o.id);
                      const jumOp = m.jumbo?.outletProducts?.find((x: any) => x.outlet_id === o.id);
                      const singleOp = m.single?.outletProducts?.find((x: any) => x.outlet_id === o.id);
                      return (
                        (m.reguler && (regOp ? regOp.is_available : true)) ||
                        (m.jumbo && (jumOp ? jumOp.is_available : true)) ||
                        (m.single && (singleOp ? singleOp.is_available : true))
                      );
                    }).length;

                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          menuTargetOutletRef.current = o.id;
                          setMenuTargetOutlet(o.id);
                          try {
                            localStorage.setItem("poci_admin_menu_outlet", o.id);
                          } catch {}
                        }}
                        className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition shadow-xs cursor-pointer ${
                          isSelected
                            ? "bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/40"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <Store className={`w-4 h-4 ${isSelected ? "text-amber-300" : "text-emerald-700"}`} />
                        <span>{o.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isSelected ? "bg-emerald-800 text-emerald-100" : "bg-white text-slate-700 border border-slate-200"
                          }`}
                        >
                          {activeCount} menu aktif
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid Menu untuk Kedai Terpilih */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {groupedAdminMenus.map((item) => {
                  const { baseName, category, reguler, jumbo, single, allProducts } = item;
                  const currentOutletId = menuTargetOutlet || data?.outlets[0]?.id || "";

                  const regOp = reguler?.outletProducts?.find((x: any) => x.outlet_id === currentOutletId);
                  const isRegAvail = regOp ? regOp.is_available : true;

                  const jumOp = jumbo?.outletProducts?.find((x: any) => x.outlet_id === currentOutletId);
                  const isJumAvail = jumOp ? jumOp.is_available : true;

                  const singleOp = single?.outletProducts?.find((x: any) => x.outlet_id === currentOutletId);
                  const isSingleAvail = singleOp ? singleOp.is_available : true;

                  const isAnyAvail = (reguler && isRegAvail) || (jumbo && isJumAvail) || (single && isSingleAvail);
                  const allProductIds = allProducts.map((p) => p.id);

                  return (
                    <div
                      key={baseName}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        isAnyAvail
                          ? "bg-white border-emerald-300 shadow-xs"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      {/* Info Menu */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              category === "original"
                                ? "bg-emerald-100 text-emerald-800"
                                : category === "milky"
                                ? "bg-amber-100 text-amber-800"
                                : category === "topping"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {category === "original"
                              ? "Original Poci"
                              : category === "milky"
                              ? "Milky Fusion"
                              : category === "topping"
                              ? "Topping"
                              : "Fruit Tea"}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isAnyAvail
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {isAnyAvail ? "Aktif di Kedai" : "Nonaktif di Kedai"}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm text-slate-900">{baseName}</h4>
                      </div>

                      {/* Tombol Utama: Activate / Deactivate (Add / Remove) */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                        {isAnyAvail ? (
                          <button
                            type="button"
                            onClick={() => handleToggleOutletMenuGroup(currentOutletId, allProductIds, true)}
                            className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-rose-600 text-white transition flex items-center justify-center gap-1.5 shadow-xs group cursor-pointer"
                          >
                            <Check className="w-4 h-4 group-hover:hidden" />
                            <X className="w-4 h-4 hidden group-hover:inline" />
                            <span className="group-hover:hidden">Aktif di Kedai (Klik utk Nonaktif)</span>
                            <span className="hidden group-hover:inline">✕ Nonaktifkan dari Kedai</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleOutletMenuGroup(currentOutletId, allProductIds, false)}
                            className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-white hover:bg-emerald-600 text-slate-700 hover:text-white border-2 border-slate-300 hover:border-emerald-600 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                            <span>+ Tambahkan Menu ke Kedai Ini</span>
                          </button>
                        )}

                        {/* Rincian Ukuran Khusus */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          {reguler && (
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-800 block text-[11px]">Reguler</span>
                                <span className="font-mono text-[10px] text-emerald-800 font-bold">
                                  {formatRupiah(reguler.price)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleOutletMenu(currentOutletId, reguler.id, isRegAvail)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                  isRegAvail
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                                }`}
                              >
                                {isRegAvail ? "On" : "Off"}
                              </button>
                            </div>
                          )}

                          {jumbo && (
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-800 block text-[11px]">Jumbo</span>
                                <span className="font-mono text-[10px] text-emerald-800 font-bold">
                                  {formatRupiah(jumbo.price)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleOutletMenu(currentOutletId, jumbo.id, isJumAvail)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                  isJumAvail
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                                }`}
                              >
                                {isJumAvail ? "On" : "Off"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: TAMBAH KEDAI BARU                                       */}
      {/* ============================================================== */}
      {isAddOutletOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-700" />
                Tambah Cabang Kedai Baru
              </h3>
              <button
                onClick={() => setIsAddOutletOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOutlet} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Kedai / Lokasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kedai #3 - SPBU Ahmad Yani"
                  value={newOutletForm.name}
                  onChange={(e) => setNewOutletForm({ ...newOutletForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kode Kedai (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: OUT-03 (otomatis jika dikosongkan)"
                  value={newOutletForm.code}
                  onChange={(e) => setNewOutletForm({ ...newOutletForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Penjualan Cup / Hari (Harian)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Contoh: 100"
                  value={newOutletForm.target_cups}
                  onChange={(e) => setNewOutletForm({ ...newOutletForm, target_cups: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Target harian ini akan menjadi acuan motivasi kasir dan evaluasi kinerja kedai.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Uang Cash yang Dibawa (Modal Kas Awal)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Contoh: 100000"
                    value={newOutletForm.initial_cash || ""}
                    onChange={(e) => setNewOutletForm({ ...newOutletForm, initial_cash: Number(e.target.value) || 0 })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Uang kembalian / modal kas awal yang dibawa kasir saat buka kedai. Otomatis masuk perhitungan laci POS.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Ahmad Yani No. 45, Teras Indomaret"
                  value={newOutletForm.address}
                  onChange={(e) => setNewOutletForm({ ...newOutletForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <p className="font-bold">Otomatisasi Sistem:</p>
                <p>&bull; 16 Bahan Baku (BOM) otomatis diinisialisasi 0 untuk kedai ini.</p>
                <p>&bull; Seluruh katalog menu resmi langsung dihubungkan ke kedai ini.</p>
              </div>

              {outletMessage && (
                <p className="text-xs font-bold text-center">{outletMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOutletOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={outletLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  {outletLoading ? "Menyimpan..." : "Simpan Kedai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT CABANG KEDAI                                       */}
      {/* ============================================================== */}
      {isEditOutletOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                Edit Data Cabang Kedai
              </h3>
              <button
                onClick={() => setIsEditOutletOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateOutlet} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Kedai / Lokasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kedai #1 - Indomaret Sudirman"
                  value={editOutletForm.name}
                  onChange={(e) => setEditOutletForm({ ...editOutletForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kode Kedai (Unik) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: OUT-01"
                  value={editOutletForm.code}
                  onChange={(e) => setEditOutletForm({ ...editOutletForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Penjualan Cup / Hari (Harian) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Contoh: 100"
                  value={editOutletForm.target_cups}
                  onChange={(e) => setEditOutletForm({ ...editOutletForm, target_cups: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Target harian ini akan menjadi acuan motivasi kasir dan evaluasi kinerja kedai.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Uang Cash yang Dibawa (Modal Kas Awal)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Contoh: 100000"
                    value={editOutletForm.initial_cash || 0}
                    onChange={(e) => setEditOutletForm({ ...editOutletForm, initial_cash: Number(e.target.value) || 0 })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Uang modal kas awal / float laci kasir. Perubahan ini langsung disinkronkan ke kasir POS.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Ahmad Yani No. 45, Teras Indomaret"
                  value={editOutletForm.address}
                  onChange={(e) => setEditOutletForm({ ...editOutletForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Operasional Cabang */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Status Operasional Cabang
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOutletForm({ ...editOutletForm, active_status: true })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      editOutletForm.active_status
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Aktif (Buka)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditOutletForm({ ...editOutletForm, active_status: false })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      !editOutletForm.active_status
                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Nonaktif (Tutup)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {editOutletForm.active_status
                    ? "Cabang aktif dapat melayani kasir POS & stok barang."
                    : "Cabang disembunyikan dari POS dan tidak menerima pesanan baru."}
                </p>
              </div>

              {editOutletMessage && (
                <p className="text-xs font-bold text-center">{editOutletMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOutletOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editOutletLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {editOutletLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: GANTI PIN KEAMANAN ADMIN                                */}
      {/* ============================================================== */}
      {isChangePinOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                Ganti PIN Keamanan Admin
              </h3>
              <button
                onClick={() => setIsChangePinOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Ubah PIN login Owner Portal untuk menjaga keamanan data finansial dan operasional kedai.
            </p>

            <form onSubmit={handleChangePin} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  PIN Lama / Saat Ini <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder={isPinDefault ? "Masukkan PIN saat ini (default: 1234)" : "Masukkan PIN saat ini"}
                  value={changePinForm.currentPin}
                  onChange={(e) => setChangePinForm({ ...changePinForm, currentPin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  PIN Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 4 digit angka / karakter"
                  value={changePinForm.newPin}
                  onChange={(e) => setChangePinForm({ ...changePinForm, newPin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Konfirmasi PIN Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ulangi PIN baru"
                  value={changePinForm.confirmPin}
                  onChange={(e) => setChangePinForm({ ...changePinForm, confirmPin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {changePinMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    changePinMessage.isError
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {changePinMessage.text}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePinOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={changePinLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {changePinLoading ? "Menyimpan..." : "Simpan PIN Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: BACKUP & UNDUH DATABASE SQLITE                          */}
      {/* ============================================================== */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Backup &amp; Arsip Database SQLite
              </h3>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-3 space-y-3 overflow-y-auto pr-1 flex-1">
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Sistem Pencadangan Otomatis</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Snapshot database aman dibuat ke folder <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">/backups</code>.
                  Maksimal 30 file arsip terbaru disimpan secara otomatis.
                </p>
              </div>

              {backupMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold text-center">
                  {backupMessage}
                </div>
              )}

              {/* Action: Backup Now */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerBackup}
                  disabled={backupLoading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${backupLoading ? "animate-spin" : ""}`} />
                  <span>{backupLoading ? "Membuat Snapshot..." : "📸 Backup Sekarang"}</span>
                </button>

                {backupList.length > 0 && (
                  <a
                    href={`/api/admin/backup?download=${encodeURIComponent(backupList[0].filename)}`}
                    download
                    className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Terakhir</span>
                  </a>
                )}
              </div>

              {/* Daftar Histori File Backup */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Daftar File Backup ({backupList.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tersimpan di server lokal</span>
                </h4>

                {backupList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                    Belum ada riwayat backup tersimpan.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {backupList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100 transition"
                      >
                        <div className="truncate mr-2">
                          <p className="font-mono font-bold text-[11px] text-slate-800 truncate">
                            {item.filename}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(item.timestamp).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}{" "}
                            &bull; {item.sizeReadable || (item.sizeBytes ? (item.sizeBytes / 1024).toFixed(1) + " KB" : "-")} &bull;{" "}
                            <span className="font-semibold text-slate-600">
                              {item.trigger === "scheduled_cron" ? "⏰ Terjadwal (Cron)" : "👤 Manual"}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTriggerRestore(item.filename)}
                            disabled={backupLoading}
                            className="px-2.5 py-1 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition disabled:opacity-50"
                            title="Pulihkan database dari file backup ini"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>

                          <a
                            href={`/api/admin/backup?download=${encodeURIComponent(item.filename)}`}
                            download
                            className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 text-blue-600 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                            title="Unduh file SQLite ini"
                          >
                            <Download className="w-3 h-3" />
                            <span>Unduh</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="py-2 px-5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TAMBAH MENU BARU (DUAL REGULER & JUMBO LANGSUNG)        */}
      {/* ============================================================== */}
      {isAddMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                Tambah Menu Baru &amp; Resep BOM
              </h3>
              <button
                onClick={() => setIsAddMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMenu} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Varian Menu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Alpukat Iced Tea"
                    value={newMenuForm.baseName}
                    onChange={(e) => setNewMenuForm({ ...newMenuForm, baseName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Tidak perlu ketik (Reguler) / (Jumbo), sistem otomatis membuatnya.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={newMenuForm.category}
                    onChange={(e) => setNewMenuForm({ ...newMenuForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="fruity">Fruit Series</option>
                    <option value="original">Original &amp; Aroma</option>
                    <option value="milky">Milky &amp; Choco</option>
                    <option value="topping">Topping Tambahan</option>
                  </select>
                </div>
              </div>

              {/* Pilihan Sirup / Perasa Utama */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Bahan Sirup / Bubuk Perasa (BOM):
                </label>
                <select
                  value={newMenuForm.flavorMaterialId}
                  onChange={(e) => setNewMenuForm({ ...newMenuForm, flavorMaterialId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                >
                  <option value="">Tanpa Sirup/Bubuk (Hanya Teh Poci Murni)</option>
                  {menuMaterials
                    .filter((m) => !m.name.toLowerCase().includes("cup") && !m.name.toLowerCase().includes("tea premix") && !m.name.toLowerCase().includes("kantong teh"))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                </select>
              </div>

              {/* DUAL UKURAN LANGSUNG: REGULER & JUMBO */}
              {newMenuForm.category !== "topping" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Panel Reguler */}
                  <div className={`p-3.5 rounded-2xl border transition ${
                    newMenuForm.enableReguler ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-slate-200 opacity-60"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 mb-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newMenuForm.enableReguler}
                          onChange={(e) => setNewMenuForm({ ...newMenuForm, enableReguler: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className="font-extrabold text-xs text-slate-900">🌿 Porsi Reguler</span>
                      </label>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                        Cup Reguler (1 pcs)
                      </span>
                    </div>

                    {newMenuForm.enableReguler && (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                            Harga Jual Reguler (Rp) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required={newMenuForm.enableReguler}
                            placeholder="7000"
                            value={newMenuForm.regulerPrice}
                            onChange={(e) => setNewMenuForm({ ...newMenuForm, regulerPrice: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Liquid Teh (ml):</label>
                            <input
                              type="number"
                              value={newMenuForm.regulerTeaMl}
                              onChange={(e) => setNewMenuForm({ ...newMenuForm, regulerTeaMl: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Sachet Rasa (sachet):</label>
                            <input
                              type="number"
                              disabled={!newMenuForm.flavorMaterialId}
                              value={newMenuForm.regulerFlavorQty}
                              onChange={(e) => setNewMenuForm({ ...newMenuForm, regulerFlavorQty: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel Jumbo */}
                  <div className={`p-3.5 rounded-2xl border transition ${
                    newMenuForm.enableJumbo ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-slate-200 opacity-60"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 mb-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newMenuForm.enableJumbo}
                          onChange={(e) => setNewMenuForm({ ...newMenuForm, enableJumbo: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className="font-extrabold text-xs text-slate-900">🥤 Porsi Jumbo</span>
                      </label>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                        Cup Jumbo (1 pcs)
                      </span>
                    </div>

                    {newMenuForm.enableJumbo && (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                            Harga Jual Jumbo (Rp) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required={newMenuForm.enableJumbo}
                            placeholder="9000"
                            value={newMenuForm.jumboPrice}
                            onChange={(e) => setNewMenuForm({ ...newMenuForm, jumboPrice: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Liquid Teh (ml):</label>
                            <input
                              type="number"
                              value={newMenuForm.jumboTeaMl}
                              onChange={(e) => setNewMenuForm({ ...newMenuForm, jumboTeaMl: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Sachet Rasa (sachet):</label>
                            <input
                              type="number"
                              disabled={!newMenuForm.flavorMaterialId}
                              value={newMenuForm.jumboFlavorQty}
                              onChange={(e) => setNewMenuForm({ ...newMenuForm, jumboFlavorQty: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Topping Single Box */
                <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-3">
                  <h4 className="font-extrabold text-xs text-purple-900">Porsi Topping</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Harga Jual (Rp):</label>
                      <input
                        type="number"
                        required
                        value={newMenuForm.regulerPrice}
                        onChange={(e) => setNewMenuForm({ ...newMenuForm, regulerPrice: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Takaran (ml/g):</label>
                      <input
                        type="number"
                        value={newMenuForm.regulerFlavorQty}
                        onChange={(e) => setNewMenuForm({ ...newMenuForm, regulerFlavorQty: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {menuMessage && <p className="text-xs font-bold text-center">{menuMessage}</p>}

              <div className="flex gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddMenuOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={menuLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  {menuLoading ? "Menyimpan..." : "Simpan Menu (Reguler & Jumbo)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT MENU PUSAT                                          */}
      {/* ============================================================== */}
      {isEditMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                Edit Menu: {editMenuForm.oldBaseName}
              </h3>
              <button
                onClick={() => setIsEditMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMenu} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Varian Menu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editMenuForm.baseName}
                    onChange={(e) => setEditMenuForm({ ...editMenuForm, baseName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Tidak perlu ketik (Reguler) / (Jumbo).
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={editMenuForm.category}
                    onChange={(e) => setEditMenuForm({ ...editMenuForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="fruity">Fruit Series</option>
                    <option value="original">Original &amp; Aroma</option>
                    <option value="milky">Milky &amp; Choco</option>
                    <option value="topping">Topping Tambahan</option>
                  </select>
                </div>
              </div>

              {/* Pilihan Sachet / Perasa Rasa */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Bahan Sachet / Bubuk Perasa (BOM):
                </label>
                <select
                  value={editMenuForm.flavorMaterialId}
                  onChange={(e) => setEditMenuForm({ ...editMenuForm, flavorMaterialId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                >
                  <option value="">Tanpa Sachet Perasa (Hanya Teh Poci Murni)</option>
                  {menuMaterials
                    .filter((m) => !m.name.toLowerCase().includes("cup") && !m.name.toLowerCase().includes("tea premix") && !m.name.toLowerCase().includes("kantong teh"))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                </select>
              </div>

              {/* Ukuran Reguler & Jumbo atau Topping */}
              {editMenuForm.category !== "topping" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Panel Reguler */}
                  <div className={`p-3.5 rounded-2xl border transition ${
                    editMenuForm.enableReguler ? "bg-emerald-50/50 border-emerald-300" : "bg-rose-50/40 border-rose-200"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editMenuForm.enableReguler}
                          onChange={(e) => setEditMenuForm({ ...editMenuForm, enableReguler: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className={`font-extrabold text-xs ${editMenuForm.enableReguler ? "text-slate-900" : "text-rose-600 line-through"}`}>
                          🌿 Porsi Reguler
                        </span>
                      </label>
                      {editMenuForm.enableReguler ? (
                        <button
                          type="button"
                          onClick={() => setEditMenuForm({ ...editMenuForm, enableReguler: false })}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition"
                          title="Hapus / Nonaktifkan Porsi Reguler"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus Porsi
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">
                          Dihapus / Tidak Aktif
                        </span>
                      )}
                    </div>

                    {editMenuForm.enableReguler ? (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                            Harga Jual Reguler (Rp) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required={editMenuForm.enableReguler}
                            placeholder="7000"
                            value={editMenuForm.regulerPrice}
                            onChange={(e) => setEditMenuForm({ ...editMenuForm, regulerPrice: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-500 italic py-1">
                        Porsi reguler akan dihapus saat klik Simpan Perubahan.
                      </p>
                    )}
                  </div>

                  {/* Panel Jumbo */}
                  <div className={`p-3.5 rounded-2xl border transition ${
                    editMenuForm.enableJumbo ? "bg-emerald-50/50 border-emerald-300" : "bg-rose-50/40 border-rose-200"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editMenuForm.enableJumbo}
                          onChange={(e) => setEditMenuForm({ ...editMenuForm, enableJumbo: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className={`font-extrabold text-xs ${editMenuForm.enableJumbo ? "text-slate-900" : "text-rose-600 line-through"}`}>
                          🥤 Porsi Jumbo
                        </span>
                      </label>
                      {editMenuForm.enableJumbo ? (
                        <button
                          type="button"
                          onClick={() => setEditMenuForm({ ...editMenuForm, enableJumbo: false })}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition"
                          title="Hapus / Nonaktifkan Porsi Jumbo"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus Porsi
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">
                          Dihapus / Tidak Aktif
                        </span>
                      )}
                    </div>

                    {editMenuForm.enableJumbo ? (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                            Harga Jual Jumbo (Rp) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required={editMenuForm.enableJumbo}
                            placeholder="9000"
                            value={editMenuForm.jumboPrice}
                            onChange={(e) => setEditMenuForm({ ...editMenuForm, jumboPrice: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-500 italic py-1">
                        Porsi jumbo akan dihapus saat klik Simpan Perubahan.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Topping Single Box */
                <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-3">
                  <h4 className="font-extrabold text-xs text-purple-900">Porsi Topping</h4>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Harga Jual (Rp):</label>
                    <input
                      type="number"
                      required
                      value={editMenuForm.price}
                      onChange={(e) => setEditMenuForm({ ...editMenuForm, price: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {editMenuMessage && <p className="text-xs font-bold text-center">{editMenuMessage}</p>}

              <div className="flex gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditMenuOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editMenuLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  {editMenuLoading ? "Menyimpan..." : "Simpan Perubahan Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SINGLE STOCK EDIT                                       */}
      {/* ============================================================== */}
      {isSingleStockOpen && singleStockOutlet && singleStockMaterial && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{singleStockMaterial.name}</h3>
                <p className="text-[11px] text-emerald-700 font-semibold">{singleStockOutlet.name}</p>
              </div>
              <button
                onClick={() => setIsSingleStockOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSingleStockSubmit} className="space-y-4 my-4">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSingleStockMode("set")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    singleStockMode === "set" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  = Setel Nilai Riil
                </button>
                <button
                  type="button"
                  onClick={() => setSingleStockMode("add")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    singleStockMode === "add" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  + Tambah Stok
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {singleStockMode === "set" ? "Nilai Stok Riil Fisik:" : "Jumlah yang Ditambahkan:"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={singleStockValue}
                    onChange={(e) => setSingleStockValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400 font-mono">
                    {singleStockMaterial.unit}
                  </span>
                </div>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[0, 50, 100, 500, 1000, 5000, 40000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setSingleStockValue(String(chip))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg text-[11px] font-mono font-bold transition"
                  >
                    {chip === 0 ? "0 (Habis)" : chip.toLocaleString("id-ID")}
                  </button>
                ))}
              </div>

              {singleStockMessage && <p className="text-xs font-bold text-center">{singleStockMessage}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSingleStockOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={singleStockLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  {singleStockLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FULL OPNAME STOK OUTLET                                 */}
      {/* ============================================================== */}
      {isOpnameOpen && opnameOutlet && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-700" />
                  Opname Fisik Riil: {opnameOutlet.name}
                </h3>
                <p className="text-xs text-slate-500">Ketik hasil hitungan fisik bahan baku untuk menyelaraskan sistem</p>
              </div>
              <button
                onClick={() => setIsOpnameOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpnameSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-600 font-semibold">Tombol Pintas:</span>
                <button
                  type="button"
                  onClick={setAllOpnameToZero}
                  className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition"
                >
                  Setel Semua ke 0
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uniqueMaterials.map((mat) => (
                  <div key={mat.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate">{mat.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        step="any"
                        value={opnameValues[mat.id] ?? 0}
                        onChange={(e) =>
                          setOpnameValues({
                            ...opnameValues,
                            [mat.id]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-right"
                      />
                      <span className="text-[10px] text-slate-400 font-mono w-7">{mat.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {opnameMessage && <p className="text-xs font-bold text-center">{opnameMessage}</p>}

              <div className="flex gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpnameOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={opnameLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  {opnameLoading ? "Menyimpan Opname..." : "Simpan Semua Opname"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESTOCK CENTRAL KITCHEN                                 */}
      {/* ============================================================== */}
      {isRestockOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                Kirim Stok ke Kedai (Restock)
              </h3>
              <button
                onClick={() => setIsRestockOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kedai Tujuan:</label>
                <select
                  value={restockOutletId}
                  onChange={(e) => setRestockOutletId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  {data?.outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bahan Baku:</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="">Pilih Bahan Baku...</option>
                  {uniqueMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah:</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Contoh: 100"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>

              {restockMessage && <p className="text-xs font-bold text-center">{restockMessage}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  Kirim Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CATAT BIAYA / PENGELUARAN OPERASIONAL                   */}
      {/* ============================================================== */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                Catat Pengeluaran Operasional / Kas Keluar
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kedai Bersangkutan:
                </label>
                <select
                  value={expenseForm.outletId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, outletId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="all">Semua Kedai (Konsolidasi Pusat)</option>
                  {data?.outlets?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kategori Pengeluaran:
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="operasional">Operasional Rutin</option>
                  <option value="es_batu">Bahan Pembantu (Es Batu Kristal)</option>
                  <option value="kemasan">Kemasan &amp; Kantong Kresek / Sedotan</option>
                  <option value="transportasi">Logistik &amp; Transportasi Bahan</option>
                  <option value="utilitas">Listrik, Air &amp; Sewa</option>
                  <option value="lainnya">Biaya Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Deskripsi / Keterangan Biaya *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli Es Batu 4 Bal &amp; Plastik Roll"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Pengeluaran (Rp) *:
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 35000"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>

              {expenseMessage && <p className="text-xs font-bold text-rose-600 text-center">{expenseMessage}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={expenseLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
                >
                  {expenseLoading ? "Menyimpan..." : "Simpan Biaya"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESET POS & DATABASE                                    */}
      {/* ============================================================== */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-rose-700 flex items-center gap-1.5">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
                {resetType === "reset_pos" ? "Reset Operasional POS" : "Reset Total Database"}
              </h3>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteReset} className="space-y-4 my-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <p className="font-bold">Peringatan Keamanan:</p>
                <p>
                  {resetType === "reset_pos"
                    ? "Tindakan ini akan menghapus seluruh data transaksi hari ini, pengeluaran kasir (es, gas, dll), dan shift closing untuk kedai terpilih."
                    : "Tindakan ini akan menghapus seluruh database (termasuk semua pengeluaran) dan mengisi ulang data awal (seeding) untuk kebutuhan testing."}
                </p>
              </div>

              {resetType === "reset_database" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Ketik teks persis: <span className="font-mono text-rose-600">RESET DATABASE</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="RESET DATABASE"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Masukkan PIN Otorisasi Admin:
                </label>
                <input
                  type="password"
                  required
                  placeholder="PIN Admin"
                  value={adminAuthPin}
                  onChange={(e) => setAdminAuthPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {resetStatusMessage && <p className="text-xs font-bold text-center">{resetStatusMessage}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition"
                >
                  {resetLoading ? "Mengeksekusi..." : "Konfirmasi Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT UANG CASH YANG DIBAWA (MODAL KAS AWAL KEDAI)       */}
      {/* ============================================================== */}
      {isCashFloatModalOpen && cashFloatOutlet && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Uang Cash Dibawa
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold">{cashFloatOutlet.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCashFloatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCashFloat} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Modal Kas / Uang Cash Dibawa:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-extrabold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={cashFloatValue}
                    onChange={(e) => setCashFloatValue(Number(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ini adalah uang kembalian / kas awal yang dibawa kasir saat shift operasional.
                </p>
              </div>

              {/* Quick Nominal Buttons */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pilihan Cepat:</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 50000, 100000, 150000, 200000, 300000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashFloatValue(amt)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                        cashFloatValue === amt
                          ? "bg-amber-500 border-amber-600 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {amt === 0 ? "Rp 0" : `Rp ${(amt / 1000).toLocaleString("id-ID")}rb`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-0.5">
                <p className="font-bold flex items-center gap-1">
                  <span>⚡</span> Terhubung Otomatis ke Kasir POS
                </p>
                <p className="text-[10px]">
                  Nilai ini langsung terupdate di kasir POS sebagai penambah ketersediaan uang cash di laci kedai.
                </p>
              </div>

              {cashFloatMessage && (
                <p className="text-xs font-bold text-center text-rose-600">{cashFloatMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashFloatModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={cashFloatLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition"
                >
                  {cashFloatLoading ? "Menyimpan..." : "Simpan Uang Cash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
