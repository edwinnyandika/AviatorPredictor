// app/layout.js
import './globals.css';
import { Inter_Tight } from 'next/font/google';
import { I18nProvider } from "@/lib/i18n";

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'aviatorIQ — Premium Live Predictor',
  description: 'Advanced AI-powered Aviator crash game predictor using EMA, RSI, and real-time data interception.',
  manifest: '/manifest.json',
  keywords: 'aviator predictor, crash game AI, smart bet, EMA RSI predictor',
  openGraph: {
    title: 'aviatorIQ — Premium Live Predictor',
    description: 'Advanced AI-powered Aviator crash game predictor',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} dark`}>
        <div className="noise-overlay" />
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
