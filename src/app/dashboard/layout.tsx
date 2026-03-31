'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserMenu from '@/components/UserMenu';
import styles from './layout.module.css';

import { LayoutDashboard, Gamepad2, Wrench, History, UserCircle, Settings } from 'lucide-react';

const navLinks = [
  { name: 'Overview', href: '/dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
  { name: 'Casino', href: '/casino', icon: <Gamepad2 size={18} strokeWidth={1.5} /> },
  { name: 'Tools', href: '/dashboard/tools', icon: <Wrench size={18} strokeWidth={1.5} /> },
  { name: 'History', href: '/dashboard/history', icon: <History size={18} strokeWidth={1.5} /> },
  { name: 'Profile', href: '/dashboard/profile', icon: <UserCircle size={18} strokeWidth={1.5} /> },
  { name: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} strokeWidth={1.5} /> },
];

const titles = {
  '/dashboard': { title: 'Operations Desk', subtitle: 'Real-time signal control room' },
  '/dashboard/tools': { title: 'Tools Library', subtitle: 'Scanners, exports, and operator utilities' },
  '/dashboard/history': { title: 'Session History', subtitle: 'Stored crash rounds and recovery review' },
  '/dashboard/profile': { title: 'Profile', subtitle: 'Identity, preferences, and connected access' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Behavior, theme, and system configuration' },
};

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const currentPath = pathname || '/dashboard';
  const meta = titles[currentPath as keyof typeof titles] || titles['/dashboard'];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/icon.svg" width={30} height={30} alt="aviatorIQ" />
          <div>
            <div className={styles.brandEyebrow}>Control Suite</div>
            <div className={styles.brandName}>aviatorIQ</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navLinks.map((link) => {
            const active = currentPath === link.href;
            return (
              <Link key={link.href} href={link.href} className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}>
                <span className={styles.navIcon}>{link.icon}</span>
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarCard}>
          <div className={styles.sidebarLabel}>Theme direction</div>
          <div className={styles.sidebarTitle}>Sharper data visuals, less noise, more trust.</div>
          <p className={styles.sidebarText}>The desk is tuned for real-time readability first: calmer cards, stronger hierarchy, cleaner accents.</p>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <div className={styles.pageEyebrow}>Dashboard</div>
            <h1 className={styles.pageTitle}>{meta.title}</h1>
            <p className={styles.pageSubtitle}>{meta.subtitle}</p>
          </div>

          <div className={styles.topbarActions}>
            <div className={styles.statusPill}><span className={styles.statusDot} />Live workspace</div>
            <UserMenu isLandingPage={false} />
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
