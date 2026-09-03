import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/pwa/PwaRegister';

export const metadata: Metadata = {
  title: 'FinTrack - Minimalist Daily Personal Finance',
  description: 'Minimalist personal finance and daily expense tracker PWA optimized for Android and Vercel',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinTrack',
  },
  applicationName: 'FinTrack',
  authors: [{ name: 'FinTrack' }],
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
      </head>
      <body className="min-h-screen bg-[#f4f4f5] text-zinc-950 flex flex-col font-sans selection:bg-black selection:text-white antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
