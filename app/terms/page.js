'use client';
import Link from 'next/link';
import styles from '../legal.module.css';

export default function TermsPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          <span>←</span> Terminate Session
        </Link>
        
        <h1 className={styles.title}>Operator Terms of Service</h1>
        <p className={styles.subtitle}>
          Legal parameters and deployment constraints for utilizing the AviatorAI prediction engines. Binding agreement automatically executed upon connection payload.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            1. Risk & Liability Parameters
          </h2>
          <p className={styles.paragraph}>
            This platform provides high-level <span className={styles.highlight}>statistical data analysis</span> and real-time multiplier prediction modules. Under no circumstance should this mathematical telemetry be considered guaranteed financial advice.
          </p>
          <p className={styles.paragraph}>
             Due to the chaotic nature of the target server&apos;s RNG hashing algorithms, the AviatorAI engine is designed for edge probability generation, not absolute certainty. Operators assume total mechanical liability regarding their equity allocation and automated bet execution configurations.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            2. Deployment Constraints & Abuse
          </h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>Accounts utilizing automated API endpoints for execution must strictly comply with tier concurrency limits (1 active WebSocket per Free user, up to 10 for Elite tier).</li>
             <li className={styles.listItem}>Reverse engineering the Neural Engine&apos;s weighted variables via aggressive API querying will trigger an automatic hardware-based IP ban.</li>
            <li className={styles.listItem}>Do not route AviatorAI telemetry directly into public Discord/Telegram channels without explicit Enterprise broadcast licensing.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            3. Subscription Authorization
          </h2>
          <p className={styles.paragraph}>
            Tier 2 and Tier 3 functionality (Pro / Elite models) require continuous cryptographic authorization via active subscription. Attempting to bypass the <span className={styles.highlight}>payment infrastructure layer</span> nullifies your operator license immediately. 
          </p>
        </section>
      </div>
    </div>
  );
}
