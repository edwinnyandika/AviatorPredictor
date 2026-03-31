'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    theme: 'dark',
    currency: 'KES',
    dailyEmail: true,
    language: 'en'
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) router.replace('/auth?mode=login');
      else {
        setUser(u);
        const ref = doc(db, 'users_profile', u.uid);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().preferences) {
          setProfile(p => ({ ...p, ...snap.data().preferences }));
        }
      }
    });
    return () => unsub();
  }, [router]);

  const updatePref = async (key: string, val: string | boolean) => {
    const updated = { ...profile, [key]: val };
    setProfile(updated as typeof profile);
    if (key === 'theme') {
      document.documentElement.className = val as string;
    }
    if (user) {
      await setDoc(doc(db, 'users_profile', user.uid), {
        preferences: updated
      }, { merge: true });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/');
  };

  if (!user) return <div className={styles.wrapper}>Loading...</div>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>Manage your AviatorIQ preferences and data.</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance & Region</h2>
        
        <div className={styles.row}>
          <div>
            <div className={styles.label}>Theme Mode</div>
            <div className={styles.desc}>Choose light or dark studio view</div>
          </div>
          <select 
            className={styles.select} 
            value={profile.theme} 
            onChange={(e) => updatePref('theme', e.target.value)}
          >
            <option value="dark">Dark Mode</option>
            <option value="light">Light Mode</option>
          </select>
        </div>

        <div className={styles.row}>
          <div>
            <div className={styles.label}>Display Currency</div>
            <div className={styles.desc}>Affects potential return calculations</div>
          </div>
          <select 
            className={styles.select} 
            value={profile.currency} 
            onChange={(e) => updatePref('currency', e.target.value)}
          >
            <option value="KES">KES (Kenyan Shilling)</option>
            <option value="TZS">TZS (Tanzanian Shilling)</option>
            <option value="UGX">UGX (Ugandan Shilling)</option>
            <option value="NGN">NGN (Nigerian Naira)</option>
          </select>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.row}>
          <div>
            <div className={styles.label}>Daily Summary Email</div>
            <div className={styles.desc}>Get a morning report of your last session</div>
          </div>
          <button 
            className={profile.dailyEmail ? styles.saveBtn : styles.dangerBtn}
            onClick={() => updatePref('dailyEmail', !profile.dailyEmail)}
          >
            {profile.dailyEmail ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Danger Zone</h2>
        <div className={styles.row}>
          <div>
            <div className={styles.label}>Sign Out</div>
            <div className={styles.desc}>End your current session across all tabs</div>
          </div>
          <button className={styles.dangerBtn} onClick={handleSignOut}>Log out</button>
        </div>
      </div>
    </div>
  );
}
