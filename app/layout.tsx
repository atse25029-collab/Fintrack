import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/pwa/PwaRegister';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fintrack-atse25029.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FinTrack - Minimalist Daily Personal Finance & Expense Tracker',
    template: '%s | FinTrack',
  },
  description:
    'Ultra-fast, minimalist personal finance tracker and daily expense logger. Features zero-timeout cloud sync, bank SMS clipboard parser, AI receipt scanner, and debt tabs manager.',
  keywords: [
    'personal finance tracker',
    'expense tracker PWA',
    'daily expense manager',
    'minimalist finance app',
    'budget planner India',
    'bill split debt tabs',
    'bank SMS expense parser',
    'receipt OCR scanner',
    'offline-first finance app',
    'free personal finance tracker',
  ],
  authors: [{ name: 'FinTrack Team', url: siteUrl }],
  creator: 'FinTrack',
  publisher: 'FinTrack',
  applicationName: 'FinTrack',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinTrack',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    title: 'FinTrack - Minimalist Daily Personal Finance & Expense Tracker',
    description:
      'Ultra-fast daily expense tracker with bank SMS parser, AI receipt scanning, social debt tabs, and monthly dues reminders.',
    siteName: 'FinTrack',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'FinTrack Minimalist Personal Finance Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'FinTrack - Minimalist Daily Personal Finance',
    description:
      'Ultra-fast daily expense logger with offline-first local storage, bank SMS parser, and private cloud sync.',
    images: ['/icons/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FinTrack',
    operatingSystem: 'All (Web, Android, iOS, Windows, macOS)',
    applicationCategory: 'FinanceApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    description:
      'Minimalist daily personal finance and expense tracker PWA with bank SMS parser, AI receipt scanning, debt tabs, and multi-device cloud sync.',
    screenshot: `${siteUrl}/icons/icon-512.png`,
    softwareVersion: '2.4.0',
  };

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#f4f4f5] text-zinc-950 flex flex-col font-sans selection:bg-black selection:text-white antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
