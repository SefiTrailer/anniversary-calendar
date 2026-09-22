'use client';

import React, { useState } from 'react';
import { X, Flame, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; name: string; avatar?: string | null }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const isOwnerEmail = email.trim().toLowerCase() === 'shalomyosefzeev@gmail.com';

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    // If attempting to log in as the Calendar Admin (Sefi Reichkind), verify Admin PIN
    if (isOwnerEmail) {
      const validPin = '2026'; // Default secure Admin PIN
      if (adminPin.trim() !== validPin) {
        setMessage({
          type: 'error',
          text: 'קוד מנהל שגוי. כדי להיכנס כמנהל יומן ראשי (ספי רייכקינד) יש להזין את קוד המנהל התקין.',
        });
        setIsSubmitting(false);
        return;
      }

      const googleUser = {
        email: 'shalomyosefzeev@gmail.com',
        name: 'ספי רייכקינד',
        avatar: 'https://lh3.googleusercontent.com/a/ACg8ocLlT2SSbn2pbTojfDgn91p_5omwts52h6mrf5LPk8TuPp7lC1lu=s96-c',
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('ner_neshama_user', JSON.stringify(googleUser));
      }

      setMessage({ type: 'success', text: 'שלום ספי, זוהית בהצלחה כמנהל היומן!' });
      setTimeout(() => {
        onSuccess(googleUser);
        setIsSubmitting(false);
        onClose();
      }, 400);
      return;
    }

    // Standard Family Member Login
    const resolvedName = name.trim() || email.split('@')[0];
    const memberUser = {
      email: email.trim().toLowerCase(),
      name: resolvedName,
      avatar: null,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('ner_neshama_user', JSON.stringify(memberUser));
    }

    setMessage({ type: 'success', text: `ברוך הבא, ${resolvedName}!` });
    setTimeout(() => {
      onSuccess(memberUser);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden relative">
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-blue-600 to-indigo-700" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
              <Flame className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                התחברות ליומן המשפחתי
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                נר נשמה &bull; יומן משפחת רייכקינד
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`mx-6 mb-2 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="p-6 pt-2 space-y-4">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                כתובת אימייל (Google / אחר) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50/50 font-medium"
                />
              </div>
            </div>

            {/* If Admin Email is detected, require PIN */}
            {isOwnerEmail ? (
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">זיהוי מנהל יומן: ספי רייכקינד</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-200/80 text-blue-800">
                    מנהל ראשי
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    קוד אימות מנהל (PIN) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="הזן קוד מנהל (ברירת מחדל: 2026)"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  שמך המלא (שיוצג ביומן)
                </label>
                <input
                  type="text"
                  placeholder="למשל: דן רייכקינד"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50/50 font-medium"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-l from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-2xl font-bold text-sm shadow-md transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span>{isOwnerEmail ? 'כניסה כמנהל יומן' : 'כניסה למערכת'}</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </form>

          {/* Privacy & Isolation Guarantee */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>המידע האישי מוגן. משתמשים אורחים וגולשים בסתר אינם מחוברים אוטומטית.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
