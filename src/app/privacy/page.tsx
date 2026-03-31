'use client';
import Link from 'next/link';
import styles from '../legal.module.css';

export default function PrivacyPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          <span>←</span> Back
        </Link>
        
        <h1 className={styles.title}>Data Core Privacy Policy</h1>
        <p className={styles.subtitle}>
          Your telemetry is mathematically secured through decentralized AES-256 encryption. We aggressively minimize logging to protect operator anonymity.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            1. Anonymized Telemetry Ingestion
          </h2>
          <p className={styles.paragraph}>
            Our neural architecture runs entirely in local memory instances via the client browser. We log <span className={styles.highlight}>only crash trajectory outcomes</span> required for global baseline model tuning. 
          </p>
          <p className={styles.paragraph}>
            When an Operator submits intercepted data, personal identifiers (such as IPs and Casino session hashes) are stripped prior to hitting our ingest nodes.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            2. Firebase Siloing Protocol
          </h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>Operator account emails and OAuth credentials are mathematically siloed inside managed Google Firebase containers.</li>
            <li className={styles.listItem}>aviatorIQ administrators cannot view plaintext passwords or linked payment card hashes.</li>
            <li className={styles.listItem}>No data is ever brokered, auctioned, or transmitted to third-party advertising networks.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </div>
            3. Account Wiping
          </h2>
          <p className={styles.paragraph}>
            At any given time, Operators may execute a full cascade-delete on their profile via the Terminal settings. Triggering this erases all active API tokens, session cookies, and stored betting parameters from our distributed cache.
          </p>
        </section>
      </div>
    </div>
  );
}
