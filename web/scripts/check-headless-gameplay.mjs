import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { inflateSync } from 'node:zlib';

const chromePath =
  process.env.AMPLIWORLD_CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const targetUrl = process.env.AMPLIWORLD_QA_URL ?? 'http://localhost:3000';
const screenshotPath =
  process.env.AMPLIWORLD_QA_SCREENSHOT ??
  path.join(tmpdir(), 'ampliworld-headless-gameplay.png');
const overviewScreenshotPath = screenshotPath.replace(
  /\.png$/i,
  '-overview.png',
);
const topScreenshotPath = screenshotPath.replace(/\.png$/i, '-top.png');
const narrowOverviewScreenshotPath = screenshotPath.replace(
  /\.png$/i,
  '-narrow-overview.png',
);

assert.ok(
  existsSync(chromePath),
  `Headless Chrome is unavailable at ${chromePath}`,
);

const profileDirectory = mkdtempSync(path.join(tmpdir(), 'ampliworld-qa-'));
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDirectory}`,
    '--disable-gpu-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
    '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'ignore'] },
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugPort() {
  const activePortFile = path.join(profileDirectory, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (existsSync(activePortFile)) {
      const [port] = readFileSync(activePortFile, 'utf8').trim().split('\n');
      if (port) return Number(port);
    }
    await delay(50);
  }
  throw new Error('Chrome DevTools port did not become ready');
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const events = new Map();
  let nextId = 1;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    for (const listener of events.get(message.method) ?? [])
      listener(message.params);
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    opened,
    on(method, listener) {
      const listeners = events.get(method) ?? [];
      listeners.push(listener);
      events.set(method, listeners);
    },
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

function coordinatesFromBody(bodyText) {
  const match = bodyText.match(
    /LOCAL WINDOW\s*·\s*X\s*(-?\d+(?:\.\d+)?)\s*·\s*Z\s*(-?\d+(?:\.\d+)?)/i,
  );
  assert.ok(match, 'The live HUD must publish the player world coordinates');
  return { x: Number(match[1]), z: Number(match[2]) };
}

function displacement(from, to) {
  return { x: to.x - from.x, z: to.z - from.z };
}

function displacementLength(vector) {
  return Math.hypot(vector.x, vector.z);
}

function directionCosine(left, right) {
  return (
    (left.x * right.x + left.z * right.z) /
    Math.max(
      displacementLength(left) * displacementLength(right),
      Number.EPSILON,
    )
  );
}

function angleDistance(left, right) {
  return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)));
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance)
    return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

/** Decode Chrome's 8-bit RGB/RGBA screenshot enough to reject black frames. */
function pngVisualStats(buffer) {
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const imageData = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
      assert.equal(buffer[dataStart + 12], 0, 'Interlaced PNG is unsupported');
    } else if (type === 'IDAT') {
      imageData.push(buffer.subarray(dataStart, dataEnd));
    }
    offset = dataEnd + 4;
  }
  assert.equal(bitDepth, 8, 'Headless screenshot must use 8-bit channels');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  assert.ok(channels, `Unsupported screenshot PNG color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(imageData));
  const stride = width * channels;
  let previous = Buffer.alloc(stride);
  let current = Buffer.alloc(stride);
  let sourceOffset = 0;
  let samples = 0;
  let luminanceTotal = 0;
  let luminanceSquaredTotal = 0;
  let brightSamples = 0;
  const colorBins = new Set();
  const minX = Math.floor(width * 0.22);
  const maxX = Math.ceil(width * 0.78);
  const minY = Math.floor(height * 0.2);
  const maxY = Math.ceil(height * 0.72);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    for (let byte = 0; byte < stride; byte += 1) {
      const encoded = raw[sourceOffset + byte];
      const left = byte >= channels ? current[byte - channels] : 0;
      const up = previous[byte];
      const upperLeft = byte >= channels ? previous[byte - channels] : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? Math.floor((left + up) / 2)
                : paethPredictor(left, up, upperLeft);
      current[byte] = (encoded + predictor) & 0xff;
    }
    sourceOffset += stride;
    if (y >= minY && y < maxY) {
      for (let x = minX; x < maxX; x += 3) {
        const pixel = x * channels;
        const red = current[pixel];
        const green = current[pixel + 1];
        const blue = current[pixel + 2];
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        luminanceTotal += luminance;
        luminanceSquaredTotal += luminance * luminance;
        if (luminance >= 22) brightSamples += 1;
        colorBins.add((red >> 4) * 256 + (green >> 4) * 16 + (blue >> 4));
        samples += 1;
      }
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  const meanLuminance = luminanceTotal / samples;
  const deviation = Math.sqrt(
    Math.max(0, luminanceSquaredTotal / samples - meanLuminance ** 2),
  );
  return {
    width,
    height,
    meanLuminance,
    deviation,
    brightFraction: brightSamples / samples,
    colorBinCount: colorBins.size,
  };
}

function assertRenderedFrame(buffer, label) {
  const stats = pngVisualStats(buffer);
  assert.ok(stats.meanLuminance > 7, `${label} must not be an all-black frame`);
  assert.ok(stats.deviation > 4, `${label} must retain visible scene contrast`);
  assert.ok(
    stats.brightFraction > 0.01,
    `${label} must contain visible geometry`,
  );
  assert.ok(
    stats.colorBinCount > 12,
    `${label} must not be a flat clear color`,
  );
  return stats;
}

let cdp;
try {
  const port = await waitForDebugPort();
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(
    (response) => response.json(),
  );
  const page = pages.find((candidate) => candidate.type === 'page');
  assert.ok(page, 'Headless Chrome did not expose a page target');
  cdp = connectCdp(page.webSocketDebuggerUrl);
  await cdp.opened;

  const runtimeErrors = [];
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    runtimeErrors.push(exceptionDetails.text ?? 'Uncaught runtime exception');
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: targetUrl });
  await delay(10_000);

  const readBody = async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'document.body?.innerText ?? ""',
      returnByValue: true,
    });
    return result.result.value;
  };
  const readController = async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        let snapshot = null;
        const receive = (event) => { snapshot = event.detail; };
        window.addEventListener('ampliworld-controller-state', receive, { once: true });
        window.dispatchEvent(new Event('ampliworld-read-controller-state'));
        return snapshot;
      })()`,
      returnByValue: true,
    });
    const snapshot = result.result.value;
    assert.ok(snapshot, 'The mounted Player must answer the QA state probe');
    for (const field of [
      'playerX',
      'playerY',
      'playerZ',
      'playerHeading',
      'cameraHeading',
      'cameraPitch',
      'cameraX',
      'cameraY',
      'cameraZ',
    ])
      assert.ok(Number.isFinite(snapshot[field]), `${field} must be finite`);
    assert.equal(typeof snapshot.cameraPointOccluded, 'boolean');
    assert.equal(typeof snapshot.avatarVisible, 'boolean');
    return {
      x: snapshot.playerX,
      y: snapshot.playerY,
      z: snapshot.playerZ,
      playerHeading: snapshot.playerHeading,
      cameraHeading: snapshot.cameraHeading,
      cameraPitch: snapshot.cameraPitch,
      cameraX: snapshot.cameraX,
      cameraY: snapshot.cameraY,
      cameraZ: snapshot.cameraZ,
      cameraPointOccluded: snapshot.cameraPointOccluded,
      avatarVisible: snapshot.avatarVisible,
    };
  };
  const pressForward = async () => {
    await cdp.send('Runtime.evaluate', {
      expression:
        'window.dispatchEvent(new KeyboardEvent("keydown", { key: "w", code: "KeyW", bubbles: true }))',
    });
    // SwiftShader renders this dense scene at a deliberately low frame rate;
    // hold long enough to cross the HUD's two-unit reporting quantization.
    await delay(1_800);
    await cdp.send('Runtime.evaluate', {
      expression:
        'window.dispatchEvent(new KeyboardEvent("keyup", { key: "w", code: "KeyW", bubbles: true }))',
    });
    await delay(250);
  };
  const clickViewButton = async (label) => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const button = [...document.querySelectorAll('.world-view-controls button')]
          .find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(label)});
        button?.click();
        return Boolean(button);
      })()`,
      returnByValue: true,
    });
    assert.equal(result.result.value, true, `${label} view control must exist`);
  };
  const readActiveView = async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('.world-view-controls button[aria-pressed="true"]')?.textContent?.trim() ?? null`,
      returnByValue: true,
    });
    return result.result.value;
  };
  const tapWorldKey = async (key, code) => {
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, code: ${JSON.stringify(code)}, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: ${JSON.stringify(key)}, code: ${JSON.stringify(code)}, bubbles: true }));
      })()`,
    });
    await delay(180);
  };
  const captureScreenshot = async (outputPath) => {
    const screenshot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });
    const buffer = Buffer.from(screenshot.data, 'base64');
    writeFileSync(outputPath, buffer);
    return buffer;
  };
  const assertWebGlHealthy = async (label) => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('.playfield canvas');
        const context = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
        return Boolean(context && !context.isContextLost());
      })()`,
      returnByValue: true,
    });
    assert.equal(
      result.result.value,
      true,
      `${label} WebGL context must be live`,
    );
  };
  const assertFollowCameraSafe = (snapshot, label) => {
    assert.equal(
      snapshot.cameraPointOccluded,
      false,
      `${label} camera must not occupy a registered occluder`,
    );
    assert.ok(
      Math.hypot(
        snapshot.cameraX - snapshot.x,
        snapshot.cameraY - (snapshot.y + 1.7),
        snapshot.cameraZ - snapshot.z,
      ) >= 0.9,
      `${label} camera must remain outside the visible avatar`,
    );
    assert.equal(
      snapshot.avatarVisible,
      true,
      `${label} must remain a visible third-person view`,
    );
  };

  const initialHud = coordinatesFromBody(await readBody());
  const initial = await readController();
  assert.equal(
    await readActiveView(),
    'PLAYER',
    'A fresh city load must default to the third-person player view',
  );
  assertFollowCameraSafe(initial, 'Initial follow');
  await assertWebGlHealthy('Initial follow');
  assert.ok(Math.abs(initialHud.x - initial.x) <= 2);
  assert.ok(Math.abs(initialHud.z - initial.z) <= 2);

  await clickViewButton('45° WORLD');
  await tapWorldKey('m', 'KeyM');
  await tapWorldKey('m', 'KeyM');
  assert.equal(
    await readActiveView(),
    'PLAYER',
    'Closing the city map must return control to the third-person player view',
  );

  const contextLossProbe = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('.playfield canvas');
      if (!canvas) return { found: false, prevented: false };
      window.__ampliworldQaOldCanvas = canvas;
      const event = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(event);
      return { found: true, prevented: event.defaultPrevented };
    })()`,
    returnByValue: true,
  });
  assert.equal(contextLossProbe.result.value.found, true);
  assert.equal(
    contextLossProbe.result.value.prevented,
    true,
    'WebGL context loss must be intercepted for controlled recovery',
  );
  await delay(1_500);
  const recoveredCanvas = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('.playfield canvas');
      return {
        found: Boolean(canvas),
        replaced: Boolean(canvas && canvas !== window.__ampliworldQaOldCanvas),
        recovering: document.body.innerText.includes('RESTORING 3D WORLD…'),
      };
    })()`,
    returnByValue: true,
  });
  assert.deepEqual(recoveredCanvas.result.value, {
    found: true,
    replaced: true,
    recovering: false,
  });
  assertFollowCameraSafe(await readController(), 'Recovered follow');
  await assertWebGlHealthy('Recovered follow');

  await pressForward();
  const afterForward = await readController();

  for (let swipe = 0; swipe < 3; swipe += 1) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 720,
      y: 450,
      deltaX: 180,
      deltaY: 0,
    });
  }
  await delay(450);
  const afterTrackpadOrbit = await readController();
  assertFollowCameraSafe(afterTrackpadOrbit, 'Trackpad orbit');
  await pressForward();
  const afterTrackpadMove = await readController();

  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 500,
    y: 450,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  for (const [x, y] of [
    [580, 440],
    [660, 430],
    [740, 420],
    [820, 410],
  ]) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'left',
      buttons: 1,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 820,
    y: 410,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  await delay(450);
  const afterMouseOrbit = await readController();
  assertFollowCameraSafe(afterMouseOrbit, 'Mouse orbit');
  await pressForward();
  const afterMouseMove = await readController();

  const forwardVector = displacement(initial, afterForward);
  const trackpadVector = displacement(afterTrackpadOrbit, afterTrackpadMove);
  const mouseVector = displacement(afterMouseOrbit, afterMouseMove);
  assert.ok(
    displacementLength(forwardVector) >= 0.1,
    'W must move the visible avatar through the physical world',
  );
  assert.ok(
    displacementLength(displacement(afterForward, afterTrackpadOrbit)) < 0.02,
    'Trackpad camera orbit must not drag the idle avatar',
  );
  assert.ok(
    angleDistance(
      afterForward.cameraHeading,
      afterTrackpadOrbit.cameraHeading,
    ) > 0.2,
    'Two-finger horizontal input must orbit the idle camera',
  );
  assert.ok(
    displacementLength(trackpadVector) >= 0.1,
    'W must keep moving after independent trackpad camera orbit',
  );
  assert.ok(
    directionCosine(forwardVector, trackpadVector) < 0.97,
    'Two-finger horizontal input must change the camera-relative W direction',
  );
  assert.ok(
    displacementLength(displacement(afterTrackpadMove, afterMouseOrbit)) < 0.02,
    'Mouse camera orbit must not drag the idle avatar',
  );
  assert.ok(
    angleDistance(
      afterTrackpadMove.cameraHeading,
      afterMouseOrbit.cameraHeading,
    ) > 0.2,
    'Mouse drag must orbit the idle camera',
  );
  assert.ok(
    displacementLength(mouseVector) >= 0.1,
    'W must keep moving after independent mouse-drag camera orbit',
  );
  assert.ok(
    directionCosine(trackpadVector, mouseVector) < 0.985,
    'Mouse drag must change the camera-relative W direction while idle',
  );

  const followFrameStats = assertRenderedFrame(
    await captureScreenshot(screenshotPath),
    'Follow view',
  );
  const positionBeforeOverview = await readController();
  await clickViewButton('45° WORLD');
  await delay(5_000);
  assert.match(
    await readBody(),
    /3D CONTINENT MODEL/,
    'The oblique overview must replace the player-control legend',
  );
  const overviewFrameStats = assertRenderedFrame(
    await captureScreenshot(overviewScreenshotPath),
    'Oblique overview',
  );
  await clickViewButton('TOP');
  await delay(3_000);
  const topFrameStats = assertRenderedFrame(
    await captureScreenshot(topScreenshotPath),
    'Top overview',
  );
  await clickViewButton('PLAYER');
  await delay(900);
  const positionAfterOverview = await readController();
  assertFollowCameraSafe(positionAfterOverview, 'Reactivated follow');
  assert.ok(
    displacementLength(
      displacement(positionBeforeOverview, positionAfterOverview),
    ) < 0.02,
    'Overview mode must not teleport or drag the player',
  );
  await assertWebGlHealthy('Reactivated follow');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await delay(1_000);
  const positionBeforeNarrowOverview = await readController();
  await clickViewButton('45° WORLD');
  for (let click = 0; click < 4; click += 1) await clickViewButton('−');
  await delay(4_000);
  const narrowOverviewFrameStats = assertRenderedFrame(
    await captureScreenshot(narrowOverviewScreenshotPath),
    'Narrow maximum-zoom-out overview',
  );
  await pressForward();
  const positionDuringNarrowOverview = await readController();
  assert.ok(
    displacementLength(
      displacement(positionBeforeNarrowOverview, positionDuringNarrowOverview),
    ) < 0.02,
    'Movement input must remain disabled while the overview camera owns the view',
  );
  await assertWebGlHealthy('Narrow overview');
  await clickViewButton('PLAYER');
  await delay(900);
  assertFollowCameraSafe(await readController(), 'Narrow reactivated follow');
  assert.deepEqual(runtimeErrors, [], runtimeErrors.join('\n'));

  console.log(
    JSON.stringify(
      {
        initial,
        afterForward,
        afterTrackpadOrbit,
        afterTrackpadMove,
        afterMouseOrbit,
        afterMouseMove,
        screenshotPath,
        overviewScreenshotPath,
        topScreenshotPath,
        narrowOverviewScreenshotPath,
        followFrameStats,
        overviewFrameStats,
        topFrameStats,
        narrowOverviewFrameStats,
      },
      null,
      2,
    ),
  );
} finally {
  cdp?.close();
  chrome.kill('SIGTERM');
  await Promise.race([once(chrome, 'exit'), delay(2_000)]);
  rmSync(profileDirectory, {
    recursive: true,
    force: true,
    maxRetries: 12,
    retryDelay: 100,
  });
}
