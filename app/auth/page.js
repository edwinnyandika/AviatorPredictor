'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup
} from 'firebase/auth';

import styles from './page.module.css';

// ── Live Illustration Component (Neural Data Stream) ─────────────
function LiveDataStream() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    // Resize Handler
    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
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

    let animationId;
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
export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mode, setMode] = useState('signup'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qMode = searchParams.get('mode');
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
          <span className="gradient-text">AviatorAI</span>
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

          <div className={styles.inputGroup}>
            <label className={styles.label}>Secured Password</label>
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

          <button 
            type="submit" 
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Authenticate' : 'Initialize Account')}
          </button>
        </form>

        <div className={styles.divider}>SECURE PROTOCOLS</div>

        <button 
          className={styles.authProviderBtn} 
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button 
          className={styles.authProviderBtn} 
          onClick={handleGithubAuth}
          disabled={loading}
          style={{ marginTop: '12px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
          </svg>
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
