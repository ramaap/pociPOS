"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Coins,
  Calculator,
  Ticket,
  Copy,
  Building2,
  Landmark,
  Camera,
  UploadCloud,
  CheckSquare,
  Square,
} from "lucide-react";

interface Outlet {
  id: string;
  code: string;
  name: string;
  address?: string;
  target_cups?: number;
  initial_cash?: number;
  todayCashIn?: number;
  todayExpenseTotal?: number;
  todayCupsSold?: number;
  todayPaidCups?: number;
  todayFreeCups?: number;
  todayTotalCups?: number;
  currentCashBalance?: number;
  shift_status?: "open" | "closed" | string;
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
  actual_cash?: number;
  system_expected_cash?: number;
  discrepancy_cash?: number;
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

interface SugarRefillLogRecord {
  id: string;
  outlet_id: string;
  amount_ml: number;
  stock_before: number;
  stock_after: number;
  type: string;
  notes: string | null;
  created_at: string;
  outlet: {
    id: string;
    name: string;
    code: string;
  };
}

interface RawMaterialRecord {
  id: string;
  name: string;
  unit: string;
  master_stock: number;
}

interface StockTransferLogRecord {
  id: string;
  raw_material_id: string;
  from_location: string;
  to_location: string;
  quantity: number;
  type: string;
  notes: string | null;
  created_at: string;
  raw_material?: {
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
    totalPaidCups?: number;
    totalFreeCups?: number;
    totalCups?: number;
    totalRegCupsSold: number;
    totalRegCupsFree?: number;
    totalJumboCupsSold: number;
    totalJumboCupsFree?: number;
    totalLiquidMlSold: number;
    flavorStats?: Record<string, any>;
    outletSalesList?: { name: string; sales: number; cups: number; paidCups?: number; freeCups?: number }[];
  };
  closings: ShiftClosingRecord[];
  boothStocks: BoothStockRecord[];
  rawMaterials?: RawMaterialRecord[];
  transferLogs?: StockTransferLogRecord[];
  sugarLogs?: SugarRefillLogRecord[];
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

  // Admin Navigation Tabs: "financial" | "stocks" | "outlets" | "master_menus" | "outlet_menus" | "vouchers" | "purchase_orders" | "social_media"
  const [activeAdminTab, setActiveAdminTab] = useState<"financial" | "stocks" | "outlets" | "master_menus" | "outlet_menus" | "vouchers" | "purchase_orders" | "social_media">("financial");

  // ================= TAB 8: SOCIAL MEDIA STRATEGIST STATE =================
  const [socialDrafts, setSocialDrafts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState<boolean>(false);
  const [socialMessage, setSocialMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [socialPlatformHint, setSocialPlatformHint] = useState<string>("");
  const [socialCustomTopic, setSocialCustomTopic] = useState<string>("");
  const [socialVoiceHint, setSocialVoiceHint] = useState<string>("Kore");
  const [socialSendTelegram, setSocialSendTelegram] = useState<boolean>(false);
  const [copiedSocialKey, setCopiedSocialKey] = useState<string | null>(null);
  const [hasSerperKey, setHasSerperKey] = useState<boolean>(false);
  const [centralStockSearch, setCentralStockSearch] = useState<string>("");
  const [centralStockSort, setCentralStockSort] = useState<"name_asc" | "stock_asc" | "stock_desc">("name_asc");
  const [boothStockSearch, setBoothStockSearch] = useState<string>("");
  const [boothStockSort, setBoothStockSort] = useState<"name_asc" | "stock_asc" | "stock_desc">("name_asc");
  const [assetPage, setAssetPage] = useState<number>(1);
  const [assetSearch, setAssetSearch] = useState<string>("");
  const [assetSort, setAssetSort] = useState<"date_desc" | "date_asc" | "cost_desc" | "cost_asc" | "name_asc">("date_desc");
  const [tablePages, setTablePages] = useState<Record<string, number>>({});
  const LIST_PAGE_SIZE = 30;
  const paginateList = <T,>(items: T[], key: string) => {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
    const currentPage = Math.min(tablePages[key] || 1, totalPages);
    const pagedItems =
      total > LIST_PAGE_SIZE
        ? items.slice((currentPage - 1) * LIST_PAGE_SIZE, currentPage * LIST_PAGE_SIZE)
        : items;
    return {
      pagedItems,
      total,
      needsScroll: pagedItems.length > 15,
    };
  };
  const renderTablePagination = (key: string, total: number, dark = false) => {
    if (total <= LIST_PAGE_SIZE) return null;
    const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
    const currentPage = Math.min(tablePages[key] || 1, totalPages);
    const startIdx = (currentPage - 1) * LIST_PAGE_SIZE + 1;
    const endIdx = Math.min(currentPage * LIST_PAGE_SIZE, total);
    return (
      <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 text-xs ${dark ? "text-slate-300" : "text-slate-600"}`}>
        <span>
          Menampilkan <b>{startIdx}–{endIdx}</b> dari <b>{total}</b> data (Hal {currentPage}/{totalPages})
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setTablePages((prev) => ({ ...prev, [key]: Math.max(1, currentPage - 1) }))}
            className={`px-3 py-1 rounded-lg border font-bold disabled:opacity-40 cursor-pointer ${
              dark
                ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            ← Sebelumnya
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setTablePages((prev) => ({ ...prev, [key]: Math.min(totalPages, currentPage + 1) }))}
            className={`px-3 py-1 rounded-lg border font-bold disabled:opacity-40 cursor-pointer ${
              dark
                ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            Berikutnya →
          </button>
        </div>
      </div>
    );
  };
  const [ttsGeneratingId, setTtsGeneratingId] = useState<string | null>(null);
  const [draftVoiceMap, setDraftVoiceMap] = useState<Record<string, string>>({});
  const [draftScriptMap, setDraftScriptMap] = useState<Record<string, string>>({});

  // ================= TAB 7: PO & PREDIKSI STOK STATE =================
  const [poForecast, setPoForecast] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState<boolean>(false);
  const [poMessage, setPoMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [selectedPoSupplierId, setSelectedPoSupplierId] = useState<string>("");
  const [poNotes, setPoNotes] = useState<string>("");
  const [copiedPoId, setCopiedPoId] = useState<string | null>(null);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: "", phone: "", lead_time_days: "1", notes: "" });

  // ================= TAB 6: VOUCHER PROMO & KAMPANYE PROMO STATE =================
  const [promoCampaignData, setPromoCampaignData] = useState<any>(null);
  const [campaignForm, setCampaignForm] = useState({
    isActive: true,
    startAt: "",
    endAt: "",
    targetOutletId: "",
    minFlavoredQty: 2,
    freeProductName: "Jasmine Poci Iced Tea (Jumbo)",
  });
  const [campaignLoading, setCampaignLoading] = useState<boolean>(false);
  const [campaignMessage, setCampaignMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [campaignFormDirty, setCampaignFormDirty] = useState<boolean>(false);
  const campaignFormDirtyRef = useRef<boolean>(false);
  campaignFormDirtyRef.current = campaignFormDirty;

  const [vouchersList, setVouchersList] = useState<any[]>([]);
  const [voucherStats, setVoucherStats] = useState({ total: 0, active: 0, redeemed: 0, expired: 0 });
  const [voucherLoading, setVoucherLoading] = useState<boolean>(false);
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<string>("all");
  const [voucherOutletFilter, setVoucherOutletFilter] = useState<string>("all");
  const [voucherSearch, setVoucherSearch] = useState<string>("");
  const [isAddVoucherModalOpen, setIsAddVoucherModalOpen] = useState<boolean>(false);
  const [newVoucherForm, setNewVoucherForm] = useState({
    outletId: "",
    productName: "Jasmine Poci Iced Tea (Jumbo)",
    expiresInDays: 3,
    notes: "",
  });
  const [voucherActionLoading, setVoucherActionLoading] = useState<boolean>(false);
  const [voucherMessage, setVoucherMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);

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

  // Sub-tab Catatan Biaya & Beban (Beban Tetap, Variabel, Modal & Aset)
  const [expenseSubTab, setExpenseSubTab] = useState<"fixed" | "variable" | "capital">("fixed");

  // ================= MODAL AWAL, ASET TETAP & RnD STATE =================
  const [isAddCapitalOpen, setIsAddCapitalOpen] = useState<boolean>(false);
  const [capitalForm, setCapitalForm] = useState({
    source: "Modal Pribadi Pemilik",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [capitalLoading, setCapitalLoading] = useState<boolean>(false);
  const [capitalMessage, setCapitalMessage] = useState<string | null>(null);

  const [isAddAssetOpen, setIsAddAssetOpen] = useState<boolean>(false);
  const [assetForm, setAssetForm] = useState<{
    name: string;
    category: string;
    asset_type: "bergerak" | "tidak_bergerak";
    cost: string;
    outletId: string;
    purchase_date: string;
    notes: string;
  }>({
    name: "",
    category: "booth",
    asset_type: "tidak_bergerak",
    cost: "",
    outletId: "all",
    purchase_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [assetLoading, setAssetLoading] = useState<boolean>(false);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetTypeFilter, setAssetTypeFilter] = useState<"all" | "tidak_bergerak" | "bergerak">("all");

  const [isAddRndOpen, setIsAddRndOpen] = useState<boolean>(false);
  const [rndForm, setRndForm] = useState({
    title: "",
    category: "resep",
    amount: "",
    outcome: "Berhasil (Masuk Menu)",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [rndLoading, setRndLoading] = useState<boolean>(false);
  const [rndMessage, setRndMessage] = useState<string | null>(null);

  // ================= SCAN ASSET RECEIPT (AI OCR) STATE =================
  const [isScanAssetOpen, setIsScanAssetOpen] = useState<boolean>(false);
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scanMimeType, setScanMimeType] = useState<string>("image/jpeg");
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      asset_type: "bergerak" | "tidak_bergerak";
      cost: number | string;
      outletId?: string;
      purchase_date: string;
      notes: string;
      selected: boolean;
    }>
  >([]);
  const [scanDefaultOutletId, setScanDefaultOutletId] = useState<string>("all");
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState<boolean>(false);
  const [scanApiKeyInput, setScanApiKeyInput] = useState<string>("");
  const [showApiKeySettings, setShowApiKeySettings] = useState<boolean>(false);
  const [savingApiKey, setSavingApiKey] = useState<boolean>(false);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

  // ================= DYNAMIC FIXED OVERHEAD STATE =================
  const [isAddFixedCostOpen, setIsAddFixedCostOpen] = useState<boolean>(false);
  const [isEditFixedCostOpen, setIsEditFixedCostOpen] = useState<boolean>(false);
  const [fixedCostForm, setFixedCostForm] = useState<{
    id?: string;
    name: string;
    amount: string | number;
    category: string;
    outletId: string;
    notes: string;
    is_active?: boolean;
  }>({
    name: "",
    amount: "",
    category: "sewa",
    outletId: "all",
    notes: "",
    is_active: true,
  });
  const [fixedCostLoading, setFixedCostLoading] = useState<boolean>(false);
  const [fixedCostMessage, setFixedCostMessage] = useState<string | null>(null);

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

  // Central Cash Vault State (Kas Induk Gudang Pusat / Brankas)
  const [centralVault, setCentralVault] = useState<{ id: string; cash_balance: number; updated_at?: string } | null>(null);
  const [isCentralCashModalOpen, setIsCentralCashModalOpen] = useState<boolean>(false);
  const [centralCashAction, setCentralCashAction] = useState<"topup" | "set">("topup");
  const [centralCashAmount, setCentralCashAmount] = useState<number>(0);
  const [centralCashNotes, setCentralCashNotes] = useState<string>("");
  const [centralCashLoading, setCentralCashLoading] = useState<boolean>(false);
  const [centralCashMessage, setCentralCashMessage] = useState<string | null>(null);

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
    secondaryFlavorMaterialId: "",
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
  const [currentEditingGroup, setCurrentEditingGroup] = useState<any>(null);
  const [editMenuForm, setEditMenuForm] = useState({
    oldBaseName: "",
    baseName: "",
    category: "fruity",
    flavorMaterialId: "",
    secondaryFlavorMaterialId: "",
    enableReguler: false,
    regulerPrice: "7000",
    enableJumbo: true,
    jumboPrice: "9000",
    price: "3000",
  });
  const [editMenuLoading, setEditMenuLoading] = useState<boolean>(false);
  const [editMenuMessage, setEditMenuMessage] = useState<string | null>(null);

  // ================= HPP (HARGA POKOK PENJUALAN) STATE & HANDLERS =================
  interface HppComponentItem {
    name: string;
    cost: number;
  }
  const [isHppModalOpen, setIsHppModalOpen] = useState<boolean>(false);
  const [selectedHppProduct, setSelectedHppProduct] = useState<any>(null);
  const [hppComponents, setHppComponents] = useState<HppComponentItem[]>([]);
  const [hppLoading, setHppLoading] = useState<boolean>(false);
  const [hppMessage, setHppMessage] = useState<string | null>(null);

  const getProductMixInfo = (nameLower: string): { name: string; cost: number } | null => {
    if (nameLower.includes("jasmine") || nameLower.includes("original")) return null;
    if (nameLower.includes("apple")) return { name: "Poci Mix Apple 3g", cost: 850 };
    if (nameLower.includes("blackcurrant")) return { name: "Poci Mix Blackcurrant 3g", cost: 850 };
    if (nameLower.includes("mango")) return { name: "Poci Mix Mango 3g", cost: 850 };
    if (nameLower.includes("orange")) return { name: "Poci Mix Orange 3g", cost: 850 };
    if (nameLower.includes("guava")) return { name: "Poci Mix Guava 3g", cost: 850 };
    if (nameLower.includes("lemon honey")) return { name: "Poci Mix Lemon Honey 3g", cost: 1000 };
    if (nameLower.includes("lychee")) return { name: "Poci Mix Lychee 3g", cost: 1000 };
    if (nameLower.includes("milk")) return { name: "Poci Mix Milk Tea 15g", cost: 1500 };
    if (nameLower.includes("krampul")) return { name: "ETP Teh Krampul Selasih", cost: 1500 };
    if (nameLower.includes("cappuccino")) return { name: "Poci Mix Cappuccino 10g", cost: 1600 };
    if (nameLower.includes("chocolate")) return { name: "Poci Mix Chocolate", cost: 1600 };
    if (nameLower.includes("tarik")) return { name: "ETP Teh Tarik Gula Aren", cost: 2000 };
    if (nameLower.includes("thai")) return { name: "Poci Mix Thai Tea 12g", cost: 2500 };
    if (nameLower.includes("matcha")) return { name: "Poci Mix Matcha 12g", cost: 3000 };
    if (nameLower.includes("aren")) return { name: "Poci Mix Aren Latte 25g", cost: 3000 };
    if (nameLower.includes("coconut")) return { name: "Poci Mix Coconut Latte 25g", cost: 3000 };
    if (nameLower.includes("vanilla")) return { name: "Poci Mix Vanilla", cost: 1200 };
    return null;
  };

  const getDefaultHppTemplate = (product: any): HppComponentItem[] => {
    const isReg = product.name?.toLowerCase().includes("reguler");
    const pNameLower = product.name?.toLowerCase() || "";

    if (isReg) {
      const items: HppComponentItem[] = [
        { name: "Poci Jasmine Kantong (180ml)", cost: 170 },
        { name: "Gula Pasir Rose Brand (40ml)", cost: 558 },
        { name: "Cup Es Teh Reguler Poci", cost: 600 },
        { name: "Sedotan Poci Single Wrap", cost: 93 },
        { name: "Plastik Seal Kecil", cost: 200 },
        { name: "Estimasi Air Galon", cost: 71 },
        { name: "Estimasi Es Batu Kristal", cost: 250 },
        { name: "Estimasi Kantong Plastik Cup", cost: 50 },
      ];
      if (pNameLower.includes("matcha")) {
        items.push({ name: "Poci Mix Matcha 12g", cost: 3000 });
        items.push({ name: "Poci Mix Milk Tea 15g", cost: 1500 });
      } else {
        const mix = getProductMixInfo(pNameLower);
        if (mix) {
          items.push({ name: mix.name, cost: mix.cost });
        }
      }
      return items;
    } else {
      const items: HppComponentItem[] = [
        { name: "Poci Jasmine Kantong Jumbo", cost: 188 },
        { name: "Gula Pasir Rose Brand (1 kg)", cost: 697 },
        { name: "Cup Es Teh 22 oz Poci", cost: 800 },
        { name: "Sedotan Poci Single Wrap", cost: 93 },
        { name: "Plastik Seal Kecil", cost: 200 },
        { name: "Estimasi Air Galon (8 liter)", cost: 79 },
        { name: "Estimasi Es Batu Kristal (250 g)", cost: 300 },
        { name: "Estimasi Kantong Plastik Cup", cost: 50 },
      ];
      if (pNameLower.includes("matcha")) {
        items.push({ name: "Poci Mix Matcha 12g", cost: 3000 });
        items.push({ name: "Poci Mix Milk Tea 15g", cost: 1500 });
      } else {
        const mix = getProductMixInfo(pNameLower);
        if (mix) {
          items.push({ name: mix.name, cost: mix.cost });
        }
      }
      return items;
    }
  };

  const handleOpenHppModal = (product: any) => {
    setSelectedHppProduct(product);
    let items: HppComponentItem[] = [];
    if (product.hpp_breakdown) {
      try {
        items = typeof product.hpp_breakdown === "string" ? JSON.parse(product.hpp_breakdown) : product.hpp_breakdown;
      } catch {
        items = [];
      }
    }
    if (!items || items.length === 0) {
      items = getDefaultHppTemplate(product);
    }
    setHppComponents(items);
    setHppMessage(null);
    setIsHppModalOpen(true);
  };

  const handleResetHppToTemplate = () => {
    if (selectedHppProduct) {
      setHppComponents(getDefaultHppTemplate(selectedHppProduct));
    }
  };

  const handleAddHppComponent = () => {
    setHppComponents([...hppComponents, { name: "", cost: 0 }]);
  };

  const handleRemoveHppComponent = (index: number) => {
    setHppComponents(hppComponents.filter((_, i) => i !== index));
  };

  const handleUpdateHppComponent = (index: number, field: "name" | "cost", val: any) => {
    const updated = [...hppComponents];
    updated[index] = { ...updated[index], [field]: val };
    setHppComponents(updated);
  };

  const handleQuickSelectComponent = (index: number, type: string) => {
    const isReg = selectedHppProduct?.name?.toLowerCase().includes("reguler");
    let name = "";
    let defaultCost = 0;

    switch (type) {
      case "cup":
        name = isReg ? "Cup Es Teh Reguler Poci" : "Cup Es Teh 22 oz Poci";
        defaultCost = isReg ? 600 : 800;
        break;
      case "gula":
        name = isReg ? "Gula Pasir Rose Brand (40ml)" : "Gula Pasir Rose Brand (1 kg)";
        defaultCost = isReg ? 558 : 697;
        break;
      case "teh":
        name = isReg ? "Poci Jasmine Kantong (180ml)" : "Poci Jasmine Kantong Jumbo";
        defaultCost = isReg ? 170 : 188;
        break;
      case "sedotan":
        name = "Sedotan Poci Single Wrap";
        defaultCost = 93;
        break;
      case "seal":
        name = "Plastik Seal Kecil";
        defaultCost = 200;
        break;
      case "air":
        name = isReg ? "Estimasi Air Galon" : "Estimasi Air Galon (8 liter)";
        defaultCost = isReg ? 71 : 79;
        break;
      case "es":
        name = isReg ? "Estimasi Es Batu Kristal" : "Estimasi Es Batu Kristal (250 g)";
        defaultCost = isReg ? 250 : 300;
        break;
      case "plastik":
        name = "Estimasi Kantong Plastik Cup";
        defaultCost = 50;
        break;
      case "sachet":
        const mix = getProductMixInfo(selectedHppProduct?.name?.toLowerCase() || "");
        name = mix ? mix.name : (isReg ? "Sachet Bubuk Perasa" : "Sachet Poci Mix");
        defaultCost = mix ? mix.cost : 1200;
        break;
      case "custom":
        name = "Bahan Tambahan";
        defaultCost = 500;
        break;
    }

    if (name) {
      const updated = [...hppComponents];
      updated[index] = {
        name,
        cost: updated[index].cost > 0 ? updated[index].cost : defaultCost,
      };
      setHppComponents(updated);
    }
  };

  const handleSaveHpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHppProduct) return;

    setHppLoading(true);
    setHppMessage(null);

    const totalCost = hppComponents.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_hpp",
          productId: selectedHppProduct.id,
          costPrice: totalCost,
          hppBreakdown: hppComponents,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setHppMessage("✅ " + resJson.message);
        loadMenus();
        setTimeout(() => {
          setIsHppModalOpen(false);
          setHppMessage(null);
        }, 1200);
      } else {
        setHppMessage("❌ " + resJson.error);
      }
    } catch {
      setHppMessage("❌ Gagal menyimpan HPP");
    } finally {
      setHppLoading(false);
    }
  };

  // ================= STOCK / RESTOCK / OPNAME MODALS =================
  const [isRestockOpen, setIsRestockOpen] = useState<boolean>(false);
  const [restockOutletId, setRestockOutletId] = useState<string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [restockQty, setRestockQty] = useState<string>("");
  const [restockMode, setRestockMode] = useState<"add" | "return" | "central_in" | "central_set">("add");
  const [restockNotes, setRestockNotes] = useState<string>("");
  const [restockMessage, setRestockMessage] = useState<string | null>(null);

  const openRestockModal = (
    mode: "add" | "return" | "central_in" | "central_set" = "add",
    materialId?: string,
    outletId?: string
  ) => {
    setRestockMode(mode);
    if (materialId) setSelectedMaterialId(materialId);
    if (outletId) setRestockOutletId(outletId);
    else if (!restockOutletId && data?.outlets && data.outlets.length > 0) {
      setRestockOutletId(data.outlets[0].id);
    }
    setRestockQty("");
    setRestockNotes("");
    setRestockMessage(null);
    setIsRestockOpen(true);
  };

  const [isSingleStockOpen, setIsSingleStockOpen] = useState<boolean>(false);
  const [singleStockOutlet, setSingleStockOutlet] = useState<{ id: string; name: string } | null>(null);
  const [singleStockMaterial, setSingleStockMaterial] = useState<{ id: string; name: string; unit: string; currentStock: number } | null>(null);
  const [singleStockMode, setSingleStockMode] = useState<"set" | "add" | "return">("set");
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
    const headers = [
      "Waktu",
      "No Nota",
      "Kedai",
      "Item Pesanan",
      "Cup Terjual",
      "Cup Promo Gratis",
      "Metode Pembayaran",
      "Total Penjualan (Rp)",
    ];
    const rows = financeData.transactions.map((t: any) => [
      `"${new Date(t.createdAt).toLocaleString("id-ID")}"`,
      `"${t.orderCode}"`,
      `"${t.outletName}"`,
      `"${(t.itemsSummary || "").replace(/"/g, '""')}"`,
      t.paidItemCount ?? 0,
      t.freeItemCount ?? 0,
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

  const handleAddFixedCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedCostForm.name.trim() || !fixedCostForm.amount || Number(fixedCostForm.amount) <= 0) {
      setFixedCostMessage("Nama beban tetap dan nominal per bulan wajib diisi dengan benar.");
      return;
    }
    setFixedCostLoading(true);
    setFixedCostMessage(null);
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_fixed_cost",
          name: fixedCostForm.name.trim(),
          amount: Number(fixedCostForm.amount),
          category: fixedCostForm.category,
          outletId: fixedCostForm.outletId,
          notes: fixedCostForm.notes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIsAddFixedCostOpen(false);
        setFixedCostForm({ name: "", amount: "", category: "sewa", outletId: "all", notes: "", is_active: true });
        loadFinancialReport(financeOutlet, financePeriod);
      } else {
        setFixedCostMessage(json.error || "Gagal menambahkan beban tetap");
      }
    } catch (err: any) {
      setFixedCostMessage(err.message || "Gagal terhubung ke server");
    } finally {
      setFixedCostLoading(false);
    }
  };

  const handleEditFixedCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedCostForm.id || !fixedCostForm.name.trim() || !fixedCostForm.amount || Number(fixedCostForm.amount) <= 0) {
      setFixedCostMessage("Nama beban dan nominal biaya bulanan wajib diisi dengan benar.");
      return;
    }
    setFixedCostLoading(true);
    setFixedCostMessage(null);
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_fixed_cost",
          id: fixedCostForm.id,
          name: fixedCostForm.name.trim(),
          amount: Number(fixedCostForm.amount),
          category: fixedCostForm.category,
          outletId: fixedCostForm.outletId,
          notes: fixedCostForm.notes,
          is_active: fixedCostForm.is_active,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIsEditFixedCostOpen(false);
        setFixedCostForm({ name: "", amount: "", category: "sewa", outletId: "all", notes: "", is_active: true });
        loadFinancialReport(financeOutlet, financePeriod);
      } else {
        setFixedCostMessage(json.error || "Gagal mengupdate beban tetap");
      }
    } catch (err: any) {
      setFixedCostMessage(err.message || "Gagal terhubung ke server");
    } finally {
      setFixedCostLoading(false);
    }
  };

  const handleDeleteFixedCost = async (id: string, name: string) => {
    if (!confirm(`Hapus beban tetap "${name}"? Perhitungan laba rugi akan otomatis disesuaikan.`)) return;
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_fixed_cost", id }),
      });
      if (res.ok) {
        loadFinancialReport(financeOutlet, financePeriod);
      }
    } catch (err) {
      console.error("Gagal menghapus beban tetap", err);
    }
  };

  const handleToggleFixedCost = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_fixed_cost", id, is_active: !currentStatus }),
      });
      if (res.ok) {
        loadFinancialReport(financeOutlet, financePeriod);
      }
    } catch (err) {
      console.error("Gagal mengubah status beban tetap", err);
    }
  };

  // ================= HANDLERS MODAL AWAL, ASET & RnD =================
  const handleAddCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capitalForm.source.trim() || !capitalForm.amount || Number(capitalForm.amount) <= 0) {
      setCapitalMessage("Sumber modal dan nominal setoran wajib diisi dengan benar.");
      return;
    }
    setCapitalLoading(true);
    setCapitalMessage(null);
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_initial_capital",
          source: capitalForm.source.trim(),
          amount: Number(capitalForm.amount),
          date: capitalForm.date,
          notes: capitalForm.notes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIsAddCapitalOpen(false);
        setCapitalForm({ source: "Modal Pribadi Pemilik", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
        loadFinancialReport(financeOutlet, financePeriod);
      } else {
        setCapitalMessage(json.error || "Gagal mencatat modal awal");
      }
    } catch (err: any) {
      setCapitalMessage(err.message || "Gagal terhubung ke server");
    } finally {
      setCapitalLoading(false);
    }
  };

  const handleDeleteCapital = async (id: string, source: string) => {
    if (!confirm(`Hapus catatan setoran modal dari "${source}"?`)) return;
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_initial_capital", id }),
      });
      if (res.ok) loadFinancialReport(financeOutlet, financePeriod);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name.trim() || !assetForm.cost || Number(assetForm.cost) <= 0) {
      setAssetMessage("Nama aset dan harga pembelian aset wajib diisi dengan benar.");
      return;
    }
    setAssetLoading(true);
    setAssetMessage(null);
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_capital_asset",
          name: assetForm.name.trim(),
          category: assetForm.category,
          asset_type: assetForm.asset_type || (assetForm.category === "booth" ? "tidak_bergerak" : "bergerak"),
          cost: Number(assetForm.cost),
          outletId: assetForm.outletId,
          purchase_date: assetForm.purchase_date,
          notes: assetForm.notes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIsAddAssetOpen(false);
        setAssetForm({ name: "", category: "booth", asset_type: "tidak_bergerak", cost: "", outletId: "all", purchase_date: new Date().toISOString().split("T")[0], notes: "" });
        loadFinancialReport(financeOutlet, financePeriod);
      } else {
        setAssetMessage(json.error || "Gagal mencatat pembelian aset");
      }
    } catch (err: any) {
      setAssetMessage(err.message || "Gagal terhubung ke server");
    } finally {
      setAssetLoading(false);
    }
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!confirm(`Hapus pencatatan aset "${name}"?`)) return;
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_capital_asset", id }),
      });
      if (res.ok) loadFinancialReport(financeOutlet, financePeriod);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRnd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rndForm.title.trim() || !rndForm.amount || Number(rndForm.amount) <= 0) {
      setRndMessage("Judul kegiatan RnD dan biaya RnD wajib diisi dengan benar.");
      return;
    }
    setRndLoading(true);
    setRndMessage(null);
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_rnd_expense",
          title: rndForm.title.trim(),
          category: rndForm.category,
          amount: Number(rndForm.amount),
          outcome: rndForm.outcome,
          date: rndForm.date,
          notes: rndForm.notes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIsAddRndOpen(false);
        setRndForm({ title: "", category: "resep", amount: "", outcome: "Berhasil (Masuk Menu)", date: new Date().toISOString().split("T")[0], notes: "" });
        loadFinancialReport(financeOutlet, financePeriod);
      } else {
        setRndMessage(json.error || "Gagal mencatat pengeluaran RnD");
      }
    } catch (err: any) {
      setRndMessage(err.message || "Gagal terhubung ke server");
    } finally {
      setRndLoading(false);
    }
  };

  const handleDeleteRnd = async (id: string, title: string) => {
    if (!confirm(`Hapus catatan pengeluaran RnD "${title}"?`)) return;
    try {
      const res = await fetch("/api/admin/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_rnd_expense", id }),
      });
      if (res.ok) loadFinancialReport(financeOutlet, financePeriod);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= HANDLERS SCAN ASSET RECEIPT (AI OCR) =================
  const checkAiApiKey = async () => {
    try {
      const res = await fetch("/api/admin/scan-asset-receipt");
      const json = await res.json();
      setHasGeminiApiKey(Boolean(json.hasApiKey));
      if (!json.hasApiKey) {
        setShowApiKeySettings(true);
      }
    } catch (err) {
      console.error("Gagal memeriksa API key:", err);
    }
  };

  const handleScanImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      setScanImageBase64(resultStr);
      setScanPreviewUrl(resultStr);
      setScanMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteScan = async () => {
    if (!scanImageBase64) {
      setScanMessage("Pilih atau unggah file foto/screenshot struk nota terlebih dahulu.");
      return;
    }
    setScanLoading(true);
    setScanMessage(null);
    try {
      const res = await fetch("/api/admin/scan-asset-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          imageBase64: scanImageBase64,
          mimeType: scanMimeType,
          apiKey: scanApiKeyInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.items) {
        setScannedItems(
          json.items.map((it: any) => ({
            ...it,
            outletId: scanDefaultOutletId,
            selected: true,
          }))
        );
        if (json.items.length === 0) {
          setScanMessage("Tidak ada item aset yang terbaca dari gambar ini. Pastikan foto jelas dan cukup terang.");
        } else {
          setScanMessage(`Berhasil mendeteksi ${json.items.length} item aset! Silakan sesuaikan data di tabel jika diperlukan.`);
        }
      } else {
        setScanMessage(json.error || "Gagal memindai gambar.");
        if (json.needApiKey) setShowApiKeySettings(true);
      }
    } catch (err: any) {
      setScanMessage(err.message || "Gagal menghubungi server");
    } finally {
      setScanLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!scanApiKeyInput.trim()) return;
    setSavingApiKey(true);
    try {
      const res = await fetch("/api/admin/scan-asset-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_api_key",
          apiKey: scanApiKeyInput.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setHasGeminiApiKey(true);
        setShowApiKeySettings(false);
        setScanMessage("Gemini API Key tersimpan! Sekarang Anda dapat langsung memindai foto nota.");
      } else {
        setScanMessage(json.error || "Gagal menyimpan API key");
      }
    } catch (err: any) {
      setScanMessage(err.message || "Gagal menghubungi server");
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleSaveBatchAssets = async () => {
    const selected = scannedItems.filter((it) => it.selected && it.name && Number(it.cost) > 0);
    if (selected.length === 0) {
      setScanMessage("Pilih minimal satu item aset dengan harga lebih dari Rp 0.");
      return;
    }
    setIsSavingBatch(true);
    setScanMessage(null);
    try {
      const res = await fetch("/api/admin/scan-asset-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_batch",
          items: selected,
          defaultOutletId: scanDefaultOutletId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIsScanAssetOpen(false);
        setScannedItems([]);
        setScanImageBase64(null);
        setScanPreviewUrl(null);
        loadFinancialReport(financeOutlet, financePeriod);
        alert(`Sukses! ${json.message}`);
      } else {
        setScanMessage(json.error || "Gagal menyimpan aset");
      }
    } catch (err: any) {
      setScanMessage(err.message || "Gagal menyimpan aset");
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleAddManualScannedRow = () => {
    setScannedItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: "",
        category: "peralatan",
        asset_type: "bergerak",
        cost: "",
        outletId: scanDefaultOutletId,
        purchase_date: new Date().toISOString().split("T")[0],
        notes: "",
        selected: true,
      },
    ]);
  };

  const handleRemoveScannedRow = (id: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateScannedRow = (id: string, field: string, value: any) => {
    setScannedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleToggleSelectAllScanned = (selected: boolean) => {
    setScannedItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  const loadOutlets = async () => {
    try {
      const res = await fetch("/api/admin/outlets");
      if (res.ok) {
        const json = await res.json();
        setOutletsList(json.outlets || []);
        if (json.centralVault) {
          setCentralVault(json.centralVault);
        }
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

  const loadVouchers = async (silent: boolean = false) => {
    if (!silent) setVoucherLoading(true);
    try {
      const query = new URLSearchParams();
      if (voucherStatusFilter !== "all") query.set("status", voucherStatusFilter);
      if (voucherOutletFilter !== "all") query.set("outletId", voucherOutletFilter);

      const res = await fetch(`/api/admin/vouchers?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setVouchersList(json.vouchers || []);
        setVoucherStats(json.stats || { total: 0, active: 0, redeemed: 0, expired: 0 });
      }
    } catch (e) {
      console.error("Failed to load vouchers", e);
    } finally {
      if (!silent) setVoucherLoading(false);
    }
  };

  const loadPromoCampaign = async (silent: boolean = false, forceResetForm: boolean = false) => {
    if (!silent) setCampaignLoading(true);
    try {
      const res = await fetch("/api/admin/promo-campaign?_t=" + Date.now());
      if (res.ok) {
        const json = await res.json();
        setPromoCampaignData(json);
        const c = json.campaign;
        const formatLocalDT = (dStr?: string) => {
          if (!dStr) return "";
          const d = new Date(dStr);
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        // HANYA perbarui isian form jika bukan silent background polling,
        // ATAU jika form belum pernah diedit (tidak dirty),
        // ATAU jika forceResetForm = true (misal setelah klik Simpan / reload awal)
        if (!silent || forceResetForm || !campaignFormDirtyRef.current) {
          setCampaignForm({
            isActive: Boolean(c.is_active),
            startAt: formatLocalDT(c.start_at),
            endAt: formatLocalDT(c.end_at),
            targetOutletId: c.target_outlet_id || "",
            minFlavoredQty: c.min_flavored_qty || 2,
            freeProductName: c.free_product_name || "Jasmine Poci Iced Tea (Jumbo)",
          });
          setCampaignFormDirty(false);
        }
      }
    } catch (e: any) {
      console.error("Failed to load promo campaign", e);
    } finally {
      if (!silent) setCampaignLoading(false);
    }
  };

  const handleSavePromoCampaign = async (customPayload?: any) => {
    setCampaignLoading(true);
    setCampaignMessage(null);
    try {
      const payload = customPayload || {
        is_active: campaignForm.isActive,
        start_at: campaignForm.startAt ? new Date(campaignForm.startAt).toISOString() : null,
        end_at: campaignForm.endAt ? new Date(campaignForm.endAt).toISOString() : null,
        target_outlet_id: campaignForm.targetOutletId || null,
        min_flavored_qty: campaignForm.minFlavoredQty,
        free_product_name: campaignForm.freeProductName,
      };

      const res = await fetch("/api/admin/promo-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        setCampaignMessage({ text: "✅ Pengaturan promo berhasil disimpan & disinkronkan ke kasir!", isError: false });
        await loadPromoCampaign(true);
        try {
          localStorage.setItem("poci_sync_event", String(Date.now()));
          const ch = new BroadcastChannel("poci_pos_sync");
          ch.postMessage({ type: "PROMO_CAMPAIGN_UPDATED", timestamp: Date.now() });
          ch.close();
        } catch (_) {}
      } else {
        setCampaignMessage({ text: `❌ ${json.error || "Gagal menyimpan promo."}`, isError: true });
      }
    } catch (err: any) {
      setCampaignMessage({ text: `❌ Error: ${err.message}`, isError: true });
    } finally {
      setCampaignLoading(false);
    }
  };

  const applyPresetDuration = (days: number) => {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setCampaignForm((prev) => ({
      ...prev,
      isActive: true,
      startAt: formatLocal(now),
      endAt: formatLocal(future),
    }));
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherForm.outletId) {
      setVoucherMessage({ text: "Silakan pilih kedai penerbit.", isError: true });
      return;
    }
    setVoucherActionLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVoucherForm),
      });
      const json = await res.json();
      if (res.ok) {
        setVoucherMessage({ text: `✅ ${json.message}`, isError: false });
        setIsAddVoucherModalOpen(false);
        setNewVoucherForm({
          outletId: "",
          productName: "Jasmine Poci Iced Tea (Jumbo)",
          expiresInDays: 3,
          notes: "",
        });
        loadVouchers();
      } else {
        setVoucherMessage({ text: `❌ ${json.error || "Gagal menerbitkan voucher."}`, isError: true });
      }
    } catch (e: any) {
      setVoucherMessage({ text: `❌ Error: ${e.message}`, isError: true });
    } finally {
      setVoucherActionLoading(false);
      setTimeout(() => setVoucherMessage(null), 4000);
    }
  };

  const handleUpdateVoucherStatus = async (id: string, nextStatus: "active" | "redeemed" | "expired") => {
    setVoucherActionLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const json = await res.json();
      if (res.ok) {
        setVoucherMessage({ text: `✅ ${json.message}`, isError: false });
        loadVouchers();
      } else {
        setVoucherMessage({ text: `❌ ${json.error || "Gagal mengubah status."}`, isError: true });
      }
    } catch (e: any) {
      setVoucherMessage({ text: `❌ Error: ${e.message}`, isError: true });
    } finally {
      setVoucherActionLoading(false);
      setTimeout(() => setVoucherMessage(null), 3500);
    }
  };

  const handleDeleteVoucher = async (id: string, code: string) => {
    if (!window.confirm(`Yakin ingin menghapus voucher ${code}? Tindakan ini permanen.`)) return;
    setVoucherActionLoading(true);
    try {
      const res = await fetch(`/api/admin/vouchers?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok) {
        setVoucherMessage({ text: `✅ ${json.message}`, isError: false });
        loadVouchers();
      } else {
        setVoucherMessage({ text: `❌ ${json.error || "Gagal menghapus voucher."}`, isError: true });
      }
    } catch (e: any) {
      setVoucherMessage({ text: `❌ Error: ${e.message}`, isError: true });
    } finally {
      setVoucherActionLoading(false);
      setTimeout(() => setVoucherMessage(null), 3500);
    }
  };

  const handleCopyVoucherCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedVoucherCode(code);
      setTimeout(() => setCopiedVoucherCode(null), 2000);
    }
  };

  const filteredVouchersList = useMemo(() => {
    if (!voucherSearch.trim()) return vouchersList;
    const q = voucherSearch.toLowerCase();
    return vouchersList.filter(
      (v) =>
        v.code.toLowerCase().includes(q) ||
        v.product_name.toLowerCase().includes(q) ||
        (v.notes && v.notes.toLowerCase().includes(q)) ||
        (v.outlet && v.outlet.name.toLowerCase().includes(q))
    );
  }, [vouchersList, voucherSearch]);

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
        if (json.centralVault) {
          setCentralVault(json.centralVault);
        }
      }
      await loadFinancialReport(financeOutletRef.current, financePeriodRef.current, silent);
      await loadOutlets();
      await loadMenus();
      await loadVouchers(silent);
      await loadPromoCampaign(silent);
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
      if (json.centralVault) {
        setCentralVault(json.centralVault);
      }
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
          loadVouchers();
          loadPromoCampaign();
        })
        .catch(() => {
          sessionStorage.removeItem("poci_admin_pin");
        });
    }
  }, []);

  useEffect(() => {
    if (activeAdminTab === "vouchers" && isAuthenticated) {
      loadVouchers();
      loadPromoCampaign();
    }
  }, [activeAdminTab, voucherStatusFilter, voucherOutletFilter, isAuthenticated]);

  const loadPurchaseOrders = async () => {
    setPoLoading(true);
    try {
      const res = await fetch("/api/admin/purchase-orders");
      const json = await res.json();
      if (res.ok) {
        setPoForecast(json.forecast || []);
        setPurchaseOrders(json.purchaseOrders || []);
        setSuppliersList(json.suppliers || []);
      }
    } catch {
      // ignore
    } finally {
      setPoLoading(false);
    }
  };

  const handleCreateAutoPoDraft = async (customItems?: any[]) => {
    setPoLoading(true);
    setPoMessage(null);
    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedPoSupplierId || null,
          notes: poNotes || null,
          items: customItems,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setPoMessage({
          text: `Draft PO ${json.purchaseOrder?.po_number || ""} berhasil dibuat. Silakan salin pesan WhatsApp untuk dikirim ke supplier.`,
          isError: false,
        });
        setPoNotes("");
        await loadPurchaseOrders();
      } else {
        setPoMessage({ text: json.error || "Gagal membuat draft PO", isError: true });
      }
    } catch {
      setPoMessage({ text: "Gagal terhubung ke server saat membuat draft PO", isError: true });
    } finally {
      setPoLoading(false);
    }
  };

  const handleUpdatePoStatus = async (id: string, status: "sent" | "received" | "cancelled") => {
    if (status === "received" && !confirm("Tandai PO ini sebagai DITERIMA? Stok gudang pusat akan otomatis bertambah.")) {
      return;
    }
    setPoLoading(true);
    setPoMessage(null);
    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (res.ok) {
        setPoMessage({
          text:
            status === "received"
              ? "PO ditandai diterima & stok gudang pusat telah diperbarui."
              : `Status PO berhasil diubah ke ${status.toUpperCase()}.`,
          isError: false,
        });
        await loadPurchaseOrders();
        if (status === "received") refreshData(undefined, true);
      } else {
        setPoMessage({ text: json.error || "Gagal memperbarui status PO", isError: true });
      }
    } catch {
      setPoMessage({ text: "Gagal memperbarui status PO", isError: true });
    } finally {
      setPoLoading(false);
    }
  };

  const handleDeletePo = async (id: string, poNumber: string) => {
    if (!confirm(`Hapus draft PO ${poNumber}?`)) return;
    try {
      const res = await fetch(`/api/admin/purchase-orders?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        await loadPurchaseOrders();
      }
    } catch {
      // ignore
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.name.trim()) return;
    setPoLoading(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplierForm),
      });
      const json = await res.json();
      if (res.ok) {
        setNewSupplierForm({ name: "", phone: "", lead_time_days: "1", notes: "" });
        setPoMessage({ text: `Supplier "${json.supplier?.name}" berhasil ditambahkan.`, isError: false });
        await loadPurchaseOrders();
      } else {
        setPoMessage({ text: json.error || "Gagal menambah supplier", isError: true });
      }
    } catch {
      setPoMessage({ text: "Gagal menambah supplier", isError: true });
    } finally {
      setPoLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Hapus supplier "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/suppliers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) await loadPurchaseOrders();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeAdminTab === "purchase_orders" && isAuthenticated) {
      loadPurchaseOrders();
    }
  }, [activeAdminTab, isAuthenticated]);

  const loadSocialDrafts = async () => {
    setSocialLoading(true);
    try {
      const res = await fetch("/api/admin/social-content");
      const json = await res.json();
      if (res.ok) {
        setSocialDrafts(json.drafts || []);
        setHasSerperKey(Boolean(json.hasSerperKey));
      }
    } catch {
      // ignore
    } finally {
      setSocialLoading(false);
    }
  };

  const handleGenerateSocialDraft = async () => {
    setSocialLoading(true);
    setSocialMessage(null);
    try {
      const res = await fetch("/api/admin/social-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformHint: socialPlatformHint || undefined,
          customTopic: socialCustomTopic || undefined,
          voiceName: socialVoiceHint || "Kore",
          notifyTelegram: socialSendTelegram,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSocialCustomTopic("");
        setSocialMessage({
          text: `Ide konten baru untuk ${json.draft?.platform || "Sosmed"} berhasil dibuat (anti-AI slop & grounded ke tren 7 hari terakhir).`,
          isError: false,
        });
        await loadSocialDrafts();
      } else {
        setSocialMessage({ text: json.error || "Gagal membuat ide konten", isError: true });
      }
    } catch {
      setSocialMessage({ text: "Gagal terhubung ke server saat membuat konten sosmed", isError: true });
    } finally {
      setSocialLoading(false);
    }
  };

  const handleUpdateSocialStatus = async (id: string, status: "draft" | "posted" | "skipped") => {
    try {
      const res = await fetch("/api/admin/social-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await loadSocialDrafts();
    } catch {
      // ignore
    }
  };

  const handleDeleteSocialDraft = async (id: string) => {
    if (!confirm("Hapus draft konten sosmed ini?")) return;
    try {
      const res = await fetch(`/api/admin/social-content?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) await loadSocialDrafts();
    } catch {
      // ignore
    }
  };

  const copySocialText = (key: string, text: string) => {
    navigator.clipboard.writeText(text || "");
    setCopiedSocialKey(key);
    setTimeout(() => setCopiedSocialKey(null), 2000);
  };

  const handleBrowserSpeechPreview = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSocialMessage({ text: "Browser ini tidak mendukung Web Speech API.", isError: true });
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "id-ID";
    utter.rate = 1.03;
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().includes("id"));
    if (idVoice) utter.voice = idVoice;
    window.speechSynthesis.speak(utter);
  };

  const handleSynthesizeTts = async (draftId: string, fallbackText: string, defaultVoice: string) => {
    const textToSpeak = (draftScriptMap[draftId] ?? fallbackText).trim();
    const selectedVoice = draftVoiceMap[draftId] || defaultVoice || "Kore";
    if (!textToSpeak) return;

    setTtsGeneratingId(draftId);
    setSocialMessage(null);
    try {
      const res = await fetch("/api/admin/social-content/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, text: textToSpeak, voiceName: selectedVoice }),
      });
      const json = await res.json();
      if (res.ok) {
        setSocialMessage({
          text: `Audio voiceover TTS (.wav) suara "${json.voiceName}" siap diputar & diunduh.`,
          isError: false,
        });
        await loadSocialDrafts();
      } else {
        setSocialMessage({
          text: json.error || "Gagal merender TTS Gemini, gunakan tombol Preview Suara Browser.",
          isError: true,
        });
        if (json.fallbackToBrowserSpeech) {
          handleBrowserSpeechPreview(textToSpeak);
        }
      }
    } catch {
      setSocialMessage({ text: "Gagal menghubungi server TTS.", isError: true });
    } finally {
      setTtsGeneratingId(null);
    }
  };

  useEffect(() => {
    if (activeAdminTab === "social_media" && isAuthenticated) {
      loadSocialDrafts();
    }
  }, [activeAdminTab, isAuthenticated]);

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
        if (resJson.centralVault) {
          setCentralVault(resJson.centralVault);
        }
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

  const handleCentralCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(centralCashAmount);
    if (isNaN(amt) || amt <= 0) {
      setCentralCashMessage("❌ Masukkan nominal yang valid (lebih dari 0).");
      return;
    }
    setCentralCashLoading(true);
    setCentralCashMessage(null);
    try {
      const mode = centralCashAction === "topup" ? "central_cash_topup" : "central_cash_set";
      const res = await fetch("/api/admin/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          amount: amt,
          notes: centralCashNotes || undefined,
          pin: sessionStorage.getItem("poci_admin_pin") || pin,
        }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setCentralCashMessage("✅ " + resJson.message);
        if (resJson.centralVault) {
          setCentralVault(resJson.centralVault);
        }
        refreshData();
        setTimeout(() => {
          setIsCentralCashModalOpen(false);
          setCentralCashMessage(null);
          setCentralCashAmount(0);
          setCentralCashNotes("");
        }, 1200);
      } else {
        setCentralCashMessage("❌ " + (resJson.error || "Gagal memperbarui kas pusat"));
      }
    } catch {
      setCentralCashMessage("❌ Terjadi kesalahan koneksi.");
    } finally {
      setCentralCashLoading(false);
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
          secondaryFlavorMaterialId: newMenuForm.secondaryFlavorMaterialId || undefined,
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
          secondaryFlavorMaterialId: "",
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
    setCurrentEditingGroup(item);
    const allRecipes = [
      ...(item.jumbo?.recipes || []),
      ...(item.reguler?.recipes || []),
      ...(item.single?.recipes || []),
    ];
    // Ambil semua bahan sachet / perasa unik
    const flavorMap = new Map<string, any>();
    allRecipes.forEach((r: any) => {
      const n = (r.raw_material?.name || "").toLowerCase();
      if (!n.includes("cup") && !n.includes("kantong teh") && !n.includes("tea premix") && !n.includes("gula")) {
        if (!flavorMap.has(r.raw_material_id)) {
          flavorMap.set(r.raw_material_id, r);
        }
      }
    });
    const flavorRecipes = Array.from(flavorMap.values());
    const flavorRecipe = flavorRecipes[0];
    const secondaryFlavorRecipe = flavorRecipes[1];

    setEditMenuForm({
      oldBaseName: item.baseName,
      baseName: item.baseName,
      category: item.category || "fruity",
      flavorMaterialId: flavorRecipe ? flavorRecipe.raw_material_id : "",
      secondaryFlavorMaterialId: secondaryFlavorRecipe ? secondaryFlavorRecipe.raw_material_id : "",
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
          secondaryFlavorMaterialId: editMenuForm.secondaryFlavorMaterialId || undefined,
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
      currentStock: Number(targetStock) || 0,
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
    if (!selectedMaterialId || isNaN(qty) || qty <= 0) {
      setRestockMessage("Pilih bahan baku dan masukkan jumlah yang valid (> 0).");
      return;
    }

    if ((restockMode === "add" || restockMode === "return") && !restockOutletId) {
      setRestockMessage("Pilih kedai tujuan / asal terlebih dahulu.");
      return;
    }

    if (selectedMaterialId === "CASH_TRANSFER") {
      let finalMode = "cash_transfer";
      let direction = "to_outlet";
      if (restockMode === "add") {
        direction = "to_outlet";
      } else if (restockMode === "return") {
        direction = "to_central";
      } else if (restockMode === "central_in") {
        finalMode = "central_cash_topup";
      } else if (restockMode === "central_set") {
        finalMode = "central_cash_set";
      }

      try {
        const res = await fetch("/api/admin/restock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outletId: restockOutletId,
            mode: finalMode,
            direction,
            amount: qty,
            quantity: qty,
            notes: restockNotes,
            pin: sessionStorage.getItem("poci_admin_pin") || pin,
          }),
        });
        const resData = await res.json();
        if (res.ok) {
          setRestockMessage("✅ " + resData.message);
          if (resData.centralVault) setCentralVault(resData.centralVault);
          setRestockQty("");
          setRestockNotes("");
          refreshData();
          setTimeout(() => {
            setIsRestockOpen(false);
            setRestockMessage(null);
          }, 1500);
        } else {
          setRestockMessage("❌ " + resData.error);
        }
      } catch {
        setRestockMessage("❌ Terjadi kesalahan pengiriman transfer kas.");
      }
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
          notes: restockNotes,
          pin: sessionStorage.getItem("poci_admin_pin") || pin,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setRestockMessage("✅ " + resData.message);
        setRestockQty("");
        setRestockNotes("");
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
    if (data.rawMaterials && data.rawMaterials.length > 0) {
      return data.rawMaterials;
    }
    const map = new Map<string, { id: string; name: string; unit: string; master_stock?: number }>();
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
              href="/download"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white transition border border-emerald-500/40"
              title="Unduh File APK Android Real Device"
            >
              <span>📲</span>
              <span className="hidden sm:inline">Unduh APK</span>
            </Link>

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

          <button
            onClick={() => {
              setActiveAdminTab("vouchers");
              loadVouchers();
            }}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "vouchers"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>🎟️ Voucher Promo ({voucherStats.total})</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab("purchase_orders");
              loadPurchaseOrders();
            }}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "purchase_orders"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>📋 PO &amp; Prediksi Stok</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab("social_media");
              loadSocialDrafts();
            }}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeAdminTab === "social_media"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>📱 Konten Sosmed</span>
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

              {/* 3 Kartu Posisi Kas Harian (Total Kas, Kas di Bank, Kas di Peti Cash) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider">
                    💰 1. Total Kas (Day-by-Day)
                  </span>
                  <h3 className="text-2xl font-black font-mono mt-1.5">
                    {formatRupiah(financeData?.cashPosition?.totalKas ?? 0)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">Kas Bank (QRIS) + Peti Cash (terpisah dari Modal)</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                    🏦 2. Kas di Bank (Payment QRIS)
                  </span>
                  <h3 className="text-2xl font-black text-blue-900 font-mono mt-1.5">
                    {formatRupiah(financeData?.cashPosition?.kasDiBank ?? 0)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Rekening khusus akumulasi QRIS (bukan rekening modal)</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
                    💵 3. Kas di Peti Cash
                  </span>
                  <h3 className="text-2xl font-black text-amber-900 font-mono mt-1.5">
                    {formatRupiah(financeData?.cashPosition?.kasDiPetiCash ?? 0)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Brankas Pusat + Kas di Laci Kedai</p>
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
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-slate-700 font-mono">{financeData?.summary?.totalTransactions || 0}</span> nota
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-emerald-700 font-mono">{financeData?.summary?.paidCups ?? financeData?.summary?.totalCups ?? 0}</span> terjual
                      {(financeData?.summary?.freeCups || 0) > 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-amber-600 font-mono">+{financeData?.summary?.freeCups} gratis</span>
                        </>
                      )}
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
                    <p className="text-[11px] text-slate-500 mt-2 font-mono truncate" title={`HPP: ${formatRupiah(financeData?.summary?.totalHPP || 0)} | Beban Tetap: ${formatRupiah(financeData?.summary?.totalFixedExpenses || 0)} | Beban Harian: ${formatRupiah(financeData?.summary?.totalVariableExpenses || 0)}`}>
                      HPP: {formatRupiah(financeData?.summary?.totalHPP || 0)} • Beban: {formatRupiah(financeData?.summary?.totalExpenses || 0)}
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
                                      {p.paidQuantity !== undefined ? p.paidQuantity : p.quantity} cup terjual
                                      {(p.freeQuantity || 0) > 0 && (
                                        <span className="font-bold text-amber-700 ml-1">
                                          (+{p.freeQuantity} gratis)
                                        </span>
                                      )}{" "}
                                      • Margin {p.marginPercent}%
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
                                  {o.paidCupCount !== undefined ? o.paidCupCount : o.cupCount} terjual
                                  {(o.freeCupCount || 0) > 0 && (
                                    <span className="font-bold text-amber-700 ml-1">
                                      (+{o.freeCupCount} gratis)
                                    </span>
                                  )}{" "}
                                  • {o.transactionCount} transaksi
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

                    {(() => {
                      const { pagedItems, total, needsScroll } = paginateList(financeData?.timeline || [], "timeline");
                      return (
                        <>
                          <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                  <th className="py-2.5 px-3">Tanggal</th>
                                  <th className="py-2.5 px-3 text-right">Kas Masuk (Inflow)</th>
                                  <th className="py-2.5 px-3 text-right">Kas Keluar (Outflow)</th>
                                  <th className="py-2.5 px-3 text-right">Arus Kas Bersih (Net)</th>
                                  <th className="py-2.5 px-3 text-center">Status Arus Kas</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono">
                                {pagedItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                                      Belum ada riwayat pergerakan kas di periode ini
                                    </td>
                                  </tr>
                                ) : (
                                  pagedItems.map((d: any, idx: number) => {
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
                          {renderTablePagination("timeline", total)}
                        </>
                      );
                    })()}
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
                      <div className="p-3 rounded-xl bg-rose-50/50 text-rose-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-sans">2. Harga Pokok Penjualan (HPP BOM Resep Bahan Baku)</span>
                          <span className="font-bold text-sm">
                            - {formatRupiah(financeData?.summary?.totalHPP || 0)}
                          </span>
                        </div>
                        {(financeData?.summary?.freeCupsHPP || 0) > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200">
                            <span className="font-sans flex items-center gap-1.5 font-bold">
                              <span>🎁 Termasuk Biaya Modal Promo Gratis ({financeData?.summary?.freeCups || 0} Cup):</span>
                            </span>
                            <span className="font-bold font-mono">
                              {formatRupiah(financeData?.summary?.freeCupsHPP || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Laba Kotor */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-900">
                        <div>
                          <span className="font-bold font-sans block">3. Laba Kotor Usaha (Gross Profit)</span>
                          <span className="text-[10px] text-emerald-700 font-sans font-medium">
                            Gross Margin: {financeData?.summary?.grossMarginPercent || 0}%
                          </span>
                        </div>
                        <span className="font-black text-base">
                          {formatRupiah(financeData?.summary?.grossProfit || 0)}
                        </span>
                      </div>

                      {/* Beban Operasional Variabel (Harian) */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 text-amber-900">
                        <div>
                          <span className="font-bold font-sans block">4. Beban Operasional Harian (Variable Costs)</span>
                          <span className="text-[10px] text-amber-700 font-sans font-normal">
                            Belanja es batu kristal, gas LPG, kantong kresek, logistik harian kedai
                          </span>
                        </div>
                        <span className="font-bold text-sm">
                          - {formatRupiah(financeData?.summary?.totalVariableExpenses ?? 0)}
                        </span>
                      </div>

                      {/* Beban Tetap Bulanan (Fixed Overhead Costs) */}
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-150 text-indigo-950 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold font-sans flex items-center gap-1.5 text-xs">
                              <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                              5. Beban Tetap Bulanan Terhitung ({financeData?.summary?.periodDays || 30} Hari)
                            </span>
                            <span className="text-[10px] text-indigo-600 font-sans font-normal block">
                              Alokasi sewa tempat, gaji karyawan, listrik/air ({formatRupiah(financeData?.summary?.totalMonthlyFixedCost || 0)}/bulan)
                            </span>
                          </div>
                          <span className="font-bold text-sm text-indigo-900">
                            - {formatRupiah(financeData?.summary?.totalFixedExpenses ?? 0)}
                          </span>
                        </div>

                        {/* Rincian Komponen Beban Tetap Terhitung */}
                        {financeData?.fixedCostBreakdown && financeData.fixedCostBreakdown.length > 0 && (
                          <div className="pt-2 border-t border-indigo-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                            {financeData.fixedCostBreakdown.map((fc: any) => (
                              <div
                                key={fc.id}
                                className="bg-white/80 px-2.5 py-1.5 rounded-lg border border-indigo-200/80 flex items-center justify-between gap-1"
                              >
                                <span className="font-sans font-bold text-slate-700 truncate" title={fc.name}>
                                  {fc.name}
                                </span>
                                <span className="font-mono font-bold text-indigo-800 shrink-0">
                                  {formatRupiah(fc.amountProrated)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Total Beban Usaha */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 text-rose-900 text-xs">
                        <span className="font-bold font-sans">Total Beban Usaha (Variabel + Tetap)</span>
                        <span className="font-bold font-mono">
                          - {formatRupiah(financeData?.summary?.totalExpenses || 0)}
                        </span>
                      </div>

                      {/* Laba Bersih Komprehensif (Net Profit / Loss) */}
                      <div
                        className={`flex items-center justify-between p-4 rounded-xl text-white ${
                          (financeData?.summary?.netProfit || 0) >= 0 ? "bg-slate-900" : "bg-rose-950 border border-rose-800"
                        }`}
                      >
                        <div>
                          <p className="font-black font-sans text-sm flex items-center gap-1.5">
                            {(financeData?.summary?.netProfit || 0) >= 0 ? (
                              <span className="text-emerald-400">🟢 6. Laba Bersih Berjalan (Net Profit)</span>
                            ) : (
                              <span className="text-rose-400">🔴 6. Defisit / Rugi Bersih Berjalan (Net Loss)</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-300 font-sans font-normal">
                            {(financeData?.summary?.netProfit || 0) >= 0
                              ? "Laba bersih riil setelah dikurangi HPP bahan baku, beban harian, dan beban tetap bulanan"
                              : "Perhatian: Total beban operasional & HPP melampaui pendapatan pada periode ini"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-black text-xl ${
                              (financeData?.summary?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {(financeData?.summary?.netProfit || 0) >= 0 ? "+" : ""}
                            {formatRupiah(financeData?.summary?.netProfit || 0)}
                          </span>
                          <span className="block text-[10px] text-slate-300 font-sans font-bold">
                            Net Margin: {financeData?.summary?.netMarginPercent || 0}%
                          </span>
                        </div>
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

                    {(() => {
                      const { pagedItems, total, needsScroll } = paginateList(financeData?.productSales || [], "productSales");
                      return (
                        <>
                          <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
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
                                {pagedItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                                      Belum ada data penjualan menu
                                    </td>
                                  </tr>
                                ) : (
                                  pagedItems.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                                      <td className="py-2.5 px-3 font-bold font-sans text-slate-900">{p.name}</td>
                                      <td className="py-2.5 px-3 font-sans text-slate-500 capitalize">{p.category}</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                        <div>{p.paidQuantity !== undefined ? p.paidQuantity : p.quantity} cup</div>
                                        {(p.freeQuantity || 0) > 0 && (
                                          <div className="text-[10px] text-amber-700 font-bold">
                                            +{p.freeQuantity} gratis
                                          </div>
                                        )}
                                      </td>
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
                          {renderTablePagination("productSales", total)}
                        </>
                      );
                    })()}
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
                        <span className="text-xs font-mono font-bold text-emerald-700">Aset Lancar &amp; Tetap</span>
                      </div>

                      <div className="space-y-3 text-xs font-mono">
                        <div className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-100/60">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1.5 font-sans">
                            1. Aset Lancar (Current Assets)
                          </span>
                          <div className="space-y-2">
                            <div className="p-2 bg-white rounded-lg flex items-center justify-between border border-slate-100">
                              <div>
                                <p className="font-bold font-sans text-slate-800">Kas Fisik Tunai (Cash on Hand)</p>
                                <p className="text-[10px] text-slate-400 font-sans">Penerimaan kasir tunai berjalan</p>
                              </div>
                              <span className="font-bold text-slate-900">
                                {formatRupiah(financeData?.neraca?.aktivaLancar?.kasTunai ?? financeData?.neraca?.aktiva?.kasTunai ?? 0)}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-lg flex items-center justify-between border border-slate-100">
                              <div>
                                <p className="font-bold font-sans text-slate-800">Kas Bank QRIS Settlement</p>
                                <p className="text-[10px] text-slate-400 font-sans">Saldo penerimaan QRIS non-tunai</p>
                              </div>
                              <span className="font-bold text-slate-900">
                                {formatRupiah(financeData?.neraca?.aktivaLancar?.kasBankQRIS ?? financeData?.neraca?.aktiva?.kasBankQRIS ?? 0)}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-lg flex items-center justify-between border border-slate-100">
                              <div>
                                <p className="font-bold font-sans text-slate-800">Persediaan Bahan Baku Fisik</p>
                                <p className="text-[10px] text-slate-400 font-sans">Valuasi stok cup, sirup &amp; premix</p>
                              </div>
                              <span className="font-bold text-slate-900">
                                {formatRupiah(financeData?.neraca?.aktivaLancar?.persediaanBahanBaku ?? financeData?.neraca?.aktiva?.persediaanBahanBaku ?? 0)}
                              </span>
                            </div>

                            <div className="p-2 bg-emerald-50 rounded-lg flex items-center justify-between border border-emerald-200/80">
                              <div>
                                <p className="font-bold font-sans text-emerald-900">Sisa Kas Modal Usaha</p>
                                <p className="text-[10px] text-emerald-700 font-sans">Modal awal belum terpakai aset/RnD</p>
                              </div>
                              <span className="font-bold text-emerald-900">
                                {formatRupiah(financeData?.neraca?.aktivaLancar?.sisaKasModal ?? 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Aset Tetap */}
                        <div className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-100/60 space-y-2">
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1 font-sans">
                            2. Aktiva Tetap (Fixed Assets / CAPEX)
                          </span>
                          
                          <div className="p-2 bg-white rounded-lg flex items-center justify-between border border-slate-100">
                            <div>
                              <p className="font-bold font-sans text-slate-800 flex items-center gap-1.5">
                                <span>🏛️ Aset Tidak Bergerak</span>
                                <span className="text-[9px] font-normal px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Nilai Stabil / Jangka Panjang</span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-sans">Konstruksi booth display, gerobak &amp; meja bar utama</p>
                            </div>
                            <span className="font-bold text-slate-900">
                              {formatRupiah(financeData?.neraca?.aktivaTetap?.asetTidakBergerak ?? financeData?.capitalSummary?.totalAsetTidakBergerak ?? 0)}
                            </span>
                          </div>

                          <div className="p-2 bg-white rounded-lg flex items-center justify-between border border-slate-100">
                            <div>
                              <p className="font-bold font-sans text-slate-800 flex items-center gap-1.5">
                                <span>🚚 Aset Bergerak</span>
                                <span className="text-[9px] font-normal px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-100">Masa Pakai Terbatas / Menyusut</span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-sans">Mesin cup sealer, dispenser termos, cooler box &amp; tablet POS</p>
                            </div>
                            <span className="font-bold text-slate-900">
                              {formatRupiah(financeData?.neraca?.aktivaTetap?.asetBergerak ?? financeData?.capitalSummary?.totalAsetBergerak ?? 0)}
                            </span>
                          </div>

                          <div className="p-2 bg-blue-100/40 rounded-lg flex items-center justify-between border border-blue-200/50">
                            <span className="text-[11px] font-bold font-sans text-blue-900">Subtotal Aktiva Tetap</span>
                            <span className="font-black text-blue-950">
                              {formatRupiah(financeData?.neraca?.aktivaTetap?.totalAktivaTetap ?? 0)}
                            </span>
                          </div>
                        </div>

                        {/* Total Aktiva */}
                        <div className="p-4 bg-emerald-600 text-white rounded-xl flex items-center justify-between text-sm mt-3">
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
                        <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-100/60">
                          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block mb-1.5 font-sans">
                            1. Kewajiban Lancar (Liabilities)
                          </span>
                          <div className="space-y-2">
                            <div className="p-2 bg-white rounded-lg flex items-center justify-between text-rose-900 border border-slate-100">
                              <div>
                                <p className="font-bold font-sans">Hutang Selisih Cup Karyawan</p>
                                <p className="text-[10px] text-rose-600 font-sans">Piutang/potongan shift closing</p>
                              </div>
                              <span className="font-bold">
                                {formatRupiah(financeData?.neraca?.pasiva?.kewajibanLancar?.hutangSelisihCup || 0)}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-lg flex items-center justify-between border border-slate-100">
                              <div>
                                <p className="font-bold font-sans text-slate-800">Beban Operasional Terutang</p>
                                <p className="text-[10px] text-slate-400 font-sans">Biaya operasional berjalan</p>
                              </div>
                              <span className="font-bold text-slate-900">
                                {formatRupiah(financeData?.neraca?.pasiva?.kewajibanLancar?.bebanOperasionalTerutang || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ekuitas */}
                        <div className="p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100/60">
                          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block mb-1.5 font-sans">
                            2. Ekuitas Modal (Equity)
                          </span>
                          <div className="space-y-2">
                            <div className="p-2 bg-white rounded-lg flex items-center justify-between border border-slate-100">
                              <div>
                                <p className="font-bold font-sans text-slate-800">Modal Disetor Awal Usaha</p>
                                <p className="text-[10px] text-slate-400 font-sans">Akumulasi modal disetor pemilik/investor</p>
                              </div>
                              <span className="font-bold text-slate-900">
                                {formatRupiah(financeData?.neraca?.pasiva?.ekuitas?.modalDisetor || 0)}
                              </span>
                            </div>

                            {Number(financeData?.neraca?.pasiva?.ekuitas?.bebanRnd || 0) > 0 && (
                              <div className="p-2 bg-amber-50 rounded-lg flex items-center justify-between text-amber-900 border border-amber-200">
                                <div>
                                  <p className="font-bold font-sans">Alokasi Beban Riset &amp; RnD</p>
                                  <p className="text-[10px] text-amber-700 font-sans">Pengurang ekuitas untuk riset resep/menu</p>
                                </div>
                                <span className="font-bold">
                                  - {formatRupiah(financeData?.neraca?.pasiva?.ekuitas?.bebanRnd || 0)}
                                </span>
                              </div>
                            )}

                            <div className="p-2 bg-emerald-50 rounded-lg flex items-center justify-between text-emerald-900 border border-emerald-200">
                              <div>
                                <p className="font-bold font-sans">Laba Ditahan (Retained Earnings)</p>
                                <p className="text-[10px] text-emerald-700 font-sans">Akumulasi keuntungan bersih usaha</p>
                              </div>
                              <span className="font-bold">
                                {formatRupiah(financeData?.neraca?.pasiva?.ekuitas?.labaDitahan || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Total Pasiva */}
                        <div className="p-4 bg-indigo-700 text-white rounded-xl flex items-center justify-between text-sm mt-3">
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

              {/* MODULE: CATATAN BIAYA & BEBAN (EXPENSES & FIXED OVERHEAD & CAPITAL) */}
              {financeModule === "expenses" && (
                <div className="space-y-6">
                  {/* SUB-TAB NAVIGATOR */}
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit">
                    <button
                      type="button"
                      onClick={() => setExpenseSubTab("fixed")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        expenseSubTab === "fixed"
                          ? "bg-white text-indigo-900 shadow-xs border border-indigo-100"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Beban Tetap Bulanan (Fixed OPEX)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseSubTab("variable")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        expenseSubTab === "variable"
                          ? "bg-white text-rose-900 shadow-xs border border-rose-100"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pengeluaran Harian (Variable OPEX)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseSubTab("capital")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        expenseSubTab === "capital"
                          ? "bg-white text-emerald-900 shadow-xs border border-emerald-100"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Modal Awal, Aset (CAPEX) &amp; RnD</span>
                    </button>
                  </div>

                  {/* SEKSI 1: BEBAN & BIAYA TETAP BULANAN (DYNAMIC FIXED COSTS) */}
                  {expenseSubTab === "fixed" && (
                    <div className="bg-white rounded-2xl border border-indigo-150 p-5 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            Beban &amp; Biaya Tetap Bulanan (Dynamic Fixed Costs)
                          </h4>
                          <p className="text-xs text-slate-500">
                            Beban rutin (sewa booth, gaji kasir, listrik, air, wifi, dll.) yang dapat diedit bebas dan otomatis dihitung ke rugi laba bulanan
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setFixedCostMessage(null);
                              setFixedCostForm({
                                name: "",
                                amount: "",
                                category: "sewa",
                                outletId: financeOutlet === "all" ? "all" : financeOutlet,
                                notes: "",
                                is_active: true,
                              });
                              setIsAddFixedCostOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Tambah Beban Tetap</span>
                          </button>
                        </div>
                      </div>

                      {/* Ringkasan Biaya Tetap */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                            Total Beban Tetap per Bulan
                          </span>
                          <span className="text-lg font-black font-mono text-indigo-950 mt-0.5 block">
                            {formatRupiah(financeData?.summary?.totalMonthlyFixedCost || 0)}
                            <span className="text-xs font-normal text-indigo-700"> /bln</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                            Estimasi Beban Tetap Harian
                          </span>
                          <span className="text-lg font-black font-mono text-indigo-950 mt-0.5 block">
                            {formatRupiah(financeData?.summary?.dailyFixedCost || 0)}
                            <span className="text-xs font-normal text-indigo-700"> /hari</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                            Terhitung di Periode ({financeData?.summary?.periodDays || 30} Hari)
                          </span>
                          <span className="text-lg font-black font-mono text-indigo-950 mt-0.5 block">
                            {formatRupiah(financeData?.summary?.totalFixedExpenses || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Tabel Beban Tetap */}
                      {(() => {
                        const { pagedItems, total, needsScroll } = paginateList(financeData?.fixedCosts || [], "fixedCosts");
                        return (
                          <>
                            <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                    <th className="py-2.5 px-3">Nama Beban Tetap</th>
                                    <th className="py-2.5 px-3">Kategori</th>
                                    <th className="py-2.5 px-3">Kedai / Alokasi</th>
                                    <th className="py-2.5 px-3 text-right">Biaya / Bulan</th>
                                    <th className="py-2.5 px-3 text-right">Biaya / Hari</th>
                                    <th className="py-2.5 px-3">Catatan</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                    <th className="py-2.5 px-3 text-center">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {pagedItems.length === 0 ? (
                                    <tr>
                                      <td colSpan={8} className="py-8 text-center text-slate-400">
                                        Belum ada komponen beban tetap yang diatur. Klik &quot;+ Tambah Beban Tetap&quot; untuk menambahkan.
                                      </td>
                                    </tr>
                                  ) : (
                                    pagedItems.map((fc: any) => (
                                <tr key={fc.id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-3 font-bold text-slate-900">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                                      <span>{fc.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 capitalize">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-100">
                                      {fc.category || "operasional"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                                    {fc.outlet?.name || "Semua Kedai (Konsolidasi)"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 text-xs">
                                    {formatRupiah(fc.amount)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-[11px]">
                                    {formatRupiah(fc.dailyAmount || Math.round(fc.amount / 30))}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={fc.notes || ""}>
                                    {fc.notes || "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      onClick={() => handleToggleFixedCost(fc.id, fc.is_active)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                                        fc.is_active
                                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                      }`}
                                      title="Klik untuk mengubah status aktif"
                                    >
                                      {fc.is_active ? "Aktif" : "Nonaktif"}
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => {
                                          setFixedCostMessage(null);
                                          setFixedCostForm({
                                            id: fc.id,
                                            name: fc.name,
                                            amount: fc.amount,
                                            category: fc.category || "operasional",
                                            outletId: fc.outlet_id || "all",
                                            notes: fc.notes || "",
                                            is_active: fc.is_active,
                                          });
                                          setIsEditFixedCostOpen(true);
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                        title="Edit Beban Tetap"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFixedCost(fc.id, fc.name)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                        title="Hapus Beban Tetap"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {renderTablePagination("fixedCosts", total)}
                    </>
                  );
                })()}
                    </div>
                  )}

                  {/* SEKSI 2: LOG PENGELUARAN HARIAN & BEBAN VARIABEL */}
                  {expenseSubTab === "variable" && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-rose-600" />
                            Log Pengeluaran Operasional Harian (Variable Costs)
                          </h4>
                          <p className="text-xs text-slate-500">
                            Total beban harian terdata: {formatRupiah(financeData?.summary?.totalVariableExpenses || financeData?.summary?.totalExpenses || 0)}
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

                      {(() => {
                        const { pagedItems, total, needsScroll } = paginateList(financeData?.expenses || [], "expenses");
                        return (
                          <>
                            <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
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
                                  {pagedItems.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} className="py-8 text-center text-slate-400">
                                        Belum ada pengeluaran yang dicatat di periode ini
                                      </td>
                                    </tr>
                                  ) : (
                                    pagedItems.map((e: any) => (
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
                            {renderTablePagination("expenses", total)}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* SEKSI 3: MODAL AWAL, PEMBELIAN ASET TETAP (CAPEX) & RnD */}
                  {expenseSubTab === "capital" && (
                    <div className="space-y-6">
                      {/* Metric Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs">
                          <div className="flex items-center justify-between text-emerald-800 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Total Modal Disetor</span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <Landmark className="w-4 h-4 text-emerald-600" />
                            </div>
                          </div>
                          <p className="text-xl font-black font-mono text-slate-900">
                            {formatRupiah(financeData?.capitalSummary?.totalInitialCapital || 0)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 font-sans">
                            Injeksi modal awal pemilik &amp; investor
                          </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-xs">
                          <div className="flex items-center justify-between text-sky-800 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Pembelian Aset (CAPEX)</span>
                            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-sky-600" />
                            </div>
                          </div>
                          <p className="text-xl font-black font-mono text-sky-950">
                            {formatRupiah(financeData?.capitalSummary?.totalCapitalAssets || 0)}
                          </p>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-sky-50 text-[10px] text-slate-500 font-sans">
                            <span className="text-emerald-700 font-bold">🏛️ {formatRupiah(financeData?.capitalSummary?.totalAsetTidakBergerak || 0)} (Stabil)</span>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">🚚 {formatRupiah(financeData?.capitalSummary?.totalAsetBergerak || 0)} (Menyusut)</span>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs">
                          <div className="flex items-center justify-between text-amber-800 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Pengeluaran Riset (RnD)</span>
                            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                            </div>
                          </div>
                          <p className="text-xl font-black font-mono text-amber-950">
                            {formatRupiah(financeData?.capitalSummary?.totalRndExpenses || 0)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 font-sans">
                            Trial formula resep &amp; tester menu
                          </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs bg-linear-to-br from-white to-emerald-50/30">
                          <div className="flex items-center justify-between text-slate-800 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Sisa Kas Modal Awal</span>
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <Wallet className="w-4 h-4 text-indigo-600" />
                            </div>
                          </div>
                          <p className={`text-xl font-black font-mono ${
                            (financeData?.capitalSummary?.remainingCapitalCash || 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}>
                            {formatRupiah(financeData?.capitalSummary?.remainingCapitalCash || 0)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 font-sans">
                            Kas modal tersisa untuk operasional
                          </p>
                        </div>
                      </div>

                      {/* Info Banner Alur Akuntansi & Karakteristik Aset */}
                      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 flex items-start gap-3">
                        <Scale className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 w-full">
                          <p className="font-bold">Klasifikasi Karakteristik Aset &amp; Alur Akuntansi:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 font-sans">
                            <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60">
                              <p className="font-bold text-emerald-800 flex items-center gap-1">🏛️ Aset Tidak Bergerak (Nilai Stabil)</p>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                Masa pakainya umumnya panjang dan cenderung memiliki stabilitas nilai jangka panjang (contoh: Booth display, gerobak utama, meja bar kasir terpasang).
                              </p>
                            </div>
                            <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60">
                              <p className="font-bold text-amber-800 flex items-center gap-1">🚚 Aset Bergerak (Nilai Menyusut)</p>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                Masa pakainya lebih terbatas dan nilainya berfluktuasi atau menyusut karena pemakaian rutin (contoh: Mesin cup sealer, dispenser termos stainless, cooler box, tablet POS).
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* TABEL 1: PENCATATAN MODAL AWAL */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                              <Landmark className="w-4 h-4 text-emerald-600" />
                              Pencatatan Modal Awal Disetor (Equity Capital)
                            </h4>
                            <p className="text-xs text-slate-500">
                              Daftar setoran modal usaha dari pemilik kedai atau investor awal
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCapitalMessage(null);
                              setCapitalForm({
                                source: "Modal Pribadi Pemilik",
                                amount: "",
                                date: new Date().toISOString().split("T")[0],
                                notes: "",
                              });
                              setIsAddCapitalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Setor Modal Awal</span>
                          </button>
                        </div>

                        {(() => {
                          const { pagedItems, total, needsScroll } = paginateList(financeData?.capitals || [], "capitals");
                          return (
                            <>
                              <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                      <th className="py-2.5 px-3">Tanggal Setor</th>
                                      <th className="py-2.5 px-3">Sumber Modal / Penyetor</th>
                                      <th className="py-2.5 px-3 text-right">Nominal Setoran</th>
                                      <th className="py-2.5 px-3">Catatan / Keterangan</th>
                                      <th className="py-2.5 px-3 text-center">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {pagedItems.length === 0 ? (
                                      <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                          Belum ada catatan setoran modal awal. Klik &quot;+ Setor Modal Awal&quot; untuk mencatat.
                                        </td>
                                      </tr>
                                    ) : (
                                      pagedItems.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-slate-50/70 transition">
                                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                            {new Date(c.date).toLocaleDateString("id-ID", {
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </td>
                                          <td className="py-2.5 px-3 font-bold text-slate-900">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                              <span>{c.source}</span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 text-xs">
                                            {formatRupiah(c.amount)}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate" title={c.notes || ""}>
                                            {c.notes || "-"}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCapital(c.id, c.source)}
                                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                              title="Hapus Setoran Modal"
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
                              {renderTablePagination("capitals", total)}
                            </>
                          );
                        })()}
                      </div>

                      {/* TABEL 2: PEMBELIAN ASET TETAP (CAPEX) */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-sky-600" />
                              Pengeluaran Pembelian Aset Tetap (CAPEX)
                            </h4>
                            <p className="text-xs text-slate-500">
                              Aset fisik berwujud (Booth/Gerobak, Mesin Sealer, Cooler, Dispenser) yang dibeli dari modal awal
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setScanMessage(null);
                                setScanImageBase64(null);
                                setScanPreviewUrl(null);
                                setScannedItems([]);
                                setScanDefaultOutletId(financeOutlet === "all" ? "all" : financeOutlet);
                                checkAiApiKey();
                                setIsScanAssetOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                              title="Pindai foto nota fisik atau screenshot e-commerce untuk memasukkan aset otomatis dengan AI"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>⚡ Scan Foto Struk / Nota (AI)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAssetMessage(null);
                                setAssetForm({
                                  name: "",
                                  category: "booth",
                                  asset_type: "tidak_bergerak",
                                  cost: "",
                                  outletId: financeOutlet === "all" ? "all" : financeOutlet,
                                  purchase_date: new Date().toISOString().split("T")[0],
                                  notes: "",
                                });
                                setIsAddAssetOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Input Manual Aset</span>
                            </button>
                          </div>
                        </div>

                        {/* Filter Tabs Tipe Karakteristik Aset + Search & Sort */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setAssetTypeFilter("all"); setAssetPage(1); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              assetTypeFilter === "all"
                                ? "bg-slate-900 text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                          >
                            Semua Aset ({financeData?.capitalAssets?.length || 0})
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAssetTypeFilter("tidak_bergerak"); setAssetPage(1); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              assetTypeFilter === "tidak_bergerak"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            <span>🏛️ Tidak Bergerak</span>
                            <span className="text-[10px] opacity-80">
                              ({financeData?.capitalAssets?.filter((a: any) => a.asset_type === "tidak_bergerak").length || 0})
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAssetTypeFilter("bergerak"); setAssetPage(1); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              assetTypeFilter === "bergerak"
                                ? "bg-amber-700 text-white shadow-xs"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            <span>🚚 Bergerak</span>
                            <span className="text-[10px] opacity-80">
                              ({financeData?.capitalAssets?.filter((a: any) => a.asset_type !== "tidak_bergerak").length || 0})
                            </span>
                          </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={assetSearch}
                                onChange={(e) => { setAssetSearch(e.target.value); setAssetPage(1); }}
                                placeholder="Cari aset / toko / kategori..."
                                className="bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 w-48"
                              />
                            </div>
                            <select
                              value={assetSort}
                              onChange={(e) => {
                                setAssetSort(e.target.value as "date_desc" | "date_asc" | "cost_desc" | "cost_asc" | "name_asc");
                                setAssetPage(1);
                              }}
                              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                            >
                              <option value="date_desc">Urutkan: Terbaru</option>
                              <option value="date_asc">Terlama</option>
                              <option value="cost_desc">Harga Tertinggi ↓</option>
                              <option value="cost_asc">Harga Terendah ↑</option>
                              <option value="name_asc">Nama (A-Z)</option>
                            </select>
                          </div>
                        </div>

                        <div className="overflow-x-auto max-h-[520px] overflow-y-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                <th className="py-2.5 px-3">Tgl Beli</th>
                                <th className="py-2.5 px-3">Nama Aset / Peralatan</th>
                                <th className="py-2.5 px-3">Kategori</th>
                                <th className="py-2.5 px-3">Karakteristik Tipe</th>
                                <th className="py-2.5 px-3">Kedai / Alokasi</th>
                                <th className="py-2.5 px-3 text-right">Harga Beli</th>
                                <th className="py-2.5 px-3">Keterangan</th>
                                <th className="py-2.5 px-3 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {!financeData?.capitalAssets || financeData.capitalAssets.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-8 text-center text-slate-400">
                                    Belum ada aset tetap yang tercatat. Klik &quot;+ Beli / Tambah Aset&quot; untuk mencatat.
                                  </td>
                                </tr>
                              ) : (
                                (() => {
                                  const q = assetSearch.trim().toLowerCase();
                                  const filteredAssets = financeData.capitalAssets
                                    .filter((a: any) => {
                                      const matchType =
                                        assetTypeFilter === "all"
                                          ? true
                                          : assetTypeFilter === "tidak_bergerak"
                                          ? a.asset_type === "tidak_bergerak"
                                          : a.asset_type !== "tidak_bergerak";
                                      if (!matchType) return false;
                                      if (!q) return true;
                                      return (
                                        String(a.name || "").toLowerCase().includes(q) ||
                                        String(a.category || "").toLowerCase().includes(q) ||
                                        String(a.notes || "").toLowerCase().includes(q) ||
                                        String(a.outlet?.name || "").toLowerCase().includes(q)
                                      );
                                    })
                                    .sort((a: any, b: any) => {
                                      if (assetSort === "date_asc") return new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
                                      if (assetSort === "cost_desc") return (b.cost || 0) - (a.cost || 0);
                                      if (assetSort === "cost_asc") return (a.cost || 0) - (b.cost || 0);
                                      if (assetSort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""));
                                      return new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime();
                                    });
                                  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / 40));
                                  const safePage = Math.min(assetPage, totalPages);
                                  return filteredAssets
                                    .slice((safePage - 1) * 40, safePage * 40)
                                    .map((a: any) => (
                                    <tr key={a.id} className="hover:bg-slate-50/70 transition">
                                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                        {new Date(a.purchase_date).toLocaleDateString("id-ID", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-slate-900">
                                        {a.name}
                                      </td>
                                      <td className="py-2.5 px-3 capitalize">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-100">
                                          {a.category}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {a.asset_type === "tidak_bergerak" ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit" title="Masa pakai panjang, nilai stabil">
                                            <span>🏛️ Tidak Bergerak (Stabil)</span>
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit" title="Masa pakai terbatas, nilai menyusut">
                                            <span>🚚 Bergerak (Menyusut)</span>
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                                        {a.outlet?.name || "Semua Kedai (Pusat)"}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-900 text-xs">
                                        {formatRupiah(a.cost)}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={a.notes || ""}>
                                        {a.notes || "-"}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAsset(a.id, a.name)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                          title="Hapus Aset"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ));
                                })()
                              )}
                            </tbody>
                          </table>
                        </div>
                        {(() => {
                          const q = assetSearch.trim().toLowerCase();
                          const filteredAssets = (financeData?.capitalAssets || []).filter((a: any) => {
                            const matchType =
                              assetTypeFilter === "all"
                                ? true
                                : assetTypeFilter === "tidak_bergerak"
                                ? a.asset_type === "tidak_bergerak"
                                : a.asset_type !== "tidak_bergerak";
                            if (!matchType) return false;
                            if (!q) return true;
                            return (
                              String(a.name || "").toLowerCase().includes(q) ||
                              String(a.category || "").toLowerCase().includes(q) ||
                              String(a.notes || "").toLowerCase().includes(q) ||
                              String(a.outlet?.name || "").toLowerCase().includes(q)
                            );
                          });
                          if (filteredAssets.length === 0) return null;
                          const totalPages = Math.max(1, Math.ceil(filteredAssets.length / 40));
                          const safePage = Math.min(assetPage, totalPages);
                          const startIdx = (safePage - 1) * 40 + 1;
                          const endIdx = Math.min(safePage * 40, filteredAssets.length);
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600">
                              <span>
                                Menampilkan <b>{startIdx}–{endIdx}</b> dari <b>{filteredAssets.length}</b> aset (Hal {safePage}/{totalPages})
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={safePage <= 1}
                                  onClick={() => setAssetPage((p) => Math.max(1, p - 1))}
                                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-bold disabled:opacity-40 cursor-pointer"
                                >
                                  ← Sebelumnya
                                </button>
                                <button
                                  type="button"
                                  disabled={safePage >= totalPages}
                                  onClick={() => setAssetPage((p) => Math.min(totalPages, p + 1))}
                                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-bold disabled:opacity-40 cursor-pointer"
                                >
                                  Berikutnya →
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* TABEL 3: PENGELUARAN RnD (RISET & PENGEMBANGAN) */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                              Pengeluaran Riset &amp; Pengembangan (RnD)
                            </h4>
                            <p className="text-xs text-slate-500">
                              Biaya eksperimen rasa baru (matcha, susu, sirup), tester kemasan/cup, dan riset pasar yang mengurangi modal
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setRndMessage(null);
                              setRndForm({
                                title: "",
                                category: "resep",
                                amount: "",
                                outcome: "Berhasil (Masuk Menu)",
                                date: new Date().toISOString().split("T")[0],
                                notes: "",
                              });
                              setIsAddRndOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Catat Biaya RnD</span>
                          </button>
                        </div>

                        {(() => {
                          const { pagedItems, total, needsScroll } = paginateList(financeData?.rndExpenses || [], "rndExpenses");
                          return (
                            <>
                              <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                      <th className="py-2.5 px-3">Tanggal</th>
                                      <th className="py-2.5 px-3">Kegiatan RnD</th>
                                      <th className="py-2.5 px-3">Kategori</th>
                                      <th className="py-2.5 px-3 text-right">Biaya Riset</th>
                                      <th className="py-2.5 px-3 text-center">Status / Hasil</th>
                                      <th className="py-2.5 px-3">Keterangan</th>
                                      <th className="py-2.5 px-3 text-center">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {pagedItems.length === 0 ? (
                                      <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                          Belum ada pengeluaran RnD yang dicatat. Klik &quot;+ Catat Biaya RnD&quot; untuk mencatat.
                                        </td>
                                      </tr>
                                    ) : (
                                      pagedItems.map((r: any) => (
                                        <tr key={r.id} className="hover:bg-slate-50/70 transition">
                                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                            {new Date(r.date).toLocaleDateString("id-ID", {
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </td>
                                          <td className="py-2.5 px-3 font-bold text-slate-900">
                                            {r.title}
                                          </td>
                                          <td className="py-2.5 px-3 capitalize">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                              {r.category}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 text-xs">
                                            {formatRupiah(r.amount)}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              r.outcome?.includes("Berhasil")
                                                ? "bg-emerald-100 text-emerald-800"
                                                : r.outcome?.includes("Evaluasi")
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-slate-100 text-slate-700"
                                            }`}>
                                              {r.outcome || "Selesai"}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={r.notes || ""}>
                                            {r.notes || "-"}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteRnd(r.id, r.title)}
                                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                              title="Hapus RnD"
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
                              {renderTablePagination("rndExpenses", total)}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
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

                  {(() => {
                    const filteredTx = (financeData?.transactions || []).filter(
                      (t: any) =>
                        !financeSearch ||
                        t.orderCode.toLowerCase().includes(financeSearch.toLowerCase()) ||
                        t.outletName.toLowerCase().includes(financeSearch.toLowerCase()) ||
                        (t.itemsSummary && t.itemsSummary.toLowerCase().includes(financeSearch.toLowerCase()))
                    );
                    const { pagedItems, total, needsScroll } = paginateList(filteredTx, "transactions");
                    return (
                      <>
                        <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
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
                              {pagedItems.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                                    Tidak ada transaksi yang sesuai filter
                                  </td>
                                </tr>
                              ) : (
                                pagedItems.map((t: any) => (
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
                                      className="py-2.5 px-3 font-sans text-slate-600 max-w-sm"
                                      title={t.itemsSummary}
                                    >
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="truncate max-w-xs">{t.itemsSummary}</span>
                                        {t.hasPromoFree && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                            🎁 Promo ({t.freeItemCount} cup)
                                          </span>
                                        )}
                                      </div>
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
                        {renderTablePagination("transactions", total)}
                      </>
                    );
                  })()}
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
            {/* ============================================================== */}
            {/* MASTER STOCK & CENTRAL KITCHEN (GUDANG PUSAT)                 */}
            {/* ============================================================== */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-6 shadow-xl border border-slate-700 text-white space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white tracking-wide">
                        Master Stock & Central Kitchen (Gudang Pusat)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Dua Arah Terintegrasi
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Kirim ke kasir memotong Master Stock. Retur otomatis mengembalikan stok ke Pusat.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => openRestockModal("add")}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Kirim ke Kedai</span>
                  </button>

                  <button
                    onClick={() => openRestockModal("return")}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retur ke Pusat</span>
                  </button>

                  <button
                    onClick={() => openRestockModal("central_in")}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Pasokan Supplier</span>
                  </button>
                </div>
              </div>

              {/* Kas Induk & Brankas Pusat (Master Cash) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-amber-950/50 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-sm">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-200 tracking-wider uppercase">
                        Kas Induk Gudang Pusat (Brankas)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Master Cash
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                      Rp {(centralVault?.cash_balance ?? 5000000).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs flex-wrap">
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] text-slate-400">Total Modal Kas Tersebar di Kedai:</span>
                    <strong className="font-mono text-amber-300 text-sm">
                      Rp {(
                        outletsList.reduce((acc, curr) => acc + (curr.initial_cash || 0), 0)
                      ).toLocaleString("id-ID")}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCentralCashAction("topup");
                        setCentralCashAmount(500000);
                        setCentralCashNotes("");
                        setCentralCashMessage(null);
                        setIsCentralCashModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Kas Pusat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCentralCashAction("set");
                        setCentralCashAmount(centralVault?.cash_balance ?? 5000000);
                        setCentralCashNotes("");
                        setCentralCashMessage(null);
                        setIsCentralCashModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                      title="Koreksi fisik saldo kas brankas pusat"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400" />
                      <span>Koreksi</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search & Sort Stockist Pusat */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={centralStockSearch}
                    onChange={(e) => setCentralStockSearch(e.target.value)}
                    placeholder="Cari bahan di gudang pusat..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={centralStockSort}
                  onChange={(e) => setCentralStockSort(e.target.value as "name_asc" | "stock_asc" | "stock_desc")}
                  className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="name_asc">Urutkan: Nama (A-Z)</option>
                  <option value="stock_asc">Urutkan: Stok Terdikit ↑</option>
                  <option value="stock_desc">Urutkan: Stok Terbanyak ↓</option>
                </select>
              </div>

              {/* Master Stock Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...uniqueMaterials]
                  .filter((mat: any) =>
                    !centralStockSearch.trim() ||
                    mat.name.toLowerCase().includes(centralStockSearch.trim().toLowerCase())
                  )
                  .sort((a: any, b: any) => {
                    if (centralStockSort === "stock_asc") return (a.master_stock || 0) - (b.master_stock || 0);
                    if (centralStockSort === "stock_desc") return (b.master_stock || 0) - (a.master_stock || 0);
                    return String(a.name).localeCompare(String(b.name));
                  })
                  .map((mat: any) => {
                  const isGulaPasir = mat.name.toLowerCase().includes("gula pasir");
                  const isGulaCair = mat.name.toLowerCase().includes("gula cair");
                  const masterStock = mat.master_stock !== undefined ? mat.master_stock : 0;
                  const isLow = masterStock <= (mat.unit === "gram" ? 5000 : mat.unit === "ml" ? 2000 : 20);

                  return (
                    <div
                      key={mat.id}
                      onClick={() => openRestockModal("central_set", mat.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer relative group ${
                        isGulaPasir
                          ? "bg-amber-950/30 border-amber-500/40 hover:border-amber-400"
                          : isLow
                          ? "bg-rose-950/30 border-rose-500/40 hover:border-rose-400"
                          : "bg-slate-800/80 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800"
                      }`}
                      title="Klik untuk koreksi / opname stok gudang pusat ini"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px] flex items-center gap-1">
                          {isGulaPasir && "🍬 "}
                          {isGulaCair && "🍯 "}
                          {mat.name}
                        </span>
                        <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
                      </div>

                      <div className="font-mono font-black text-base text-white">
                        {mat.unit === "gram" ? (
                          <div className="flex flex-col">
                            <span>{(masterStock / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg</span>
                            <span className="text-[10px] font-normal text-amber-300">
                              {masterStock.toLocaleString("id-ID")} gr
                            </span>
                          </div>
                        ) : mat.unit === "ml" ? (
                          <div className="flex flex-col">
                            <span>{(masterStock / 1000).toFixed(1)} Liter</span>
                            <span className="text-[10px] font-normal text-teal-300">
                              {masterStock.toLocaleString("id-ID")} ml
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span>{masterStock.toLocaleString("id-ID")}</span>
                            <span className="text-[11px] font-normal text-slate-400">{mat.unit}</span>
                          </div>
                        )}
                      </div>

                      {isGulaPasir && (
                        <p className="text-[10px] text-amber-300/80 mt-1 font-medium">
                          ~{Math.floor(masterStock / 1000)} batch sirup kedai
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Transfer Logs Section */}
              {data?.transferLogs && data.transferLogs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/70">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Riwayat Perpindahan &amp; Alokasi Stok Terkini
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {data.transferLogs.length} mutasi tercatat
                    </span>
                  </div>
                  {(() => {
                    const { pagedItems, total, needsScroll } = paginateList(data.transferLogs || [], "transferLogs");
                    return (
                      <>
                        <div className={`${needsScroll ? "max-h-[540px] overflow-y-auto" : ""} space-y-1.5 pr-1 font-sans text-xs`}>
                          {pagedItems.map((log) => {
                      const isRestock = log.type === "restock";
                      const isReturn = log.type === "return";
                      const isCentralIn = log.type === "central_in";
                      const isBrew = log.type === "sugar_brew";

                      const fromOutlet = data?.outlets.find((o) => o.id === log.from_location);
                      const toOutlet = data?.outlets.find((o) => o.id === log.to_location);

                      const fromName =
                        log.from_location === "central"
                          ? "Gudang Pusat"
                          : log.from_location === "supplier"
                          ? "Supplier"
                          : fromOutlet?.name || log.from_location;
                      const toName =
                        log.to_location === "central"
                          ? "Gudang Pusat"
                          : toOutlet?.name || log.to_location;

                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between bg-slate-800/60 p-2 rounded-xl border border-slate-700/60 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isRestock
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isReturn
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : isCentralIn
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {isRestock
                                ? "Restock"
                                : isReturn
                                ? "Retur"
                                : isCentralIn
                                ? "Supplier In"
                                : isBrew
                                ? "Masak Sirup"
                                : log.type}
                            </span>
                            <span className="font-extrabold text-white">
                              {log.raw_material?.name || "Bahan Baku"}
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {log.raw_material?.unit === "gram"
                                ? `${(log.quantity / 1000).toLocaleString("id-ID")} kg (${log.quantity.toLocaleString("id-ID")} gr)`
                                : `${log.quantity.toLocaleString("id-ID")} ${log.raw_material?.unit || ""}`}
                            </span>
                            <span className="text-slate-400">
                              ({fromName} ➔ {toName})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {renderTablePagination("transferLogs", total, true)}
                </>
              );
            })()}
                </div>
              )}
            </div>

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
                      Klik kotak bahan baku untuk ubah / kirim / retur atau klik Opname Stok
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={boothStockSearch}
                      onChange={(e) => setBoothStockSearch(e.target.value)}
                      placeholder="Cari bahan di kedai..."
                      className="bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 w-44"
                    />
                  </div>
                  <select
                    value={boothStockSort}
                    onChange={(e) => setBoothStockSort(e.target.value as "name_asc" | "stock_asc" | "stock_desc")}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="name_asc">Urutkan: Nama (A-Z)</option>
                    <option value="stock_asc">Stok Terdikit ↑</option>
                    <option value="stock_desc">Stok Terbanyak ↓</option>
                  </select>
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
                    const fullOutlet = outletsList.find((o) => o.id === outlet.id) || outlet;
                    const isClosed = outlet.shift_status === "closed" || fullOutlet.shift_status === "closed";
                    const cashBalance = isClosed
                      ? 0
                      : outlet.currentCashBalance !== undefined
                      ? outlet.currentCashBalance
                      : fullOutlet.currentCashBalance !== undefined
                      ? fullOutlet.currentCashBalance
                      : (outlet.initial_cash || 0);
                    const cashIn = outlet.todayCashIn !== undefined
                      ? outlet.todayCashIn
                      : fullOutlet.todayCashIn !== undefined
                      ? fullOutlet.todayCashIn
                      : 0;
                    const expenseTotal = outlet.todayExpenseTotal !== undefined
                      ? outlet.todayExpenseTotal
                      : fullOutlet.todayExpenseTotal !== undefined
                      ? fullOutlet.todayExpenseTotal
                      : 0;

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
                            {/* Ringkasan Cup Shift Ini (Terjual vs Promo Gratis) */}
                            {!isClosed && (
                              <div
                                className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs border bg-emerald-50 text-emerald-950 border-emerald-300"
                                title={`Total Cup Keluar Shift Ini: ${(fullOutlet.todayPaidCups ?? fullOutlet.todayCupsSold ?? 0) + (fullOutlet.todayFreeCups ?? 0)} Cup (${fullOutlet.todayPaidCups ?? fullOutlet.todayCupsSold ?? 0} terjual berbayar, ${fullOutlet.todayFreeCups ?? 0} promo gratis)`}
                              >
                                <Coffee className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>
                                  Cup:{" "}
                                  <strong className="text-emerald-800">
                                    {fullOutlet.todayPaidCups ?? fullOutlet.todayCupsSold ?? 0} terjual
                                  </strong>
                                  {(fullOutlet.todayFreeCups || 0) > 0 && (
                                    <span className="ml-1 text-[10px] font-black text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                      +{fullOutlet.todayFreeCups} gratis
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Total Uang Cash Fisik di Laci Saat Ini (Real-time di Booth) */}
                            <div
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs border ${
                                isClosed
                                  ? "bg-slate-100 text-slate-600 border-slate-300"
                                  : "bg-teal-50 text-teal-950 border-teal-300"
                              }`}
                              title={
                                isClosed
                                  ? "Shift Sedang Tutup: Kas fisik di laci saat ini Rp 0 (sudah disetor saat penutupan shift)"
                                  : `Total Uang Cash Fisik di Laci Booth saat ini: Modal Awal (Rp ${(outlet.initial_cash || 0).toLocaleString("id-ID")}) + Penjualan Tunai (Rp ${cashIn.toLocaleString("id-ID")}) - Beban Kasir (Rp ${expenseTotal.toLocaleString("id-ID")}) = Rp ${cashBalance.toLocaleString("id-ID")}`
                              }
                            >
                              <Banknote className={`w-3.5 h-3.5 shrink-0 ${isClosed ? "text-slate-500" : "text-teal-700"}`} />
                              <span>
                                Kas di Laci:{" "}
                                <strong className={isClosed ? "text-slate-700" : "text-teal-900"}>
                                  Rp {cashBalance.toLocaleString("id-ID")}
                                </strong>
                                {isClosed && (
                                  <span className="ml-1 text-[10px] font-semibold text-slate-500 bg-slate-200 px-1 py-0.2 rounded">
                                    Shift Tutup
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Tombol Uang Cash yang Dibawa (Modal Kas Awal) */}
                            <button
                              onClick={() => openCashFloatModal(outlet)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer group"
                              title="Ubah Uang Cash yang Dibawa (Modal Kas Awal) untuk kedai ini"
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition shrink-0" />
                              <span>Modal Awal: <strong>Rp {(outlet.initial_cash || 0).toLocaleString("id-ID")}</strong></span>
                              <Edit3 className="w-3 h-3 text-amber-600 opacity-60 group-hover:opacity-100" />
                            </button>

                            <button
                              onClick={() => openOpnameModal(outlet)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Opname Stok</span>
                            </button>

                            <button
                              onClick={() => handleZeroAll(outlet.id, outlet.name)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Set 0</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {[...outletStocks]
                            .filter((stock) =>
                              !boothStockSearch.trim() ||
                              stock.raw_material.name.toLowerCase().includes(boothStockSearch.trim().toLowerCase())
                            )
                            .sort((a, b) => {
                              if (boothStockSort === "stock_asc") return (a.current_stock || 0) - (b.current_stock || 0);
                              if (boothStockSort === "stock_desc") return (b.current_stock || 0) - (a.current_stock || 0);
                              return a.raw_material.name.localeCompare(b.raw_material.name);
                            })
                            .map((stock) => {
                            const isGulaPasir = stock.raw_material.name.toLowerCase().includes("gula pasir");
                            const isGulaCair = stock.raw_material.name.toLowerCase().includes("gula cair");

                            return (
                              <div
                                key={stock.id}
                                onClick={() => openSingleStockEdit(outlet, stock)}
                                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between group ${
                                  isGulaPasir
                                    ? "bg-amber-50/50 border-amber-200 hover:border-amber-400 hover:bg-amber-50"
                                    : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm"
                                }`}
                                title="Klik untuk ubah / kirim / retur stok ini"
                              >
                                <div>
                                  <div className="flex items-center gap-1">
                                    {isGulaPasir && <span>🍬</span>}
                                    {isGulaCair && <span>🍯</span>}
                                    <p className="text-[11px] text-slate-600 font-semibold truncate max-w-[130px]">
                                      {stock.raw_material.name}
                                    </p>
                                  </div>
                                  <p className="font-mono font-black text-sm text-slate-900 mt-0.5">
                                    {stock.raw_material.unit === "gram" ? (
                                      <>
                                        {(stock.current_stock / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg{" "}
                                        <span className="text-[10px] font-normal text-slate-500">
                                          ({Math.round(stock.current_stock).toLocaleString("id-ID")} gr)
                                        </span>
                                      </>
                                    ) : stock.raw_material.unit === "ml" ? (
                                      <>
                                        {Math.round(stock.current_stock).toLocaleString("id-ID")} ml{" "}
                                        <span className="text-[10px] font-normal text-slate-400">
                                          (~{(stock.current_stock / 1000).toFixed(1)}L)
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        {Math.round(stock.current_stock).toLocaleString("id-ID")}{" "}
                                        <span className="text-[10px] font-normal text-slate-400">
                                          {stock.raw_material.unit}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>
                                <Edit3 className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition shrink-0" />
                              </div>
                            );
                          })}
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

              {(() => {
                const { pagedItems, total, needsScroll } = paginateList(data?.closings || [], "closings");
                return (
                  <>
                    <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="py-2.5 px-3">Tanggal / Waktu</th>
                            <th className="py-2.5 px-3">Kedai</th>
                            <th className="py-2.5 px-3">Fisik Cup (Reg / Jumbo)</th>
                            <th className="py-2.5 px-3">Sistem (Reg / Jumbo)</th>
                            <th className="py-2.5 px-3">Kantong Teh (Fisik / Sist)</th>
                            <th className="py-2.5 px-3">Sisa Gula Cair (Fisik / Sist)</th>
                            <th className="py-2.5 px-3">Kas di Laci (Fisik / Sist)</th>
                            <th className="py-2.5 px-3">Selisih Cup</th>
                            <th className="py-2.5 px-3">Potongan Gaji</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pagedItems.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400">
                                Belum ada data rekonsiliasi closing
                              </td>
                            </tr>
                          ) : (
                            pagedItems.map((c) => {
                        const sugarVariance = c.discrepancy_sugar_ml ?? 0;
                        const hasCupShortage = c.discrepancy_cup < 0;
                        const hasCupSurplus = c.discrepancy_cup > 0;
                        const hasCashShortage = c.discrepancy_cash !== undefined && c.discrepancy_cash < 0;
                        const hasCashSurplus = c.discrepancy_cash !== undefined && c.discrepancy_cash > 0;
                        const hasSugarVariance = Math.abs(sugarVariance) > 50;
                        const isRed = c.theft_flag || hasCupShortage || hasCashShortage;
                        const isYellow = (c.waste_flag || hasCupSurplus || hasCashSurplus || hasSugarVariance) && !isRed;
                        const isMatched = !isRed && !isYellow && c.discrepancy_cup === 0 && (!c.discrepancy_cash || c.discrepancy_cash === 0) && Math.abs(sugarVariance) <= 50;

                        return (
                          <tr
                            key={c.id}
                            className={`font-mono transition ${
                              isRed
                                ? "bg-rose-50/80 border-l-4 border-l-rose-500"
                                : isYellow
                                ? "bg-amber-50/70 border-l-4 border-l-amber-500"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {new Date(c.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                              <span className="block text-[10px] text-slate-400 font-sans">
                                {new Date(c.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sans font-bold text-slate-800">{c.outlet?.name}</td>
                            <td className="py-2.5 px-3">
                              {c.actual_cup_reg} / {c.actual_cup_jumbo}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {c.system_expected_cup_reg} / {c.system_expected_cup_jumbo}
                            </td>
                            <td className="py-2.5 px-3">
                              <strong>{c.actual_liquid_ml}</strong> kantong{" "}
                              <span className="text-slate-400">/ {c.system_expected_liquid_ml} kantong</span>
                              {c.discrepancy_liquid !== undefined && c.discrepancy_liquid !== 0 && (
                                <span className={`ml-1 text-[10px] font-bold ${c.discrepancy_liquid < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                  ({c.discrepancy_liquid > 0 ? `+${c.discrepancy_liquid}` : c.discrepancy_liquid})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <strong>{Math.round(c.actual_sugar_ml ?? 0).toLocaleString("id-ID")} ml</strong>{" "}
                              <span className="text-slate-400">/ {Math.round(c.system_expected_sugar_ml ?? 0).toLocaleString("id-ID")} ml</span>
                              {c.discrepancy_sugar_ml !== undefined && c.discrepancy_sugar_ml !== 0 && (
                                <span className={`ml-1 text-[10px] font-bold ${c.discrepancy_sugar_ml < 0 ? "text-rose-600" : "text-amber-600"}`}>
                                  ({c.discrepancy_sugar_ml > 0 ? `+${Math.round(c.discrepancy_sugar_ml)}` : Math.round(c.discrepancy_sugar_ml)} ml)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <strong>Rp {Math.round(c.actual_cash ?? 0).toLocaleString("id-ID")}</strong>{" "}
                              <span className="text-slate-400">/ Rp {Math.round(c.system_expected_cash ?? 0).toLocaleString("id-ID")}</span>
                              {c.discrepancy_cash !== undefined && c.discrepancy_cash !== 0 && (
                                <span className={`block text-[10px] font-bold ${c.discrepancy_cash < 0 ? "text-rose-600" : "text-blue-600"}`}>
                                  {c.discrepancy_cash > 0 ? `+Rp ${Math.round(c.discrepancy_cash).toLocaleString("id-ID")}` : `-Rp ${Math.abs(Math.round(c.discrepancy_cash)).toLocaleString("id-ID")}`}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={c.discrepancy_cup < 0 ? "text-rose-600 font-bold" : c.discrepancy_cup > 0 ? "text-amber-600 font-bold" : "text-emerald-700 font-bold"}>
                                {c.discrepancy_cup > 0 ? `+${c.discrepancy_cup}` : c.discrepancy_cup}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-rose-700">
                              {c.employee_debt > 0 ? formatRupiah(c.employee_debt) : "-"}
                            </td>
                            <td className="py-2.5 px-3 font-sans space-y-1">
                              {hasCashShortage && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white block text-center">
                                  KAS MINUS
                                </span>
                              )}
                              {hasCashSurplus && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white block text-center">
                                  KAS LEBIH
                                </span>
                              )}
                              {hasCupShortage && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white block text-center">
                                  HUTANG CUP ({c.discrepancy_cup})
                                </span>
                              )}
                              {hasCupSurplus && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white block text-center">
                                  SURPLUS CUP (+{c.discrepancy_cup})
                                </span>
                              )}
                              {hasSugarVariance && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 block text-center">
                                  SELISIH GULA ({sugarVariance > 0 ? `+${Math.round(sugarVariance)}` : Math.round(sugarVariance)} ml)
                                </span>
                              )}
                              {c.waste_flag && !hasSugarVariance && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 block text-center">
                                  BOROS CAIRAN
                                </span>
                              )}
                              {isMatched && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 block text-center">
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
              {renderTablePagination("closings", total)}
            </>
          );
        })()}
            </div>

            {/* Audit Log Refill & Masak Gula Cair (Anti-Manipulasi Selisih) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Audit Log Masak &amp; Bawa Gula Cair (Simple Syrup)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rekam jejak setiap kali kasir menekan tombol masak gula (+1.6L), bawa sirup saat buka shift, atau penyesuaian stok
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Total Log: {data?.sugarLogs?.length || 0} Aktivitas
                </span>
              </div>

              {(() => {
                const { pagedItems, total, needsScroll } = paginateList(data?.sugarLogs || [], "sugarLogs");
                return (
                  <>
                    <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl" : ""}`}>
                      <table className="w-full text-left text-xs">
                        <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 px-3">Waktu</th>
                            <th className="py-2.5 px-3">Kedai</th>
                            <th className="py-2.5 px-3">Jenis Refill</th>
                            <th className="py-2.5 px-3">Volume Masuk</th>
                            <th className="py-2.5 px-3">Stok Sebelum &rarr; Sesudah</th>
                            <th className="py-2.5 px-3">Catatan Kasir / Audit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pagedItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                                Belum ada aktivitas masak atau isi ulang gula cair yang tercatat.
                              </td>
                            </tr>
                          ) : (
                            pagedItems.map((s: SugarRefillLogRecord) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition font-mono">
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                            {s.outlet?.name || s.outlet_id}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {s.type === "brew" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                🍯 Masak di Kedai (+1.6L)
                              </span>
                            ) : s.type === "opening_brought" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                🌅 Bawa saat Buka Kedai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                ⚙️ Penyesuaian Manual
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">
                            +{Math.round(s.amount_ml).toLocaleString("id-ID")} ml
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {Math.round(s.stock_before).toLocaleString("id-ID")} ml &rarr;{" "}
                            <strong className="text-slate-900">{Math.round(s.stock_after).toLocaleString("id-ID")} ml</strong>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 italic">
                            {s.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {renderTablePagination("sugarLogs", total)}
            </>
          );
        })()}
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

                      {outlet.todayCupsSold !== undefined && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold">
                          <Coffee className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Terjual: <strong>{outlet.todayPaidCups ?? outlet.todayCupsSold ?? 0} cup</strong></span>
                          {(outlet.todayFreeCups || 0) > 0 && (
                            <span className="ml-1 text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              +{outlet.todayFreeCups} gratis
                            </span>
                          )}
                        </span>
                      )}

                      {(() => {
                        const isClosed = outlet.shift_status === "closed";
                        const cashBal = isClosed ? 0 : (outlet.currentCashBalance !== undefined ? outlet.currentCashBalance : (outlet.initial_cash || 0));
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              isClosed
                                ? "bg-slate-100 text-slate-600 border-slate-300"
                                : "bg-teal-50 text-teal-950 border-teal-300"
                            }`}
                            title={
                              isClosed
                                ? "Shift Tutup: Kas fisik di laci Rp 0"
                                : `Total Uang Cash Fisik di Laci: Modal Awal (Rp ${(outlet.initial_cash || 0).toLocaleString("id-ID")}) + Penjualan Tunai (Rp ${(outlet.todayCashIn || 0).toLocaleString("id-ID")}) - Kas Keluar (Rp ${(outlet.todayExpenseTotal || 0).toLocaleString("id-ID")}) = Rp ${cashBal.toLocaleString("id-ID")}`
                            }
                          >
                            <Banknote className={`w-3.5 h-3.5 ${isClosed ? "text-slate-500" : "text-teal-700"}`} />
                            <span>
                              Kas di Laci:{" "}
                              <strong className={isClosed ? "text-slate-700" : "text-teal-900"}>
                                Rp {cashBal.toLocaleString("id-ID")}
                              </strong>
                              {isClosed && (
                                <span className="ml-1 text-[10px] font-semibold text-slate-500 bg-slate-200 px-1 py-0.2 rounded">
                                  Shift Tutup
                                </span>
                              )}
                            </span>
                          </span>
                        );
                      })()}

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold">
                        <Coins className="w-3.5 h-3.5 text-amber-700" />
                        <span>Modal Awal: <strong>Rp {(outlet.initial_cash || 0).toLocaleString("id-ID")}</strong></span>
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
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
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

                            {/* Rincian HPP Reguler */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[11px] gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">HPP:</span>
                                <span className="font-mono font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  {formatRupiah(reguler.cost_price || 0)}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Laba: {formatRupiah(Math.max(0, reguler.price - (reguler.cost_price || 0)))} (
                                  {reguler.price > 0 ? (((reguler.price - (reguler.cost_price || 0)) / reguler.price) * 100).toFixed(0) : 0}%)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenHppModal(reguler)}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
                                title="Atur Rincian HPP (Cup, Gula Syrup, Larutan Teh, Sedotan, dll)"
                              >
                                <Calculator className="w-3 h-3 text-amber-700" />
                                <span>Rincian HPP</span>
                              </button>
                            </div>

                            {reguler.recipes && reguler.recipes.length > 0 && (
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                BOM: {reguler.recipes.map((r: any) => `${r.quantity} ${r.raw_material?.name}`).join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {jumbo && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
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

                            {/* Rincian HPP Jumbo */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[11px] gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">HPP:</span>
                                <span className="font-mono font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  {formatRupiah(jumbo.cost_price || 0)}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Laba: {formatRupiah(Math.max(0, jumbo.price - (jumbo.cost_price || 0)))} (
                                  {jumbo.price > 0 ? (((jumbo.price - (jumbo.cost_price || 0)) / jumbo.price) * 100).toFixed(0) : 0}%)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenHppModal(jumbo)}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
                                title="Atur Rincian HPP (Cup, Gula Syrup, Larutan Teh, Sedotan, dll)"
                              >
                                <Calculator className="w-3 h-3 text-amber-700" />
                                <span>Rincian HPP</span>
                              </button>
                            </div>

                            {jumbo.recipes && jumbo.recipes.length > 0 && (
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                BOM: {jumbo.recipes.map((r: any) => `${r.quantity} ${r.raw_material?.name}`).join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {single && !reguler && !jumbo && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
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

                            {/* Rincian HPP Single */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[11px] gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">HPP:</span>
                                <span className="font-mono font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  {formatRupiah(single.cost_price || 0)}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Laba: {formatRupiah(Math.max(0, single.price - (single.cost_price || 0)))} (
                                  {single.price > 0 ? (((single.price - (single.cost_price || 0)) / single.price) * 100).toFixed(0) : 0}%)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenHppModal(single)}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
                                title="Atur Rincian HPP Komponen"
                              >
                                <Calculator className="w-3 h-3 text-amber-700" />
                                <span>Rincian HPP</span>
                              </button>
                            </div>

                            {single.recipes && single.recipes.length > 0 && (
                              <p className="text-[10px] text-slate-500 font-mono truncate">
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

        {/* ============================================================== */}
        {/* TAB 6: MANAJEMEN VOUCHER PROMO KEDAI (REDEEMED & BELUM)       */}
        {/* ============================================================== */}
        {activeAdminTab === "vouchers" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Action Bar */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                  <span>Manajemen Voucher Promo Kedai</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pantau voucher promo gratis yang diterbitkan (karena stok teh/gula habis saat order) serta lacak status yang sudah ditukar vs belum ditukar.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => loadVouchers(false)}
                  disabled={voucherLoading}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${voucherLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const defaultOut = data?.outlets?.[0]?.id || outletsList?.[0]?.id || "";
                    setNewVoucherForm((prev) => ({ ...prev, outletId: defaultOut }));
                    setIsAddVoucherModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Terbitkan Voucher Baru</span>
                </button>
              </div>
            </div>

            {/* ============================================================== */}
            {/* CARD: PENGATURAN KAMPANYE PROMO BELI 2 GRATIS 1 (TERBATAS WAKTU) */}
            {/* ============================================================== */}
            <div className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-200/90 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                      🎁
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Promo Beli 2 Varian Rasa Gratis 1 Teh Ori Jumbo
                    </h3>
                    {/* Live Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${
                        promoCampaignData?.badgeColor || "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {promoCampaignData?.isCurrentlyActive && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                        </span>
                      )}
                      <span>{promoCampaignData?.statusLabel || "Memuat Status..."}</span>
                    </span>

                    {/* Stat Total Cup Gratis Dibagikan */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                      <span>🥤 Total Dibagikan: <strong>{promoCampaignData?.totalFreeCupsGiven || 0} Cup Gratis</strong></span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Atur batas waktu berlakunya promo otomatis ini. Ketika batas waktu habis atau dimatikan oleh admin, kasir tidak akan memberikan cup gratis otomatis.
                    {promoCampaignData?.remainingText && (
                      <span className="font-bold text-emerald-800 ml-1.5 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block">
                        ⏱️ {promoCampaignData.remainingText}
                      </span>
                    )}
                  </p>
                </div>

                {/* Switch Toggle Aktifkan / Nonaktifkan */}
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs shrink-0">
                  <span className="text-xs font-bold text-slate-700">Status Promo:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !campaignForm.isActive;
                      setCampaignForm((p) => ({ ...p, isActive: next }));
                      handleSavePromoCampaign({
                        is_active: next,
                        start_at: campaignForm.startAt ? new Date(campaignForm.startAt).toISOString() : null,
                        end_at: campaignForm.endAt ? new Date(campaignForm.endAt).toISOString() : null,
                        target_outlet_id: campaignForm.targetOutletId || null,
                        min_flavored_qty: campaignForm.minFlavoredQty,
                        free_product_name: campaignForm.freeProductName,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      campaignForm.isActive ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        campaignForm.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-black ${campaignForm.isActive ? "text-emerald-700" : "text-slate-400"}`}>
                    {campaignForm.isActive ? "AKTIF" : "MATI"}
                  </span>
                </div>
              </div>

              {/* Form Input Periode Waktu & Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Waktu Mulai */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>📅 Waktu Mulai Promo</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Start Date & Time)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={campaignForm.startAt}
                    onChange={(e) => {
                      setCampaignForm((p) => ({ ...p, startAt: e.target.value }));
                      setCampaignFormDirty(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePromoCampaign();
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">Kasir hanya memicu promo jika waktu mulai telah tiba.</p>
                </div>

                {/* Waktu Selesai (Batas Waktu) */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>⏳ Batas Waktu Selesai</span>
                    <span className="text-[10px] text-rose-500 font-bold">(Waktu Berakhir)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={campaignForm.endAt}
                    onChange={(e) => {
                      setCampaignForm((p) => ({ ...p, endAt: e.target.value }));
                      setCampaignFormDirty(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePromoCampaign();
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400">Setelah jam/tanggal ini lewat, promo otomatis berhenti di kasir.</p>
                </div>

                {/* Target Cabang Kedai */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>🏬 Target Cabang Kedai</span>
                    <span className="text-[10px] text-slate-400 font-normal">Lokasi</span>
                  </label>
                  <select
                    value={campaignForm.targetOutletId}
                    onChange={(e) => {
                      setCampaignForm((p) => ({ ...p, targetOutletId: e.target.value }));
                      setCampaignFormDirty(true);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  >
                    <option value="">Semua Kedai (Berlaku Multi-Kedai)</option>
                    {(outletsList.length > 0 ? outletsList : data?.outlets || []).map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">Pilih jika promo hanya berlaku di cabang tertentu.</p>
                </div>
              </div>

              {campaignFormDirty && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center justify-between gap-2 animate-in fade-in">
                  <span>⚠️ Tanggal / batas waktu telah diubah. Klik <strong>Simpan Batas Waktu Promo</strong> agar tersimpan ke sistem.</span>
                  <button
                    type="button"
                    onClick={() => handleSavePromoCampaign()}
                    disabled={campaignLoading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black shrink-0 cursor-pointer shadow-xs"
                  >
                    Simpan Sekarang
                  </button>
                </div>
              )}

              {/* Quick Preset Buttons & Save Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">⚡ Preset Batas Waktu:</span>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(1)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    +24 Jam (1 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(3)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    +3 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(7)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    +1 Minggu (7 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignForm((p) => ({ ...p, endAt: "" }));
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-medium transition shadow-2xs cursor-pointer"
                  >
                    Tanpa Batas Waktu
                  </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleSavePromoCampaign()}
                    disabled={campaignLoading}
                    className={`px-4 py-2 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50 ${
                      campaignFormDirty
                        ? "bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-300 animate-pulse"
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {campaignLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <span>💾 Simpan Batas Waktu Promo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {campaignMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border transition ${
                    campaignMessage.isError
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-emerald-50 text-emerald-900 border-emerald-300"
                  }`}
                >
                  {campaignMessage.text}
                </div>
              )}
            </div>

            {/* Notification Toast Message */}
            {voucherMessage && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold shadow-xs animate-in fade-in flex items-center justify-between gap-2 ${
                  voucherMessage.isError
                    ? "bg-rose-50 border border-rose-300 text-rose-800"
                    : "bg-emerald-50 border border-emerald-300 text-emerald-800"
                }`}
              >
                <span>{voucherMessage.text}</span>
                <button
                  onClick={() => setVoucherMessage(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                  <span>Total Voucher</span>
                  <Ticket className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {voucherStats.total}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Semua kupon yang pernah terbit</p>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                  <span>Belum Ditukar (Aktif)</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black font-mono text-amber-900">
                  {voucherStats.active}
                </div>
                <p className="text-[10px] text-amber-700 font-medium">Menunggu klaim di booth</p>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
                  <span>Sudah Ditukar (Redeemed)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-900">
                  {voucherStats.redeemed}
                </div>
                <p className="text-[10px] text-emerald-700 font-medium">Telah dinikmati pelanggan</p>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
                  <span>Kedaluwarsa (Expired)</span>
                  <X className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black font-mono text-rose-900">
                  {voucherStats.expired}
                </div>
                <p className="text-[10px] text-rose-700 font-medium">Lewat dari masa 3 hari</p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Status Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Semua", count: voucherStats.total },
                    { id: "active", label: "Belum Ditukar (Aktif)", count: voucherStats.active },
                    { id: "redeemed", label: "Sudah Ditukar (Redeemed)", count: voucherStats.redeemed },
                    { id: "expired", label: "Kedaluwarsa (Expired)", count: voucherStats.expired },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVoucherStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        voucherStatusFilter === tab.id
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        voucherStatusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Outlet Filter & Search Input */}
                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                  <select
                    value={voucherOutletFilter}
                    onChange={(e) => setVoucherOutletFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">Semua Cabang Kedai</option>
                    {(outletsList.length > 0 ? outletsList : (data?.outlets || [])).map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>

                  <div className="relative min-w-[200px] flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari kode (VCR-...) / menu..."
                      value={voucherSearch}
                      onChange={(e) => setVoucherSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table of Vouchers */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-1">
              {(() => {
                const { pagedItems, total, needsScroll } = paginateList(filteredVouchersList, "vouchers");
                return (
                  <>
                    <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto" : ""}`}>
                      <table className="w-full text-left text-xs">
                        <thead className={`${needsScroll ? "sticky top-0 z-10 shadow-2xs " : ""}bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]`}>
                          <tr>
                            <th className="py-3 px-3.5">Kode Voucher</th>
                            <th className="py-3 px-3.5">Kedai Penerbit</th>
                            <th className="py-3 px-3.5">Menu Hadiah</th>
                            <th className="py-3 px-3.5">Status Klaim</th>
                            <th className="py-3 px-3.5">Tgl Terbit</th>
                            <th className="py-3 px-3.5">Masa Berlaku</th>
                            <th className="py-3 px-3.5">Catatan</th>
                            <th className="py-3 px-3.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {voucherLoading && vouchersList.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-600" />
                                <span>Memuat data voucher promo...</span>
                              </td>
                            </tr>
                          ) : pagedItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400">
                                <Ticket className="w-8 h-8 mx-auto mb-1.5 stroke-1 text-slate-300" />
                                <p className="font-semibold text-slate-600">Tidak ada voucher ditemukan.</p>
                                <p className="text-[11px] text-slate-400">
                                  {voucherSearch
                                    ? "Coba ubah kata kunci pencarian atau filter status."
                                    : "Voucher otomatis terbit jika ada promo saat stok teh/gula habis di kasir."}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            pagedItems.map((v) => {
                        const isRedeemed = v.effectiveStatus === "redeemed";
                        const isActive = v.effectiveStatus === "active";
                        const isExpired = v.effectiveStatus === "expired";

                        return (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition">
                            {/* Kode Voucher + Copy Button */}
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  {v.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyVoucherCode(v.code)}
                                  title="Salin Kode Voucher"
                                  className="p-1 hover:bg-slate-200 text-slate-500 rounded transition cursor-pointer"
                                >
                                  {copiedVoucherCode === v.code ? (
                                    <span className="text-[9px] font-bold text-emerald-700">Tersalin!</span>
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Kedai */}
                            <td className="py-3 px-3.5">
                              <span className="font-bold text-slate-800 block">{v.outlet?.name || "-"}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{v.outlet?.code}</span>
                            </td>

                            {/* Menu Hadiah */}
                            <td className="py-3 px-3.5">
                              <span className="font-bold text-emerald-900 block">{v.product_name}</span>
                              <span className="text-[10px] text-emerald-700 font-bold">Gratis (Rp 0)</span>
                            </td>

                            {/* Status Klaim */}
                            <td className="py-3 px-3.5">
                              {isRedeemed ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Sudah Ditukar
                                  </span>
                                  {v.redeemed_at && (
                                    <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                                      {new Date(v.redeemed_at).toLocaleString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                              ) : isActive ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Belum Ditukar (Aktif)
                                  </span>
                                  <span className="block text-[9px] text-amber-800 font-medium mt-0.5">
                                    Sisa ~{Math.max(1, Math.ceil((new Date(v.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} hari
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                    <X className="w-3 h-3 text-rose-600" />
                                    Kedaluwarsa
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Tgl Terbit */}
                            <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                              {new Date(v.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>

                            {/* Masa Berlaku */}
                            <td className="py-3 px-3.5 font-mono text-[11px]">
                              <span className={isExpired ? "text-rose-600 line-through" : "text-slate-800 font-bold"}>
                                {new Date(v.expires_at).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </td>

                            {/* Catatan */}
                            <td className="py-3 px-3.5 text-slate-500 max-w-[180px] truncate" title={v.notes || "-"}>
                              {v.notes || "-"}
                            </td>

                            {/* Aksi */}
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isActive && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateVoucherStatus(v.id, "redeemed")}
                                    title="Tandai Sudah Ditukar Manual"
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200 transition cursor-pointer"
                                  >
                                    Tandai Ditukar
                                  </button>
                                )}
                                {isRedeemed && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateVoucherStatus(v.id, "active")}
                                    title="Aktifkan Kembali Voucher"
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-200 transition cursor-pointer"
                                  >
                                    Batalkan Klaim
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVoucher(v.id, v.code)}
                                  title="Hapus Voucher"
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {total > LIST_PAGE_SIZE && <div className="px-4 pb-3">{renderTablePagination("vouchers", total)}</div>}
            </>
          );
        })()}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: PURCHASE ORDER (PO) & PREDIKSI KEBUTUHAN STOK           */}
        {/* ============================================================== */}
        {activeAdminTab === "purchase_orders" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  Purchase Order (PO) &amp; Prediksi Kebutuhan Stok
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Agen AI menghitung rata-rata pemakaian 14 hari terakhir dan hanya menyiapkan <b>Draft PO + Pesan WhatsApp</b>. Pengiriman ke supplier tetap dilakukan oleh Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadPurchaseOrders()}
                disabled={poLoading}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer self-start md:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${poLoading ? "animate-spin" : ""}`} />
                <span>Refresh Prediksi</span>
              </button>
            </div>

            {poMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  poMessage.isError
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                <span>{poMessage.text}</span>
                <button type="button" onClick={() => setPoMessage(null)} className="ml-3 underline text-[11px]">
                  Tutup
                </button>
              </div>
            )}

            {/* 1. Prediksi Kebutuhan Order Bahan */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">1. Prediksi Kebutuhan Order (Basis 14 Hari Terakhir)</h3>
                  <p className="text-[11px] text-slate-500">
                    Target buffer stok gudang: 14 hari pemakaian + batas aman (reorder threshold).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedPoSupplierId}
                    onChange={(e) => setSelectedPoSupplierId(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                  >
                    <option value="">-- Pilih Supplier (Opsional) --</option>
                    {suppliersList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="Catatan PO (opsional)"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 w-44"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateAutoPoDraft()}
                    disabled={poLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Buat Draft PO Otomatis</span>
                  </button>
                </div>
              </div>

              {(() => {
                const { pagedItems, total, needsScroll } = paginateList(poForecast, "poForecast");
                return (
                  <>
                    <div className={`overflow-x-auto ${needsScroll ? "max-h-[600px] overflow-y-auto border-t border-slate-200" : ""}`}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className={needsScroll ? "sticky top-0 z-10 bg-slate-50 shadow-2xs" : ""}>
                          <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <th className="py-3 px-4">Bahan Baku</th>
                            <th className="py-3 px-4 text-right">Stok Gudang</th>
                            <th className="py-3 px-4 text-right">Stok Kedai</th>
                            <th className="py-3 px-4 text-right">Pemakaian/Hari</th>
                            <th className="py-3 px-4 text-right">Estimasi Habis</th>
                            <th className="py-3 px-4 text-right">Rekomendasi Order</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pagedItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400">
                                {poLoading ? "Menghitung prediksi pemakaian..." : "Belum ada data bahan baku."}
                              </td>
                            </tr>
                          ) : (
                            pagedItems.map((f) => (
                        <tr key={f.raw_material_id} className={f.needs_order ? "bg-amber-50/40" : "hover:bg-slate-50"}>
                          <td className="py-3 px-4 font-bold text-slate-800">{f.name}</td>
                          <td className="py-3 px-4 text-right font-mono">
                            {Math.round(f.central_stock)} {f.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            {Math.round(f.booth_stock_total)} {f.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {f.avg_daily_usage} {f.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {f.days_left_central >= 999 ? "Aman" : `${f.days_left_central} hari`}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {f.recommended_qty > 0 ? `${f.recommended_qty} ${f.unit}` : "-"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {f.needs_order ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                                PERLU ORDER
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                Aman
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleCreateAutoPoDraft([
                                  {
                                    raw_material_id: f.raw_material_id,
                                    name: f.name,
                                    unit: f.unit,
                                    current_stock: Math.round(f.central_stock),
                                    avg_daily_usage: f.avg_daily_usage,
                                    days_left: f.days_left_central,
                                    recommended_qty: f.recommended_qty > 0 ? f.recommended_qty : Math.max(10, f.reorder_threshold),
                                  },
                                ])
                              }
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-[11px] transition cursor-pointer"
                            >
                              + Draft PO
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {total > LIST_PAGE_SIZE && <div className="px-4 pb-3">{renderTablePagination("poForecast", total)}</div>}
            </>
          );
        })()}
            </div>

            {/* 2. Daftar Purchase Order & Draft Pesan WA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">2. Daftar Purchase Order (Draft &amp; Riwayat)</h3>
                <p className="text-[11px] text-slate-500">
                  Salin pesan WhatsApp atau buka langsung ke aplikasi WhatsApp Anda untuk mengirim ke supplier.
                </p>
              </div>

              {purchaseOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Belum ada Purchase Order. Klik &ldquo;⚡ Buat Draft PO Otomatis&rdquo; di atas atau minta Virtual GM via Telegram.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {purchaseOrders.map((po) => {
                    let parsedItems: any[] = [];
                    try {
                      parsedItems = JSON.parse(po.items_json || "[]");
                    } catch {
                      parsedItems = [];
                    }
                    const cleanedPhone = (po.supplier?.phone || "").replace(/[^0-9]/g, "");
                    const waPhone = cleanedPhone.startsWith("0") ? `62${cleanedPhone.slice(1)}` : cleanedPhone;
                    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(po.draft_message || "")}`;

                    return (
                      <div key={po.id} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/60">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-extrabold text-sm text-slate-900">{po.po_number}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  po.status === "draft"
                                    ? "bg-amber-100 text-amber-800"
                                    : po.status === "sent"
                                    ? "bg-blue-100 text-blue-800"
                                    : po.status === "received"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {po.status}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                                {po.created_by === "agent_draft" ? "🤖 Draft Agen" : "👤 Owner"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Supplier: <b>{po.supplier?.name || "Belum dipilih"}</b> • {new Date(po.createdAt).toLocaleString("id-ID")}
                            </p>
                          </div>
                          {po.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handleDeletePo(po.id, po.po_number)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus Draft PO"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
                          {parsedItems.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">{it.name}</span>
                              <span className="font-mono font-bold text-slate-900">
                                {it.recommended_qty} {it.unit}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Draft Pesan WhatsApp (Siap Kirim)
                          </label>
                          <textarea
                            readOnly
                            rows={5}
                            value={po.draft_message || ""}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] font-mono text-slate-700 focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(po.draft_message || "");
                              setCopiedPoId(po.id);
                              setTimeout(() => setCopiedPoId(null), 2000);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedPoId === po.id ? "Tersalin!" : "Copy Pesan WA"}</span>
                          </button>

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                          >
                            💬 Buka WhatsApp
                          </a>

                          {po.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handleUpdatePoStatus(po.id, "sent")}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition cursor-pointer"
                            >
                              Tandai Terkirim
                            </button>
                          )}

                          {(po.status === "draft" || po.status === "sent") && (
                            <button
                              type="button"
                              onClick={() => handleUpdatePoStatus(po.id, "received")}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition cursor-pointer"
                            >
                              ✅ Terima Barang (Masuk Gudang)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Manajemen Supplier */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">3. Daftar Supplier</h3>
              <form onSubmit={handleCreateSupplier} className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Nama Supplier *"
                  value={newSupplierForm.name}
                  onChange={(e) => setNewSupplierForm((p) => ({ ...p, name: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  placeholder="No. WhatsApp (08xxx / 628xxx)"
                  value={newSupplierForm.phone}
                  onChange={(e) => setNewSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Lead Time (hari)"
                  value={newSupplierForm.lead_time_days}
                  onChange={(e) => setNewSupplierForm((p) => ({ ...p, lead_time_days: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  placeholder="Catatan (opsional)"
                  value={newSupplierForm.notes}
                  onChange={(e) => setNewSupplierForm((p) => ({ ...p, notes: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <button
                  type="submit"
                  disabled={poLoading}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Supplier</span>
                </button>
              </form>

              {suppliersList.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {suppliersList.map((s) => (
                    <div key={s.id} className="px-4 py-2.5 flex items-center justify-between text-xs bg-white">
                      <div>
                        <span className="font-bold text-slate-800">{s.name}</span>
                        <span className="text-slate-500 ml-2">
                          {s.phone || "Tanpa No. WA"} • Lead time {s.lead_time_days} hari
                        </span>
                        {s.notes && <span className="text-slate-400 ml-2">({s.notes})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(s.id, s.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 8: SOCIAL MEDIA STRATEGIST (IG & TIKTOK + GOOGLE FLOW)     */}
        {/* ============================================================== */}
        {activeAdminTab === "social_media" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    Social Media Strategist (Instagram &amp; TikTok)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Jadwal otomatis <b>3x seminggu (Senin, Rabu, Jumat pukul 09:00 WIB — 1 ide/hari)</b>. Meriset tren viral 7 hari terakhir + data menu &amp; promo POS nyata, bebas AI slop, dengan prompt siap paste ke <b>Gemini / Google Flow</b>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadSocialDrafts()}
                  disabled={socialLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer self-start md:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${socialLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 items-center">
                <select
                  value={socialPlatformHint}
                  onChange={(e) => setSocialPlatformHint(e.target.value)}
                  className="md:col-span-3 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="">Platform: Otomatis (Rotasi IG/TikTok)</option>
                  <option value="Instagram Reels">Instagram Reels (9:16)</option>
                  <option value="Instagram Carousel">Instagram Carousel (4:5)</option>
                  <option value="TikTok">TikTok (9:16)</option>
                </select>
                <input
                  type="text"
                  value={socialCustomTopic}
                  onChange={(e) => setSocialCustomTopic(e.target.value)}
                  placeholder="Arahan topik opsional (mis. cuaca panas / promo payday)..."
                  className="md:col-span-3 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
                />
                <select
                  value={socialVoiceHint}
                  onChange={(e) => setSocialVoiceHint(e.target.value)}
                  className="md:col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                  title="Suara Gemini TTS untuk Voiceover"
                >
                  <option value="Kore">Suara TTS: Kore (Tegas)</option>
                  <option value="Aoede">Suara TTS: Aoede (Ramah)</option>
                  <option value="Puck">Suara TTS: Puck (Energik)</option>
                  <option value="Charon">Suara TTS: Charon (Dalam)</option>
                  <option value="Leda">Suara TTS: Leda (Santai)</option>
                </select>
                <label className="md:col-span-2 flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={socialSendTelegram}
                    onChange={(e) => setSocialSendTelegram(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Kirim Telegram + Audio</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSocialDraft}
                  disabled={socialLoading}
                  className="md:col-span-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{socialLoading ? "Meriset..." : "Buat Ide + Script"}</span>
                </button>
              </div>

              {!hasSerperKey && (
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  ℹ️ Mode Real Google Image saat ini memakai link pencarian Google Images langsung. Jika ingin thumbnail gambar otomatis ditarik ke sini, isi <code className="font-mono font-bold">SERPER_API_KEY</code> di <code className="font-mono font-bold">.env</code>.
                </p>
              )}
            </div>

            {socialMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  socialMessage.isError
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                <span>{socialMessage.text}</span>
                <button type="button" onClick={() => setSocialMessage(null)} className="ml-3 underline text-[11px]">
                  Tutup
                </button>
              </div>
            )}

            {socialDrafts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-400">
                Belum ada draft konten sosmed. Klik <b>&ldquo;Buat Ide Baru&rdquo;</b> di atas atau tunggu jadwal otomatis Senin/Rabu/Jumat pukul 09:00 WIB.
              </div>
            ) : (
              <div className="space-y-5">
                {socialDrafts.map((d) => {
                  let sources: Array<{ title: string; uri: string }> = [];
                  let realImages: Array<{ title: string; imageUrl: string; link: string }> = [];
                  let scenes: Array<{
                    scene_no: number;
                    time_range: string;
                    visual_action: string;
                    on_screen_text: string;
                    voiceover: string;
                    camera_note: string;
                  }> = [];
                  try {
                    sources = JSON.parse(d.trend_sources_json || "[]");
                  } catch {}
                  try {
                    realImages = JSON.parse(d.image_urls_json || "[]");
                  } catch {}
                  try {
                    scenes = JSON.parse(d.scenes_json || "[]");
                  } catch {}
                  const currentScriptValue = draftScriptMap[d.id] ?? d.voiceover_script ?? "";
                  const currentVoiceValue = draftVoiceMap[d.id] || d.tts_voice || "Kore";
                  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
                    d.image_search_query || "es teh poci"
                  )}`;

                  return (
                    <div key={d.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                            {d.platform}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-600">{d.scheduled_date}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              d.status === "posted"
                                ? "bg-emerald-100 text-emerald-800"
                                : d.status === "skipped"
                                ? "bg-slate-200 text-slate-600"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {d.status === "posted" ? "Sudah Diposting" : d.status === "skipped" ? "Dilewati" : "Draft"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {d.status !== "posted" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateSocialStatus(d.id, "posted")}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              ✅ Tandai Sudah Diposting
                            </button>
                          )}
                          {d.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateSocialStatus(d.id, "skipped")}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                            >
                              Lewati
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSocialDraft(d.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Hapus Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Kolom Kiri: Tren, Ide & Captions */}
                        <div className="space-y-3">
                          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                            <p className="text-[10px] font-extrabold uppercase text-amber-800 mb-1">
                              🔥 Tren Viral 7 Hari Terakhir
                            </p>
                            <p className="text-xs font-bold text-slate-800">{d.trend_topic}</p>
                            {sources.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                {sources.map((s, idx) => (
                                  <a
                                    key={idx}
                                    href={s.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-amber-700 underline hover:text-amber-900"
                                  >
                                    {s.title || "Sumber Tren"}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                              💡 Ide Post &amp; Hook
                            </p>
                            <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{d.post_idea}</p>
                          </div>

                          {/* Script Scene-by-Scene */}
                          {scenes.length > 0 && (
                            <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-3 space-y-2">
                              <p className="text-[10px] font-extrabold uppercase text-purple-800">
                                🎬 Script Writer: Scene-by-Scene ({scenes.length} Scene)
                              </p>
                              <div className="space-y-2">
                                {scenes.map((sc, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="bg-white border border-purple-100 rounded-lg p-2.5 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="font-extrabold text-purple-900">
                                        Scene {sc.scene_no} ({sc.time_range})
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                        📷 {sc.camera_note}
                                      </span>
                                    </div>
                                    <p className="text-slate-700">
                                      <b>Visual:</b> {sc.visual_action}
                                    </p>
                                    <p className="text-slate-700">
                                      <b>Teks Layar:</b>{" "}
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                                        {sc.on_screen_text}
                                      </span>
                                    </p>
                                    <p className="text-slate-700 italic">
                                      <b>Voiceover:</b> &ldquo;{sc.voiceover}&rdquo;
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Catatan Editor */}
                          {d.editing_notes && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                              <p className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                                ✂️ Catatan Video Editor (CapCut / Reels)
                              </p>
                              <p className="text-xs text-slate-700 whitespace-pre-line">{d.editing_notes}</p>
                            </div>
                          )}

                          {/* Studio Text-to-Speech Voiceover */}
                          <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase text-emerald-800">
                                🎙️ Voiceover Script &amp; Text-to-Speech (TTS)
                              </span>
                              <button
                                type="button"
                                onClick={() => copySocialText(`${d.id}-vo`, currentScriptValue)}
                                className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedSocialKey === `${d.id}-vo` ? "Tersalin!" : "Copy Naskah VO"}</span>
                              </button>
                            </div>
                            <textarea
                              rows={3}
                              value={currentScriptValue}
                              onChange={(e) =>
                                setDraftScriptMap((prev) => ({ ...prev, [d.id]: e.target.value }))
                              }
                              placeholder="Naskah voiceover..."
                              className="w-full text-xs text-slate-800 bg-white rounded-lg p-2 border border-emerald-200 focus:outline-none"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={currentVoiceValue}
                                onChange={(e) =>
                                  setDraftVoiceMap((prev) => ({ ...prev, [d.id]: e.target.value }))
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white text-[11px] font-semibold text-slate-700"
                              >
                                <option value="Kore">Kore (Tegas / Jelas)</option>
                                <option value="Aoede">Aoede (Ramah / Cerah)</option>
                                <option value="Puck">Puck (Energik / Cepat)</option>
                                <option value="Charon">Charon (Berat / Kalem)</option>
                                <option value="Leda">Leda (Santai / Kasual)</option>
                                <option value="Fenrir">Fenrir (Antusias)</option>
                              </select>
                              <button
                                type="button"
                                disabled={ttsGeneratingId === d.id}
                                onClick={() => handleSynthesizeTts(d.id, d.voiceover_script || "", d.tts_voice || "Kore")}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                {ttsGeneratingId === d.id
                                  ? "Merender Audio..."
                                  : d.voiceover_audio_url
                                  ? "🔄 Render Ulang TTS (.wav)"
                                  : "🎙️ Render Audio TTS (.wav)"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBrowserSpeechPreview(currentScriptValue)}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                              >
                                🔊 Preview Browser
                              </button>
                            </div>
                            {d.voiceover_audio_url && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <audio controls src={d.voiceover_audio_url} className="h-9 flex-1 min-w-[200px]" />
                                <a
                                  href={`${d.voiceover_audio_url}${d.voiceover_audio_url.includes("?") ? "&" : "?"}download=1`}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold"
                                >
                                  ⬇️ Download .wav
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase text-slate-500">
                                ✍️ Caption Instagram
                              </span>
                              <button
                                type="button"
                                onClick={() => copySocialText(`${d.id}-ig`, d.caption_ig)}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedSocialKey === `${d.id}-ig` ? "Tersalin!" : "Copy IG"}</span>
                              </button>
                            </div>
                            <textarea
                              readOnly
                              rows={3}
                              value={d.caption_ig}
                              className="w-full text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-200 focus:outline-none"
                            />
                          </div>

                          <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase text-slate-500">
                                🎵 Caption TikTok
                              </span>
                              <button
                                type="button"
                                onClick={() => copySocialText(`${d.id}-tt`, d.caption_tiktok)}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedSocialKey === `${d.id}-tt` ? "Tersalin!" : "Copy TikTok"}</span>
                              </button>
                            </div>
                            <textarea
                              readOnly
                              rows={2}
                              value={d.caption_tiktok}
                              className="w-full text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-200 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Kolom Kanan: Prompts Gemini / Google Flow & Real Google Image */}
                        <div className="space-y-3">
                          <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase text-emerald-800">
                                🖼️ Prompt Image — Gemini / Google Flow
                              </span>
                              <button
                                type="button"
                                onClick={() => copySocialText(`${d.id}-img`, d.prompt_image_flow)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedSocialKey === `${d.id}-img` ? "Tersalin!" : "Copy Prompt"}</span>
                              </button>
                            </div>
                            <textarea
                              readOnly
                              rows={4}
                              value={d.prompt_image_flow}
                              className="w-full text-[11px] font-mono text-slate-700 bg-white rounded-lg p-2 border border-emerald-200 focus:outline-none"
                            />
                          </div>

                          <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase text-blue-800">
                                🎬 Prompt Video 9:16 — Google Flow / Veo
                              </span>
                              <button
                                type="button"
                                onClick={() => copySocialText(`${d.id}-vid`, d.prompt_video_flow)}
                                className="px-2.5 py-1 rounded-lg bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedSocialKey === `${d.id}-vid` ? "Tersalin!" : "Copy Prompt"}</span>
                              </button>
                            </div>
                            <textarea
                              readOnly
                              rows={4}
                              value={d.prompt_video_flow}
                              className="w-full text-[11px] font-mono text-slate-700 bg-white rounded-lg p-2 border border-blue-200 focus:outline-none"
                            />
                          </div>

                          <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase text-slate-500">
                                🚫 Negative Prompt (Anti-AI Slop)
                              </span>
                              <button
                                type="button"
                                onClick={() => copySocialText(`${d.id}-neg`, d.negative_prompt)}
                                className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                {copiedSocialKey === `${d.id}-neg` ? "Tersalin!" : "Copy"}
                              </button>
                            </div>
                            <p className="text-[11px] font-mono text-slate-600">{d.negative_prompt}</p>
                          </div>

                          <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase text-slate-500">
                                🔍 Referensi Real Google Image
                              </span>
                              <a
                                href={googleImagesUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold"
                              >
                                🌐 Buka Google Images: &ldquo;{d.image_search_query}&rdquo;
                              </a>
                            </div>
                            {realImages.length > 0 && (
                              <div className="grid grid-cols-4 gap-2 pt-1">
                                {realImages.map((img, idx) => (
                                  <a
                                    key={idx}
                                    href={img.link || img.imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-80"
                                    title={img.title}
                                  >
                                    <img
                                      src={img.imageUrl}
                                      alt={img.title}
                                      className="w-full h-16 object-cover bg-slate-100"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                    step="any"
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
                    step="any"
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
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Bahan Sachet / Bubuk Perasa Utama (BOM):
                  </label>
                  <select
                    value={newMenuForm.flavorMaterialId}
                    onChange={(e) => setNewMenuForm({ ...newMenuForm, flavorMaterialId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  >
                    <option value="">Tanpa Sirup/Bubuk (Hanya Teh Poci Murni)</option>
                    {menuMaterials
                      .filter((m) => !m.name.toLowerCase().includes("cup") && !m.name.toLowerCase().includes("tea premix") && !m.name.toLowerCase().includes("kantong teh") && !m.name.toLowerCase().includes("gula"))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Bahan Sachet Campuran / Tambahan (Opsional, misal Milk Tea untuk Matcha Latte):
                  </label>
                  <select
                    value={newMenuForm.secondaryFlavorMaterialId}
                    onChange={(e) => setNewMenuForm({ ...newMenuForm, secondaryFlavorMaterialId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  >
                    <option value="">-- Tidak ada sachet campuran kedua --</option>
                    {menuMaterials
                      .filter((m) => !m.name.toLowerCase().includes("cup") && !m.name.toLowerCase().includes("tea premix") && !m.name.toLowerCase().includes("kantong teh") && !m.name.toLowerCase().includes("gula"))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                  </select>
                </div>
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
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Bahan Sachet / Bubuk Perasa Utama (BOM):
                  </label>
                  <select
                    value={editMenuForm.flavorMaterialId}
                    onChange={(e) => setEditMenuForm({ ...editMenuForm, flavorMaterialId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  >
                    <option value="">Tanpa Sachet Perasa (Hanya Teh Poci Murni)</option>
                    {menuMaterials
                      .filter((m) => !m.name.toLowerCase().includes("cup") && !m.name.toLowerCase().includes("tea premix") && !m.name.toLowerCase().includes("kantong teh") && !m.name.toLowerCase().includes("gula"))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Bahan Sachet Campuran / Tambahan (Opsional, misal Milk Tea untuk Matcha Latte):
                  </label>
                  <select
                    value={editMenuForm.secondaryFlavorMaterialId}
                    onChange={(e) => setEditMenuForm({ ...editMenuForm, secondaryFlavorMaterialId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  >
                    <option value="">-- Tidak ada sachet campuran kedua --</option>
                    {menuMaterials
                      .filter((m) => !m.name.toLowerCase().includes("cup") && !m.name.toLowerCase().includes("tea premix") && !m.name.toLowerCase().includes("kantong teh") && !m.name.toLowerCase().includes("gula"))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                  </select>
                </div>
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

                        {/* Rincian HPP Reguler di Edit Modal */}
                        <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">HPP Reguler:</span>
                            <span className="text-xs font-mono font-black text-rose-700 bg-white border border-rose-200 px-2 py-0.5 rounded">
                              {formatRupiah(currentEditingGroup?.reguler?.cost_price || 0)}
                            </span>
                          </div>
                          {currentEditingGroup?.reguler && (
                            <button
                              type="button"
                              onClick={() => handleOpenHppModal(currentEditingGroup.reguler)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>💰 Atur Rincian HPP Reguler</span>
                            </button>
                          )}
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

                        {/* Rincian HPP Jumbo di Edit Modal */}
                        <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">HPP Jumbo:</span>
                            <span className="text-xs font-mono font-black text-rose-700 bg-white border border-rose-200 px-2 py-0.5 rounded">
                              {formatRupiah(currentEditingGroup?.jumbo?.cost_price || 0)}
                            </span>
                          </div>
                          {currentEditingGroup?.jumbo && (
                            <button
                              type="button"
                              onClick={() => handleOpenHppModal(currentEditingGroup.jumbo)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>💰 Atur Rincian HPP Jumbo</span>
                            </button>
                          )}
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
      {/* MODAL: RINCIAN HPP & BIAYA KOMPONEN (CUP, GULA, TEH, SEDOTAN)  */}
      {/* ============================================================== */}
      {isHppModalOpen && selectedHppProduct && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-700" />
                  Rincian HPP: {selectedHppProduct.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Harga Jual: <span className="font-bold text-emerald-800 font-mono">{formatRupiah(selectedHppProduct.price)}</span> • Kelola rincian biaya bahan baku per cup.
                </p>
              </div>
              <button
                onClick={() => setIsHppModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHpp} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Petunjuk & Quick Template Helper */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>💡</span>
                    <span>Pilihan Komponen Standar Franchise</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetHppToTemplate}
                    className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/70 hover:bg-amber-200 px-2 py-0.5 rounded-lg transition cursor-pointer"
                  >
                    🔄 Muat Template Standar Poci
                  </button>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Pilih dari menu dropdown cepat (<strong>Cup</strong>, <strong>Gula Syrup</strong>, <strong>Larutan Teh</strong>, <strong>Sedotan</strong>), masukkan biaya modalnya (Rp), dan klik <strong>+ Tambah Komponen (Add More)</strong> untuk menambah komponen lain.
                </p>
              </div>

              {/* List Komponen HPP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Daftar Rincian Komponen Biaya:
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {hppComponents.length} Komponen
                  </span>
                </div>

                <div className="space-y-2">
                  {hppComponents.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2 shadow-2xs"
                    >
                      {/* Dropdown Komponen Cepat */}
                      <div className="sm:w-44 shrink-0">
                        <select
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          onChange={(e) => handleQuickSelectComponent(idx, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>-- Pilih Dropdown Standar --</option>
                          <option value="cup">🥤 Cup ({selectedHppProduct?.name?.toLowerCase()?.includes("reguler") ? "Reguler" : "22 oz Poci"})</option>
                          <option value="gula">🍯 Gula Pasir Rose Brand</option>
                          <option value="teh">🫖 Poci Jasmine Kantong</option>
                          <option value="sedotan">🥤 Sedotan Poci Single Wrap</option>
                          <option value="seal">🏷️ Plastik Seal Kecil</option>
                          <option value="air">💧 Estimasi Air Galon</option>
                          <option value="es">🧊 Estimasi Es Batu Kristal</option>
                          <option value="plastik">🛍️ Estimasi Kantong Plastik Cup</option>
                          <option value="sachet">📦 Sachet / Poci Mix Perasa</option>
                          <option value="custom">✏️ Custom (Manual)</option>
                        </select>
                      </div>

                      {/* Input Nama Komponen */}
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Nama komponen biaya..."
                          value={item.name}
                          onChange={(e) => handleUpdateHppComponent(idx, "name", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Input Biaya (Rp) & Hapus */}
                      <div className="flex items-center gap-1.5 sm:w-36 shrink-0">
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold font-mono">Rp</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            placeholder="0"
                            value={item.cost === 0 ? 0 : item.cost ?? ""}
                            onChange={(e) =>
                              handleUpdateHppComponent(
                                idx,
                                "cost",
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveHppComponent(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus komponen ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tombol Add More */}
                <button
                  type="button"
                  onClick={handleAddHppComponent}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>+ Tambah Komponen (Add More)</span>
                </button>
              </div>

              {/* Ringkasan Finansial HPP & Margin */}
              {(() => {
                const totalHpp = hppComponents.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
                const labaKotor = Math.max(0, selectedHppProduct.price - totalHpp);
                const marginPercent = selectedHppProduct.price > 0 ? ((labaKotor / selectedHppProduct.price) * 100).toFixed(1) : "0";

                return (
                  <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border border-emerald-200 rounded-2xl space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-800">Total HPP per Cup:</span>
                      <span className="font-mono font-black text-base text-rose-700 bg-white px-2 py-0.5 rounded-lg border border-rose-200">
                        {formatRupiah(totalHpp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60">
                      <span className="font-bold text-slate-600">Harga Jual Menu:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatRupiah(selectedHppProduct.price)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-emerald-950">Estimasi Laba Kotor per Cup:</span>
                      <span className="font-mono font-black text-sm text-emerald-800">
                        {formatRupiah(labaKotor)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-slate-600">Margin Keuntungan:</span>
                      <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                        {marginPercent}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {hppMessage && (
                <p className="text-xs font-bold text-center py-1">
                  {hppMessage}
                </p>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHppModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={hppLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {hppLoading ? "Menyimpan..." : "Simpan Rincian HPP"}
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
              {/* Tab Pilihan Aksi yang Sangat Jelas & Tidak Ambigu */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setSingleStockMode("set")}
                  className={`py-2 px-1 rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    singleStockMode === "set"
                      ? "bg-slate-900 text-white shadow-sm font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="text-xs font-mono font-black">= Set Stok Fisik</span>
                  <span className={`text-[10px] ${singleStockMode === "set" ? "text-slate-300" : "text-slate-400"}`}>
                    (Sinkron Pusat)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSingleStockMode("add")}
                  className={`py-2 px-1 rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    singleStockMode === "add"
                      ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="text-xs font-mono font-black">+ Kirim ke Kedai</span>
                  <span className={`text-[10px] ${singleStockMode === "add" ? "text-emerald-100" : "text-slate-400"}`}>
                    (Pusat ➔ Kedai)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSingleStockMode("return")}
                  className={`py-2 px-1 rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    singleStockMode === "return"
                      ? "bg-amber-600 text-white shadow-sm font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="text-xs font-mono font-black">↺ Retur ke Pusat</span>
                  <span className={`text-[10px] ${singleStockMode === "return" ? "text-amber-100" : "text-slate-400"}`}>
                    (Kedai ➔ Pusat)
                  </span>
                </button>
              </div>

              {/* Perhitungan Saldo Dua Arah Secara Real-time */}
              {(() => {
                const masterMat = data?.rawMaterials?.find((m) => m.id === singleStockMaterial.id);
                const currentPusat = masterMat?.master_stock || 0;
                const currentKedai = singleStockMaterial.currentStock || 0;
                const inputVal = parseFloat(singleStockValue) || 0;

                let nextPusat = currentPusat;
                let nextKedai = currentKedai;
                let deltaKedai = 0; // perubahan di kedai

                if (singleStockMode === "set") {
                  nextKedai = inputVal;
                  deltaKedai = inputVal - currentKedai;
                  nextPusat = currentPusat - deltaKedai; // jika kedai berkurang (-140), pusat bertambah (+140)
                } else if (singleStockMode === "add") {
                  nextKedai = currentKedai + inputVal;
                  deltaKedai = inputVal;
                  nextPusat = currentPusat - inputVal;
                } else if (singleStockMode === "return") {
                  nextKedai = currentKedai - inputVal;
                  deltaKedai = -inputVal;
                  nextPusat = currentPusat + inputVal;
                }

                const isGram = singleStockMaterial.unit === "gram";
                const isMl = singleStockMaterial.unit === "ml";
                const unitStr = singleStockMaterial.unit;

                const fmtVal = (num: number) => {
                  if (isGram) return `${(num / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg (${num.toLocaleString("id-ID")} gr)`;
                  if (isMl) return `${num.toLocaleString("id-ID")} ml (~${(num / 1000).toFixed(1)}L)`;
                  return `${num.toLocaleString("id-ID")} ${unitStr}`;
                };

                return (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2 font-mono">
                    <div className="flex justify-between items-center text-slate-700 font-bold">
                      <span>Kedai ({singleStockOutlet.name}):</span>
                      <span>
                        {fmtVal(currentKedai)}
                        {((singleStockMode === "set" && inputVal !== currentKedai) || ((singleStockMode === "add" || singleStockMode === "return") && inputVal > 0)) && (
                          <span className={`ml-2 font-black ${deltaKedai < 0 ? "text-amber-700" : "text-emerald-700"}`}>
                            ➔ {fmtVal(nextKedai)} ({deltaKedai > 0 ? `+${deltaKedai}` : deltaKedai})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700 font-bold pt-1 border-t border-slate-200">
                      <span>Gudang Pusat (Master Stock):</span>
                      <span>
                        {fmtVal(currentPusat)}
                        {((singleStockMode === "set" && inputVal !== currentKedai) || ((singleStockMode === "add" || singleStockMode === "return") && inputVal > 0)) && (
                          <span className={`ml-2 font-black ${nextPusat > currentPusat ? "text-emerald-700" : nextPusat < 0 ? "text-rose-600" : "text-amber-700"}`}>
                            ➔ {fmtVal(nextPusat)} ({nextPusat >= currentPusat ? `+${nextPusat - currentPusat}` : `-${currentPusat - nextPusat}`})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Penjelasan Logis Visual */}
                    {singleStockMode === "set" && inputVal !== currentKedai && (
                      <div className={`p-2 rounded-xl text-[11px] font-sans font-bold flex items-center gap-1.5 ${
                        deltaKedai < 0
                          ? "bg-amber-100/80 text-amber-950 border border-amber-300"
                          : "bg-emerald-100/80 text-emerald-950 border border-emerald-300"
                      }`}>
                        <span>{deltaKedai < 0 ? "📦" : "🚚"}</span>
                        <span>
                          {deltaKedai < 0
                            ? `Stok kedai berkurang ${Math.abs(deltaKedai)} ${unitStr} ➔ Otomatis KEMBALI MENAMBAH Master Stock Pusat (+${Math.abs(deltaKedai)} ${unitStr})`
                            : `Stok kedai bertambah +${deltaKedai} ${unitStr} ➔ Otomatis MEMOTONG Master Stock Pusat (-${deltaKedai} ${unitStr})`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {singleStockMode === "set"
                    ? "Ketik Jumlah Total Stok Fisik Riil di Kedai:"
                    : singleStockMode === "return"
                    ? "Jumlah yang Diretur DARI Kedai KE Pusat:"
                    : "Jumlah yang Dikirim DARI Pusat KE Kedai:"}
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

              {/* Quick Chips Presets */}
              {(() => {
                const isGram = singleStockMaterial.unit === "gram";
                const isMl = singleStockMaterial.unit === "ml";
                const chips = isGram
                  ? [1000, 2000, 5000, 10000, 15000, 20000]
                  : isMl
                  ? [500, 1000, 1600, 3200, 5000]
                  : [10, 20, 50, 100, 150, 200];

                return (
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSingleStockValue(String(chip))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                      >
                        {isGram ? `${(chip / 1000).toLocaleString("id-ID")} kg` : isMl ? `${chip.toLocaleString("id-ID")} ml` : chip.toLocaleString("id-ID")}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {singleStockMessage && <p className="text-xs font-bold text-center">{singleStockMessage}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSingleStockOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={singleStockLoading}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition text-white cursor-pointer ${
                    singleStockMode === "return"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : singleStockMode === "add"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {(() => {
                    if (singleStockLoading) return "Menyimpan...";
                    const inputVal = parseFloat(singleStockValue) || 0;
                    const delta = inputVal - (singleStockMaterial.currentStock || 0);
                    const unitStr = singleStockMaterial.unit;

                    if (singleStockMode === "set") {
                      if (delta < 0) return `Simpan (Kembalikan +${Math.abs(delta)} ${unitStr} ke Pusat)`;
                      if (delta > 0) return `Simpan (Potong -${delta} ${unitStr} dari Pusat)`;
                      return "Simpan (Stok Tetap)";
                    }
                    if (singleStockMode === "return") {
                      return `Retur ${inputVal} ${unitStr} ke Pusat`;
                    }
                    return `Kirim ${inputVal} ${unitStr} ke Kedai`;
                  })()}
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
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-[11px] leading-tight">
                  <strong>Sinkronisasi Dua Arah Master Stock:</strong> Penambahan stok fisik di kedai akan memotong Master Stock Pusat, dan pengurangan stok fisik otomatis dikembalikan menambah Master Stock Gudang Pusat.
                </p>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-600 font-semibold">Tombol Pintas:</span>
                <button
                  type="button"
                  onClick={setAllOpnameToZero}
                  className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                >
                  Setel Semua ke 0 (Retur Semua ke Pusat)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uniqueMaterials.map((mat) => {
                  const boothStock = data?.boothStocks.find(
                    (bs) => bs.outlet.id === opnameOutlet.id && bs.raw_material.id === mat.id
                  );
                  const currentKedai = boothStock?.current_stock ?? 0;
                  const targetKedai = opnameValues[mat.id] ?? 0;
                  const delta = targetKedai - currentKedai;
                  const masterStock = mat.master_stock ?? 0;

                  return (
                    <div key={mat.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 truncate block">{mat.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <span>
                            Pusat:{" "}
                            <strong className="text-emerald-700">
                              {mat.unit === "gram"
                                ? `${(masterStock / 1000).toLocaleString("id-ID")} kg`
                                : `${masterStock.toLocaleString("id-ID")} ${mat.unit}`}
                            </strong>
                          </span>
                          {delta !== 0 && (
                            <span
                              className={`font-bold px-1 rounded ${
                                delta > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {delta > 0
                                ? `+${delta} (potong pusat)`
                                : `${delta} (kembali ke pusat)`}
                            </span>
                          )}
                        </div>
                      </div>
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
                          className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-right"
                        />
                        <span className="text-[10px] text-slate-400 font-mono w-7">{mat.unit}</span>
                      </div>
                    </div>
                  );
                })}
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
      {/* MODAL: RESTOCK & MUTASI DUA ARAH CENTRAL KITCHEN              */}
      {/* ============================================================== */}
      {isRestockOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                Manajemen Stok Gudang Pusat &amp; Kedai
              </h3>
              <button
                onClick={() => setIsRestockOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl my-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRestockMode("add")}
                className={`py-1.5 px-2 rounded-lg transition text-center ${
                  restockMode === "add"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Kirim ke Kedai
              </button>
              <button
                type="button"
                onClick={() => setRestockMode("return")}
                className={`py-1.5 px-2 rounded-lg transition text-center ${
                  restockMode === "return"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Retur ke Pusat
              </button>
              <button
                type="button"
                onClick={() => setRestockMode("central_in")}
                className={`py-1.5 px-2 rounded-lg transition text-center ${
                  restockMode === "central_in"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pasokan Masuk
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-3.5 my-3">
              {/* Kedai Dropdown (hanya untuk Kirim dan Retur) */}
              {(restockMode === "add" || restockMode === "return") && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {restockMode === "add" ? "Kedai Tujuan Penerima:" : "Kedai Asal Retur:"}
                  </label>
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
              )}

              {/* Bahan Baku Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Item / Bahan Baku:</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="">-- Pilih Item / Bahan Baku --</option>
                  <optgroup label="Kas Induk & Modal Tunai">
                    <option value="CASH_TRANSFER">
                      💵 Uang Cash / Modal Tunai (Kas Pusat: Rp {(centralVault?.cash_balance ?? 5000000).toLocaleString("id-ID")})
                    </option>
                  </optgroup>
                  <optgroup label="Bahan Baku Minuman">
                    {uniqueMaterials.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Pusat: {m.unit === "gram" ? `${((m.master_stock || 0) / 1000).toLocaleString("id-ID")} kg` : `${(m.master_stock || 0).toLocaleString("id-ID")} ${m.unit}`})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Real-time Balance Calculation Box for Cash */}
              {selectedMaterialId === "CASH_TRANSFER" && (() => {
                const currentPusatCash = centralVault?.cash_balance ?? 5000000;
                const targetOutlet = data?.outlets.find((o) => o.id === restockOutletId);
                const currentKedaiCash = targetOutlet?.initial_cash || 0;
                const inputNum = parseFloat(restockQty) || 0;

                let nextPusat = currentPusatCash;
                let nextKedai = currentKedaiCash;

                if (restockMode === "add") {
                  nextPusat = currentPusatCash - inputNum;
                  nextKedai = currentKedaiCash + inputNum;
                } else if (restockMode === "return") {
                  nextPusat = currentPusatCash + inputNum;
                  nextKedai = currentKedaiCash - inputNum;
                } else if (restockMode === "central_in") {
                  nextPusat = currentPusatCash + inputNum;
                }

                return (
                  <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-amber-900">
                      <span>Kas Induk Pusat:</span>
                      <span>
                        Rp {currentPusatCash.toLocaleString("id-ID")}{" "}
                        {inputNum > 0 && (
                          <strong className="text-emerald-700">
                            ➔ Rp {Math.max(0, nextPusat).toLocaleString("id-ID")}
                          </strong>
                        )}
                      </span>
                    </div>
                    {(restockMode === "add" || restockMode === "return") && (
                      <div className="flex justify-between items-center text-amber-900">
                        <span>Modal Awal {targetOutlet?.name || "Kedai"}:</span>
                        <span>
                          Rp {currentKedaiCash.toLocaleString("id-ID")}{" "}
                          {inputNum > 0 && (
                            <strong className="text-blue-700">
                              ➔ Rp {Math.max(0, nextKedai).toLocaleString("id-ID")}
                            </strong>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Real-time Balance Calculation Box for Materials */}
              {selectedMaterialId && selectedMaterialId !== "CASH_TRANSFER" && (() => {
                const selMat = uniqueMaterials.find((m: any) => m.id === selectedMaterialId) as any;
                const selBooth = data?.boothStocks.find(
                  (bs) => bs.outlet.id === restockOutletId && bs.raw_material.id === selectedMaterialId
                );
                const currentPusat = selMat?.master_stock || 0;
                const currentKedai = selBooth?.current_stock || 0;
                const inputNum = parseFloat(restockQty) || 0;

                let nextPusat = currentPusat;
                let nextKedai = currentKedai;

                if (restockMode === "add") {
                  nextPusat = currentPusat - inputNum;
                  nextKedai = currentKedai + inputNum;
                } else if (restockMode === "return") {
                  nextPusat = currentPusat + inputNum;
                  nextKedai = currentKedai - inputNum;
                } else if (restockMode === "central_in") {
                  nextPusat = currentPusat + inputNum;
                } else if (restockMode === "central_set") {
                  nextPusat = inputNum;
                }

                const isGram = selMat?.unit === "gram";

                return (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-slate-600 font-bold">
                      <span>Stok Gudang Pusat:</span>
                      <span>
                        {isGram
                          ? `${(currentPusat / 1000).toLocaleString("id-ID")} kg (${currentPusat.toLocaleString("id-ID")} gr)`
                          : `${currentPusat.toLocaleString("id-ID")} ${selMat?.unit}`}
                        {inputNum > 0 && (
                          <span className={`ml-2 font-black ${nextPusat < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                            ➔ {isGram ? `${(nextPusat / 1000).toLocaleString("id-ID")} kg` : `${nextPusat.toLocaleString("id-ID")} ${selMat?.unit}`}
                          </span>
                        )}
                      </span>
                    </div>

                    {(restockMode === "add" || restockMode === "return") && (
                      <div className="flex justify-between items-center text-slate-600 font-bold">
                        <span>Stok di Kedai:</span>
                        <span>
                          {isGram
                            ? `${(currentKedai / 1000).toLocaleString("id-ID")} kg (${currentKedai.toLocaleString("id-ID")} gr)`
                            : `${currentKedai.toLocaleString("id-ID")} ${selMat?.unit}`}
                          {inputNum > 0 && (
                            <span className={`ml-2 font-black ${nextKedai < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                              ➔ {isGram ? `${(nextKedai / 1000).toLocaleString("id-ID")} kg` : `${nextKedai.toLocaleString("id-ID")} ${selMat?.unit}`}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Input Jumlah */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jumlah ({(() => {
                    const selMat = uniqueMaterials.find((m: any) => m.id === selectedMaterialId);
                    return selMat ? selMat.unit : "satuan";
                  })()}):
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Masukkan nominal angka..."
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Quick Chips Presets */}
                {(() => {
                  const selMat = uniqueMaterials.find((m: any) => m.id === selectedMaterialId);
                  const isGram = selMat?.unit === "gram";
                  const isMl = selMat?.unit === "ml";
                  const chips = isGram
                    ? [1000, 2000, 5000, 10000, 25000, 50000]
                    : isMl
                    ? [1600, 3200, 5000, 10000]
                    : [20, 50, 100, 200, 500];

                  return (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {chips.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRestockQty(String(val))}
                          className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                        >
                          +{isGram ? `${(val / 1000).toLocaleString("id-ID")} kg (${val.toLocaleString("id-ID")} gr)` : `${val.toLocaleString("id-ID")} ${selMat?.unit || ""}`}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Pasokan mingguan gudang, retur barang sisa, dll"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              {restockMessage && <p className="text-xs font-bold text-center">{restockMessage}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer ${
                    restockMode === "return"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : restockMode === "central_in"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {restockMode === "return"
                    ? "Konfirmasi Retur ke Pusat"
                    : restockMode === "central_in"
                    ? "Simpan Pasokan Masuk"
                    : "Kirim Stok ke Kedai"}
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
      {/* MODAL: TAMBAH BEBAN TETAP BULANAN (DYNAMIC FIXED COST)        */}
      {/* ============================================================== */}
      {isAddFixedCostOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-indigo-700" />
                Tambah Beban Tetap Bulanan (Fixed Overhead)
              </h3>
              <button
                onClick={() => setIsAddFixedCostOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFixedCost} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Beban Tetap (Bebas Ditulis) *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sewa Tempat / Booth, Gaji Karyawan, Listrik & Air"
                  value={fixedCostForm.name}
                  onChange={(e) => setFixedCostForm({ ...fixedCostForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Beban per Bulan (Rp) *:
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 1500000"
                  value={fixedCostForm.amount}
                  onChange={(e) => setFixedCostForm({ ...fixedCostForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                {Number(fixedCostForm.amount) > 0 && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    ≈ Rp {Math.round(Number(fixedCostForm.amount) / 30).toLocaleString("id-ID")}/hari
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kedai Bersangkutan:
                  </label>
                  <select
                    value={fixedCostForm.outletId}
                    onChange={(e) => setFixedCostForm({ ...fixedCostForm, outletId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="all">Semua Kedai (Pusat)</option>
                    {data?.outlets?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kategori Beban:
                  </label>
                  <select
                    value={fixedCostForm.category}
                    onChange={(e) => setFixedCostForm({ ...fixedCostForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="sewa">Sewa Tempat / Booth</option>
                    <option value="gaji">Gaji Karyawan / Kasir</option>
                    <option value="utilitas">Listrik &amp; Utilitas</option>
                    <option value="kebersihan">Kebersihan &amp; Keamanan</option>
                    <option value="internet">Internet &amp; POS</option>
                    <option value="penyusutan">Penyusutan Peralatan</option>
                    <option value="operasional">Operasional Rutin Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jatuh tempo tgl 5 tiap bulan"
                  value={fixedCostForm.notes}
                  onChange={(e) => setFixedCostForm({ ...fixedCostForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {fixedCostMessage && (
                <p className="text-xs font-bold text-rose-600 text-center">{fixedCostMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFixedCostOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={fixedCostLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition"
                >
                  {fixedCostLoading ? "Menyimpan..." : "Simpan Beban Tetap"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT BEBAN TETAP BULANAN                                 */}
      {/* ============================================================== */}
      {isEditFixedCostOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit3 className="w-5 h-5 text-indigo-700" />
                Edit Beban Tetap Bulanan
              </h3>
              <button
                onClick={() => setIsEditFixedCostOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditFixedCost} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Beban Tetap (Bebas Ditulis) *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sewa Tempat / Booth, Gaji Karyawan, Listrik & Air"
                  value={fixedCostForm.name}
                  onChange={(e) => setFixedCostForm({ ...fixedCostForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Beban per Bulan (Rp) *:
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 1500000"
                  value={fixedCostForm.amount}
                  onChange={(e) => setFixedCostForm({ ...fixedCostForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                {Number(fixedCostForm.amount) > 0 && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    ≈ Rp {Math.round(Number(fixedCostForm.amount) / 30).toLocaleString("id-ID")}/hari
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kedai Bersangkutan:
                  </label>
                  <select
                    value={fixedCostForm.outletId}
                    onChange={(e) => setFixedCostForm({ ...fixedCostForm, outletId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="all">Semua Kedai (Pusat)</option>
                    {data?.outlets?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kategori Beban:
                  </label>
                  <select
                    value={fixedCostForm.category}
                    onChange={(e) => setFixedCostForm({ ...fixedCostForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="sewa">Sewa Tempat / Booth</option>
                    <option value="gaji">Gaji Karyawan / Kasir</option>
                    <option value="utilitas">Listrik &amp; Utilitas</option>
                    <option value="kebersihan">Kebersihan &amp; Keamanan</option>
                    <option value="internet">Internet &amp; POS</option>
                    <option value="penyusutan">Penyusutan Peralatan</option>
                    <option value="operasional">Operasional Rutin Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jatuh tempo tgl 5 tiap bulan"
                  value={fixedCostForm.notes}
                  onChange={(e) => setFixedCostForm({ ...fixedCostForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="fixedCostActiveToggle"
                  checked={Boolean(fixedCostForm.is_active)}
                  onChange={(e) => setFixedCostForm({ ...fixedCostForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="fixedCostActiveToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Beban Tetap Ini Aktif (Dihitung dalam Laba Rugi)
                </label>
              </div>

              {fixedCostMessage && (
                <p className="text-xs font-bold text-rose-600 text-center">{fixedCostMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditFixedCostOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={fixedCostLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition"
                >
                  {fixedCostLoading ? "Menyimpan..." : "Update Beban Tetap"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SETOR MODAL AWAL USAHA                                   */}
      {/* ============================================================== */}
      {isAddCapitalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Landmark className="w-5 h-5 text-emerald-700" />
                Setor Modal Awal Usaha (Equity)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCapitalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCapital} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Sumber Modal / Nama Penyetor *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Modal Pribadi Pemilik, Investor Angel, dsb."
                  value={capitalForm.source}
                  onChange={(e) => setCapitalForm({ ...capitalForm, source: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Setoran Modal (Rp) *:
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 20000000"
                  value={capitalForm.amount}
                  onChange={(e) => setCapitalForm({ ...capitalForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal Setoran *:
                </label>
                <input
                  type="date"
                  required
                  value={capitalForm.date}
                  onChange={(e) => setCapitalForm({ ...capitalForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rekening BCA Bisnis Es Teh Poci"
                  value={capitalForm.notes}
                  onChange={(e) => setCapitalForm({ ...capitalForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {capitalMessage && (
                <p className="text-xs font-bold text-rose-600 text-center">{capitalMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCapitalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={capitalLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition"
                >
                  {capitalLoading ? "Menyimpan..." : "Simpan Setoran Modal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CATAT PEMBELIAN ASET TETAP (CAPEX)                       */}
      {/* ============================================================== */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-sky-700" />
                Catat Pembelian Aset Tetap (CAPEX)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAssetOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Aset / Peralatan *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gerobak Booth Kayu Poci, Mesin Cup Sealer Eton D8"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kategori Aset:
                  </label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setAssetForm({
                        ...assetForm,
                        category: newCat,
                        asset_type: newCat === "booth" ? "tidak_bergerak" : "bergerak",
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="booth">Gerobak / Booth Usaha</option>
                    <option value="mesin">Mesin Sealer Cup</option>
                    <option value="peralatan">Dispenser / Cooler Box</option>
                    <option value="pos">Tablet POS &amp; Printer</option>
                    <option value="elektronik">Kipas &amp; Listrik</option>
                    <option value="lainnya">Aset Tetap Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kedai / Alokasi:
                  </label>
                  <select
                    value={assetForm.outletId}
                    onChange={(e) => setAssetForm({ ...assetForm, outletId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="all">Semua Kedai (Pusat)</option>
                    {data?.outlets?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Karakteristik Tipe Aset *:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssetForm({ ...assetForm, asset_type: "tidak_bergerak" })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      assetForm.asset_type === "tidak_bergerak"
                        ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                      🏛️ Tidak Bergerak
                    </p>
                    <p className="text-[10px] text-emerald-700 font-sans mt-0.5">
                      Masa pakai panjang, nilai stabil (Booth/Gerobak, Meja Bar)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssetForm({ ...assetForm, asset_type: "bergerak" })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      assetForm.asset_type === "bergerak"
                        ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-bold text-xs text-amber-950 flex items-center gap-1">
                      🚚 Aset Bergerak
                    </p>
                    <p className="text-[10px] text-amber-700 font-sans mt-0.5">
                      Masa pakai terbatas, nilai menyusut (Mesin, Dispenser, POS)
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Harga Pembelian Aset (Rp) *:
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 5000000"
                  value={assetForm.cost}
                  onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal Pembelian *:
                </label>
                <input
                  type="date"
                  required
                  value={assetForm.purchase_date}
                  onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Beli baru di marketplace / kondisi prima"
                  value={assetForm.notes}
                  onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {assetMessage && (
                <p className="text-xs font-bold text-rose-600 text-center">{assetMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAssetOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={assetLoading}
                  className="flex-1 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shadow-md transition"
                >
                  {assetLoading ? "Menyimpan..." : "Simpan Pembelian Aset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CATAT PENGELUARAN RISET & PENGEMBANGAN (RnD)             */}
      {/* ============================================================== */}
      {isAddRndOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-amber-600" />
                Catat Pengeluaran Riset &amp; RnD Menu
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRndOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRnd} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Kegiatan Riset / Formulasi *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Trial Resep Dual Sachet Matcha Latte, Uji Cup Biodegradable"
                  value={rndForm.title}
                  onChange={(e) => setRndForm({ ...rndForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kategori Riset:
                  </label>
                  <select
                    value={rndForm.category}
                    onChange={(e) => setRndForm({ ...rndForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="resep">Riset Resep Varian Rasa</option>
                    <option value="packaging">Kemasan, Cup &amp; Sedotan</option>
                    <option value="teknis">Metode Seduh &amp; Racik</option>
                    <option value="pasar">Tester &amp; Survey Pasar</option>
                    <option value="lainnya">Riset Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Status / Hasil Riset:
                  </label>
                  <select
                    value={rndForm.outcome}
                    onChange={(e) => setRndForm({ ...rndForm, outcome: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Berhasil (Masuk Menu)">Berhasil (Masuk Menu)</option>
                    <option value="Dalam Evaluasi">Dalam Evaluasi (Tahap Tester)</option>
                    <option value="Gagal / Ditunda">Gagal / Ditunda (Arsip)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Biaya Riset &amp; Bahan (Rp) *:
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 250000"
                  value={rndForm.amount}
                  onChange={(e) => setRndForm({ ...rndForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal Pengeluaran *:
                </label>
                <input
                  type="date"
                  required
                  value={rndForm.date}
                  onChange={(e) => setRndForm({ ...rndForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pembelian bahan sample susu evaporasi & tester 10 cup"
                  value={rndForm.notes}
                  onChange={(e) => setRndForm({ ...rndForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {rndMessage && (
                <p className="text-xs font-bold text-rose-600 text-center">{rndMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRndOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rndLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition"
                >
                  {rndLoading ? "Menyimpan..." : "Simpan Pengeluaran RnD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SCAN & EKSTRAK ASET DARI FOTO / NOTA (AI VISION)        */}
      {/* ============================================================== */}
      {isScanAssetOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in duration-150 max-h-[92vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Scan &amp; Ekstrak Aset dari Foto / Nota (AI Vision)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Unggah screenshot marketplace atau foto nota fisik untuk memasukkan aset otomatis tanpa ketik manual satu per satu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScanAssetOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content Area (Scrollable) */}
            <div className="overflow-y-auto py-4 space-y-4 pr-1">
              {/* API Key Status / Config Bar */}
              <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${hasGeminiApiKey ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
                  <span className="font-bold text-slate-800">
                    {hasGeminiApiKey
                      ? "AI Vision Aktif (Google Gemini ready)"
                      : "API Key Belum Diset (Perlu Gemini API Key gratis)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeySettings(!showApiKeySettings)}
                  className="text-violet-700 hover:text-violet-900 font-bold underline text-[11px]"
                >
                  {showApiKeySettings ? "Tutup Pengaturan Key" : hasGeminiApiKey ? "⚙️ Ubah Key" : "⚙️ Masukkan Key"}
                </button>
              </div>

              {/* Form Input API Key (Jika dibuka) */}
              {showApiKeySettings && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <p className="text-slate-700 leading-relaxed font-sans">
                    Dapatkan API Key secara <strong>gratis</strong> di{" "}
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-bold underline"
                    >
                      Google AI Studio (aistudio.google.com)
                    </a>
                    . Key ini akan disimpan langsung di sistem toko Anda.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Tempel / Paste Gemini API Key Anda di sini (AIzaSy...)"
                      value={scanApiKeyInput}
                      onChange={(e) => setScanApiKeyInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      disabled={savingApiKey || !scanApiKeyInput.trim()}
                      className="px-4 py-2 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold rounded-xl transition shrink-0"
                    >
                      {savingApiKey ? "Menyimpan..." : "Simpan Key"}
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Dropzone & Outlet Selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Upload Foto Nota / Struk / Screenshot Toko:
                  </label>
                  <label className="border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/30 hover:bg-violet-50/60 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center min-h-[110px]">
                    <UploadCloud className="w-7 h-7 text-violet-600 mb-1.5" />
                    <span className="text-xs font-bold text-slate-800">
                      Klik untuk Pilih File Foto / Screenshot
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                      Mendukung format JPG, PNG, WEBP dari kamera ponsel atau screenshot marketplace
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScanImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Alokasi Kedai Default:
                  </label>
                  <select
                    value={scanDefaultOutletId}
                    onChange={(e) => setScanDefaultOutletId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="all">Semua Kedai (Pusat)</option>
                    {data?.outlets?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Aset yang terdeteksi otomatis dialokasikan ke kedai ini (bisa diubah per baris).
                  </p>
                </div>
              </div>

              {/* Image Preview & Scan Action */}
              {scanPreviewUrl && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={scanPreviewUrl}
                      alt="Pratinjau Nota"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-2xs"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Foto Nota Siap Dianalisis</p>
                      <p className="text-[10px] text-slate-500 font-sans">
                        Klik tombol di sebelah kanan untuk memulai ekstraksi otomatis dengan AI.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteScan}
                    disabled={scanLoading}
                    className="px-4 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
                  >
                    {scanLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>AI Sedang Membaca Nota...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>⚡ Pindai &amp; Ekstrak Item Aset Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Status Message */}
              {scanMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  scanMessage.includes("Berhasil") || scanMessage.includes("tersimpan")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {scanMessage}
                </div>
              )}

              {/* TABEL HASIL EKSTRAKSI ITEM */}
              {scannedItems.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Hasil Deteksi Aset ({scannedItems.filter((i) => i.selected).length} dari {scannedItems.length} item dipilih)
                      </h4>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Periksa dan sesuaikan nama barang, nominal, kategori, atau kedai sebelum disimpan ke database
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddManualScannedRow}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Baris</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="py-2 px-2 text-center w-8">
                            <input
                              type="checkbox"
                              checked={scannedItems.length > 0 && scannedItems.every((it) => it.selected)}
                              onChange={(e) => handleToggleSelectAllScanned(e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-violet-600 cursor-pointer"
                              title="Pilih / Batal Pilih Semua"
                            />
                          </th>
                          <th className="py-2 px-2 min-w-[160px]">Nama Aset / Peralatan *</th>
                          <th className="py-2 px-2 min-w-[110px]">Kategori</th>
                          <th className="py-2 px-2 min-w-[130px]">Tipe Karakteristik</th>
                          <th className="py-2 px-2 min-w-[120px] text-right">Harga (Rp) *</th>
                          <th className="py-2 px-2 min-w-[110px]">Tgl Beli</th>
                          <th className="py-2 px-2 min-w-[130px]">Kedai</th>
                          <th className="py-2 px-2 min-w-[130px]">Catatan / Toko</th>
                          <th className="py-2 px-1 text-center w-8">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {scannedItems.map((item) => (
                          <tr key={item.id} className={item.selected ? "hover:bg-slate-50/70" : "opacity-40 bg-slate-50/50"}>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(item.selected)}
                                onChange={(e) => handleUpdateScannedRow(item.id, "selected", e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-violet-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                required
                                value={item.name}
                                onChange={(e) => handleUpdateScannedRow(item.id, "name", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={item.category}
                                onChange={(e) => {
                                  const newCat = e.target.value;
                                  handleUpdateScannedRow(item.id, "category", newCat);
                                  handleUpdateScannedRow(item.id, "asset_type", newCat === "booth" ? "tidak_bergerak" : "bergerak");
                                }}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none"
                              >
                                <option value="booth">Booth / Meja</option>
                                <option value="mesin">Mesin Sealer</option>
                                <option value="peralatan">Dispenser / Alat</option>
                                <option value="pos">Tablet POS</option>
                                <option value="elektronik">Kipas / Listrik</option>
                                <option value="lainnya">Lainnya</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={item.asset_type || (item.category === "booth" ? "tidak_bergerak" : "bergerak")}
                                onChange={(e) => handleUpdateScannedRow(item.id, "asset_type", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none"
                              >
                                <option value="tidak_bergerak">🏛️ Tidak Bergerak (Stabil)</option>
                                <option value="bergerak">🚚 Bergerak (Menyusut)</option>
                              </select>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.cost}
                                onChange={(e) => handleUpdateScannedRow(item.id, "cost", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-violet-500"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="date"
                                value={item.purchase_date}
                                onChange={(e) => handleUpdateScannedRow(item.id, "purchase_date", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={item.outletId || scanDefaultOutletId}
                                onChange={(e) => handleUpdateScannedRow(item.id, "outletId", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 focus:outline-none"
                              >
                                <option value="all">Semua (Pusat)</option>
                                {data?.outlets?.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                placeholder="Toko / Ket..."
                                value={item.notes || ""}
                                onChange={(e) => handleUpdateScannedRow(item.id, "notes", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveScannedRow(item.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Hapus Baris"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Total Bar */}
                  <div className="flex items-center justify-between p-3 bg-violet-50/50 border border-violet-100 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 font-sans">
                      Total Nilai Aset Terpilih:
                    </span>
                    <span className="font-black font-mono text-base text-violet-950">
                      {formatRupiah(
                        scannedItems.reduce(
                          (acc, it) => acc + (it.selected ? Number(it.cost) || 0 : 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsScanAssetOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>

              {scannedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveBatchAssets}
                  disabled={isSavingBatch || scannedItems.filter((i) => i.selected).length === 0}
                  className="px-5 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
                >
                  {isSavingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>
                        Simpan ({scannedItems.filter((i) => i.selected).length}) Aset Terpilih ke Database
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Modal Kas Awal (Cash Dibawa)
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
                  Nominal Modal Kas Awal (Uang Cash Dibawa):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-extrabold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={cashFloatValue}
                    onChange={(e) => setCashFloatValue(Number(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Uang modal kembalian awal yang diserahkan ke kasir saat pembukaan shift kedai.
                </p>
              </div>

              {/* Rincian Real-time Estimasi Total Kas di Laci & Sinkronisasi Kas Induk Pusat */}
              {(() => {
                const currentPusatCash = centralVault?.cash_balance ?? 5000000;
                const oldInitial = cashFloatOutlet.initial_cash || 0;
                const newInitial = Number(cashFloatValue) || 0;
                const delta = newInitial - oldInitial;
                const nextPusatCash = currentPusatCash - delta;

                return (
                  <div className="space-y-2">
                    {/* Kotak Mutasi Kas Induk Pusat */}
                    <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-300 text-xs text-amber-950 space-y-1">
                      <div className="flex justify-between items-center text-[11px] text-amber-800">
                        <span>Saldo Kas Induk Pusat (Master Cash):</span>
                        <span className="font-mono font-bold">Rp {currentPusatCash.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Mutasi Kas Pusat:</span>
                        <span className={`font-mono font-bold ${delta > 0 ? "text-rose-700" : delta < 0 ? "text-emerald-700" : "text-slate-600"}`}>
                          {delta > 0 ? `- Rp ${delta.toLocaleString("id-ID")} (potong pusat)` : delta < 0 ? `+ Rp ${Math.abs(delta).toLocaleString("id-ID")} (kembali ke pusat)` : "Rp 0 (tetap)"}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-amber-200 flex justify-between items-center font-bold text-amber-950">
                        <span>Sisa Kas Induk Setelah Disimpan:</span>
                        <span className="font-mono font-black text-sm text-emerald-800">
                          Rp {Math.max(0, nextPusatCash).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    {/* Estimasi Kas di Laci Kedai */}
                    <div className="p-3 bg-teal-50/80 rounded-2xl border border-teal-200 text-xs text-teal-950 space-y-1">
                      <div className="flex justify-between items-center text-[11px] text-teal-800">
                        <span>Modal Awal Baru Kedai:</span>
                        <span className="font-mono font-bold">Rp {newInitial.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-teal-800">
                        <span>Penjualan Tunai Berjalan:</span>
                        <span className="font-mono font-bold">+ Rp {((cashFloatOutlet as any)?.todayCashIn || 0).toLocaleString("id-ID")}</span>
                      </div>
                      {((cashFloatOutlet as any)?.todayExpenseTotal || 0) > 0 && (
                        <div className="flex justify-between items-center text-[11px] text-rose-700">
                          <span>Kas Keluar:</span>
                          <span className="font-mono font-bold">- Rp {((cashFloatOutlet as any)?.todayExpenseTotal || 0).toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      <div className="pt-1 border-t border-teal-200/80 flex justify-between items-center font-bold text-teal-950">
                        <span>Estimasi Total Kas di Laci:</span>
                        <span className="font-mono font-black text-sm">
                          Rp {(
                            newInitial +
                            ((cashFloatOutlet as any)?.todayCashIn || 0) -
                            ((cashFloatOutlet as any)?.todayExpenseTotal || 0)
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  <span>⚡</span> Terhubung Otomatis ke Kas Induk & Kasir POS
                </p>
                <p className="text-[10px]">
                  Selisih penambahan/pengurangan modal kas awal ini otomatis memotong/menambah saldo Kas Induk Gudang Pusat, dan langsung terupdate di kasir POS.
                </p>
              </div>

              {cashFloatMessage && (
                <p className="text-xs font-bold text-center text-rose-600">{cashFloatMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashFloatModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={cashFloatLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  {cashFloatLoading ? "Menyimpan & Sinkron..." : "Simpan & Sinkron Kas Pusat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: KAS INDUK GUDANG PUSAT (TOP-UP / KOREKSI BRANKAS)       */}
      {/* ============================================================== */}
      {isCentralCashModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {centralCashAction === "topup" ? "Top-up Kas Induk Pusat" : "Koreksi Fisik Kas Pusat"}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold">Brankas Gudang Pusat (Master Cash)</p>
                </div>
              </div>
              <button
                onClick={() => setIsCentralCashModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl my-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setCentralCashAction("topup");
                  setCentralCashAmount(500000);
                  setCentralCashMessage(null);
                }}
                className={`py-1.5 rounded-lg transition text-center cursor-pointer ${
                  centralCashAction === "topup" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Tambah Kas (Top-up)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCentralCashAction("set");
                  setCentralCashAmount(centralVault?.cash_balance ?? 5000000);
                  setCentralCashMessage(null);
                }}
                className={`py-1.5 rounded-lg transition text-center cursor-pointer ${
                  centralCashAction === "set" ? "bg-slate-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                = Set Saldo Fisik Riil
              </button>
            </div>

            <form onSubmit={handleCentralCashSubmit} className="space-y-3.5 my-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-500">Saldo Kas Pusat Saat Ini:</span>
                <strong className="font-mono text-slate-900 font-black">
                  Rp {(centralVault?.cash_balance ?? 5000000).toLocaleString("id-ID")}
                </strong>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {centralCashAction === "topup" ? "Nominal Uang Masuk ke Pusat:" : "Nominal Saldo Fisik Riil Baru:"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-extrabold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={centralCashAmount}
                    onChange={(e) => setCentralCashAmount(Number(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick buttons */}
              {centralCashAction === "topup" && (
                <div className="grid grid-cols-4 gap-1.5">
                  {[200000, 500000, 1000000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCentralCashAmount(amt)}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        centralCashAmount === amt
                          ? "bg-emerald-600 border-emerald-700 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan / Keterangan (Opsional):</label>
                <input
                  type="text"
                  value={centralCashNotes}
                  onChange={(e) => setCentralCashNotes(e.target.value)}
                  placeholder="Cth: Setoran modal dari rekening BCA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              {centralCashMessage && (
                <p className="text-xs font-bold text-center text-rose-600">{centralCashMessage}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCentralCashModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={centralCashLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  {centralCashLoading ? "Menyimpan..." : "Simpan Kas Pusat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TERBITKAN VOUCHER PROMO MANUAL                           */}
      {/* ============================================================== */}
      {isAddVoucherModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-600" />
                Terbitkan Voucher Promo Manual
              </h3>
              <button
                onClick={() => setIsAddVoucherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kedai / Cabang Penerbit <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newVoucherForm.outletId}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, outletId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Cabang Kedai --</option>
                  {(outletsList.length > 0 ? outletsList : (data?.outlets || [])).map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Menu Hadiah Gratis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newVoucherForm.productName}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, productName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Masa Berlaku (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={newVoucherForm.expiresInDays}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, expiresInDays: Number(e.target.value) || 3 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Default 3 hari sesuai standar voucher kedai.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / Keterangan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Kompensasi pelanggan antrean panjang / Promo event"
                  value={newVoucherForm.notes}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVoucherModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={voucherActionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>{voucherActionLoading ? "Menerbitkan..." : "Terbitkan Voucher"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
