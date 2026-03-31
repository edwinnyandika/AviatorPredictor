'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

const CASINOS = [
  { id: 'sportpesa', label: 'SportPesa KE' },
  { id: 'betika', label: 'Betika' },
  { id: 'mozzart', label: 'Mozzart Bet' },
  { id: '1xbet', label: '1xBet' }
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [casino, setCasino] = useState('');
  const [script, setScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.replace('/auth?mode=login');
      else setUser(u);
    });
    return () => unsub();
  }, [router]);

  // Try to generate script when casino picked
  const pickCasino = async (c: string) => {
    setCasino(c);
    localStorage.setItem('aviatoriq_casino', c);
    try {
      const res = await apiFetch(`/casino/script/${c}`);
      if (!res.ok) throw new Error("Failed to gen script");
      const text = await res.text();
      setScript(text);
      setStep(2);
    } catch (err) {
      alert("Error generating script. Is backend running?");
    }
  };

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => {
        setStep(3);
        startListening();
      }, 1500);
    } catch (e) {
      alert("Failed to copy");
    }
  };

  const startListening = () => {
    // We listen to the SSE. If a crash or connected event fires, write complete & redirect.
    const es = new EventSource('/api/stream');
    es.addEventListener('crash', async () => {
      es.close();
      await completeOnboarding();
    });
  };

  const completeOnboarding = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users_profile', user.uid), {
        onboarding_completed: true,
        plan: 'FREE'
      }, { merge: true });
      router.replace('/dashboard');
    } catch (err) {
      console.error(err);
      router.replace('/dashboard'); // fallback
    }
  };

  if (!user) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1>Welcome to AviatorIQ</h1>
        <p>Follow these 3 simple steps to connect your game.</p>
      </div>

      <div className={styles.stepBlock}>
        <div className={styles.stepHeader}>
          <div className={styles.stepNum}>1</div>
          <div className={styles.stepTitle}>Select your Casino</div>
        </div>
        {step === 1 && (
          <div className={styles.casinoGrid}>
            {CASINOS.map(c => (
              <button key={c.id} className={styles.casinoBtn} onClick={() => pickCasino(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        {step > 1 && <p style={{ color: 'var(--clr-green)' }}>Selected: {CASINOS.find(c => c.id === casino)?.label} ✓</p>}
      </div>

      {step >= 2 && (
        <div className={styles.stepBlock}>
          <div className={styles.stepHeader}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepTitle}>Copy your Interceptor</div>
          </div>
          {step === 2 && (
            <>
              <div className={styles.scriptBox}>
                {script.substring(0, 150)}...
                <br/><br/>{/* Click copy below to grab the full script */}
              </div>
              <button className={styles.actionBtn} onClick={copyScript}>
                {copied ? 'Copied! ✓' : 'Copy Script to Clipboard'}
              </button>
            </>
          )}
          {step > 2 && <p style={{ color: 'var(--clr-green)' }}>Script copied! ✓</p>}
        </div>
      )}

      {step >= 3 && (
        <div className={styles.stepBlock}>
          <div className={styles.stepHeader}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepTitle}>Connect & Play</div>
          </div>
          
          <div className={styles.guideList}>
            <div className={styles.guideItem}>
              <strong>A</strong>
              <span>Open the {casino} Aviator game in a new tab.</span>
            </div>
            <div className={styles.guideItem}>
              <strong>B</strong>
              <span>Press <b>F12</b> on your keyboard to open Developer Tools.</span>
            </div>
            <div className={styles.guideItem}>
              <strong>C</strong>
              <span>Click the <b>Console</b> tab, paste the script, and press <b>Enter</b>.</span>
            </div>
          </div>

          <div className={styles.waiting}>
            <div className={styles.pulse} />
            Waiting for first round... (Do not close this page)
            <br />
            <button 
              onClick={completeOnboarding} 
              style={{ marginTop: 24, padding: '8px 16px', background: 'transparent', border: '1px solid var(--clr-border)', color: 'white', cursor: 'pointer', borderRadius: 8 }}>
              Skip wait (debug)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
