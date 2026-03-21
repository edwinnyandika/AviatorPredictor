'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './page.module.css';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  const [settings, setSettings] = useState({
    riskTolerance: 'medium',
    autoBetEnabled: 'false',
    baseBetSize: '10',
    predictionModel: 'hybrid'
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // In a real app, this would save to local storage or an API
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!authChecked) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--clr-bg)', color: 'var(--clr-text)' }}>Authenticating...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.main}>
        <h1 className={styles.title}>System Configuration</h1>
        <p className={styles.desc}>
          Adjust the neural engine parameters and risk thresholds for your betting strategy.
          Note: These settings are strictly local to this session.
        </p>

        <div className={styles.settingsGroup}>
          <h3 className={styles.groupTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Algorithm Preferences
          </h3>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h4>Risk Tolerance</h4>
              <p>Controls the conservatism of the AI&apos;s safe cashout targets. Higher risk implies higher recommended multipliers but lower win rates.</p>
            </div>
            <div className={styles.settingControl}>
              <select name="riskTolerance" value={settings.riskTolerance} onChange={handleChange}>
                <option value="low">Low (Conservative)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Aggressive)</option>
              </select>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h4>Prediction Engine Model</h4>
              <p>Select the underlying analytical model used for predictions.</p>
            </div>
            <div className={styles.settingControl}>
              <select name="predictionModel" value={settings.predictionModel} onChange={handleChange}>
                <option value="markov">Markov Chain</option>
                <option value="hybrid">Hybrid (RSI + EMA Array)</option>
                <option value="neural">Deep Neural Network (Experimental)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.settingsGroup}>
          <h3 className={styles.groupTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Betting Simulator
          </h3>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h4>Simulated Auto-Bet</h4>
              <p>Enable to allow the interface to highlight simulated bets.</p>
            </div>
            <div className={styles.settingControl}>
              <select name="autoBetEnabled" value={settings.autoBetEnabled} onChange={handleChange}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h4>Base Bet Size (Units)</h4>
              <p>The standard unit size for Kelly Criterion sizing calculations.</p>
            </div>
            <div className={styles.settingControl}>
              <input 
                type="number" 
                name="baseBetSize" 
                value={settings.baseBetSize} 
                onChange={handleChange}
                min="1"
              />
            </div>
          </div>
        </div>

        <button 
          className={`btn ${saved ? 'btn-outline' : 'btn-primary'} ${styles.saveBtn}`} 
          onClick={handleSave}
        >
          {saved ? '✓ Configurations Applied' : 'Save Configurations'}
        </button>

      </main>
    </div>
  );
}
