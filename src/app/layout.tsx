import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Lulu Arteira · Sistema de Vales',
  description: 'Brechó Infantil — controle de vales',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Lulu',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#9B6FD4',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
