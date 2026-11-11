"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Banknote,
  Wifi,
  WifiOff,
  RefreshCw,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Sparkles,
  Droplets,
  Search,
  Store,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Lock,
  Printer,
  Bluetooth,
  FileText,
  X,
  Receipt,
  Flame,
  Coins,
  Target,
  Trophy,
  Dices,
  Smile,
  TrendingUp,
  Sunrise,
  AlertTriangle,
} from "lucide-react";
import {
  getPendingTransactions,
  saveOfflineTransaction,
  syncPendingTransactions,
} from "@/lib/offline-sync";
import {
  ReceiptData,
  bluetoothPrinter,
  printReceiptViaBrowser,
} from "@/lib/escpos-printer";

interface Outlet {
  id: string;
  code: string;
  name: string;
  address?: string;
  target_cups?: number;
  initial_cash?: number;
  shift_status?: "open" | "closed";
  last_opened_at?: string;
  last_closed_at?: string;
}

interface BOMRecipe {
  quantity: number;
  raw_material: {
    id: string;
    name: string;
    unit: string;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  active_status: boolean;
  total_sold?: number;
  recipes: BOMRecipe[];
}

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  sugarLevel: "normal" | "less" | "tawar";
  notes?: string;
  isPromoFree?: boolean;
}

interface RawMaterialStock {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
}

interface FlavorMeta {
  baseName: string;
  category: "original" | "milky" | "fruity" | "topping";
  circleBg: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
  isNew?: boolean;
}

const FLAVOR_METAS: Record<string, FlavorMeta> = {
  "Jasmine Poci Iced Tea": { baseName: "Jasmine Poci Iced Tea", category: "original", circleBg: "bg-emerald-600", badgeBg: "bg-emerald-100", badgeText: "text-emerald-800", icon: "🍃" },
  "Vanilla Poci Iced Tea": { baseName: "Vanilla Poci Iced Tea", category: "original", circleBg: "bg-pink-700", badgeBg: "bg-pink-100", badgeText: "text-pink-800", icon: "🌼" },
  "Thai Iced Tea": { baseName: "Thai Iced Tea", category: "milky", circleBg: "bg-orange-600", badgeBg: "bg-orange-100", badgeText: "text-orange-800", icon: "🧋" },
  "Milk Iced Tea": { baseName: "Milk Iced Tea", category: "milky", circleBg: "bg-amber-500", badgeBg: "bg-amber-100", badgeText: "text-amber-900", icon: "🥛" },
  "Chocolate Iced Tea": { baseName: "Chocolate Iced Tea", category: "milky", circleBg: "bg-amber-950", badgeBg: "bg-stone-200", badgeText: "text-stone-900", icon: "🍫" },
  "Lychee Iced Tea": { baseName: "Lychee Iced Tea", category: "fruity", circleBg: "bg-pink-500", badgeBg: "bg-pink-100", badgeText: "text-pink-800", icon: "🍒" },
  "Cappuccino Iced Tea": { baseName: "Cappuccino Iced Tea", category: "milky", circleBg: "bg-amber-800", badgeBg: "bg-amber-100", badgeText: "text-amber-900", icon: "☕" },
  "Guava Iced Tea": { baseName: "Guava Iced Tea", category: "fruity", circleBg: "bg-rose-500", badgeBg: "bg-rose-100", badgeText: "text-rose-800", icon: "🍈" },
  "Mango Iced Tea": { baseName: "Mango Iced Tea", category: "fruity", circleBg: "bg-emerald-500", badgeBg: "bg-amber-100", badgeText: "text-amber-900", icon: "🥭" },
  "Blackcurrant Iced Tea": { baseName: "Blackcurrant Iced Tea", category: "fruity", circleBg: "bg-indigo-600", badgeBg: "bg-indigo-100", badgeText: "text-indigo-900", icon: "🍇" },
  "Apple Iced Tea": { baseName: "Apple Iced Tea", category: "fruity", circleBg: "bg-red-600", badgeBg: "bg-red-100", badgeText: "text-red-900", icon: "🍎" },
  "Orange Iced Tea": { baseName: "Orange Iced Tea", category: "fruity", circleBg: "bg-orange-500", badgeBg: "bg-orange-100", badgeText: "text-orange-900", icon: "🍊" },
  "Lemon Honey Iced Tea": { baseName: "Lemon Honey Iced Tea", category: "fruity", circleBg: "bg-yellow-500", badgeBg: "bg-yellow-100", badgeText: "text-yellow-900", icon: "🍋" },
  // 5 Varian Baru Vendor Resmi Es Teh Poci
  "Matcha Iced Tea": { baseName: "Matcha Iced Tea", category: "milky", circleBg: "bg-emerald-700", badgeBg: "bg-emerald-100", badgeText: "text-emerald-900", icon: "🍵" },
  "Aren Latte Iced Tea": { baseName: "Aren Latte Iced Tea", category: "milky", circleBg: "bg-amber-800", badgeBg: "bg-amber-100", badgeText: "text-amber-900", icon: "☕" },
  "Coconut Latte Iced Tea": { baseName: "Coconut Latte Iced Tea", category: "milky", circleBg: "bg-teal-700", badgeBg: "bg-teal-100", badgeText: "text-teal-900", icon: "🥥" },
  "Teh Tarik Gula Aren": { baseName: "Teh Tarik Gula Aren", category: "milky", circleBg: "bg-amber-900", badgeBg: "bg-amber-100", badgeText: "text-amber-950", icon: "🧋" },
  "Teh Krampul Selasih": { baseName: "Teh Krampul Selasih", category: "fruity", circleBg: "bg-lime-600", badgeBg: "bg-lime-100", badgeText: "text-lime-900", icon: "🍹" },
};

export default function PosTerminalPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialStock[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Target & Realisasi Penjualan Cup Harian
  const [todayCupsSold, setTodayCupsSold] = useState<number>(0);
  // Uang Cash (Tunai) Masuk dari Penjualan Hari Ini
  const [todayCashIn, setTodayCashIn] = useState<number>(0);

  // Pantun Semangat Gemini AI (Update Otomatis Tiap 15 Menit)
  const [pantunText, setPantunText] = useState<string>("");
  const [isPantunLoading, setIsPantunLoading] = useState<boolean>(false);
  const [isPantunCollapsed, setIsPantunCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("poci_pantun_collapsed") === "true";
    }
    return false;
  });

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockAlertMessage, setStockAlertMessage] = useState<string | null>(null);

  // Kode Diskon & Promo (Beli 2 Varian Rasa Gratis 1 Ori Jumbo)
  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [isPromoApplied, setIsPromoApplied] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "Cash">("QRIS");
  const [cashReceivedInput, setCashReceivedInput] = useState<string>("");
  const [isProcessing, startTransition] = useTransition();
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);
  const [lastDeductions, setLastDeductions] = useState<any[]>([]);

  // Thermal Receipt Printing State
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);
  const [isPrintingBt, setIsPrintingBt] = useState<boolean>(false);
  const [printStatusMessage, setPrintStatusMessage] = useState<{
    text: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  // Auto-Print & Auto-Close Timer State
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("poci_autoprint_receipt") !== "false";
    }
    return true;
  });
  const [autoCloseSeconds, setAutoCloseSeconds] = useState<number | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);

  const toggleAutoPrint = () => {
    setAutoPrintReceipt((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("poci_autoprint_receipt", String(next));
      }
      return next;
    });
  };

  // ================= RE-BREWING & DISPENSER TEH (WATER BARREL 8L) STATE =================
  const [brewLiquidMl, setBrewLiquidMl] = useState<number>(8000);
  const [isBrewAlertDismissed, setIsBrewAlertDismissed] = useState<boolean>(false);
  const [isBrewModalOpen, setIsBrewModalOpen] = useState<boolean>(false);
  const [customBrewInput, setCustomBrewInput] = useState<string>("8000");
  const [brewSuccessToast, setBrewSuccessToast] = useState<string | null>(null);

  // Notifikasi nada lembut (chime) menggunakan Web Audio API tanpa perlu file eksternal
  const playBrewAlertChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  };

  // Helper kalkulasi penggunaan cairan teh per cup: Reguler = 180 ml, Jumbo = 250 ml, Topping = 0 ml
  const calculateCartTeaLiquid = (items: CartItem[]) => {
    return items.reduce((sum, item) => {
      const pName = item.product.name.toLowerCase();
      if (pName.includes("topping")) return sum;
      const mlPerCup = pName.includes("reguler") ? 180 : 250;
      return sum + mlPerCup * item.quantity;
    }, 0);
  };

  // Handler pemotongan cairan teh di dispenser barrel saat transaksi selesai
  const deductBrewLiquidForCart = (cartItems: CartItem[]) => {
    const teaLiquidUsed = calculateCartTeaLiquid(cartItems);
    if (teaLiquidUsed > 0 && selectedOutletId) {
      setBrewLiquidMl((prev) => {
        const nextVal = Math.max(0, prev - teaLiquidUsed);
        localStorage.setItem("poci_brew_barrel_ml_" + selectedOutletId, String(nextVal));
        if (prev > 3000 && nextVal <= 3000) {
          playBrewAlertChime();
          setIsBrewAlertDismissed(false); // Munculkan kembali banner alert jika sebelumnya disembunyikan
        }
        return nextVal;
      });
    }
  };

  // Handler isi ulang / reset batch seduhan (default 8.000 ml = 8 Liter)
  const handleRefillBrewBatch = (amount = 8000) => {
    const val = Math.max(0, amount);
    setBrewLiquidMl(val);
    setCustomBrewInput(String(val));
    if (selectedOutletId) {
      localStorage.setItem("poci_brew_barrel_ml_" + selectedOutletId, String(val));
    }
    setIsBrewAlertDismissed(false);
    setIsBrewModalOpen(false);
    setBrewSuccessToast(
      `✅ Dispenser teh berhasil diisi ulang: ${(val / 1000).toFixed(1)}L (${val.toLocaleString("id-ID")} ml) siap disajikan!`
    );
    setTimeout(() => setBrewSuccessToast(null), 4500);
  };

  // Mobile Cart Accordion & Sticky-on-Scroll State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [isStickyMobileCart, setIsStickyMobileCart] = useState<boolean>(false);
  const cartAnchorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let initialAnchorOffset = 0;

    const measureOffset = () => {
      if (cartAnchorRef.current) {
        const box = cartAnchorRef.current.getBoundingClientRect();
        initialAnchorOffset = box.top + window.scrollY;
      }
    };

    measureOffset();
    const timer = setTimeout(measureOffset, 400);

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const targetThreshold = initialAnchorOffset > 0 ? (initialAnchorOffset - 10) : 70;
      // Sticky aktif terus-menerus baik saat scroll down maupun scroll up
      setIsStickyMobileCart(currentScroll > targetThreshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", measureOffset);
    handleScroll();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measureOffset);
    };
  }, []);

  const fetchPantun = async (forceRefresh = false) => {
    setIsPantunLoading(true);
    try {
      const activeOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
      const outletName = activeOutlet?.name || "Kedai Teh Poci";
      const target = activeOutlet?.target_cups || 100;
      const sold = todayCupsSold || 0;
      const url = `/api/gemini/pantun?outletName=${encodeURIComponent(outletName)}&target=${target}&sold=${sold}${
        forceRefresh ? "&refresh=true" : ""
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.pantun) {
          setPantunText(json.pantun);
          if (selectedOutletId) {
            localStorage.setItem("cached_poci_pantun_" + selectedOutletId, json.pantun);
          }
        }
      }
    } catch (err) {
      console.error("Gagal mengambil pantun Gemini:", err);
    } finally {
      setIsPantunLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOutletId) {
      const cached = localStorage.getItem("cached_poci_pantun_" + selectedOutletId);
      if (cached) setPantunText(cached);
      fetchPantun();

      // Muat sisa cairan teh di dispenser barrel untuk outlet ini
      const savedBrew = localStorage.getItem("poci_brew_barrel_ml_" + selectedOutletId);
      if (savedBrew !== null && !isNaN(Number(savedBrew))) {
        const num = Number(savedBrew);
        setBrewLiquidMl(num);
        setCustomBrewInput(String(num));
      } else {
        setBrewLiquidMl(8000);
        setCustomBrewInput("8000");
        localStorage.setItem("poci_brew_barrel_ml_" + selectedOutletId, "8000");
      }
      setIsBrewAlertDismissed(false);
    }

    // Auto-update pantun berima setiap 15 menit sekali (15 * 60 * 1000 ms)
    const timer = setInterval(() => {
      fetchPantun();
    }, 15 * 60 * 1000);

    return () => clearInterval(timer);
  }, [selectedOutletId]);

  // ================= OPENING KEDAI / BUKA SHIFT STATE =================
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);
  const [openingCashFloat, setOpeningCashFloat] = useState<number>(0);
  const [openingStockValues, setOpeningStockValues] = useState<Record<string, number>>({});
  const [openingLoading, setOpeningLoading] = useState<boolean>(false);
  const [openingMessage, setOpeningMessage] = useState<string | null>(null);

  const openOpeningModal = (targetOutletId?: string) => {
    const activeId = targetOutletId || selectedOutletId;
    const currentOutlet = outlets.find((o) => o.id === activeId);
    setOpeningCashFloat(currentOutlet?.initial_cash || 0);

    const initialStocks: Record<string, number> = {};
    rawMaterials.forEach((rm) => {
      initialStocks[rm.id] = rm.current_stock || 0;
    });
    setOpeningStockValues(initialStocks);
    setOpeningMessage(null);
    setIsOpeningModalOpen(true);
  };

  const handleSaveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutletId) return;

    const cashNum = Number(openingCashFloat);
    if (isNaN(cashNum) || cashNum < 0) {
      setOpeningMessage("❌ Nominal uang cash yang dibawa harus berupa angka 0 atau lebih.");
      return;
    }

    setOpeningLoading(true);
    setOpeningMessage(null);

    try {
      const stocksPayload = Object.entries(openingStockValues).map(([raw_material_id, current_stock]) => ({
        raw_material_id,
        current_stock: Number(current_stock) || 0,
      }));

      const res = await fetch("/api/opening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: selectedOutletId,
          cash_float: cashNum,
          stocks: stocksPayload,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setOpeningMessage("✅ " + resJson.message);
        loadData(selectedOutletId);
        try {
          localStorage.setItem("poci_sync_event", String(Date.now()));
          const ch = new BroadcastChannel("poci_pos_sync");
          ch.postMessage({ type: "SHIFT_OPENING_COMPLETED", timestamp: Date.now() });
          ch.close();
        } catch {}
        setTimeout(() => {
          setIsOpeningModalOpen(false);
          setOpeningMessage(null);
        }, 1200);
      } else {
        setOpeningMessage("❌ " + (resJson.error || "Gagal membuka shift kedai"));
      }
    } catch {
      setOpeningMessage("❌ Terjadi gangguan jaringan.");
    } finally {
      setOpeningLoading(false);
    }
  };

  // ================= EXPENSE / PENGELUARAN KASIR STATE =================
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseCategory, setExpenseCategory] = useState<string>("es_batu");
  const [expenseDescription, setExpenseDescription] = useState<string>("Beli Es Batu Kristal");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseLoading, setExpenseLoading] = useState<boolean>(false);
  const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<any[]>([]);
  const [todayExpenseTotal, setTodayExpenseTotal] = useState<number>(0);

  const loadTodayExpenses = async (outletId = selectedOutletId) => {
    if (!outletId) return;
    try {
      const res = await fetch(`/api/expenses?outletId=${outletId}&period=today`);
      if (res.ok) {
        const json = await res.json();
        setTodayExpenses(json.expenses || []);
        const total = json.totalAmount || 0;
        setTodayExpenseTotal(total);
        localStorage.setItem("cached_poci_today_expense_" + outletId, String(total));
      }
    } catch (err) {
      console.error("Gagal memuat pengeluaran hari ini", err);
      const cached = localStorage.getItem("cached_poci_today_expense_" + outletId);
      if (cached) setTodayExpenseTotal(Number(cached) || 0);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDescription.trim()) {
      setExpenseMessage("Deskripsi pengeluaran wajib diisi.");
      return;
    }
    const amountNum = Number(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpenseMessage("Nominal biaya harus berupa angka lebih dari 0.");
      return;
    }

    setExpenseLoading(true);
    setExpenseMessage(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutletId,
          category: expenseCategory,
          description: expenseDescription.trim(),
          amount: amountNum,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setExpenseAmount("");
        setExpenseMessage(`✅ ${json.message}`);
        setTodayExpenseTotal((prev) => prev + amountNum);
        loadTodayExpenses(selectedOutletId);
        loadData(selectedOutletId);
        try {
          localStorage.setItem("poci_sync_event", String(Date.now()));
          const ch = new BroadcastChannel("poci_pos_sync");
          ch.postMessage({ type: "EXPENSE_CREATED", timestamp: Date.now() });
          ch.close();
        } catch {}
        setTimeout(() => {
          setExpenseMessage(null);
        }, 3500);
      } else {
        setExpenseMessage(`❌ ${json.error || "Gagal mencatat pengeluaran"}`);
      }
    } catch (err: any) {
      setExpenseMessage(`❌ ${err?.message || "Gagal menghubungi server"}`);
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${expenseId}`, { method: "DELETE" });
      if (res.ok) {
        loadTodayExpenses(selectedOutletId);
        loadData(selectedOutletId);
        try {
          localStorage.setItem("poci_sync_event", String(Date.now()));
          const ch = new BroadcastChannel("poci_pos_sync");
          ch.postMessage({ type: "EXPENSE_DELETED", timestamp: Date.now() });
          ch.close();
        } catch {}
      }
    } catch (err) {
      console.error("Gagal menghapus pengeluaran", err);
    }
  };

  // Load Data Outlet & Produk
  const loadData = async (targetOutletId?: string) => {
    try {
      const activeId = targetOutletId || selectedOutletId;
      const url = activeId ? `/api/products?outletId=${activeId}` : "/api/products";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const validOutlets: Outlet[] = data.outlets || [];
        setOutlets(validOutlets);
        setProducts(data.products || []);
        setRawMaterials(data.rawMaterials || []);

        // Validasi outlet: Pastikan outlet terpilih ada di daftar outlet aktif
        const matchingOutlet = validOutlets.find(
          (o) => o.id === data.selectedOutletId || o.id === activeId || o.id === targetOutletId
        );
        const finalOutletId = matchingOutlet ? matchingOutlet.id : validOutlets[0]?.id || "";

        setSelectedOutletId(finalOutletId);
        if (finalOutletId) {
          localStorage.setItem("poci_selected_outlet_id", finalOutletId);
          loadTodayExpenses(finalOutletId);
        }

        if (typeof data.todayCupsSold === "number") {
          setTodayCupsSold(data.todayCupsSold);
          localStorage.setItem("cached_poci_today_cups_" + finalOutletId, String(data.todayCupsSold));
        }

        if (typeof data.todayCashIn === "number") {
          setTodayCashIn(data.todayCashIn);
          localStorage.setItem("cached_poci_today_cash_in_" + finalOutletId, String(data.todayCashIn));
        }

        if (typeof data.todayExpenseTotal === "number") {
          setTodayExpenseTotal(data.todayExpenseTotal);
          localStorage.setItem("cached_poci_today_expense_" + finalOutletId, String(data.todayExpenseTotal));
        }

        localStorage.setItem("cached_poci_products", JSON.stringify(data.products));
        localStorage.setItem("cached_poci_materials_" + finalOutletId, JSON.stringify(data.rawMaterials));
        localStorage.setItem("cached_poci_outlets", JSON.stringify(data.outlets));
      }
    } catch {
      const cachedOutlets = localStorage.getItem("cached_poci_outlets");
      const cachedProds = localStorage.getItem("cached_poci_products");
      const savedOutletId = localStorage.getItem("poci_selected_outlet_id") || "";
      const cachedMats = localStorage.getItem("cached_poci_materials_" + savedOutletId);
      const cachedCups = localStorage.getItem("cached_poci_today_cups_" + savedOutletId);
      const cachedCashIn = localStorage.getItem("cached_poci_today_cash_in_" + savedOutletId);

      if (cachedOutlets) setOutlets(JSON.parse(cachedOutlets));
      if (cachedProds) setProducts(JSON.parse(cachedProds));
      if (cachedMats) setRawMaterials(JSON.parse(cachedMats));
      if (cachedCups) setTodayCupsSold(Number(cachedCups) || 0);
      if (cachedCashIn) setTodayCashIn(Number(cachedCashIn) || 0);
      if (savedOutletId) {
        setSelectedOutletId(savedOutletId);
        loadTodayExpenses(savedOutletId);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOutletChange = (newOutletId: string) => {
    setSelectedOutletId(newOutletId);
    localStorage.setItem("poci_selected_outlet_id", newOutletId);
    setCart([]); // Reset keranjang ketika berpindah kedai
    setLoading(true);
    loadData(newOutletId);
    loadTodayExpenses(newOutletId);
  };

  const handleSync = async () => {
    if (!navigator.onLine) return;
    const { syncedCount } = await syncPendingTransactions();
    const remaining = getPendingTransactions().length;
    setPendingSyncCount(remaining);
    if (syncedCount > 0) {
      loadData();
    }
  };

  useEffect(() => {
    const savedOutlet = localStorage.getItem("poci_selected_outlet_id") || "";
    loadData(savedOutlet);
    setPendingSyncCount(getPendingTransactions().length);

    const updateOnline = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) handleSync();
    };

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    setIsOnline(navigator.onLine);

    // Sinkronisasi data real-time antar-tab/jendela browser (POS & Admin)
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel("poci_pos_sync");
      ch.onmessage = () => {
        loadData();
        loadTodayExpenses();
      };
    } catch {}

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === "poci_sync_event") {
        loadData();
        loadTodayExpenses();
      }
    };
    window.addEventListener("storage", handleStorageSync);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("storage", handleStorageSync);
      ch?.close();
    };
  }, []);

  // Group flavors
  const groupedFlavors = useMemo(() => {
    const map = new Map<
      string,
      {
        baseName: string;
        meta: FlavorMeta;
        reguler?: Product;
        jumbo?: Product;
        single?: Product;
        totalSold: number;
      }
    >();

    for (const p of products) {
      if (p.name === "Extra Creamy Topping") continue;

      const isReg = /\((reguler|regular)\)/i.test(p.name);
      const isJum = /\(jumbo\)/i.test(p.name);

      let baseName = p.name
        .replace(/\s*[\(\[]?(reguler|regular|jumbo)[\)\]]?/gi, "")
        .trim();
      if (!baseName) baseName = p.name.trim();

      const meta = FLAVOR_METAS[baseName] || {
        baseName,
        category: ((p as any).category as any) || "fruity",
        circleBg: "bg-emerald-600",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        icon: "🥤",
      };

      if (!map.has(baseName)) {
        map.set(baseName, { baseName, meta, totalSold: 0 });
      }

      const entry = map.get(baseName)!;
      entry.totalSold += p.total_sold || 0;

      if (isReg) {
        entry.reguler = p;
      } else if (isJum) {
        entry.jumbo = p;
      } else {
        // Cek berdasarkan bahan cup jika tidak ada kata reguler/jumbo di nama
        const hasRegCup = p.recipes?.some((r) => r.raw_material?.name?.toLowerCase().includes("reguler"));
        const hasJumboCup = p.recipes?.some((r) => r.raw_material?.name?.toLowerCase().includes("jumbo"));

        if (hasRegCup && !entry.reguler) {
          entry.reguler = p;
        } else if (hasJumboCup && !entry.jumbo) {
          entry.jumbo = p;
        } else if (!entry.reguler) {
          entry.reguler = p;
        } else if (!entry.jumbo) {
          entry.jumbo = p;
        } else {
          entry.single = p;
        }
      }
    }

    const items = Array.from(map.values());

    // SORTING ORDER SESUAI PERMINTAAN OWNER:
    // 1. Jasmine tea paling atas
    // 2. Di bawah jasmine tea, tarik menu minuman paling laku (berdasarkan record transaksi penjualan)
    items.sort((a, b) => {
      const isJasmineA = a.baseName.toLowerCase().includes("jasmine");
      const isJasmineB = b.baseName.toLowerCase().includes("jasmine");

      // Rule 1: Jasmine tea selalu nomor 1 di paling atas
      if (isJasmineA && !isJasmineB) return -1;
      if (!isJasmineA && isJasmineB) return 1;

      // Rule 2: Di bawah Jasmine tea, urutkan berdasarkan kuantitas penjualan tertinggi
      if (b.totalSold !== a.totalSold) {
        return b.totalSold - a.totalSold;
      }

      // Fallback: Urutkan secara alfabetis jika jumlah penjualan sama
      return a.baseName.localeCompare(b.baseName);
    });

    return items;
  }, [products]);

  const toppingProduct = useMemo(
    () => products.find((p) => p.name === "Extra Creamy Topping"),
    [products]
  );

  const filteredFlavors = useMemo(() => {
    return groupedFlavors.filter((item) => {
      const matchCat = activeCategory === "all" || item.meta.category === activeCategory;
      const matchSearch = item.baseName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [groupedFlavors, activeCategory, searchQuery]);

  // Hitung pemakaian bahan di keranjang saat ini (termasuk porsi gula cair)
  const cartMaterialUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const item of cart) {
      for (const recipe of item.product.recipes) {
        const matId = recipe.raw_material.id;
        const matNameLower = recipe.raw_material.name.toLowerCase();
        let qtyPerCup = recipe.quantity;

        // Potong stok gula cair sesuai opsi level gula: Full (100%), Less (50%), Tawar (0%)
        if (matNameLower.includes("gula")) {
          if (item.sugarLevel === "tawar") {
            qtyPerCup = 0;
          } else if (item.sugarLevel === "less") {
            qtyPerCup = recipe.quantity * 0.5;
          }
        }

        const currentQty = usage.get(matId) || 0;
        usage.set(matId, currentQty + qtyPerCup * item.quantity);
      }
    }
    return usage;
  }, [cart]);

  // Validasi Stok Ketat Sesuai Kedai
  const checkCanAddProduct = (
    product: Product,
    delta: number = 1,
    sugarLevel: "normal" | "less" | "tawar" = "normal"
  ): { canAdd: boolean; reason?: string } => {
    if (currentOutletObj?.shift_status === "closed") {
      return { canAdd: false, reason: "Shift kedai masih tutup. Silakan klik 'Opening Shift' terlebih dahulu." };
    }

    for (const recipe of product.recipes) {
      const matId = recipe.raw_material.id;
      const material = rawMaterials.find((m) => m.id === matId);
      if (!material) continue;

      let neededPerCup = recipe.quantity;
      const matNameLower = material.name.toLowerCase();

      if (matNameLower.includes("gula")) {
        if (sugarLevel === "tawar") neededPerCup = 0;
        else if (sugarLevel === "less") neededPerCup = recipe.quantity * 0.5;
      }

      // Jangan jadikan Kantong Teh / Premix Teh sebagai acuan disable pada kasir
      if (
        matNameLower.includes("kantong teh") ||
        matNameLower.includes("tea premix") ||
        matNameLower.includes("teh seduh") ||
        matNameLower.includes("liquid tea")
      ) {
        continue;
      }

      const currentUsedInCart = cartMaterialUsage.get(matId) || 0;
      const additionalNeeded = neededPerCup * delta;
      const totalWillBeUsed = currentUsedInCart + additionalNeeded;

      if (material.current_stock - totalWillBeUsed < 0) {
        const sisaTersedia = Math.max(0, Math.round(material.current_stock - currentUsedInCart));
        if (matNameLower.includes("cup")) {
          return { canAdd: false, reason: `Stok ${material.name} di kedai ini habis! Sisa: ${sisaTersedia} pcs.` };
        } else if (matNameLower.includes("gula")) {
          return { canAdd: false, reason: `Stok Gula Cair di kedai ini tidak cukup! Sisa: ${sisaTersedia} ml.` };
        } else {
          return { canAdd: false, reason: `Stok ${material.name} kedai ini tidak cukup! Sisa: ${sisaTersedia} ${material.unit}.` };
        }
      }
    }
    return { canAdd: true };
  };

  // Cek apakah produk merupakan teh varian rasa (buah/milky) - bukan Jasmine & Topping
  const isFlavoredTea = (p: Product) => {
    const name = p.name.toLowerCase();
    return !name.includes("jasmine") && !name.includes("topping");
  };

  // Total teh varian rasa berbayar di keranjang
  const flavoredTeaCount = useMemo(() => {
    return cart
      .filter((i) => !i.isPromoFree && isFlavoredTea(i.product))
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [cart]);

  const addToCart = (product: Product, sugarLevel: "normal" | "less" | "tawar" = "normal") => {
    const check = checkCanAddProduct(product, 1, sugarLevel);
    if (!check.canAdd) {
      setStockAlertMessage(check.reason || "Stok bahan baku kedai tidak mencukupi!");
      setTimeout(() => setStockAlertMessage(null), 3500);
      return;
    }

    setStockAlertMessage(null);
    setCart((prev) => {
      // Cari apakah sudah ada item persis sama (produk sama, level gula sama, dan non-promo)
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.sugarLevel === sugarLevel && !item.isPromoFree
      );

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      const newItem: CartItem = {
        id: `${product.id}_${sugarLevel}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        product,
        quantity: 1,
        sugarLevel,
        isPromoFree: false,
      };
      return [...prev, newItem];
    });
  };

  const updateSugarLevel = (cartId: string, level: "normal" | "less" | "tawar") => {
    setCart((prev) =>
      prev.map((item) => (item.id === cartId ? { ...item, sugarLevel: level } : item))
    );
  };

  const updateItemNotes = (cartId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === cartId ? { ...item, notes } : item))
    );
  };

  const toggleQuickNote = (cartId: string, tag: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== cartId) return item;
        const currentNotes = (item.notes || "").trim();
        if (!currentNotes) {
          return { ...item, notes: tag };
        }
        if (currentNotes.includes(tag)) {
          const updated = currentNotes
            .replace(tag, "")
            .replace(/,\s*,/g, ",")
            .replace(/^,\s*|,\s*$/g, "")
            .trim();
          return { ...item, notes: updated };
        } else {
          return { ...item, notes: `${currentNotes}, ${tag}` };
        }
      })
    );
  };

  const updateQuantity = (cartId: string, delta: number) => {
    if (delta > 0) {
      const targetCartItem = cart.find((i) => i.id === cartId);
      if (targetCartItem) {
        const check = checkCanAddProduct(targetCartItem.product, delta, targetCartItem.sugarLevel);
        if (!check.canAdd) {
          setStockAlertMessage(check.reason || "Stok kedai tidak mencukupi!");
          setTimeout(() => setStockAlertMessage(null), 3500);
          return;
        }
      }
    }

    setStockAlertMessage(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Handler Diskon / Promo: Beli minimal 2 varian rasa -> Dapat 1 Ori Jumbo Gratis
  const handleApplyPromoCode = (customCode?: string) => {
    const code = (customCode || promoCodeInput).trim().toUpperCase();
    if (!code && !customCode) {
      setPromoMessage({ type: "error", text: "Silakan masukkan kode diskon / promo." });
      setTimeout(() => setPromoMessage(null), 3500);
      return;
    }

    if (flavoredTeaCount < 2) {
      setPromoMessage({
        type: "error",
        text: `Kode diskon membutuhkan minimal 2 Teh Varian Rasa di keranjang (saat ini: ${flavoredTeaCount} cup).`,
      });
      setTimeout(() => setPromoMessage(null), 4500);
      return;
    }

    // Cari produk Jasmine Poci Iced Tea (Jumbo)
    const oriJumbo = products.find(
      (p) => p.name.toLowerCase().includes("jasmine") && p.name.toLowerCase().includes("jumbo")
    );

    if (!oriJumbo) {
      setPromoMessage({ type: "error", text: "Menu Teh Poci Ori Jumbo tidak ditemukan di katalog." });
      setTimeout(() => setPromoMessage(null), 3500);
      return;
    }

    const check = checkCanAddProduct(oriJumbo, 1, "normal");
    if (!check.canAdd) {
      setPromoMessage({
        type: "error",
        text: check.reason || "Stok bahan (Cup Jumbo / Gula) untuk bonus tidak mencukupi di kedai ini!",
      });
      setTimeout(() => setPromoMessage(null), 4000);
      return;
    }

    setCart((prev) => {
      const existingPromo = prev.find((i) => i.isPromoFree);
      if (existingPromo) return prev;
      const promoItem: CartItem = {
        id: `promo_ori_${Date.now()}`,
        product: oriJumbo,
        quantity: 1,
        sugarLevel: "normal",
        isPromoFree: true,
      };
      return [...prev, promoItem];
    });

    setIsPromoApplied(true);
    setPromoCodeInput("");
    setPromoMessage({
      type: "success",
      text: "🎉 Promo Berhasil! 1 Teh Poci Ori Jumbo GRATIS telah ditambahkan ke keranjang.",
    });
    setTimeout(() => setPromoMessage(null), 4000);
  };

  // Promo Otomatis: Beli 2 Varian Rasa Gratis 1 Ori Jumbo (Kelipatan Otomatis)
  useEffect(() => {
    const eligiblePromoQty = Math.floor(flavoredTeaCount / 2);

    setCart((prev) => {
      const existingPromoItem = prev.find((i) => i.isPromoFree);

      if (eligiblePromoQty > 0) {
        const oriJumbo = products.find(
          (p) => p.name.toLowerCase().includes("jasmine") && p.name.toLowerCase().includes("jumbo")
        );
        if (!oriJumbo) return prev;

        if (!existingPromoItem) {
          setIsPromoApplied(true);
          return [
            ...prev,
            {
              id: `promo_ori_${Date.now()}`,
              product: oriJumbo,
              quantity: eligiblePromoQty,
              sugarLevel: "normal",
              isPromoFree: true,
              notes: "Bonus Promo Otomatis",
            },
          ];
        }

        if (existingPromoItem.quantity !== eligiblePromoQty) {
          setIsPromoApplied(true);
          return prev.map((item) =>
            item.isPromoFree ? { ...item, quantity: eligiblePromoQty } : item
          );
        }

        return prev;
      } else {
        if (existingPromoItem) {
          setIsPromoApplied(false);
          return prev.filter((i) => !i.isPromoFree);
        }
        return prev;
      }
    });
  }, [flavoredTeaCount, products]);

  const clearCart = () => {
    setCart([]);
    setIsPromoApplied(false);
    setPromoMessage(null);
    setIsMobileCartOpen(false);
  };

  const totalAmount = cart.reduce((sum, item) => {
    const price = item.isPromoFree ? 0 : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const totalCupsCount = cart.reduce(
    (sum, item) => (item.product.name !== "Extra Creamy Topping" ? sum + item.quantity : sum),
    0
  );

  const handleExecuteCheckout = async () => {
    if (cart.length === 0 || !selectedOutletId) return;

    // Persiapkan data struk nota thermal sebelum cart dikosongkan
    const orderNumber = `#POC-${Date.now().toString().slice(-6)}`;
    const currentOutlet = outlets.find((o) => o.id === selectedOutletId);

    const receivedNum = paymentMethod === "Cash"
      ? (Number(cashReceivedInput) || totalAmount)
      : undefined;
    const changeNum = (receivedNum !== undefined && receivedNum >= totalAmount)
      ? (receivedNum - totalAmount)
      : (receivedNum !== undefined ? 0 : undefined);

    const receiptToPrint: ReceiptData = {
      orderId: orderNumber,
      outletName: currentOutlet?.name || "Es Teh Poci",
      outletCode: currentOutlet?.code || "OUT-01",
      outletAddress: currentOutlet?.address || "Booth Minimarket",
      items: cart.map((i) => {
        const sugarLabel =
          i.product.name.includes("Topping")
            ? ""
            : i.sugarLevel === "tawar"
            ? " (Tawar)"
            : i.sugarLevel === "less"
            ? " (Less Sugar)"
            : "";
        const promoLabel = i.isPromoFree ? " [PROMO GRATIS]" : "";
        const effectivePrice = i.isPromoFree ? 0 : i.product.price;
        return {
          name: `${formatProductName(i.product.name)}${sugarLabel}${promoLabel}`,
          quantity: i.quantity,
          price: effectivePrice,
          subtotal: i.quantity * effectivePrice,
          notes: i.notes?.trim() || undefined,
        };
      }),
      totalAmount,
      paymentMethod,
      cashReceived: receivedNum,
      cashChange: changeNum,
      timestamp: new Date().toISOString(),
      isOffline: !isOnline,
    };

    startTransition(async () => {
      const totalCartCups = cart.reduce((acc, curr) => acc + curr.quantity, 0);
      const payloadItems = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        sugarLevel: i.sugarLevel || "normal",
        notes: i.notes?.trim() || undefined,
        unitPrice: i.isPromoFree ? 0 : i.product.price,
        isPromoFree: !!i.isPromoFree,
      }));

      if (!isOnline) {
        saveOfflineTransaction({
          outletId: selectedOutletId,
          items: cart.map((i) => {
            const sugarLabel =
              i.product.name.includes("Topping")
                ? ""
                : i.sugarLevel === "tawar"
                ? " (Tawar)"
                : i.sugarLevel === "less"
                ? " (Less Sugar)"
                : "";
            const promoLabel = i.isPromoFree ? " [PROMO GRATIS]" : "";
            const effectivePrice = i.isPromoFree ? 0 : i.product.price;
            return {
              productId: i.product.id,
              productName: `${formatProductName(i.product.name)}${sugarLabel}${promoLabel}`,
              quantity: i.quantity,
              price: effectivePrice,
              sugarLevel: i.sugarLevel || "normal",
              isPromoFree: !!i.isPromoFree,
            };
          }),
          paymentMethod,
          totalAmount,
        });

        if (paymentMethod === "Cash") {
          setTodayCashIn((prev) => {
            const updated = prev + totalAmount;
            localStorage.setItem("cached_poci_today_cash_in_" + selectedOutletId, String(updated));
            return updated;
          });
        }
        deductBrewLiquidForCart(cart);
        setTodayCupsSold((prev) => prev + totalCartCups);
        setPendingSyncCount(getPendingTransactions().length);
        setCompletedReceipt(receiptToPrint);
        setCheckoutSuccess(true);
        setAutoCloseSeconds(5);
        setIsTimerPaused(false);
        setCart([]);
        setIsPromoApplied(false);
        setPromoMessage(null);
        setIsMobileCartOpen(false);
        return;
      }

      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outletId: selectedOutletId,
            items: payloadItems,
            paymentMethod,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (paymentMethod === "Cash") {
            setTodayCashIn((prev) => {
              const updated = prev + totalAmount;
              localStorage.setItem("cached_poci_today_cash_in_" + selectedOutletId, String(updated));
              return updated;
            });
          }
          deductBrewLiquidForCart(cart);
          setTodayCupsSold((prev) => prev + totalCartCups);
          setLastDeductions(data.inventoryDeductions || []);
          setCompletedReceipt(receiptToPrint);
          setCheckoutSuccess(true);
          setAutoCloseSeconds(5);
          setIsTimerPaused(false);
          setCart([]);
          setIsPromoApplied(false);
          setPromoMessage(null);
          setIsMobileCartOpen(false);
          loadData();
          try {
            localStorage.setItem("poci_sync_event", String(Date.now()));
            const ch = new BroadcastChannel("poci_pos_sync");
            ch.postMessage({ type: "TRANSACTION_COMPLETED", timestamp: Date.now() });
            ch.close();
          } catch {}
        } else {
          alert("Transaksi Gagal: " + (data.error || "Gagal checkout"));
        }
      } catch {
        saveOfflineTransaction({
          outletId: selectedOutletId,
          items: cart.map((i) => {
            const sugarLabel =
              i.product.name.includes("Topping")
                ? ""
                : i.sugarLevel === "tawar"
                ? " (Tawar)"
                : i.sugarLevel === "less"
                ? " (Less Sugar)"
                : "";
            const promoLabel = i.isPromoFree ? " [PROMO GRATIS]" : "";
            const effectivePrice = i.isPromoFree ? 0 : i.product.price;
            return {
              productId: i.product.id,
              productName: `${formatProductName(i.product.name)}${sugarLabel}${promoLabel}`,
              quantity: i.quantity,
              price: effectivePrice,
              sugarLevel: i.sugarLevel || "normal",
              isPromoFree: !!i.isPromoFree,
            };
          }),
          paymentMethod,
          totalAmount,
        });
        deductBrewLiquidForCart(cart);
        setTodayCupsSold((prev) => prev + totalCartCups);
        setPendingSyncCount(getPendingTransactions().length);
        setCompletedReceipt(receiptToPrint);
        setCheckoutSuccess(true);
        setAutoCloseSeconds(5);
        setIsTimerPaused(false);
        setCart([]);
        setIsPromoApplied(false);
        setPromoMessage(null);
        setIsMobileCartOpen(false);
      }
    });
  };

  // Print handler cerdas: Bluetooth jika terkoneksi/diminta, fallback otomatis ke browser default printer
  const handlePrintReceipt = async (forceBluetoothPrompt = false) => {
    if (!completedReceipt) return;

    if (bluetoothPrinter.isConnected() || forceBluetoothPrompt) {
      setIsPrintingBt(true);
      setPrintStatusMessage(null);
      try {
        await bluetoothPrinter.print(completedReceipt);
        setPrintStatusMessage({
          text: "Struk berhasil dicetak ke Printer Bluetooth!",
          type: "success",
        });
        setTimeout(() => setPrintStatusMessage(null), 4000);
        return;
      } catch (err: any) {
        const isCancelled =
          err?.name === "BluetoothUserCancelledError" ||
          err?.name === "NotFoundError" ||
          err?.message?.toLowerCase().includes("cancel") ||
          err?.message?.toLowerCase().includes("batal") ||
          err?.message?.toLowerCase().includes("user selected no device");

        if (isCancelled) {
          setPrintStatusMessage({
            text: "Pencarian printer Bluetooth dibatalkan oleh kasir.",
            type: "warning",
          });
          setTimeout(() => setPrintStatusMessage(null), 3000);
          return;
        } else {
          setPrintStatusMessage({
            text: "Bluetooth tidak terhubung. Mengalihkan ke printer default...",
            type: "warning",
          });
          setTimeout(() => {
            printReceiptViaBrowser();
          }, 500);
        }
      } finally {
        setIsPrintingBt(false);
      }
    } else {
      // Standar: langsung cetak ke printer default thermal sistem / RawBT
      printReceiptViaBrowser();
    }
  };

  const handlePrintBrowser = () => {
    handlePrintReceipt(false);
  };

  const handlePrintBluetooth = async () => {
    handlePrintReceipt(true);
  };

  // Auto-close modal struk setelah checkout sukses (countdown 5 detik)
  useEffect(() => {
    if (!checkoutSuccess || autoCloseSeconds === null || isTimerPaused) return;

    if (autoCloseSeconds <= 0) {
      handleFinishTransaction();
      return;
    }

    const timer = setTimeout(() => {
      setAutoCloseSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkoutSuccess, autoCloseSeconds, isTimerPaused]);

  // Auto-print saat transaksi berhasil (jika toggle auto-print aktif)
  useEffect(() => {
    if (checkoutSuccess && completedReceipt && autoPrintReceipt) {
      const timer = setTimeout(() => {
        handlePrintReceipt(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [checkoutSuccess, completedReceipt]);

  const handleFinishTransaction = () => {
    setIsCheckoutModalOpen(false);
    setCheckoutSuccess(false);
    setCompletedReceipt(null);
    setCashReceivedInput("");
    setLastDeductions([]);
    setPrintStatusMessage(null);
    setIsMobileCartOpen(false); // Tutup accordion cart secara default setelah transaksi selesai
    setAutoCloseSeconds(null);
    setIsTimerPaused(false);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Helper untuk menghilangkan label (JUMBO) pada varian rasa di kasir FE
  const formatProductName = (name: string) => {
    if (!name) return "";
    if (name.toLowerCase().includes("jasmine")) return name;
    return name.replace(/\s*[\(\[]?(jumbo|reguler|regular)[\)\]]?/gi, "").trim();
  };

  const cupRegMaterial = rawMaterials.find((m) => m.name === "Cup Reguler");
  const cupJumboMaterial = rawMaterials.find((m) => m.name === "Cup Jumbo");
  const teaPremixMaterial = rawMaterials.find((m) => m.name === "Kantong Teh" || m.name === "Liquid Tea Premix");
  const currentOutletObj = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const dailyTargetCups = currentOutletObj?.target_cups || 100;
  const initialCash = currentOutletObj?.initial_cash || 0;
  const currentCashBalance = initialCash + todayCashIn - todayExpenseTotal;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white relative lg:sticky lg:top-0 z-30 shadow-md w-full">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2 sm:py-2.5 space-y-2 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
          
          {/* Row 1 di Mobile & Tablet (<lg) / Sisi Kiri di Desktop (lg+) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white p-0.5 sm:p-1 flex items-center justify-center shadow-md shrink-0 border border-amber-300 overflow-hidden">
                <img src="/logo.jpg" alt="Logo Teh Cap Poci" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-black text-xs sm:text-base md:text-lg lg:text-xl tracking-tight text-white whitespace-nowrap">
                    TEH CAP POCI
                  </h1>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-slate-950 uppercase shrink-0">
                    Multi-Kedai
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200 font-mono truncate hidden md:block">
                  Central Kitchen Strict BOM POS Terminal
                </p>
              </div>
            </div>

            {/* Tombol Pengeluaran, Tutup Shift & Admin Cepat di Mobile & Tablet (<lg) */}
            <div className="flex lg:hidden items-center space-x-1 sm:space-x-1.5 shrink-0">
              <button
                type="button"
                disabled={currentOutletObj?.shift_status !== "closed"}
                onClick={() => openOpeningModal()}
                className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition shadow-2xs ${
                  currentOutletObj?.shift_status === "closed"
                    ? "bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300 animate-pulse font-extrabold cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-emerald-950/40 text-emerald-300/70 border border-emerald-800/40 shadow-none"
                }`}
                title={
                  currentOutletObj?.shift_status === "closed"
                    ? "Shift tutup. Klik untuk Buka Shift / Opening Kedai"
                    : "Shift sudah dibuka (Sedang Aktif)"
                }
              >
                <Sunrise className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buka Shift</span>
                <span className="sm:hidden">Buka</span>
              </button>

              <button
                type="button"
                disabled={currentOutletObj?.shift_status === "closed"}
                onClick={() => {
                  setExpenseMessage(null);
                  setIsExpenseModalOpen(true);
                  loadTodayExpenses();
                }}
                className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition shadow-2xs ${
                  currentOutletObj?.shift_status === "closed"
                    ? "opacity-40 cursor-not-allowed bg-amber-950/40 text-amber-300/60 border border-amber-800/40 shadow-none"
                    : "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
                }`}
                title={
                  currentOutletObj?.shift_status === "closed"
                    ? "Buka shift terlebih dahulu untuk mencatat pengeluaran"
                    : "Catat Pengeluaran (+ Beban)"
                }
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Pengeluaran</span>
                <span className="sm:hidden">Beban</span>
              </button>

              {currentOutletObj?.shift_status === "closed" ? (
                <button
                  type="button"
                  disabled
                  className="opacity-40 cursor-not-allowed bg-emerald-950/40 text-emerald-300/60 border border-emerald-800/40 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center space-x-1 shadow-none"
                  title="Shift belum dibuka. Buka shift terlebih dahulu sebelum dapat menutup shift."
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tutup Shift</span>
                  <span className="sm:hidden">Shift</span>
                </button>
              ) : (
                <Link
                  href="/closing"
                  className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-2xs"
                  title="Tutup Shift (Blind Count)"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tutup Shift</span>
                  <span className="sm:hidden">Shift</span>
                </Link>
              )}
            </div>
          </div>

          {/* Row 2 di Mobile & Tablet (<lg) / Sisi Kanan di Desktop (lg+) */}
          <div className="flex items-center justify-between lg:justify-end gap-1.5 sm:gap-2 flex-nowrap min-w-0">
            {/* Selector Kedai / Outlet */}
            <div className="flex-1 sm:flex-initial flex items-center bg-emerald-950/80 border border-emerald-600/50 rounded-lg sm:rounded-xl px-2 py-1 text-xs min-w-0 max-w-[170px] xs:max-w-[220px] sm:max-w-[280px] lg:max-w-none">
              <Store className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
              <select
                value={selectedOutletId || outlets[0]?.id || ""}
                onChange={(e) => handleOutletChange(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1 w-full truncate"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id} className="text-slate-900 font-semibold">
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Online/Offline */}
            <div
              className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-full text-[10px] sm:text-[11px] font-semibold shadow-2xs shrink-0 transition ${
                isOnline
                  ? "bg-emerald-950/70 text-emerald-200 border border-emerald-600/50"
                  : "bg-rose-950/90 text-rose-200 border border-rose-500 animate-pulse"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {pendingSyncCount > 0 && (
              <button
                onClick={handleSync}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg sm:rounded-full text-[10px] font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 transition shadow shrink-0"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Sync ({pendingSyncCount})</span>
              </button>
            )}

            {/* Desktop Only Links (lg+) */}
            <div className="hidden lg:flex items-center space-x-2 shrink-0">
              <button
                type="button"
                disabled={currentOutletObj?.shift_status !== "closed"}
                onClick={() => openOpeningModal()}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  currentOutletObj?.shift_status === "closed"
                    ? "bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300 animate-pulse font-extrabold cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-emerald-950/40 text-emerald-300/70 border border-emerald-800/40 shadow-none"
                }`}
                title={
                  currentOutletObj?.shift_status === "closed"
                    ? "Shift tutup. Klik untuk Buka Shift / Opening Kedai (Refresh Stok & Uang Cash Dibawa)"
                    : "Shift sudah dibuka (Sedang Aktif)"
                }
              >
                <Sunrise className="w-3.5 h-3.5" />
                <span>Buka Shift</span>
              </button>

              <button
                type="button"
                disabled={currentOutletObj?.shift_status === "closed"}
                onClick={() => {
                  setExpenseMessage(null);
                  setIsExpenseModalOpen(true);
                  loadTodayExpenses();
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  currentOutletObj?.shift_status === "closed"
                    ? "opacity-40 cursor-not-allowed bg-amber-950/40 text-amber-300/60 border border-amber-800/40 shadow-none"
                    : "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
                }`}
                title={
                  currentOutletObj?.shift_status === "closed"
                    ? "Buka shift terlebih dahulu untuk mencatat pengeluaran"
                    : "Catat Pengeluaran Kedai (Es Batu, Gas LPG, Sedotan, dll)"
                }
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>+ Pengeluaran (Es, Gas)</span>
              </button>

              {currentOutletObj?.shift_status === "closed" ? (
                <button
                  type="button"
                  disabled
                  className="opacity-40 cursor-not-allowed bg-emerald-950/40 text-emerald-300/60 border border-emerald-800/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 shadow-none"
                  title="Shift belum dibuka. Buka shift terlebih dahulu sebelum dapat menutup shift."
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Tutup Shift</span>
                </button>
              ) : (
                <Link
                  href="/closing"
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-sm"
                  title="Tutup Shift (Blind Count)"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Tutup Shift</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
        {/* Left Column: Menu Catalog */}
        <div className="lg:col-span-8 flex flex-col space-y-3 sm:space-y-4">
          {/* Banner Peringatan jika Shift Kedai Masih Tutup */}
          {currentOutletObj?.shift_status === "closed" && (
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
                  🌅
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Shift Kedai Ini Belum Dibuka (Tutup Shift Selesai)</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">Tutup</span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                    Silakan lakukan <strong>Opening Kedai</strong> untuk mengecek stok awal &amp; memasukkan modal uang cash yang dibawa kasir.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openOpeningModal()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition shrink-0 flex items-center justify-center gap-1.5"
              >
                <Sunrise className="w-4 h-4" />
                <span>Buka Kedai / Opening Shift</span>
              </button>
            </div>
          )}
          {/* Quick Booth Live Stock Bar & Penjualan Hari Ini */}
          <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-xs border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 min-w-0">
                <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Stok &amp; Kas ({currentOutletObj?.name}):</span>
              </div>
            </div>

            {/* Grid 2 Kolom di Mobile 320px, Inline Flex di Tablet & Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono">
              <div className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold border border-slate-200 flex items-center justify-between sm:justify-start gap-1">
                <span className="text-slate-500">Cup Reg:</span>
                <strong className={cupRegMaterial && cupRegMaterial.current_stock < 20 ? "text-rose-600" : "text-emerald-700"}>
                  {cupRegMaterial ? Math.max(0, Math.round(cupRegMaterial.current_stock)) : 0} pcs
                </strong>
              </div>

              <div className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold border border-slate-200 flex items-center justify-between sm:justify-start gap-1">
                <span className="text-slate-500">Cup Jumbo:</span>
                <strong className={cupJumboMaterial && cupJumboMaterial.current_stock < 20 ? "text-rose-600" : "text-emerald-700"}>
                  {cupJumboMaterial ? Math.max(0, Math.round(cupJumboMaterial.current_stock)) : 0} pcs
                </strong>
              </div>

              {/* Sisa Teh Dispenser (Batch 8L) */}
              <button
                type="button"
                onClick={() => setIsBrewModalOpen(true)}
                title={`Sisa Teh Dispenser: ${(brewLiquidMl / 1000).toFixed(1)}L / 8L (${Math.round(brewLiquidMl)} ml) - Klik untuk kelola seduhan`}
                className={`col-span-2 sm:col-span-1 px-2 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center justify-between sm:justify-start gap-1.5 transition cursor-pointer shadow-2xs ${
                  brewLiquidMl <= 1500
                    ? "bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse"
                    : brewLiquidMl <= 3000
                    ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="text-xs">🫖</span>
                  <span className="text-slate-500">Dispenser:</span>
                </span>
                <strong className={brewLiquidMl <= 1500 ? "text-rose-700" : brewLiquidMl <= 3000 ? "text-amber-800" : "text-emerald-700"}>
                  {(brewLiquidMl / 1000).toFixed(1)}L
                </strong>
                {brewLiquidMl <= 3000 && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-black uppercase text-white ${
                    brewLiquidMl <= 1500 ? "bg-rose-600 animate-bounce" : "bg-amber-600"
                  }`}>
                    Re-Brew!
                  </span>
                )}
              </button>

              {/* Cup Terjual Hari Ini */}
              <div className="px-2 py-1 bg-emerald-50 rounded-lg text-emerald-900 font-bold border border-emerald-300 flex items-center justify-between sm:justify-start gap-1 shadow-2xs">
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShoppingBag className="w-3 h-3 shrink-0" />
                  <span>Terjual:</span>
                </span>
                <strong>{todayCupsSold} cup</strong>
              </div>

              {/* Uang Cash di Kedai (Modal Cash Dibawa + Transaksi Cash - Kas Keluar) */}
              <div
                title={`Total Uang Cash Fisik di Laci Booth: Modal Awal Dibawa (Rp ${initialCash.toLocaleString("id-ID")}) + Penjualan Tunai Masuk (Rp ${todayCashIn.toLocaleString("id-ID")}) - Kas Keluar (Rp ${todayExpenseTotal.toLocaleString("id-ID")}) = Rp ${currentCashBalance.toLocaleString("id-ID")}`}
                className="px-2 py-1 bg-teal-50 rounded-lg text-teal-950 font-bold border border-teal-300 flex items-center justify-between sm:justify-start gap-1.5 shadow-2xs"
              >
                <span className="flex items-center gap-1 text-teal-700">
                  <Banknote className="w-3.5 h-3.5 shrink-0" />
                  <span>Kas di Laci:</span>
                </span>
                <div className="flex items-baseline gap-1">
                  <strong className={currentCashBalance < 0 ? "text-rose-600" : "text-teal-950"}>
                    Rp {currentCashBalance.toLocaleString("id-ID")}
                  </strong>
                  <span className="text-[10px] text-teal-700/80 font-normal hidden lg:inline">
                    (Modal {Math.round(initialCash / 1000)}k + Tunai {Math.round(todayCashIn / 1000)}k)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExpenseMessage(null);
                  setIsExpenseModalOpen(true);
                  loadTodayExpenses();
                }}
                className="col-span-2 sm:col-span-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] sm:text-xs font-bold border border-amber-300 flex items-center justify-between sm:justify-start gap-2 transition cursor-pointer shadow-2xs"
                title="Catat pengeluaran tunai booth (Es, Gas, Galon, dll)"
              >
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Kas Keluar: <strong>Rp {todayExpenseTotal.toLocaleString("id-ID")}</strong></span>
                </span>
                <span className="text-[10px] text-amber-700 underline font-semibold sm:hidden">+ Beban</span>
              </button>
            </div>
          </div>

          {/* Pantun Semangat Karyawan & Progress (Compact & Collapsible) */}
          {(() => {
            const isTargetReached = todayCupsSold >= dailyTargetCups;
            const progressPercent = Math.min(100, Math.round((todayCupsSold / (dailyTargetCups || 1)) * 100));

            return (
              <div
                className={`rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 border transition-all ${
                  isTargetReached
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-xs"
                    : "bg-gradient-to-r from-amber-50/95 via-orange-50/90 to-amber-100/90 border-amber-200 text-slate-800 shadow-2xs"
                }`}
              >
                {/* Header 1 Baris Ramping: Progress + Teks Pantun Singkat + Aksi */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`text-[11px] sm:text-xs font-black shrink-0 ${
                        isTargetReached ? "text-emerald-100" : "text-amber-950"
                      }`}
                    >
                      {isTargetReached
                        ? `🎉 ${todayCupsSold}/${dailyTargetCups} Cup!`
                        : `Target: ${todayCupsSold}/${dailyTargetCups} (${progressPercent}%)`}
                    </span>

                    {/* Progress Bar Mini Inline */}
                    <div className="w-16 sm:w-24 bg-black/10 rounded-full h-1.5 overflow-hidden shrink-0 hidden xs:block">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isTargetReached ? "bg-white" : "bg-gradient-to-r from-amber-500 to-orange-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Cuplikan Pantun 1 Baris (Truncated jika collapsed) */}
                    <p
                      className={`text-[11px] italic font-semibold truncate flex-1 min-w-0 ${
                        isTargetReached ? "text-white/95" : "text-amber-900"
                      }`}
                      title={pantunText}
                    >
                      “{(pantunText || "Semangat jualan es teh hari ini!").replace(/\n/g, " ")}”
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isPantunLoading}
                      onClick={() => fetchPantun(true)}
                      title="Acak pantun berima baru dari Gemini AI"
                      className="p-1 sm:px-2 sm:py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1 transition cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Dices className={`w-3 h-3 text-amber-700 ${isPantunLoading ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">{isPantunLoading ? "Menulis..." : "Acak"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !isPantunCollapsed;
                        setIsPantunCollapsed(next);
                        try {
                          localStorage.setItem("poci_pantun_collapsed", String(next));
                        } catch {}
                      }}
                      title={isPantunCollapsed ? "Buka teks pantun lengkap" : "Kecilkan banner pantun"}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-black/5 transition cursor-pointer"
                    >
                      {isPantunCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Teks Pantun Penuh (Hanya Tampil jika Tidak Di-collapse) */}
                {!isPantunCollapsed && (
                  <div className="mt-1.5 pt-1.5 border-t border-black/5 animate-in fade-in duration-150">
                    <p
                      className={`text-[11px] sm:text-xs font-bold whitespace-pre-line leading-relaxed italic ${
                        isTargetReached ? "text-white" : "text-amber-950"
                      }`}
                    >
                      “{pantunText || "Makan bakso kuahnya pedas,\nEs batu kristal dinginnya pas!\nTinggal beberapa cup kerja cerdas,\nRezeki berkah mengalir deras! 🧊🔥"}”
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Mobile Cart Sentinel / Anchor untuk deteksi posisi scroll */}
          <div ref={cartAnchorRef} className={`block lg:hidden ${isStickyMobileCart ? "h-16" : "h-0"}`} />

          {/* Mobile Cart Accordion (Sticky ke Atas Layar saat Scroll Down, Kembali ke Bawah Stok Live saat Scroll Up) */}
          <div
            className={`block lg:hidden transition-all duration-200 ${
              isStickyMobileCart
                ? "fixed top-2 left-3 right-3 sm:left-6 sm:right-6 max-w-7xl mx-auto z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-300 animate-in fade-in slide-in-from-top-1"
                : "bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            }`}
          >
            {/* Header Accordion Bar (Selalu Tampil) */}
            <div
              onClick={() => setIsMobileCartOpen(!isMobileCartOpen)}
              className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50/80 active:bg-slate-100 select-none transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  {/* Little Item Counter Badge on Icon */}
                  {totalCupsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow">
                      {totalCupsCount}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      Pesanan Aktif ({currentOutletObj?.code})
                    </span>
                  </div>

                  {/* Little Item Counter & Status Notification */}
                  <div className="mt-0.5">
                    {cart.length === 0 ? (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Keranjang kosong
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                          {totalCupsCount} cup
                        </span>
                        <span className="font-mono text-emerald-800 text-xs font-black">
                          {formatRupiah(totalAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Quick Indicator & Animated Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                {cart.length > 0 && !isMobileCartOpen && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    Buka Kasir ➔
                  </span>
                )}
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isMobileCartOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Accordion Body: Rincian Keranjang & Tombol Checkout */}
            {isMobileCartOpen && (
              <div className="border-t border-slate-100 p-3.5 bg-slate-50/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Reset button bar if items exist */}
                {cart.length > 0 && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Daftar Pesanan ({cart.length} item)
                    </span>
                    <button
                      onClick={clearCart}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Kosongkan
                    </button>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="py-5 text-center text-slate-400">
                      <ShoppingBag className="w-8 h-8 mx-auto stroke-1 text-slate-300 mb-1" />
                      <p className="text-xs font-medium">Keranjang masih kosong</p>
                      <p className="text-[10px] text-slate-400">
                        Pilih menu di bawah untuk menambahkan pesanan
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-2 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-xs text-slate-900 truncate">
                                {formatProductName(item.product.name)}
                              </h4>
                              {item.isPromoFree && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shrink-0">
                                  PROMO GRATIS
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono mt-0.5">
                              {item.isPromoFree ? (
                                <>
                                  <span className="line-through text-slate-400 mr-1.5">{formatRupiah(item.product.price)}</span>
                                  <span className="text-emerald-700 font-black">Rp 0 (GRATIS)</span>
                                </>
                              ) : (
                                <span className="text-emerald-700 font-semibold">{formatRupiah(item.product.price)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 active:scale-90 transition font-black shadow-2xs cursor-pointer"
                              title="Kurangi 1 cup"
                            >
                              <Minus className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            <span className="w-6 text-center font-mono font-black text-xs text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.isPromoFree}
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white active:scale-90 transition font-black shadow-2xs cursor-pointer disabled:opacity-40"
                              title="Tambah 1 cup"
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>

                        {/* Opsi Porsi Gula Cair: Normal / Less Sugar / Tawar (Finger-Friendly Touch) */}
                        {!item.product.name.includes("Topping") && !item.isPromoFree && (
                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-bold">Porsi Gula:</span>
                              <span className="text-[10px] text-slate-400 font-mono font-bold">
                                {item.sugarLevel === "tawar" ? "0% Gula (Tawar)" : item.sugarLevel === "less" ? "50% Gula (Less)" : "100% Gula (Normal)"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => updateSugarLevel(item.id, "normal")}
                                className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center active:scale-95 ${
                                  item.sugarLevel === "normal" || !item.sugarLevel
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Normal
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSugarLevel(item.id, "less")}
                                className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center active:scale-95 ${
                                  item.sugarLevel === "less"
                                    ? "bg-amber-500 text-white shadow-xs"
                                    : "bg-white text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Less (50%)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSugarLevel(item.id, "tawar")}
                                className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center active:scale-95 ${
                                  item.sugarLevel === "tawar"
                                    ? "bg-slate-800 text-white shadow-xs"
                                    : "bg-white text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Tawar (0%)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Kolom Catatan Permintaan Khusus */}
                        {!item.isPromoFree && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {[
                                { label: "Es Sedikit", tag: "Es Sedikit" },
                                { label: "Tanpa Es", tag: "Tanpa Es" },
                                { label: "Es Banyak", tag: "Es Banyak" },
                                { label: "Pisah Es", tag: "Pisah Es" },
                                ...(item.product.name.includes("Topping")
                                  ? []
                                  : [{ label: "Tanpa Topping", tag: "Tanpa Topping" }]),
                              ].map((chip) => {
                                const isActive = item.notes?.includes(chip.tag);
                                return (
                                  <button
                                    key={chip.tag}
                                    type="button"
                                    onClick={() => toggleQuickNote(item.id, chip.tag)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer active:scale-95 ${
                                      isActive
                                        ? "bg-emerald-600 border-emerald-700 text-white shadow-2xs"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    {chip.label}
                                  </button>
                                );
                              })}
                            </div>
                            <input
                              type="text"
                              placeholder="Catatan khusus (es sedikit, tanpa topping, dll)..."
                              value={item.notes || ""}
                              onChange={(e) => updateItemNotes(item.id, e.target.value)}
                              className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400 font-medium"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Banner Promo Otomatis Mobile */}
                {cart.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    {isPromoApplied ? (
                      <div className="p-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold shadow-2xs">
                        <span className="flex items-center gap-1.5">
                          <span>🎉</span>
                          <span>
                            Promo Otomatis: Gratis {cart.find((i) => i.isPromoFree)?.quantity || 1} Teh Ori Jumbo!
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shrink-0">
                          Otomatis
                        </span>
                      </div>
                    ) : flavoredTeaCount === 1 ? (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                        <span>💡</span>
                        <span>
                          Tambah <strong>1 Teh Varian Rasa</strong> lagi untuk dapat bonus <strong>1 Teh Ori Jumbo GRATIS</strong> otomatis!
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Promo: Beli 2 Varian Rasa Gratis 1 Teh Ori Jumbo</span>
                        <span className="font-bold text-slate-700">({flavoredTeaCount}/2 Cup)</span>
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Kode Diskon / Promo"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyPromoCode();
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromoCode()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                      >
                        Terapkan
                      </button>
                    </div>
                    {promoMessage && (
                      <p className={`text-[11px] font-bold ${promoMessage.type === "success" ? "text-emerald-700" : "text-rose-600"}`}>
                        {promoMessage.text}
                      </p>
                    )}
                  </div>
                )}

                {/* Summary & Action Buttons */}
                <div className="pt-2.5 border-t border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 font-semibold">
                      Total ({totalCupsCount} cup):
                    </span>
                    <span className="text-lg font-black text-emerald-800 font-mono">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        setPaymentMethod("Cash");
                        setCashReceivedInput(String(totalAmount));
                        setIsCheckoutModalOpen(true);
                      }}
                      className="py-3 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl shadow text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                    >
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      Bayar Tunai
                    </button>

                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        setPaymentMethod("QRIS");
                        setIsCheckoutModalOpen(true);
                      }}
                      className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl shadow text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      Bayar QRIS
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toast Peringatan Stok */}
          {stockAlertMessage && (
            <div className="p-3 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-center justify-between gap-3 text-rose-800 text-xs font-bold shadow-md animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="text-base">⛔</span>
                <span>{stockAlertMessage}</span>
              </div>
              <button
                onClick={() => setStockAlertMessage(null)}
                className="text-rose-600 hover:text-rose-900 font-black text-sm px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Toast Sukses Re-Brewing / Isi Ulang Teh */}
          {brewSuccessToast && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-center justify-between gap-3 text-emerald-950 text-xs font-bold shadow-md animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="text-base">🫖</span>
                <span>{brewSuccessToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setBrewSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-950 font-black text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Banner Notifikasi Re-Brewing (Peringatan saat Sisa Teh Dispenser <= 3.000 ml / 2-3 Liter) */}
          {brewLiquidMl <= 3000 && !isBrewAlertDismissed && (
            <div
              className={`rounded-2xl p-3.5 sm:p-4 border transition-all animate-in fade-in slide-in-from-top-2 ${
                brewLiquidMl <= 1500
                  ? "bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white border-rose-500 shadow-lg shadow-rose-600/30 ring-2 ring-rose-400"
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/25"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0 border border-white/30 shadow-inner">
                    🫖
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-slate-900 shadow-xs">
                        {brewLiquidMl <= 1500 ? "🚨 SANGAT KRITIS" : "⚠️ PERINGATAN RE-BREWING"}
                      </span>
                      <span className="text-xs font-mono font-bold text-white/95">
                        Sisa {(brewLiquidMl / 1000).toFixed(1)} Liter ({Math.round(brewLiquidMl)} ml / 8.000 ml)
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black tracking-tight text-white mt-1">
                      {brewLiquidMl <= 1500
                        ? "Teh di Dispenser Barrel Hampir Habis! Segera Isi Ulang"
                        : "Waktunya Re-Brewing! Mulai Rebus Air 8L Sekarang"}
                    </h3>

                    <p className="text-xs text-white/95 mt-1 leading-snug">
                      Sisa teh cukup untuk{" "}
                      <strong>~{Math.floor(brewLiquidMl / 250)} cup Jumbo</strong> (250 ml) atau{" "}
                      <strong>~{Math.floor(brewLiquidMl / 180)} cup Reguler</strong> (180 ml).
                      Estimasi waktu merebus &amp; mendinginkan 8L teh adalah <strong>~50–60 menit</strong>. Masak air sekarang agar tidak kehabisan stok saat antrean!
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi di Banner */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRefillBrewBatch(8000)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    title="Klik jika batch teh 8L baru sudah selesai diseduh dan dituang ke dispenser"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Selesai Brew (Isi 8L)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBrewModalOpen(true)}
                    className="px-2.5 py-2 bg-black/20 hover:bg-black/30 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Buka panduan & sesuaikan volume teh"
                  >
                    <span>Atur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBrewAlertDismissed(true)}
                    className="p-2 bg-black/10 hover:bg-black/20 text-white/80 hover:text-white rounded-xl transition cursor-pointer"
                    title="Sembunyikan sementara (air sedang direbus)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Visual Mini Progress Bar */}
              <div className="mt-2.5 w-full bg-black/25 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, (brewLiquidMl / 8000) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Search & Category Pills */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari varian es teh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Hapus teks pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  activeCategory === "all"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                Semua Menu ({groupedFlavors.length})
              </button>
              <button
                onClick={() => setActiveCategory("original")}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  activeCategory === "original"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                🍃 Original &amp; Aroma ({groupedFlavors.filter((f) => f.meta.category === "original").length})
              </button>
              <button
                onClick={() => setActiveCategory("fruity")}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  activeCategory === "fruity"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                🍓 Fruit Series ({groupedFlavors.filter((f) => f.meta.category === "fruity").length})
              </button>
              <button
                onClick={() => setActiveCategory("milky")}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  activeCategory === "milky"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                🧋 Milky &amp; Choco ({groupedFlavors.filter((f) => f.meta.category === "milky").length})
              </button>
            </div>
          </div>

          {/* Grid Menu Padat & Ringkas (4 Kolom di Desktop agar Tidak Scroll) */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredFlavors.map((item) => {
                const { baseName, meta, reguler, jumbo } = item;

                // Produk default untuk kartu single-size (Jumbo atau Reguler atau Topping)
                const defaultProd = jumbo || reguler || item.single;
                const checkDefault = defaultProd ? checkCanAddProduct(defaultProd, 1) : { canAdd: false };
                const isSingleSize = (!reguler && jumbo) || (reguler && !jumbo) || (!reguler && !jumbo && item.single);

                return (
                  <div
                    key={baseName}
                    onClick={() => {
                      // Seluruh kartu bisa diketuk langsung untuk menu 1 ukuran
                      if (isSingleSize && defaultProd && checkDefault.canAdd) {
                        addToCart(defaultProd);
                      }
                    }}
                    className={`bg-white rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-md border border-slate-200/90 flex flex-col justify-between relative overflow-hidden transition select-none ${
                      isSingleSize && checkDefault.canAdd
                        ? "cursor-pointer active:scale-[0.98] hover:border-emerald-500"
                        : ""
                    }`}
                  >
                    {baseName.toLowerCase().includes("jasmine") ? (
                      <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-2xs flex items-center gap-0.5">
                        <span>⭐</span>
                        <span>Utama</span>
                      </div>
                    ) : null}

                    <div>
                      <div className="flex items-center space-x-2 sm:space-x-2.5 mb-2">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${meta.circleBg} text-white flex items-center justify-center text-base sm:text-lg shadow-inner flex-shrink-0`}
                        >
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1 pr-6">
                          <span className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-bold ${meta.badgeBg} ${meta.badgeText}`}>
                            {meta.category === "original"
                              ? "Original"
                              : meta.category === "milky"
                              ? "Milky"
                              : "Fruit"}
                          </span>
                          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight mt-0.5 truncate" title={baseName}>
                            {baseName}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Action Area: Dual Size (Jasmine) vs Single Size (15 Varian Jumbo / Topping) */}
                    {reguler && jumbo ? (
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100">
                        {(() => {
                          const checkReg = checkCanAddProduct(reguler, 1);
                          const isDisabled = !checkReg.canAdd;
                          return (
                            <button
                              type="button"
                              disabled={isDisabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(reguler);
                              }}
                              title={isDisabled ? checkReg.reason : "Tambah Reguler"}
                              className={`py-1 px-1.5 rounded-lg font-bold transition flex flex-col items-center justify-center border text-center ${
                                isDisabled
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                  : "bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 border-slate-200 active:scale-95 cursor-pointer"
                              }`}
                            >
                              <span className="text-[9px]">{isDisabled ? "Habis" : "Reguler"}</span>
                              <span className={`text-[10px] sm:text-xs font-mono font-black ${isDisabled ? "text-slate-400 line-through" : "text-emerald-800 hover:text-white"}`}>
                                {formatRupiah(reguler.price)}
                              </span>
                            </button>
                          );
                        })()}

                        {(() => {
                          const checkJumbo = checkCanAddProduct(jumbo, 1);
                          const isDisabled = !checkJumbo.canAdd;
                          return (
                            <button
                              type="button"
                              disabled={isDisabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(jumbo);
                              }}
                              title={isDisabled ? checkJumbo.reason : "Tambah Jumbo"}
                              className={`py-1 px-1.5 rounded-lg font-bold transition flex flex-col items-center justify-center border text-center ${
                                isDisabled
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                  : "bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-900 border-emerald-200 active:scale-95 cursor-pointer"
                              }`}
                            >
                              <span className="text-[9px]">{isDisabled ? "Habis" : "Jumbo"}</span>
                              <span className={`text-[10px] sm:text-xs font-mono font-black ${isDisabled ? "text-slate-400 line-through" : "text-emerald-900 hover:text-white"}`}>
                                {formatRupiah(jumbo.price)}
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    ) : (
                      // Single Size (Semua varian rasa jumbo & topping) - Tap Anywhere & Quick Add Bar
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div>
                          <span className={`text-xs sm:text-sm font-mono font-black ${!checkDefault.canAdd ? "text-slate-400 line-through" : "text-emerald-800"}`}>
                            {defaultProd ? formatRupiah(defaultProd.price) : "-"}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={!checkDefault.canAdd}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (defaultProd) addToCart(defaultProd);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold transition flex items-center gap-1 ${
                            !checkDefault.canAdd
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95 cursor-pointer"
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{!checkDefault.canAdd ? "Habis" : "Pesan"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Cart & Checkout (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-700" />
                  <h2 className="font-bold text-slate-900 text-base">
                    Pesanan Aktif ({currentOutletObj?.code})
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>

              {/* Cart List */}
              <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
                    <p className="text-sm font-medium">Keranjang masih kosong</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Sentuh pilihan menu di samping untuk menambahkan cup
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-xs text-slate-900 leading-tight">
                              {formatProductName(item.product.name)}
                            </h4>
                            {item.isPromoFree && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shrink-0">
                                PROMO GRATIS
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono mt-0.5">
                            {item.isPromoFree ? (
                              <>
                                <span className="line-through text-slate-400 mr-1 text-[11px]">{formatRupiah(item.product.price)}</span>
                                <span className="text-emerald-700 font-black">Rp 0 (GRATIS)</span>
                              </>
                            ) : (
                              <span className="text-emerald-700 font-semibold">{formatRupiah(item.product.price)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 active:scale-90 transition font-black shadow-2xs cursor-pointer"
                            title="Kurangi 1 cup"
                          >
                            <Minus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <span className="w-7 text-center font-mono font-black text-xs text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={item.isPromoFree}
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white active:scale-90 transition font-black shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Tambah 1 cup"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      {/* Opsi Porsi Gula Cair: Normal / Less Sugar / Tawar (Finger-Friendly Touch) */}
                      {!item.product.name.includes("Topping") && !item.isPromoFree && (
                        <div className="pt-2 border-t border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-bold">Porsi Gula:</span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {item.sugarLevel === "tawar" ? "0% Gula (Tawar)" : item.sugarLevel === "less" ? "50% Gula (Less)" : "100% Gula (Normal)"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateSugarLevel(item.id, "normal")}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center active:scale-95 ${
                                item.sugarLevel === "normal" || !item.sugarLevel
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-white text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Normal
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSugarLevel(item.id, "less")}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center active:scale-95 ${
                                item.sugarLevel === "less"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-white text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Less (50%)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSugarLevel(item.id, "tawar")}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center active:scale-95 ${
                                item.sugarLevel === "tawar"
                                  ? "bg-slate-800 text-white shadow-xs"
                                  : "bg-white text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Tawar (0%)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Kolom Catatan Permintaan Khusus */}
                      {!item.isPromoFree && (
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {[
                              { label: "Es Sedikit", tag: "Es Sedikit" },
                              { label: "Tanpa Es", tag: "Tanpa Es" },
                              { label: "Es Banyak", tag: "Es Banyak" },
                              { label: "Pisah Es", tag: "Pisah Es" },
                              ...(item.product.name.includes("Topping")
                                ? []
                                : [{ label: "Tanpa Topping", tag: "Tanpa Topping" }]),
                            ].map((chip) => {
                              const isActive = item.notes?.includes(chip.tag);
                              return (
                                <button
                                  key={chip.tag}
                                  type="button"
                                  onClick={() => toggleQuickNote(item.id, chip.tag)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer active:scale-95 ${
                                    isActive
                                      ? "bg-emerald-600 border-emerald-700 text-white shadow-2xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {chip.label}
                                </button>
                              );
                            })}
                          </div>
                          <input
                            type="text"
                            placeholder="Catatan lain (cth: es sedikit, pisah cup)..."
                            value={item.notes || ""}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                            className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400 font-medium"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Banner Promo Otomatis Desktop */}
              {cart.length > 0 && (
                <div className="mt-4 space-y-2 pt-3 border-t border-slate-100">
                  {isPromoApplied ? (
                    <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold shadow-2xs">
                      <span className="flex items-center gap-1.5">
                        <span className="text-base">🎉</span>
                        <span>
                          Promo Otomatis: Gratis {cart.find((i) => i.isPromoFree)?.quantity || 1} Teh Ori Jumbo!
                        </span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shrink-0">
                        Otomatis Aktif
                      </span>
                    </div>
                  ) : flavoredTeaCount === 1 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium flex items-center gap-2">
                      <span className="text-base shrink-0">💡</span>
                      <span>
                        Tambah <strong>1 Teh Varian Rasa</strong> lagi untuk dapat bonus <strong>1 Teh Ori Jumbo GRATIS</strong> otomatis!
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Promo: Beli 2 Varian Rasa Gratis 1 Teh Ori Jumbo</span>
                      <span className="font-bold text-slate-700">({flavoredTeaCount}/2 Cup)</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Kode Diskon / Promo"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyPromoCode();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromoCode()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                      >
                        Terapkan
                      </button>
                    </div>
                    {promoMessage && (
                      <p className={`text-[11px] font-bold ${promoMessage.type === "success" ? "text-emerald-700" : "text-rose-600"}`}>
                        {promoMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Summary & Checkout Action */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total Cup Minuman</span>
                  <span className="font-mono font-bold text-slate-800">
                    {totalCupsCount} cup
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1">
                  <span>Total Tagihan:</span>
                  <span className="text-xl font-black text-emerald-800 font-mono">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => {
                    setPaymentMethod("Cash");
                    setCashReceivedInput(String(totalAmount));
                    setIsCheckoutModalOpen(true);
                  }}
                  className="py-3.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98] cursor-pointer"
                >
                  <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  <span>Bayar Tunai</span>
                </button>

                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => {
                    setPaymentMethod("QRIS");
                    setIsCheckoutModalOpen(true);
                  }}
                  className="py-3.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98] cursor-pointer"
                >
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span>Bayar QRIS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal QRIS Checkout */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-200">
            {checkoutSuccess ? (
              <div className="py-2 space-y-4 max-h-[85vh] overflow-y-auto px-1">
                {/* Header Status */}
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Pembayaran Berhasil!
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700">
                    {completedReceipt?.outletName} ({completedReceipt?.outletCode})
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {completedReceipt?.isOffline
                      ? "⚡ Transaksi tersimpan ke antrean offline lokal."
                      : "✓ Stok BOM bahan baku kedai dipotong secara real-time."}
                  </p>
                </div>

                {/* Status Pesan Cetak Bluetooth / Warning / Error */}
                {printStatusMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left flex items-start gap-2 shadow-sm transition-all animate-in fade-in duration-150 ${
                      printStatusMessage.type === "warning"
                        ? "bg-amber-50 text-amber-900 border border-amber-300"
                        : printStatusMessage.type === "error"
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    <span className="text-sm shrink-0">
                      {printStatusMessage.type === "warning" ? "⚠️" : printStatusMessage.type === "error" ? "❌" : "✓"}
                    </span>
                    <span className="leading-tight pt-0.5">{printStatusMessage.text}</span>
                  </div>
                )}

                {/* Preview Kertas Struk Thermal (58mm POS Style) */}
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-left font-mono text-[11px] text-slate-800 shadow-inner relative select-none">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-bold tracking-wider font-sans uppercase">
                    Preview 58mm
                  </div>

                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <p className="font-black text-sm text-slate-900 tracking-wider">
                      ES TEH POCI
                    </p>
                    <p className="text-[10px] text-slate-500">Teh Asli, Segar &amp; Nikmat</p>
                    <p className="text-[10px] text-slate-700 font-bold mt-1">
                      {completedReceipt?.outletName}
                    </p>
                    {completedReceipt?.outletAddress && (
                      <p className="text-[9px] text-slate-500">{completedReceipt.outletAddress}</p>
                    )}
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>No. Nota:</span>
                      <span className="font-bold text-slate-900">{completedReceipt?.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Waktu:</span>
                      <span>
                        {completedReceipt &&
                          new Date(completedReceipt.timestamp).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                        {completedReceipt &&
                          new Date(completedReceipt.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kasir:</span>
                      <span>POS Booth Terminal</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                    {completedReceipt?.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-bold text-slate-900">{formatProductName(item.name)}</div>
                        {item.notes && (
                          <div className="text-[10px] text-amber-900 font-sans italic bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60">
                            * Catatan: {item.notes}
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600 text-[10px]">
                          <span>
                            {item.quantity} x {formatRupiah(item.price)}
                          </span>
                          <span className="font-bold text-slate-800">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="py-2 space-y-1 text-slate-700">
                    <div className="flex justify-between font-black text-xs text-slate-950 pt-0.5">
                      <span>TOTAL AKHIR:</span>
                      <span>{formatRupiah(completedReceipt?.totalAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>METODE BAYAR:</span>
                      <span className="font-bold text-emerald-800">
                        {completedReceipt?.paymentMethod} (LUNAS)
                      </span>
                    </div>
                    {completedReceipt?.paymentMethod === "Cash" && completedReceipt?.cashReceived !== undefined && (
                      <>
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>UANG DITERIMA:</span>
                          <span className="font-bold text-slate-800">
                            {formatRupiah(completedReceipt.cashReceived)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          <span>KEMBALIAN:</span>
                          <span className="font-black text-xs font-mono text-emerald-800">
                            {formatRupiah(completedReceipt.cashChange ?? 0)}
                          </span>
                        </div>
                      </>
                    )}
                    {completedReceipt?.isOffline && (
                      <div className="flex justify-between text-[10px] text-amber-700 font-bold">
                        <span>STATUS:</span>
                        <span>[TERCATAT OFFLINE]</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Struk */}
                  <div className="pt-2 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500 space-y-0.5">
                    <p className="font-medium">Terima Kasih Atas Kunjungan Anda! ^_^</p>
                    <p className="text-[8px] text-slate-400">Follow IG: @estehpoci.id</p>
                  </div>
                </div>

                {/* Tombol Aksi Cetak Tunggal & Transaksi Baru Otomatis */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(false)}
                    disabled={isPrintingBt}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-300 text-white font-extrabold rounded-xl shadow text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 shrink-0" />
                    <span>{isPrintingBt ? "Menghubungkan Printer..." : "🖨️ Cetak Struk (Thermal 58mm)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishTransaction}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold rounded-xl shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      ✓ Transaksi Baru Sekarang
                      {autoCloseSeconds !== null && !isTimerPaused && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-slate-700 text-emerald-300 text-[10px] font-mono">
                          {autoCloseSeconds}s
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Pengaturan Mini: Auto-Cetak, Jeda Hitung Mundur, dan Pair BT */}
                  <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      {autoCloseSeconds !== null && (
                        <button
                          type="button"
                          onClick={() => setIsTimerPaused(!isTimerPaused)}
                          className="text-slate-500 hover:text-slate-800 underline font-medium transition cursor-pointer"
                        >
                          {isTimerPaused ? "▶ Lanjutkan Timer" : `⏸ Tahan (${autoCloseSeconds}s)`}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium hover:text-slate-700">
                        <input
                          type="checkbox"
                          checked={autoPrintReceipt}
                          onChange={toggleAutoPrint}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Auto-Cetak</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(true)}
                        className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium transition cursor-pointer"
                        title="Hubungkan atau cari printer via Web Bluetooth"
                      >
                        <Bluetooth className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Pair BT</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Konfirmasi Pembayaran ({currentOutletObj?.code})
                  </span>
                  <button
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    Batal
                  </button>
                </div>

                <div className="my-4">
                  <div className="flex justify-center gap-2 mb-4">
                    <button
                      onClick={() => setPaymentMethod("QRIS")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        paymentMethod === "QRIS"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      QRIS Digital (Utama)
                    </button>
                    <button
                      onClick={() => setPaymentMethod("Cash")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        paymentMethod === "Cash"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      Tunai
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-slate-500">
                    Total Pembayaran
                  </p>
                  <h2 className="text-3xl font-black text-slate-900 font-mono mt-1">
                    {formatRupiah(totalAmount)}
                  </h2>

                  {paymentMethod === "QRIS" ? (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-emerald-300 inline-block w-full">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-2">
                        QRIS - {currentOutletObj?.name}
                      </div>

                      <div className="relative mx-auto w-44 h-44 bg-white p-3 rounded-xl shadow-inner border border-slate-200 flex flex-col items-center justify-center">
                        <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-slate-900 rounded-lg">
                          {Array.from({ length: 36 }).map((_, i) => (
                            <div
                              key={i}
                              className={`${
                                i % 2 === 0 || i % 7 === 0 || i === 15
                                  ? "bg-white"
                                  : "bg-slate-900"
                              } rounded-[2px]`}
                            />
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded shadow">
                            ES TEH POCI
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-3 font-medium">
                        Tunjukkan QRIS ini kepada pelanggan di {currentOutletObj?.name}.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 text-left">
                      {/* Kalkulator Tunai Cepat & Kembalian */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">
                            Uang Diterima dari Pelanggan:
                          </label>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Ketik / Pilih Nominal Cepat
                          </span>
                        </div>

                        {/* Input Nominal Tunai */}
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400 font-mono">
                            Rp
                          </span>
                          <input
                            type="number"
                            min={totalAmount}
                            step="500"
                            value={cashReceivedInput}
                            onChange={(e) => setCashReceivedInput(e.target.value)}
                            placeholder={String(totalAmount)}
                            className="w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Tombol Nominal Cepat: Uang Pas, 10rb, 20rb, 50rb, 100rb */}
                        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setCashReceivedInput(String(totalAmount))}
                            className={`py-2 px-0.5 sm:px-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold border transition cursor-pointer active:scale-95 text-center truncate ${
                              Number(cashReceivedInput) === totalAmount
                                ? "bg-emerald-600 border-emerald-700 text-white shadow-xs"
                                : "bg-white border-slate-200 text-emerald-800 hover:bg-emerald-50"
                            }`}
                          >
                            Uang Pas
                          </button>
                          {[10000, 20000, 50000, 100000].map((amt) => {
                            const isBelow = amt < totalAmount;
                            const isSelected = Number(cashReceivedInput) === amt;
                            return (
                              <button
                                key={amt}
                                type="button"
                                disabled={isBelow}
                                onClick={() => setCashReceivedInput(String(amt))}
                                className={`py-2 px-0.5 sm:px-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold border transition text-center ${
                                  isBelow
                                    ? "bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-emerald-600 border-emerald-700 text-white shadow-xs"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95"
                                }`}
                              >
                                {amt === 100000 ? "100rb" : `${amt / 1000}rb`}
                              </button>
                            );
                          })}
                        </div>

                        {/* Baris Hasil Hitung Kembalian */}
                        {(() => {
                          const val = Number(cashReceivedInput) || 0;
                          const change = val - totalAmount;
                          const isShort = val > 0 && change < 0;

                          return (
                            <div
                              className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                                isShort
                                  ? "bg-rose-50 border-rose-200 text-rose-800"
                                  : change > 0
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                                  : "bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                            >
                              <div className="text-left">
                                <p className="text-[11px] font-bold uppercase tracking-wider">
                                  {isShort ? "Uang Kurang:" : "Kembalian Pelanggan:"}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {isShort
                                    ? `Kurang ${formatRupiah(Math.abs(change))}`
                                    : change === 0
                                    ? "Uang pas (tanpa kembalian)"
                                    : "Kembalikan ke pelanggan"}
                                </p>
                              </div>
                              <span
                                className={`text-xl font-black font-mono tracking-tight ${
                                  isShort
                                    ? "text-rose-600"
                                    : change > 0
                                    ? "text-emerald-700"
                                    : "text-slate-600"
                                }`}
                              >
                                {formatRupiah(Math.max(0, change))}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExecuteCheckout}
                  disabled={isProcessing || (paymentMethod === "Cash" && Number(cashReceivedInput) > 0 && Number(cashReceivedInput) < totalAmount)}
                  className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memproses Transaksi Kedai...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {paymentMethod === "QRIS"
                        ? "Simulasi Pelanggan Sukses Scan QRIS"
                        : Number(cashReceivedInput) > 0 && Number(cashReceivedInput) < totalAmount
                        ? "Nominal Uang Kurang"
                        : "Konfirmasi Uang Tunai Diterima"}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL: PENGELUARAN OPERASIONAL KASIR (ES, GAS, GALON, DLL)     */}
      {/* ============================================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-base shadow-xs">
                  💸
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                    Catat Pengeluaran Kasir
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    {currentOutletObj?.name || "Booth Kasir"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Buttons (Es Batu, Gas, Galon, Sedotan/Kresek, dll) */}
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Pilih Kategori Cepat (1-Klik):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseCategory("es_batu");
                    setExpenseDescription("Beli Es Batu Kristal");
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition flex flex-col gap-1 cursor-pointer ${
                    expenseCategory === "es_batu"
                      ? "bg-sky-50 border-sky-400 text-sky-950 ring-2 ring-sky-300"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">🧊</span>
                  <span className="truncate">Es Batu</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExpenseCategory("gas");
                    setExpenseDescription("Refill Gas LPG 3kg");
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition flex flex-col gap-1 cursor-pointer ${
                    expenseCategory === "gas"
                      ? "bg-orange-50 border-orange-400 text-orange-950 ring-2 ring-orange-300"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">🔥</span>
                  <span className="truncate">Gas LPG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExpenseCategory("air_galon");
                    setExpenseDescription("Beli Air Galon Mineral");
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition flex flex-col gap-1 cursor-pointer ${
                    expenseCategory === "air_galon"
                      ? "bg-blue-50 border-blue-400 text-blue-950 ring-2 ring-blue-300"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">💧</span>
                  <span className="truncate">Air Galon</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExpenseCategory("kemasan");
                    setExpenseDescription("Beli Sedotan & Kantong Kresek");
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition flex flex-col gap-1 cursor-pointer ${
                    expenseCategory === "kemasan"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">🥤</span>
                  <span className="truncate">Sedotan/Kresek</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExpenseCategory("kebersihan");
                    setExpenseDescription("Beli Sabun Cuci & Tissue");
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition flex flex-col gap-1 cursor-pointer ${
                    expenseCategory === "kebersihan"
                      ? "bg-purple-50 border-purple-400 text-purple-950 ring-2 ring-purple-300"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">🧹</span>
                  <span className="truncate">Kebersihan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExpenseCategory("lainnya");
                    setExpenseDescription("");
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition flex flex-col gap-1 cursor-pointer ${
                    expenseCategory === "lainnya"
                      ? "bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-300"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">📦</span>
                  <span className="truncate">Lain-lain</span>
                </button>
              </div>
            </div>

            {/* Form Input */}
            <form onSubmit={handleCreateExpense} className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Keterangan Pengeluaran *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli Es Batu 2 Bal"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Biaya (Rp) *:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    placeholder="Contoh: 20000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-bold text-slate-400">Pilih Cepat:</span>
                  {[5000, 10000, 15000, 20000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setExpenseAmount(String(amt))}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 transition cursor-pointer"
                    >
                      {amt.toLocaleString("id-ID")}
                    </button>
                  ))}
                </div>
              </div>

              {expenseMessage && (
                <p className={`text-xs font-bold text-center py-1 ${expenseMessage.includes("✅") ? "text-emerald-700" : "text-rose-600"}`}>
                  {expenseMessage}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={expenseLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-200 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {expenseLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                  <span>Simpan Biaya</span>
                </button>
              </div>
            </form>

            {/* List Riwayat Kas Keluar Hari Ini */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800">
                  Riwayat Kas Keluar Hari Ini ({todayExpenses.length})
                </span>
                <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  Total: Rp {todayExpenseTotal.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {todayExpenses.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center">
                    Belum ada pengeluaran kas dicatat hari ini
                  </p>
                ) : (
                  todayExpenses.map((exp: any) => (
                    <div
                      key={exp.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{exp.description}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(exp.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • <span className="capitalize">{exp.category}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-700">
                          - Rp {exp.amount.toLocaleString("id-ID")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Hapus Biaya"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUKA TUTUP SHIFT SELESAI */}

      {/* ============================================================== */}
      {/* MODAL: OPENING KEDAI / BUKA SHIFT BARU                         */}
      {/* ============================================================== */}
      {isOpeningModalOpen && currentOutletObj && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs">
                  🌅
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Opening Kedai (Buka Shift)
                  </h3>
                  <p className="text-xs text-emerald-700 font-bold">{currentOutletObj.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="space-y-4 my-4 overflow-y-auto flex-1 pr-1">
              {/* Panduan Ringkas */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>✨</span> Buka Shift &amp; Segarkan Persediaan:
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Periksa uang kas kecil yang Anda bawa dan sesuaikan angka stok fisik kedai saat buka gerai (termasuk jika ada restock pagi).
                </p>
              </div>

              {/* BAGIAN 1: Uang Cash yang Dibawa Kasir */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    1. Uang Cash yang Dibawa (Modal Kas Awal)
                  </label>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-extrabold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={openingCashFloat}
                    onChange={(e) => setOpeningCashFloat(Number(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Contoh: 100000"
                  />
                </div>

                {/* Quick Nominal Buttons */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilihan Cepat:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[0, 50000, 100000, 150000, 200000, 300000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setOpeningCashFloat(amt)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition ${
                          openingCashFloat === amt
                            ? "bg-amber-500 border-amber-600 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {amt === 0 ? "Rp 0" : `Rp ${(amt / 1000).toLocaleString("id-ID")}k`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BAGIAN 2: Ketersediaan Stok Bahan Baku Fisik Kedai */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    2. Verifikasi &amp; Refresh Ketersediaan Stok
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Bisa diedit bila ada restock</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {rawMaterials.map((rm) => {
                    const currentVal = openingStockValues[rm.id] !== undefined
                      ? openingStockValues[rm.id]
                      : rm.current_stock || 0;

                    const isCup = rm.unit.toLowerCase() === "pcs" && rm.name.toLowerCase().includes("cup");
                    const isLiquid = rm.unit.toLowerCase() === "ml";
                    const isSachet = rm.unit.toLowerCase() === "sachet" || rm.name.toLowerCase().includes("sachet") || rm.name.toLowerCase().includes("mix");

                    return (
                      <div
                        key={rm.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {rm.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isCup ? "Gelas saji" : isLiquid ? "Sirup / Gula cair" : isSachet ? "Sachet bubuk rasa" : "Bahan baku"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={currentVal}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setOpeningStockValues({
                                ...openingStockValues,
                                [rm.id]: val,
                              });
                            }}
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] font-bold text-slate-500 w-10 text-left">
                            {rm.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {openingMessage && (
                <p className="text-xs font-bold text-center text-rose-600">{openingMessage}</p>
              )}

              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={openingLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {openingLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sunrise className="w-4 h-4" />
                  )}
                  <span>{openingLoading ? "Membuka Shift..." : "Buka Kedai & Mulai Shift"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Dispenser & Re-Brewing Teh 8L */}
      {isBrewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4 my-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shadow-xs">
                  🫖
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Dispenser &amp; Re-Brewing Teh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kapasitas Standar: 1 Batch = 8.000 ml (8 Liter)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBrewModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Dispenser Saat Ini */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Sisa Teh di Dispenser:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full uppercase ${
                  brewLiquidMl <= 1500
                    ? "bg-rose-100 text-rose-700"
                    : brewLiquidMl <= 3000
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {brewLiquidMl <= 1500 ? "Kritis" : brewLiquidMl <= 3000 ? "Perlu Re-Brew" : "Stok Aman"}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                  {(brewLiquidMl / 1000).toFixed(2)}{" "}
                  <span className="text-sm font-bold text-slate-500">Liter</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-500">
                  {Math.round(brewLiquidMl).toLocaleString("id-ID")} / 8.000 ml ({Math.round((brewLiquidMl / 8000) * 100)}%)
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    brewLiquidMl <= 1500
                      ? "bg-rose-600"
                      : brewLiquidMl <= 3000
                      ? "bg-amber-500"
                      : "bg-emerald-600"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (brewLiquidMl / 8000) * 100))}%` }}
                />
              </div>

              {/* Kalkulasi Per Cup */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Cup Jumbo (250 ml)</span>
                  <span className="text-base font-black font-mono text-emerald-800">
                    ~{Math.floor(brewLiquidMl / 250)} Cup
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Cup Reguler (180 ml)</span>
                  <span className="text-base font-black font-mono text-slate-800">
                    ~{Math.floor(brewLiquidMl / 180)} Cup
                  </span>
                </div>
              </div>
            </div>

            {/* Ringkasan SOP Re-Brewing 8L */}
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1.5">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                <span>⏱️</span>
                <span>SOP Standar Pembuatan 1 Batch (8 Liter): ~50–60 Menit</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1">
                <li><strong>1. Rebus Air (8L)</strong>: 20–30 menit sampai mendidih (100°C).</li>
                <li><strong>2. Ekstraksi / Seduh Teh</strong>: 15 menit, panci tertutup rapat.</li>
                <li><strong>3. Angkat &amp; Tiriskan</strong>: Angkat kantong teh (jangan diperas keras).</li>
                <li><strong>4. Pendinginan Siap Saji</strong>: 15–25 menit (bisa gunakan rendaman ice bath agar cepat suam-suam kuku).</li>
              </ul>
            </div>

            {/* Tombol Aksi Isi Ulang Cepat */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleRefillBrewBatch(8000)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-300" />
                <span>Selesai Seduh Baru (Isi Penuh 8.000 ml / 8L)</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRefillBrewBatch(Math.min(8000, brewLiquidMl + 4000))}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition cursor-pointer"
                >
                  + 4.000 ml (Setengah)
                </button>
                <button
                  type="button"
                  onClick={() => handleRefillBrewBatch(Math.min(8000, brewLiquidMl + 8000))}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition cursor-pointer"
                >
                  + 8.000 ml (Tambah 8L)
                </button>
              </div>
            </div>

            {/* Form Penyesuaian Manual (ml) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Atur Manual Volume Cairan Teh (ml):
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="16000"
                  step="100"
                  value={customBrewInput}
                  onChange={(e) => setCustomBrewInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="Contoh: 8000"
                />
                <button
                  type="button"
                  onClick={() => {
                    const num = Number(customBrewInput);
                    if (isNaN(num) || num < 0) {
                      alert("Masukkan angka volume teh yang valid (minimal 0 ml).");
                      return;
                    }
                    handleRefillBrewBatch(num);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Thermal Print Area (Hanya Muncul Saat window.print() / Browser Print) */}
      {completedReceipt && (
        <div id="thermal-receipt-print-area" className="hidden print:block">
          <div style={{ textAlign: "center", paddingBottom: "4px" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>ES TEH POCI</div>
            <div style={{ fontSize: "10px" }}>Teh Asli, Segar &amp; Nikmat</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "2px" }}>
              {completedReceipt.outletName}
            </div>
            {completedReceipt.outletAddress && (
              <div style={{ fontSize: "9px" }}>{completedReceipt.outletAddress}</div>
            )}
            <div>--------------------------------</div>
          </div>

          <div style={{ fontSize: "10px", lineHeight: "1.3" }}>
            <div>Nota  : {completedReceipt.orderId}</div>
            <div>Waktu : {new Date(completedReceipt.timestamp).toLocaleDateString("id-ID")} {new Date(completedReceipt.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
            <div>Kasir : POS Booth</div>
            <div>--------------------------------</div>
          </div>

          <div style={{ fontSize: "10px", lineHeight: "1.3", marginTop: "4px" }}>
            {completedReceipt.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: "3px" }}>
                <div>{formatProductName(item.name)}</div>
                {item.notes && (
                  <div style={{ fontSize: "9px", fontStyle: "italic", color: "#444" }}>* Catatan: {item.notes}</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{item.quantity}x @{item.price.toLocaleString("id-ID")}</span>
                  <span style={{ fontWeight: "bold" }}>Rp {item.subtotal.toLocaleString("id-ID")}</span>
                </div>
              </div>
            ))}
            <div>================================</div>
          </div>

          <div style={{ fontSize: "10px", lineHeight: "1.4", marginTop: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "11px" }}>
              <span>TOTAL AKHIR:</span>
              <span>Rp {completedReceipt.totalAmount.toLocaleString("id-ID")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>METODE:</span>
              <span>{completedReceipt.paymentMethod} (LUNAS)</span>
            </div>
            {completedReceipt.paymentMethod === "Cash" && completedReceipt.cashReceived !== undefined && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>DITERIMA:</span>
                  <span>Rp {completedReceipt.cashReceived.toLocaleString("id-ID")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>KEMBALI:</span>
                  <span>Rp {(completedReceipt.cashChange ?? 0).toLocaleString("id-ID")}</span>
                </div>
              </>
            )}
            {completedReceipt.isOffline && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>STATUS:</span>
                <span>[OFFLINE RECORD]</span>
              </div>
            )}
            <div>--------------------------------</div>
          </div>

          <div style={{ textAlign: "center", fontSize: "9px", marginTop: "4px" }}>
            <div>Terima Kasih Atas Kunjungan Anda!</div>
            <div>Follow IG: @estehpoci.id</div>
          </div>
        </div>
      )}
    </div>
  );
}
