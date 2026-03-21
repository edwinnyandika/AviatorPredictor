'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useSqlite } from '@/hooks/useSqlite';
import { useTFJS } from '@/hooks/useTFJS';
import { useMonteCarlo } from '@/hooks/useMonteCarlo';
import FlightTracker3D from '@/components/FlightTracker3D';

const RISK_COLOR = { LOW: '#00ff88', NEUTRAL: '#ffb800', HIGH: '#ff3366' };
const BET_COLOR  = { FULL_BET: '#00ff88', HALF_BET: '#ffb800', SKIP: '#ff3366', WAIT: '#8a8f9c', AGGRESSIVE: '#ff0055', CONSERVATIVE: '#00aaff' };

export default function Dashboard() {
  const [stats, setStats]         = useState(null);
  const [prediction, setPrediction]= useState(null);
  const [history, setHistory]     = useState([]);
  const [connected, setConnected] = useState(false);
  const [simActive, setSimActive] = useState(false);
  const [flashCrash, setFlash]    = useState(null);
  const [authChecked, setAuthChecked]= useState(false);
  const [dbStatus, setDbStatus]   = useState('STANDBY'); 
  const [riskProfile, setRiskProfile] = useState('BALANCED'); // AGGRESSIVE, CONSERVATIVE, PAPER
  const [themeMode, setThemeMode] = useState('DARK'); // DARK, LIGHT, NEON
  const simRef = useRef(null);
  const router = useRouter();
  
  // Phase 7: SQLite DB Hook
  const { isReady: isDbReady, insertTick, getAllTicks } = useSqlite();
  
  // Phase 8: TensorFlow.js Distribution Tensors
  const { model: tfModel, isTraining, distribution, trainModel, getProbabilityDistribution } = useTFJS();
  
  // Phase 9: Monte Carlo (10k Parallel Simulations)
  const { metrics: mcMetrics, isSimulating: mcSimulating } = useMonteCarlo(distribution);

  useEffect(() => {
    if (isDbReady && tfModel) setDbStatus('SQLITE + TF.JS ACTIVE');
    else if (isDbReady) setDbStatus('SQLITE COMPILED');
  }, [isDbReady, tfModel]);

  // ── Auth Guard ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth?mode=login');
      } else {
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, [router]);

   // ── Fetch stats via polling (fallback) ─────────────────────────
   const fetchStats = useCallback(async () => {
     try {
       const res  = await fetch('/api/stats');
       const data = await res.json();
       setStats(data);
       setPrediction(data.prediction);
       setHistory(data.recent10 || []);
     } catch {}
   }, []); // Note: We are intentionally leaving the array empty because this function does not depend on any props or state.

  // ── Server-Sent Events (live push from backend) ─────────────────
  useEffect(() => {
    fetchStats();
    const es = new EventSource('/api/stream');

          es.addEventListener("connected", () => setConnected(true));
          es.addEventListener("crash", async (e) => {
      const d = JSON.parse(e.data);
      setFlash(d.crash);
      
      // Phase 7 SQLite Ingestion: Persist crash directly into OPFS Ledger
      if (isDbReady) {
        insertTick('spribe', 'crash', d.crash);
        
        // Phase 8: Trigger localized deep-learning tensor analysis
        if (tfModel) {
            const buffer = getAllTicks();
            // Reverse to ensure chronological ordering for sequence (oldest -> newest)
            const chronologicalTicks = [...buffer].reverse(); 
            
            if (chronologicalTicks.length >= 15) {
                await getProbabilityDistribution(chronologicalTicks);
                // Background train the LSTM without waiting
                trainModel(chronologicalTicks);
            }
        }
      }
      
      setTimeout(() => setFlash(null), 1200);
      setPrediction(d.prediction);
      fetchStats();
    });
    es.onerror = () => setConnected(false);

    // Also poll every 5s as backup
    const poll = setInterval(fetchStats, 5000);
    return () => { es.close(); clearInterval(poll); };
  }, [fetchStats]);

  // ── Simulation mode ────────────────────────────────────────────
  const toggleSim = useCallback(() => {
    if (simActive) {
      clearInterval(simRef.current);
      setSimActive(false);
    } else {
      setSimActive(true);
      simRef.current = setInterval(async () => {
        const u     = Math.random();
        const crash = u >= 0.99 ? 1.0 : Math.round(Math.min(1 / (1 - u) * 0.99, 250) * 100) / 100;
        await fetch('/api/crash', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ multiplier: crash, source: 'sim' }),
        });
      }, 3000 + Math.random() * 5000); // Trigger slightly faster for demo purposes
    }
  }, [simActive]);

  // ── Manual crash entry ─────────────────────────────────────────
  const submitManual = useCallback(async () => {
    const v = parseFloat(manualVal);
    if (!v || v < 1.0) return;
    await fetch('/api/crash', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ multiplier: v, source: 'manual' }),
    });
    setManualVal('');
    fetchStats();
  }, [manualVal, fetchStats]);

  const pred = prediction || {};
  const riskColor = RISK_COLOR[pred.riskLevel] || '#ffb800';
  
  // Apply Multi-Account Risk Profile modifications
  let currentBetRecomm = pred.betRecommendation?.replace('_', ' ') || 'STANDBY';
  let adjustedSafeCashout = pred.safeCashout;
  if (riskProfile === 'AGGRESSIVE') {
     adjustedSafeCashout = (pred.safeCashout || 1.2) * 1.5;
     currentBetRecomm = 'MAX ALLOCATION';
  } else if (riskProfile === 'CONSERVATIVE') {
     adjustedSafeCashout = Math.max(1.1, (pred.safeCashout || 1.2) * 0.7);
     currentBetRecomm = '1/4 KELLY';
  } else if (riskProfile === 'PAPER') {
     currentBetRecomm = '[SIMULATION BET]';
  }

  const betColor  = BET_COLOR[currentBetRecomm.replace(' ', '_')] || '#8a8f9c';

  // ── CSV Export Function (SQLite Extraction) ──
  const triggerCSVExport = useCallback(() => {
     if (!isDbReady) return;
     const ticks = getAllTicks();
     const header = "ID,Provider,Type,Multiplier,Timestamp\n";
     const csv = header + ticks.map(t => `${t.id},${t.provider},${t.type},${t.value},${t.timestamp}`).join('\n');
     const blob = new Blob([csv], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `Aviator_Risk_Report_${Date.now()}.csv`;
     a.click();
  }, [isDbReady, getAllTicks]);

  if (!authChecked) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--clr-bg)', color: 'var(--clr-text)' }}>Authenticating...</div>;
  }

  // Dynamic Theme Styling
  const themeStyles = themeMode === 'LIGHT' 
       ? { background: '#f5f5f7', color: '#111' } 
       : themeMode === 'NEON' ? { background: '#0a0a0f', color: '#00ffcc' } 
       : {}; // Base Dark Mode

  return (
    <div className={styles.wrapper} style={themeStyles}>
      {/* Header */}
      <header className={styles.header}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/" className={styles.backLink}>
            <span>←</span> Back
          </Link>
          <div className={styles.logo}>
            <img src="/icon.svg" width={24} height={24} alt="Icon" />
            <span className="gradient-text">AviatorAI</span>
            <span style={{ color: 'var(--clr-muted)', fontWeight: 600, fontSize: '0.9rem' }}>TERMINAL</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className={`${styles.connBadge} ${isDbReady ? styles.live : styles.offline}`}>
             SQLITE: {dbStatus}
          </div>
          <div className={`${styles.connBadge} ${connected ? styles.live : styles.offline}`}>
            <span className={styles.connDot} />
            {connected ? 'LIVE CONNECTION' : 'CONNECTING...'}
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── TOP ROW ── */}
        <div className={styles.topRow}>

          {/* AI Prediction Card */}
          <div className={`${styles.predCard} card`} style={{ borderColor: riskColor + '55', boxShadow: `0 8px 32px ${riskColor}22` }}>
            <div>
              <div className={styles.predLabel}>Target Cashout Signal [{riskProfile}]</div>
              <div className={styles.predValue} style={{ color: riskColor }}>
                {adjustedSafeCashout ? `${adjustedSafeCashout.toFixed(2)}x` : 'CALCULATING'}
              </div>
              <div className={styles.predRange}>
                Projected Range: {pred.nextRange ? `${pred.nextRange[0]}x — ${pred.nextRange[1]}x` : 'Awaiting data...'}
              </div>
            </div>
            
            <div className={styles.predMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLbl}>Confidence</span>
                <span className={styles.metaVal} style={{ color: pred.confidence > 0.7 ? 'var(--clr-green)' : 'var(--clr-text)'}}>
                  {pred.confidence ? `${Math.round(pred.confidence * 100)}%` : '–'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLbl}>RSI Indicator</span>
                <span className={styles.metaVal}>{pred.rsi ?? '–'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLbl}>EMA (10)</span>
                <span className={styles.metaVal}>{pred.ema10 ? `${pred.ema10}x` : '–'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLbl}>Kelly Bet Size</span>
                <span className={styles.metaVal} style={{ color: 'var(--clr-accent)'}}>{pred.kellySizing ?? '–'}</span>
              </div>
            </div>
          </div>

          {/* Risk + Bet Action */}
          <div className={`${styles.actionCard} card`}>
            <div className={styles.actionHeader}>
              <div>
                <div className={styles.actionLbl}>Current Risk</div>
                <div className={styles.actionRisk} style={{ color: riskColor }}>
                  {pred.riskLevel || 'UNKNOWN'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={styles.actionLbl}>Execution</div>
                <div className={styles.actionBet} style={{ color: betColor }}>
                  {currentBetRecomm}
                </div>
              </div>
            </div>

            <div className={styles.signals}>
              <div className={styles.signalsHeader}>Algorithmic Signals</div>
              {(pred.signals || ['Initializing neural engine array...']).map((s, i) => (
                <div key={i} className={styles.signalItem}>{s}</div>
              ))}
            </div>

            <div className={styles.cycleBadge}>
              <span style={{color: 'var(--clr-green)'}}>●</span> Active Cycle: <strong>{pred.cycle || '–'}</strong> 
              &nbsp;&nbsp;|&nbsp;&nbsp; Data: <strong>{pred.dataPoints || 0}</strong> points
            </div>
            
            {/* Phase 8: TensorFlow.js Probability Tensor Output */}
            <div className={styles.tfDistBlock} style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--clr-accent)', letterSpacing: '1px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>LSTM Probability Distribution</span>
                {isTraining && <span style={{ color: 'var(--clr-green)', animation: 'pulse 1.5s infinite' }}>TRAINING...</span>}
              </div>
              
              {!distribution ? (
                  <div style={{ fontSize: '12px', color: 'var(--clr-muted)' }}>Awaiting {'>='} 15 SQL shards...</div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     {distribution.map((bucket, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <span style={{ width: '85px', fontSize: '11px', color: 'var(--clr-muted)' }}>{bucket.label}</span>
                           <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.max(2, bucket.probability)}%`, height: '100%', backgroundColor: bucket.probability > 30 ? 'var(--clr-green)' : 'var(--clr-accent)', transition: 'width 0.4s ease' }} />
                           </div>
                           <span style={{ width: '35px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>{bucket.probability}%</span>
                        </div>
                     ))}
                  </div>
              )}
            </div>
            
            {/* Phase 9: Monte Carlo Risk Metrics (WebWorker) */}
            <div className={styles.mcRiskBlock} style={{ marginTop: '20px', padding: '16px', background: 'rgba(50,20,20,0.5)', borderRadius: '12px', border: '1px solid rgba(255,50,50,0.2)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--clr-red)', letterSpacing: '1px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Monte Carlo 10k Simulation</span>
                {mcSimulating && <span style={{ color: 'var(--clr-red)', animation: 'pulse 1.5s infinite' }}>COMPUTING...</span>}
              </div>
              
              {!mcMetrics ? (
                  <div style={{ fontSize: '12px', color: 'var(--clr-muted)' }}>Awaiting TF.js Tensor Distribution...</div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ color: 'var(--clr-muted)' }}>Probability of Ruin:</span>
                       <strong style={{ color: mcMetrics.probOfRuin > 10 ? 'var(--clr-red)' : 'var(--clr-green)' }}>{mcMetrics.probOfRuin}%</strong>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ color: 'var(--clr-muted)' }}>Expected Drawdown:</span>
                       <strong style={{ color: '#ffb800' }}>{mcMetrics.expectedDrawdown}%</strong>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ color: 'var(--clr-muted)' }}>95% Confidence (100 rounds):</span>
                       <strong style={{ color: 'var(--clr-accent)' }}>KSh {mcMetrics.lower95} — KSh {mcMetrics.upper95}</strong>
                     </div>
                  </div>
              )}
            </div>
            
          </div>

          {/* Stats Card */}
          <div className={`${styles.statsCard} card`}>
            <div className={styles.statsTitle}>Session Analytics</div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.sLbl}>Rounds Tracked</span>
                <span className={styles.sVal}>{stats?.totalRounds ?? 0}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.sLbl}>Mean Crash (100)</span>
                <span className={styles.sVal}>{stats?.avgCrash ?? '–'}x</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.sLbl}>80th Percentile</span>
                <span className={styles.sVal} style={{ color: 'var(--clr-accent)' }}>{stats?.safe80th ?? '–'}x</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.sLbl}>Previous Crash</span>
                <span className={styles.sVal} style={{ color: (stats?.lastCrash < 2 ? 'var(--clr-red)' : 'var(--clr-green)') }}>
                  {stats?.lastCrash ? `${stats.lastCrash}x` : '–'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CRASH HISTORY ── */}
        <div className={`${styles.histCard} card`}>
          <div className={styles.histHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              Recent Trajectories
            </span>
            {flashCrash && (
              <span className={styles.flashBadge}>💥 IMPACT @ {flashCrash}x</span>
            )}
          </div>
          <div className={styles.chartWrapper} style={{ height: '400px', width: '100%', marginTop: '20px' }}>
            {history.length === 0 ? (
              <span className={styles.noData}>AWAITING TELEMETRY SYNC...</span>
            ) : (
               <FlightTracker3D 
                  history={history.map(h => h.crash || h)} 
                  currentMultiplier={pred.currentMultiplier || 1.0} 
                  isCrashed={flashCrash !== null} 
               />
            )}
          </div>
        </div>

        {/* ── CONTROLS ── */}
        <div className={styles.controlsRow}>
          {/* Simulation */}
          <div className={`${styles.controlCard} card`}>
            <div>
              <div className={styles.controlTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Simulation Engine
              </div>
              <p className={styles.controlDesc} style={{marginTop: '12px'}}>
                Generate synthetic crash data using standard casino house-edge distributions to test AI logic.
              </p>
            </div>
            <button
              className={`btn ${simActive ? 'btn-outline' : 'btn-primary'}`}
              onClick={toggleSim}
              style={{ width: '100%', marginTop: '16px' }}
            >
              {simActive ? '⏹ Terminate Simulation' : '▶ Initialize Simulation'}
            </button>
          </div>

          {/* Manual Entry */}
          <div className={`${styles.controlCard} card`}>
            <div>
              <div className={styles.controlTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Manual Override
              </div>
              <p className={styles.controlDesc} style={{marginTop: '12px'}}>
                Directly inject a crash result into the neural engine if the WebSocket stream disconnects.
              </p>
            </div>
            <div className={styles.manualRow} style={{ marginTop: '16px' }}>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="Result (e.g. 2.34)"
                value={manualVal}
                onChange={e => setManualVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitManual()}
                className={styles.manualInput}
              />
              <button className="btn btn-outline" onClick={submitManual}>Submit</button>
            </div>
          </div>

          {/* Settings & Export */}
          <div className={`${styles.controlCard} card`}>
            <div>
              <div className={styles.controlTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Operator Parameters
              </div>
              <p className={styles.controlDesc} style={{marginTop: '12px'}}>
                Modify your multi-account profiles, adjust engine aesthetics, or export session data to CSV.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <select 
                    value={riskProfile} 
                    onChange={e => setRiskProfile(e.target.value)} 
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px' }}
                >
                    <option value="CONSERVATIVE">🛡️ Conservative Profile (1/4 Kelly)</option>
                    <option value="BALANCED">⚖️ Balanced Profile</option>
                    <option value="AGGRESSIVE">🔥 Aggressive Profile (Max Alloc)</option>
                    <option value="PAPER">📝 Paper Trading (Sim Ticker)</option>
                </select>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                        value={themeMode} 
                        onChange={e => setThemeMode(e.target.value)} 
                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px' }}
                    >
                        <option value="DARK">🌙 Dark Space Theme</option>
                        <option value="LIGHT">☀️ Light Terminal Theme</option>
                        <option value="NEON">💻 Cyber Neon Theme</option>
                    </select>

                    <button 
                        onClick={triggerCSVExport} 
                        style={{ background: 'rgba(0,255,136,0.1)', color: 'var(--clr-green)', border: '1px solid rgba(0,255,136,0.3)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                    >
                        📥 Export CSV
                    </button>
                    
                     <button 
                        onClick={() => alert("Please generate a CSV report first to pipe into the async PDF formatter script.")} 
                        style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--clr-accent)', border: '1px solid rgba(255,107,53,0.3)', padding: '8px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                        title="Export PDF Report"
                    >
                        📄 PDF
                    </button>
                </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
