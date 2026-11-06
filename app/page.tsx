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
  product: Product;
  quantity: number;
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
  "Milk Iced Tea": { baseName: "Milk Iced Tea", category: "milky", circleBg: "bg-amber-500", badgeBg: "bg-amber-100", badgeText: "text-amber-900", icon: "🥛", isNew: true },
  "Chocolate Iced Tea": { baseName: "Chocolate Iced Tea", category: "milky", circleBg: "bg-amber-950", badgeBg: "bg-stone-200", badgeText: "text-stone-900", icon: "🍫" },
  "Lychee Iced Tea": { baseName: "Lychee Iced Tea", category: "fruity", circleBg: "bg-pink-500", badgeBg: "bg-pink-100", badgeText: "text-pink-800", icon: "🍒" },
  "Cappuccino Iced Tea": { baseName: "Cappuccino Iced Tea", category: "milky", circleBg: "bg-amber-800", badgeBg: "bg-amber-100", badgeText: "text-amber-900", icon: "☕" },
  "Guava Iced Tea": { baseName: "Guava Iced Tea", category: "fruity", circleBg: "bg-rose-500", badgeBg: "bg-rose-100", badgeText: "text-rose-800", icon: "🍈" },
  "Mango Iced Tea": { baseName: "Mango Iced Tea", category: "fruity", circleBg: "bg-emerald-500", badgeBg: "bg-amber-100", badgeText: "text-amber-900", icon: "🥭" },
  "Blackcurrant Iced Tea": { baseName: "Blackcurrant Iced Tea", category: "fruity", circleBg: "bg-indigo-600", badgeBg: "bg-indigo-100", badgeText: "text-indigo-900", icon: "🍇" },
  "Apple Iced Tea": { baseName: "Apple Iced Tea", category: "fruity", circleBg: "bg-red-600", badgeBg: "bg-red-100", badgeText: "text-red-900", icon: "🍎" },
  "Orange Iced Tea": { baseName: "Orange Iced Tea", category: "fruity", circleBg: "bg-orange-500", badgeBg: "bg-orange-100", badgeText: "text-orange-900", icon: "🍊" },
  "Lemon Honey Iced Tea": { baseName: "Lemon Honey Iced Tea", category: "fruity", circleBg: "bg-yellow-500", badgeBg: "bg-yellow-100", badgeText: "text-yellow-900", icon: "🍋" },
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

  // Pantun Semangat Gemini AI (Update Otomatis Tiap 15 Menit)
  const [pantunText, setPantunText] = useState<string>("");
  const [isPantunLoading, setIsPantunLoading] = useState<boolean>(false);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockAlertMessage, setStockAlertMessage] = useState<string | null>(null);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "Cash">("QRIS");
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
    }

    // Auto-update pantun berima setiap 15 menit sekali (15 * 60 * 1000 ms)
    const timer = setInterval(() => {
      fetchPantun();
    }, 15 * 60 * 1000);

    return () => clearInterval(timer);
  }, [selectedOutletId]);

  // Reset POS Modal State
  const [isResetPosModalOpen, setIsResetPosModalOpen] = useState<boolean>(false);
  const [resetPosPin, setResetPosPin] = useState<string>("");
  const [resetPosLoading, setResetPosLoading] = useState<boolean>(false);
  const [resetPosMessage, setResetPosMessage] = useState<string | null>(null);

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
        setTodayExpenseTotal(json.totalAmount || 0);
      }
    } catch (err) {
      console.error("Gagal memuat pengeluaran hari ini", err);
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
        loadTodayExpenses(selectedOutletId);
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

      if (cachedOutlets) setOutlets(JSON.parse(cachedOutlets));
      if (cachedProds) setProducts(JSON.parse(cachedProds));
      if (cachedMats) setRawMaterials(JSON.parse(cachedMats));
      if (cachedCups) setTodayCupsSold(Number(cachedCups) || 0);
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

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
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

  // Hitung pemakaian bahan di keranjang saat ini
  const cartMaterialUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const item of cart) {
      for (const recipe of item.product.recipes) {
        const matId = recipe.raw_material.id;
        const currentQty = usage.get(matId) || 0;
        usage.set(matId, currentQty + recipe.quantity * item.quantity);
      }
    }
    return usage;
  }, [cart]);

  // Validasi Stok Ketat Sesuai Kedai
  const checkCanAddProduct = (product: Product, delta: number = 1): { canAdd: boolean; reason?: string } => {
    for (const recipe of product.recipes) {
      const matId = recipe.raw_material.id;
      const material = rawMaterials.find((m) => m.id === matId);
      if (!material) continue;

      const currentUsedInCart = cartMaterialUsage.get(matId) || 0;
      const additionalNeeded = recipe.quantity * delta;
      const totalWillBeUsed = currentUsedInCart + additionalNeeded;

      if (material.current_stock - totalWillBeUsed < 0) {
        const sisaTersedia = Math.max(0, Math.round(material.current_stock - currentUsedInCart));
        if (material.name.toLowerCase().includes("cup")) {
          return { canAdd: false, reason: `Stok ${material.name} di kedai ini habis! Sisa: ${sisaTersedia} pcs.` };
        } else if (material.name.toLowerCase().includes("tea premix") || material.name.toLowerCase().includes("cairan")) {
          return { canAdd: false, reason: `Sisa persediaan teh seduh kedai ini habis! Sisa: ${sisaTersedia} ml.` };
        } else {
          return { canAdd: false, reason: `Stok ${material.name} kedai ini tidak cukup! Sisa: ${sisaTersedia} ${material.unit}.` };
        }
      }
    }
    return { canAdd: true };
  };

  const addToCart = (product: Product) => {
    const check = checkCanAddProduct(product, 1);
    if (!check.canAdd) {
      setStockAlertMessage(check.reason || "Stok bahan baku kedai tidak mencukupi!");
      setTimeout(() => setStockAlertMessage(null), 3500);
      return;
    }

    setStockAlertMessage(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    if (delta > 0) {
      const targetCartItem = cart.find((i) => i.product.id === productId);
      if (targetCartItem) {
        const check = checkCanAddProduct(targetCartItem.product, delta);
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
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setIsMobileCartOpen(false);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalCupsCount = cart.reduce(
    (sum, item) => (item.product.name !== "Extra Creamy Topping" ? sum + item.quantity : sum),
    0
  );

  const handleExecuteCheckout = async () => {
    if (cart.length === 0 || !selectedOutletId) return;

    // Persiapkan data struk nota thermal sebelum cart dikosongkan
    const orderNumber = `#POC-${Date.now().toString().slice(-6)}`;
    const currentOutlet = outlets.find((o) => o.id === selectedOutletId);
    const receiptToPrint: ReceiptData = {
      orderId: orderNumber,
      outletName: currentOutlet?.name || "Es Teh Poci",
      outletCode: currentOutlet?.code || "OUT-01",
      outletAddress: currentOutlet?.address || "Booth Minimarket",
      items: cart.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
        subtotal: i.quantity * i.product.price,
      })),
      totalAmount,
      paymentMethod,
      timestamp: new Date().toISOString(),
      isOffline: !isOnline,
    };

    startTransition(async () => {
      const totalCartCups = cart.reduce((acc, curr) => acc + curr.quantity, 0);
      const payloadItems = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));

      if (!isOnline) {
        saveOfflineTransaction({
          outletId: selectedOutletId,
          items: cart.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
          })),
          paymentMethod,
          totalAmount,
        });

        setTodayCupsSold((prev) => prev + totalCartCups);
        setPendingSyncCount(getPendingTransactions().length);
        setCompletedReceipt(receiptToPrint);
        setCheckoutSuccess(true);
        setCart([]);
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
          setTodayCupsSold((prev) => prev + totalCartCups);
          setLastDeductions(data.inventoryDeductions || []);
          setCompletedReceipt(receiptToPrint);
          setCheckoutSuccess(true);
          setCart([]);
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
          items: cart.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
          })),
          paymentMethod,
          totalAmount,
        });
        setTodayCupsSold((prev) => prev + totalCartCups);
        setPendingSyncCount(getPendingTransactions().length);
        setCompletedReceipt(receiptToPrint);
        setCheckoutSuccess(true);
        setCart([]);
        setIsMobileCartOpen(false);
      }
    });
  };

  const handlePrintBrowser = () => {
    printReceiptViaBrowser();
  };

  const handlePrintBluetooth = async () => {
    if (!completedReceipt) return;
    setIsPrintingBt(true);
    setPrintStatusMessage(null);
    try {
      await bluetoothPrinter.print(completedReceipt);
      setPrintStatusMessage({
        text: "Struk berhasil dicetak ke Printer Bluetooth!",
        type: "success",
      });
      setTimeout(() => setPrintStatusMessage(null), 4000);
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
        setTimeout(() => setPrintStatusMessage(null), 4000);
      } else {
        setPrintStatusMessage({
          text: err?.message || "Gagal mencetak ke Bluetooth. Pastikan printer menyala & Bluetooth aktif.",
          type: "error",
        });
        setTimeout(() => setPrintStatusMessage(null), 6000);
      }
    } finally {
      setIsPrintingBt(false);
    }
  };

  const handleFinishTransaction = () => {
    setIsCheckoutModalOpen(false);
    setCheckoutSuccess(false);
    setCompletedReceipt(null);
    setLastDeductions([]);
    setPrintStatusMessage(null);
    setIsMobileCartOpen(false); // Tutup accordion cart secara default setelah transaksi selesai
  };

  const handleResetPosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPosPin) {
      setResetPosMessage("Masukkan PIN Admin.");
      return;
    }

    setResetPosLoading(true);
    setResetPosMessage(null);

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_pos",
          outletId: selectedOutletId,
          pin: resetPosPin,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setResetPosMessage("✅ " + resData.message);
        clearCart();
        // Bersihkan antrean offline
        localStorage.removeItem("teh_poci_offline_tx_queue");
        setPendingSyncCount(0);
        setTimeout(() => {
          setIsResetPosModalOpen(false);
          setResetPosPin("");
          setResetPosMessage(null);
          loadData();
        }, 1500);
      } else {
        setResetPosMessage("❌ " + resData.error);
      }
    } catch {
      setResetPosMessage("❌ Gagal menghubungi server.");
    } finally {
      setResetPosLoading(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cupRegMaterial = rawMaterials.find((m) => m.name === "Cup Reguler");
  const cupJumboMaterial = rawMaterials.find((m) => m.name === "Cup Jumbo");
  const liquidPremixMaterial = rawMaterials.find((m) => m.name === "Liquid Tea Premix");
  const currentOutletObj = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const dailyTargetCups = currentOutletObj?.target_cups || 100;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white relative lg:sticky lg:top-0 z-30 shadow-md w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          
          {/* Row 1 di Mobile / Sisi Kiri di Desktop */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shrink-0 border border-amber-300 overflow-hidden">
                <img src="/logo.jpg" alt="Logo Teh Cap Poci" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-black text-base sm:text-xl tracking-tight text-white truncate">
                    TEH CAP POCI
                  </h1>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-slate-950 uppercase shrink-0">
                    Multi-Kedai
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200 font-mono truncate hidden sm:block">
                  Central Kitchen Strict BOM POS Terminal
                </p>
              </div>
            </div>

            {/* Tombol Pengeluaran, Tutup Shift & Admin Cepat di Mobile (Baris Atas) */}
            <div className="flex sm:hidden items-center space-x-1.5 shrink-0">
              <button
                onClick={() => {
                  setExpenseMessage(null);
                  setIsExpenseModalOpen(true);
                  loadTodayExpenses();
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-xs"
                title="Catat Pengeluaran Kedai (Es, Gas, dll)"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>+ Beban</span>
              </button>

              <Link
                href="/closing"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-xs"
                title="Tutup Shift (Blind Count)"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Tutup Shift</span>
              </Link>

              <Link
                href="/admin"
                className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-200 transition"
                title="Admin Dashboard"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </Link>
            </div>
          </div>

          {/* Row 2 di Mobile / Sisi Kanan di Desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            {/* Selector Kedai / Outlet */}
            <div className="flex-1 sm:flex-initial flex items-center bg-emerald-950/80 border border-emerald-600/50 rounded-xl px-2 py-1 text-xs min-w-0 max-w-[200px] sm:max-w-none">
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
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-xs shrink-0 transition ${
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
                className="flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 transition shadow shrink-0"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Sync ({pendingSyncCount})</span>
              </button>
            )}

            <button
              onClick={() => {
                setResetPosPin("");
                setResetPosMessage(null);
                setIsResetPosModalOpen(true);
              }}
              className="p-1.5 sm:px-2 sm:py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition border border-amber-400/40 shrink-0"
              title="Reset Data Operasional POS (Membutuhkan PIN Admin)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline ml-1">Reset POS</span>
            </button>

            {/* Desktop Only Links */}
            <div className="hidden sm:flex items-center space-x-2 shrink-0">
              <button
                onClick={() => {
                  setExpenseMessage(null);
                  setIsExpenseModalOpen(true);
                  loadTodayExpenses();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-sm"
                title="Catat Pengeluaran Kedai (Es Batu, Gas LPG, Sedotan, dll)"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>+ Pengeluaran (Es, Gas)</span>
              </button>

              <Link
                href="/closing"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-sm"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Tutup Shift</span>
              </Link>

              <Link
                href="/admin"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-900 text-slate-200 transition"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Menu Catalog */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Quick Booth Live Stock Bar & Penjualan Hari Ini */}
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Stok & Target ({currentOutletObj?.name}):</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold border border-slate-200">
                Cup Reg:{" "}
                <strong className={cupRegMaterial && cupRegMaterial.current_stock < 20 ? "text-rose-600" : "text-emerald-700"}>
                  {cupRegMaterial ? Math.max(0, Math.round(cupRegMaterial.current_stock)) : 0} pcs
                </strong>
              </span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold border border-slate-200">
                Cup Jumbo:{" "}
                <strong className={cupJumboMaterial && cupJumboMaterial.current_stock < 20 ? "text-rose-600" : "text-emerald-700"}>
                  {cupJumboMaterial ? Math.max(0, Math.round(cupJumboMaterial.current_stock)) : 0} pcs
                </strong>
              </span>

              {/* Cup Terjual Hari Ini */}
              <span className="px-2.5 py-1 bg-emerald-50 rounded-lg text-emerald-850 font-bold border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Terjual: <strong>{todayCupsSold} cup</strong></span>
              </span>

              {/* Target Penjualan Cup Harian (Ditetapkan oleh Admin di Menu Cabang Kedai) */}
              <span
                title="Target Penjualan Harian Resmi Kedai (Ditetapkan oleh Admin di Manage Kedai)"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
                  todayCupsSold >= dailyTargetCups
                    ? "bg-emerald-600 text-white border-emerald-700"
                    : "bg-sky-50 text-sky-900 border-sky-300"
                }`}
              >
                <Target className="w-3.5 h-3.5 text-sky-600" />
                <span>Target: <strong>{todayCupsSold}/{dailyTargetCups} cup</strong> ({Math.min(100, Math.round((todayCupsSold / (dailyTargetCups || 1)) * 100))}%)</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setExpenseMessage(null);
                  setIsExpenseModalOpen(true);
                  loadTodayExpenses();
                }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold border border-amber-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Catat pengeluaran tunai booth (Es, Gas, Galon, dll)"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-700" />
                <span>Kas Keluar: <strong>Rp {todayExpenseTotal.toLocaleString("id-ID")}</strong></span>
              </button>
            </div>
          </div>

          {/* Pantun Semangat Karyawan (Gemini AI • Auto-update Tiap 15 Menit) */}
          {(() => {
            const isTargetReached = todayCupsSold >= dailyTargetCups;
            const progressPercent = Math.min(100, Math.round((todayCupsSold / (dailyTargetCups || 1)) * 100));

            return (
              <div
                className={`rounded-2xl p-4 border transition-all ${
                  isTargetReached
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20"
                    : "bg-gradient-to-r from-amber-50/95 via-orange-50/90 to-amber-100/90 border-amber-200 text-slate-800 shadow-xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span
                        className={`text-xs font-bold ${
                          isTargetReached ? "text-emerald-100 font-extrabold" : "text-amber-900"
                        }`}
                      >
                        {isTargetReached
                          ? `🎉 Target Tercapai: ${todayCupsSold} / ${dailyTargetCups} Cup (Luar Biasa!)`
                          : `Progress Target: ${todayCupsSold} / ${dailyTargetCups} Cup (${progressPercent}%)`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        &bull; Update tiap 15 mnt
                      </span>
                      {isPantunLoading && (
                        <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Merangkai pantun Gemini...
                        </span>
                      )}
                    </div>

                    {/* Teks Pantun Lucu Berima */}
                    <div
                      className={`text-xs sm:text-sm font-bold whitespace-pre-line leading-relaxed italic ${
                        isTargetReached ? "text-white" : "text-amber-950"
                      }`}
                    >
                      “{pantunText || "Makan bakso kuahnya pedas,\nEs batu kristal dinginnya pas!\nTinggal beberapa cup kerja cerdas,\nRezeki berkah mengalir deras! 🧊🔥"}”
                    </div>
                  </div>

                  {/* Tombol Acak Pantun */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isPantunLoading}
                      onClick={() => fetchPantun(true)}
                      title="Acak pantun berima baru dari Gemini AI"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Dices className={`w-3.5 h-3.5 text-amber-700 ${isPantunLoading ? "animate-spin" : ""}`} />
                      <span>{isPantunLoading ? "Menulis..." : "Acak Pantun"}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar Visual */}
                <div className="mt-3 w-full bg-black/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isTargetReached ? "bg-white" : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
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
                        key={item.product.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                      >
                        <div className="flex-1 mr-2 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-[11px] font-mono text-emerald-700 font-semibold">
                            {formatRupiah(item.product.price)}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-white active:scale-95 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-xs text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-white active:scale-95 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

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
                        setPaymentMethod("QRIS");
                        setIsCheckoutModalOpen(true);
                      }}
                      className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl shadow text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                    >
                      <QrCode className="w-4 h-4" />
                      Bayar QRIS
                    </button>

                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        setPaymentMethod("Cash");
                        setIsCheckoutModalOpen(true);
                      }}
                      className="py-3 px-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl shadow text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                    >
                      <Banknote className="w-4 h-4" />
                      Bayar Tunai
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

          {/* Grid Menu */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 bg-white rounded-2xl animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredFlavors.map((item) => {
                const { baseName, meta, reguler, jumbo } = item;

                return (
                  <div
                    key={baseName}
                    className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-slate-200/90 flex flex-col justify-between relative overflow-hidden transition"
                  >
                    {baseName.toLowerCase().includes("jasmine") ? (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                        <span>⭐</span>
                        <span>Menu Utama</span>
                      </div>
                    ) : item.totalSold > 0 ? (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                        <span>🔥</span>
                        <span>{item.totalSold} Terjual</span>
                      </div>
                    ) : meta.isNew ? (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                        Markicob Baru!
                      </div>
                    ) : null}

                    <div>
                      <div className="flex items-center space-x-3 mb-2.5">
                        <div
                          className={`w-11 h-11 rounded-2xl ${meta.circleBg} text-white flex items-center justify-center text-xl shadow-inner flex-shrink-0`}
                        >
                          {meta.icon}
                        </div>
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeBg} ${meta.badgeText}`}>
                            {meta.category === "original"
                              ? "Original Poci"
                              : meta.category === "milky"
                              ? "Milky Fusion"
                              : "Fruit Tea"}
                          </span>
                          <h3 className="font-extrabold text-sm text-slate-900 leading-tight mt-0.5">
                            {baseName}
                          </h3>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono mb-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span>Resep: Racikan Teh Asli Poci + Cup</span>
                      </div>
                    </div>

                    {/* Dual or Single Size Action Buttons dengan Validasi Stok Mandiri */}
                    <div
                      className={`grid gap-2 pt-2 border-t border-slate-100 ${
                        reguler && jumbo ? "grid-cols-2" : "grid-cols-1"
                      }`}
                    >
                      {reguler && (() => {
                        const checkReg = checkCanAddProduct(reguler, 1);
                        const isDisabled = !checkReg.canAdd;
                        return (
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => addToCart(reguler)}
                            title={isDisabled ? checkReg.reason : "Tambah ke Keranjang"}
                            className={`px-2.5 py-2 rounded-xl font-bold transition flex flex-col items-center justify-center group border ${
                              isDisabled
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                : "bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 border-slate-200 hover:border-emerald-600 active:scale-95"
                            }`}
                          >
                            <span className="text-[10px]">
                              {isDisabled ? "Stok Habis" : jumbo ? "Reguler" : "Pesan (Reguler)"}
                            </span>
                            <span className={`text-xs font-mono font-black ${isDisabled ? "text-slate-400 line-through" : "text-emerald-800 group-hover:text-white"}`}>
                              {formatRupiah(reguler.price)}
                            </span>
                          </button>
                        );
                      })()}

                      {jumbo && (() => {
                        const checkJumbo = checkCanAddProduct(jumbo, 1);
                        const isDisabled = !checkJumbo.canAdd;
                        return (
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => addToCart(jumbo)}
                            title={isDisabled ? checkJumbo.reason : "Tambah ke Keranjang"}
                            className={`px-2.5 py-2 rounded-xl font-bold transition flex flex-col items-center justify-center group border ${
                              isDisabled
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                : "bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-900 border-emerald-200 hover:border-emerald-700 active:scale-95"
                            }`}
                          >
                            <span className="text-[10px]">
                              {isDisabled ? "Stok Habis" : reguler ? "Jumbo" : "Pesan (Jumbo)"}
                            </span>
                            <span className={`text-xs font-mono font-black ${isDisabled ? "text-slate-400 line-through" : "text-emerald-900 group-hover:text-white"}`}>
                              {formatRupiah(jumbo.price)}
                            </span>
                          </button>
                        );
                      })()}

                      {!reguler && !jumbo && item.single && (() => {
                        const prod = item.single;
                        const checkSingle = checkCanAddProduct(prod, 1);
                        const isDisabled = !checkSingle.canAdd;
                        return (
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => addToCart(prod)}
                            title={isDisabled ? checkSingle.reason : "Tambah ke Keranjang"}
                            className={`px-2.5 py-2 rounded-xl font-bold transition flex flex-col items-center justify-center group border ${
                              isDisabled
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                : "bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-900 border-emerald-200 hover:border-emerald-700 active:scale-95"
                            }`}
                          >
                            <span className="text-[10px]">
                              {isDisabled ? "Stok Habis" : "Tambah ke Keranjang"}
                            </span>
                            <span className={`text-xs font-mono font-black ${isDisabled ? "text-slate-400 line-through" : "text-emerald-900 group-hover:text-white"}`}>
                              {formatRupiah(prod.price)}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
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
                      key={item.product.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex-1 mr-2">
                        <h4 className="font-bold text-xs text-slate-900 leading-tight">
                          {item.product.name}
                        </h4>
                        <p className="text-xs font-mono text-emerald-700 font-semibold mt-0.5">
                          {formatRupiah(item.product.price)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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

              <button
                disabled={cart.length === 0}
                onClick={() => {
                  setPaymentMethod("QRIS");
                  setIsCheckoutModalOpen(true);
                }}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition flex items-center justify-center gap-2 text-sm"
              >
                <QrCode className="w-5 h-5" />
                Bayar QRIS ({currentOutletObj?.code})
              </button>

              <div className="mt-2 text-center">
                <button
                  disabled={cart.length === 0}
                  onClick={() => {
                    setPaymentMethod("Cash");
                    setIsCheckoutModalOpen(true);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold underline"
                >
                  Opsi Bayar Tunai (Manual Cash)
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
                        <div className="font-bold text-slate-900">{item.name}</div>
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

                {/* Tombol Aksi Cetak & Transaksi Baru */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handlePrintBluetooth}
                      disabled={isPrintingBt}
                      className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-300 text-white font-bold rounded-xl shadow text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Bluetooth className="w-4 h-4 shrink-0" />
                      <span>{isPrintingBt ? "Menghubungkan..." : "Cetak Bluetooth"}</span>
                    </button>

                    <button
                      onClick={handlePrintBrowser}
                      className="py-3 px-3 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold rounded-xl shadow text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-4 h-4 shrink-0" />
                      <span>Print (RawBT/58mm)</span>
                    </button>
                  </div>

                  <button
                    onClick={handleFinishTransaction}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-800 font-extrabold rounded-xl border border-slate-300 text-xs flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <span>✓ Transaksi Baru / Selesai</span>
                  </button>
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
                    <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-left text-xs space-y-1.5">
                      <p className="font-bold">⚠️ Pembayaran Tunai Terdeteksi:</p>
                      <p>
                        Simpan uang tunai di dompet shift kasir. Sistem BOM kedai ini tetap memotong stok secara otomatis.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExecuteCheckout}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
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

      {/* Modal Otorisasi Reset POS Kasir */}
      {isResetPosModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Reset Terminal Kasir POS
            </h3>
            <p className="text-xs text-emerald-700 font-bold mt-0.5">
              {currentOutletObj?.name}
            </p>

            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-left text-xs space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Dibutuhkan Otorisasi Admin
              </p>
              <p>
                Aksi ini akan menghapus antrean transaksi lokal dan membersihkan riwayat kasir {currentOutletObj?.name}. Katalog produk dan resep tidak akan hilang.
              </p>
            </div>

            {resetPosMessage && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800 border border-slate-300">
                {resetPosMessage}
              </div>
            )}

            <form onSubmit={handleResetPosSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-left">
                  Masukkan PIN Admin:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={resetPosPin}
                  onChange={(e) => setResetPosPin(e.target.value)}
                  placeholder="PIN 4 digit"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={resetPosLoading}
                  onClick={() => setIsResetPosModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetPosLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {resetPosLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Reset Kasir
                </button>
              </div>
            </form>
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
                <div>{item.name}</div>
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
