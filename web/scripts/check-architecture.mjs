import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const url =
  process.env.AMPLIWORLD_ARCHITECTURE_QA_URL ||
  'http://localhost:3018/architecture';
const isDistrict = new URL(url).pathname === '/district';
const base = new URL(
  '../public/assets/3d/ampliworld/GC-RES-001/',
  import.meta.url,
);
const manifest = JSON.parse(
  readFileSync(new URL('residence-manifest.json', base), 'utf8'),
);
assert.equal(manifest.balconies.length, 84);
assert.equal(new Set(manifest.balconies.map((x) => x.facade)).size, 4);
for (const l of manifest.lods) {
  const bytes = readFileSync(new URL(l.file, base));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.length, l.bytes);
  const n = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + n));
  assert.equal(json.images?.length || 0, 0, 'No facade image substitution');
  assert.ok(json.meshes.length > 0);
}
assert.ok(
  manifest.lods[0].triangles > manifest.lods[1].triangles &&
    manifest.lods[1].triangles > manifest.lods[2].triangles,
);
console.log(
  'Asset checks passed: 84 geometric balconies, four facades, three GLBs, no image facades.',
);
const temp = mkdtempSync(join(tmpdir(), 'ampliworld-architecture-qa-'));
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${temp}`,
    '--disable-gpu-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
    '--window-size=1440,1000',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let socket;
const timeout = setTimeout(() => {
  chrome.kill('SIGTERM');
  process.exitCode = 1;
}, 60000);
try {
  let port;
  for (let i = 0; i < 100; i++) {
    const f = join(temp, 'DevToolsActivePort');
    if (existsSync(f)) {
      port = Number(readFileSync(f, 'utf8').split('\n')[0]);
      break;
    }
    await wait(100);
  }
  assert.ok(port);
  const tabs = await (await fetch(`http://localhost:${port}/json/list`)).json();
  socket = new WebSocket(
    tabs.find((t) => t.type === 'page').webSocketDebuggerUrl,
  );
  const pending = new Map();
  let id = 0;
  const exceptions = [];
  socket.addEventListener('message', (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    } else if (m.method === 'Runtime.exceptionThrown')
      exceptions.push(m.params.exceptionDetails.text);
  });
  await new Promise((r) => socket.addEventListener('open', r, { once: true }));
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      socket.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result
      .value;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  let ready = false;
  for (let i = 0; i < 200; i++) {
    ready = await evaluate(
      "!!document.querySelector('canvas') && !document.querySelector('.architecture-loading,.district-loading') && document.querySelector('canvas').width>0",
    );
    if (ready) break;
    await wait(100);
  }
  assert.ok(ready, '3D asset must finish loading');
  await wait(500);
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(temp, name + '.png'), Buffer.from(r.data, 'base64'));
  };
  await shot('corner');
  for (const label of isDistrict ? ['俯瞰街区'] : ['背面', '屋顶']) {
    await evaluate(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('${label}')).click()`,
    );
    await wait(250);
    await shot(label === '背面' ? 'back' : 'roof');
  }
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('控制小人')).click()",
  );
  await wait(300);
  const caption = () =>
    evaluate(`document.querySelector('${isDistrict ? '.district-status' : '.architecture-caption'}').textContent`);
  const before = await caption();
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'w',
    code: 'KeyW',
    windowsVirtualKeyCode: 87,
  });
  await wait(5500);
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'w',
    code: 'KeyW',
    windowsVirtualKeyCode: 87,
  });
  await wait(300);
  const after = await caption();
  const z = Number(after.match(/Z\s+(-?[\d.]+)/)?.[1]);
  assert.ok(
    isDistrict ? z < 24 && z >= -77 : z >= 12.4 && z < 27,
    `Player moves toward but does not enter residence: ${after}`,
  );
  assert.notEqual(before, after);
  await shot('walk');
  assert.equal(exceptions.length, 0, exceptions.join('\n'));
  console.log(
    JSON.stringify({ status: 'passed', before, after, screenshots: temp }),
  );
} finally {
  clearTimeout(timeout);
  socket?.close();
  chrome.kill('SIGTERM');
}
