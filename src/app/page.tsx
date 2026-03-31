'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import styles from './page.module.css';

/* ─── Animated counter hook ─── */
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const step = target / (duration / 16);
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount(Math.floor(cur));
      if (cur >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return count;
}

/* ─── Elegant Monochromatic Live Demo ─── */
function LiveDemo() {
  const [mult, setMult] = useState(1.0);
  const [crashed, setCrashed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const frameRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    pointsRef.current = [{ x: 0, y: H }];
    tRef.current = 0;
    setCrashed(false);

    const tick = () => {
      tRef.current += 0.015;
      const m = Math.pow(Math.E, tRef.current * 0.7);
      setMult(parseFloat(m.toFixed(2)));

      const x = (tRef.current / 4) * W;
      const y = H - (Math.log(m) / 3) * H;
      pointsRef.current.push({ x, y });

      ctx.clearRect(0, 0, W, H);

      // Clean elegant grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (H / 4) * i);
        ctx.lineTo(W, (H / 4) * i);
        ctx.stroke();
      }

      const pts = pointsRef.current;
      if (pts.length > 1) {
        // Minimalist Line
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = crashed ? 'rgba(255,255,255,0.3)' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Lead Dot
        const last = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = crashed ? 'transparent' : '#ffffff';
        ctx.fill();
        
        // Frosted glow
        ctx.beginPath();
        ctx.arc(last.x, last.y, 24, 0, Math.PI * 2);
        ctx.fillStyle = crashed ? 'transparent' : 'rgba(255,255,255,0.05)';
        ctx.fill();
      }

      const crashAt = 1.2 + Math.random() * 5;
      if (m >= crashAt) {
        setCrashed(true);
        setTimeout(() => {
          pointsRef.current = [{ x: 0, y: H }];
          tRef.current = 0;
          setMult(1.0);
          setCrashed(false);
        }, 3000);
        return;
      }
      animId = requestAnimationFrame(tick);
      frameRef.current = animId;
    };
    animId = requestAnimationFrame(tick);
    frameRef.current = animId;
    return () => cancelAnimationFrame(animId);
  }, [crashed]);

  return (
    <div className={styles.demoContainer}>
      <div className={styles.demoHeader}>
        <span>Creative Data Stream</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            width: 6, height: 6, borderRadius: '50%', 
            background: crashed ? 'rgba(255,255,255,0.2)' : '#fff',
            animation: crashed ? 'none' : 'glowPulse 2s infinite'
          }} />
          <span>{crashed ? 'CYCLE ENDED' : 'LIVE FEED'}</span>
        </div>
      </div>
      <div style={{ position: 'relative', flex: 1 }}>
        <canvas ref={canvasRef} className={styles.demoCanvas} style={{ width: '100%', height: '100%' }} />
        <div className={styles.multiplierOverlay} style={{ opacity: crashed ? 0.2 : 1 }}>
          {mult.toFixed(2)}x
        </div>
      </div>
    </div>
  );
}

const chips = ['Recognition', 'Evolution', 'Excellence', 'Community'];
const awwwardsPartners = ['Apple', 'Google', 'Spotify', 'Nike', 'Vogue', 'Pentagram'];
const features = [
  { id: '01', title: 'Curated Excellence', desc: 'Precision interception algorithms wrapped in an intuitively elegant dashboard.' },
  { id: '02', title: 'Data Typography', desc: 'Numbers that speak volumes. Minimalist visual representation of complex historical models.' },
  { id: '03', title: 'Sleek Sophistication', desc: 'Hardware-accelerated rendering inside a stark, distraction-free environment.' },
  { id: '04', title: 'Continuous Evolution', desc: 'Our engine learns daily, evolving alongside the digital landscape.' },
];
const steps = [
  { n: '01', title: 'Identify Pipeline', desc: 'Select the data source to intercept. The architecture configures itself intelligently.' },
  { n: '02', title: 'Inject Intelligence', desc: 'Deploy the interceptor script seamlessly into the environment to begin synchronous data collection.' },
  { n: '03', title: 'Analyze Output', desc: 'Review the high-level, typographically-driven metrics that isolate signal from noise.' },
];

export default function Home() {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const n1 = useCounter(14204);
  const n2 = useCounter(98);
  const n3 = useCounter(2400);

  return (
    <div className={styles.wrapper}>
      {/* ── NAVBAR ── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.navBrand}>
            aviator<span>iq</span>
          </div>
        </div>
        <div className={`${styles.navLinks} ${menuOpen ? styles.navOpen : ''}`}>
          <Link href="#features">Platform</Link>
          <Link href="#how">Manifesto</Link>
          <Link href="/pricing">Academy</Link>
          <Link href="/docs">Directory</Link>
          <Link href="/auth?mode=login">Sign In</Link>
          <Link href="/auth?mode=register" className={`btn btn-primary ${styles.navCta}`}>Join Us</Link>
        </div>
        <button className={styles.menuBtn} onClick={() => setMenuOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroSignalRow}>
            {chips.map(c => <span key={c} className={styles.signalChip}>{c}</span>)}
          </div>
          <h1 className={`${styles.heroTitle} animate-fade-up`}>
            Creative<br/>Excellence In<br/>Data
          </h1>
          <p className={`${styles.heroSub} animate-fade-up animate-delay-1`}>
            A professional platform recognizing the talent of digital strategists. Elevating crash analytics to high art.
          </p>
          <div className={`${styles.heroCtas} animate-fade-up animate-delay-2`}>
            <Link href="/auth?mode=register" className="btn btn-primary" style={{ padding: '18px 40px', fontSize: '1rem', borderRadius: 2 }}>
              Discover Talent
            </Link>
            <Link href="#how" className="btn btn-ghost" style={{ padding: '18px 40px', fontSize: '1rem', color: '#fff' }}>
              Read the Manifesto
            </Link>
          </div>
        </div>

        <div className={`${styles.demoWrapper} animate-fade-up animate-delay-3`}>
          <LiveDemo />
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <section className={styles.partnerSection}>
        <h4>Recognizing High-Level Agencies</h4>
        <div className={styles.partnerSlider}>
          <div className={styles.partnerTrack}>
            {[...awwwardsPartners, ...awwwardsPartners].map((e, i) => (
              <div key={i} className={styles.partnerLogo}>{e}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMAND GRID ── */}
      <div className={styles.commandStrip}>
        <div className={styles.commandGrid}>
          {[
            { val: `${n1.toLocaleString()}`, label: 'Active Curators', desc: 'Professionals globally validating data elegance.' },
            { val: `${n2}%`, label: 'Aesthetic Purity', desc: 'Signal adherence to our minimalist logic framework.' },
            { val: `${n3.toLocaleString()}`, label: 'Daily Operations', desc: 'Continuous asynchronous interception events.' },
            { val: '0.01s', label: 'Latency', desc: 'The gap between action and beautiful visualization.' },
          ].map((s, i) => (
            <div key={s.label} className={`${styles.commandCard} animate-fade-up animate-delay-${i%4+1}`}>
              <div className={styles.commandValue}>{s.val}</div>
              <div className={styles.commandLabel}>{s.label}</div>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>The Anatomy of Inspiration</h2>
          <p>We blend robust computational mathematics with uncompromised visually driven aesthetics to formulate the perfect environment.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((f, i) => (
            <div key={f.id} className={`${styles.featureCard} animate-fade-up animate-delay-${(i % 4) + 1}`}>
              <div className={styles.featureIcon}>{f.id}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STEPS ── */}
      <section id="how" className={styles.section} style={{ background: '#050505' }}>
        <div className={styles.sectionHeader}>
          <h2>The Professional Framework</h2>
        </div>
        <div className={styles.steps}>
          {steps.map((s) => (
            <div key={s.n} className={styles.step}>
              <div className={styles.stepNumber}>{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.section} style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="card-glass" style={{ textAlign: 'center', padding: '100px 48px', maxWidth: 800, width: '100%' }}>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: 24, fontStyle: 'italic', textTransform: 'none' }}>
            Elevate your edge.
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>
            Join the directory of world-class operators blending design and data.
          </p>
          <Link href="/auth?mode=register" className="btn btn-primary" style={{ padding: '18px 48px', fontSize: '1rem', borderRadius: 2 }}>
            Submit Your Profile
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerBrand}>
              aviator<span>iq</span>
            </div>
            <p>Inspiring. Authoritative. Professional. The definitive platform for data intelligence.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Directory</h4>
            <Link href="#features">Agencies</Link>
            <Link href="/pricing">Freelancers</Link>
            <Link href="/docs">Academy</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Connect</h4>
            <Link href="/auth?mode=register">Join Directory</Link>
            <Link href="/auth?mode=login">Sign In</Link>
            <Link href="/onboarding">Submit Work</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/disclaimer">Cookies</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} AviatorIQ. Curated Excellence.</span>
          <span>Designed with absolute precision.</span>
        </div>
      </footer>
    </div>
  );
}
