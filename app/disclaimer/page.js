'use client';
import Link from 'next/link';
import styles from '../legal.module.css';

export default function DisclaimerPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          <span>←</span> Acknowledge
        </Link>
        
        <h1 className={styles.title}>Operational Disclaimer</h1>
        <p className={styles.subtitle}>
          Crucial mathematical warnings regarding automated prediction mechanisms and inherent casino entropy factors.
        </p>

        <section className={styles.section} style={{ borderLeftColor: 'var(--clr-yellow)' }}>
          <h2 className={styles.sectionTitle} style={{ color: 'var(--clr-yellow)' }}>
            <div className={styles.iconWrapper} style={{ color: 'var(--clr-yellow)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            1. Non-Deterministic Algorithms
          </h2>
          <p className={styles.paragraph}>
            AviatorAI algorithms utilize historical <span className={styles.highlight} style={{ color: 'var(--clr-yellow)'}}>back-propagation</span> and real-time EMA calculations to define aggregate probabilities. However, predictor results do <strong style={{color: 'white'}}>NOT</strong> guarantee identical future server RNG hash calculations. 
          </p>
            <p className={styles.paragraph}>
              Spribe&apos;s backend executes a Provably Fair server seed generation system. The mathematical variance cannot be permanently broken by any external client-side software.
            </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            2. Strict Bankroll Management
          </h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>Always utilize the built-in Kelly Criterion risk management system.</li>
              <li className={styles.listItem}>Never allocate more than 3% of your active equity pool on a single automated bet cascade.</li>
              <li className={styles.listItem}>The platform does not issue refunds due to consecutive &quot;Cold Streaks&quot; or negative variance clusters. Software predictions are utilized solely at your own risk parameter.</li>
            </ul>
        </section>
      </div>
    </div>
  );
}
