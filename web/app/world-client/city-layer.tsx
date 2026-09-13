'use client';
import { Suspense, useEffect, useMemo } from 'react';
import { Clone, useGLTF } from '@react-three/drei';
import city from '../../public/assets/3d/ampliworld/GC-CITY-2030/city-manifest.json';
export const CITY = city;
export type CityTile = (typeof city.tiles)[number];
const ROOT = '/assets/3d/ampliworld/GC-CITY-2030/';
function DetailTile({
  tile,
  onReady,
}: {
  tile: CityTile;
  onReady: (id: string) => void;
}) {
  const { scene } = useGLTF(ROOT + tile.file);
  useEffect(() => {
    onReady(tile.id);
  }, [tile.id, onReady]);
  return <Clone object={scene} castShadow receiveShadow />;
}
function DistantCity({ hidden }: { hidden: ReadonlySet<string> }) {
  const { scene } = useGLTF(ROOT + 'city-overview.glb');
  const copy = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    copy.traverse((node) => {
      if (node.name.startsWith('GC-TILE-'))
        node.visible = !hidden.has(node.name);
    });
  }, [copy, hidden]);
  return <primitive object={copy} />;
}
export function CityLayer({
  tiles,
  loaded,
  onReady,
  overview,
}: {
  tiles: CityTile[];
  loaded: ReadonlySet<string>;
  onReady: (id: string) => void;
  overview: boolean;
}) {
  const hidden = useMemo(
    () =>
      new Set(
        overview ? [] : tiles.filter((t) => loaded.has(t.id)).map((t) => t.id),
      ),
    [tiles, loaded, overview],
  );
  return (
    <>
      <Suspense fallback={null}>
        <DistantCity hidden={hidden} />
      </Suspense>
      {!overview &&
        tiles.map((tile) => (
          <Suspense key={tile.id} fallback={null}>
            <DetailTile tile={tile} onReady={onReady} />
          </Suspense>
        ))}
    </>
  );
}
