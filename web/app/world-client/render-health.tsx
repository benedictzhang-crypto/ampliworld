'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

/** Low-frequency diagnostics for repeatable playback checks, without React renders. */
export function RenderHealth({ onReady }: { onReady: () => void }) {
  const sample = useRef({ start: 0, frames: 0, ready: false });
  useFrame(({ gl }, delta) => {
    const s = sample.current;
    if (!s.ready) {
      s.ready = true;
      gl.domElement.dataset.worldReady = 'true';
      onReady();
    }
    s.frames++;
    s.start += delta;
    if (s.start < 1) return;
    gl.domElement.dataset.renderFps = (s.frames / s.start).toFixed(1);
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    s.frames = 0;
    s.start = 0;
  });
  return null;
}
