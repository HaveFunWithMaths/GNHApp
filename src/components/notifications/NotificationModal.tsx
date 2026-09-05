import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  CheckCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Expense } from '../../types';
import { formatRupee, formatExpenseDate, formatSubmissionDateTime } from '../../utils/calculations';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  readNotificationIds: string[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  expenses,
  readNotificationIds,
  onMarkAllAsRead,
  onMarkAsRead,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');

  // Sort expenses by submission time or date descending
  const sortedExpenses = [...expenses].sort((a, b) => {
    const timeA = new Date(a.created_at || a.date || '').getTime() || 0;
    const timeB = new Date(b.created_at || b.date || '').getTime() || 0;
    return timeB - timeA;
  });

  const filteredExpenses = sortedExpenses.filter(e => {
    if (filter === 'APPROVED') return e.status === 'APPROVED';
    if (filter === 'REJECTED') return e.status === 'REJECTED';
    return true; // ALL
  });

  const approvedCount = expenses.filter(e => e.status === 'APPROVED').length;
  const rejectedCount = expenses.filter(e => e.status === 'REJECTED').length;
  const unreadCount = expenses.filter(
    e => (e.status === 'APPROVED' || e.status === 'REJECTED') && !readNotificationIds.includes(e.id)
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Expense Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live status updates for your submitted regular and festival expenses
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Filters and Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All ({expenses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Approved</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/30">
                {approvedCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Rejected</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/30">
                {rejectedCount}
              </span>
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No notifications found matching current filter.
            </div>
          ) : (
            filteredExpenses.map(exp => {
              const isUnread = (exp.status === 'APPROVED' || exp.status === 'REJECTED') && !readNotificationIds.includes(exp.id);
              const isApproved = exp.status === 'APPROVED';
              const isRejected = exp.status === 'REJECTED';

              return (
                <div
                  key={exp.id}
                  onClick={() => onMarkAsRead(exp.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                          isApproved
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : isRejected
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isRejected ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {exp.title}
                          </span>
                          <Badge
                            variant={isApproved ? 'success' : isRejected ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Verification'}
                          </Badge>
                          {exp.type === 'JANMASHTAMI' ? (
                            <Badge variant="saffron" size="sm" className="text-[10px]">
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              Janmashtami
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm" className="text-[10px]">
                              <Receipt className="w-2.5 h-2.5 mr-0.5" />
                              Regular GNH
                            </Badge>
                          )}
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="New" />
                          )}
                        </div>

                        {/* Rejection reason banner */}
                        {isRejected && exp.rejection_reason && (
                          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium mt-1.5">
                            <strong>Admin Reason:</strong> {exp.rejection_reason}
                          </div>
                        )}

                        {/* Approval note */}
                        {isApproved && (
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            Verified by Admin and included in your balance statement.
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5 flex-wrap">
                          <span>Payer: <strong>{exp.payer_name}</strong></span>
                          <span>•</span>
                          <span>Expense Date: {formatExpenseDate(exp.date || exp.created_at)}</span>
                          {exp.created_at && (
                            <>
                              <span>•</span>
                              <span>Submitted: {formatSubmissionDateTime(exp.created_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        {formatRupee(exp.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Total: {expenses.length} expense entries recorded</span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
