# AmpliWorld

AmpliWorld is an experimental, inspectable environment for studying how events
may propagate through people, businesses and financial markets. Its playable 3D
city is a research interface and simulation testbed, **not evidence that its
synthetic inhabitants predict real people or that its signals make money**.

## Where the project stands

| Layer | Implemented | Not established |
|---|---|---|
| Playable city | Metre-scale city plan, selected detailed districts, locomotion, vehicles, venues and prototype attractions | Uniformly polished city, complete interiors, citywide physically routed daily lives |
| People and events | Persistent records for 30,000 synthetic residents; inspectable needs, stress, household interactions, memories and event inputs | A validated autonomous model of those residents, much less 8.3 billion independent minds; measured real-world response accuracy |
| Research pipeline | Deterministic event → cohort response → asset signal → portfolio proposal; reproducible example runs | A trained latent world model, learned transition dynamics, long-horizon planning or a demonstrated forecasting advantage |
| Quant evaluation | Directional accuracy, MAE, rank IC and a simple gross portfolio-return calculation | Untouched point-in-time out-of-sample results, net-of-cost P&L, capacity or institutional risk validation |

The upstream 8.3-billion-persona frame is a population concept, **not 8.3
billion agents running in this city**. The current financial behavior layer is
mostly hand-specified. A convincing animated world and a profitable, calibrated
world model are different achievements; the latter has not been demonstrated.

### Current quant implementation, without embellishment

- `src/ampliworld/portfolio.py` ranks eligible signals and proposes weights
  proportional to `abs(score) × liquidity`, caps each asset at `max_weight`,
  and sets stop loss / take profit to `1.25 × uncertainty` and
  `2.25 × uncertainty`. These are prototype heuristics, not an optimized
  portfolio with turnover, impact, neutralization or capacity controls.
- `src/ampliworld/calibration.py` updates only `return_scale` and
  `confidence_scale` (default learning rate: 10%) using realized magnitude and
  directional accuracy; it records MAE. This is scalar rescaling, **not**
  learned human behavior or probabilistic calibration of the world.
- `src/ampliworld/evaluation.py` reports directional accuracy, MAE, rank IC and
  gross simulated portfolio return. That last metric omits fees, spread,
  slippage, financing, borrow, market impact and execution feasibility.

### Evidence gates

Progress should be judged by reproducible evidence, not city size or agent
count. Four distinct kinds of evidence would materially change the assessment:

1. **World-model research:** specify state and latent representations,
   transition dynamics, objectives/planning, uncertainty and long-horizon
   evaluation; train and compare against strong baselines on held-out events.
   No such trained frontier model or published experimental result is claimed.
2. **Quant edge:** freeze as-of timestamps, universe membership and model
   versions; run walk-forward and purged validation with 2–3 years of genuinely
   untouched out-of-sample data where available. Report regime robustness,
   turnover, transaction costs, slippage, market impact, capacity,
   delisting/survivorship handling, factor exposures, multiple-testing controls,
   P&L attribution and drawdown decomposition. No such validated result is
   currently reported here.
3. **Economic outcome:** maintain a timestamped research ledger connecting
   hypotheses, failed experiments, releases, decisions and live or paper P&L
   attribution. Prototype returns or a single attractive Sharpe cannot prove a
   scalable, repeatable strategy; no verified live P&L claim is made.
4. **Organizational execution:** demonstrate a research team and operating
   process able to build data governance, model evaluation and production
   infrastructure. This is an organizational milestone, not a feature the
   repository can prove by itself.

The near-term priority is to meet **one or two** of these gates with auditable
artifacts: first a point-in-time research ledger and net-of-cost evaluation,
then a clearly specified and tested behavioral transition model. The 3D city
remains useful as an observable laboratory, but visual progress must not be
presented as empirical prediction progress.

The [world-model research protocol](docs/WORLD_MODEL_RESEARCH_PROTOCOL.md)
defines the individual/world/latent state split, transition and decision
models, uncertainty and long-horizon evaluation. The current rule-based
implementation is a baseline for those experiments, not their result.

## Development checkpoints

The dated notes below record construction slices; later checkpoints supersede
earlier limits. They are not independent validation of forecasting ability.

**Living-city and stock-input baseline — 23 September:** the current registry contains 30,000 persistent synthetic residents. Stress now interacts with physical needs, work, wages, meals, fruit, family support/conflict and held-stock gains/losses. A manual, source- and availability-timestamped multi-stock snapshot can be loaded into the world; residents scan available symbols and may trade or abstain. These decisions are transparent heuristics, not a trained world model or verified market edge. The older 3,000-person checkpoint below is historical.

**Aureole Adventure Park — 23 September:** the active 20 × 30 km city includes a 1.3 × 0.9 km amusement-park geometry prototype with five coaster designs, red/blue twin towers, family rides, two walk-through Halloween houses and a playable basketball challenge. Map teleport reaches the physical gate; nine rides have first-pass boarding and motion without queues. NPC visits, final art quality, audio and safety details remain unfinished. See `docs/AMUSEMENT_PARK_2026_09_22.md`.

**Eastwater marina / traffic pilot — 14 September:** original 150-berth waterfront asset with 100 static yachts and a three-storey hotel exterior at (6500,13200). Core crossing gains protected signal phases and a driveable-car stop-line pilot; resident travel and waiting time are recorded. Live driving and accelerated residents still require clock unification and citywide routing. MatrAIx software is MIT, but the HF Persona 1M data is research-only; no restricted personas were deployed. Current adapter fields remain AmpliWorld-authored. See `web/docs/traffic-marina-matraix-2026-09-14.md`.

**Unified residents — 17 September:** 3,000 persisted individuals now share one identity, street instance, family, personality and financial record. Existing resident IDs, savings, holdings, asset valuations and debt survive migration. There is no separate 30,000-person decorative registry; tens of thousands of CBD residents remains the scaling target. Each record has a simulated bank account and stable English display name. Housing ownership is assigned, and rent/mortgage cashflow now executes every 30 simulated days with explicit arrears; taxes, foreclosure and calibrated credit behavior remain pending. See `web/docs/residents-3000-checkpoint.md`.

**Mori Sushi garden — 14 September:** the original restaurant now occupies24×20m with its seven-seat counter retained,16 dining chairs and a separated modeled rear kitchen. A registered Japanese garden adds stone paths, planted borders, gate and lanterns, alongside12 parking bays and an independent vehicle approach. Entry/kitchen/garden/driveway collision checks and a background exterior screenshot passed. See `web/docs/mori-garden-2026-09-14.md`; kitchen equipment is visual, not yet an operating restaurant simulation.

**Enterprise observation lab — 14 September:** the existing high-detail city now opens as an observable social/economic laboratory; walking, driving and weather are retained. A first 100-household synthetic sample includes 16 occupation categories, food purchases/inventory, student study, service hours and inspectable resident memories. Fresh sample net-worth shares follow U.S. Fed DFA 2026 Q1 at an explicitly hypothetical $100m scale; income, occupations and behavioral decisions are not empirically calibrated. Existing saves are preserved. See `web/docs/observable-lab-2026-09-14.md` for sources, tested scope and unfinished features. This is a rules-based testbed, not yet an LLM-based human predictor.

**Mall circulation / four-level garage — 13 September:** the mall now has six structurally open retail levels, 108 furnished prototype shop rooms and a roof promenade. Four banks of four elevators have aligned cut-through shafts, moving cabs, landing doors and local call/destination controls. B1 combines 152 VIP spaces with a food/activity zone; B2–B4 each have 216 spaces, totaling 800 with four color zones per level. The former outdoor customer lot is a loading/equipment yard. Off-centre driving, layered floors and underground cameras were corrected. See `docs/CHECKPOINT_2026_09_13_MALL_CIRCULATION.md` for tested scope and remaining visual/gameplay work; this supersedes the historical one-level garage and closed upper-floor descriptions below.

**Housing completion pass:** road support now matches visible paving; sidewalks and entrance walks are registered. Fold-away gates keep collision and refuse to close through a player or car. Loading/error silhouettes prevent temporary missing houses, and visual streaming follows the inspection camera while physics stays player-centred. See `docs/CHECKPOINT_2026_09_13_HOUSING_POLISH.md` for verification and deferred interiors/services.

**Housing replan — 13 September:** the obsolete mass residential generator is retired. The active plan now has exactly 25 older six-storey compounds, 15 lower-middle compounds (including retained Qingting), five garden apartment estates, two 4 m-floor-height tower estates, two mixed villa compounds and two edge detached estates, plus the retained 60 river villas. Original GLB kits, supermarkets, management/guard lodges, clubhouses, courtyard planting, walls and 11 playable access gates are registered. Quarter alignments and access lanes are offset; the regional arterial grid is still retained. This supersedes the historical 1,300-compound plan below. See `docs/CHECKPOINT_2026_09_13_HOUSING.md`.

**Metropolitan triangle and widened river:** the hydraulic river is now 600 m wide, preserving the villa-side west bank and adapting all 28 bridges. East and South subcenters add six original towers around connected plazas, forming a three-center triangle with the retained main CBD. Dry river/estuary banks and the centers are premium planning zones, not priced real estate. Two estuary-end gardens frame the retained waterfall. Eight unnamed placeholder compounds were archived/replaced; all named sites and 75 detailed homes remain. See `docs/CHECKPOINT_2026_09_13_METROPOLITAN.md`.

**Two new residential communities:** 15 mid-market apartment buildings at Qingting Garden and 60 detached urban-river villas at Lan'an River Estates extend the metric world without replacing existing sites. Seven original instanced GLB prototypes add true balconies and differentiated massing; the middle-income homes have directly walkable ground lobbies. Perimeter/gates, local roads and map previews are registered. The mall/CBD stays the highest-value core. Private home interiors and property gameplay remain future work. See `docs/CHECKPOINT_2026_09_13_COMMUNITIES.md`.

**Completion pass — interiors and safety:** Aureline's guarded 24-step stair now reaches its 5.4 m upper gallery using height-aware floor selection. Garage wheel stops, ceiling services and portal lintel have real collision volumes; low stops contact tyres rather than invisible bumper-sized boxes. Leaving a car validates the full side-exit path and floor continuity, and the actual interpolated car camera is rechecked against obstacles. See `docs/CHECKPOINT_2026_09_13_COMPLETION.md` for the verified scope and remaining work.

**Driving look and B1 garage:** driving now accepts mouse drag, two-finger scrolling and R/F look controls independently of steering. The mall's existing open ramp connects west into a real B1 garage with 176 marked bays, 24 original sedan/SUV/coupe/van display vehicles, structural columns, ceiling services and local lighting. A stopped, aligned car in an empty bay receives its bay identifier. Vehicle floor state is retained below ground; only registered garage/ramp areas bypass the water-depth restriction. See `docs/CHECKPOINT_2026_09_13_GARAGE.md`.

**Automotive campus and physical interiors:** Aureline automotive centre is registered about 1 km from the mall on the west sports boulevard. Original concrete/steel/glass geometry, a full-scale open showroom and exterior parking extend the same world rather than substituting a new backdrop. Restaurant walls, glazing, furniture and projecting roof clearance have explicit collision tests. Skyline bridges now use slimmer faceted shells, trusses, bearings and luminous soffits. See `docs/INTERIOR_SCALE_CONTRACT.md` for the metre-scale, continuous-entry rule and the still-future large-interior streaming boundary.

**Camera, city plan and asset-quality update:** sky gaze is now independent of the collision-safe third-person camera boom (drag/two-finger scroll, R/F and visible look buttons). A zoomable, pannable, non-teleporting city plan reads actual road, river, bridge and compound registries; parcel selection exposes gates and unfinished functions. The playable car is the original 5 m Aureline luxury fastback with articulated wheels. Core streets now instance 184 branching, volumetric trees, with lower district environment fill to retain shading. Regional coarse trees and the outer-city masterplan still need refinement. See `docs/CHECKPOINT_2026_09_13_PLAN_CAMERA.md`.

**Sports district and street dining:** the playable core now extends south into an original open-roof football stadium (105 × 68 m marked pitch, dimensional goals/nets, sectional seating) and connected sports streets with 44 surface parking bays. Mori Sushi is an enterable timber-front restaurant on the east high street, with lanterns, counter, seating and geometric food. Four core-to-global road seams are connected; landmark camera views never teleport the player. World bounds remain 20 × 30 km: this expands developed content rather than adding empty terrain. See `docs/CHECKPOINT_2026_09_13_SPORTS.md` for verified scope and remaining work.

**Current city masterplan (20 × 30 km):** the detailed mall/CBD core is preserved inside a newly generated metric-space city base. 485 loadable tiles contain 1,300 residential compounds/civic campuses and 7,800 parameter-varied building exteriors. A continuous river, 28 raised bridges, estuary waterfall, sea edge and hierarchical road corridors are now modeled. “全城总览” shows the full plan without moving the player. This is a procedural exterior/masterplan milestone, not 600 km² of individually polished architecture: garages, most interiors, district-specific refinement and some core-to-outer road junctions remain unfinished. See `docs/CHECKPOINT_2026_09_13_CITY2030.md`.

The following dated stages describe the retained detailed core; their smaller ground envelopes are historical, superseded by the city masterplan above.

**Current skyline and driving:** supersedes the previous twisting/needle towers with an open cantilever composition (500 m), asymmetric bridged twins (350 m), and an oval-crowned tower (420 m). Centres are now (−310,−490), (310,−490), (0,−900) metres, preserving the mall/residences. Three sunken gardens at −4.2 m connect through a real underground concourse to the mall B1 arrival entrance. A CC0 Kenney prototype sedan supports nearby boarding, WASD driving, braking, obstacle stops and safe disembarking. New checkpoint: `docs/CHECKPOINT_2026_09_12_CBD_DRIVING.md`. Ground envelope is 1,200 × 2,200 m; undeveloped land is not finished city content.

**CBD skyline update:** three original full-geometry office towers now extend the new world behind the mall: Aurelia Helix / 曜旋中心 (500 m), Prism Gate / 棱境中心 (350 m), Celestial Spire / 星穹中心 (420 m). Each has a reusable GLB, a 96 × 96 m pedestrian plaza, sealed entrance podium, compound camera/player colliders and fixed metric coordinates. Connected CBD boulevards include cycle lanes and sidewalks. The ground envelope is now 880 × 1,560 m, not a claim of a fully developed city. Normal viewing retains full detail without distance-triggered tower removal. See `docs/CHECKPOINT_2026_09_12_CBD.md`.

**Latest cleanup:** metric-height clouds now stay above the city, overview no longer resets the player, ramp approach geometry is continuous, and parking walkway support matches its surface. See `docs/CHECKPOINT_2026_09_12_WORLD_POLISH.md`. Upper-floor retail, full garage interiors and trading/life integration remain pending.

**Mall campus update:** the main world now uses `GC-MALL-002`, a six-storey 225 × 180 m mall (6.25× the previous main footprint), walkable ground-floor galleries on both sides of the garden passage, 48 outdoor parking bays and a descending B1 entry ramp/vestibule. Complete underground parking and upper-floor retail remain deferred. See `docs/CHECKPOINT_2026_09_12_MALL_CAMPUS.md`.

**Current world entry:** `/` opens the metric-space street world directly; `/district` is a compatible link to the same `DistrictClient`. The unmounted compressed-city `GameShell` and its misleading live-asset catalog were removed on 2026-09-22. All future city construction extends `web/app/district/view.tsx` and `web/app/world-client/`; reusable economy services and saved data remain for explicit integration, but the old scene is not a second development target.

The original smaller `GC-MALL-001` asset remains archived in the library; the active world uses its larger successor `GC-MALL-002` above. See `docs/CHECKPOINT_2026_09_12_MALL.md` for that historical construction stage.

AmpliWorld is an open research prototype for event-driven market simulation.
Its current pipeline injects a structured event into a sampled synthetic
population, computes rule-based consumer and investor responses, maps these to
listed assets, and produces a heuristic portfolio proposal. This does not yet
constitute a validated predictive world model.

The project uses [MatrAIx Persona 8B](https://github.com/MatrAIx-ai/MatrAIx-Persona-8B)
as an upstream population foundation. Persona 8B describes 8.3 billion persona
records across 1,290 categorical dimensions. AmpliWorld runs tractable,
weighted cohorts rather than one LLM process per person.

## Intended core loop

1. Ingest news, filings, search interest, sentiment, footfall and spending proxies.
2. Select the population cohorts and market participants exposed to the event.
3. Simulate base, amplification and disconfirmation scenarios.
4. Aggregate demand, belief, order intent, flows and volatility.
5. Rank assets and construct weights subject to liquidity, concentration and
   risk constraints; the current implementation uses the simpler rule above.
6. Compare predictions with realized behavior and recalibrate; currently this
   adjusts two scalars, not agent behavior or transition dynamics.

AmpliWorld treats this loop as a persistent game rather than a stateless batch
prediction. The world advances one turn per day. Prior events decay instead of
disappearing, duplicate stories are ignored, and the next simulation begins from
the political, geopolitical, consumer and market pressures left by earlier turns.

## Repository status

The upstream simulation framework is available under `vendor/MatrAIx-Persona-8B`
as a Git submodule. AmpliWorld's financial behavior layer, market arena, signal
engine and evaluation suite live in this repository.

## Upstream setup

```bash
git submodule update --init --recursive
```

The repository includes the upstream 200-person development sample. The public
Persona 1M dataset is excluded from Git history; download it locally with:

```bash
./scripts/download_persona_1m.sh
```

## Run the research prototype

The first working vertical slice uses deterministic cohort behavior so that the
entire decision path is inspectable and testable. It does not claim that the
synthetic population is already a calibrated market forecast.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e .
ampliworld run examples/events/ev_demand_shock.json --output runs/demo.json
ampliworld evaluate runs/demo.json examples/realized_returns.json
ampliworld calibrate runs/demo.json examples/realized_returns.json
ampliworld day examples/events/world_day_001.json --output runs/world-day-001.json
ampliworld world-news --limit-per-domain 5 --output runs/world-news.json
```

Each run records the source event, weighted population, scenario probabilities,
asset-level evidence, expected return, uncertainty, confidence, portfolio weight,
stop, take-profit and thesis invalidation condition.
After returns become observable, `calibrate` updates a local state file. Future
`run` calls load that state to rescale expected returns and confidence. This is
the first daily learning loop; richer cohort-level calibration remains planned.

The `day` command accepts a bundle of world events—not only finance. Its initial
ontology covers war and security, politics and policy, credit, currencies, food
and dining, travel, fashion and luxury, electronics, energy and commodities,
health, technology, and climate or disasters. Events update persistent domain
and sector pressures in `data/cache/world_memory.json`; that memory is then
translated into the day's investable world state.

`world-news` searches all twelve initial domains and preserves each headline's
source, timestamp, URL and originating query. This is an evidence collector, not
yet a production-grade event parser: sentiment, surprise, entity resolution and
point-in-time validation must be supplied or modeled before a headline enters a
trading simulation.

## What is real today

- Public Persona 8B source and the 200-person development sample are vendored as
  a pinned submodule.
- The official Persona 1M sample can be downloaded into ignored local storage.
- A reproducible event-to-portfolio pipeline and outcome evaluator run locally.
- Google News RSS can be collected as evidence with `ampliworld news`.

The next research layer is empirical calibration: replace hand-initialized
behavioral priors with measured consumer, attention and market outcomes; enforce
point-in-time data; then evaluate walk-forward performance including costs.

## Retained gameplay systems (legacy scene retired)

The prior `web` prototype implemented a persistent third-person
virtual city. A player started with $10,000 in virtual cash, read the current
world event, trades a paper market with 1×–5× exposure, and converts progress
into lifestyle goods and property. Account-level cross-margin clearing,
idempotent actions, city taxes, limited bankruptcy relief, gated districts,
representative NPCs and persistent world turns were implemented in the retired
client. Backend services and Git history remain, but these are **not yet all
integrated in the current city UI**. None connects to real-money brokerage execution.

The browser does not attempt to render 8.3 billion autonomous processes. It
uses a hierarchical simulation: the Persona 8B population frame informs
weighted cohorts, a smaller active agent layer carries memory and decisions,
and a representative visible population makes the world legible to the player.

The prototype includes CC0 3D assets from
[Kenney](https://kenney.nl/) and [Quaternius](https://quaternius.com/). Original
license files, official source URLs and package hashes are retained under
`web/public/assets/3d/vendor/`.

## City architecture: develop the new world only

Our target remains a playable city—not an architectural gallery. The user retired
the old visual world on 2026-09-12. The homepage now renders the metric-space
street directly, with no old-city navigation. Retain useful trading, jobs, housing,
wellbeing, social and save logic as services/Git history for explicit migration;
do not restore the legacy scene as a fallback. Existing geographic and building
design intentions remain requirements for the new world, not old meshes to reuse.

| Inspiration | AmpliWorld architectural decision | Actual state |
|---|---|---|
| GTA-style city structure | A connected metric road/civic/transit graph with stable building and entrance IDs | Legacy world registries exist; new 2×2 km plan and first connected street prototype are separate |
| Genshin-style world presentation | Nearby detailed assets, distant silhouettes/HLOD, streamed cells and a floating origin | Three residence LOD assets exist; full streaming/HLOD/floating origin are still planned |
| Sims-style individual lives | Stable identities, needs, relationships, memory and selective simulation activation | Cohort research and representative NPC/gameplay systems exist; full city-scale individual minds remain planned |

These are design inspirations, not claims to have copied proprietary game-engine
implementations. New geometry uses **one unit = one metre**, +Y up and +Z north.
The 64 planning parcels are **250 m** wide; they are not automatically the future
256 m streaming tiles. Never enlarge the compressed legacy city to fake scale.

### Languages, assets and backend boundaries

- **TypeScript / React / R3F:** the current lightweight playable web client, UI,
  development views and typed world registry. It is not the final high-fidelity engine commitment.
- **Python:** event/cohort research, market simulation and calibration. The authoritative
  game-action API continues to protect economy and persistence independently of scene meshes.
- **GLB assets plus semantic manifests:** actual geometry, materials, IDs, dimensions,
  LODs, colliders, entrance anchors and provenance. Roads, trees, lamps and boats follow
  the same production rule as buildings; a photograph is not a substitute for geometry.
- **Engine adapters:** a Blender/Houdini production workflow and UE5 client/Pixel Streaming
  track are planned, not installed or integrated here. Engine-native gameplay, importer
  validation, GPU concurrency and server operating cost still require a tested prototype.

Epic documents [World Partition](https://dev.epicgames.com/documentation/unreal-engine/world-partition-in-unreal-engine)
and [HLOD](https://dev.epicgames.com/documentation/unreal-engine/world-partition---hierarchical-level-of-detail-in-unreal-engine)
as relevant spatial-loading tools. [Pixel Streaming](https://dev.epicgames.com/documentation/unreal-engine/overview-of-pixel-streaming-in-unreal-engine)
is a remote rendering/delivery option, not an automatic multiplayer or persistence solution.
[glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) transports asset data;
our gameplay behavior and ownership remain in the application schema.

### Existing atmosphere is retained

`web/app/dynamic-atmosphere.tsx` is reused in the metric city independently of the retired client.
It supplies sky, clouds, stars, sun/moon, lighting and fog. Preserve its 55-real-minute
cycle: dawn 10 min, daytime 20 min, dusk 10 min, night 15 min. This is not yet a
complete weather simulation: persistent rain/snow/storm states are not implemented.
New metric-space scenes must adapt fog/shadow ranges; floating-origin lighting is pending.

### Current construction slices and next gates

- `/architecture`: one original 32×24 m residence with 84 genuine geometric balconies,
  four complete facades, roof, three LODs, and an exterior walk test.
- `/` and `/district`: the same 220×360 m block envelope, four instances of that residence,
  crossed roads, cycle lanes, sidewalks, street furniture, a schematic metro pavilion,
  six-storey courtyard mall, shared character control and retained day/night sky. **Four instances are not four
  architectural types.** The metro is not yet operational; interiors and trading UI
  adapters remain pending in this upgraded block.
- Both new views now use full-detail residence geometry throughout their current
  playable/inspection range. The three exported LODs remain asset-library variants,
  not compulsory near/mid/far switches. Future large-city distant simplification
  must be selected by measured screen coverage and performance, with stable transitions.
- Shared metre-space locomotion lives in `web/app/world-client/`: camera-relative
  eight-direction input, smooth turn-to-travel (including S facing the camera),
  displacement-driven limb animation and release-gated Space jumping. This is a
  prototype character controller, not a full physics-engine or animation-rig integration.
- Next: distinct residential types, a functional entrance/interior contract,
  transit/economy connection, automatic LOD selection and streaming, then block-by-block
  expansion inside the 2×2 km quality core. No completed 2×2 km city is claimed.

The retained geography, income-tier housing, villas, civic campuses, marinas and
city references are specified in [the design continuity brief](docs/GOLDEN_CITY_DESIGN_CONTINUITY.md).
Per-block status is tracked in [the five-minute workplan](docs/AMPLIWORLD_5_MINUTE_WORKPLAN.md).
Imported assets must retain source/licence records; publicly viewable real-estate
photographs are references, not automatically redistributable textures.

## Research principles

- Simulation produces hypotheses, not ground truth.
- Every portfolio decision must retain its event, cohort and scenario lineage.
- Probability calibration matters before profit attribution.
- Future backtests must include transaction costs and reject look-ahead data;
  the current evaluator does neither.
- Live execution remains separated from the open research environment.

## Organization

AmpliWorld is developed by AmpliAlpha, Inc.
