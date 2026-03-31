'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const toolsList = [
  {
    id: 'ema-rsi',
    title: 'EMA + RSI Intercept',
    desc: 'Baseline live signal engine for momentum, exhaustion, and recovery structure.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    tier: 'FREE',
    locked: false,
    action: 'Open Settings',
    link: '/dashboard/settings'
  },
  {
    id: 'kelly-calc',
    title: 'Kelly Criterion Autosizer',
    desc: 'Position-sizing console for bankroll protection and better long-run capital efficiency.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    tier: 'PRO',
    locked: true,
    action: 'Open Calculator',
    link: '#'
  },
  {
    id: 'volatility-lens',
    title: 'Volatility Lens',
    desc: 'Highlights compression versus expansion so you can quickly spot unstable sessions.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>,
    tier: 'FREE',
    locked: false,
    action: 'Open Dashboard',
    link: '/dashboard'
  },
  {
    id: 'heat-map',
    title: 'Crash Heat Map',
    desc: 'Session density map for locating hot and cold multiplier zones across the tracked archive.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    tier: 'PRO',
    locked: true,
    action: 'View Map',
    link: '#'
  },
  {
    id: 'replay-studio',
    title: 'Replay Studio',
    desc: 'Review completed sessions and compare decision points against real outcomes.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
    tier: 'PRO',
    locked: true,
    action: 'Launch Replay',
    link: '#'
  },
  {
    id: 'alert-console',
    title: 'Alert Console',
    desc: 'Priority feed for low-streak pressure, spike windows, and confidence shifts.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    tier: 'FREE',
    locked: false,
    action: 'Open History',
    link: '/dashboard/history'
  },
  {
    id: 'deep-neural',
    title: 'DNN Experimental Engine',
    desc: 'Advanced model lane for nonlinear pattern recognition and deeper probability buckets.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>,
    tier: 'ELITE',
    locked: true,
    action: 'Activate Network',
    link: '#'
  },
  {
    id: 'session-export',
    title: 'Session Exporter',
    desc: 'Prepare clean CSV and reporting outputs for later review or model tuning.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    tier: 'FREE',
    locked: false,
    action: 'Open Dashboard',
    link: '/dashboard'
  }
];

export default function ToolsPage() {
  const router = useRouter();

  const handleToolClick = (tool) => {
    if (tool.locked) {
      router.push('/pricing');
      return;
    }
    router.push(tool.link);
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Predictive Tools Library</h1>
        <p className={styles.desc}>
          Explore the upgraded operator toolkit. Core tools stay close to the live desk, while advanced scanners and replay systems unlock as your plan expands.
        </p>
      </header>

      <div className={styles.toolsGrid}>
        {toolsList.map(tool => (
          <div key={tool.id} className={`${styles.toolCard} ${tool.locked ? styles.locked : ''}`}>
            
            {/* The Lock Overlay */}
            {tool.locked && (
              <div className={styles.lockedOverlay}>
                <svg className={styles.lockIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <div className={styles.lockMsg}>{tool.tier} TIER REQUIRED</div>
                <div className={styles.lockDesc}>Upgrade your plan to instantly access this algorithm.</div>
                <button className="btn btn-primary" onClick={() => router.push('/pricing')} style={{ padding: '8px 24px', fontSize: '0.85rem' }}>
                  Upgrade Plan
                </button>
              </div>
            )}

            <div className={`${styles.tierBadge} ${tool.tier === 'PRO' ? styles.pro : tool.tier === 'ELITE' ? styles.elite : ''}`}>
              {tool.tier}
            </div>
            
            <div className={styles.toolIcon}>
              {tool.icon}
            </div>
            <h3 className={styles.toolTitle}>{tool.title}</h3>
            <p className={styles.toolDesc}>{tool.desc}</p>
            
            <button 
              className={styles.toolAction}
              onClick={() => handleToolClick(tool)}
            >
              {tool.locked ? 'Unlock Tool' : tool.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
