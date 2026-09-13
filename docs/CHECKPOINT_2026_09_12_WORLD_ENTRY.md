# New world is the only player-facing world

User direction: retire the old city; develop AmpliWorld on the new street architecture.

- `/` renders DistrictClient and its stylesheet directly. `/district` remains compatible and renders the same world, not another scene.
- Removed old-city navigation from the street. The architecture inspection page returns to the new city homepage.
- No route imports or mounts GameShell. Legacy source stays at its original paths as retired reference code; it is not a playable fallback.
- No saved data, account records, economy API, upstream population research, or design-reference requirements were deleted.
- Existing trading/life UI is currently unavailable in the new world. Reintroduce those capabilities through the new architecture in later explicit work, rather than reopening the old scene.

This decision supersedes older checkpoints asking to keep an old-city route accessible. Continue constructing metric-space assets and connected streets only.
