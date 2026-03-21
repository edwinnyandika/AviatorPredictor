'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const DEFAULT_AVATARS = [
  '/profile-icons/Angel_icon.png',
  '/profile-icons/Avengers_Iron_Man_icon.png',
  '/profile-icons/Avengers_Captain_America_icon.png',
  '/profile-icons/Bear_Avatar_icon.png',
  '/profile-icons/Bioman_Avatar_1_Red_icon.png',
  '/profile-icons/Cat_Avatar_icon.png',
  '/profile-icons/Dog_Avatar_icon.png',
  '/profile-icons/Lion_Avatar_icon.png',
  '/profile-icons/Dino_Avatar_icon.png',
  '/profile-icons/Monkey_Avatar_icon.png',
  '/profile-icons/Leopard_Avatar_icon.png',
  '/profile-icons/Gorilla_Avatar_icon.png',
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [customFile, setCustomFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth?mode=login');
        return;
      }
      setUser(currentUser);
      
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || currentUser.displayName || '');
          setBio(data.bio || '');
          setSelectedAvatar(data.photoURL || currentUser.photoURL || DEFAULT_AVATARS[0]);
        } else {
          setDisplayName(currentUser.displayName || '');
          setSelectedAvatar(currentUser.photoURL || DEFAULT_AVATARS[0]);
          await setDoc(docRef, {
            displayName: currentUser.displayName || '',
            email: currentUser.email,
            photoURL: currentUser.photoURL || DEFAULT_AVATARS[0],
            createdAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedAvatar('custom');
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setStatus({ type: '', msg: '' });

    try {
      let finalPhotoUrl = selectedAvatar;

      // Handle Custom Upload
      if (selectedAvatar === 'custom' && customFile) {
        const storageRef = ref(storage, `avatars/${user.uid}_${customFile.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, customFile);
        finalPhotoUrl = await getDownloadURL(uploadTask.ref);
      }

      // 1. Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName,
        bio,
        photoURL: finalPhotoUrl,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update Auth Profile
      await updateProfile(user, {
        displayName: displayName,
        photoURL: finalPhotoUrl
      });

      setStatus({ type: 'success', msg: 'Profile matrix updated successfully.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to update user profile matrix. ' + err.message });
    }
    setSaving(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card} style={{ opacity: loading ? 0.5 : 1, transition: 'var(--transition)' }}>
        <div className={styles.header}>
          <h1 className={styles.title}>Operator Profile</h1>
          <p style={{ color: 'var(--clr-muted)' }}>Configure your identity across the Aviator predictive network.</p>
        </div>

        {status.msg && (
          <div className={`${styles.statusMsg} ${styles[status.type]}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={saveProfile}>
          
          <div className={styles.avatarSection}>
            <img 
              src={selectedAvatar === 'custom' && previewUrl ? previewUrl : selectedAvatar} 
              alt="Avatar" 
              className={styles.currentAvatar} 
            />
            
            <button type="button" className="btn btn-outline" onClick={() => setShowAvatarModal(true)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Select Neural Avatar
            </button>
            <span style={{color: 'var(--clr-muted)', margin: '0 12px'}}>OR</span>
            <div className={styles.fileInputWrapper} style={{ display: 'inline-block' }}>
              <button type="button" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'rgba(255,255,255,0.1)' }}>
                Upload Custom Image
              </button>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer'}} />
            </div>
            {selectedAvatar === 'custom' && customFile && (
              <div style={{ fontSize: '0.8rem', color: 'var(--clr-accent)', marginTop: '8px' }}>{customFile.name} selected</div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Display Name</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="e.g. Neo" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Operator Biography / Status</label>
            <textarea 
              className={styles.textarea} 
              placeholder="Describe your trading strategy, or leave blank."
              value={bio}
              onChange={e => setBio(e.target.value)}
              style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', color: 'white', border: '1px solid var(--clr-border)', minHeight: '100px', width: '100%' }}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Secure Account Email</label>
            <input 
              type="email" 
              className={styles.input} 
              value={user?.email || ''} 
              disabled 
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', marginTop: '16px' }} disabled={saving || loading}>
            {saving ? 'Transmitting Data...' : 'Save Matrix Configuration'}
          </button>
        </form>
      </div>

      {showAvatarModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ background: 'var(--clr-panel)', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>Select Operator Identity</h2>
              <button type="button" onClick={() => setShowAvatarModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--clr-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '16px' }}>
              {DEFAULT_AVATARS.map((av, idx) => (
                <img 
                  key={idx} 
                  src={av} 
                  onClick={() => { 
                    setSelectedAvatar(av); 
                    setCustomFile(null); 
                    setShowAvatarModal(false); 
                  }}
                  style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', cursor: 'pointer', border: selectedAvatar === av ? '2px solid var(--clr-accent)' : '2px solid transparent', transition: 'var(--transition)' }}
                  alt={`Option ${idx+1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
