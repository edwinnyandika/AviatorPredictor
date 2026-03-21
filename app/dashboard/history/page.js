'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './page.module.css';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        // data.history contains the objects. Reverse to show newest first
        setHistory(data.history.reverse() || []);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const getColor = (v) => {
    if (v < 1.5) return 'var(--clr-red)';
    if (v < 3.0) return 'var(--clr-yellow)';
    if (v < 7.0) return 'var(--clr-green)';
    return 'var(--clr-blue)';
  };

  if (!authChecked) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--clr-bg)', color: 'var(--clr-text)' }}>Authenticating...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.main}>
        <h1 className={styles.title}>Data Archive</h1>
        <p className={styles.desc}>
          Complete repository of all tracked Aviator crash multipliers from the current session.
          The AI engine utilizes this dataset to refine its prediction models.
        </p>

        {loading ? (
          <div className={styles.emptyState}>Loading historical data...</div>
        ) : history.length === 0 ? (
          <div className={styles.emptyState}>
            No data recorded in this session. Start the interceptor or simulation from the dashboard.
          </div>
        ) : (
          <div className={styles.historyGrid}>
            {history.map((record, idx) => {
              const val = record.multiplier;
              return (
                <div 
                  key={idx} 
                  className={styles.historyItem}
                  style={{ color: getColor(val), borderColor: getColor(val) + '44' }}
                >
                  {val.toFixed(2)}x
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
