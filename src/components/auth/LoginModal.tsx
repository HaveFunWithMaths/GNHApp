import React, { useState } from 'react';
import { User, Phone, CheckCircle, ArrowRight, AlertCircle, LogIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Devotee } from '../../types';
import { formatDevoteeName } from '../../utils/calculations';
import { findDevoteeByPhone, formatDevoteeFamilyDisplay, DevoteePhoneMatch } from '../../utils/devoteeHelpers';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
    devotees,
    loginWithPhone,
    loginAsGuest,
    activeDevotee,
  } = useApp();

  const [mode, setMode] = useState<'devotee' | 'guest'>('devotee');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [guestInputName, setGuestInputName] = useState('');
  const [phoneMatch, setPhoneMatch] = useState<DevoteePhoneMatch | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const matchedDevotee: Devotee | null = phoneMatch?.devotee || null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(val);
    setErrorMsg('');

    if (val.length === 10) {
      const match = findDevoteeByPhone(devotees, val);
      if (match) {
        setPhoneMatch(match);
      } else {
        setPhoneMatch(null);
        setErrorMsg('No registered devotee or family member found with this 10-digit mobile number.');
      }
    } else {
      setPhoneMatch(null);
    }
  };

  const handleDevoteeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit registered mobile number.');
      return;
    }
    const match = phoneMatch || findDevoteeByPhone(devotees, phoneNumber);
    if (!match) {
      setErrorMsg('No registered devotee or family member found with this mobile number.');
      return;
    }
    const success = await loginWithPhone(phoneNumber);
    if (success) {
      setIsLoginModalOpen(false);
      setPhoneNumber('');
      setPhoneMatch(null);
      setErrorMsg('');
    }
  };

  const handleConfirmLogin = async () => {
    if (!phoneMatch && phoneNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit registered phone number.');
      return;
    }
    const success = await loginWithPhone(phoneNumber);
    if (success) {
      setIsLoginModalOpen(false);
      setPhoneNumber('');
      setPhoneMatch(null);
      setErrorMsg('');
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInputName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    loginAsGuest(guestInputName.trim());
    setIsLoginModalOpen(false);
    setGuestInputName('');
    setErrorMsg('');
  };

  return (
    <Modal
      isOpen={isLoginModalOpen}
      onClose={() => {
        if (activeDevotee) setIsLoginModalOpen(false);
      }}
      showCloseButton={Boolean(activeDevotee)}
      maxWidth="md"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 mb-3">
          <img src="/GNHLogo.png" alt="GNH" className="w-12 h-12 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Hare Krishna!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Identify yourself to log prasadam counts & seva expenses
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('devotee');
            setErrorMsg('');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'devotee'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
        >
          Devotee (Phone)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('guest');
            setErrorMsg('');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'guest'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
        >
          Guest (Enter Name)
        </button>
      </div>

      {mode === 'devotee' ? (
        <form onSubmit={handleDevoteeSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              10-Digit Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phoneNumber}
                onChange={handlePhoneChange}
                maxLength={10}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-base transition-all font-mono"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Enter primary registered mobile or any family member's registered phone number.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Identity Confirmation Card */}
          {matchedDevotee && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-fade-in text-left">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm mb-1.5">
                <CheckCircle className="w-4 h-4 text-amber-600" />
                <span>Identity Found</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Devotee Account:
              </p>
              <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                {formatDevoteeName(matchedDevotee)}
              </div>

              {phoneMatch?.matchedMemberName && !phoneMatch.isPrimary && (
                <div className="mt-2 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Logging in via Family Member: <strong>{phoneMatch.matchedMemberName}</strong> (+91 {phoneNumber})
                  </span>
                </div>
              )}

              {matchedDevotee.family_members && matchedDevotee.family_members.length > 1 && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">Family Members:</strong>{' '}
                  {formatDevoteeFamilyDisplay(matchedDevotee, false)}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={handleConfirmLogin}
                  type="button"
                  variant="saffron"
                  className="w-full py-2.5 text-sm"
                >
                  {phoneMatch?.matchedMemberName && !phoneMatch.isPrimary ? (
                    <>
                      <span>Yes, Continue as {phoneMatch.matchedMemberName}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <span>Yes, Continue as {formatDevoteeName(matchedDevotee).split(' ')[0]}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {!matchedDevotee && (
            <Button
              type="submit"
              variant="saffron"
              className="w-full py-3 text-sm"
              disabled={phoneNumber.length !== 10}
            >
              <LogIn className="w-4 h-4 mr-1.5" />
              <span>Login with Phone Number</span>
            </Button>
          )}
        </form>
      ) : (
        <form onSubmit={handleGuestSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Your Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Anand Sharma (Guest)"
                value={guestInputName}
                onChange={e => setGuestInputName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-base transition-all"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Guest sessions allow you to submit expenses & view menus without permanent registration.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button type="submit" variant="saffron" className="w-full py-3 text-sm">
            <span>Continue as Guest</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>
      )}
    </Modal>
  );
};
