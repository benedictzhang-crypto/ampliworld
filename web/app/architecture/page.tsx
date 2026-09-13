import type { Metadata } from 'next';
import { ArchitectureLab } from './view';
import './style.css';

export const metadata: Metadata = {
  title: 'AmpliWorld — Golden City construction yard',
  description:
    'Real-metre modular architecture and playable street prototypes for the next AmpliWorld city.',
  openGraph: {
    title: 'AmpliWorld — Golden City construction yard',
    description: 'A new city built from genuine three-dimensional assets.',
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'AmpliWorld — Golden City construction yard',
    description: 'A new city built from genuine three-dimensional assets.',
    images: [],
  },
};

export default function ArchitecturePage() {
  return <ArchitectureLab />;
}
