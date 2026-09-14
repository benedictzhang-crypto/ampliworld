/** Six ORIGINAL angular skyline towers in two independently exported campus kits.
 * Detail revision 2: original revised profiles, open structural crowns and real facade layers.
 * Install as scripts/assets/build-subcenters.mjs. Metres, local groundY=.18.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';
if (!globalThis.FileReader)
  globalThis.FileReader = class {
    readAsArrayBuffer(b) {
      b.arrayBuffer().then((v) => {
        this.result = v;
        this.onloadend?.();
      });
    }
  };
const G = 0.18,
  configs = [
    {
      id: 'GC-SUBCENTER-001',
      name: 'Vector Finance and Innovation',
      nameZh: '向量金融创新副中心',
      flavor: 'cool blue, silver and structural gold',
      towers: [
        {
          id: 'SC1-T01',
          name: 'Vector Exchange',
          height: 460,
          x: -132,
          z: -90,
          type: 'vector',
        },
        {
          id: 'SC1-T02',
          name: 'Twin Fold',
          height: 320,
          x: 132,
          z: -90,
          type: 'twin',
        },
        {
          id: 'SC1-T03',
          name: 'Prism Stack',
          height: 235,
          x: 0,
          z: 130,
          type: 'stack',
        },
      ],
    },
    {
      id: 'GC-SUBCENTER-002',
      name: 'Southern Bay Culture and Hospitality',
      nameZh: '南湾文化酒店副中心',
      flavor: 'warm ivory, bronze, dark glass and planted terraces',
      towers: [
        {
          id: 'SC2-T01',
          name: 'Tidal Lantern',
          height: 400,
          x: -132,
          z: -90,
          type: 'tidal',
        },
        {
          id: 'SC2-T02',
          name: 'Harbor Ledger',
          height: 290,
          x: 132,
          z: -90,
          type: 'ledger',
        },
        {
          id: 'SC2-T03',
          name: 'Culture Beacon',
          height: 225,
          x: 0,
          z: 130,
          type: 'beacon',
        },
      ],
    },
  ];
function createCampus(config) {
  const buckets = {},
    colliders = [],
    surfaces = [],
    towers = [],
    materials = {};
  let activeBounds = null,
    towerTopY = Infinity,
    towerShells = [];
  for (const [name, color, metalness, roughness] of [
    ['ivory', 0xe1e2d7, 0.18, 0.47],
    ['silver', 0xb8c6cd, 0.8, 0.28],
    ['gold', 0xc3a369, 0.76, 0.29],
    ['blue', 0x507889, 0.76, 0.21],
    ['glass', 0x8eacb5, 0.73, 0.23],
    ['dark', 0x283c48, 0.55, 0.39],
    ['stone', 0xb2bcb6, 0.06, 0.8],
    ['leaf', 0x5a7d61, 0, 0.9],
    ['light', 0xffdfa7, 0.17, 0.3],
  ])
    materials[name] = new T.MeshStandardMaterial({
      name,
      color,
      metalness,
      roughness,
    });
  materials.light.emissive = new T.Color(0xffdda4);
  materials.light.emissiveIntensity = 0.5;
  function add(g, m, x = 0, y = 0, z = 0) {
    g.translate(x, y, z);
    if (g.index) g = g.toNonIndexed();
    delete g.attributes.uv;
    g.computeBoundingBox();
    if (activeBounds) activeBounds.union(g.boundingBox);
    (buckets[m] ??= []).push(g);
  }
  function box(m, x, y, z, w, h, d) {
    add(new T.BoxGeometry(w, h, d), m, x, y, z);
  }
  function solid(id, min, max) {
    colliders.push({ id, min, max });
  }
  function surface(id, x0, z0, x1, z1, y) {
    surfaces.push({ id, min: [x0, z0], max: [x1, z1], y });
  }
  function rod(m, a, b, w = 0.3, d = 0.3) {
    a = [...a];
    b = [...b];
    // Terminate structural fins beneath crown caps, keeping exact tower heights.
    if (a[1] >= towerTopY - 0.001) a[1] -= 0.8;
    if (b[1] >= towerTopY - 0.001) b[1] -= 0.8;
    const p = new T.Vector3(...a),
      q = new T.Vector3(...b),
      v = q.clone().sub(p),
      g = new T.BoxGeometry(w, v.length(), d);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        v.normalize(),
      ),
    );
    const c = p.add(q).multiplyScalar(0.5);
    add(g, m, c.x, c.y, c.z);
  }
  const octagon = (rx, rz) => [
    [rx * 0.72, -rz],
    [rx, -rz * 0.66],
    [rx, rz * 0.66],
    [rx * 0.72, rz],
    [-rx * 0.72, rz],
    [-rx, rz * 0.66],
    [-rx, -rz * 0.66],
    [-rx * 0.72, -rz],
  ];
  // Closed, flat-shaded polygon loft. Welding later retains hard crease normals.
  function loft(id, cx, cz, rings, mat) {
    if (id && !id.endsWith("-podium")) towerShells.push({ cx, cz, rings });
    const v = [],
      f = [],
      n = rings[0].p.length;
    for (const ring of rings)
      for (const [x, z] of ring.p) v.push(cx + x, G + ring.y, cz + z);
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < n; j++) {
        const a = i * n + j,
          b = i * n + ((j + 1) % n),
          c = a + n,
          d = b + n;
        f.push(a, c, b, b, c, d);
      }
    for (const last of [false, true]) {
      const r = last ? rings.length - 1 : 0,
        ring = rings[r],
        c = ring.p.reduce(
          (acc, p) => [acc[0] + p[0] / n, acc[1] + p[1] / n],
          [0, 0],
        ),
        center = v.length / 3;
      v.push(cx + c[0], G + ring.y, cz + c[1]);
      for (let j = 0; j < n; j++)
        f.push(
          ...(last
            ? [center, r * n + ((j + 1) % n), r * n + j]
            : [center, r * n + j, r * n + ((j + 1) % n)]),
        );
    }
    let g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    g.setIndex(f);
    g = g.toNonIndexed();
    g.computeVertexNormals();
    add(g, mat);
    if (id && !id.endsWith('-podium')) facadeDetail(cx, cz, rings);
    if (id)
      for (let i = 0; i < rings.length - 1; i++) {
        const bounds = new T.Box3();
        for (const r of [rings[i], rings[i + 1]])
          for (const [x, z] of r.p)
            bounds.expandByPoint(new T.Vector3(cx + x, G + r.y, cz + z));
        solid(`${id}-${i}`, bounds.min.toArray(), bounds.max.toArray());
      }
  }
  function polygonSlab(cx, cz, y, p, thickness = 0.28, mat = 'silver') {
    loft(
      null,
      cx,
      cz,
      [
        { y: y - thickness, p },
        { y, p },
      ],
      mat,
    );
  }
  function ringsFrom(levels, shape) {
    return levels.map(([y, rx, rz, dx = 0, dz = 0], i) => ({
      // Occupied glazing stops beneath a genuinely open 14m structural crown.
      y: i === levels.length - 1 ? y - 14 : y,
      p: shape(rx, rz).map(([x, z]) => [x + dx, z + dz]),
    }));
  }
  function facadeBands(cx, cz, rings, step = 6) {
    step = 4.2; // Repeated true floor-height spandrels rather than oversized old bands.
    for (let y = rings[0].y + step; y < rings.at(-1).y - 0.5; y += step) {
      let i = 0;
      while (i < rings.length - 2 && y > rings[i + 1].y) i++;
      const a = rings[i],
        b = rings[i + 1],
        t = (y - a.y) / (b.y - a.y),
        p = a.p.map((pt, j) => [
          pt[0] + (b.p[j][0] - pt[0]) * t,
          pt[1] + (b.p[j][1] - pt[1]) * t,
        ]);
      polygonSlab(
        cx,
        cz,
        y,
        p.map(([x, z]) => [x * 1.004, z * 1.004]),
        0.32,
        Math.round(y / step) % 10 === 0 ? 'gold' : 'silver',
      );
    }
  }
  function ringAt(rings, y) {
    let i=0;
    while(i<rings.length-2 && y>rings[i+1].y) i++;
    const a=rings[i],b=rings[i+1],t=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y)));
    return a.p.map((p,j)=>[p[0]+(b.p[j][0]-p[0])*t,p[1]+(b.p[j][1]-p[1])*t]);
  }
  function facadeDetail(cx,cz,rings) {
    for(let r=0;r<rings.length-1;r++) {
      const a=rings[r],b=rings[r+1];
      for(let edge=0;edge<a.p.length;edge++) {
        const next=(edge+1)%a.p.length;
        const span=Math.hypot(a.p[next][0]-a.p[edge][0],a.p[next][1]-a.p[edge][1]);
        const divisions=Math.max(2,Math.ceil(span/5.5));
        for(let m=0;m<=divisions;m++) {
          const t=m/divisions;
          const point=(ring)=>[cx+(ring.p[edge][0]+(ring.p[next][0]-ring.p[edge][0])*t)*1.012,G+ring.y,cz+(ring.p[edge][1]+(ring.p[next][1]-ring.p[edge][1])*t)*1.012];
          rod('silver',point(a),point(b),m===0?.28:.15,.22);
        }
      }
    }
    // Deep diagonal external bracing; section changes follow the actual loft.
    for(let y=rings[0].y;y<rings.at(-1).y-1;y+=27) {
      const y1=Math.min(y+27,rings.at(-1).y),a=ringAt(rings,y),b=ringAt(rings,y1);
      for(let j=0;j<a.length;j+=2) {
        const k=(j+1)%a.length;
        rod('gold',[cx+a[j][0]*1.025,G+y,cz+a[j][1]*1.025],[cx+b[k][0]*1.025,G+y1,cz+b[k][1]*1.025],.55,.6);
        rod('ivory',[cx+a[k][0]*1.025,G+y,cz+a[k][1]*1.025],[cx+b[j][0]*1.025,G+y1,cz+b[j][1]*1.025],.40,.48);
      }
    }
  }
  function crown({cx,cz,rings}) {
    const a=rings.at(-1),cap=a.y+14;
    for(let j=0;j<a.p.length;j++) {
      const p=a.p[j],q=a.p[(j+1)%a.p.length],top=cap-(j%3)*2.8;
      const px=cx+p[0]*1.035,pz=cz+p[1]*1.035;
      rod('ivory',[cx+p[0],G+a.y-5,cz+p[1]],[px,G+top-.35,pz],.75,.65);
      box('gold',px,G+top-.08,pz,1.1,.16,1.0);
      rod('gold',[px,G+a.y+5,pz],[cx+q[0]*1.035,G+a.y+5,cz+q[1]*1.035],.3,.4);
      rod('silver',[cx+p[0],G+a.y+.3,cz+p[1]],[cx+q[0]*1.035,G+Math.min(top-1,a.y+11),cz+q[1]*1.035],.28,.3);
    }
  }
  function skyTerrace(cx,cz,rings,y,id) {
    const p=ringAt(rings,y),xs=p.map(q=>q[0]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),midX=(minX+maxX)/2;
    const intersections=[];
    for(let j=0;j<p.length;j++) { const a=p[j],b=p[(j+1)%p.length]; if(Math.abs(b[0]-a[0])>.00001 && midX>=Math.min(a[0],b[0]) && midX<=Math.max(a[0],b[0])) intersections.push(a[1]+(b[1]-a[1])*(midX-a[0])/(b[0]-a[0])); }
    const front=Math.max(...intersections);
    const width=Math.min(24,maxX-minX-5),xx=cx+(minX+maxX)/2,zz=cz+front+2.5;
    box('ivory',xx,G+y-.25,zz,width,.5,7);
    solid(id,[xx-width/2,G+y-.5,zz-3.5],[xx+width/2,G+y,zz+3.5]);
    box('glass',xx,G+y+.65,zz+3.45,width,1.3,.1);
    box('gold',xx,G+y+1.32,zz+3.45,width,.07,.15);
    for(const sx of [-1,1]) {
      box('glass',xx+sx*width/2,G+y+.65,zz,.1,1.3,7);
      box('stone',xx+sx*(width/2-2.1),G+y+.4,zz+1,2.8,.8,2.8);
      add(new T.IcosahedronGeometry(1.25,1),'leaf',xx+sx*(width/2-2.1),G+y+1.5,zz+1);
      rod('silver',[xx+sx*(width/2-1),G+y-6,cz+front-.5],[xx+sx*(width/2-1),G+y-.4,zz+3],.45,.45);
    }
  }
  function tree(x, y, z) {
    box('stone', x, y + 0.35, z, 3.5, 0.7, 3.5);
    add(new T.IcosahedronGeometry(1.4, 0), 'leaf', x, y + 1.5, z);
  }
  // Three separate podiums; the connective civic space stays open at ground.
  box('stone', 0, G / 2, 0, 500, G, 500);
  surface('campus', -250, -250, 250, 250, G);
  box('ivory', 0, G + 0.012, 0, 500, 0.024, 16);
  box('ivory', 0, G + 0.012, -95, 16, 0.024, 310);
  // Southern arrival doglegs around the southern tower rather than through it.
  box('ivory', 80, G + 0.012, 150, 16, 0.024, 200);
  box('ivory', 40, G + 0.012, 242, 80, 0.024, 16);
  box('ivory', 40, G + 0.012, 50, 80, 0.024, 16);
  for (const x of [-210, 210])
    for (const z of [-210, 210]) {
      box('dark', x, 0.6, z, 24, 1.13, 12);
      for (const dx of [-7, 0, 7]) tree(x + dx, 1.165, z);
    }
  for (const x of [-62, 62])
    for (const z of [-20, 24]) {
      box('ivory', x, 0.43, z, 18, 0.79, 2.4);
      box('gold', x, 0.85, z, 18.1, 0.05, 2.5);
      solid(
        `plaza-bench-${x}-${z}`,
        [x - 9, G, z - 1.25],
        [x + 9, 0.88, z + 1.25],
      );
    }

  for (const spec of config.towers) {
    const x = spec.x,
      z = spec.z,
      H = spec.height;
    activeBounds = new T.Box3();
    towerShells = [];
    towerTopY = G + H;
    // Closed street lobbies have true grounded mass and dimensional door frames.
    const podium = octagon(42, 37);
    loft(
      `${spec.id}-podium`,
      x,
      z,
      [
        { y: 0, p: podium },
        { y: 6, p: podium },
      ],
      'dark',
    );
    polygonSlab(x, z, 6.2, octagon(43, 38), 0.25, 'ivory');
    box('gold', x, G + 3.0, z + 37.12, 12, 5.2, 0.24);
    box('blue', x, G + 2.9, z + 37.28, 10.8, 4.7, 0.12);
    box('ivory', x, G + 5.5, z + 40, 20, 0.35, 8);
    solid(
      `${spec.id}-entry-canopy`,
      [x - 10, G + 5.325, z + 36],
      [x + 10, G + 5.675, z + 44],
    );
    for (const s of [-1, 1]) {
      box('silver', x + s * 8.8, G + 2.75, z + 41, 0.3, 5.5, 0.3);
      solid(
        `${spec.id}-entry-column-${s}`,
        [x + s * 8.8 - 0.16, G, z + 40.84],
        [x + s * 8.8 + 0.16, G + 5.5, z + 41.16],
      );
    }
    let sections;
    if (spec.type === 'vector') {
      sections = ringsFrom(
        [
          [6, 29, 25],
          [112, 30, 25, 0, 0],
          [198, 27, 24, 6, -1],
          [276, 26, 22, 10, 1],
          [346, 20, 22, 5, -4],
          [414, 17, 19, -5, -2],
          [460, 11, 14, -9, 1],
        ],
        octagon,
      );
      loft(spec.id, x, z, sections, 'blue');
      facadeBands(x, z, sections, 6);
      for (const side of [0, 2, 4, 6])
        for (let i = 0; i < sections.length - 1; i++) {
          const a = sections[i],
            b = sections[i + 1];
          rod(
            'ivory',
            [x + a.p[side][0], G + a.y, z + a.p[side][1]],
            [x + b.p[side][0], G + b.y, z + b.p[side][1]],
            1.1,
            1.0,
          );
        }
    } else if (spec.type === 'twin') {
      for (const s of [-1, 1]) {
        const h = s < 0 ? 320 : 282;
        const r = ringsFrom(
          [
            [6, 12, 22, s * 15, 0],
            [136, 12.5, 21, s * 14, 0],
            [222, 11, 18, s * 11, s * 2],
            [h, 9.5, 16, s * 10, s * 3],
          ],
          octagon,
        );
        loft(`${spec.id}-blade-${s}`, x, z, r, s < 0 ? 'glass' : 'blue');
        facadeBands(x, z, r, 6);
        for (const edge of [0, 4])
          rod(
            'ivory',
            [x + r[0].p[edge][0], G + 6, z + r[0].p[edge][1]],
            [x + r.at(-1).p[edge][0], G + h, z + r.at(-1).p[edge][1]],
            0.65,
            0.8,
          );
      }
      box('gold', x, G + 186, z, 46, 10, 13);
      solid(
        `${spec.id}-sky-link`,
        [x - 23, G + 181, z - 6.5],
        [x + 23, G + 191, z + 6.5],
      );
    } else if (spec.type === 'stack') {
      sections = ringsFrom(
        [
          [6, 29, 25],
          [72, 29, 25],
          [73, 24, 23, 5, 0],
          [153, 24, 23, 5, 0],
          [154, 18, 20, -3, 0],
          [235, 18, 20, -3, 0],
        ],
        octagon,
      );
      loft(spec.id, x, z, sections, 'glass');
      facadeBands(x, z, sections, 5.8);
      for (const [y, rx, rz, dx] of [
        [72.2, 31, 27, 0],
        [153.2, 26, 25, 5],
      ]) {
        polygonSlab(x + dx, z, y, octagon(rx, rz), 0.45, 'ivory');
        for (const sx of [-1, 1])
          tree(x + dx + sx * (rx - 3), G + y, z + rz - 4);
      }
    } else if (spec.type === 'tidal') {
      const chevron = (rx, rz) => [
        [rx, -rz],
        [rx, rz * 0.62],
        [rx * 0.28, rz],
        [0, rz * 0.28],
        [-rx * 0.28, rz],
        [-rx, rz * 0.62],
        [-rx, -rz],
        [0, -rz * 0.35],
      ];
      sections = ringsFrom(
        [
          [6, 29, 25],
          [96, 30, 24, 0, 0],
          [174, 28, 25, 4, -2],
          [245, 25, 23, 6, 0],
          [307, 23, 21, -2, 4],
          [359, 20, 20, -6, 2],
          [400, 15, 16, -2, -2],
        ],
        chevron,
      );
      loft(spec.id, x, z, sections, 'glass');
      facadeBands(x, z, sections, 6.5);
      for (const j of [0, 2, 4, 6])
        for (let i = 0; i < sections.length - 1; i++) {
          const a = sections[i],
            b = sections[i + 1];
          rod(
            'gold',
            [x + a.p[j][0], G + a.y, z + a.p[j][1]],
            [x + b.p[j][0], G + b.y, z + b.p[j][1]],
            0.65,
            0.65,
          );
        }
    } else if (spec.type === 'ledger') {
      sections = ringsFrom(
        [
          [6, 29, 17],
          [82, 29, 17],
          [83, 26, 17, 2, 0],
          [161, 26, 17, 2, 0],
          [162, 22, 16, -3, 1],
          [239, 22, 16, -3, 1],
          [240, 18, 15, 0, 1],
          [290, 18, 15, 0, 1],
        ],
        octagon,
      );
      loft(spec.id, x, z, sections, 'blue');
      facadeBands(x, z, sections, 5.7);
      for (const [y, rx] of [
        [82.3, 30],
        [161.3, 28],
        [239.3, 24],
      ]) {
        polygonSlab(x, z, y, octagon(rx, 21), 0.38, 'ivory');
        tree(x + rx - 3, G + y, z + 17);
        tree(x - rx + 3, G + y, z + 17);
      }
      for (const sx of [-1, 1])
        rod(
          'gold',
          [x + sx * 28, G + 6, z - 17],
          [x + sx * 18, G + 276, z - 14],
          0.75,
          0.8,
        );
    } else {
      const bevel = (rx, rz) => [
        [rx * 0.5, -rz],
        [rx, -rz * 0.4],
        [rx, rz * 0.45],
        [rx * 0.25, rz],
        [-rx * 0.7, rz],
        [-rx, rz * 0.2],
        [-rx, -rz * 0.6],
        [-rx * 0.4, -rz],
      ];
      sections = ringsFrom(
        [
          [6, 29, 26],
          [74, 29, 26],
          [136, 25, 23, 5, 0],
          [183, 21, 22, 1, -3],
          [205, 24, 20, -2, -2],
          [225, 16, 13, -6, -2],
        ],
        bevel,
      );
      loft(spec.id, x, z, sections, 'glass');
      facadeBands(x, z, sections, 6.5);
      for (const j of [1, 3, 5, 7])
        for (let i = 0; i < sections.length - 1; i++) {
          const a = sections[i],
            b = sections[i + 1];
          rod(
            'ivory',
            [x + a.p[j][0], G + a.y, z + a.p[j][1]],
            [x + b.p[j][0], G + b.y, z + b.p[j][1]],
            0.9,
            0.9,
          );
        }
    }
    for(const shell of towerShells) {
      crown(shell);
      // View terraces project only a few metres; all remain within existing podium bounds.
      const roof=shell.rings.at(-1).y;
      for(const fraction of [.30,.57,.78])
        skyTerrace(shell.cx,shell.cz,shell.rings,Math.round(roof*fraction/4.2)*4.2,spec.id+'-terrace-'+fraction+'-'+shell.rings[0].p[0][0]);
    }
    // Human-scale entrance soffit ribs and lights stay within the original canopy.
    for(let xx=-9;xx<=9;xx+=1.5) {
      box('silver',x+xx,G+5.26,z+40,.10,.14,7.5);
      if(Math.abs(xx)<7) box('light',x+xx,G+5.17,z+40,.055,.035,5.8);
    }
    for(const side of [-1,1]) {
      box('gold',x+side*10,G+5.5,z+40,.14,.42,8);
      box('silver',x+side*35,G+3,z+19,.15,5.8,20);
    }
    // Vertical champagne lobby fins at human scale, all grounded on the plinth.
    for (let f = -30; f <= 30; f += 5)
      box(
        config.id.endsWith('002') ? 'gold' : 'silver',
        x + f,
        G + 3,
        z - 37.05,
        0.22,
        5.8,
        0.4,
      );
    const measured = activeBounds.clone();
    if(Math.abs(measured.max.y-(G+H))>.04) throw new Error(`Measured tower height mismatch: ${spec.id} ${measured.max.y-G} vs ${H}`);
    activeBounds = null;
    towerTopY = Infinity;
    towers.push({
      ...spec,
      position: [x, G, z],
      height: H,
      detailRevision: 2,
      architecturalDetail: ['4.2m floor spandrels','separate 3D facade mullions','27m diagonal structural bays','14m open structural crown','three exterior planted sky terraces per shaft','ribbed illuminated supported podium canopy'],
      bounds: { min: measured.min.toArray(), max: measured.max.toArray() },
      entrance: [x, G, z + 37.5],
      interiorState: 'closed-future',
      provenance:
        'Original parameterized solid geometry, not a landmark replica',
    });
  }
  const scene = new T.Group();
  scene.name = config.name;
  let triangles = 0,
    vertices = 0;
  for (const [name, list] of Object.entries(buckets)) {
    const merged = mergeGeometries(list, false);
    if (!merged) throw new Error(`Merge failed:${name}`);
    // Welding preserves coincident positions+normals and yields indexed GLB meshes.
    const g = mergeVertices(merged, 1e-5);
    merged.dispose();
    for (const source of list) source.dispose();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    for (const n of g.attributes.position.array)
      if (!Number.isFinite(n)) throw new Error('Invalid vertex');
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    vertices += g.attributes.position.count;
    const mesh = new T.Mesh(g, materials[name]);
    mesh.name = `${config.id}-${name}`;
    scene.add(mesh);
  }
  scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(scene);
  if (
    bounds.min.x < -250.001 ||
    bounds.max.x > 250.001 ||
    bounds.min.z < -250.001 ||
    bounds.max.z > 250.001
  )
    throw new Error('Campus bounds exceeded');
  const minGap = Math.min(
    ...towers.flatMap((a, i) =>
      towers
        .slice(i + 1)
        .map((b) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(86, 76)),
    ),
  );
  if (minGap < 50)
    throw new Error(`Insufficient building separation:${minGap}`);
  return {
    scene,
    manifest: {
      id: config.id,
      name: config.name,
      nameZh: config.nameZh,
      flavor: config.flavor,
      version: 2,
      file: 'center.glb',
      units: 'meters',
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      groundY: G,
      colliders,
      surfaces,
      towers,
      connections: {
        east: [250, 0],
        west: [-250, 0],
        north: [0, -250],
        south: [0, 250],
      },
      routes: {
        southArrival: [
          [0, 250],
          [80, 242],
          [80, 50],
          [0, 50],
          [0, 0],
        ],
        otherConnections: 'Clear cardinal plaza spines',
      },
      stats: {
        triangles,
        vertices,
        drawCalls: scene.children.length,
        indexed: true,
        conservativeMinimumTowerGap: minGap,
      },
      provenance: {
        type: 'original-procedural',
        author: 'AmpliWorld',
        externalImages: [],
        externalMeshes: [],
        landmarkReplicas: false,
      },
      limitations: [
        'Closed ground lobbies; interiors, elevators and named commercial functions are future integration.',
        'Raised sky gardens are exterior geometry, not currently accessible gameplay spaces.',
        'Main CBD and subcenter world positions belong to parent registry.',
      ],
    },
  };
}
const assets = [];
let totalBytes = 0;
for (const config of configs) {
  const { scene, manifest } = createCampus(config),
    buffer = Buffer.from(
      await new GLTFExporter().parseAsync(scene, {
        binary: true,
        onlyVisible: true,
      }),
    );
  manifest.stats.bytes = buffer.byteLength;
  totalBytes += buffer.byteLength;
  assets.push({ manifest, buffer });
}
if (totalBytes > 10000000)
  throw new Error(`Combined indexed subcenter GLBs exceed10MB:${totalBytes}`);
for (const { manifest, buffer } of assets) {
  const out = new URL(
    `../../public/assets/3d/ampliworld/${manifest.id}/`,
    import.meta.url,
  );
  await mkdir(out, { recursive: true });
  await writeFile(new URL('center.glb', out), buffer);
  await writeFile(
    new URL('center-manifest.json', out),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}
process.stdout.write(
  JSON.stringify({
    totalBytes,
    centers: assets.map((a) => ({ id: a.manifest.id, ...a.manifest.stats })),
  }) + '\n',
);
