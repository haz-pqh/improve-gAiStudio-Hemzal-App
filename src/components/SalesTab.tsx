import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  AlertOctagon,
  Sparkles,
  RotateCcw,
  Send,
  Calculator,
  Store,
  Calendar,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PRICING, FLAVOR_ITEMS, DEFAULT_BRANCHES } from '../lib/constants';
import { Branch, FlavorInventoryItem, SalesReportPayload, AttendanceLog } from '../types';
import confetti from 'canvas-confetti';

export const SalesTab: React.FC = () => {
  const { userEmail, userName, staffProfile } = useAuth();
  const { showToast } = useToast();

  const todayISO = new Date().toISOString().split('T')[0];

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);

  // Attendance status check for today
  const [isAbsentToday, setIsAbsentToday] = useState(false);

  // Form states
  const [cawangan, setCawangan] = useState('');
  const [salesDate, setSalesDate] = useState(todayISO);
  const [jumlahBag, setJumlahBag] = useState('');
  const [pettyCash, setPettyCash] = useState('');
  const [salesCash, setSalesCash] = useState('');

  // Platforms
  const [misi, setMisi] = useState('');
  const [lalamove, setLalamove] = useState('');
  const [foodPanda, setFoodPanda] = useState('');
  const [grabFood, setGrabFood] = useState('');
  const [shopeeFood, setShopeeFood] = useState('');

  // Expenses
  const [gas, setGas] = useState('');
  const [ais, setAis] = useState('');
  const [beliBarang, setBeliBarang] = useState('');
  const [minyakKenderaan, setMinyakKenderaan] = useState('');
  const [dobi, setDobi] = useState('');
  const [minyakMasak, setMinyakMasak] = useState('');
  const [staffMeal, setStaffMeal] = useState('');

  // Wastage & QC
  const [wasteAyamTakHabis, setWasteAyamTakHabis] = useState('');
  const [wasteAyamBusuk, setWasteAyamBusuk] = useState('');
  const [wasteAyamShort, setWasteAyamShort] = useState('');
  const [qReview, setQReview] = useState('');
  const [qLoyalKad, setQLoyalKad] = useState('');
  const [qPromo10Pcs, setQPromo10Pcs] = useState('');
  const [catatan, setCatatan] = useState('');

  // Flavor Inventory Tracker
  const [inventory, setInventory] = useState<Record<string, FlavorInventoryItem>>(() => {
    const initial: Record<string, FlavorInventoryItem> = {};
    FLAVOR_ITEMS.forEach((f) => {
      initial[f] = { prevStock: 0, newStock: 0, sold: 0, promoFree: 0, balance: 0 };
    });
    return initial;
  });

  const [submitting, setSubmitting] = useState(false);

  // Listen to branches
  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'branches'), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: Branch[] = Object.keys(val)
          .map((k) => ({ key: k, ...val[k] }))
          .filter((b) => (b.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
        setBranches(list);
        if (list.length > 0 && !cawangan) {
          setCawangan(list[0].name);
        }
      } else {
        setBranches(DEFAULT_BRANCHES);
        if (!cawangan) setCawangan(DEFAULT_BRANCHES[0].name);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check if staff is marked absent today
  useEffect(() => {
    if (!userEmail) return;

    const unsubscribe = onValue(ref(db, 'attendance_logs'), (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      const list: AttendanceLog[] = Object.values(data);
      const match = list.find(
        (l) =>
          (l.userEmail || '').toLowerCase() === userEmail.toLowerCase() &&
          l.date === todayISO &&
          (l.punctualityStatus === 'ABSENT' || l.statusColor === 'red')
      );
      setIsAbsentToday(Boolean(match));
    });

    return () => unsubscribe();
  }, [userEmail, todayISO]);

  // Inventory update helper
  const handleInventoryChange = (item: string, field: keyof FlavorInventoryItem, value: number) => {
    setInventory((prev) => {
      const current = { ...prev[item], [field]: isNaN(value) ? 0 : value };

      // Calculate sold
      let calculatedSold = 0;
      if (item.toLowerCase() === 'coleslaw') {
        calculatedSold = current.newStock - current.balance;
      } else {
        calculatedSold = current.prevStock + current.newStock - (current.promoFree + current.balance);
      }
      current.sold = calculatedSold;

      return {
        ...prev,
        [item]: current,
      };
    });
  };

  // Grand Total Calculation
  const grandTotal = useMemo(() => {
    // 1. Chicken revenue (Bags * 20 pcs * RM4.50)
    const bagNum = parseFloat(jumlahBag.match(/\d+/)?.[0] || '0');
    const chickenSales = bagNum * PRICING.BAG_PCS * PRICING.AYAM_PER_PC;

    // 2. Platforms
    const pMisi = parseFloat(misi) || 0;
    const pLala = parseFloat(lalamove) || 0;
    const pFpRaw = parseFloat(foodPanda.match(/[\d.]+/)?.[0] || '0');
    const pGrab = parseFloat(grabFood) || 0;
    const pShopee = parseFloat(shopeeFood) || 0;
    const platformSum = pMisi + pLala + pFpRaw + pGrab + pShopee;

    // 3. Expenses
    const eGas = parseFloat(gas) || 0;
    const eAis = parseFloat(ais) || 0;
    const eBeli = parseFloat(beliBarang) || 0;
    const eMinyakK = parseFloat(minyakKenderaan) || 0;
    const eDobi = parseFloat(dobi) || 0;
    const eMinyakMasakPacks = parseFloat(minyakMasak) || 0;
    const eMinyakMasak = eMinyakMasakPacks * PRICING.MINYAK_MASAK_PACK;

    // Staff meal (2 pcs chicken per staff = RM9.00)
    const staffMatches = (staffMeal.match(/\d+/g) || []).length;
    const eStaffMeal = staffMatches * (2 * PRICING.AYAM_PER_PC);

    // Wastage & Quality deductions (pcs * RM4.50)
    const wUnsold = parseFloat(wasteAyamTakHabis) || 0;
    const wRotten = parseFloat(wasteAyamBusuk) || 0;
    const wShort = parseFloat(wasteAyamShort) || 0;
    const wReview = parseFloat(qReview) || 0;
    const lossDeductions = (wUnsold + wRotten + wShort + wReview) * PRICING.AYAM_PER_PC;

    const wLoyalKad = parseFloat(qLoyalKad) || 0;

    const totalExpenses =
      eGas + eAis + eBeli + eMinyakK + eDobi + eMinyakMasak + eStaffMeal + lossDeductions + wLoyalKad;

    // 4. Flavor inventory sales
    // CKG Total (Cheese, Korean, Garlic @ RM2.00)
    const ckgSold = (inventory['Cheese']?.sold || 0) + (inventory['Korean']?.sold || 0) + (inventory['Garlic']?.sold || 0);
    const ckgSales = ckgSold * PRICING.CKG_CUP;

    // TF Total (Furikake, Togarashi @ RM3.00)
    const tfSold = (inventory['Furikake']?.sold || 0) + (inventory['Togarashi']?.sold || 0);
    const tfSales = tfSold * PRICING.TF_CUP;

    // Coleslaw Combo (RM6.50 per 2 cups + RM3.50 single)
    const coleslawSold = inventory['Coleslaw']?.sold || 0;
    const coleslawPairs = Math.floor(coleslawSold / 2);
    const coleslawSingles = coleslawSold % 2;
    const coleslawSales = coleslawPairs * PRICING.COLESLAW_PAIR + coleslawSingles * PRICING.COLESLAW_SINGLE;

    // 5. Promo Sales (10 Pcs @ RM53.90)
    const promoCount = parseFloat(qPromo10Pcs) || 0;
    const promoSales = promoCount * PRICING.PROMO_10PCS;

    const netTotal = chickenSales + platformSum - totalExpenses + ckgSales + tfSales + coleslawSales + promoSales;

    return netTotal;
  }, [
    jumlahBag,
    misi,
    lalamove,
    foodPanda,
    grabFood,
    shopeeFood,
    gas,
    ais,
    beliBarang,
    minyakKenderaan,
    dobi,
    minyakMasak,
    staffMeal,
    wasteAyamTakHabis,
    wasteAyamBusuk,
    wasteAyamShort,
    qReview,
    qLoyalKad,
    qPromo10Pcs,
    inventory,
  ]);

  // Reset form
  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset all fields in the daily report?')) return;
    setJumlahBag('');
    setPettyCash('');
    setSalesCash('');
    setMisi('');
    setLalamove('');
    setFoodPanda('');
    setGrabFood('');
    setShopeeFood('');
    setGas('');
    setAis('');
    setBeliBarang('');
    setMinyakKenderaan('');
    setDobi('');
    setMinyakMasak('');
    setStaffMeal('');
    setWasteAyamTakHabis('');
    setWasteAyamBusuk('');
    setWasteAyamShort('');
    setQReview('');
    setQLoyalKad('');
    setQPromo10Pcs('');
    setCatatan('');

    const resetInv: Record<string, FlavorInventoryItem> = {};
    FLAVOR_ITEMS.forEach((f) => {
      resetInv[f] = { prevStock: 0, newStock: 0, sold: 0, promoFree: 0, balance: 0 };
    });
    setInventory(resetInv);
    showToast('Daily sales report fields reset.', 'info');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAbsentToday) {
      showToast('Access Denied: You are marked ABSENT today and cannot submit daily sales reports.', 'error');
      return;
    }

    if (!cawangan) {
      showToast('Please select a branch (Cawangan).', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload: SalesReportPayload = {
        submittedBy: staffProfile?.name || userName,
        userEmail: userEmail.toLowerCase(),
        timestamp: serverTimestamp(),
        totalDailySales: grandTotal,
        cawangan,
        date: salesDate,
        jumlahBag,
        pettyCash: parseFloat(pettyCash) || 0,
        salesCash: parseFloat(salesCash) || 0,
        platforms: {
          misi: parseFloat(misi) || 0,
          lalamove: parseFloat(lalamove) || 0,
          foodPanda: foodPanda.trim(),
          grabFood: parseFloat(grabFood) || 0,
          shopeeFood: parseFloat(shopeeFood) || 0,
        },
        expenses: {
          gas: parseFloat(gas) || 0,
          ais: parseFloat(ais) || 0,
          beliBarang: parseFloat(beliBarang) || 0,
          minyakKenderaan: parseFloat(minyakKenderaan) || 0,
          dobi: parseFloat(dobi) || 0,
          minyakMasak: minyakMasak.trim(),
          staffMeal: staffMeal.trim(),
        },
        qualityAndWastage: {
          ayamTakHabis: wasteAyamTakHabis.trim(),
          ayamBusuk: wasteAyamBusuk.trim(),
          ayamShort: wasteAyamShort.trim(),
          review: qReview.trim(),
          loyalKad: qLoyalKad.trim(),
          promo10Pcs: qPromo10Pcs.trim(),
        },
        catatan: catatan.trim(),
        inventoryTracker: inventory,
      };

      await push(ref(db, 'sales_updates'), payload);

      try {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
      } catch {}

      showToast(`Daily Sales Report (RM ${grandTotal.toFixed(2)}) submitted successfully!`, 'success', 'Report Filed');
      handleReset();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit sales report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* 1. ABSENT WARNING BANNER IF MARKED ABSENT */}
      {isAbsentToday && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-3 shadow-lg"
        >
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <strong className="font-semibold block text-sm">Submission Disabled: Staff Marked Absent</strong>
            <span>
              You have been flagged as absent for today's shift. Submissions are locked until admin review.
            </span>
          </div>
        </motion.div>
      )}

      {/* 2. REAL-TIME FLOATING GRAND TOTAL HUD CARD */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                Live Calculation Engine
              </span>
              <h3 className="text-base font-semibold text-white">Estimated Grand Total Daily Sales</h3>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-3xl sm:text-4xl font-bold text-green-400">
              RM {grandTotal.toFixed(2)}
            </div>
            <span className="text-xs text-slate-400">
              Includes Platforms & Inventory Sold
            </span>
          </div>
        </div>
      </motion.div>

      {/* 3. MAIN 5-SECTION REPORT FORM */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl space-y-8"
      >
        {/* Form Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Daily Sales & Inventory Report</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fill all operational figures, cash receipts, and inventory records
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Form</span>
          </button>
        </div>

        {/* SECTION 1: General Info & Cash */}
        <div>
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Store className="w-3.5 h-3.5" />
            <span>1. General Information & Cash</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Cawangan (Branch)</label>
              <select
                value={cawangan}
                onChange={(e) => setCawangan(e.target.value)}
                required
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="" disabled>
                  Select Branch
                </option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Tarikh (Date)</label>
              <input
                type="date"
                value={salesDate}
                onChange={(e) => setSalesDate(e.target.value)}
                required
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Jumlah Bag & Catatan Bag
              </label>
              <input
                type="text"
                value={jumlahBag}
                onChange={(e) => setJumlahBag(e.target.value)}
                placeholder="e.g. 10 bag (8 bag bawa balik)"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Petty Cash (RM)</label>
              <input
                type="number"
                step="0.01"
                value={pettyCash}
                onChange={(e) => setPettyCash(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Sales Cash (RM)</label>
              <input
                type="number"
                step="0.01"
                value={salesCash}
                onChange={(e) => setSalesCash(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Platform Revenue */}
        <div className="pt-2 border-t border-slate-700">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>2. Platform Revenue (+ Sales)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Misi (RM)</label>
              <input
                type="number"
                step="0.01"
                value={misi}
                onChange={(e) => setMisi(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Lalamove (RM)</label>
              <input
                type="number"
                step="0.01"
                value={lalamove}
                onChange={(e) => setLalamove(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">FoodPanda (RM & Qty)</label>
              <input
                type="text"
                value={foodPanda}
                onChange={(e) => setFoodPanda(e.target.value)}
                placeholder="e.g. 178.75 (4)"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">GrabFood (RM)</label>
              <input
                type="number"
                step="0.01"
                value={grabFood}
                onChange={(e) => setGrabFood(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Shopee Food (RM)</label>
              <input
                type="number"
                step="0.01"
                value={shopeeFood}
                onChange={(e) => setShopeeFood(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Operational Expenses */}
        <div className="pt-2 border-t border-slate-700">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>3. Operational Expenses (- Deductions)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Gas (RM)</label>
              <input
                type="number"
                step="0.01"
                value={gas}
                onChange={(e) => setGas(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Ais (RM)</label>
              <input
                type="number"
                step="0.01"
                value={ais}
                onChange={(e) => setAis(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Beli Barang (RM)</label>
              <input
                type="number"
                step="0.01"
                value={beliBarang}
                onChange={(e) => setBeliBarang(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Minyak Kenderaan (RM)
              </label>
              <input
                type="number"
                step="0.01"
                value={minyakKenderaan}
                onChange={(e) => setMinyakKenderaan(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Dobi (RM)</label>
              <input
                type="number"
                step="0.01"
                value={dobi}
                onChange={(e) => setDobi(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder:text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Minyak Masak (Packs @ RM5.00)
              </label>
              <input
                type="text"
                value={minyakMasak}
                onChange={(e) => setMinyakMasak(e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Staff Meal (List crew names & numbers — 2 pcs/staff @ RM4.50 deduction)
            </label>
            <textarea
              rows={2}
              value={staffMeal}
              onChange={(e) => setStaffMeal(e.target.value)}
              placeholder="1. ARIL - 2&#10;2. HAZPIQAH - 2"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 resize-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* SECTION 4: Wastage & QC */}
        <div className="pt-2 border-t border-slate-700">
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>4. Wastage, Quality & Promos</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Ayam Tak Habis (Pcs)
              </label>
              <input
                type="text"
                value={wasteAyamTakHabis}
                onChange={(e) => setWasteAyamTakHabis(e.target.value)}
                placeholder="e.g. 24"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Ayam Busuk (Pcs)</label>
              <input
                type="text"
                value={wasteAyamBusuk}
                onChange={(e) => setWasteAyamBusuk(e.target.value)}
                placeholder="Qty / Details"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Ayam Short (Pcs)</label>
              <input
                type="text"
                value={wasteAyamShort}
                onChange={(e) => setWasteAyamShort(e.target.value)}
                placeholder="Qty / Details"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Review (Pcs)</label>
              <input
                type="text"
                value={qReview}
                onChange={(e) => setQReview(e.target.value)}
                placeholder="Customer review pcs"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Loyal Kad (RM)</label>
              <input
                type="text"
                value={qLoyalKad}
                onChange={(e) => setQLoyalKad(e.target.value)}
                placeholder="Redemptions deduction"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Promo 10 Pcs Ayam (Qty @ RM53.90)
              </label>
              <input
                type="text"
                value={qPromo10Pcs}
                onChange={(e) => setQPromo10Pcs(e.target.value)}
                placeholder="e.g. 1"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs text-slate-400 mb-1 font-medium">Catatan / Remarks</label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Additional operational remarks or kitchen notes..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* SECTION 5: Flavor Inventory Tracker */}
        <div className="pt-2 border-t border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>5. Flavor & Item Inventory Tracker</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Auto calculates Sold & Pricing
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-700 rounded-xl bg-slate-900/60 shadow-inner">
            <table className="w-full text-left text-xs text-slate-300 min-w-[540px]">
              <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase border-b border-slate-700">
                <tr>
                  <th className="p-3 font-semibold">Item / Flavor</th>
                  <th className="p-3 font-semibold text-center w-20">Prev</th>
                  <th className="p-3 font-semibold text-center w-20">New</th>
                  <th className="p-3 font-semibold text-center w-20">Sold</th>
                  <th className="p-3 font-semibold text-center w-20">Free</th>
                  <th className="p-3 font-semibold text-center w-20">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-mono">
                {FLAVOR_ITEMS.map((item) => {
                  const isColeslaw = item.toLowerCase() === 'coleslaw';
                  const row = inventory[item] || {
                    prevStock: 0,
                    newStock: 0,
                    sold: 0,
                    promoFree: 0,
                    balance: 0,
                  };

                  return (
                    <tr key={item} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-sans font-medium text-slate-200">{item}</td>

                      {/* Prev Stock */}
                      <td className="p-2">
                        <input
                          type="number"
                          disabled={isColeslaw}
                          value={isColeslaw ? '' : row.prevStock || ''}
                          onChange={(e) =>
                            handleInventoryChange(item, 'prevStock', parseFloat(e.target.value))
                          }
                          placeholder="0"
                          className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-white focus:outline-none focus:border-green-500 ${
                            isColeslaw ? 'opacity-30 cursor-not-allowed bg-slate-950' : ''
                          }`}
                        />
                      </td>

                      {/* New Stock */}
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.newStock || ''}
                          onChange={(e) =>
                            handleInventoryChange(item, 'newStock', parseFloat(e.target.value))
                          }
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-white focus:outline-none focus:border-green-500"
                        />
                      </td>

                      {/* Sold (Auto calculated) */}
                      <td className="p-2">
                        <div className="w-full bg-green-500/10 border border-green-500/20 rounded-lg p-1.5 text-center text-xs font-semibold text-green-400">
                          {row.sold}
                        </div>
                      </td>

                      {/* Promo Free */}
                      <td className="p-2">
                        <input
                          type="number"
                          disabled={isColeslaw}
                          value={isColeslaw ? '' : row.promoFree || ''}
                          onChange={(e) =>
                            handleInventoryChange(item, 'promoFree', parseFloat(e.target.value))
                          }
                          placeholder="0"
                          className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-white focus:outline-none focus:border-green-500 ${
                            isColeslaw ? 'opacity-30 cursor-not-allowed bg-slate-950' : ''
                          }`}
                        />
                      </td>

                      {/* Balance */}
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.balance || ''}
                          onChange={(e) =>
                            handleInventoryChange(item, 'balance', parseFloat(e.target.value))
                          }
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-white focus:outline-none focus:border-green-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-slate-700 flex items-center justify-end space-x-3">
          <button
            type="submit"
            disabled={submitting || isAbsentToday}
            className={`px-8 py-3 rounded-xl font-medium text-xs transition-all shadow-lg flex items-center space-x-2 cursor-pointer ${
              isAbsentToday
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-95'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting
                ? 'Submitting Report...'
                : isAbsentToday
                ? 'Locked (Marked Absent)'
                : 'Submit Daily Report'}
            </span>
          </button>
        </div>
      </motion.form>
    </div>
  );
};
