'use client';
import {Localized,LanguageSwitch} from '../language';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CITY, CityLayer } from '../world-client/city-layer';
import {usePopulation,PopulationLayer,PopulationPanel} from '../life-sim/client';
import {CityOperations} from '../world-client/city-operations';
import {CityServiceBuildings,CITY_SERVICE_COLLIDERS} from '../world-client/city-service-buildings';
import { CITY_INFRA } from '../world-client/city-surface';
import {CoreSignals} from '../world-client/core-signals';
import {escalatorVelocity} from '../world-client/mall-escalators.mjs';
import { CIVIC_COLLIDERS } from '../world-client/civic-registry';
import { CivicPlaces } from '../world-client/civic-places';
import { MallElevators } from '../world-client/mall-elevators';
import { createMallLifts, LIFT_STATIC_SOLIDS, MALL_LEVELS, nearestMallLevel, liftContains, requestMallLift, type LiftCarrier } from '../world-client/mall-circulation';
import { Communities } from '../world-client/communities';
import { MetropolitanPlaces } from '../world-client/metropolitan-places';
import { METROPOLITAN_COLLIDERS } from '../world-client/metropolitan-registry';
import { riverCenterX } from '../world-client/river-profile.mjs';
import { COMMUNITY_COLLIDERS } from '../world-client/community-registry';
import { HousingWorld } from '../world-client/housing-world';
import {
  HOUSING_PLAN,
  HOUSING_LABELS,
  housingColliders,
  canCloseHousingGate,
} from '../world-client/housing-registry';
import { StreetTrees } from '../world-client/street-trees';
import { findVehicleExit } from '../world-client/vehicle-safety';
import {
  GARAGE_COLLIDERS,
  parkedGarageBay,
  MALL_GARAGE,
  garageLevelAt,
} from '../world-client/mall-garage';
import { CityPlan } from '../world-client/city-plan';
import { Canvas, useThree } from '@react-three/fiber';
import { Clone, Html, OrbitControls } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, BufferGeometry, Float32BufferAttribute } from 'three';
import { DriveableCar, type CarState } from '../world-client/driveable-car';
import concourse from '../../public/assets/3d/ampliworld/GC-CBD-CONCOURSE-001/concourse-manifest.json';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Button } from '@/components/ui/button';
import {
  CanvasBoundary,
  Residence,
  StudioLight,
  Walker,
} from '../architecture/view';
import {
  DynamicAtmosphere,
  formatWorldTime,
  getWorldMinutesAtCycleTime,
} from '../dynamic-atmosphere';
import { DISTRICT, districtGroundHeight, districtLocation } from './registry';
import streetData from '../../public/assets/3d/ampliworld/GC-STREET-001/street-manifest.json';
import mallData from '../../public/assets/3d/ampliworld/GC-MALL-002/mall-manifest.json';
import cbdStreet from '../../public/assets/3d/ampliworld/GC-CBD-STREET-001/street-manifest.json';
import officeOne from '../../public/assets/3d/ampliworld/GC-OFFICE-001/tower-manifest.json';
import officeTwo from '../../public/assets/3d/ampliworld/GC-OFFICE-002/tower-manifest.json';
import officeThree from '../../public/assets/3d/ampliworld/GC-OFFICE-003/tower-manifest.json';
const officeManifests = [officeOne, officeTwo, officeThree];
function CoreReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}
function Office({ assetId, x, z }: { assetId: string; x: number; z: number }) {
  const { scene } = useGLTF(`/assets/3d/ampliworld/${assetId}/tower-lod0.glb`);
  return (
    <group position={[x, 0, z]}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}
function CityInfrastructure() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-CITY-INFRA-001/globalinfra.glb',
  );
  return <Clone object={scene} receiveShadow />;
}
function CBDBoulevards() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-CBD-STREET-001/cbd-streets.glb',
  );
  return <Clone object={scene} castShadow receiveShadow />;
}

function Mall() {
  const { scene } = useGLTF('/assets/3d/ampliworld/GC-MALL-002/mall-lod0.glb');
  return (
    <group position={[DISTRICT.mall.x, 0, DISTRICT.mall.z]}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}
function MallApproach() {
  const ground = useMemo(() => {
    const holes = [...concourse.holes, { min: [114, -128], max: [127, -79] }];
    const xs = [-600, 600, ...holes.flatMap((h) => [h.min[0], h.max[0]])].sort(
      (a, b) => a - b,
    );
    const zs = [
      -1100,
      1100,
      ...holes.flatMap((h) => [h.min[1], h.max[1]]),
    ].sort((a, b) => a - b);
    const vertices: number[] = [];
    for (let i = 1; i < xs.length; i++)
      for (let j = 1; j < zs.length; j++) {
        const x0 = xs[i - 1],
          x1 = xs[i],
          z0 = zs[j - 1],
          z1 = zs[j],
          x = (x0 + x1) / 2,
          z = (z0 + z1) / 2;
        if (
          x0 === x1 ||
          z0 === z1 ||
          holes.some(
            (h) => x > h.min[0] && x < h.max[0] && z > h.min[1] && z < h.max[1],
          )
        )
          continue;
        vertices.push(
          x0,
          -0.015,
          z0,
          x0,
          -0.015,
          z1,
          x1,
          -0.015,
          z0,
          x1,
          -0.015,
          z0,
          x0,
          -0.015,
          z1,
          x1,
          -0.015,
          z1,
        );
      }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => ground.dispose(), [ground]);
  return (
    <group>
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial color="#c9ceca" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, -81]} receiveShadow>
        <boxGeometry args={[14, 0.06, 14]} />
        <meshStandardMaterial color="#8b9294" roughness={0.85} />
      </mesh>
    </group>
  );
}
function Concourse() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-CBD-CONCOURSE-001/concourse.glb',
  );
  return <Clone object={scene} castShadow receiveShadow />;
}

function Street() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-STREET-001/street-block.glb',
  );
  const display = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o.name === 'Street_bark' || o.name === 'Street_leaf')
        o.visible = false;
    });
    return c;
  }, [scene]);
  return <Clone object={display} castShadow receiveShadow />;
}
function SetupCamera({
  walking,
  controls,
  wide,
  focus,
  garageLevel,
  mallLevel,
}: {
  walking: boolean;
  garageLevel: number;
  mallLevel: number;
  controls: React.RefObject<OrbitControlsImpl | null>;
  wide: boolean;
  focus:
    | 'cbd'
    | 'stadium'
    | 'sushi'
    | 'auto'
    | 'garage'
    | 'mall'
    | 'middle'
    | 'river'
    | 'east'
    | 'south'
    | 'estuary'
    | 'marina'
    | `housing-${string}`;
}) {
  const { camera, invalidate } = useThree();
  const savedWalkCamera = useRef<{ position: Vector3; target: Vector3 } | null>(
    null,
  );
  const lastWalking = useRef(true);
  useEffect(() => {
    // Millimetre-scale street layers need more depth precision at kilometre
    // overview distances. Keep the close near plane only for the walker.
    camera.near = walking || focus === 'garage' || focus === 'mall' ? 0.1 : wide ? 3500 : 8;
    camera.far = wide ? 100000 : 18000;
    camera.updateProjectionMatrix();
    if (!walking && lastWalking.current && controls.current) {
      savedWalkCamera.current = {
        position: camera.position.clone(),
        target: controls.current.target.clone(),
      };
    }
    lastWalking.current = walking;
    if (walking && savedWalkCamera.current) {
      camera.position.copy(savedWalkCamera.current.position);
      controls.current?.target.copy(savedWalkCamera.current.target);
      controls.current?.update();
      invalidate();
      return;
    }
    if(!walking&&!wide&&focus==='marina'){camera.position.set(6820,150,13530);controls.current?.target.set(6500,0,13300);controls.current?.update();invalidate();return;}
    if (!walking && !wide && focus === 'garage') {
      const floor = MALL_GARAGE.levels[garageLevel].floorY;
      camera.position.set(36, floor + 3, -130);
      controls.current?.target.set(-25, floor + 1.6, -208);
      controls.current?.update();
      invalidate();
      return;
    }
    if (!walking && !wide && focus === 'mall') {
      const floor = MALL_LEVELS[mallLevel].y;
      camera.position.set(-52, floor + 2.7, -160);
      controls.current?.target.set(-52, floor + 1.5, -227);
      controls.current?.update();
      invalidate();return;
    }
    if (!walking && !wide && focus.startsWith('housing-')) {
      const p = HOUSING_PLAN.placements.find((p) => p.type === focus.slice(8))!;
      camera.position.set(
        p.x + p.width * 0.8,
        p.type === 'ultra' ? 390 : 230,
        p.z + p.depth * 0.8,
      );
      controls.current?.target.set(p.x, p.type === 'ultra' ? 70 : 12, p.z);
      controls.current?.update();
      invalidate();
      return;
    }
    if (!walking && !wide && (focus === 'middle' || focus === 'river')) {
      if (focus === 'middle') {
        camera.position.set(-570, 235, 1060);
        controls.current?.target.set(-850, 12, 750);
      } else {
        camera.position.set(2550, 240, 1390);
        controls.current?.target.set(2010, 8, 980);
      }
      controls.current?.update();
      invalidate();
      return;
    }
    if (!walking && !wide && ['east', 'south', 'estuary'].includes(focus)) {
      const x =
        focus === 'east'
          ? 5000
          : focus === 'south'
            ? -1000
            : riverCenterX(13200) - 1100;
      const z = focus === 'east' ? 3000 : focus === 'south' ? 8000 : 13135;
      camera.position.set(
        x + (focus === 'estuary' ? 140 : 650),
        focus === 'estuary' ? 95 : 440,
        z + (focus === 'estuary' ? 150 : 750),
      );
      controls.current?.target.set(x, focus === 'estuary' ? 0 : 70, z);
      controls.current?.update();
      invalidate();
      return;
    }
    camera.position.set(
      ...((walking
        ? [0, 4, -59]
        : wide
          ? [17000, 23000, 26000]
          : focus === 'garage'
            ? [100, -2.3, -123]
            : focus === 'stadium'
              ? [190, 430, 930]
              : focus === 'auto'
                ? [-425, 30, 815]
                : focus === 'sushi'
                  ? [229, 28, 13]
                  : [430, 660, 740]) as [number, number, number]),
    );
    controls.current?.target.set(
      !walking && !wide && focus === 'garage'
        ? 40
        : !walking && !wide && focus === 'auto'
          ? -565
          : !walking && !wide && focus === 'sushi'
            ? 180
            : 0,
      walking
        ? 1.5
        : wide
          ? 0
          : focus === 'garage'
            ? -2.8
            : focus === 'auto'
              ? 8
              : focus === 'stadium'
                ? 10
                : focus === 'sushi'
                  ? 2.5
                  : 190,
      walking
        ? -68
        : wide
          ? 0
          : focus === 'garage'
            ? -154
            : focus === 'auto'
              ? 655
              : focus === 'stadium'
                ? 600
                : focus === 'sushi'
                  ? -38
                  : -500,
    );
    controls.current?.update();
    invalidate();
  }, [walking, controls, camera, invalidate, wide, focus, garageLevel, mallLevel]);
  return null;
}

export function DistrictClient() {
  const population=usePopulation();
  const [selectedResident,setSelectedResident]=useState<string|null>(null);
  const [mounted, setMounted] = useState(false);
  const [coreReady, setCoreReady] = useState(false);
  const onCoreReady = useCallback(() => setCoreReady(true), []);
  const [walking, setWalking] = useState(false);
  const [legacyNavigationEnabled] = useState(false);
  const [wide, setWide] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [garageLevel, setGarageLevel] = useState(0);
  const [mallLevel, setMallLevel] = useState(4);
  const look = useRef({ pitch: 0 });
  const [focus, setFocus] = useState<
    | 'cbd'
    | 'stadium'
    | 'sushi'
    | 'auto'
    | 'garage'
    | 'mall'
    | 'middle'
    | 'river'
    | 'east'
    | 'south'
    | 'estuary'
    | 'marina'
    | `housing-${string}`
  >('cbd');
  const [loadedTiles, setLoadedTiles] = useState<Set<string>>(() => new Set());
  const onTileReady = useCallback(
    (id: string) =>
      setLoadedTiles((s) => (s.has(id) ? s : new Set([...s, id]))),
    [],
  );
  const [minutes, setMinutes] = useState(480);
  const [position, setPosition] = useState<number[]>([0, -68]);
  const [openGates, setOpenGates] = useState<Set<string>>(() => new Set());
  const [visualAnchor, setVisualAnchor] = useState<[number, number]>([0, 0]);
  const housingX = walking
    ? Math.round(position[0] / 1000) * 1000
    : visualAnchor[0];
  const housingZ = walking
    ? Math.round(position[1] / 1000) * 1000
    : visualAnchor[1];
  const renderTiles = useMemo(
    () =>
      CITY.tiles.filter(
        (t) =>
          Math.abs(t.cx - housingX) <= 2000 &&
          Math.abs(t.cz - housingZ) <= 2000,
      ),
    [housingX, housingZ],
  );
  const nearGate = HOUSING_PLAN.placements.find(
    (p) =>
      ['high', 'ultra', 'mixedVilla', 'largeDetached'].includes(p.type) &&
      Math.hypot(p.gateWorld[0] - position[0], p.gateWorld[1] - position[1]) <
        18,
  );
  const controls = useRef<OrbitControlsImpl>(null);
  const cellX = Math.round(position[0] / 1000),
    cellZ = Math.round(position[1] / 1000);
  const populationCellX=Math.round(position[0]/500),populationCellZ=Math.round(position[1]/500);
  useEffect(()=>{void population.loadArea(populationCellX*500,populationCellZ*500);},[populationCellX,populationCellZ,population.loadArea]);
  const nearTiles = useMemo(
    () =>
      CITY.tiles.filter(
        (t) =>
          Math.abs(t.cx - cellX * 1000) <= 2000 &&
          Math.abs(t.cz - cellZ * 1000) <= 2000,
      ),
    [cellX, cellZ],
  );
  const car = useRef<CarState>({ x: 6, z: -68, yaw: 0, speed: 0 });
  const playerFloor = useRef(0);
  const liftCars = useMemo(createMallLifts, []);
  const liftCarrier = useRef<LiftCarrier>({active:false,y:0,carId:null});
  const [liftPanel, setLiftPanel] = useState(false);
  const [,refreshLift] = useState(0);
  const [liftNotice,setLiftNotice] = useState('走入电梯轿厢后选择楼层');
  const nearbyLift = liftCars.find(c => Math.abs(position[0]-c.x)<1.5 && Math.abs(position[1]-c.z)<7 && Math.abs(playerFloor.current-nearestMallLevel(playerFloor.current).y)<.5);
  const currentMallLevel = nearestMallLevel(playerFloor.current);
  const rideLift = (target:number) => {
    if(!nearbyLift) return;
    if(!liftContains(nearbyLift,position[0],position[1],playerFloor.current)) {
      requestMallLift(nearbyLift,currentMallLevel.y);
      setLiftNotice('已呼梯，请等候开门，走入轿厢后再选目的层');
    } else if(requestMallLift(nearbyLift,target)) {
      liftCarrier.current={active:nearbyLift.phase!=='idle',y:nearbyLift.y,carId:nearbyLift.id};
      setLiftNotice(`电梯 ${nearbyLift.id} · 前往 ${nearestMallLevel(target).label}`);
    }
    refreshLift(n=>n+1);
    (document.activeElement as HTMLElement)?.blur();
  };
  const mallWalkGround = useCallback((x:number,z:number,y=0)=>{
    const cab=liftCars.find(c=>Math.abs(x-c.x)<1.35&&Math.abs(z-c.z)<2.4);
    return cab && Math.abs(cab.y-y)<1 ? cab.y : districtGroundHeight(x,z,y);
  },[liftCars]);
  const [driving, setDriving] = useState(false),
    [carReport, setCarReport] = useState<CarState>({ ...car.current });
  const gateCanClose =
    !!nearGate &&
    canCloseHousingGate(nearGate.id, position[0], position[1], 1) &&
    canCloseHousingGate(nearGate.id, car.current.x, car.current.z, 3.5);
  const [relocation, setRelocation] = useState<{
    x: number;
    z: number;
    y: number;
    nonce: number;
  }>();
  const [vehicleMessage, setVehicleMessage] = useState(
    '靠近前街轿车后按 E 或点击上车',
  );
  useEffect(() => {
    setMounted(true);
    const start = performance.now();
    const timer = setInterval(() => {
      if (!document.hidden)
        setMinutes(
          getWorldMinutesAtCycleTime(performance.now() - start + 600000),
        );
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const solids = useMemo(
    () => [
      ...LIFT_STATIC_SOLIDS,
      ...liftCars.flatMap(c=>[c.platform,...c.doors]),
      ...[
        ...CIVIC_COLLIDERS,
        ...GARAGE_COLLIDERS,
        ...COMMUNITY_COLLIDERS,
        ...housingColliders(cellX * 1000, cellZ * 1000, openGates),
        ...METROPOLITAN_COLLIDERS,
        ...CITY_SERVICE_COLLIDERS,
      ].map(
        (c) =>
          new Box3(
            new Vector3(...(c.min as [number, number, number])),
            new Vector3(...(c.max as [number, number, number])),
          ),
      ),
      ...nearTiles.flatMap((t) =>
        t.colliders.map(
          (c) =>
            new Box3(
              new Vector3(...(c.min as [number, number, number])),
              new Vector3(...(c.max as [number, number, number])),
            ),
        ),
      ),
      ...CITY_INFRA.colliders
        .filter(
          (c) =>
            Math.abs((c.min[0] + c.max[0]) / 2 - cellX * 1000) < 3000 &&
            Math.abs((c.min[2] + c.max[2]) / 2 - cellZ * 1000) < 3000,
        )
        .map(
          (c) =>
            new Box3(
              new Vector3(...(c.min as [number, number, number])),
              new Vector3(...(c.max as [number, number, number])),
            ),
        ),
      ...concourse.colliders.map(
        (c) =>
          new Box3(
            new Vector3(...(c.min as [number, number, number])),
            new Vector3(...(c.max as [number, number, number])),
          ),
      ),
      ...DISTRICT.offices.flatMap((b, i) =>
        officeManifests[i].colliders.map(
          (c) =>
            new Box3(
              new Vector3(c.min[0] + b.x, c.min[1], c.min[2] + b.z),
              new Vector3(c.max[0] + b.x, c.max[1], c.max[2] + b.z),
            ),
        ),
      ),
      ...cbdStreet.colliders.map(
        (c) =>
          new Box3(
            new Vector3(...(c.min as [number, number, number])),
            new Vector3(...(c.max as [number, number, number])),
          ),
      ),
      ...mallData.colliders.map(
        (c) =>
          new Box3(
            new Vector3(c.min[0], c.min[1], c.min[2] + DISTRICT.mall.z),
            new Vector3(c.max[0], c.max[1], c.max[2] + DISTRICT.mall.z),
          ),
      ),
      ...DISTRICT.buildings.map(
        (b) =>
          new Box3(
            new Vector3(b.x - 16, -1, b.z - 12),
            new Vector3(b.x + 16, 29.1, b.z + 12),
          ),
      ),
      ...streetData.colliders.map(
        (c) =>
          new Box3(
            new Vector3(...(c.min as [number, number, number])),
            new Vector3(...(c.max as [number, number, number])),
          ),
      ),
      // Vehicle signal poles are solid; their arms clear even tall road vehicles.
      ...[[9.8,16.8],[-9.8,-16.8],[16.8,-9.8],[-16.8,9.8]].map(([x,z])=>
        new Box3(new Vector3(x-.2,0,z-.2),new Vector3(x+.2,7,z+.2))),
    ],
    [nearTiles, cellX, cellZ, openGates, liftCars],
  );
  const walkerSolids = useMemo(
    () => [
      ...solids,
      new Box3(
        new Vector3(
          carReport.x -
            (Math.abs(Math.cos(carReport.yaw)) * 1.05 +
              Math.abs(Math.sin(carReport.yaw)) * 2.5),
          districtGroundHeight(carReport.x, carReport.z, carReport.y) - 0.1,
          carReport.z -
            (Math.abs(Math.sin(carReport.yaw)) * 1.05 +
              Math.abs(Math.cos(carReport.yaw)) * 2.5),
        ),
        new Vector3(
          carReport.x +
            (Math.abs(Math.cos(carReport.yaw)) * 1.05 +
              Math.abs(Math.sin(carReport.yaw)) * 2.5),
          districtGroundHeight(carReport.x, carReport.z, carReport.y) + 1.7,
          carReport.z +
            (Math.abs(Math.sin(carReport.yaw)) * 1.05 +
              Math.abs(Math.cos(carReport.yaw)) * 2.5),
        ),
      ),
    ],
    [solids, carReport.x, carReport.z, carReport.y, carReport.yaw],
  );
  const nearCar =
    Math.hypot(position[0] - car.current.x, position[1] - car.current.z) < 8 &&
    Math.abs(playerFloor.current - (car.current.y ?? 0)) < 2;
  const toggleCar = () => {
    if (!walking) return;
    if (!driving) {
      if (!nearCar) return;
      car.current.speed = 0;
      setDriving(true);
      setVehicleMessage('W/S 加速与倒车 · A/D 转向 · 空格刹车');
    } else {
      car.current.speed = 0;
      const exit = findVehicleExit(car.current, solids, districtGroundHeight);
      if (exit) {
        setRelocation({ ...exit, nonce: Date.now() });
        setPosition([exit.x, exit.z]);
        playerFloor.current = exit.y;
        setDriving(false);
        setVehicleMessage('已下车 · 靠近车辆可再次驾驶');
        return;
      }
      setVehicleMessage('两侧无法安全下车，请先移到开阔位置');
    }
    (document.activeElement as HTMLElement)?.blur();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.code === 'KeyE' &&
        !e.repeat &&
        !(e.target as HTMLElement)?.closest(
          'input,textarea,[contenteditable=true]',
        )
      ) {
        e.preventDefault();
        toggleCar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [walking, driving, nearCar, position, solids]);
  return (
    <main className="district">
      <div className="district-canvas">
        {!coreReady && (
          <div className="district-loading district-startup">
            正在载入街区、车辆与树木…
          </div>
        )}
        <CanvasBoundary>
          {mounted && (
            <Canvas
              shadows
              frameloop="demand"
              dpr={[1, 1.3]}
              camera={{ position: [0, 4, 34], fov: 55, near: 0.1, far: 4000 }}
            >
              <Suspense
                fallback={
                  <Html center>
                    <div className="district-loading">载入花园街区…</div>
                  </Html>
                }
              >
                <DynamicAtmosphere
                  hour={minutes / 60}
                  metricWorld
                  cityOverview={wide}
                  fogNear={wide ? 55000 : 5000}
                  fogFar={wide ? 95000 : 16000}
                />
                <StudioLight intensity={0.3} />
                <PopulationLayer world={population.world} onSelect={setSelectedResident}/>
                <CoreSignals/>
                <MallApproach />
                <CityInfrastructure />
                <Street />
                <Mall />
                <CBDBoulevards />
                <Concourse />
                <CivicPlaces
                  garageY={
                    !walking && focus === 'garage'
                      ? MALL_GARAGE.levels[garageLevel].floorY
                      : driving
                        ? (carReport.y ?? 0)
                        : playerFloor.current
                  }
                />
                <Communities />
                <MetropolitanPlaces />
                <CityOperations />
                <CityServiceBuildings />
                <HousingWorld x={housingX} z={housingZ} open={openGates} />
                <StreetTrees />
                <CoreReady onReady={onCoreReady} />
                <DriveableCar
                  state={car}
                  active={coreReady && walking && driving && !planOpen}
                  look={look}
                  controls={controls}
                  obstacles={solids}
                  groundHeight={districtGroundHeight}
                  onReport={(s) => {
                    setCarReport(s);
                    if (driving) setPosition([s.x, s.z]);
                  }}
                />
                {DISTRICT.offices.map((b) => (
                  <Office key={b.id} {...b} />
                ))}
                {DISTRICT.buildings.map((b) => (
                  <group
                    key={b.id}
                    position={[b.x, 0, b.z]}
                    rotation={[0, b.rotationY, 0]}
                  >
                    <Residence lod={0} />
                  </group>
                ))}
              </Suspense>
              <CityLayer
                tiles={renderTiles}
                loaded={loadedTiles}
                onReady={onTileReady}
                overview={wide}
              />
              <OrbitControls
                ref={controls}
                makeDefault
                onChange={() => {
                  if (walking || wide || !controls.current) return;
                  const target = controls.current.target,
                    x = Math.round(target.x / 500) * 500,
                    z = Math.round(target.z / 500) * 500;
                  setVisualAnchor((v) =>
                    v[0] === x && v[1] === z ? v : [x, z],
                  );
                }}
                enableDamping={false}
                minDistance={
                  walking || focus === 'garage' || focus === 'mall'
                    ? 0.1
                    : wide
                      ? 18000
                      : focus === 'sushi'
                        ? 3
                        : 35
                }
                maxDistance={walking ? 18 : wide ? 65000 : 1800}
                maxPolarAngle={
                  !walking && focus === 'garage'
                    ? Math.PI - 0.04
                    : Math.PI / 2 - 0.04
                }
                enablePan={!walking}
                enableRotate={!walking}
                enableZoom={!walking}
              />
              <SetupCamera
                walking={walking}
                controls={controls}
                wide={wide}
                focus={focus}
                garageLevel={garageLevel}
                mallLevel={mallLevel}
              />
              <Walker
                active={coreReady && walking && !driving && !planOpen}
                look={look}
                relocation={relocation}
                carrier={liftCarrier}
                surfaceVelocity={escalatorVelocity}
                controls={controls}
                onPosition={(x, z, y) => {
                  playerFloor.current = y ?? 0;
                  setPosition([x, z]);
                }}
                spawn={DISTRICT.spawnLocalMeters}
                obstacles={walkerSolids}
                limits={[9998, 14998]}
                groundHeight={mallWalkGround}
              />
              <MallElevators cars={liftCars} carrier={liftCarrier} />
            </Canvas>
          )}
        </CanvasBoundary>
      </div>
      <Localized><header className="district-hud">
        <div>
          <span>AMPLIWORLD · OBSERVABLE WORLD LAB</span>
          <h1>企业世界实验室</h1>
          <p>社会结构 · 消费行为 · 城市服务 ｜ 保留真实尺度的步行与驾驶</p>
        </div>
        <div className="district-time">
          {formatWorldTime(minutes)}
          <small>保留原昼夜节奏 · 完整循环 55 分钟</small>
        </div>
      </header>
      <nav className="district-tools">
        <LanguageSwitch />
        <Button onClick={()=>{setDriving(false);setWalking(true);setWide(false);setFocus('cbd');setRelocation({x:0,z:-68,y:0,nonce:Date.now()});(document.activeElement as HTMLElement)?.blur();}}>人物起点</Button>
        <Button onClick={()=>{car.current={x:6,z:-68,yaw:0,speed:0};setCarReport({...car.current});setDriving(true);setWalking(true);setWide(false);setFocus('cbd');setPosition([6,-68]);(document.activeElement as HTMLElement)?.blur();}}>车辆起点</Button>
        {legacyNavigationEnabled&&<>
        <Button onClick={()=>setSelectedResident(population.world?.residents[0]?.id||null)}>居民档案 · {population.world?.residents.length||0} 人</Button>
        <Button onClick={()=>{setFocus('marina');setWide(false);setWalking(false);}}>东湾游艇港 · 150 泊位</Button>
        <Button onClick={()=>{setWalking(false);setFocus('cbd');setWide(false)}}>实验室 · 街区观察</Button>
        <Button onClick={()=>{setWalking(true);setWide(false);(document.activeElement as HTMLElement)?.blur();}}>进入现场 · 步行 / 驾驶</Button>
        <Button onClick={()=>{setFocus('mall');setWide(false);setWalking(false)}}>商场楼层览景</Button>
        {!walking && focus==='mall' && MALL_LEVELS.map((l,i)=>l.y>=0&&<Button key={l.id} aria-pressed={i===mallLevel} onClick={()=>setMallLevel(i)}>{l.label}</Button>)}
        {walking && !driving && nearbyLift && <Button onClick={()=>setLiftPanel(v=>!v)}>电梯 {nearbyLift!.id} · {currentMallLevel.id}</Button>}
        {walking && !driving && liftPanel && nearbyLift && <section aria-label="商场电梯楼层" style={{background:'#152b32',padding:16,border:'1px solid #ba9d67',maxWidth:420,color:'#f4eedf'}}>
          <strong>电梯 {nearbyLift!.id} · {currentMallLevel.label}</strong>
          <p aria-live="polite">{liftNotice}</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            <Button onClick={()=>rideLift(currentMallLevel.y)}>呼梯到本层</Button>
            {MALL_LEVELS.map(l=><Button key={l.id} disabled={liftCarrier.current.active} onClick={()=>rideLift(l.y)}>{l.label}</Button>)}
          </div>
        </section>}
        <Button onClick={() => setPlanOpen(true)}>城市平面图</Button>
        <Button
          onClick={() => {
            setWide(true);
            setWalking(false);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          全城总览
        </Button>
        <Button
          onClick={() => {
            setFocus('stadium');
            setWide(false);
            setWalking(false);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          体育场俯瞰
        </Button>
        <Button
          onClick={() => {
            setFocus('sushi');
            setWide(false);
            setWalking(false);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          日料街景
        </Button>
        <Button
          onClick={() => {
            setFocus('auto');
            setWide(false);
            setWalking(false);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          汽车中心览景
        </Button>
        <Button
          onClick={() => {
            setFocus('garage');
            setWide(false);
            setWalking(false);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          地库览景
        </Button>
        {!walking &&
          focus === 'garage' &&
          MALL_GARAGE.levels.map((level, i) => (
            <Button
              key={level.id}
              aria-pressed={i === garageLevel}
              onClick={() => setGarageLevel(i)}
            >
              {level.id} · {level.bayCount} 车位
            </Button>
          ))}
        {walking && (
          <Button
            disabled={!driving && !nearCar}
            onClick={() => {
              toggleCar();
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            {driving
              ? '下车（E）'
              : nearCar
                ? '上车驾驶（E）'
                : '靠近前街汽车上车'}
          </Button>
        )}
        <Button
          onClick={() => {
            setFocus('middle');
            setWide(false);
            setWalking(false);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          青庭花园 · 15 栋
        </Button>
        <Button
          onClick={() => {
            setFocus('river');
            setWide(false);
            setWalking(false);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          澜岸别墅 · 60 栋
        </Button>
        <Button
          onClick={() => {
            setWalking((v) => !v);
            setWide(false);
            setFocus('cbd');
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          {walking ? '俯瞰街区' : '控制小人'}
        </Button>
        {[
          'low',
          'lowerMiddle',
          'high',
          'ultra',
          'mixedVilla',
          'largeDetached',
        ].map((type) => (
          <Button
            key={type}
            onClick={() => {
              setFocus(`housing-${type}`);
              setWide(false);
              setWalking(false);
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            {HOUSING_LABELS[type]}览景
          </Button>
        ))}
        {walking && nearGate && (
          <Button
            disabled={openGates.has(nearGate!.id) && !gateCanClose}
            onClick={() =>
              setOpenGates((s) => {
                if (s.has(nearGate!.id) && !gateCanClose) return s;
                const n = new Set(s);
                n.has(nearGate!.id) ? n.delete(nearGate!.id) : n.add(nearGate!.id);
                return n;
              })
            }
          >
            {openGates.has(nearGate!.id)
              ? gateCanClose
                ? '关闭小区门禁'
                : '请先离开门口再关闭'
              : '打开小区门禁（试玩）'}
          </Button>
        )}
        <a href="/architecture">住宅细节</a>
        {(
          [
            ['east', '东曜副中心'],
            ['south', '南辰副中心'],
            ['estuary', '河口景观'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            onClick={() => {
              setFocus(id);
              setWide(false);
              setWalking(false);
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            {label}
          </Button>
        ))}
        </>}
      </nav></Localized>
      {walking && (
        <Localized><div className="district-look">
          <Button
            onClick={() => {
              look.current.pitch = Math.min(1.48, look.current.pitch + 0.24);
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            抬头 ↑（R）
          </Button>
          <Button
            onClick={() => {
              look.current.pitch = Math.max(-0.45, look.current.pitch - 0.24);
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            低头 ↓（F）
          </Button>
          <Button
            onClick={() => {
              look.current.pitch = 0;
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            视角归正
          </Button>
        </div></Localized>
      )}
      <CityPlan
        open={planOpen}
        onOpenChange={setPlanOpen}
        position={position}
      />
      <Localized><div className="district-status" aria-live="polite">
        {driving && walking
          ? `驾驶 · ${Math.abs(carReport.speed * 3.6).toFixed(0)} km/h · WASD / 空格刹车 · E 下车`
          : walking
            ? `WASD 行走 · 空格跳跃 · 鼠标拖动看四周 · X ${position[0].toFixed(1)} m / Z ${position[1].toFixed(1)} m`
            : '拖动俯瞰 · 滚轮缩放 · 点击「控制小人」回到街道'}
        <small>
          {driving
            ? parkedGarageBay(carReport)
              ? `已停入 ${parkedGarageBay(carReport)!.id} · E 下车`
              : vehicleMessage
            : walking
              ? districtLocation(position[0], position[1])
              : '俯瞰不会改变角色位置 · 返回继续原地行走'}
        </small>
      </div></Localized>
      <PopulationPanel controller={population} selected={selectedResident} onSelect={setSelectedResident}/>
    </main>
  );
}
