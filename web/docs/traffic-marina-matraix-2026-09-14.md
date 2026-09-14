# Traffic, marina and persona integration checkpoint

Implemented: original 150-berth marina at (6500,13200), 100 static 14/18/22m yacht models, three-storey hotel exterior with 72 balcony bays, walkable decks and interpolated gangway. No hotel interiors or sailing yet. Existing city assets retained. An observer camera button locates the marina, not a player teleport.

Core traffic pilot: north-south and east-west green/amber/all-red sequence plus exclusive pedestrian phase, one crossing and four signal poles. The driveable car stops at the central approach stop lines. Resident route movement accounts for crossing waits and cumulative travel time at 1.25 m/s. This is NOT citywide autonomous traffic. The live driving pilot uses wall seconds; accelerated resident simulation uses simulation seconds with the same phase policy. These clocks are not yet unified; visual pedestrian interpolation, queueing, intersection occupancy and realistic commute calibration remain pending.

MatrAIx: upstream code already exists under vendor/MatrAIx-Persona-8B at revision 3633d8dab149a9482a71b024418a49ae828cc941 (MIT code). Official HF Persona 1M README separately restricts all data/subsets/derivatives to non-commercial research. No HF records were integrated, republished or passed off as our residents. Current consumer-persona fields are AmpliWorld-authored compatibility scaffolding, not the upstream runtime or trained minds. Personal-care preference is independent of appearance and is not yet a purchasing policy.

Sources:
- https://github.com/MatrAIx-ai/MatrAIx-Persona-8B/blob/3633d8dab149a9482a71b024418a49ae828cc941/LICENSE
- https://huggingface.co/datasets/MatrAIx2026/MatrAIx_Persona_1M/blob/8b1073ab23d0c0ba0928386a041bac55e5365ddc/README.md

Next: rights-cleared population sources, approved adapter mappings and real runtime invocation; shared live/accelerated simulation clock; registered intersection geometry, autonomous vehicles, safe pedestrian queues; marina road and hotel operation integration. Do not interpret this slice as completion of the full request.
