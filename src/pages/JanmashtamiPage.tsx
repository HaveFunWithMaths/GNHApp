import React, { useState } from 'react';
import {
  Upload,
  Plus,
  Eye,
  Crown,
  Sparkles,
  ExternalLink,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatRupee, getDefaultExpenseDate } from '../utils/calculations';
import { getFamilyMemberNames, getPrimaryFamilyMemberName } from '../utils/devoteeHelpers';
import { compressImage } from '../utils/imageCompressor';
import { storageService } from '../services/storageService';
import { Expense } from '../types';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export const JanmashtamiPage: React.FC = () => {
  const {
    activeMonth,
    activeDevotee,
    loggedInMemberName,
    guestName,
    expenses,
    submitExpense,
    showToast,
    setActiveTab,
  } = useApp();

  const handleNavigateToRegularExpenses = () => {
    setActiveTab('prasadam');
    window.location.hash = 'regular-expenses-section';
    setTimeout(() => {
      const el = document.getElementById('regular-expenses-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // Resolve default payer name helper (defaults single family member or logged in member)
  const getDefaultPayer = React.useCallback(() => {
    if (loggedInMemberName) return loggedInMemberName;
    if (activeDevotee) {
      const members = getFamilyMemberNames(activeDevotee);
      if (members.length === 1) return members[0];
    }
    if (guestName) return guestName;
    return '';
  }, [loggedInMemberName, activeDevotee, guestName]);

  // Form states
  const [expenseDate, setExpenseDate] = useState<string>(() => getDefaultExpenseDate(activeMonth));
  const [payerName, setPayerName] = useState<string>(() => getDefaultPayer());
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseComments, setExpenseComments] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Sync payer name & expense date with default whenever context changes
  React.useEffect(() => {
    setPayerName(getDefaultPayer());
  }, [getDefaultPayer]);

  React.useEffect(() => {
    setExpenseDate(getDefaultExpenseDate(activeMonth));
  }, [activeMonth]);

  // Cleanup preview object URL on unmount
  React.useEffect(() => {
    return () => {
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);

  // Filter only Janmashtami expenses
  const allJanmashtamiExpenses = expenses.filter(
    (e: Expense) => e.type === 'JANMASHTAMI'
  );

  const myJanmashtamiExpenses = allJanmashtamiExpenses.filter((e: Expense) =>
    activeDevotee
      ? e.devotee_id === activeDevotee.id
      : (guestName ? e.guest_name === guestName : false)
  );

  const totalJanmashtamiFund = allJanmashtamiExpenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const myTotal = myJanmashtamiExpenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      showToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Receipt attachment must be less than 10 MB.',
      });
      return;
    }

    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(file);
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDate.trim()) {
      showToast({
        type: 'warning',
        title: 'Expense Date Required',
        message: 'Please select the date of this Janmashtami expense.',
      });
      return;
    }

    const amountNum = parseFloat(expenseAmount);
    const defaultPayer = getDefaultPayer() || getPrimaryFamilyMemberName(activeDevotee) || guestName || '';
    const resolvedPayer = payerName.trim() || defaultPayer;

    if (!resolvedPayer) {
      showToast({ type: 'warning', title: 'Payer Required', message: 'Please select or enter who made the payment.' });
      return;
    }

    if (!expenseTitle.trim()) {
      showToast({ type: 'warning', title: 'Description Required', message: 'Please enter what was purchased.' });
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      showToast({ type: 'warning', title: 'Invalid Amount', message: 'Please enter a valid expense amount.' });
      return;
    }

    if (!receiptFile) {
      showToast({
        type: 'warning',
        title: 'Attachment Mandatory',
        message: 'Bill / Receipt attachment is mandatory for Janmashtami Seva expenses.',
      });
      return;
    }

    setIsUploading(true);
    try {
      let attachmentUrl: string | undefined = undefined;

      try {
        const compressed = await compressImage(receiptFile);
        attachmentUrl = await storageService.uploadReceipt(compressed);
      } catch (uploadErr) {
        console.warn('Receipt compression/upload fallback:', uploadErr);
        attachmentUrl = await storageService.uploadReceipt(receiptFile);
      }

      await submitExpense({
        devotee_id: activeDevotee?.id || null,
        guest_name: !activeDevotee ? guestName || resolvedPayer || 'Anonymous Devotee' : null,
        date: expenseDate,
        cycle_month: expenseDate ? expenseDate.slice(0, 7) : activeMonth,
        type: 'JANMASHTAMI',
        payer_name: resolvedPayer,
        title: expenseTitle.trim(),
        amount: amountNum,
        comments: expenseComments.trim() || null,
        bill_url: attachmentUrl || null,
        status: 'APPROVED',
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
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Could not log Janmashtami expense.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* 1. Festive Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <Crown className="w-3.5 h-3.5" />
              <span>Sri Krishna Janmashtami Mahotsav Seva</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <span>Janmashtami Special Ledger</span>
              <Sparkles className="w-8 h-8 text-amber-200" />
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-xl leading-relaxed">
              Maintained as an independent, isolated ledger with identical expense logging fields. These contributions and purchases are not merged into the monthly prasadam meals billing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-black/25 backdrop-blur-md border border-white/20">
              <div className="text-xs text-amber-200">Community Total</div>
              <div className="text-xl sm:text-2xl font-extrabold mt-0.5">
                {formatRupee(totalJanmashtamiFund)}
              </div>
              <div className="text-[10px] text-amber-200/80">
                {allJanmashtamiExpenses.length} items recorded
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
              <div className="text-xs text-white">Your Seva</div>
              <div className="text-xl sm:text-2xl font-extrabold mt-0.5">
                {formatRupee(myTotal)}
              </div>
              <div className="text-[10px] text-white/80">
                {myJanmashtamiExpenses.length} items logged
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Janmashtami Expense Logger Form */}
      <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Log Janmashtami Seva Expense
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record festival flowers, abhishek ingredients, 108 bhoga preparations, lighting, and stage decor (Max 10 MB per bill).
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
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

            {/* Payer */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Who Made the Expense?
              </label>
              {activeDevotee ? (
                <select
                  value={payerName || (getFamilyMemberNames(activeDevotee).length === 1 ? getFamilyMemberNames(activeDevotee)[0] : '')}
                  onChange={e => setPayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {getFamilyMemberNames(activeDevotee).length > 1 && <option value="">Select Member</option>}
                  {getFamilyMemberNames(activeDevotee).map((member: string) => (
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
                placeholder="e.g. 108 Bhoga Dry Fruits & Saffron"
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
                placeholder="e.g. 8500"
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
                Seva Details / Comments (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Details of festival seva, vendor, quantity..."
                value={expenseComments}
                onChange={e => setExpenseComments(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>

            {/* Bill Upload with 10 MB Limit - Mandatory */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <span>Bill / Receipt Photo</span>
                <span className="text-red-500 font-bold">*</span>
                <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400 ml-1">(Mandatory)</span>
              </label>
              <div className="flex items-center gap-3">
                <label className={`flex-1 flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50 ${!receiptFile ? 'border-amber-400 dark:border-amber-600/70 hover:border-amber-500' : 'border-emerald-500/50 dark:border-emerald-600/50'}`}>
                  <Upload className={`w-5 h-5 mb-1 ${receiptFile ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {receiptFile ? receiptFile.name : 'Upload receipt photo *'}
                  </span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP up to 10 MB (Required)</span>
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
              isLoading={isUploading}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Submit Janmashtami Expense</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. Community Janmashtami Ledger Table */}
      <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            All Janmashtami Expenses Entries ({allJanmashtamiExpenses.length})
          </h3>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
            Total Seva: {formatRupee(totalJanmashtamiFund)}
          </span>
        </div>

        {allJanmashtamiExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Item / Seva</th>
                  <th className="py-2.5 px-3">Payer</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Receipt</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {allJanmashtamiExpenses.map((exp: Expense) => (
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
                        <Badge variant="danger" size="sm">
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
          <div className="text-center py-8 text-xs text-slate-400">
            No Janmashtami festival entries logged yet.
          </div>
        )}
      </Card>

      {/* 4. Other Expenses Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Other Expenses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct access to kitchen reimbursements, preaching outreach, and cultivation expense portals
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Regular GNH Expense */}
          <div
            onClick={handleNavigateToRegularExpenses}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigateToRegularExpenses();
              }
            }}
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer select-none"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-14 h-14 rounded-xl bg-amber-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <img
                    src="/GNHLogo.png"
                    alt="GNH Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  2nd Tab
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Regular GNH Expense
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Submit daily kitchen groceries, vegetables, and store purchases to offset monthly prasadam.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>Go to Expenses</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: ARJUNA Expenses */}
          <a
            href="https://tinyurl.com/AGTReimburse"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-14 h-14 rounded-xl bg-blue-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                  <img
                    src="/Arjuna_Logo.jpg"
                    alt="ARJUNA Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  Reimbursement
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  ARJUNA Expenses
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Submit ARJUNA devotee reimbursement and festival expenditure requests.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>Open ARJUNA Form</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </a>

          {/* Card 3: Preaching Expenses */}
          <a
            href="https://forms.gle/Aji5QpTAp5ToFP5z9"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-500/50 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-14 h-14 rounded-xl bg-purple-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                  <img
                    src="/VSTLogo.jpeg"
                    alt="VST Preaching Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                  Preaching
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Preaching Expenses
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Voice of Subconscious (VST) and outreach preaching programs expense claims.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
              <span>Open Preaching Form</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </a>

          {/* Card 4: Influential people cultivation */}
          <a
            href="https://forms.gle/batrkRmLYvYQQyfJ9"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <span className="font-black text-2xl tracking-tight leading-none select-none">$</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  Cultivation
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Influential People Cultivation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  VIP outreach, special devotee relationship cultivation, and seva gift reimbursements.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Open Cultivation Form</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </a>
        </div>
      </div>

      {/* Receipt Viewer Modal */}
      <Modal
        isOpen={Boolean(viewingReceiptUrl)}
        onClose={() => setViewingReceiptUrl(null)}
        title="Janmashtami Expenses Receipt"
        maxWidth="lg"
      >
        {viewingReceiptUrl && (
          <div className="flex justify-center p-2">
            <img
              src={viewingReceiptUrl}
              alt="Janmashtami Receipt Full View"
              className="max-h-[70vh] rounded-xl object-contain shadow-md"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
