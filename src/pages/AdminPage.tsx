import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  FileText,
  IndianRupee,
  Send,
  Download,
  Settings,
  Edit,
  CheckCircle2,
  Lock,
  RefreshCw,
  Plus,
  Search,
  MessageSquare,
  Key,
  Database,
  Eye,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Devotee, DevoteeMonthlySummary, Expense, PrasadamCount, FamilyMember } from '../types';
import {
  formatRupee,
  formatMonthName,
  calculateMealsCost,
  getAllDatesInMonth,
  getCutoffFormattedDate,
  formatDevoteeName,
} from '../utils/calculations';
import {
  normalizeFamilyMembers,
  getFamilyMemberNames,
  getAllDevoteePhones,
  formatDevoteeFamilyDisplay,
  cleanPhoneNumber,
} from '../utils/devoteeHelpers';
import { exportToExcel, exportToPDF } from '../utils/exportHelpers';

type AdminTab = 'matrix' | 'expenses' | 'settlement' | 'whatsapp' | 'devotees' | 'settings';

export const AdminPage: React.FC = () => {
  const {
    activeMonth,
    allDevoteeSummaries,
    devotees,
    expenses,
    prasadamCounts,
    isAdmin,
    setIsAdminPinModalOpen,
    logoutAdmin,
    selectDevoteeAndRedirect,
    reviewExpense,
    adminVerifySettlement,
    carryOverBalances,
    autoFillCounts,
    updatePrasadamCount,
    saveDevotee,
    adminPin,
    updateAdminPin,
    communityCostPerMember,
    updateCommunityCostPerMember,
    resetDatabase,
    showToast,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('matrix');
  const [searchTerm, setSearchTerm] = useState('');

  // Devotee Matrix Drawer / Inline Matrix Modal
  const [selectedDevoteeForEdit, setSelectedDevoteeForEdit] = useState<Devotee | null>(null);

  // Expense Rejection Modal
  const [rejectingExpense, setRejectingExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Direct Settle Modal
  const [settlingDevotee, setSettlingDevotee] = useState<DevoteeMonthlySummary | null>(null);
  const [directSettleAmount, setDirectSettleAmount] = useState('');
  const [directSettleDate, setDirectSettleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [directSettleNotes, setDirectSettleNotes] = useState('');

  // Devotee Edit/Create Modal
  const [isDevoteeModalOpen, setIsDevoteeModalOpen] = useState(false);
  const [editingDevotee, setEditingDevotee] = useState<Devotee | null>(null);
  const [devoteeGroupName, setDevoteeGroupName] = useState('');
  const [devoteePhone, setDevoteePhone] = useState('');
  const [familyRows, setFamilyRows] = useState<{ name: string; phone_number: string }[]>([
    { name: '', phone_number: '' },
  ]);

  // PIN change state
  const [newPinInput, setNewPinInput] = useState('');

  // Community Cost setting state
  const [communityCostInput, setCommunityCostInput] = useState(communityCostPerMember.toString());

  React.useEffect(() => {
    setCommunityCostInput(communityCostPerMember.toString());
  }, [communityCostPerMember]);

  const handleUpdateCommunityCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(communityCostInput);
    if (isNaN(val) || val < 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid positive number for Community Cost.',
      });
      return;
    }
    await updateCommunityCostPerMember(val);
  };

  // Filter summaries based on search (matches group name, primary phone, member names, and member phones)
  const filteredSummaries = useMemo(() => {
    return allDevoteeSummaries.filter(s => {
      const q = searchTerm.toLowerCase();
      const familyNames = getFamilyMemberNames(s.devotee);
      const allPhones = getAllDevoteePhones(s.devotee);
      return (
        s.devotee.group_name.toLowerCase().includes(q) ||
        s.devotee.phone_number.includes(q) ||
        allPhones.some(p => p.includes(q)) ||
        familyNames.some(m => m.toLowerCase().includes(q))
      );
    });
  }, [allDevoteeSummaries, searchTerm]);

  // Overall totals across community
  const totalPrasadamCost = useMemo(() => {
    return allDevoteeSummaries.reduce((sum, s) => sum + s.prasadam_cost, 0);
  }, [allDevoteeSummaries]);

  const totalApprovedExpenses = useMemo(() => {
    return allDevoteeSummaries.reduce((sum, s) => sum + s.approved_expenses, 0);
  }, [allDevoteeSummaries]);

  const totalPendingReceivable = useMemo(() => {
    return allDevoteeSummaries.filter(s => s.final_balance > 0).reduce((sum, s) => sum + s.final_balance, 0);
  }, [allDevoteeSummaries]);

  const totalPendingPayable = useMemo(() => {
    return allDevoteeSummaries.filter(s => s.final_balance < 0).reduce((sum, s) => sum + Math.abs(s.final_balance), 0);
  }, [allDevoteeSummaries]);

  // Pending settlements
  const pendingSettlementSummaries = useMemo(() => {
    return allDevoteeSummaries.filter(s => s.settlement_status === 'PENDING_VERIFICATION');
  }, [allDevoteeSummaries]);

  // If not authenticated as admin
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center p-3 mb-4 text-amber-600 dark:text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Admin Authorization Required
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Enter the 6-digit administrative security PIN (Default: <code className="bg-amber-500/15 px-1.5 py-0.5 rounded font-mono font-bold text-amber-600 dark:text-amber-400">192108</code>) to access master matrix, settlement approvals, and exporter tools.
        </p>
        <Button
          onClick={() => setIsAdminPinModalOpen(true)}
          variant="saffron"
          className="mt-6 w-full"
        >
          <span>Unlock Admin Center</span>
        </Button>
      </div>
    );
  }

  // Handle batch auto-fill for all devotees
  const handleTriggerAutoFillAll = async () => {
    if (!confirm(`Are you sure you want to auto-fill missing meal counts for all devotees for ${formatMonthName(activeMonth)}?`)) return;
    await autoFillCounts();
  };

  // Handle Carry-Over Balances to next month
  const handleCarryOverToNextMonth = async () => {
    const [yearStr, monthStr] = activeMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const nextMonth = `${year}-${month.toString().padStart(2, '0')}`;

    if (!confirm(`Roll forward current balances for ${allDevoteeSummaries.length} devotees into ${formatMonthName(nextMonth)}?`)) return;
    await carryOverBalances(nextMonth);
  };

  // Handle Reject Expense
  const handleConfirmRejection = async () => {
    if (!rejectingExpense) return;
    await reviewExpense(rejectingExpense.id, 'REJECTED', rejectionReason);
    setRejectingExpense(null);
    setRejectionReason('');
  };

  // Handle Direct Settle Submit
  const handleDirectSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingDevotee) return;
    const amountNum = parseFloat(directSettleAmount);
    if (isNaN(amountNum)) return;

    await adminVerifySettlement(
      settlingDevotee.devotee.id,
      amountNum,
      directSettleDate,
      directSettleNotes || 'Manually Settled by Admin'
    );

    setSettlingDevotee(null);
    setDirectSettleAmount('');
    setDirectSettleNotes('');
  };

  // Open Devotee Create/Edit
  const handleOpenDevoteeModal = (devotee?: Devotee) => {
    if (devotee) {
      setEditingDevotee(devotee);
      setDevoteeGroupName(devotee.group_name);
      setDevoteePhone(devotee.phone_number);
      const normalized = normalizeFamilyMembers(devotee);
      setFamilyRows(
        normalized.length > 0
          ? normalized.map(m => ({ name: m.name, phone_number: m.phone_number || '' }))
          : [{ name: devotee.group_name, phone_number: devotee.phone_number }]
      );
    } else {
      setEditingDevotee(null);
      setDevoteeGroupName('');
      setDevoteePhone('');
      setFamilyRows([{ name: '', phone_number: '' }]);
    }
    setIsDevoteeModalOpen(true);
  };

  const handleSaveDevoteeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devoteeGroupName.trim() || !devoteePhone.trim()) return;

    const validMembers: FamilyMember[] = familyRows
      .filter(r => r.name.trim().length > 0)
      .map(r => ({
        name: r.name.trim(),
        phone_number: cleanPhoneNumber(r.phone_number) || undefined,
      }));

    await saveDevotee({
      id: editingDevotee?.id || `d-${Date.now()}`,
      group_name: devoteeGroupName.trim(),
      phone_number: devoteePhone.trim(),
      family_members:
        validMembers.length > 0
          ? validMembers
          : [{ name: devoteeGroupName.trim(), phone_number: devoteePhone.trim() }],
      is_admin: editingDevotee?.is_admin || false,
    });

    setIsDevoteeModalOpen(false);
  };

  // Handle Admin PIN update
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length !== 6) {
      alert('Admin PIN must be exactly 6 digits.');
      return;
    }
    await updateAdminPin(newPinInput);
    setNewPinInput('');
  };

  // Generate WhatsApp Message URL with exact closing date
  const generateWhatsAppLink = (summary: DevoteeMonthlySummary) => {
    const name = formatDevoteeName(summary.devotee).split(' ')[0];
    const month = formatMonthName(activeMonth);
    const exactCutoff = getCutoffFormattedDate(activeMonth);
    const text = encodeURIComponent(
      `Hare Krishna ${name}ji, you have ${summary.unfilled_days} unfilled days in GNH App for ${month}. Please update before entry closes (${exactCutoff}): https://gnh.app/prasadam?phone=${summary.devotee.phone_number}`
    );
    return `https://wa.me/91${summary.devotee.phone_number}?text=${text}`;
  };

  const datesForMonth = getAllDatesInMonth(activeMonth);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28">
      {/* 1. Admin Header & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Admin Control Center
            </h1>
            <Badge variant="success" size="sm" className="ml-1">
              Active Mode
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Master control for {devotees.length} devotees • Closes: {getCutoffFormattedDate(activeMonth)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => exportToExcel(activeMonth, allDevoteeSummaries, prasadamCounts, expenses)}
            variant="secondary"
            size="sm"
            className="text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            <span>Excel (.xlsx)</span>
          </Button>

          <Button
            onClick={() => exportToPDF(activeMonth, allDevoteeSummaries, expenses)}
            variant="secondary"
            size="sm"
            className="text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-rose-500" />
            <span>PDF Statement</span>
          </Button>

          <Button
            onClick={logoutAdmin}
            variant="outline"
            size="sm"
            className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            <span>Lock Admin</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Aggregate Financial Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Prasadam Cost
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {formatRupee(totalPrasadamCost)}
          </div>
          <span className="text-[10px] text-slate-400">Community Meal Total</span>
        </Card>

        <Card className="p-4 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Approved Expenses
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatRupee(totalApprovedExpenses)}
          </div>
          <span className="text-[10px] text-slate-400">Regular Seva Purchases</span>
        </Card>

        <Card className="p-4 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Net Receivable
          </span>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {formatRupee(totalPendingReceivable)}
          </div>
          <span className="text-[10px] text-slate-400">Devotees owe GNH</span>
        </Card>

        <Card className="p-4 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Net Payable (Surplus)
          </span>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {formatRupee(totalPendingPayable)}
          </div>
          <span className="text-[10px] text-slate-400">GNH owes Devotees</span>
        </Card>
      </div>

      {/* 3. Sub-Navigation Tabs inside Admin */}
      <div className="flex overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl gap-1">
        {[
          { id: 'matrix', label: 'Global Matrix', icon: Users, badge: devotees.length },
          { id: 'expenses', label: 'Expense Review', icon: FileText, badge: expenses.length },
          { id: 'settlement', label: 'Settlements', icon: IndianRupee, badge: pendingSettlementSummaries.length },
          { id: 'whatsapp', label: 'WhatsApp Reminders', icon: Send, badge: allDevoteeSummaries.filter(s => s.unfilled_days > 0).length },
          { id: 'devotees', label: 'Devotee Roster', icon: Edit },
          { id: 'settings', label: 'Settings & DB', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as AdminTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar for Views */}
      {(activeAdminTab === 'matrix' || activeAdminTab === 'whatsapp' || activeAdminTab === 'devotees') && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by devotee name, phone, or member..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
          />
        </div>
      )}

      {/* TAB 1: GLOBAL DEVOTEE MATRIX */}
      {activeAdminTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Master Devotee Ledger ({filteredSummaries.length} devotees)
              </h3>
              <p className="text-xs text-slate-400">
                Click on any devotee name to view their personal ledger page directly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleTriggerAutoFillAll}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1 text-amber-500" />
                <span>Auto-Fill All Blank Days</span>
              </Button>

              <Button
                onClick={handleCarryOverToNextMonth}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1 text-blue-500" />
                <span>Carry Over Balances to Next Month</span>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3">Devotee (Click to View)</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-center">Meals</th>
                    <th className="py-3 px-3 text-right">Meals Cost</th>
                    <th className="py-3 px-3 text-right">Community Cost</th>
                    <th className="py-3 px-3 text-right">Total Prasadam</th>
                    <th className="py-3 px-3 text-right">Expenses</th>
                    <th className="py-3 px-3 text-right">Carry Fwd</th>
                    <th className="py-3 px-3 text-right">Final Balance</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredSummaries.map(s => {
                    const displayName = formatDevoteeName(s.devotee);
                    const hasMultiple = s.devotee.family_members && s.devotee.family_members.length > 1;

                    return (
                      <tr key={s.devotee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => selectDevoteeAndRedirect(s.devotee, 'reports')}
                            className="text-left font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 group"
                            title="Open user's page"
                          >
                            <span>{displayName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {hasMultiple && (
                            <div className="text-[10px] text-slate-400">
                              {formatDevoteeFamilyDisplay(s.devotee, true)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {s.devotee.phone_number}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {s.total_meals}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300">
                          {formatRupee(s.meals_cost)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300">
                          {formatRupee(s.community_cost)}
                          <span className="text-[10px] text-slate-400 block">({s.family_member_count}m × ₹{s.community_cost_per_member})</span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatRupee(s.prasadam_cost)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupee(s.approved_expenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {formatRupee(s.carried_forward)}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-sm">
                          <span
                            className={
                              s.final_balance > 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : s.final_balance < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400'
                            }
                          >
                            {formatRupee(s.final_balance)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {s.settlement_status === 'SETTLED' ? (
                            <Badge variant="success" size="sm">Settled</Badge>
                          ) : s.settlement_status === 'PENDING_VERIFICATION' ? (
                            <Badge variant="warning" size="sm">Pending Approval</Badge>
                          ) : (
                            <Badge variant="outline" size="sm">Unsettled</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              onClick={() => setSelectedDevoteeForEdit(s.devotee)}
                              variant="ghost"
                              size="sm"
                              className="text-[11px] py-1 px-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              title="Edit Daily Matrix"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              <span>Matrix</span>
                            </Button>

                            <Button
                              onClick={() => {
                                setSettlingDevotee(s);
                                setDirectSettleAmount(s.final_balance.toString());
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-[11px] py-1 px-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                              title="Direct Settle"
                            >
                              <IndianRupee className="w-3.5 h-3.5 mr-1" />
                              <span>Settle</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: EXPENSE REVIEW QUEUE */}
      {activeAdminTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              All Expenses ({expenses.length})
            </h3>
            <p className="text-xs text-slate-400">
              Expenses are auto-approved by default. Reject invalid receipts with an explanation.
            </p>
          </div>

          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Item / Description</th>
                    <th className="py-3 px-3">Payer / Devotee</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Receipt</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {expenses.map(exp => {
                    const devotee = devotees.find(d => d.id === exp.devotee_id);
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {exp.date || exp.created_at.slice(0, 10)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={exp.type === 'JANMASHTAMI' ? 'saffron' : 'default'} size="sm">
                            {exp.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {exp.title}
                          </div>
                          {exp.comments && (
                            <div className="text-[10px] text-slate-400">{exp.comments}</div>
                          )}
                          {exp.rejection_reason && (
                            <div className="text-[10px] text-rose-500 font-semibold">
                              Reason: {exp.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {exp.payer_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {devotee ? formatDevoteeName(devotee) : `Guest: ${exp.guest_name}`}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatRupee(exp.amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {exp.bill_url ? (
                            <a
                              href={exp.bill_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-600 dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={exp.status === 'APPROVED' ? 'success' : 'danger'} size="sm">
                            {exp.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {exp.status === 'APPROVED' ? (
                            <Button
                              onClick={() => setRejectingExpense(exp)}
                              variant="danger"
                              size="sm"
                              className="text-[10px] py-1 px-2.5"
                            >
                              Reject
                            </Button>
                          ) : (
                            <Button
                              onClick={() => reviewExpense(exp.id, 'APPROVED')}
                              variant="secondary"
                              size="sm"
                              className="text-[10px] py-1 px-2.5 text-emerald-600 hover:bg-emerald-50"
                            >
                              Re-Approve
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: SETTLEMENT ENGINE */}
      {activeAdminTab === 'settlement' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pending Devotee Settlement Requests ({pendingSettlementSummaries.length})
            </h3>
          </div>

          {pendingSettlementSummaries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSettlementSummaries.map(s => (
                <Card key={s.devotee.id} className="p-4 border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {formatDevoteeName(s.devotee)}
                      </h4>
                      <p className="text-xs text-slate-500">Phone: {s.devotee.phone_number}</p>
                    </div>
                    <Badge variant="warning">Verification Pending</Badge>
                  </div>

                  <div className="my-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                    <div>
                      <div className="text-slate-400">Reported Paid Amount:</div>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {formatRupee(s.settlement_reported)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Payment Date:</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {s.settlement_date_reported || 'Today'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => adminVerifySettlement(s.devotee.id, s.settlement_reported, s.settlement_date_reported || new Date().toISOString().slice(0, 10), 'Verified & Approved')}
                      variant="saffron"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      <span>Verify & Settle</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-xs text-slate-400 border border-dashed">
              No pending settlement verification requests at this time.
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: WHATSAPP REMINDERS */}
      {activeAdminTab === 'whatsapp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                WhatsApp Missing Count Reminders
              </h3>
              <p className="text-xs text-slate-400">
                1-Click pre-filled WhatsApp links for devotees with unfilled meal counts before entry closes ({getCutoffFormattedDate(activeMonth)}).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSummaries.map(s => {
              const hasMissing = s.unfilled_days > 0;
              const waLink = generateWhatsAppLink(s);

              return (
                <Card
                  key={s.devotee.id}
                  className={`p-4 border ${hasMissing ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/10' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {formatDevoteeName(s.devotee)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        📱 +91 {s.devotee.phone_number}
                      </div>
                    </div>

                    {hasMissing ? (
                      <Badge variant="warning" size="sm">
                        {s.unfilled_days} Unfilled Days
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        All Days Filled
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send WhatsApp Reminder</span>
                    </a>

                    <Button
                      onClick={() => {
                        const name = formatDevoteeName(s.devotee).split(' ')[0];
                        const text = `Hare Krishna ${name}ji, you have ${s.unfilled_days} unfilled days in GNH App for ${formatMonthName(activeMonth)}. Please update before entry closes (${getCutoffFormattedDate(activeMonth)}): https://gnh.app/prasadam?phone=${s.devotee.phone_number}`;
                        navigator.clipboard.writeText(text);
                        showToast({ type: 'success', title: 'Copied WhatsApp Message' });
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      title="Copy text"
                    >
                      Copy
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: DEVOTEES & GUEST MANAGEMENT */}
      {activeAdminTab === 'devotees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Registered Devotees ({devotees.length})
            </h3>
            <Button
              onClick={() => handleOpenDevoteeModal()}
              variant="saffron"
              size="sm"
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Devotee</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {devotees.map(d => {
              const displayName = formatDevoteeName(d);
              const hasMultiple = d.family_members && d.family_members.length > 1;

              return (
                <Card key={d.id} className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {displayName}
                      </span>
                      {d.is_admin && <Badge variant="saffron" size="sm">Admin</Badge>}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-1">
                      📱 {d.phone_number}
                    </div>
                    {hasMultiple && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        <strong>Family:</strong> {formatDevoteeFamilyDisplay(d, true)}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Button
                      onClick={() => selectDevoteeAndRedirect(d, 'reports')}
                      variant="ghost"
                      size="sm"
                      className="text-xs py-1 text-slate-600 dark:text-slate-300"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      <span>View Page</span>
                    </Button>

                    <Button
                      onClick={() => handleOpenDevoteeModal(d)}
                      variant="ghost"
                      size="sm"
                      className="text-xs py-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      <span>Edit</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & DATABASE */}
      {activeAdminTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          {/* Community Cost & Rate Settings */}
          <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1.5">
              <IndianRupee className="w-4 h-4 text-amber-500" />
              <span>Community Cost Per Family Member</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Fixed community cost levied to each registered devotee family member in monthly prasadam calculations. Current active rate: <strong className="text-amber-600 dark:text-amber-400 font-mono">₹{communityCostPerMember}</strong> / member (Default: ₹500).
            </p>
            <form onSubmit={handleUpdateCommunityCost} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  placeholder="e.g. 500"
                  value={communityCostInput}
                  onChange={e => setCommunityCostInput(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none"
                />
              </div>
              <Button type="submit" variant="saffron" size="sm">
                Save Rate
              </Button>
            </form>
          </Card>

          {/* Admin PIN Changer */}
          <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Change 6-Digit Admin PIN</span>
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Current PIN: <code className="font-mono font-bold text-amber-500">{adminPin}</code> (Default: 192108)
            </p>
            <form onSubmit={handleUpdatePin} className="flex gap-2">
              <input
                type="password"
                maxLength={6}
                placeholder="New 6-Digit PIN"
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest outline-none"
              />
              <Button type="submit" variant="saffron" size="sm">
                Update PIN
              </Button>
            </form>
          </Card>

          {/* Database Reset & Seeding Tool */}
          <Card className="p-5 border border-rose-200 dark:border-rose-900 bg-rose-50/10">
            <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
              <Database className="w-4 h-4" />
              <span>Reset / Restore Initial Seed Data</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Restores the registered Vaishnava devotee roster from seed configuration and resets all meal counts and expenses to zero.
            </p>
            <Button
              onClick={() => {
                if (confirm('Are you sure you want to reset local data to defaults?')) {
                  resetDatabase();
                }
              }}
              variant="danger"
              size="sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Reset Database to Defaults</span>
            </Button>
          </Card>
        </div>
      )}

      {/* DEVOTEE INLINE MATRIX MODAL (ADMIN OVERRIDE) */}
      <Modal
        isOpen={Boolean(selectedDevoteeForEdit)}
        onClose={() => setSelectedDevoteeForEdit(null)}
        title={`Admin Override: ${selectedDevoteeForEdit ? formatDevoteeName(selectedDevoteeForEdit) : ''}`}
        description="Inline meal count editor. Admin edits bypass all closure lock restrictions."
        maxWidth="3xl"
      >
        {selectedDevoteeForEdit && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="text-xs text-slate-500">
              Primary Phone: {selectedDevoteeForEdit.phone_number} {selectedDevoteeForEdit.family_members.length > 1 ? `• Family: ${formatDevoteeFamilyDisplay(selectedDevoteeForEdit, true)}` : ''}
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 font-bold border-b">
                <tr>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2 text-center">B (₹40)</th>
                  <th className="py-2 px-2 text-center">L (₹80)</th>
                  <th className="py-2 px-2 text-center">D (₹40)</th>
                  <th className="py-2 px-2 text-right">Day Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {datesForMonth.map(dateStr => {
                  const entry = prasadamCounts.find(
                    (c: PrasadamCount) => c.devotee_id === selectedDevoteeForEdit.id && c.date === dateStr
                  );
                  const b = entry?.breakfast_count || 0;
                  const l = entry?.lunch_count || 0;
                  const d = entry?.dinner_count || 0;
                  const cost = calculateMealsCost(b, l, d);

                  return (
                    <tr key={dateStr}>
                      <td className="py-1.5 px-2 font-mono font-bold">{dateStr.slice(8)} {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={b === 0 ? '' : b}
                          placeholder="0"
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updatePrasadamCount({
                              id: entry?.id,
                              devotee_id: selectedDevoteeForEdit.id,
                              date: dateStr,
                              breakfast_count: val,
                              lunch_count: l,
                              dinner_count: d,
                              is_auto_filled: false,
                            });
                          }}
                          className="w-12 text-center py-1 bg-slate-50 dark:bg-slate-800 border rounded font-bold"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={l === 0 ? '' : l}
                          placeholder="0"
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updatePrasadamCount({
                              id: entry?.id,
                              devotee_id: selectedDevoteeForEdit.id,
                              date: dateStr,
                              breakfast_count: b,
                              lunch_count: val,
                              dinner_count: d,
                              is_auto_filled: false,
                            });
                          }}
                          className="w-12 text-center py-1 bg-slate-50 dark:bg-slate-800 border rounded font-bold"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={d === 0 ? '' : d}
                          placeholder="0"
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updatePrasadamCount({
                              id: entry?.id,
                              devotee_id: selectedDevoteeForEdit.id,
                              date: dateStr,
                              breakfast_count: b,
                              lunch_count: l,
                              dinner_count: val,
                              is_auto_filled: false,
                            });
                          }}
                          className="w-12 text-center py-1 bg-slate-50 dark:bg-slate-800 border rounded font-bold"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-800 dark:text-slate-200">
                        {formatRupee(cost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* REJECT EXPENSE MODAL */}
      <Modal
        isOpen={Boolean(rejectingExpense)}
        onClose={() => setRejectingExpense(null)}
        title="Reject Expense Submission"
        description="Specify a reason for rejecting this expense so the devotee can see why."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Duplicate bill, receipt illegible, or personal item included..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectingExpense(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRejection}
              className="flex-1"
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* DIRECT SETTLE MODAL */}
      <Modal
        isOpen={Boolean(settlingDevotee)}
        onClose={() => setSettlingDevotee(null)}
        title={`Direct Settlement: ${settlingDevotee ? formatDevoteeName(settlingDevotee.devotee) : ''}`}
        description="Manually record full or partial payment settlement for this group."
      >
        <form onSubmit={handleDirectSettleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Settled Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={directSettleAmount}
              onChange={e => setDirectSettleAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Settlement Date
            </label>
            <input
              type="date"
              required
              value={directSettleDate}
              onChange={e => setDirectSettleDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Admin Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Received via GPay / Cash"
              value={directSettleNotes}
              onChange={e => setDirectSettleNotes(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettlingDevotee(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" variant="saffron" className="flex-1">
              Mark as Settled
            </Button>
          </div>
        </form>
      </Modal>

      {/* DEVOTEE EDIT / CREATE MODAL */}
      <Modal
        isOpen={isDevoteeModalOpen}
        onClose={() => setIsDevoteeModalOpen(false)}
        title={editingDevotee ? 'Edit Devotee' : 'Add New Devotee'}
      >
        <form onSubmit={handleSaveDevoteeSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Name / Group Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ram Das"
              value={devoteeGroupName}
              onChange={e => setDevoteeGroupName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              10-Digit Phone Number *
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              placeholder="e.g. 9876543201"
              value={devoteePhone}
              onChange={e => setDevoteePhone(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono outline-none"
            />
          </div>

          {/* Family Members Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Family Members ({familyRows.length})
              </label>
              <button
                type="button"
                onClick={() => setFamilyRows(prev => [...prev, { name: '', phone_number: '' }])}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Family members can log in with their own mobile number. Leave the mobile number blank if a member does not have one.
            </p>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {familyRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Member ${idx + 1} Name`}
                      value={row.name}
                      onChange={e => {
                        const val = e.target.value;
                        setFamilyRows(prev => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], name: val };
                          return updated;
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="w-36 sm:w-40">
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Mobile (Optional)"
                      value={row.phone_number}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFamilyRows(prev => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], phone_number: val };
                          return updated;
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs font-mono outline-none"
                    />
                  </div>
                  {familyRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFamilyRows(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDevoteeModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" variant="saffron" className="flex-1">
              Save Devotee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
