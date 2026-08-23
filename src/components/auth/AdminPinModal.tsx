import React, { useState, useEffect } from 'react';
import { Lock, Delete, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';

export const AdminPinModal: React.FC = () => {
  const {
    isAdminPinModalOpen,
    setIsAdminPinModalOpen,
    authenticateAdmin,
    setActiveTab,
  } = useApp();

  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isAdminPinModalOpen) {
      setPin('');
      setError('');
    }
  }, [isAdminPinModalOpen]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 6) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = async (pinToVerify: string) => {
    setError('');
    const success = await authenticateAdmin(pinToVerify);
    if (success) {
      setIsAdminPinModalOpen(false);
      setPin('');
      setActiveTab('admin');
    } else {
      setError('Incorrect PIN. Please enter the valid 6-digit Admin PIN.');
      setPin('');
    }
  };

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAdminPinModalOpen) return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminPinModalOpen, pin]);

  return (
    <Modal
      isOpen={isAdminPinModalOpen}
      onClose={() => setIsAdminPinModalOpen(false)}
      maxWidth="sm"
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Admin Access
            </h3>
            <p className="text-xs text-slate-400">6-Digit Authorization PIN</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6 pt-2 text-center">
        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-500 border-amber-500 scale-110 shadow-sm shadow-amber-500/50'
                    : 'border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-900 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* On-screen Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 active:bg-amber-100 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all active:scale-95 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 active:bg-amber-100 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all active:scale-95 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-2 text-xs text-slate-400">
          Browser automatically saves admin session for convenience.
        </div>
      </div>
    </Modal>
  );
};
