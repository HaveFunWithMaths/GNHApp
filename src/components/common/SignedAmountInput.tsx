import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface SignedAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  currencyPrefix?: string;
  allowNegative?: boolean;
}

export const SignedAmountInput: React.FC<SignedAmountInputProps> = ({
  value,
  onChange,
  placeholder = '0.00',
  required,
  disabled = false,
  className = '',
  id,
  currencyPrefix = '₹',
  allowNegative = true,
}) => {
  const isNegative = value.startsWith('-');

  // Toggle or set sign (+ / -)
  const handleSetSign = (targetNegative: boolean) => {
    if (disabled || !allowNegative) return;

    if (targetNegative) {
      if (!isNegative) {
        if (!value || value === '0') {
          onChange('-');
        } else {
          onChange('-' + value);
        }
      }
    } else {
      if (isNegative) {
        const stripped = value.slice(1);
        onChange(stripped === '' ? '' : stripped);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.trim();

    // Empty input
    if (raw === '') {
      onChange('');
      return;
    }

    // Just minus sign
    if (allowNegative && (raw === '-' || raw === '−')) {
      onChange('-');
      return;
    }

    // Replace unicode minus if pasted
    raw = raw.replace(/−/g, '-');

    // Strict decimal validation: optional single leading minus, digits, optional single decimal dot and digits
    const regex = allowNegative ? /^-?\d*(\.\d*)?$/ : /^\d*(\.\d*)?$/;
    if (regex.test(raw)) {
      onChange(raw);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center gap-2 w-full">
        {/* Sign Toggle (+ / -) */}
        {allowNegative && (
          <div
            className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 select-none shrink-0"
            role="group"
            aria-label="Number sign toggle"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSetSign(false)}
              className={`flex items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isNegative
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/20'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Positive amount (+)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Positive</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSetSign(true)}
              className={`flex items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isNegative
                  ? 'bg-rose-500 text-white shadow-xs font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
              title="Negative amount (-)"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Negative</span>
            </button>
          </div>
        )}

        {/* Input with Currency Prefix */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none select-none">
            {currencyPrefix}
          </span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border ${
              isNegative
                ? 'border-rose-400 dark:border-rose-500/70 text-rose-600 dark:text-rose-400 focus:ring-rose-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-amber-500'
            } rounded-xl text-sm focus:ring-2 outline-none font-semibold transition-colors font-mono ${className}`}
          />
        </div>
      </div>

      {allowNegative && isNegative && (
        <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Negative amount selected (refund, credit, or expense return)</span>
        </div>
      )}
    </div>
  );
};
