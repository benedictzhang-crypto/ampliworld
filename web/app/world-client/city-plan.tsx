'use client';
import {Localized} from '../language';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CITY } from './city-layer';
import { CITY_INFRA } from './city-surface';
import { riverCenterX, riverHalfWidth } from './river-profile.mjs';
import {
  METROPOLITAN_PLAN,
  CENTER_ROADS,
  landValueZone,
} from './metropolitan-registry';
import { SPORTS_STREETS } from './civic-registry';
import { DISTRICT } from '../district/registry';
import { METRO_STATIONS, type MetroStation } from './metro-network';
import {TOUR_DESTINATIONS,type TourDestination} from './tour-destinations';
import amusementPlan from './amusement-park-plan.json';
import { PARK_RIDES } from './amusement-rides';
import { COMMUNITIES, COMMUNITY_SURFACES, HOMES } from './community-registry';
import {
  HOUSING_PLAN,
  HOUSING_LABELS,
  HOUSING_COLORS,
  HOUSING_INSTANCES,
  HOUSING_MODELS,
  housingPoint,
} from './housing-registry';
import cbd from '../../public/assets/3d/ampliworld/GC-CBD-STREET-001/street-manifest.json';
const compounds = CITY.tiles.flatMap((t) => t.compounds);
const cityRoadPath = CITY_INFRA.roadrects
  .map((road) => `M${road.min[0]} ${road.min[1]}h${road.max[0] - road.min[0]}v${road.max[1] - road.min[1]}h${road.min[0] - road.max[0]}Z`)
  .join('');
const housingInstancesByParcel = new Map<string, (typeof HOUSING_INSTANCES)[number][]>();
for (const instance of HOUSING_INSTANCES) {
  const group = housingInstancesByParcel.get(instance.parcel) ?? [];
  group.push(instance);
  housingInstancesByParcel.set(instance.parcel, group);
}
const categories: Record<string, [string, string]> = {
  'office-campus': ['办公园区', '#8daed1'],
  hospital: ['医院园区', '#dc96a5'],
  school: ['学校园区', '#d8c66c'],
  'cyber-church': ['赛博教堂', '#bca6d1'],
};
const river = Array.from({ length: 201 }, (_, i) => {
  const z = -15000 + (i * 28200) / 200;
  const w = riverHalfWidth(z);
  return { x: riverCenterX(z), z, w };
});
const riverPolygon = [
  ...river.map((p) => `${p.x - p.w},${p.z}`),
  ...river
    .slice()
    .reverse()
    .map((p) => `${p.x + p.w},${p.z}`),
].join(' ');
const waterfrontStrips = [-1, 1].map((side) =>
  [
    ...river.map((p) => `${p.x + side * p.w},${p.z}`),
    ...river
      .slice()
      .reverse()
      .map((p) => `${p.x + side * (p.w + (p.z >= 12000 ? 700 : 350))},${p.z}`),
  ].join(' '),
);
export function CityPlan({
  open,
  onOpenChange,
  position,
  onTeleport,
  onTeleportPoint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  position: readonly number[];
  onTeleport: (station: MetroStation) => void;
  onTeleportPoint: (x: number, z: number) => void;
}) {
  const [view, setView] = useState({ x: 0, z: 0, span: 32000 });
  const [selected, setSelected] = useState<(typeof compounds)[number] | null>(
    null,
  );
  const [selectedStation, setSelectedStation] = useState<MetroStation | null>(null);
  const [selectedDestination,setSelectedDestination]=useState<TourDestination|null>(null);
  const [destinationSearch,setDestinationSearch]=useState('');
  const [selectedPark, setSelectedPark] = useState(false);
  const [showHomes, setShowHomes] = useState(true),
    [showRoads, setShowRoads] = useState(true);
  const drag = useRef<{ id:number; x: number; y: number } | null>(null),
    gestureScale = useRef(1),
    moved = useRef(false);
  const [mapElement, setMapElement] = useState<SVGSVGElement | null>(null);
  const [selectedInfo, setSelectedInfo] = useState('');
  const w = view.span * 0.85,
    fs = view.span / 70;
  const viewRef = useRef(view);
  viewRef.current = view;
  const visible = useMemo(
    () =>
      compounds.filter(
        (c) =>
          Math.abs(c.x - view.x) < w / 2 + 200 &&
          Math.abs(c.z - view.z) < view.span / 2 + 200,
      ),
    [view, w],
  );
  const visibleHousing = useMemo(() =>
    HOUSING_PLAN.placements.filter((p) =>
      !p.retainExistingFootprints &&
      Math.abs(p.x - view.x) < w / 2 + p.width &&
      Math.abs(p.z - view.z) < view.span / 2 + p.depth,
    ), [view, w]);
  const destinationMatches=useMemo(()=>{
    const query=destinationSearch.trim().toLowerCase();
    return (query?TOUR_DESTINATIONS.filter(d=>d.searchText.includes(query)):TOUR_DESTINATIONS.filter(d=>d.featured)).slice(0,16);
  },[destinationSearch]);
  const mapDestinations=useMemo(()=>TOUR_DESTINATIONS.filter(d=>
    (view.span<6500||d.featured||d.id===selectedDestination?.id)&&
    Math.abs(d.x-view.x)<w/2+80&&Math.abs(d.z-view.z)<view.span/2+80,
  ),[view,w,selectedDestination]);
  const zoomAt = useCallback((factor: number, anchor: { x: number; z: number }) =>
    setView((current) => {
      const span = Math.max(650, Math.min(32000, current.span * factor));
      const ratio = span / current.span;
      return {
        span,
        x: Math.max(-10000, Math.min(10000, anchor.x + (current.x - anchor.x) * ratio)),
        z: Math.max(-15000, Math.min(15000, anchor.z + (current.z - anchor.z) * ratio)),
      };
    }), []);
  useEffect(() => {
    if (!open) return;
    const svg = mapElement;
    if (!svg) return;
    let wheelFrame = 0;
    let wheelFactor = 1;
    let wheelAnchor: { x: number; z: number } | null = null;
    const mapPoint = (clientX:number,clientY:number) => {
      const ctm=svg.getScreenCTM();
      if(ctm){const point=svg.createSVGPoint();point.x=clientX;point.y=clientY;
        const world=point.matrixTransform(ctm.inverse());return {x:world.x,z:world.y};}
      const box=svg.getBoundingClientRect();
      const current=viewRef.current;
      const width=current.span*.85;
      return {x:current.x-width/2+(clientX-box.left)/box.width*width,z:current.z-current.span/2+(clientY-box.top)/box.height*current.span};
    };
    const flushWheel = () => {
      wheelFrame = 0;
      if (wheelAnchor) zoomAt(wheelFactor, wheelAnchor);
      wheelFactor = 1;
      wheelAnchor = null;
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?240:1);
      wheelFactor *= Math.exp(Math.max(-1,Math.min(1,delta*(event.ctrlKey ? 0.012 : 0.004))));
      wheelAnchor = mapPoint(event.clientX,event.clientY);
      if (!wheelFrame) wheelFrame = requestAnimationFrame(flushWheel);
    };
    const handleGestureStart=(event:Event)=>{event.preventDefault();gestureScale.current=1;};
    const handleGestureChange=(event:Event)=>{
      event.preventDefault();
      const scale=(event as Event&{scale?:number}).scale??1;
      if(scale>0){zoomAt(gestureScale.current/scale,mapPoint(svg.getBoundingClientRect().left+svg.clientWidth/2,svg.getBoundingClientRect().top+svg.clientHeight/2));gestureScale.current=scale;}
    };
    const handleDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      zoomAt(0.5,mapPoint(event.clientX,event.clientY));
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    svg.addEventListener('dblclick', handleDoubleClick);
    svg.addEventListener('gesturestart', handleGestureStart, { passive: false });
    svg.addEventListener('gesturechange', handleGestureChange, { passive: false });
    return () => {
      if (wheelFrame) cancelAnimationFrame(wheelFrame);
      svg.removeEventListener('wheel', handleWheel);
      svg.removeEventListener('dblclick', handleDoubleClick);
      svg.removeEventListener('gesturestart', handleGestureStart);
      svg.removeEventListener('gesturechange', handleGestureChange);
    };
  }, [open, mapElement, zoomAt]);
  const zoom = (factor: number) =>
    setView((v) => ({
      ...v,
      span: Math.max(650, Math.min(32000, v.span * factor)),
    }));
  const select = (c: (typeof compounds)[number]) => {
    if (!moved.current) {
      setSelectedDestination(null);
      setSelectedPark(false);
      setSelectedStation(null);
      setSelected(c);
      setSelectedInfo(landValueZone(c.x, c.z));
    }
  };
  return (
    <Localized><Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="city-plan-dialog">
        <DialogTitle>金庭城市平面图 · 20 × 30 km</DialogTitle>
        <DialogDescription>
          真实场景坐标：小区边界、大门、主路、河道与桥梁。拖动平移，滚轮缩放；点击地点圆点或在右侧搜索，然后按 Teleport 到建筑入口外。玩家快速旅行不代表居民已经乘坐地铁。
          金色虚线表示三中心布局关系，不是道路；浅金色标识高价值地段，尚未设置售价。
        </DialogDescription>
        <div className="plan-tools">
          <Button onClick={() => setView({ x: 2000, z: 4000, span: 12500 })}>
            三中心布局
          </Button>
          <Button onClick={() => setView({ x: 0, z: 0, span: 32000 })}>
            全城
          </Button>
          <Button onClick={() => setView({ x: 0, z: 100, span: 3100 })}>
            核心城区
          </Button>
          <Button onClick={() => setView({ x: -850, z: 750, span: 850 })}>
            青庭花园
          </Button>
          <Button onClick={() => setView({ x: 2020, z: 1000, span: 1500 })}>
            澜岸别墅
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
            ref={setMapElement}
            className="city-plan-map"
            aria-label="可缩放城市用地平面图"
            viewBox={`${view.x - w / 2} ${view.z - view.span / 2} ${w} ${view.span}`}
            onPointerDown={(e) => {
              if(e.button!==0)return;
              drag.current = { id:e.pointerId,x: e.clientX, y: e.clientY };
              moved.current = false;
            }}
            onPointerMove={(e) => {
              if (!drag.current||drag.current.id!==e.pointerId) return;
              const dx = e.clientX - drag.current.x,
                dy = e.clientY - drag.current.y;
              moved.current ||= Math.abs(dx) + Math.abs(dy) > 3;
              if(moved.current&&!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);
              const b = e.currentTarget.getBoundingClientRect();
              const ctm=e.currentTarget.getScreenCTM();
              const scaleX=ctm&&ctm.a ? 1/ctm.a : w/b.width;
              const scaleZ=ctm&&ctm.d ? 1/ctm.d : view.span/b.height;
              setView((v) => ({
                ...v,
                x: Math.max(-10000, Math.min(10000, v.x - dx * scaleX)),
                z: Math.max(-15000, Math.min(15000, v.z - dy * scaleZ)),
              }));
              drag.current = { id:e.pointerId,x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
              drag.current = null;
            }}
            onPointerCancel={() => {
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
            {waterfrontStrips.map((points, i) => (
              <polygon
                key={i}
                points={points}
                fill="#d4b66b"
                fillOpacity={0.24}
                pointerEvents="none"
              />
            ))}
            {showRoads && <path d={cityRoadPath} fill="#7e898b" pointerEvents="none" />}
            {showRoads && CITY_INFRA.curvedRoads.map((road) => (
              <ellipse key={road.id} cx={road.x} cy={road.z} rx={road.radiusX}
                ry={road.radiusZ} fill="none" stroke="#69797b" strokeWidth={40}
                pointerEvents="none" />
            ))}
            <g pointerEvents="none" aria-label="Crescent Commons public sports park">
              <rect x={650} y={1085} width={640} height={290} rx={22}
                fill="#77a271" stroke="#456c4c" strokeWidth={Math.max(3, view.span / 3200)} />
              <path d="M670 1348 Q800 1290 920 1330 T1265 1350 M670 1118 Q840 1160 1005 1115 T1265 1115"
                fill="none" stroke="#d8d2bb" strokeWidth={Math.max(3, view.span / 1700)} />
              <rect x={711} y={1172} width={88} height={124} rx={4} fill="#397343" />
              <rect x={859} y={1164} width={36} height={46} rx={3} fill="#387c91" />
              <rect x={957} y={1164} width={38} height={46} rx={3} fill="#c8734e" />
              <rect x={1142} y={1259} width={88} height={56} rx={4} fill="#8c9b97" />
              {view.span < 6500 && <text x={963} y={1361} textAnchor="middle"
                fill="#1c503a" fontWeight="bold" fontSize={Math.max(17, view.span / 250)}>
                Crescent Commons · Sports Park
              </text>}
            </g>
            <g
              onClick={() => { setSelectedDestination(null); setSelectedPark(true); setSelectedStation(null); setSelected(null); }}
              style={{ cursor: 'pointer' }}
              aria-label="Aureole Adventure Park"
            >
              <rect
                x={amusementPlan.center.x - amusementPlan.footprint.width / 2}
                y={amusementPlan.center.z - amusementPlan.footprint.depth / 2}
                width={amusementPlan.footprint.width}
                height={amusementPlan.footprint.depth}
                rx={Math.max(14, view.span / 1000)}
                fill="#865190"
                fillOpacity={0.78}
                stroke="#f4cf8a"
                strokeWidth={Math.max(4, view.span / 2000)}
              />
              <text x={amusementPlan.center.x} y={amusementPlan.center.z}
                textAnchor="middle" fill="#fff7e5" fontWeight="bold"
                fontSize={Math.max(18, view.span / 270)}>
                Adventure Park
              </text>
            </g>
            {showHomes &&
              visibleHousing.map((p) => (
                  <g
                    key={p.id}
                    onClick={() => {
                      setSelected(null);
                      setSelectedInfo(
                        `${HOUSING_LABELS[p.type]} · ${p.id} · ${p.buildingCount} 栋；${p.type === 'ultra' ? '50/60 层、层高 4 米；两梯一户平面规划，电梯与户内尚未开放' : p.type === 'low' ? '6 层旧式外墙' : p.type === 'lowerMiddle' ? '8–10 层，社区超市' : p.type === 'high' ? '5–8 层，3.7 米层高；物业、保安亭、试玩门禁' : p.type === 'mixedVilla' ? '联排、双拼、独栋混合小区' : '大型独栋庄园小区'}`,
                      );
                    }}
                  >
                    <polyline
                      points={p.connector.points
                        .map((q) => q.join(','))
                        .join(' ')}
                      fill="none"
                      stroke="#6d797d"
                      strokeWidth={14}
                    />
                    <polygon
                      points={[
                        [-p.width / 2, -p.depth / 2],
                        [p.width / 2, -p.depth / 2],
                        [p.width / 2, p.depth / 2],
                        [-p.width / 2, p.depth / 2],
                      ]
                        .map((q) => housingPoint(p, q[0], q[1]).join(','))
                        .join(' ')}
                      fill={HOUSING_COLORS[p.type]}
                      stroke="#5a665a"
                      strokeWidth={2}
                    />
                    {view.span < 2500 &&
                      (housingInstancesByParcel.get(p.id) ?? []).map(
                        (i) => {
                          const b = HOUSING_MODELS[i.model].bounds;
                          return (
                            <rect
                              key={i.id}
                              x={i.x + b.min[0]}
                              y={i.z + b.min[2]}
                              width={b.max[0] - b.min[0]}
                              height={b.max[2] - b.min[2]}
                              transform={`rotate(${-p.angleDeg} ${i.x} ${i.z})`}
                              fill="#f5ecdc"
                            />
                          );
                        },
                      )}
                    <circle
                      cx={p.gateWorld[0]}
                      cy={p.gateWorld[1]}
                      r={Math.max(7, fs / 4)}
                      fill="#a17b43"
                    />
                    <text
                      x={p.x}
                      y={p.z}
                      fontSize={Math.max(16, fs * 0.6)}
                      textAnchor="middle"
                      fill="#233b32"
                    >
                      {HOUSING_LABELS[p.type]}
                    </text>
                  </g>
                ))}
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
            {METRO_STATIONS.filter((station) =>
              Math.abs(station.x - view.x) < w / 2 + 100 &&
              Math.abs(station.z - view.z) < view.span / 2 + 100,
            ).map((station) => (
              <g key={station.id} onClick={() => { setSelectedDestination(null); setSelectedPark(false); setSelectedStation(station); setSelected(null); }} style={{ cursor: 'pointer' }}>
                <circle cx={station.x} cy={station.z} r={Math.max(16, view.span / 220)}
                  fill={station.mode === 'ELEVATED' ? '#365f96' : '#7049a3'}
                  stroke="white" strokeWidth={Math.max(3, view.span / 2000)} />
                <text x={station.x} y={station.z + Math.max(5, view.span / 800)}
                  textAnchor="middle" fill="white" fontWeight="bold" fontSize={Math.max(13, view.span / 270)}>
                  {station.id}
                </text>
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
            {CENTER_ROADS.map((r) => (
              <rect
                key={r.id}
                x={r.min[0]}
                y={r.min[1]}
                width={r.max[0] - r.min[0]}
                height={r.max[1] - r.min[1]}
                fill="#65787d"
              />
            ))}
            <path
              d={
                METROPOLITAN_PLAN.centers
                  .map((c, i) => `${i ? 'L' : 'M'}${c.x} ${c.z}`)
                  .join(' ') + ' Z'
              }
              fill="none"
              stroke="#ac8840"
              strokeWidth={Math.max(4, view.span / 550)}
              strokeDasharray={`${view.span / 180} ${view.span / 240}`}
              pointerEvents="none"
            />
            {METROPOLITAN_PLAN.centers.map((c) => (
              <g
                key={c.id}
                onClick={() => {
                  setSelected(null);
                  setSelectedInfo(
                    `${c.name} · ${c.landTier} · ${c.role === 'main' ? '既有主中心' : '三栋地标塔楼与开放广场'} · 售价系统尚未接入`,
                  );
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={c.x}
                  cy={c.z}
                  r={c.radius}
                  fill="#d6b76d"
                  fillOpacity={0.14}
                  stroke="#a28243"
                  strokeWidth={4}
                />
                {c.role === 'secondary' && (
                  <rect
                    x={c.x - 250}
                    y={c.z - 250}
                    width={500}
                    height={500}
                    fill="#879cad"
                  />
                )}
                <text
                  x={c.x}
                  y={c.z - c.radius - 45}
                  textAnchor="middle"
                  fontSize={Math.max(24, fs)}
                  fill="#694d1d"
                >
                  {c.name}
                </text>
              </g>
            ))}
            {showRoads &&
              COMMUNITY_SURFACES.filter((s) => s.kind === 'road').map((s) => (
                <rect
                  key={s.id}
                  x={s.min[0]}
                  y={s.min[1]}
                  width={s.max[0] - s.min[0]}
                  height={s.max[1] - s.min[1]}
                  fill="#65787d"
                />
              ))}
            {showHomes &&
              HOMES.map((p) => (
                <rect
                  key={p.id}
                  x={p.x - 14}
                  y={p.z - 12}
                  width={28}
                  height={24}
                  fill={p.kind === 'villa' ? '#4c9b91' : '#a9bd7f'}
                  onClick={() => {
                    setSelected(null);
                    setSelectedInfo(
                      `${p.id} · ${p.kind === 'villa' ? '独栋别墅；私人室内后续建设' : '中端住宅；楼内住宅后续建设'} · X ${p.x.toFixed(0)} / Z ${p.z}`,
                    );
                  }}
                />
              ))}
            {COMMUNITIES.map((c) => (
              <text
                key={c.id}
                x={c.x}
                y={c.z - 220}
                fontSize={Math.max(20, fs * 0.75)}
                textAnchor="middle"
                fill="#234c44"
              >
                {c.name}
              </text>
            ))}
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
            <rect
              x={-660}
              y={535}
              width={190}
              height={240}
              fill="#b5bdc4"
              stroke="#506875"
              strokeWidth={4}
            />
            <path d="M-470 745H-440" stroke="#65787d" strokeWidth={12} />
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
                <text x={-640} y={510}>
                  Aureline 汽车中心
                </text>
              </g>
            )}
            {mapDestinations.map(d=><circle key={d.id} cx={d.x} cy={d.z}
              r={Math.max(8,view.span/900)} fill={selectedDestination?.id===d.id?'#ffb453':'#275f80'}
              stroke="#fff7e0" strokeWidth={Math.max(2,view.span/2500)}
              style={{cursor:'pointer'}} aria-label={`选择 ${d.name}`}
              onClick={(event)=>{event.stopPropagation();if(!moved.current){setSelectedDestination(d);setSelectedPark(false);setSelectedStation(null);setSelected(null);}}}>
              <title>{d.name} · {d.kind}</title>
            </circle>)}
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
            <section className="plan-destination-finder">
              <h3>快速传送 · Teleport</h3>
              <input type="search" value={destinationSearch} onChange={event=>setDestinationSearch(event.target.value)}
                placeholder="医院 / 学校 / 消防站…" aria-label="搜索传送地点" />
              {selectedDestination&&<div className="plan-teleport-selection">
                <strong>{selectedDestination.name}</strong>
                <small>{selectedDestination.kind} · 入口 X {selectedDestination.arrivalX.toFixed(0)} / Z {selectedDestination.arrivalZ.toFixed(0)}</small>
                <Button onClick={()=>onTeleportPoint(selectedDestination.arrivalX,selectedDestination.arrivalZ)}>Teleport · 传送到入口</Button>
              </div>}
              <div className="plan-destination-results">
                {destinationMatches.map(d=><div className="plan-destination-result" key={d.id}>
                  <button type="button" onClick={()=>{
                    setSelectedDestination(d);setSelectedPark(false);setSelectedStation(null);setSelected(null);
                    setView({x:d.x,z:d.z,span:Math.min(view.span,1800)});
                  }}>{d.name}</button>
                  <button type="button" aria-label={`传送到 ${d.name}`} onClick={()=>onTeleportPoint(d.arrivalX,d.arrivalZ)}>传送</button>
                </div>)}
                {!destinationMatches.length&&<small>未找到地点，请换关键词。</small>}
              </div>
            </section>
            <h3>用地与社区</h3>
            <p>
              25 老城里 · 15 宜居家园
              <br />5 锦庭府 · 2 云境天邸
              <br />2 混合御墅 · 2 独栋庄园
            </p>
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
            <div>
              <i style={{ background: '#7049a3' }} />
              地下站规划点
            </div>
            <div>
              <i style={{ background: '#365f96' }} />
              高架站规划点
            </div>
            <hr />
            <p>
              47 个分级住宅小区 + 4 个新别墅小区
              <br />
              沿河 60 栋别墅社区保留
              <br />
              {CITY.stats.compounds.toLocaleString()} 个办公 / 公共服务园区
              <br />
              {CITY.stats.buildings.toLocaleString()} 栋普通生成建筑
              <br />
              另含精细核心与两个新副中心
              <br />
              橙点为当前人物位置
            </p>
            {selectedPark ? (
              <section>
                <h3>{amusementPlan.name}</h3>
                <p>1.3 × 0.9 km 游乐园 · 红蓝双塔、五条主题过山车、旋转木马、茶杯、投篮与平衡泡沫池</p>
                <p>东北角有两座可探索鬼屋。五条过山车、红蓝双塔、旋转木马和茶杯均可在站台按 E 直接乘坐；目前是随车镜头的乘坐原型。</p>
                <Button onClick={() => setView({ x: amusementPlan.center.x, z: amusementPlan.center.z, span: 2200 })}>放大园区</Button>
                <Button onClick={() => onTeleportPoint(
                  amusementPlan.center.x + amusementPlan.entrance.x,
                  amusementPlan.center.z + amusementPlan.entrance.z,
                )}>传送到游乐园门口</Button>
                <p>也可直接前往各设施站台；到站后按 E 登上。</p>
                {PARK_RIDES.map((ride) => <Button key={ride.id} onClick={() => onTeleportPoint(
                  amusementPlan.center.x + ride.station[0],
                  amusementPlan.center.z + ride.station[1],
                )}>{ride.label} 站台</Button>)}
              </section>
            ) : selectedStation ? (
              <section>
                <h3>{selectedStation.id} · {selectedStation.name}</h3>
                <p>{selectedStation.mode === 'UNDERGROUND' ? '地下站' : '高架站'} · {selectedStation.mode === 'ELEVATED' ? '站体外观试建' : '站址初步勘测'}</p>
                <p>X {selectedStation.x} / Z {selectedStation.z} m</p>
                <p>玩家可传送至站门口。高架站体已加入城市；轨道贯通、列车运行和居民乘降尚未建成，地图传送不计入居民交通。</p>
                <Button onClick={() => setView({ x: selectedStation.x, z: selectedStation.z, span: 1200 })}>查看站址</Button>
                <Button onClick={() => onTeleport(selectedStation)}>传送至此</Button>
              </section>
            ) : selected ? (
              <section>
                <h3>{categories[selected.type]?.[0]}</h3>
                <p className="plan-id">{selected.id}</p>
                <p>{landValueZone(selected.x, selected.z)}</p>
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
                <Button onClick={()=>onTeleportPoint(selected.entrance[0],selected.entrance[2])}>Teleport · 传送到大门</Button>
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
    </Dialog></Localized>
  );
}
