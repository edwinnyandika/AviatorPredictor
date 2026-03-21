'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './layout.module.css';
import UserMenu from '@/components/UserMenu';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Terminal', href: '/dashboard', icon: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/> },
    { name: 'Tools', href: '/dashboard/tools', icon: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/> },
    { name: 'History', href: '/dashboard/history', icon: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></> },
    { name: 'Profile', href: '/dashboard/profile', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  ];

  const bottomLinks = [
    { name: 'Settings', href: '/dashboard/settings', icon: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></> },
  ];

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <img src="/icon.svg" width={28} height={28} alt="Icon" />
          <span className="gradient-text">AviatorAI</span>
        </div>

        <nav className={styles.navSection}>
          <div className={styles.navSectionLabel}>Main</div>
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  {link.icon}
                </svg>
                {link.name}
              </Link>
            )
          })}

          <div style={{ flex: 1 }} />
          
          <div className={styles.navSectionLabel}>System</div>
          {bottomLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  {link.icon}
                </svg>
                {link.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Top bar for user profile drop down */}
        <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5,5,8,0.5)', height: '76px', alignItems: 'center' }}>
          <UserMenu isLandingPage={false} />
        </header>
        
        <div style={{ padding: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
