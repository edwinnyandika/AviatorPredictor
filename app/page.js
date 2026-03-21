'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import UserMenu from '@/components/UserMenu';

const features = [
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    title: 'EMA + RSI Neural Engine',
    desc: 'Exponential Moving Average blended with Relative Strength Index — the same mathematics used by institutional traders applied to crash detection.',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    title: 'Real-Time WebSocket Hook',
    desc: 'A browser-native script silently intercepts SFS2X websocket frames, analyzing crashes with zero sub-second latency.',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    title: 'Kelly Criterion Bet Sizing',
    desc: 'Optimal position sizing algorithm that maximizes exponential long-term growth while strictly limiting drawdown.',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.58 5.58"/></svg>,
    title: 'Auto-Reconnect & Fallback',
    desc: 'Built-in simulation mode and manual entry ensure the AI continues predicting even when live casino data is disjointed.',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    title: 'No Account Access Needed',
    desc: 'The interceptor runs natively in your browser memory. We never touch credentials, balances, or casino state.',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>,
    title: 'Live SSE Dashboard',
    desc: 'Server-Sent Events push each new crash result to your analysis dashboard the very instant it lands on screen.',
  },
];

const steps = [
  { n: '01', title: 'Install Tampermonkey', desc: 'Add the free Tampermonkey or Greasemonkey extension to Chrome, Edge, or Firefox.' },
  { n: '02', title: 'Load the Interceptor', desc: 'Paste our userscript. It activates automatically in the background on any Aviator game load.' },
  { n: '03', title: 'Open Your Casino', desc: 'Launch Aviator on Sportpesa, Betika, or any Spribe operator. The hook begins listening.' },
  { n: '04', title: 'Watch the AI Predict', desc: 'Every crash is fed into our EMA+RSI engine. Predictions output directly to your secure dashboard.' },
];

function AviatorDemo() {
  const canvasRef = useRef(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [status, setStatus] = useState('FLYING');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let startTime = performance.now();
    let crashed = false;
    let crashPoint = 1.3 + Math.random() * 8.0;

    const draw = (now) => {
      const elapsed = (now - startTime) / 1000;
      let currentMult = 1.0 + Math.pow(1.2, elapsed * 6) - 1.0;
      
      if (currentMult >= crashPoint) {
        currentMult = crashPoint;
        crashed = true;
      }

      setMultiplier(currentMult);
      setStatus(crashed ? 'CRASHED' : 'FLYING');

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // Draw Curve
      const progressX = Math.min(elapsed / 8, 1) * (canvas.width * 0.8);
      const progressY = Math.min(currentMult / Math.max(crashPoint, 10), 1) * (canvas.height * 0.75);
      
      const startX = 20;
      const startY = canvas.height - 20;
      const pntX = startX + progressX;
      const pntY = startY - progressY;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + progressX * 0.6, startY, pntX, pntY);
      
      ctx.lineWidth = 4;
      ctx.strokeStyle = crashed ? '#ff3366' : '#ff6b35';
      ctx.stroke();

      // Shadow glow for the curve
      ctx.shadowBlur = 15;
      ctx.shadowColor = crashed ? '#ff3366' : '#ff6b35';
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw Fill Under Curve
      ctx.lineTo(pntX, startY);
      ctx.lineTo(startX, startY);
      const gradient = ctx.createLinearGradient(0, startY, 0, pntY);
      gradient.addColorStop(0, crashed ? 'rgba(255, 51, 102, 0.0)' : 'rgba(255, 107, 53, 0.0)');
      gradient.addColorStop(1, crashed ? 'rgba(255, 51, 102, 0.3)' : 'rgba(255, 107, 53, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw Plane Point
      ctx.beginPath();
      ctx.arc(pntX, pntY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 0;

      if (!crashed) {
        animationId = requestAnimationFrame(draw);
      } else {
        setTimeout(() => {
          startTime = performance.now();
          crashed = false;
          crashPoint = 1.1 + Math.random() * 12.0;
          animationId = requestAnimationFrame(draw);
        }, 2500);
      }
    };
    
    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className={styles.demoContainer}>
      <div className={styles.demoHeader}>
        <div className={styles.demoTitle}>Live Simulation Engine</div>
        <div className={status === 'FLYING' ? 'badge badge-green' : 'badge badge-red'}>
          <div className={status === 'FLYING' ? styles.pulseDotGreen : styles.pulseDotRed} />
          {status}
        </div>
      </div>
      <canvas ref={canvasRef} width={800} height={400} className={styles.demoCanvas} />
      <div className={styles.multiplierOverlay} style={{ color: status === 'CRASHED' ? 'var(--clr-red)' : 'var(--clr-accent)' }}>
        {multiplier.toFixed(2)}x
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.wrapper}>
      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <img src="/icon.svg" width={28} height={28} alt="Logo" style={{ borderRadius: 6 }} />
          <span className="gradient-text">AviatorAI</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className="hide-mobile">Features</a>
          <a href="#how" className="hide-mobile">Architecture</a>
          <Link href="/pricing" className="hide-mobile">Pricing</Link>
          <Link href="/docs" className="hide-mobile">Docs</Link>
          <UserMenu isLandingPage={true} />
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        
        {/* Abstract Background Illustrations */}
        <svg className={`${styles.floatingIcon} ${styles.icon1}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polygon points="12 2 2 22 12 17 22 22 12 2"/></svg>
        <svg className={`${styles.floatingIcon} ${styles.icon2}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
        <svg className={`${styles.floatingIcon} ${styles.icon3}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <svg className={`${styles.floatingIcon} ${styles.icon4}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>

        <div className={styles.heroContent}>
          <div className="badge badge-green animate-fade-up">
            <span className={styles.pulseDotGreen} /> WebSockets Intercept Active
          </div>

          <h1 className={`${styles.heroTitle} animate-fade-up animate-delay-1`}>
            Dominate the Curve with<br />
            <span className="gradient-text">Neural Prediction</span>
          </h1>

           <p className={`${styles.heroSub} animate-fade-up animate-delay-2`}>
             We securely hook into Spribe&apos;s backend WebSocket stream to harvest crash telemetry in real time. 
             Powered by institutional EMA + RSI logic, AviatorAI dictates precisely when to hold and when to cash out.
           </p>

          <div className={`${styles.heroCtas} animate-fade-up animate-delay-3`}>
            <Link href="/auth?mode=signup" className="btn btn-primary">
              Create an Account
            </Link>
            <Link href="/auth?mode=login" className="btn btn-outline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Aviator Demo Interactive Component */}
        <div className={`${styles.demoWrapper} animate-fade-up animate-delay-3`} id="demo">
          <AviatorDemo />
        </div>
      </section>

      <section className={styles.partnerSection}>
        <h4>Verified Technological Partners</h4>
        <div className={styles.partnerSlider}>
          <div className={styles.partnerTrack}>
            {/* Duplicated for seamless loop */}
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '60px' }}>
                <span className={styles.partnerLogo}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                  Spribe
                </span>
                <span className={styles.partnerLogo}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  Betika
                </span>
                <span className={styles.partnerLogo}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  SportPesa
                </span>
                <span className={styles.partnerLogo}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><line x1="2" y1="20" x2="2.01" y2="20"/></svg>
                  Tampermonkey
                </span>
                <span className={styles.partnerLogo}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  Firebase Auth
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className="badge badge-blue">System Capabilities</div>
          <h2>Engineered for Statistical Edge</h2>
          <p>Remove the guesswork. Our platform executes quantitative analysis on every tick of the multiplier.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((f, i) => (
            <div key={i} className={`card ${styles.featureCard}`}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className="badge badge-yellow">Deployment</div>
          <h2>Initialize Intraday Trading in 3 Minutes</h2>
          <p>Zero programming required. Integrate the hook directly into your browser seamlessly.</p>
        </div>
        <div className={styles.steps}>
          {steps.map((s, i) => (
            <div key={i} className={styles.step}>
              <div className={styles.stepNumber}>{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              {i < steps.length - 1 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className={styles.section} style={{ background: 'rgba(5, 5, 8, 0.4)' }}>
        <div className={styles.sectionHeader}>
          <div className="badge badge-green">Operator Feedback</div>
          <h2>Trusted by Professional Traders</h2>
           <p>Don&apos;t just take our word for it. Look at the quantitative results achieved by our elite users.</p>
        </div>
        <div className={styles.featureGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <img src="/profile-icons/Avatar_icon.png" width="48" height="48" style={{ borderRadius: '50%', background: 'var(--clr-panel)' }} alt="User" />
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Michael R.</h4>
                <div style={{ color: 'var(--clr-accent)', fontSize: '0.8rem', fontWeight: 'bold' }}>ELITE TIER</div>
              </div>
            </div>
             <p style={{ color: 'var(--clr-muted)', fontStyle: 'italic' }}>&quot;The Kelly Criterion sizing module absolutely saved my bankroll. Since running the script on Betika, my drawdown has been functionally zero while maintaining standard growth.&quot;</p>
            <div style={{ display: 'flex', color: 'var(--clr-yellow)', gap: '4px' }}>★★★★★</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <img src="/profile-icons/Leopard_Avatar_icon.png" width="48" height="48" style={{ borderRadius: '50%', background: 'var(--clr-panel)' }} alt="User" />
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>David K.</h4>
                <div style={{ color: 'var(--clr-blue)', fontSize: '0.8rem', fontWeight: 'bold' }}>PRO TIER</div>
              </div>
            </div>
             <p style={{ color: 'var(--clr-muted)', fontStyle: 'italic' }}>&quot;The zero-latency WebSocket hook is the real deal. I deployed the Tampermonkey script on Mac and the dashboard picks up the multiplier literal milliseconds before standard UI.&quot;</p>
            <div style={{ display: 'flex', color: 'var(--clr-yellow)', gap: '4px' }}>★★★★★</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <img src="/profile-icons/Avengers_Iron_Man_icon.png" width="48" height="48" style={{ borderRadius: '50%', background: 'var(--clr-panel)' }} alt="User" />
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Sjors V.</h4>
                <div style={{ color: 'var(--clr-green)', fontSize: '0.8rem', fontWeight: 'bold' }}>FREE USER</div>
              </div>
            </div>
             <p style={{ color: 'var(--clr-muted)', fontStyle: 'italic' }}>&quot;Even the base EMA+RSI model is insanely powerful. It accurately calls out the high-risk zones, giving me the discipline to wait for safer entry windows. Pure mathematics.&quot;</p>
            <div style={{ display: 'flex', color: 'var(--clr-yellow)', gap: '4px' }}>★★★★★</div>
          </div>

        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className="card" style={{ textAlign: 'center', padding: '60px', maxWidth: '700px', width: '100%' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Ready to Execute?</h2>
          <p style={{ color: 'var(--clr-muted)', marginBottom: '32px', fontSize: '1.1rem' }}>
            Create an account to gain access to the dashboard interface and quantitative engine. 
          </p>
          <Link href="/auth?mode=signup" className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
            Create an Account Now
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/icon.svg" width={28} height={28} alt="Logo" />
              <span className="gradient-text" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>AviatorAI</span>
            </div>
            <p>Institutional grade quantitative prediction engines applied to retail environments. Engineered for statistical edge.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Platform</h4>
            <Link href="/auth?mode=signup">Create Account</Link>
            <Link href="/auth?mode=login">Sign In</Link>
            <Link href="/dashboard">Live Terminal</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Resources</h4>
            <Link href="/pricing">Pricing Tiers</Link>
            <Link href="/docs">Documentation</Link>
            <a href="#">Support</a>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 AviatorAI Technologies. All rights reserved.</span>
          <span>For conceptual research and educational purposes.</span>
        </div>
      </footer>
    </div>
  );
}
