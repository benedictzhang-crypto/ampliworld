# CBD Blender checkpoint

Blender 4.5.3 LTS installed at `/Applications/Blender.app`. Background processing only.

Completed: physical mall facade ribbons, deep glazing piers, open 16m entrance,
glass/metal canopies, forecourt seating/planters and paving joints. Three restaurant
variants now have furnished terraces, menu cases, table settings and kitchen equipment.
All four GLBs have an editable `.blend` source and a rendered inspection image under
`asset-library/blender/cbd`. Blender applies small edge bevels, preserving the authored
collision envelopes. Rebuild the procedural GLBs before rerunning the Blender finishing
script; do not repeatedly bevel an already finished export.

Traffic: removed the extra central crossing overlay; retained four existing street-asset
crossings and stop lines. Four elevated signal heads face their corresponding incoming
lanes and use the existing shared traffic phase; signal poles have collision. This is
still the core pilot intersection, not a claim of citywide signal coordination.

Validation: TypeScript, mall circulation (16 lifts, 176 routes, 108 shops, 800 parking
bays), civic entrances and traffic signal checks. Blender inspection renders reviewed.
The old `check-mall-campus.mjs` targets a retired 48-space mall layout and is not the
current acceptance suite. No Safari/gameplay visual inspection this round.

Remaining: broader CBD landscape design, less rectangular mall massing, polished roof
garden, more restaurant frontage variety, and signals at the remaining intersections.
This is a first asset-detail pass, not the final visual-quality target.
