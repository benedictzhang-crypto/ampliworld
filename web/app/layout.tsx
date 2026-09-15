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
  metadataBase: new URL('https://ampliworld-game.benedictzhang01.chatgpt.site'),
  title: 'AmpliWorld — Observable World Lab',
  description:
    'Observe synthetic households, consumption and city services in a detailed three-dimensional world. Experimental simulation, not a calibrated forecast.',
  openGraph: {
    title: 'AmpliWorld — Observable World Lab',
    description:
      'Observe synthetic households, commerce and public services in AmpliWorld’s detailed 3D city.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AmpliWorld — Observable World Lab',
    description:
      'Observe synthetic households, commerce and public services in AmpliWorld’s detailed 3D city.',
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
