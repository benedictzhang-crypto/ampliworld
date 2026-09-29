/**
 * Vinext folds `typeof window` to "object" for browser bundles. Troika also
 * serializes its font parser into a Worker, where that assumption is false.
 * Preserve the runtime check inside this dependency, without moving font
 * parsing back onto the rendering thread or modifying installed packages.
 */
export function preserveTroikaWorkerRuntime() {
  return {
    name: 'ampliworld-troika-worker-runtime',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').includes('/troika-three-text/')) return;
      if (!code.includes('typeof window')) return;
      return { code: code.replaceAll('typeof window', 'typeof globalThis.window'), map: null };
    },
  };
}
