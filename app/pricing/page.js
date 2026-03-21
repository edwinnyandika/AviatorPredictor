'use client';
import Link from 'next/link';
import styles from './page.module.css';

export default function PricingPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div style={{ position: 'relative' }}>
          <Link href="/" className={styles.backLink}>
            <span>←</span> Return
          </Link>
          
          <div className={styles.header}>
            <h1 className={styles.title}>API Access Tiers</h1>
            <p className={styles.subtitle}>
              Unlock the full institutional capability of our Deep Neural Network. From base momentum indexing to unthrottled WebHook automation.
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          {/* FREE TIER */}
          <div className={styles.card}>
            <h3 className={styles.tierName}>Basic Engine</h3>
            <p className={styles.tierDesc}>Standard deterministic modeling for casual operators utilizing manual execution.</p>
            
            <div className={styles.priceBox}>
              <div className={styles.price}>$0<span>/mo</span></div>
            </div>

            <ul className={styles.featuresList}>
              <li className={styles.feature}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                EMA + RSI Intercept Modeling
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Standard Terminal Layout
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Community Support Access
              </li>
              <li className={`${styles.feature} ${styles.dimmed}`}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                No Automated Webhooks
              </li>
              <li className={`${styles.feature} ${styles.dimmed}`}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                Throttled Inference (200ms)
              </li>
            </ul>

            <button className={styles.actionBtn}>Initialize Free</button>
          </div>

          {/* PRO TIER */}
          <div className={`${styles.card} ${styles.popular}`}>
            <div className={styles.popularBadge}>Most Active</div>
            <h3 className={styles.tierName} style={{ color: 'var(--clr-accent)' }}>Pro Operator</h3>
            <p className={styles.tierDesc}>Deep Neural predictions merged with sub-millisecond automated deployment scripts.</p>
            
            <div className={styles.priceBox}>
              <div className={styles.price}>$99<span>/mo</span></div>
            </div>

            <ul className={styles.featuresList}>
              <li className={styles.feature}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Crash Heat Map Access
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Kelly Criterion Autosizer
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Sub-millisecond Action Hooks
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Hardware GPU Rendering
              </li>
              <li className={`${styles.feature} ${styles.dimmed}`}>
                <div className={styles.featureIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                No Dedicated Cluster Node
              </li>
            </ul>

            <button className={`${styles.actionBtn} ${styles.primary}`}>Deploy Pro Link</button>
          </div>

          {/* ELITE TIER */}
          <div className={styles.card} style={{ borderColor: 'rgba(255,215,0,0.3)' }}>
            <h3 className={styles.tierName} style={{ color: '#ffd700' }}>Elite Institutional</h3>
            <p className={styles.tierDesc}>Uncapped endpoint routing with dedicated multi-variate non-linear pattern networking.</p>
            
            <div className={styles.priceBox}>
              <div className={styles.price}>$299<span>/mo</span></div>
            </div>

            <ul className={styles.featuresList}>
              <li className={styles.feature}>
                <div className={styles.featureIcon} style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Full DNN Experimental Engine
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon} style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Dedicated Inference Cluster
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon} style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Prioritized WSS Routing
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon} style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                1-on-1 Strategy Setup Session
              </li>
              <li className={styles.feature}>
                <div className={styles.featureIcon} style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                Custom Operator Tagging
              </li>
            </ul>

            <button className={styles.actionBtn} style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700', borderColor: 'rgba(255,215,0,0.3)' }}>Unlock Elite Node</button>
          </div>
        </div>

      </div>
    </div>
  );
}
