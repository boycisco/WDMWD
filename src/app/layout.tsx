import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WDMWD — Onchain Intelligence Assistant',
  description: 'Personal onchain intelligence assistant for investigating wallet addresses, transactions, and fund movements on Base.',
  openGraph: {
    title: 'WDMWD — Onchain Intelligence Assistant',
    description: 'Personal onchain intelligence assistant for investigating wallet addresses, transactions, and fund movements on Base.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WDMWD — Onchain Intelligence Assistant',
    description: 'Personal onchain intelligence assistant for investigating wallet addresses, transactions, and fund movements on Base.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${inter.variable}`}>
      {/* Replaced min-h-screen with h-[100dvh] overflow-hidden */}
      <body className="bg-[#070B14] text-[#F0F4FF] font-sans antialiased h-[100dvh] overflow-hidden selection:bg-[#0052FF]/30 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}