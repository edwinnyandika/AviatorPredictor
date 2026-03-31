'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

type TranslationKeys = 'hero_title' | 'hero_subtitle' | 'play_now' | 'live_desk' | 'settings' | 'history' | 'referrals' | 'pricing';

type LangObj = Record<TranslationKeys, string>;

const DICT: Record<string, LangObj> = {
  en: {
    hero_title: 'Unfair Advantage for Crash Games',
    hero_subtitle: 'The only live interceptor that reads the market.',
    play_now: 'Access Dashboard',
    live_desk: 'Live Desk',
    settings: 'Settings',
    history: 'Session Vault',
    referrals: 'Invite Friends',
    pricing: 'Upgrade PRO'
  },
  sw: {
    hero_title: 'Shinda Aviator Kirahisi Kila Wakati',
    hero_subtitle: 'Mitambo ya kisasa ya kusoma mwendo wa ndege.',
    play_now: 'Ingia Sasa',
    live_desk: 'Ubao Moja kwa Moja',
    settings: 'Mipangilio',
    history: 'Mkeka wa Zamani',
    referrals: 'Waalike Marafiki',
    pricing: 'Nunua PRO'
  }
};

const RATES: Record<string, number> = {
  USD: 1,
  KES: 132.50,
  TZS: 2580.00,
  UGX: 3800.00,
  NGN: 1350.00
};

type I18nContextType = {
  locale: string;
  setLocale: (l: string) => void;
  currency: string;
  setCurrency: (c: string) => void;
  t: (key: TranslationKeys) => string;
  formatMoney: (usdValue: number) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocale] = useState('en');
  const [currency, setCurrency] = useState('KES');
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, 'users_profile', user.uid));
        if (snap.exists() && snap.data()?.preferences) {
          const prefs = snap.data().preferences;
          if (prefs.language) setLocale(prefs.language);
          if (prefs.currency) setCurrency(prefs.currency);
        }
      }
    });
    return () => unsub();
  }, []);

  const t = (key: TranslationKeys) => {
    const dict = DICT[locale] || DICT['en'];
    return dict[key] || DICT['en'][key] || key;
  };

  const formatMoney = (usdValue: number) => {
    const rate = RATES[currency] || 1;
    const val = usdValue * rate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, currency, setCurrency, t, formatMoney }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
};
