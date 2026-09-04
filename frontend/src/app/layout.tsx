import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Slashforge | Campus Asset & Issue Intelligence',
  description: 'AI-assisted campus asset maintenance and issue reporting platform',
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
