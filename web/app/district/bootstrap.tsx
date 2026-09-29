'use client';

import dynamic from 'next/dynamic';

// WebGL/Three loaders create browser resources at module scope. Do not import
// the 3D module into the server worker, even when Canvas itself is conditional.
const BrowserDistrict = dynamic(
  () => import('./view').then((module) => module.DistrictClient),
  { ssr: false, loading: () => <p role="status">Opening AmpliWorld…</p> },
);

export function DistrictClient() {
  return <BrowserDistrict />;
}
