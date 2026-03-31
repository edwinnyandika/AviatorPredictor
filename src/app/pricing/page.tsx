'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
);
const CrossIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
);

export default function Pricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const checkout = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/checkout/polar', { method: 'POST' });
      if (!res.ok) throw new Error("Checkout failed.");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert("Checkout unavailable.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={`${styles.title} animate-fade-up`}>The Directory</h1>
        <p className={`${styles.subtitle} animate-fade-up animate-delay-1`}>
          A curated ecosystem for the highest-performing digital strategists. Elevate your presence and access elite interception tools.
        </p>
      </header>

      <div className={`${styles.grid} animate-fade-up animate-delay-2`}>
        <div className={styles.card}>
          <div className={styles.planName}>Emerging Talent</div>
          <div className={styles.price}>$0<span className={styles.period}>/m</span></div>
          <ul className={styles.features}>
            <li><CheckIcon/> Individual Tracking</li>
            <li><CheckIcon/> Analytical Foundations</li>
            <li><CheckIcon/> Basic Directory Listing</li>
            <li><CheckIcon/> 1 Strategy Pipeline</li>
            <li className={styles.excluded}><CrossIcon/> Simultaneous Targeting</li>
            <li className={styles.excluded}><CrossIcon/> Premium Editorial Badge</li>
            <li className={styles.excluded}><CrossIcon/> Agency Level Analytics</li>
          </ul>
          <button className={`${styles.btn} ${styles.btnFree}`} onClick={() => router.push('/dashboard')}>
            Explore Platform
          </button>
        </div>

        <div className={`${styles.card} ${styles.proCard}`}>
          <div className={styles.proBadge}>Agency Level</div>
          <div className={styles.planName}>Curated Professional</div>
          <div className={styles.price}>$12<span className={styles.period}>/m</span></div>
          <ul className={styles.features}>
            <li><CheckIcon/> Matrix Interception Targeting</li>
            <li><CheckIcon/> Up to 10 Simultaneous Pipelines</li>
            <li><CheckIcon/> Infinite Session Archive</li>
            <li><CheckIcon/> 20 Custom Logic Algorithms</li>
            <li><CheckIcon/> Premium Directory Placement</li>
            <li><CheckIcon/> Advanced Volatility Profiler</li>
            <li><CheckIcon/> VIP Editorial Support</li>
          </ul>
          <button className={`${styles.btn} ${styles.btnPro}`} onClick={checkout} disabled={loading}>
            {loading ? 'Initializing...' : 'Join The Directory'}
          </button>
        </div>
      </div>
    </div>
  );
}
