'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

type HistoryRound = {
  id: number;
  casino_id: string;
  multiplier: number;
  timestamp: string;
};

export default function HistoryPage() {
  const [rounds, setRounds] = useState<HistoryRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiFetch('/data/history?limit=100');
        if (res.ok) {
          const data = await res.json();
          setRounds(data.items || []);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const exportCsv = () => {
    if (!rounds.length) return;
    const csv = ['ID,Casino,Multiplier,Timestamp', ...rounds.map((r) => `${r.id},${r.casino_id},${r.multiplier},${r.timestamp}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aviator-history-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const avgDrop = rounds.length ? (rounds.reduce((acc, r) => acc + r.multiplier, 0) / rounds.length).toFixed(2) : '0';
  const highest = rounds.length ? Math.max(...rounds.map(r => r.multiplier)).toFixed(2) : '0';

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Session History</h1>
          <p className={styles.subtitle}>Review your past sessions, signals, and play patterns.</p>
        </div>
        <button className={styles.exportBtn} onClick={exportCsv} disabled={!rounds.length}>
          Export CSV (100 rounds)
        </button>
      </div>

      <div className={styles.timeline}>
        {loading ? (
          <div className={styles.emptyState}>Loading secure history vault...</div>
        ) : rounds.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No rounds tracked yet</h2>
            <p style={{ marginTop: 8 }}>Connect a casino and run your interceptor script to begin building your session history.</p>
          </div>
        ) : (
          <div className={styles.sessionCard}>
            <div>
              <h3>Today&apos;s Active Session</h3>
              <div className={styles.sessionMeta}>
                <span className={styles.casinoBadge}>{rounds[0]?.casino_id || 'sportpesa'}</span>
                <span>• {rounds.length} rounds logged</span>
                <span>• Live</span>
              </div>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statVal}>{avgDrop}x</span>
                <span className={styles.statLabel}>Avg Mult</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statVal} style={{color: 'var(--clr-green)'}}>{highest}x</span>
                <span className={styles.statLabel}>Best Spike</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
