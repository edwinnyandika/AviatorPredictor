'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';
import Link from 'next/link';

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const CrossIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
      alert("Checkout unavailable in this environment.");
      setLoading(false);
    }
  };

  return (
    <>
      <nav style={{position: 'fixed', top: 0, left: 0, right: 0, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-bg)', zIndex: 100}}>
        <Link href="/" style={{fontWeight: 800, fontSize: '1.35rem', color: '#fff'}}>AVIATOR<span style={{color: 'var(--clr-accent)'}}>IQ</span></Link>
        <Link href="/" className="btn btn-outline" style={{padding: '8px 16px'}}>Back to Home</Link>
      </nav>

      <div className={styles.wrapper}>
        <header className={styles.header}>
          <h1 className={`${styles.title} animate-fade-up`}>Pricing Built for Strategy</h1>
          <p className={`${styles.subtitle} animate-fade-up animate-delay-1`}>
            Select the plan that matches your volume. No hidden metrics.
          </p>
        </header>

        <div className={`${styles.grid} animate-fade-up animate-delay-2`}>
          {/* FREE TIER */}
          <div className={styles.card}>
            <div className={styles.planName}>Basic Standard</div>
            <div className={styles.price}>$0<span className={styles.period}>/mo</span></div>
            <ul className={styles.features}>
              <li><CheckIcon/> Individual Casino Monitor</li>
              <li><CheckIcon/> Real-time Visual Pipeline</li>
              <li><CheckIcon/> 100 Round History</li>
              <li className={styles.excluded}><CrossIcon/> Multi-Target Tracking</li>
              <li className={styles.excluded}><CrossIcon/> Premium Web Push Assets</li>
            </ul>
            <div className={styles.btnActions}>
              <button className="btn btn-outline" style={{width: '100%'}} onClick={() => router.push('/dashboard')}>
                Explore Free
              </button>
            </div>
          </div>

          {/* PRO TIER */}
          <div className={`${styles.card} ${styles.proCard}`}>
            <div className={styles.proBadge}>Professional</div>
            <div className={styles.planName}>Operator Pro</div>
            <div className={styles.price}>$12<span className={styles.period}>/mo</span></div>
            <ul className={styles.features}>
              <li><CheckIcon/> Simultaneous Multi-Targeting</li>
              <li><CheckIcon/> Up to 10 Pipelines Active</li>
              <li><CheckIcon/> Infinite Session Archive</li>
              <li><CheckIcon/> Matrix Interception</li>
              <li><CheckIcon/> Advanced Volatility Profiling</li>
            </ul>
            <div className={styles.btnActions}>
              <button className="btn btn-primary" style={{width: '100%'}} onClick={checkout} disabled={loading}>
                {loading ? 'Initializing...' : 'Upgrade Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
