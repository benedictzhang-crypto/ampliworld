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
import {SetupCamera} from './camera';
import {CoreGround} from '../world-client/core-ground';
import {PopulationLayer,PopulationPanel} from '../life-sim/client';
import {usePopulation} from '../life-sim/use-population';
import {CityOperations,CITY_OPERATION_COLLIDERS} from '../world-client/city-operations';
import {CityServiceBuildings,CITY_SERVICE_COLLIDERS} from '../world-client/city-service-buildings';
import { CITY_INFRA } from '../world-client/city-surface';
import {CoreSignals} from '../world-client/core-signals';
import {escalatorVelocity} from '../world-client/mall-escalators.mjs';
import { CIVIC_COLLIDERS } from '../world-client/civic-registry';
import { CivicPlaces } from '../world-client/civic-places';
import { MallElevators } from '../world-client/mall-elevators';
import { createMallLifts, LIFT_STATIC_SOLIDS, nearestMallLevel, liftContains, requestMallLift, type LiftCarrier } from '../world-client/mall-circulation';
import { Communities } from '../world-client/communities';
import { MetropolitanPlaces } from '../world-client/metropolitan-places';
import { METROPOLITAN_COLLIDERS } from '../world-client/metropolitan-registry';
import { COMMUNITY_COLLIDERS } from '../world-client/community-registry';
import { HousingWorld } from '../world-client/housing-world';
import {
  HOUSING_PLAN,
  housingColliders,
  canCloseHousingGate,
} from '../world-client/housing-registry';
import { StreetTrees } from '../world-client/street-trees';
import { findVehicleExit } from '../world-client/vehicle-safety';
import {
  GARAGE_COLLIDERS,
  parkedGarageBay,
  garageLevelAt,
} from '../world-client/mall-garage';
import { CityPlan } from '../world-client/city-plan';
import type { MetroStation } from '../world-client/metro-network';
import { MetroPlaces } from '../world-client/metro-places';
import { METRO_PIER_COLLIDERS } from '../world-client/metro-surface';
import { AMUSEMENT_COLLIDERS, AmusementPark, AMUSEMENT_PARK, type BasketballShot } from '../world-client/amusement-park';
import { hauntStepAt, hauntNextDoor, nearBasketballCourt, evaluateBasketballShot, type HauntStep } from '../world-client/amusement-experience';
import { PARK_RIDES, rideAtStation, type RideSession } from '../world-client/amusement-rides';
import { AmusementRideCamera } from '../world-client/amusement-ride-camera';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import {Office,RooftopHelipads,CityInfrastructure,CBDBoulevards,Mall,Concourse,Street} from '../world-client/core-assets';
import { Box3, Vector3 } from 'three';
import { DriveableCar, carBlocked, type CarState } from '../world-client/driveable-car';
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
function vehicleBodyCollider(s: CarState) {
  const dx = Math.abs(Math.cos(s.yaw)) * 1.05 + Math.abs(Math.sin(s.yaw)) * 2.5;
  const dz = Math.abs(Math.sin(s.yaw)) * 1.05 + Math.abs(Math.cos(s.yaw)) * 2.5;
  const floor = districtGroundHeight(s.x, s.z, s.y);
  return new Box3(new Vector3(s.x - dx, floor - .1, s.z - dz),
    new Vector3(s.x + dx, floor + 1.7, s.z + dz));
}
function CoreReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export function DistrictClient() {
  const population=usePopulation();
  const [selectedResident,setSelectedResident]=useState<string|null>(null);
  const [mounted, setMounted] = useState(false);
  const [coreReady, setCoreReady] = useState(false);
  const onCoreReady = useCallback(() => setCoreReady(true), []);
  const [walking, setWalking] = useState(false);
  const [wide, setWide] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const look = useRef({ pitch: 0 });
  const [loadedTiles, setLoadedTiles] = useState<Set<string>>(() => new Set());
  const onTileReady = useCallback(
    (id: string) =>
      setLoadedTiles((s) => (s.has(id) ? s : new Set([...s, id]))),
    [],
  );
  const [minutes, setMinutes] = useState(480);
  const [position, setPosition] = useState<number[]>([0, -68]);
  const insideAmusementPark = Math.abs(position[0] - AMUSEMENT_PARK.center.x) <= AMUSEMENT_PARK.footprint.width / 2 &&
    Math.abs(position[1] - AMUSEMENT_PARK.center.z) <= AMUSEMENT_PARK.footprint.depth / 2;
  const [hauntStep, setHauntStep] = useState<HauntStep | null>(null);
  const [scare, setScare] = useState<HauntStep | null>(null);
  const lastHauntStage = useRef('');
  const scareTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [basketballOpen, setBasketballOpen] = useState(false);
  const [basketballAngle, setBasketballAngle] = useState(50);
  const [basketballSpeed, setBasketballSpeed] = useState(19.5);
  const [basketballAttempts, setBasketballAttempts] = useState(0);
  const [basketballMade, setBasketballMade] = useState(0);
  const [basketballResult, setBasketballResult] = useState('');
  const [basketballShot, setBasketballShot] = useState<BasketballShot | null>(null);
  const [ride, setRide] = useState<RideSession | null>(null);
  const shootBasketball = () => {
    const result = evaluateBasketballShot(basketballSpeed, basketballAngle);
    setBasketballAttempts((count) => count + 1);
    if (result.hit) setBasketballMade((count) => count + 1);
    setBasketballResult(result.hit
      ? `命中！篮球经过篮圈时高度 ${result.height.toFixed(2)} 米。`
      : `${result.height > 3.35 ? '投高了' : '投低了'}：过篮圈时高度 ${result.height.toFixed(2)} 米。`);
    setBasketballShot({ id: Date.now(), speed: basketballSpeed, angle: basketballAngle });
  };
  useEffect(() => {
    const step = walking ? hauntStepAt(position[0], position[1]) : null;
    setHauntStep((before) => before?.house === step?.house && before?.stage === step?.stage ? before : step);
    const key = step ? `${step.house}-${step.stage}` : '';
    if (key === lastHauntStage.current) return;
    lastHauntStage.current = key;
    if (step?.cue && (step.stage === 1 || step.stage === 2 || step.stage === 4 || step.stage === 5)) {
      setScare(step);
      if (scareTimeout.current) clearTimeout(scareTimeout.current);
      scareTimeout.current = setTimeout(() => setScare(null), 1500);
    }
  }, [walking, position]);
  useEffect(() => () => {
    if (scareTimeout.current) clearTimeout(scareTimeout.current);
  }, []);
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
  const parkCar = useRef<CarState>({
    x: AMUSEMENT_PARK.center.x + 6,
    z: AMUSEMENT_PARK.center.z + AMUSEMENT_PARK.entrance.z - 4,
    y: districtGroundHeight(AMUSEMENT_PARK.center.x + 6, AMUSEMENT_PARK.center.z + AMUSEMENT_PARK.entrance.z - 4),
    yaw: 0,
    speed: 0,
  });
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
    [activeCar, setActiveCar] = useState<'city' | 'park' | null>(null),
    [carReport, setCarReport] = useState<CarState>({ ...car.current }),
    [parkCarReport, setParkCarReport] = useState<CarState>({ ...parkCar.current });
  const activeReport = activeCar === 'park' ? parkCarReport : carReport;
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
        ...CITY_OPERATION_COLLIDERS,
        ...METRO_PIER_COLLIDERS,
        ...AMUSEMENT_COLLIDERS,
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
      vehicleBodyCollider(carReport),
      vehicleBodyCollider(parkCarReport),
    ],
    [solids, carReport, parkCarReport],
  );
  const nearCityCar =
    Math.hypot(position[0] - car.current.x, position[1] - car.current.z) < 8 &&
    Math.abs(playerFloor.current - (car.current.y ?? 0)) < 2;
  const nearParkCar =
    Math.hypot(position[0] - parkCar.current.x, position[1] - parkCar.current.z) < 8 &&
    Math.abs(playerFloor.current - (parkCar.current.y ?? 0)) < 2;
  const nearCar = nearCityCar || nearParkCar;
  const nearRide = walking && !driving && !ride ? rideAtStation(position[0], position[1]) : null;
  const beginRide = () => {
    if (!nearRide || !walking || driving || ride) return;
    setScare(null);
    setBasketballOpen(false);
    setPlanOpen(false);
    setRide({ id: nearRide.id, startedAt: performance.now() });
    (document.activeElement as HTMLElement)?.blur();
  };
  const leaveRide = (id: string) => {
    const finished = PARK_RIDES.find((entry) => entry.id === id);
    if (!finished) return;
    const x = AMUSEMENT_PARK.center.x + finished.station[0];
    const z = AMUSEMENT_PARK.center.z + finished.station[1];
    const y = districtGroundHeight(x, z);
    setRide(null);
    setPosition([x, z]);
    playerFloor.current = y;
    setRelocation({ x, z, y, nonce: Date.now() });
  };
  const toggleCar = () => {
    if (!walking) return;
    if (!driving) {
      if (!nearCar) return;
      const pickPark = nearParkCar && (!nearCityCar ||
        Math.hypot(position[0] - parkCar.current.x, position[1] - parkCar.current.z) <
        Math.hypot(position[0] - car.current.x, position[1] - car.current.z));
      const selected = pickPark ? parkCar.current : car.current;
      selected.speed = 0;
      setActiveCar(pickPark ? 'park' : 'city');
      setDriving(true);
      setVehicleMessage('W/S 加速与倒车 · A/D 转向 · 空格刹车');
    } else {
      const selected = activeCar === 'park' ? parkCar.current : car.current;
      selected.speed = 0;
      const exit = findVehicleExit(selected, solids, districtGroundHeight);
      if (exit) {
        setRelocation({ ...exit, nonce: Date.now() });
        setPosition([exit.x, exit.z]);
        playerFloor.current = exit.y;
        setDriving(false);
        setActiveCar(null);
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
        if (ride) return;
        if (nearRide) beginRide();
        else toggleCar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [walking, driving, activeCar, nearCar, nearCityCar, nearParkCar, position, solids, ride, nearRide]);
  const teleportTo = (x: number, z: number) => {
    const y = districtGroundHeight(x, z);
    const parkGateX = AMUSEMENT_PARK.center.x + AMUSEMENT_PARK.entrance.x;
    const parkGateZ = AMUSEMENT_PARK.center.z + AMUSEMENT_PARK.entrance.z;
    if (Math.abs(x - parkGateX) < 1 && Math.abs(z - parkGateZ) < 1) {
      const vehicle = { x: parkGateX + 6, z: parkGateZ - 4, y: districtGroundHeight(parkGateX + 6, parkGateZ - 4), yaw: 0, speed: 0 };
      parkCar.current = vehicle;
      setParkCarReport(vehicle);
      setVehicleMessage('游乐园入口旁已备好园区车 · 靠近按 E 上车');
    }
    // Move the playable city car to a clear arrival apron. Its previous
    // collision set describes the old streamed cell, so include destination
    // tiles and nearby housing before checking candidate parking positions.
    const nearbySolids=[
      ...solids,
      ...housingColliders(Math.round(x/1000)*1000,Math.round(z/1000)*1000,openGates),
      ...CITY.tiles.filter(tile=>Math.abs(tile.cx-x)<1400&&Math.abs(tile.cz-z)<1400)
        .flatMap(tile=>tile.colliders),
      ...CITY_INFRA.colliders.filter(c=>Math.abs((c.min[0]+c.max[0])/2-x)<100&&Math.abs((c.min[2]+c.max[2])/2-z)<100),
    ].map(c=>c instanceof Box3?c:new Box3(new Vector3(...(c.min as [number,number,number])),new Vector3(...(c.max as [number,number,number]))));
    let parked=false;
    for(const radius of [6,8,10,14,20,28,40]){
      for(let step=0;step<16;step++){
        const angle=step*Math.PI/8,cx=x+Math.cos(angle)*radius,cz=z+Math.sin(angle)*radius;
        const cy=districtGroundHeight(cx,cz);
        if(Math.abs(cy-y)>1.2||carBlocked(cx,cz,nearbySolids,districtGroundHeight,cy,0))continue;
        const vehicle={x:cx,z:cz,y:cy,yaw:0,speed:0};
        car.current=vehicle;
        setCarReport(vehicle);
        setVehicleMessage(radius<=10?'目的地旁已有车辆 · 靠近按 E 上车':`车辆停在入口约 ${radius} 米处 · 靠近按 E 上车`);
        parked=true;
        break;
      }
      if(parked)break;
    }
    if(!parked)setVehicleMessage('目的地周围没有安全车位，车辆停留在上一个位置');
    setRide(null);
    setDriving(false);
    setActiveCar(null);
    setWalking(true);
    setWide(false);
    setPosition([x, z]);
    playerFloor.current = y;
    setRelocation({ x, z, y, nonce: Date.now() });
    setPlanOpen(false);
    setScare(null);
    (document.activeElement as HTMLElement)?.blur();
  };
  const nextHauntDoor = hauntStep ? hauntNextDoor(hauntStep) : null;
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
                <PopulationLayer world={population.world} onSelect={setSelectedResident} groundHeight={districtGroundHeight}/>
                <CoreSignals/>
                <CoreGround />
                <CityInfrastructure />
                <Street />
                <Mall />
                <CBDBoulevards />
                <Concourse />
                <CivicPlaces
                  garageY={driving ? (activeReport.y ?? 0) : playerFloor.current}
                />
                <Suspense fallback={null}><RooftopHelipads/></Suspense>
                <Communities />
                <MetropolitanPlaces />
                <Suspense fallback={null}>
                  <MetroPlaces x={housingX} z={housingZ} />
                </Suspense>
                <Suspense fallback={null}>
                  <AmusementPark x={housingX} z={housingZ} scare={scare} shot={basketballShot} ride={ride} />
                </Suspense>
                {ride && <AmusementRideCamera key={ride.startedAt} session={ride} controls={controls} onComplete={leaveRide} />}
                <CityOperations />
                <CityServiceBuildings />
                <HousingWorld x={housingX} z={housingZ} open={openGates} />
                <StreetTrees />
                <CoreReady onReady={onCoreReady} />
                <DriveableCar
                  state={car}
                  debugId="city"
                  active={coreReady && walking && driving && activeCar === 'city' && !ride && !planOpen}
                  look={look}
                  controls={controls}
                  obstacles={solids}
                  groundHeight={districtGroundHeight}
                  onReport={(s) => {
                    setCarReport(s);
                    if (driving && activeCar === 'city') setPosition([s.x, s.z]);
                  }}
                />
                <DriveableCar
                  state={parkCar}
                  debugId="park"
                  active={coreReady && walking && driving && activeCar === 'park' && !ride && !planOpen}
                  look={look}
                  controls={controls}
                  obstacles={solids}
                  groundHeight={districtGroundHeight}
                  onReport={(s) => {
                    setParkCarReport(s);
                    if (driving && activeCar === 'park') setPosition([s.x, s.z]);
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
                minDistance={walking ? 0.1 : wide ? 18000 : 35}
                maxDistance={walking ? 18 : wide ? 65000 : 1800}
                maxPolarAngle={Math.PI / 2 - 0.04}
                enablePan={!walking}
                enableRotate={!walking}
                enableZoom={!walking}
              />
              <SetupCamera
                walking={walking}
                controls={controls}
                wide={wide}
              />
              <Walker
                active={coreReady && walking && !driving && !ride && !planOpen}
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
      {walking && hauntStep && <Localized><div className="district-haunt-route" aria-live="polite">
        <strong>{hauntStep.house === 'haunt-manor' ? 'THE MANOR' : 'MIDNIGHT LABORATORY'}</strong>
        <span>{hauntStep.stage + 1} / 6 · {hauntStep.title}</span>
        {nextHauntDoor && <small>{nextHauntDoor.side === 'exit' ? '出口在前方' : `下一道门在${nextHauntDoor.side === 'right' ? '右' : '左'}侧`}
          {' · '}{Math.round(Math.hypot(nextHauntDoor.x - position[0], nextHauntDoor.z - position[1]))} 米</small>}
      </div></Localized>}
      {walking && !ride && !driving && (nearRide || nearCar) && <Localized><div className="district-ride-prompt">
        {nearRide ? <><strong>{nearRide.label}</strong><Button onClick={beginRide}>{nearRide.kind === 'tower' ? '按 E 登上跳楼机' : nearRide.kind === 'coaster' ? '按 E 登上过山车' : '按 E 乘坐游乐设施'}</Button></>
          : <><strong>{insideAmusementPark ? '园区车' : '汽车'}</strong><Button onClick={toggleCar}>按 E 上车驾驶</Button></>}
      </div></Localized>}
      {ride && <Localized><div className="district-ride-prompt" aria-live="polite">
        <strong>{PARK_RIDES.find((entry) => entry.id === ride.id)?.label}</strong>
        <small>乘坐中 · 结束后自动返回站台</small>
        <Button onClick={()=>leaveRide(ride.id)}>Exit ride · 随时下车</Button>
      </div></Localized>}
      {scare && <div className="district-haunt-scare" role="status" aria-live="assertive">
        <span className="district-haunt-eyes">◉　◉</span>
        <strong>{scare.cue}</strong>
      </div>}
      {walking && nearBasketballCourt(position[0], position[1]) && <div className="district-park-game">
        {!basketballOpen ? <Button onClick={() => setBasketballOpen(true)}>玩投篮挑战</Button> : <>
          <strong>投篮挑战 · {basketballMade} / {basketballAttempts}</strong>
          <label>出手角度 {basketballAngle}°
            <input type="range" min="36" max="65" value={basketballAngle}
              onChange={(event) => setBasketballAngle(Number(event.target.value))} />
          </label>
          <label>出手速度 {basketballSpeed.toFixed(1)} m/s
            <input type="range" min="15" max="25" step="0.1" value={basketballSpeed}
              onChange={(event) => setBasketballSpeed(Number(event.target.value))} />
          </label>
          <div><Button onClick={shootBasketball}>投篮</Button><Button onClick={() => setBasketballOpen(false)}>收起</Button></div>
          <small aria-live="polite">{basketballResult || '调节角度和力量，让球穿过篮圈。'}</small>
        </>}
      </div>}
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
        <Button onClick={()=>{setDriving(false);setActiveCar(null);setRide(null);setWalking(true);setWide(false);setRelocation({x:0,z:-68,y:0,nonce:Date.now()});(document.activeElement as HTMLElement)?.blur();}}>人物起点</Button>
        <Button onClick={()=>{car.current={x:6,z:-68,yaw:0,speed:0};setCarReport({...car.current});setRide(null);setActiveCar('city');setDriving(true);setWalking(true);setWide(false);setPosition([6,-68]);(document.activeElement as HTMLElement)?.blur();}}>车辆起点</Button>
        <Button onClick={() => setPlanOpen(true)}>城市平面图</Button>
        <Button onClick={() => teleportTo(
          AMUSEMENT_PARK.center.x + AMUSEMENT_PARK.entrance.x,
          AMUSEMENT_PARK.center.z + AMUSEMENT_PARK.entrance.z,
        )}>传送到游乐园</Button>
        {walking && insideAmusementPark && <>
          <Button onClick={() => teleportTo(AMUSEMENT_PARK.center.x + 245, AMUSEMENT_PARK.center.z - 280 + 84)}>古宅鬼屋入口</Button>
          <Button onClick={() => teleportTo(AMUSEMENT_PARK.center.x + 445, AMUSEMENT_PARK.center.z - 280 + 84)}>实验室鬼屋入口</Button>
        </>}
        <Button onClick={() => { setWide(true); setWalking(false); }}>全城总览</Button>
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
        onTeleport={(station: MetroStation) => {
          teleportTo(station.arrivalX, station.arrivalZ);
        }}
        onTeleportPoint={(x, z) => {
          teleportTo(x, z);
        }}
      />
      <Localized><div className="district-status" aria-live="polite">
        {ride
          ? `乘坐中 · ${PARK_RIDES.find((entry) => entry.id === ride.id)?.label ?? 'Ride'} · 结束后自动返回站台`
          : driving && walking
          ? `驾驶 · ${Math.abs(activeReport.speed * 3.6).toFixed(0)} km/h · WASD / 空格刹车 · E 下车`
          : walking
            ? `WASD 行走 · 空格跳跃 · 鼠标拖动看四周 · X ${position[0].toFixed(1)} m / Z ${position[1].toFixed(1)} m`
            : '拖动俯瞰 · 滚轮缩放 · 点击「控制小人」回到街道'}
        <small>
          {driving
            ? parkedGarageBay(activeReport)
              ? `已停入 ${parkedGarageBay(activeReport)!.id} · E 下车`
              : vehicleMessage
            : walking
              ? districtLocation(position[0], position[1])
              : '俯瞰不会改变角色位置 · 返回继续原地行走'}
        </small>
      </div></Localized>
      <PopulationPanel controller={population} selected={selectedResident} onSelect={setSelectedResident}
        collapseForPlay={walking && insideAmusementPark}/>
    </main>
  );
}
