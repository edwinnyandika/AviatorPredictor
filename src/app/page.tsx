'use client';

import Link from 'next/link';
import styles from './page.module.css';

const features = [
  {
    title: 'WebSocket Data Interception',
    desc: 'Directly reads the game line in real time, delivering updates flawlessly. No delays. No middleman parsing.'
  },
  {
    title: 'EMA & RSI Intelligence',
    desc: 'Mathematical indicators analyze the rolling crash history to map risk momentum across thousands of seeds.'
  },
  {
    title: 'Visual Edge',
    desc: 'We map raw data securely to our dashboard. Understand extreme market volatility at a glance.'
  }
];

export default function Home() {
  return (
    <div className={styles.wrapper}>
      {/* ── NAVBAR ── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          AVIATOR<span>IQ</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Documentation</Link>
        </div>
        <Link href="/auth?mode=register" className={styles.navCta}>
          Get Started
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={`badge ${styles.heroBadge} animate-fade-up`}>
          <span style={{width: 8, height: 8, background: 'var(--clr-accent)', borderRadius: '50%', marginRight: 8}}></span>
          Live Engine V2.0 Active
        </div>
        <h1 className={`${styles.heroTitle} animate-fade-up animate-delay-1`}>
          Dominate Volatility With <span>Data.</span>
        </h1>
        <p className={`${styles.heroSub} animate-fade-up animate-delay-2`}>
          Predictive algorithms, real-time interception, and an entirely redesigned interface. Gain the ultimate analytical edge across top crash ecosystems.
        </p>
        <div className={`${styles.heroCtas} animate-fade-up animate-delay-3`}>
          <Link href="/auth?mode=register" className="btn btn-primary">Start Using Free</Link>
          <Link href="/pricing" className="btn btn-outline">Explore Pricing Plans</Link>
        </div>

        {/* ── INTERFACE SHOWCASE (Using images.jpg natively) ── */}
        <div className={`${styles.showcase} animate-fade-up animate-delay-3`}>
          <div className={styles.showcaseHeader}>
            <div className={styles.showcaseDot}></div>
            <div className={styles.showcaseDot}></div>
            <div className={styles.showcaseDot}></div>
          </div>
          <div className={styles.showcaseContent}>
            <img src="/images.jpg" alt="AviatorIQ Dashboard Preview" className={styles.showcaseImage} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)'}}>
                 <h3 style={{ color: '#fff', fontSize: '2rem', marginBottom: 12 }}>Visual Intelligence</h3>
                 <p style={{ color: '#ccc' }}>Real-time stream interception mapping.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Engineered For Performance</h2>
          <p>We built AviatorIQ explicitly to remove the noise and highlight pure, actionable data.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((f, i) => (
            <div key={i} className="card">
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.navBrand} style={{marginBottom: 16}}>
              AVIATOR<span>IQ</span>
            </div>
            <p style={{color: 'var(--clr-text-muted)', maxWidth: 300}}>
              Powerful interception analytics built for operators seeking maximum clarity.
            </p>
          </div>
          <div className={styles.footerCol}>
            <h4>Platform</h4>
            <Link href="/pricing">Pricing Plans</Link>
            <Link href="/docs">API & Docs</Link>
            <Link href="/auth?mode=login">Sign In</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
