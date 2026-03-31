'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from 'firebase/auth';
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup } from 'firebase/auth';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { SiGoogle, SiGithub } from '@icons-pack/react-simple-icons';

import styles from './page.module.css';

type StreamParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
};

// ── Live Illustration Component (Neural Data Stream) ─────────────
function LiveDataStream() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    // Resize Handler
    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: StreamParticle[] = [];
    const colors = ['#00ff88', '#00b8ff', '#ffb800', '#ff3366'];
    
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let animationId = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for(let x = 0; x < width; x+= 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for(let y = 0; y < height; y+= 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw connections
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist/100})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Main Auth Page ───────────────────────────────────────────────
function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mode, setMode] = useState('signup'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qMode = searchParams?.get('mode');
    if (qMode === 'login' || qMode === 'signup') {
      setMode(qMode);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const mapFirebaseError = (err) => {
    switch (err.code) {
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/account-exists-with-different-credential': return 'An account already exists with this email address but uses a different sign-in method. Please sign in using your original provider (e.g., Google or Email).';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password': return 'Invalid email or password.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/network-request-failed': return 'Network connection failed.';
      default: return err.message || 'An unexpected error occurred. Please try again.';
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg(`Account created for ${cred.user.email}! Redirecting...`);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Authentication successful! Securing connection...');
      }
    } catch (err) {
      setError(mapFirebaseError(err));
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(''); setSuccessMsg('');
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      setSuccessMsg('Google Authentication Verified. Transferring...');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mapFirebaseError(err));
      }
      setLoading(false);
    }
  };

  const handleGithubAuth = async () => {
    setError(''); setSuccessMsg('');
    const provider = new GithubAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      setSuccessMsg('GitHub Authentication Verified. Transferring...');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mapFirebaseError(err));
      }
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      
      {/* ── Left Form Panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.logo}>
          <img src="/icon.svg" width={32} height={32} alt="Logo" />
          <span className="gradient-text">aviatorIQ</span>
        </div>

        <div className={styles.tabs}>
          <div 
            className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
          >
            Log In
          </div>
          <div 
            className={`${styles.tab} ${mode === 'signup' ? styles.active : ''}`}
            onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
          >
            Sign Up
          </div>
        </div>

        {error && <div className={styles.errorBox}>⚠ {error}</div>}
        {successMsg && <div className={styles.successBox}>✓ {successMsg}</div>}

        <form className={styles.form} onSubmit={handleEmailAuth}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input 
                type="email" 
                required
                className={styles.input} 
                placeholder="operator@system.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Secured Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input 
                type="password" 
                required
                className={styles.input} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Authenticate' : 'Initialize Account')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className={styles.divider}>SECURE PROTOCOLS</div>

        <button className={styles.authProviderBtn} onClick={handleGoogleAuth} disabled={loading}>
          <SiGoogle size={18} color="#EA4335" />
          Continue with Google
        </button>

        <button className={styles.authProviderBtn} onClick={handleGithubAuth} disabled={loading} style={{ marginTop: '12px' }}>
          <SiGithub size={18} />
          Continue with GitHub
        </button>

        <div className={styles.backHome}>
          <Link href="/">← Return to Main Operations</Link>
        </div>
      </div>

      {/* ── Right Illustration Panel ── */}
      <div className={styles.illustrationPanel}>
        <div className={styles.canvasWrapper} style={{ zIndex: 1, opacity: 0.6 }}>
          <LiveDataStream />
        </div>
        <div className={styles.illusContent}>
          <div className={styles.illusBadge}>Award Winning UI/UX</div>
          <h2 className={styles.illusTitle}>Exclusive Platform Intelligence.</h2>
          <p className={styles.illusDesc}>
            Join the predictive matrix. Our high-frequency algorithms analyze thousands of crash data points per second to output precise Kelly-sized buy signals. State of the art execution directly injected through the Spribe architecture.
          </p>
        </div>
      </div>

    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className={styles.wrapper} />}>
      <AuthPageContent />
    </Suspense>
  );
}
