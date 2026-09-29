import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { preserveTroikaWorkerRuntime } from './troika-worker-runtime.mjs';

const id = new URL('../node_modules/troika-three-text/dist/troika-three-text.esm.js', import.meta.url).pathname;
const raw = readFileSync(id, 'utf8');
const transformed = preserveTroikaWorkerRuntime().transform(raw, id).code;
// Reproduce the framework's browser define, then execute the serialized parser
// in an actual no-window realm, as Troika's worker does.
const start = transformed.indexOf('function typrFactory(');
const end = transformed.indexOf('\n', start);
const factory = transformed.slice(start, end).replaceAll('typeof window', '"object"');
assert(start >= 0 && factory.includes('globalThis.window'));
const worker = { self: {}, TextDecoder };
worker.self = worker;
const parser = runInNewContext(`(${factory})()`, worker);
assert.equal(typeof parser.parse, 'function');
assert.equal(typeof parser.U, 'object');
assert.equal(preserveTroikaWorkerRuntime().transform('typeof window', '/app/other.js'), undefined);
console.log('Font parser initializes in a worker without window; unrelated code unchanged.');
