'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import styles from './page.module.css';

type Casino = {
  id: string;
  name: string;
  country: string;
  currency: string;
  status: 'active' | 'beta' | 'coming_soon';
  wss_pattern?: string;
};

type ScriptData = {
  casino_id: string;
  casino_name: string;
  script: string;
  instructions: string[];
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Live',
  beta: 'Beta',
  coming_soon: 'Soon',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#5cdb95',
  beta: '#ffa726',
  coming_soon: '#666',
};

const CASINO_ICONS: Record<string, string> = {
  sportpesa: '🏆',
  betika: '⚡',
  mozzart: '🎯',
  '1xbet': '🔥',
  betway: '💎',
  odibets: '🚀',
};

export default function CasinoPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Casino | null>(null);
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'select' | 'script'>(('select'));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/auth?mode=login');
      else setAuthChecked(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    fetch('/api/casinos')
      .then((r) => r.json())
      .then((data) => setCasinos(data.casinos || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectCasino = useCallback(async (casino: Casino) => {
    if (casino.status === 'coming_soon') return;
    setSelected(casino);
    setStep('script');
    setScriptLoading(true);
    setScriptData(null);

    try {
      const res = await fetch(`/api/casino/script/${casino.id}`);
      const data = await res.json();
      setScriptData(data);
    } catch (err) {
      console.error('Script fetch failed', err);
    } finally {
      setScriptLoading(false);
    }
  }, []);

  const copyScript = useCallback(async () => {
    if (!scriptData?.script) return;
    await navigator.clipboard.writeText(scriptData.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [scriptData]);

  const launchDashboard = useCallback(() => {
    if (!selected) return;
    // Store active casino in localStorage for dashboard
    localStorage.setItem('aviatoriq_casino', selected.id);
    router.push('/dashboard');
  }, [selected, router]);

  if (!authChecked) {
    return <div className={styles.loading}>Authenticating...</div>;
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Dashboard
        </Link>
        <div className={styles.navBrand}>
          <span>aviator</span><span className={styles.brandIQ}>IQ</span>
        </div>
      </nav>

      <div className={styles.container}>
        {step === 'select' ? (
          <>
            <div className={styles.header}>
              <div className={styles.badge}>Phase 1 — Kenya / Africa</div>
              <h1 className={styles.title}>Select Your Casino</h1>
              <p className={styles.subtitle}>
                Pick your casino. We&apos;ll generate a custom console script that hooks into the live Aviator game.
              </p>
            </div>

            {loading ? (
              <div className={styles.casinoGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`${styles.casinoCard} ${styles.skeleton}`} />
                ))}
              </div>
            ) : (
              <div className={styles.casinoGrid}>
                {casinos.map((casino) => (
                  <button
                    key={casino.id}
                    className={`${styles.casinoCard} ${casino.status === 'coming_soon' ? styles.disabled : ''} ${selected?.id === casino.id ? styles.cardSelected : ''}`}
                    onClick={() => selectCasino(casino)}
                    disabled={casino.status === 'coming_soon'}
                  >
                    <div className={styles.cardInner}>
                      <div className={styles.casinoIcon}>{CASINO_ICONS[casino.id] || '🎮'}</div>
                      <div className={styles.casinoInfo}>
                        <div className={styles.casinoName}>{casino.name}</div>
                        <div className={styles.casinoCurrency}>{casino.country} · {casino.currency}</div>
                      </div>
                      <div
                        className={styles.statusBadge}
                        style={{ color: STATUS_COLORS[casino.status] }}
                      >
                        <span
                          className={styles.statusDot}
                          style={{ background: STATUS_COLORS[casino.status] }}
                        />
                        {STATUS_LABELS[casino.status]}
                      </div>
                    </div>
                    {casino.status !== 'coming_soon' && (
                      <div className={styles.cardArrow}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={styles.scriptPanel}>
            <button className={styles.backBtn} onClick={() => { setStep('select'); setScriptData(null); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to casino list
            </button>

            <div className={styles.scriptHeader}>
              <div className={styles.casinoIcon} style={{ fontSize: '2.5rem' }}>
                {CASINO_ICONS[selected?.id || ''] || '🎮'}
              </div>
              <div>
                <h2 className={styles.scriptTitle}>{selected?.name} Console Script</h2>
                <p className={styles.scriptSub}>Follow the steps below to activate live data capture</p>
              </div>
            </div>

            {scriptLoading ? (
              <div className={styles.scriptSkeleton}>Generating script...</div>
            ) : scriptData ? (
              <>
                {/* Instructions */}
                <div className={styles.instructions}>
                  {scriptData.instructions.map((step, i) => (
                    <div key={i} className={styles.instructionStep}>
                      <div className={styles.stepNum}>{i + 1}</div>
                      <div className={styles.stepText}>{step}</div>
                    </div>
                  ))}
                </div>

                {/* Script Block */}
                <div className={styles.scriptBox}>
                  <div className={styles.scriptBoxHeader}>
                    <span>Console Script — paste in DevTools</span>
                    <button className={`${styles.copyBtn} ${copied ? styles.copySuccess : ''}`} onClick={copyScript}>
                      {copied ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          Copy Script
                        </>
                      )}
                    </button>
                  </div>
                  <pre className={styles.scriptCode}>{scriptData.script}</pre>
                </div>

                {/* CTA */}
                <div className={styles.ctaRow}>
                  <button className={styles.launchBtn} onClick={launchDashboard}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    Open Live Dashboard
                  </button>
                  <p className={styles.ctaHint}>Paste the script first, then open the dashboard for live predictions</p>
                </div>
              </>
            ) : (
              <div className={styles.scriptError}>Failed to generate script. Check your backend connection.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
