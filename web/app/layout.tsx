import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ampliworld-game.peachy-mule-6239.chatgpt.site'),
  title: 'AmpliWorld — Trade the Living World',
  description: 'A persistent world-market game where every player begins with $10,000 and builds wealth through virtual trading.',
  openGraph: {
    title: 'AmpliWorld — Trade the Living World',
    description: 'Begin with $10,000. Read the living world. Build wealth through the market.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AmpliWorld — Trade the Living World',
    description: 'Begin with $10,000. Read the living world. Build wealth through the market.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
