'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import styles from './page.module.css';

export default function Referrals() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const ref = doc(db, 'users_profile', u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setProfile(snap.data());
      }
    });
    return () => unsub();
  }, []);

  const refCode = profile?.referral_code || (user?.uid.substring(0,6).toUpperCase() || 'LOADING');
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${refCode}` : '';
  const wsText = encodeURIComponent(`Bro, I'm using AviatorIQ's interceptor to track the crash game live. Use my code ${refCode} to get 3 Free PRO Days!\n\n${shareUrl}`);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>Invite & Earn PRO Days</h1>
        <p className={styles.subtitle}>Refer friends to AviatorIQ. Both of you get 3 days of unlimited PRO access.</p>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricVal}>0</span>
          <span className={styles.subtitle}>Total Friends Scanned</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricVal}>0</span>
          <span className={styles.subtitle}>PRO Days Earned</span>
        </div>
      </div>

      <div className={styles.shareSection}>
        <h3 style={{ marginBottom: 24, fontSize: '1.25rem' }}>Your Unique Invite Link</h3>
        <div className={styles.linkBox}>
          <input className={styles.linkInput} readOnly value={shareUrl || 'Generating...'} />
          <button className={styles.copyBtn} onClick={copyLink}>
            {copied ? 'Copied! ✓' : 'Copy'}
          </button>
        </div>

        <a 
          href={`https://wa.me/?text=${wsText}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.wsBtn}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.062-.173-.298-.018-.461.13-.609.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.015-1.04 2.476 0 1.46 1.065 2.871 1.213 3.07.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
