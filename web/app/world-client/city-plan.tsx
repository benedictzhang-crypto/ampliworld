'use client';
import { useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CITY } from './city-layer';
import { CITY_INFRA, riverX } from './city-surface';
import { CIVIC_PLACES, SPORTS_STREETS } from './civic-registry';
import { DISTRICT } from '../district/registry';
import cbd from '../../public/assets/3d/ampliworld/GC-CBD-STREET-001/street-manifest.json';
const compounds = CITY.tiles.flatMap((t) => t.compounds);
const categories: Record<string, [string, string]> = {
  'working-residential': ['基础住宅小区', '#dbb786'],
  'middle-residential': ['中端住宅小区', '#acc593'],
  'high-end': ['高端住宅小区', '#69b9a2'],
  'office-campus': ['办公园区', '#8daed1'],
  hospital: ['医院园区', '#dc96a5'],
  school: ['学校园区', '#d8c66c'],
  'cyber-church': ['赛博教堂', '#bca6d1'],
};
const river = Array.from({ length: 201 }, (_, i) => {
  const z = -15000 + (i * 28200) / 200;
  const w = 180 + 820 * Math.max(0, (z - 13000) / 200);
  return { x: riverX(z), z, w };
});
const riverPolygon = [
  ...river.map((p) => `${p.x - p.w},${p.z}`),
  ...river
    .slice()
    .reverse()
    .map((p) => `${p.x + p.w},${p.z}`),
].join(' ');
export function CityPlan({
  open,
  onOpenChange,
  position,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  position: readonly number[];
}) {
  const [view, setView] = useState({ x: 0, z: 0, span: 32000 });
  const [selected, setSelected] = useState<(typeof compounds)[number] | null>(
    null,
  );
  const [showHomes, setShowHomes] = useState(true),
    [showRoads, setShowRoads] = useState(true);
  const drag = useRef<{ x: number; y: number } | null>(null),
    moved = useRef(false);
  const [selectedInfo, setSelectedInfo] = useState('');
  const w = view.span * 0.85,
    fs = view.span / 70;
  const visible = useMemo(
    () =>
      compounds.filter(
        (c) =>
          Math.abs(c.x - view.x) < w / 2 + 200 &&
          Math.abs(c.z - view.z) < view.span / 2 + 200,
      ),
    [view, w],
  );
  const roads = useMemo(
    () =>
      CITY_INFRA.roadrects.filter(
        (r) =>
          r.max[0] >= view.x - w / 2 &&
          r.min[0] <= view.x + w / 2 &&
          r.max[1] >= view.z - view.span / 2 &&
          r.min[1] <= view.z + view.span / 2,
      ),
    [view, w],
  );
  const zoom = (factor: number) =>
    setView((v) => ({
      ...v,
      span: Math.max(650, Math.min(32000, v.span * factor)),
    }));
  const select = (c: (typeof compounds)[number]) => {
    if (!moved.current) {
      setSelected(c);
      setSelectedInfo('');
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="city-plan-dialog">
        <DialogTitle>金庭城市平面图 · 20 × 30 km</DialogTitle>
        <DialogDescription>
          真实场景坐标：小区边界、大门、主路、河道与桥梁。拖动平移，滚轮缩放；地图不会传送人物。
        </DialogDescription>
        <div className="plan-tools">
          <Button onClick={() => setView({ x: 0, z: 0, span: 32000 })}>
            全城
          </Button>
          <Button onClick={() => setView({ x: 0, z: 100, span: 3100 })}>
            核心城区
          </Button>
          <Button
            onClick={() =>
              setView({ x: position[0], z: position[1], span: 1700 })
            }
          >
            我的位置
          </Button>
          <Button aria-label="放大平面图" onClick={() => zoom(0.65)}>
            ＋
          </Button>
          <Button aria-label="缩小平面图" onClick={() => zoom(1.5)}>
            －
          </Button>
          <label>
            <input
              type="checkbox"
              checked={showHomes}
              onChange={(e) => setShowHomes(e.target.checked)}
            />{' '}
            小区分区
          </label>
          <label>
            <input
              type="checkbox"
              checked={showRoads}
              onChange={(e) => setShowRoads(e.target.checked)}
            />{' '}
            道路
          </label>
        </div>
        <div className="plan-layout">
          <svg
            className="city-plan-map"
            role="img"
            aria-label="可缩放城市用地平面图"
            viewBox={`${view.x - w / 2} ${view.z - view.span / 2} ${w} ${view.span}`}
            onWheel={(e) => {
              e.stopPropagation();
              zoom(e.deltaY > 0 ? 1.15 : 0.87);
            }}
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY };
              moved.current = false;
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const dx = e.clientX - drag.current.x,
                dy = e.clientY - drag.current.y;
              moved.current ||= Math.abs(dx) + Math.abs(dy) > 3;
              const b = e.currentTarget.getBoundingClientRect();
              const scale = Math.max(w / b.width, view.span / b.height);
              setView((v) => ({
                ...v,
                x: Math.max(-10000, Math.min(10000, v.x - dx * scale)),
                z: Math.max(-15000, Math.min(15000, v.z - dy * scale)),
              }));
              drag.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerLeave={() => {
              drag.current = null;
            }}
          >
            <rect
              x={-10000}
              y={-15000}
              width={20000}
              height={30000}
              fill="#edf0df"
              stroke="#476563"
              strokeWidth={view.span / 1300}
            />
            <rect
              x={-10000}
              y={13200}
              width={20000}
              height={1800}
              fill="#7dbdc8"
            />
            <polygon
              points={riverPolygon}
              fill="#7dbdc8"
              stroke="#458caa"
              strokeWidth={view.span / 1800}
            />
            {showRoads && (
              <g fill="#7e898b">
                {roads.map((r, i) => (
                  <rect
                    key={i}
                    x={r.min[0]}
                    y={r.min[1]}
                    width={r.max[0] - r.min[0]}
                    height={r.max[1] - r.min[1]}
                  />
                ))}
              </g>
            )}
            {showHomes &&
              visible.map((c) => (
                <g
                  key={c.id}
                  onClick={() => select(c)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={c.x - 170}
                    y={c.z - 170}
                    width={340}
                    height={340}
                    rx={15}
                    fill={categories[c.type]?.[1] || '#adb7a6'}
                    stroke={selected?.id === c.id ? '#153c3c' : '#728878'}
                    strokeWidth={selected?.id === c.id ? view.span / 500 : 12}
                  />
                  {view.span < 6000 && (
                    <>
                      <circle
                        cx={c.entrance[0]}
                        cy={c.entrance[2]}
                        r={Math.max(9, view.span / 340)}
                        fill="#174a42"
                      />
                      <text
                        x={c.x}
                        y={c.z}
                        textAnchor="middle"
                        fontSize={Math.min(40, fs * 0.8)}
                        fill="#173c35"
                      >
                        {categories[c.type]?.[0]}
                      </text>
                    </>
                  )}
                </g>
              ))}
            {showRoads &&
              [...cbd.surfaces, ...SPORTS_STREETS.surfaces]
                .filter((s) => s.y < 0.08)
                .map((r, i) => (
                  <rect
                    key={`core-${i}`}
                    x={r.min[0]}
                    y={r.min[1]}
                    width={r.max[0] - r.min[0]}
                    height={r.max[1] - r.min[1]}
                    fill="#65787d"
                  />
                ))}
            <path d="M-110 0H110 M0-80V80" stroke="#65787d" strokeWidth={14} />
            <rect
              x={-112.5}
              y={-278}
              width={225}
              height={180}
              fill="#8daed1"
              stroke="#435f75"
              strokeWidth={3}
            />
            <rect x={-44} y={-223} width={88} height={70} fill="#edf0df" />
            {DISTRICT.buildings.map((b) => (
              <rect
                key={b.id}
                x={b.x - 16}
                y={b.z - 12}
                width={32}
                height={24}
                fill="#69b9a2"
              />
            ))}
            {DISTRICT.offices.map((b) => (
              <rect
                key={b.id}
                x={b.x - 55}
                y={b.z - 55}
                width={110}
                height={110}
                rx={15}
                fill="#597fa4"
              />
            ))}
            <ellipse cx={0} cy={600} rx={144} ry={178} fill="#bdad75" />
            <ellipse cx={0} cy={600} rx={72} ry={102} fill="#edf0df" />
            <rect x={-34} y={547.5} width={68} height={105} fill="#68a86b" />
            <rect x={170} y={-45} width={20} height={14} fill="#b47550" />
            {CITY_INFRA.bridges.map((b, i) => (
              <g
                key={b.id}
                onClick={() => {
                  setSelected(null);
                  setSelectedInfo(
                    `河桥 ${i + 1} · 桥面高 6 m · 两端坡道各 220 m`,
                  );
                }}
                style={{ cursor: 'pointer' }}
              >
                <line
                  x1={b.xMin}
                  x2={b.xMax}
                  y1={b.z}
                  y2={b.z}
                  stroke="#f8e7b2"
                  strokeWidth={Math.max(90, view.span / 240)}
                />
                {view.span < 10000 && (
                  <text
                    x={(b.xMin + b.xMax) / 2}
                    y={b.z - fs * 0.5}
                    textAnchor="middle"
                    fontSize={fs * 0.8}
                    fill="#173c35"
                  >
                    桥 {i + 1}
                  </text>
                )}
              </g>
            ))}
            {view.span < 6500 && (
              <g fontSize={fs} fill="#29423e" fontWeight="bold">
                <text x={-130} y={-300}>
                  金庭汇商场
                </text>
                <text x={-150} y={410}>
                  晖环体育场
                </text>
                <text x={190} y={-45}>
                  森间寿司
                </text>
                <text x={-80} y={-1040}>
                  CBD
                </text>
              </g>
            )}
            <circle
              cx={position[0]}
              cy={position[1]}
              r={view.span / 120}
              fill="#ef6d3e"
              stroke="white"
              strokeWidth={view.span / 550}
            />
            <text
              x={view.x - w / 2 + fs}
              y={view.z - view.span / 2 + fs * 2}
              fontSize={fs * 1.4}
              fill="#29423e"
            >
              N ↑
            </text>
          </svg>
          <aside className="plan-legend">
            <h3>用地与社区</h3>
            {Object.entries(categories).map(([k, [label, color]]) => (
              <div key={k}>
                <i style={{ background: color }} />
                {label}
              </div>
            ))}
            <div>
              <i style={{ background: '#7e898b' }} />
              主路与辅路走廊
            </div>
            <div>
              <i style={{ background: '#7dbdc8' }} />
              河道 / 海岸
            </div>
            <div>
              <i style={{ background: '#f8e7b2' }} />
              28 座桥梁
            </div>
            <hr />
            <p>
              1,300 个小区 / 园区
              <br />
              7,800 栋生成建筑
              <br />
              橙点为当前人物位置
            </p>
            {selected ? (
              <section>
                <h3>{categories[selected.type]?.[0]}</h3>
                <p className="plan-id">{selected.id}</p>
                <p>340 × 340 m · {selected.buildingIds.length} 栋建筑</p>
                <p>
                  大门：X {selected.entrance[0].toFixed(0)} / Z{' '}
                  {selected.entrance[2].toFixed(0)} m
                </p>
                <p>
                  {selected.type === 'high-end'
                    ? '人车分区布局；地库入口已建外形，内部未开放。'
                    : '围墙与独立大门按场景数据绘制。园区功能尚在建设。'}
                </p>
                <Button
                  onClick={() =>
                    setView({ x: selected.x, z: selected.z, span: 1200 })
                  }
                >
                  放大小区
                </Button>
              </section>
            ) : (
              <p>{selectedInfo || '点击彩色小区查看边界、大门及建设状态。'}</p>
            )}
            <small>
              当前窗口南北跨度 {(view.span / 1000).toFixed(1)}{' '}
              km。显示的是已生成布局，不表示园区室内及生活功能全部完成。
            </small>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
