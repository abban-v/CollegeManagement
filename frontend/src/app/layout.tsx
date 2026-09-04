import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'CET | CampusFix',
  description: 'College of Engineering Trivandrum - Campus Asset & Issue Management Portal',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [{ url: '/logo.png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-[#09090b] text-slate-100 selection:bg-blue-500/30 selection:text-blue-200"
      >
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
