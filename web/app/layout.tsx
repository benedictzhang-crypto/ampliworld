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
  title: 'AmpliWorld — Golden City',
  description:
    'Explore AmpliWorld’s growing three-dimensional city: residential streets, a courtyard galleria and gardens.',
  openGraph: {
    title: 'AmpliWorld — Golden City',
    description:
      'Explore residential streets, a courtyard galleria and gardens in the new AmpliWorld.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AmpliWorld — Golden City',
    description:
      'Explore residential streets, a courtyard galleria and gardens in the new AmpliWorld.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
