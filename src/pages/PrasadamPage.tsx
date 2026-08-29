import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Utensils,
  Plus,
  Minus,
  Check,
  Loader2,
  Lock,
  Upload,
  Receipt,
  Eye,
  Users,
  UserCheck,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Expense, PrasadamCount } from '../types';
import {
  formatRupee,
  isCutoffPassed,
  getCutoffFormattedDate,
  formatMonthName,
  getDefaultExpenseDate,
  PRASADAM_RATES,
  calculateMealsCost,
} from '../utils/calculations';
import {
  getFamilyMemberNames,
  getPrimaryFamilyMemberName,
  getPureFamilyMembers,
  getFriendMembers,
} from '../utils/devoteeHelpers';
import { compressImage } from '../utils/imageCompressor';
import { storageService } from '../services/storageService';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export const PrasadamPage: React.FC = () => {
  const {
    activeMonth,
    activeDevotee,
    loggedInMemberName,
    guestName,
    prasadamCounts,
    updateMonthlyMealCounts,
    updateFriendMonthlyCounts,
    submitExpense,
    expenses,
    communityCostPerMember,
    showToast,
    setIsLoginModalOpen,
  } = useApp();

  const isCutoff = isCutoffPassed(activeMonth);

  // Family and Friend separation
  const friendMembers = useMemo(() => (activeDevotee ? getFriendMembers(activeDevotee) : []), [activeDevotee]);
  const pureFamily = useMemo(() => (activeDevotee ? getPureFamilyMembers(activeDevotee) : []), [activeDevotee]);
  const familyMembers = useMemo(() => (activeDevotee ? getFamilyMemberNames(activeDevotee) : []), [activeDevotee]);

  // Active participant tab: 'family' or 'friend:Name'
  const [activeParticipantTab, setActiveParticipantTab] = useState<string>('family');

  // Compute existing monthly totals for family
  const familyTotals = useMemo(() => {
    if (!activeDevotee) return { b: 0, l: 0, d: 0 };
    const devoteeCounts = prasadamCounts.filter(
      (c: PrasadamCount) => c.devotee_id === activeDevotee.id && c.date.startsWith(activeMonth)
    );
    const b = devoteeCounts.reduce((sum, c) => sum + (c.breakfast_count || 0), 0);
    const l = devoteeCounts.reduce((sum, c) => sum + (c.lunch_count || 0), 0);
    const d = devoteeCounts.reduce((sum, c) => sum + (c.dinner_count || 0), 0);
    return { b, l, d };
  }, [prasadamCounts, activeDevotee, activeMonth]);

  // Selected friend object (if friend tab is active)
  const selectedFriend = useMemo(() => {
    if (!activeParticipantTab.startsWith('friend:')) return null;
    const friendName = activeParticipantTab.slice(7);
    return friendMembers.find(f => f.name.toLowerCase().trim() === friendName.toLowerCase().trim()) || null;
  }, [activeParticipantTab, friendMembers]);

  // Existing totals for selected friend
  const friendTotals = useMemo(() => {
    if (!selectedFriend) return { b: 0, l: 0, d: 0 };
    const mCounts = selectedFriend.monthly_counts?.[activeMonth];
    return {
      b: mCounts?.breakfast || 0,
      l: mCounts?.lunch || 0,
      d: mCounts?.dinner || 0,
    };
  }, [selectedFriend, activeMonth]);

  // Interactive editable state for monthly counts
  const [bCount, setBCount] = useState<number>(0);
  const [lCount, setLCount] = useState<number>(0);
  const [dCount, setDCount] = useState<number>(0);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isManualSaving, setIsManualSaving] = useState(false);

  // Track if current state change was user-initiated
  const isUserInputRef = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when activeDevotee, activeMonth, or activeParticipantTab changes
  useEffect(() => {
    isUserInputRef.current = false;
    if (activeParticipantTab.startsWith('friend:')) {
      setBCount(friendTotals.b);
      setLCount(friendTotals.l);
      setDCount(friendTotals.d);
    } else {
      setBCount(familyTotals.b);
      setLCount(familyTotals.l);
      setDCount(familyTotals.d);
    }
    setAutosaveStatus('idle');
  }, [
    activeParticipantTab,
    familyTotals.b,
    familyTotals.l,
    familyTotals.d,
    friendTotals.b,
    friendTotals.l,
    friendTotals.d,
    activeMonth,
    activeDevotee?.id,
  ]);

  // Reactive Debounced Autosave
  useEffect(() => {
    if (!isUserInputRef.current || !activeDevotee) return;

    setAutosaveStatus('saving');
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (activeParticipantTab.startsWith('friend:') && selectedFriend) {
          await updateFriendMonthlyCounts(
            activeDevotee.id,
            selectedFriend.name,
            activeMonth,
            bCount,
            lCount,
            dCount,
            { silent: true }
          );
        } else {
          await updateMonthlyMealCounts(
            activeDevotee.id,
            activeMonth,
            bCount,
            lCount,
            dCount,
            { silent: true }
          );
        }
        setAutosaveStatus('saved');
      } catch (err) {
        console.error('Autosave error:', err);
        setAutosaveStatus('idle');
      }
    }, 400);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [
    bCount,
    lCount,
    dCount,
    activeParticipantTab,
    selectedFriend,
    activeDevotee,
    activeMonth,
    updateMonthlyMealCounts,
    updateFriendMonthlyCounts,
  ]);

  // Direct manual save action
  const handleSaveCounts = async () => {
    if (!activeDevotee) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    setIsManualSaving(true);
    try {
      if (activeParticipantTab.startsWith('friend:') && selectedFriend) {
        await updateFriendMonthlyCounts(
          activeDevotee.id,
          selectedFriend.name,
          activeMonth,
          bCount,
          lCount,
          dCount,
          { silent: false }
        );
      } else {
        await updateMonthlyMealCounts(
          activeDevotee.id,
          activeMonth,
          bCount,
          lCount,
          dCount,
          { silent: false }
        );
      }
      setAutosaveStatus('saved');
    } catch (err) {
      console.error('Error saving counts:', err);
      showToast({
        type: 'error',
        title: 'Failed to Save',
        message: 'Could not save prasadam counts. Please try again.',
      });
    } finally {
      setIsManualSaving(false);
    }
  };

  // Handle direct value changes
  const handleUpdateB = (val: number) => {
    isUserInputRef.current = true;
    const clamped = Math.max(0, val);
    setBCount(clamped);
  };

  const handleUpdateL = (val: number) => {
    isUserInputRef.current = true;
    const clamped = Math.max(0, val);
    setLCount(clamped);
  };

  const handleUpdateD = (val: number) => {
    isUserInputRef.current = true;
    const clamped = Math.max(0, val);
    setDCount(clamped);
  };

  // Live calculated costs for current section
  const bCost = bCount * PRASADAM_RATES.breakfast;
  const lCost = lCount * PRASADAM_RATES.lunch;
  const dCost = dCount * PRASADAM_RATES.dinner;
  const currentTotalMeals = bCount + lCount + dCount;
  const currentMealsCost = bCost + lCost + dCost;

  const defaultGroupCost = typeof activeDevotee?.community_cost === 'number' ? activeDevotee.community_cost : communityCostPerMember;

  let currentCommunityCost = 0;
  if (selectedFriend) {
    currentCommunityCost = typeof selectedFriend.community_cost === 'number' ? selectedFriend.community_cost : defaultGroupCost;
  } else {
    if (pureFamily.length > 0) {
      currentCommunityCost = pureFamily.reduce(
        (sum, m) => sum + (typeof m.community_cost === 'number' ? m.community_cost : defaultGroupCost),
        0
      );
    } else {
      currentCommunityCost = defaultGroupCost;
    }
  }

  const currentTotalPrasadamCost = currentMealsCost + currentCommunityCost;

  // Live Grand Total Across Family & All Friends
  const familyLiveMealsCost = selectedFriend
    ? calculateMealsCost(familyTotals.b, familyTotals.l, familyTotals.d)
    : currentMealsCost;
  const familyLiveCommunityCost = pureFamily.length > 0
    ? pureFamily.reduce((sum, m) => sum + (typeof m.community_cost === 'number' ? m.community_cost : defaultGroupCost), 0)
    : defaultGroupCost;
  const familyLiveTotal = familyLiveMealsCost + familyLiveCommunityCost;

  let friendsLiveTotal = 0;
  friendMembers.forEach(f => {
    if (selectedFriend && f.name.toLowerCase().trim() === selectedFriend.name.toLowerCase().trim()) {
      friendsLiveTotal += currentTotalPrasadamCost;
    } else {
      const counts = f.monthly_counts?.[activeMonth] || { breakfast: 0, lunch: 0, dinner: 0 };
      const mCost = calculateMealsCost(counts.breakfast || 0, counts.lunch || 0, counts.dinner || 0);
      const cCost = typeof f.community_cost === 'number' ? f.community_cost : defaultGroupCost;
      friendsLiveTotal += (mCost + cCost);
    }
  });

  const grandTotalCost = familyLiveTotal + friendsLiveTotal;

  // Resolve default payer name helper (defaults single family member or logged in member)
  const getDefaultPayer = useCallback(() => {
    if (loggedInMemberName) return loggedInMemberName;
    if (activeDevotee) {
      const members = getFamilyMemberNames(activeDevotee);
      if (members.length === 1) return members[0];
    }
    if (guestName) return guestName;
    return '';
  }, [loggedInMemberName, activeDevotee, guestName]);

  // Expense form state
  const [expenseDate, setExpenseDate] = useState<string>(() => getDefaultExpenseDate(activeMonth));
  const [payerName, setPayerName] = useState<string>(() => getDefaultPayer());
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseComments, setExpenseComments] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingExpense, setIsUploadingExpense] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Sync payer name & expense date when context changes
  useEffect(() => {
    setPayerName(getDefaultPayer());
  }, [getDefaultPayer]);

  useEffect(() => {
    setExpenseDate(getDefaultExpenseDate(activeMonth));
  }, [activeMonth]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);

  // Handle Receipt photo selection
  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      showToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Attachment size exceeds the 10 MB limit. Please select a smaller file.',
      });
      e.target.value = '';
      return;
    }

    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }

    try {
      showToast({
        type: 'info',
        title: 'Optimizing Photo',
        message: 'Compressing receipt photo for fast upload...',
      });
      const compressed = await compressImage(file, { maxSizeMB: 0.19 });
      setReceiptFile(compressed);
      setReceiptPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error('Compression error', err);
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  // Handle Expense Form Submit
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDate.trim()) {
      showToast({
        type: 'warning',
        title: 'Expense Date Required',
        message: 'Please select the date of this expense.',
      });
      return;
    }

    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || !expenseTitle.trim()) return;

    const defaultPayer = getDefaultPayer() || getPrimaryFamilyMemberName(activeDevotee) || guestName || 'Devotee';
    const resolvedPayer = payerName || defaultPayer;

    setIsUploadingExpense(true);
    try {
      let billUrl: string | null = null;
      if (receiptFile) {
        billUrl = await storageService.uploadReceipt(receiptFile);
      }

      await submitExpense({
        devotee_id: activeDevotee?.id || null,
        guest_name: activeDevotee ? null : guestName || 'Guest',
        date: expenseDate,
        type: 'REGULAR',
        payer_name: resolvedPayer,
        title: expenseTitle.trim(),
        amount: amountNum,
        comments: expenseComments.trim() || null,
        bill_url: billUrl,
        status: 'APPROVED',
        cycle_month: expenseDate ? expenseDate.slice(0, 7) : activeMonth,
      });

      // Reset form & revoke preview URL
      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseComments('');
      setReceiptFile(null);
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
      setReceiptPreview(null);
      setExpenseDate(getDefaultExpenseDate(activeMonth));
      setPayerName(getDefaultPayer());
    } finally {
      setIsUploadingExpense(false);
    }
  };

  // Filter regular expenses for this devotee/guest
  const regularExpenses: Expense[] = expenses.filter(
    (e: Expense) =>
      (activeDevotee ? e.devotee_id === activeDevotee.id : (guestName ? e.guest_name === guestName : true)) &&
      (e.cycle_month === activeMonth || (e.date && e.date.startsWith(activeMonth))) &&
      e.type === 'REGULAR'
  );

  // If not logged in
  if (!activeDevotee && !guestName) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Devotee Identification Required
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Please log in with your mobile number to view and manage monthly prasadam counts.
        </p>
        <Button onClick={() => setIsLoginModalOpen(true)} variant="saffron" className="mt-6">
          Login / Identify
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* 1. DIRECT EDITABLE MONTHLY PRASADAM MEAL & COST SUMMARY CARD */}
      <Card className="overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] via-white dark:via-slate-900 to-orange-500/[0.04] shadow-md">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {formatMonthName(activeMonth)} Prasadam Counts
                  </h2>
                  <Badge variant="saffron" size="sm">Direct Input</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter monthly Breakfast, Lunch, and Dinner counts. You can save counts anytime or let them autosave.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {autosaveStatus === 'saving' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Autosaving...</span>
                </span>
              ) : autosaveStatus === 'saved' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                  <span>Saved ✓</span>
                </span>
              ) : null}

              {isCutoff ? (
                <Badge variant="danger" size="sm">
                  <Lock className="w-3 h-3" />
                  <span>Closed: {getCutoffFormattedDate(activeMonth)}</span>
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  <span>Entry Open</span>
                </Badge>
              )}

              <Button
                type="button"
                variant="saffron"
                size="sm"
                isLoading={isManualSaving}
                onClick={handleSaveCounts}
                className="font-bold shadow-xs hover:shadow-md"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Participant Tab Switcher (Family vs Friend) */}
          {friendMembers.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveParticipantTab('family')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  activeParticipantTab === 'family'
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Family Counts ({pureFamily.length || 1} {pureFamily.length === 1 ? 'member' : 'members'})</span>
              </button>

              {friendMembers.map(friend => {
                const tabKey = `friend:${friend.name}`;
                const isCurrent = activeParticipantTab === tabKey;
                return (
                  <button
                    key={friend.name}
                    type="button"
                    onClick={() => setActiveParticipantTab(tabKey)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Friend: {friend.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Participant Banner */}
          {selectedFriend && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Filling separate meal count for Friend: <strong>{selectedFriend.name}</strong>
              </span>
              <span className="font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Community Cost: ₹{currentCommunityCost}
              </span>
            </div>
          )}

          {/* 3 Interactive Slot Input Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {/* 1. Breakfast Slot */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-bold mb-1">
                  <span>Total Breakfasts</span>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                    ₹40 / plate
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-3">
                  <button
                    type="button"
                    disabled={bCount <= 0}
                    onClick={() => handleUpdateB(bCount - 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors shadow-xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={bCount === 0 ? '' : bCount}
                      placeholder="0"
                      onChange={e => handleUpdateB(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-3xl font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">plates this month</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateB(bCount + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center hover:bg-amber-400 transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Breakfast Cost:</span>
                <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400 font-mono">
                  {formatRupee(bCost)}
                </span>
              </div>
            </div>

            {/* 2. Lunch Slot */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-bold mb-1">
                  <span>Total Lunches</span>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                    ₹80 / plate
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-3">
                  <button
                    type="button"
                    disabled={lCount <= 0}
                    onClick={() => handleUpdateL(lCount - 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors shadow-xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={lCount === 0 ? '' : lCount}
                      placeholder="0"
                      onChange={e => handleUpdateL(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-3xl font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">plates this month</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateL(lCount + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center hover:bg-amber-400 transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Lunch Cost:</span>
                <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400 font-mono">
                  {formatRupee(lCost)}
                </span>
              </div>
            </div>

            {/* 3. Dinner Slot */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-bold mb-1">
                  <span>Total Dinners</span>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                    ₹40 / plate
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-3">
                  <button
                    type="button"
                    disabled={dCount <= 0}
                    onClick={() => handleUpdateD(dCount - 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors shadow-xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={dCount === 0 ? '' : dCount}
                      placeholder="0"
                      onChange={e => handleUpdateD(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-3xl font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">plates this month</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateD(dCount + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center hover:bg-amber-400 transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Dinner Cost:</span>
                <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400 font-mono">
                  {formatRupee(dCost)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total Bar with Manual Save Button & Real-time status */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                {selectedFriend ? `Friend: ${selectedFriend.name}` : 'Family Prasadam'}
              </span>
              <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                {currentTotalMeals} meals
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
              {formatRupee(currentTotalPrasadamCost)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Meals {formatRupee(currentMealsCost)}</span>
              <span>+</span>
              <span>Community Cost {formatRupee(currentCommunityCost)}</span>
              <span>=</span>
              <strong className="text-amber-700 dark:text-amber-300 font-bold">{formatRupee(currentTotalPrasadamCost)}</strong>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-700">
            {friendMembers.length > 0 && (
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Grand Total (Family + All Friends)
                </div>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                  {formatRupee(grandTotalCost)}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {autosaveStatus === 'saving' ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </span>
                ) : autosaveStatus === 'saved' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> Autosaved
                  </span>
                ) : null}
              </div>

              <Button
                type="button"
                variant="saffron"
                size="md"
                isLoading={isManualSaving}
                onClick={handleSaveCounts}
                className="font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4 mr-1.5" />
                <span>Save {selectedFriend ? `${selectedFriend.name}'s Counts` : 'Prasadam Counts'}</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. REGULAR EXPENSE SUBMISSION FORM */}
      <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Log Regular Seva Expense
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit grocery, vegetable, or kitchen purchases to offset your monthly prasadam bill (Max 10 MB per bill).
            </p>
          </div>
        </div>

        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Expense Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              />
            </div>

            {/* Who made expense */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Who Made the Expense?
              </label>
              {activeDevotee ? (
                <select
                  value={payerName || (familyMembers.length === 1 ? familyMembers[0] : '')}
                  onChange={e => setPayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {familyMembers.length > 1 && <option value="">Select Member</option>}
                  {familyMembers.map((member: string) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={payerName}
                  placeholder={guestName || 'Your Name'}
                  onChange={e => setPayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              )}
            </div>

            {/* Title / Item */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Expense Title / Item *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vegetables from Mandi"
                value={expenseTitle}
                onChange={e => setExpenseTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Cost Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Cost Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 1450"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Comments */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Comments / Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Add purchase details, quantity, or shop name..."
                value={expenseComments}
                onChange={e => setExpenseComments(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>

            {/* Bill Upload with 10 MB Limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Bill / Receipt Photo (Max 10 MB, Auto-compressed)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-amber-500 dark:hover:border-amber-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {receiptFile ? receiptFile.name : 'Choose receipt photo'}
                  </span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP up to 10 MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    className="hidden"
                  />
                </label>
                {receiptPreview && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                    <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="saffron"
              size="md"
              isLoading={isUploadingExpense}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Submit Regular Expense</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. SUBMITTED REGULAR EXPENSES LIST */}
      <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Submitted Expenses ({regularExpenses.length})
          </h3>
          <span className="text-xs text-slate-400">
            Total Approved: {formatRupee(regularExpenses.filter((e: Expense) => e.status === 'APPROVED').reduce((sum: number, e: Expense) => sum + Number(e.amount), 0))}
          </span>
        </div>

        {regularExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Item Title</th>
                  <th className="py-2.5 px-3">Payer</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Receipt</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {regularExpenses.map((exp: Expense) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {exp.date || exp.created_at.slice(0, 10)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {exp.title}
                      </div>
                      {exp.comments && (
                        <div className="text-[11px] text-slate-400">{exp.comments}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {exp.payer_name}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatRupee(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {exp.bill_url ? (
                        <button
                          onClick={() => setViewingReceiptUrl(exp.bill_url!)}
                          className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {exp.status === 'APPROVED' ? (
                        <Badge variant="success" size="sm">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm" title={exp.rejection_reason || 'Rejected'}>
                          Rejected
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">
            No regular expenses logged for this month.
          </div>
        )}
      </Card>

      {/* Receipt Viewer Modal */}
      <Modal
        isOpen={Boolean(viewingReceiptUrl)}
        onClose={() => setViewingReceiptUrl(null)}
        title="Expense Receipt"
        maxWidth="lg"
      >
        {viewingReceiptUrl && (
          <div className="flex justify-center p-2">
            <img
              src={viewingReceiptUrl}
              alt="Receipt Full View"
              className="max-h-[70vh] rounded-xl object-contain shadow-md"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
