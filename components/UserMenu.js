'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import styles from './UserMenu.module.css';

// Central fallback avatar if the matrix is completely missing one
const FALLBACK_AVATAR = '/profile-icons/Avatar_icon.png';

export default function UserMenu({ isLandingPage = false }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfileData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      
      // Automatic Profile System: Fetch or Create
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
        } else {
          // Initialize a brand new profile on the backend immediately if it's missing
          const defaultAvatar = currentUser.photoURL || FALLBACK_AVATAR;
          const newProfile = {
            displayName: currentUser.displayName || 'Operator',
            email: currentUser.email,
            photoURL: defaultAvatar,
            createdAt: new Date().toISOString()
          };
          await setDoc(docRef, newProfile);
          setProfileData(newProfile);
        }
      } catch (err) {
        console.error("Failed executing automated profile retrieval:", err);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setMenuOpen(false);
    router.push('/');
  };

  if (loading) {
    return <div className={styles.wrapper}><div className={styles.skeleton} /></div>;
  }

  // Not logged in -> Show Auth Links ONLY if on landing page
  if (!user) {
    if (!isLandingPage) return null; // Don't show login links in dashboard
    return (
      <div className={styles.guestLinks}>
        <Link href="/auth?mode=login" className={styles.loginBtn}>Sign In</Link>
        <Link href="/auth?mode=signup" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
          Create Account
        </Link>
      </div>
    );
  }

  const avatar = profileData?.photoURL || FALLBACK_AVATAR;
  const name = profileData?.displayName || 'Operator';

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button className={styles.avatarBtn} onClick={() => setMenuOpen(!menuOpen)}>
        <img src={avatar} alt="User" className={styles.avatarImg} onError={(e) => { e.target.src = FALLBACK_AVATAR; }} />
      </button>

      {menuOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{name}</div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>
          
          <div className={styles.menuList}>
            <Link href="/dashboard" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Live Terminal
            </Link>
            <Link href="/dashboard/profile" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Matrix Profile
            </Link>
            <Link href="/dashboard/settings" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              System Settings
            </Link>
            <Link href="/pricing" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              Upgrade Tier
            </Link>

            <button className={`${styles.menuItem} ${styles.signOut}`} onClick={handleSignOut}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Terminate Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
