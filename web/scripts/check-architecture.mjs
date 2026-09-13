import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const url =
  process.env.AMPLIWORLD_ARCHITECTURE_QA_URL ||
  'http://localhost:3018/architecture';
const isDistrict = ['/', '/district'].includes(new URL(url).pathname);
const isCampus = process.env.QA_MALL_CAMPUS === '1';
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
    ...(process.env.QA_NATIVE_GPU === '1' ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
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
      if (Number.isInteger(port) && port > 0) break;
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
    evaluate(
      `document.querySelector('${isDistrict ? '.district-status' : '.architecture-caption'}').textContent`,
    );
  const before = await caption();
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'w',
    code: 'KeyW',
    windowsVirtualKeyCode: 87,
  });
  await wait(750);
  const player = () =>
    evaluate(
      "JSON.parse(document.querySelector('canvas').dataset.player || '{}')",
    );
  const gaitA = await player();
  // Software-rendered tall skylines can take >300 ms per frame. Sample a
  // changed rendered pose, with a deadline, instead of sampling the same frame.
  let gaitB = gaitA;
  for (let i = 0; i < 12; i++) {
    await wait(300);
    gaitB = await player();
    if (Math.abs(gaitA.leftLeg - gaitB.leftLeg) > 0.01) break;
  }
  assert.ok(
    Math.abs(gaitA.leftLeg - gaitB.leftLeg) > 0.01,
    `Leg pose must animate while walking: ${JSON.stringify({gaitA,gaitB})}`,
  );
  assert.ok(
    Math.abs(gaitB.leftLeg + gaitB.rightLeg) < 0.001,
    'Legs must alternate',
  );
  await wait(4450);
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
    isDistrict ? z < -69 && z >= -177 : z >= 12.3 && z < 27,
    `Player moves toward but does not enter residence: ${after}`,
  );
  assert.notEqual(before, after);
  await shot('walk');
  // S is a turn-and-walk toward camera, not a backwards strafe animation.
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 's',
    code: 'KeyS',
    windowsVirtualKeyCode: 83,
  });
  await wait(1300);
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 's',
    code: 'KeyS',
    windowsVirtualKeyCode: 83,
  });
  await wait(300);
  const returning = await player();
  assert.ok(returning.z > z + 1, 'S must move toward the camera');
  assert.ok(
    Math.abs(Math.atan2(Math.sin(returning.yaw), Math.cos(returning.yaw))) <
      0.2,
    'Visible face must point toward camera on S',
  );
  await shot('return-facing-camera');
  // Tap and release immediately; demand rendering must continue through landing.
  const floor = returning.y;
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
  });
  await wait(60);
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
  });
  await wait(300);
  const airborne = await player();
  assert.ok(
    !airborne.grounded && airborne.y > floor + 0.3,
    'Released jump must still rise',
  );
  await shot('jump');
  await wait(1200);
  const landed = await player();
  assert.ok(
    landed.grounded && Math.abs(landed.y - floor) < 0.05,
    'Released jump must land without held keys',
  );
  assert.ok(
    Math.hypot(landed.x - returning.x, landed.z - returning.z) < 0.01,
    'Jump must not reset position to spawn',
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
  });
  await wait(1600);
  let held = await player();
  for (let attempt = 0; attempt < 20 && !held.grounded; attempt++) {
    await wait(100);
    held = await player();
  }
  assert.ok(held.grounded, 'Holding Space must not bunny-hop');
  await wait(400);
  assert.ok(
    (await player()).grounded,
    'Held Space must remain grounded after landing',
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
  });
  await wait(200);
  if (isDistrict && !isCampus) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87,
    });
    for (let attempt = 0; attempt < 200; attempt++) {
      await wait(100);
      if ((await player()).z < -112) break;
    }
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87,
    });
    await wait(200);
    const garden = await player();
    assert.ok(
      garden.z < -112 && garden.z > -122,
      'Walk through the actual portal into the courtyard',
    );
    await shot('mall-garden');
  }
  const beforeOrbit = await player();
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 450,
    y: 380,
    button: 'left',
    clickCount: 1,
  });
  for (let i = 1; i <= 6; i++)
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 450 + i * 50,
      y: 380,
      button: 'left',
      buttons: 1,
    });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 750,
    y: 380,
    button: 'left',
    clickCount: 1,
  });
  await wait(200);
  const afterOrbit = await player();
  assert.ok(
    Math.hypot(afterOrbit.x - beforeOrbit.x, afterOrbit.z - beforeOrbit.z) <
      0.01,
    'Mouse orbit must not move the avatar',
  );
  assert.ok(
    Math.abs(afterOrbit.yaw - beforeOrbit.yaw) < 0.01,
    'Mouse orbit must not rotate an idle avatar',
  );
  assert.equal(exceptions.length, 0, exceptions.join('\n'));
  if(isCampus){
    const retained=await player();
    await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('俯瞰街区')).click()");
    await wait(250);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});await wait(250);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
    await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('控制小人')).click()");await wait(400);
    const resumed=await player();
    assert.ok(Math.hypot(resumed.x-retained.x,resumed.z-retained.z)<.01,'Overview must retain actual player position and ignore walking input');
    assert.ok(Math.abs(resumed.y-retained.y)<.03,'Overview must retain elevation');
    await shot('resumed-street');
  }
  console.log(
    JSON.stringify({ status: 'passed', before, after, screenshots: temp }),
  );
} finally {
  clearTimeout(timeout);
  socket?.close();
  chrome.kill('SIGTERM');
}
