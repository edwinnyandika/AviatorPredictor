'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const toolsList = [
  {
    id: 'ema-rsi',
    title: 'EMA + RSI Intercept',
    desc: 'Our standard hybrid quantitative analysis tool. Identifies momentum shifts and overbought zones in the live game multiplier.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    tier: 'FREE',
    locked: false,
    action: 'Settings',
    link: '/dashboard/settings'
  },
  {
    id: 'kelly-calc',
    title: 'Kelly Criterion Autosizer',
    desc: 'Automatically dynamically size your betting unit to maximize exponential growth without risking catastrophic drawdown.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    tier: 'PRO',
    locked: true,
    action: 'Open Calculator',
    link: '#'
  },
  {
    id: 'heat-map',
    title: 'Crash Heat Map',
    desc: 'Visual historical representation of crash clustering. Identifies statistically hot/cold multi-game trends.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    tier: 'PRO',
    locked: true,
    action: 'View Map',
    link: '#'
  },
  {
    id: 'deep-neural',
    title: 'DNN Experimental Engine',
    desc: 'Tap into our Deep Neural Network capable of multi-variate non-linear pattern recognition. Highest accuracy threshold.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>,
    tier: 'ELITE',
    locked: true,
    action: 'Activate Network',
    link: '#'
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
        <h1 className={styles.title}>Predictive Tools Overview</h1>
        <p className={styles.desc}>
          Explore the suite of institutional-grade analysis tools. Specialized modules require higher subscription tiers to unlock their full statistical capability.
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
