'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useSqlite } from '@/hooks/useSqlite';
import { useTFJS } from '@/hooks/useTFJS';
import { useMonteCarlo } from '@/hooks/useMonteCarlo';
import styles from './page.module.css';

const riskTone = { LOW: 'positive', NEUTRAL: 'info', HIGH: 'danger' };

type DashboardStats = {
  totalRounds?: number;
  avgCrash?: number;
  safe80th?: number;
  lastCrash?: number;
  lastUpdated?: string | number;
  recent10?: number[];
  prediction?: DashboardPrediction;
};

type DashboardPrediction = {
  confidence?: number;
  riskLevel?: 'LOW' | 'NEUTRAL' | 'HIGH' | string;
  safeCashout?: number;
  signals?: string[];
  nextRange?: [number, number];
  betRecommendation?: string;
};

type HistoryEntry = {
  crash: number;
  ts?: number | string;
};

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stdev(values: number[]): number {
  if (!values.length) return 0;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
}

function fmt(value, digits = 2) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}x` : '--';
}

function linePath(values, width = 720, height = 210) {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 24) - 12;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

const CASINO_NAMES: Record<string, string> = {
  sportpesa: 'SportPesa',
  betika: 'Betika',
  mozzart: 'Mozzart Bet',
  '1xbet': '1xBet',
  betway: 'Betway',
  odibets: 'OdiBets',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prediction, setPrediction] = useState<DashboardPrediction | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [manualVal, setManualVal] = useState('');
  const [riskProfile, setRiskProfile] = useState('BALANCED');
  const [themeMode, setThemeMode] = useState('dark');
  const [sessionStartedAt] = useState(() => Date.now());
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashCrash, setFlashCrash] = useState<number | null>(null);
  const [connectedCasinos] = useState(['sportpesa']);
  const [activeCasino, setActiveCasino] = useState('sportpesa');
  const [backendStatus, setBackendStatus] = useState<'online' | 'waking'>('online');
  const [lastRoundAt, setLastRoundAt] = useState(Date.now());
  const [streakToast, setStreakToast] = useState<{msg: string, title: string} | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  // Read active casino from localStorage (set by casino selector page)
  useEffect(() => {
    const stored = localStorage.getItem('aviatoriq_casino');
    if (stored) setActiveCasino(stored);
  }, []);

  const { isReady: isDbReady, insertTick, getAllTicks } = useSqlite() as unknown as {
    isReady: boolean;
    insertTick: (provider: string, type: string, value: number) => void;
    getAllTicks: () => any[];
  };
  const { model: tfModel, isTraining, distribution, trainModel, getProbabilityDistribution } = useTFJS() as unknown as {
    model: any;
    isTraining: boolean;
    distribution: any[];
    trainModel: (ticks: any[]) => void;
    getProbabilityDistribution: (ticks: any[]) => Promise<any>;
  };
  const { metrics: mcMetrics, isSimulating: mcSimulating } = useMonteCarlo(distribution) as unknown as {
    metrics: any;
    isSimulating: boolean;
  };

  const refresh = useCallback(async () => {
    try {
      const casino = localStorage.getItem('aviatoriq_casino') || 'sportpesa';
      const qs = casino ? `?casino_id=${casino}` : '';
      const [statsRes, historyRes] = await Promise.all([
        fetch(`/api/stats${qs}`, { cache: 'no-store' }),
        fetch(`/api/history${qs}`, { cache: 'no-store' }),
      ]);
      if (!statsRes.ok || !historyRes.ok) throw new Error("API Offline");
      const statsData = await statsRes.json();
      const historyData = await historyRes.json();
      setStats(statsData);
      setPrediction(statsData.prediction);
      setHistoryEntries(historyData.history || []);
      setBackendStatus('online');
    } catch (error) {
      setBackendStatus('waking');
      console.error('Dashboard refresh failed', error);
    }
  }, []);

  useEffect(() => () => {
    if (flashRef.current) clearTimeout(flashRef.current);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth?mode=login');
        return;
      }
      
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const profileSnap = await getDoc(doc(db, 'users_profile', user.uid));
        
        if (!profileSnap.exists() || !profileSnap.data().onboarding_completed) {
          router.replace('/onboarding');
          return;
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
      
      setAuthChecked(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    refresh();
    const es = new EventSource('/api/stream');
    es.addEventListener('connected', () => setConnected(true));
    es.addEventListener('crash', async (event) => {
      const payload = JSON.parse(event.data);
      setPrediction(payload.prediction);
      setFlashCrash(payload.crash);
      setLastRoundAt(Date.now());
      if (flashRef.current) clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setFlashCrash(null), 1200);

      const latestVal = payload.crash;
      setHistoryEntries(prev => {
        const next = [...prev, { crash: latestVal, ts: Date.now() }];
        // Check gamified streaks on the new array
        let currentLow = 0;
        for (let i = next.length - 1; i >= 0 && next[i].crash < 2; i -= 1) currentLow++;
        if (latestVal < 2) {
            if (currentLow === 5) setStreakToast({ title: 'Streak Milestone', msg: '5 consecutive rounds under 2x — watch out' });
            if (currentLow === 10) setStreakToast({ title: 'Historic Low', msg: '10 round low streak — historically unusual' });
            if (currentLow === 15) setStreakToast({ title: 'Market Crash', msg: '15 round low streak — extreme event' });
        }
        return next;
      });

      if (isDbReady) {
        insertTick('spribe', 'crash', payload.crash);
        if (tfModel) {
          const ticks = [...getAllTicks()].reverse();
          if (ticks.length >= 15) {
            await getProbabilityDistribution(ticks);
            trainModel(ticks);
          }
        }
      }

      // Hide toast after 8 seconds — done via useEffect watching streakToast

      refresh();
    });
    es.onerror = () => setConnected(false);
    const poll = setInterval(refresh, 7000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [getAllTicks, getProbabilityDistribution, insertTick, isDbReady, refresh, tfModel, trainModel]);

  // Auto-dismiss streak toasts
  useEffect(() => {
    if (!streakToast) return;
    const t = setTimeout(() => setStreakToast(null), 8000);
    return () => clearTimeout(t);
  }, [streakToast]);

  const submitManual = useCallback(async () => {
    const value = parseFloat(manualVal);
    if (!value || value < 1) return;
    await fetch('/api/crash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier: value, source: 'manual' }),
    });
    setManualVal('');
    refresh();
  }, [manualVal, refresh]);

  const exportCsv = useCallback(() => {
    if (!isDbReady) return;
    const rows = getAllTicks();
    const csv = ['ID,Provider,Type,Multiplier,Timestamp', ...rows.map((row) => `${row.id},${row.provider},${row.type},${row.value},${row.timestamp}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aviator-session-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [getAllTicks, isDbReady]);

  if (!authChecked) return <div className={styles.loading}>Authenticating dashboard...</div>;

  const values = historyEntries.map((entry) => entry.crash);
  const recent = values.slice(-12).reverse();
  const trend = values.slice(-50);
  const lowStreak = (() => {
    let count = 0;
    for (let i = values.length - 1; i >= 0 && values[i] < 2; i -= 1) count += 1;
    return count;
  })();
  const spikes = values.filter((value) => value >= 10).length;
  const dist = [
    { label: '1.0 - 1.9x', value: values.filter((value) => value < 2).length, tone: styles.distMuted },
    { label: '2.0 - 4.9x', value: values.filter((value) => value >= 2 && value < 5).length, tone: styles.distInfo },
    { label: '5.0 - 9.9x', value: values.filter((value) => value >= 5 && value < 10).length, tone: styles.distPositive },
    { label: '10x +', value: values.filter((value) => value >= 10).length, tone: styles.distAccent },
  ];
  const total = Math.max(values.length, 1);
  const volatility = Math.min(100, Math.round((stdev(values.slice(-20)) / Math.max(avg(values.slice(-20)), 1)) * 100));
  const spikeProbability = Math.min(100, Math.round((lowStreak * 8) + ((prediction?.confidence || 0) * 35)));
  const tone = riskTone[(prediction?.riskLevel as keyof typeof riskTone) || 'NEUTRAL'] || 'info';
  const safeCashout = prediction?.safeCashout || 1.8;
  const adjustedCashout = riskProfile === 'AGGRESSIVE' ? safeCashout * 1.2 : riskProfile === 'CONSERVATIVE' ? Math.max(1.1, safeCashout * 0.82) : safeCashout;
  const sessionMinutes = Math.max(1, Math.floor((Date.now() - sessionStartedAt) / 60000));
  const heatmap = Array.from({ length: 24 }, (_, index) => {
    const slice = values.slice(index * Math.max(1, Math.ceil(values.length / 24)), (index + 1) * Math.max(1, Math.ceil(values.length / 24)));
    return avg(slice);
  });
  const heatMin = Math.min(...heatmap, 0);
  const heatMax = Math.max(...heatmap, 1);
  const path = linePath(trend);

  const isStale = Date.now() - lastRoundAt > 60000;
  
  // Status Indicator Logic
  let statusText = "Connected — receiving live data";
  let statusColor = "#128261";
  let statusBg = "rgba(29, 158, 117, 0.12)";
  
  if (!connected) {
    statusText = "Disconnected — click to reconnect";
    statusColor = "#ef4444";
    statusBg = "rgba(239, 68, 68, 0.12)";
  } else if (isStale) {
    statusText = "No data in last 60s — game open?";
    statusColor = "#f59e0b";
    statusBg = "rgba(245, 158, 11, 0.12)";
  }

  const handleAddCasino = () => {
    alert("Track multiple casinos with PRO. Upgrade now to combine live signals.");
  };

  return (
    <div className={styles.wrapper} data-theme={themeMode}>
      {backendStatus === 'waking' && (
        <div className={styles.offlineBanner}>
          <div className={styles.offlineSpinner} />
          Backend is waking up... this takes ~30 seconds on free tier
        </div>
      )}
      
      {streakToast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--clr-panel)', border: '1px solid var(--clr-accent)', padding: 16, borderRadius: 12, zIndex: 99, animation: 'fadeUp 0.3s' }}>
          <h4 style={{ color: 'var(--clr-accent)', marginBottom: 4 }}>🚀 {streakToast.title}</h4>
          <p style={{ fontSize: '0.85rem' }}>{streakToast.msg}</p>
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setModalOpen(false)}>
           <div style={{ width: 400, background: 'var(--clr-panel)', borderRadius: 24, padding: 32, border: '1px solid var(--clr-border)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: 16, fontFamily: 'var(--font-heading)' }}>Signal Analysis</h2>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>This is statistical analysis, not a prediction. The game uses RNG.</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <strong style={{ color: 'var(--clr-accent)' }}>Why {prediction?.riskLevel}?</strong>
                <p style={{ marginTop: 8, fontSize: '0.85rem' }}>{prediction?.signals?.[0] || 'Based on recent string of low streak pressures pushing standard deviation outside normal boundaries.'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ width: '100%', padding: '12px', background: 'var(--clr-border)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 'bold' }}>Close</button>
           </div>
        </div>
      )}

      <section className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div>
            <div className={styles.eyebrow}>Live Desk</div>
            <div className={styles.logo}>aviator<span>IQ</span></div>
          </div>
          <Link href="/onboarding" className={styles.livePill} style={{ color: statusColor, background: statusBg }}>
            <span className={styles.liveDot} style={{ animation: connected && !isStale ? 'pulse 1.5s infinite' : 'none', background: statusColor }} />
            {statusText}
          </Link>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 12 }}>
            {connectedCasinos.map(c => (
              <button key={c} onClick={() => setActiveCasino(c)} className={`${styles.casinoPill} ${activeCasino === c ? styles.casinoPillActive : ''}`}>
                {CASINO_NAMES[c] || c} {activeCasino === c && '●'}
              </button>
            ))}
            <button className={styles.casinoPill} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--clr-text-muted)' }} onClick={handleAddCasino}>+</button>
          </div>
        </div>
        <div className={styles.topbarRight}>
          <div className={styles.sessionTime}>Session {sessionMinutes} min | Round #{stats?.totalRounds ?? 0}</div>
          <div className={styles.avatar}>AI</div>
        </div>
      </section>

      <section className={styles.hero}>
        <div>
          <div className={styles.heroLabel}>Operator Surface</div>
          <h1 className={styles.heroTitle}>Sharper dashboard typography, cleaner tools, better live readability.</h1>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroCard}><span>Target cashout</span><strong>{fmt(adjustedCashout)}</strong></div>
          <div className={styles.heroCard}><span>Risk posture</span><strong className={styles[`tone${tone}`]}>{prediction?.riskLevel || 'NEUTRAL'}</strong></div>
        </div>
      </section>

      <section className={styles.recentBar}>
        <div className={styles.recentLabel}>Last 12 rounds</div>
        <div className={styles.recentTrack}>
          {recent.map((value, index) => <div key={`${value}-${index}`} className={`${styles.multBubble} ${value >= 10 ? styles.bubbleSpike : value >= 5 ? styles.bubbleHigh : value >= 2 ? styles.bubbleMid : styles.bubbleLow}`}>{value.toFixed(1)}x</div>)}
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}><div className={styles.metricLabel}>Session average</div><div className={styles.metricValue}>{fmt(stats?.avgCrash || avg(values))}</div><div className={styles.metricDelta}>Live session mean</div></div>
        <div className={styles.metricCard}><div className={styles.metricLabel}>Rounds tracked</div><div className={styles.metricValue}>{stats?.totalRounds ?? 0}</div><div className={styles.metricDelta}>Current archive</div></div>
        <div className={styles.metricCard}><div className={styles.metricLabel}>Low streak</div><div className={styles.metricValue}>{lowStreak} rounds</div><div className={styles.metricDelta}>{lowStreak >= 4 ? 'Risk rising' : 'Contained'}</div></div>
        <div className={styles.metricCard}><div className={styles.metricLabel}>10x spikes</div><div className={styles.metricValue}>{spikes}</div><div className={styles.metricDelta}>High multiplier hits</div></div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Multiplier trend</div>
          <div className={styles.chartArea}>
            {path ? (
              <svg viewBox="0 0 720 210" className={styles.chartSvg} preserveAspectRatio="none">
                <path d={`${path} L 720 210 L 0 210 Z`} className={styles.chartFill} />
                <path d={path} className={styles.chartLine} />
              </svg>
            ) : <div className={styles.emptyState}>Waiting for enough live rounds to draw the trend.</div>}
          </div>
          {flashCrash ? <div className={styles.impact}>Impact {fmt(flashCrash)}</div> : null}
        </div>

        <div className={styles.sideStack}>
          <div className={styles.signalCard}>
            <div className={styles.signalHeader}>
              <div className={styles.signalName}>Current signal</div>
              <button onClick={() => setModalOpen(true)} style={{ background: 'transparent', border: '1px solid var(--clr-border)', color: 'white', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: '10px' }}>i</button>
              <div className={`${styles.signalBadge} ${styles[`badge${tone}`]}`}>{prediction?.riskLevel || 'Neutral'}</div>
            </div>
            <div className={styles.confidenceLabel}><span>Confidence</span><span>{Math.round((prediction?.confidence || 0) * 100)}%</span></div>
            <div className={styles.confidenceTrack}><div className={`${styles.confidenceFill} ${styles[`fill${tone}`]}`} style={{ width: `${Math.round((prediction?.confidence || 0) * 100)}%` }} /></div>
            <div className={styles.signalReason}>{prediction?.signals?.[0] || 'Signal feed will strengthen as live history grows.'}</div>
          </div>
          <div className={styles.signalCard}>
            <div className={styles.signalHeader}><div className={styles.signalName}>Volatility index</div><div className={`${styles.signalBadge} ${styles.badgeInfo}`}>{volatility > 55 ? 'Active' : 'Stable'}</div></div>
            <div className={styles.confidenceLabel}><span>Level</span><span>{volatility}%</span></div>
            <div className={styles.confidenceTrack}><div className={`${styles.confidenceFill} ${styles.fillInfo}`} style={{ width: `${volatility}%` }} /></div>
            <div className={styles.signalReason}>Dispersion across recent rounds is driving this read.</div>
          </div>
          <div className={styles.signalCard}>
            <div className={styles.signalHeader}><div className={styles.signalName}>Spike probability</div><div className={`${styles.signalBadge} ${styles.badgeAccent}`}>{spikeProbability >= 65 ? 'Elevated' : 'Watching'}</div></div>
            <div className={styles.confidenceLabel}><span>Score</span><span>{spikeProbability}%</span></div>
            <div className={styles.confidenceTrack}><div className={`${styles.confidenceFill} ${styles.fillAccent}`} style={{ width: `${spikeProbability}%` }} /></div>
            <div className={styles.signalReason}>Low-streak pressure and signal confidence are pushing this score.</div>
          </div>
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Distribution</div>
          {dist.map((row) => <div key={row.label} className={styles.histRow}><div className={styles.histRange}>{row.label}</div><div className={styles.histBarWrap}><div className={`${styles.histBar} ${row.tone}`} style={{ width: `${Math.round((row.value / total) * 100)}%` }} /></div></div>)}
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Streak stats</div>
          <div className={styles.streakRow}><span>Safe 80th</span><strong>{fmt(stats?.safe80th || 0)}</strong></div>
          <div className={styles.streakRow}><span>Last crash</span><strong>{fmt(stats?.lastCrash || 0)}</strong></div>
          <div className={styles.streakRow}><span>Projected range</span><strong>{prediction?.nextRange ? `${fmt(prediction.nextRange[0])} - ${fmt(prediction.nextRange[1])}` : '--'}</strong></div>
          <div className={styles.streakRow}><span>Monte Carlo</span><strong>{mcSimulating ? 'Running' : mcMetrics ? `KSh ${mcMetrics.lower95}-${mcMetrics.upper95}` : 'Pending'}</strong></div>
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Daily heatmap</div>
          <div className={styles.heatmapGrid}>
            {heatmap.map((value, index) => {
              const ratio = (value - heatMin) / ((heatMax - heatMin) || 1);
              const variant = ratio < 0.35 ? styles.hmCool : ratio < 0.7 ? styles.hmWarm : styles.hmHot;
              return <div key={index} className={`${styles.hmCell} ${variant}`} style={{ opacity: 0.16 + ratio * 0.84 }} title={fmt(value || 0)} />;
            })}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Tools and controls</div>
          <div className={styles.toolRow}>
            <Link href="/dashboard/tools" className={styles.toolButton}>Open tools</Link>
            <Link href="/dashboard/history" className={styles.toolButton}>History</Link>
          </div>
          <div className={styles.toolRow}>
            <button className={styles.toolButton} onClick={exportCsv}>Export CSV</button>
            <Link href="/dashboard/settings" className={styles.toolButton}>Settings</Link>
          </div>
          <div className={styles.toolRow}>
            <select value={riskProfile} onChange={(event) => setRiskProfile(event.target.value)} className={styles.select}>
              <option value="CONSERVATIVE">Conservative</option>
              <option value="BALANCED">Balanced</option>
              <option value="AGGRESSIVE">Aggressive</option>
              <option value="PAPER">Paper</option>
            </select>
            <select value={themeMode} onChange={(event) => setThemeMode(event.target.value)} className={styles.select}>
              <option value="dark">Dark studio</option>
              <option value="light">Soft light</option>
              <option value="obsidian">Obsidian</option>
            </select>
          </div>
          <div className={styles.manualRow}>
            <input className={styles.manualInput} type="number" min="1" step="0.01" value={manualVal} onChange={(event) => setManualVal(event.target.value)} placeholder="Verified round result" />
            <button className={styles.primaryButton} onClick={submitManual}>Log</button>
          </div>
          <div className={styles.aiPanel}>
            <div><span>SQLite</span><strong>{isDbReady ? 'Ready' : 'Standby'}</strong></div>
            <div><span>TF.js</span><strong>{isTraining ? 'Training' : 'Idle'}</strong></div>
            <div><span>Signal buckets</span><strong>{distribution?.length || 0}</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
