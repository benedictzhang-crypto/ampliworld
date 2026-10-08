# Mall retail and refit pilot — 8 October 2026

## What changed

The 26 tenant rooms introduced in the recent mall expansion now export individual Blender/GLB assets plus a shared floor/roof/services asset. Material batches are namespaced by a stable physical unit ID, not the changeable store sign. Existing structure, doors and colliders remain unchanged when a supported unit changes name, finish or merchandise assortment. The combined GLB is retained as an authoring/reference artifact; the client loads the modular files.

The new architectural layer supplies ceiling fields, actual spotlight housings, portal reveals, coves, wall bases, entry plants and window presentation plinths. Six pilot stores also have replacement-capable signs and original virtual merchandise: Chanel tailoring, Balenciaga, Dior, Hermès, Loewe and the shoe salon. Brand signs are illustrative; the products and prices in this pilot are fictional AmpliWorld items, not official brand merchandise.

## Playable loop

Open **Shopping & wardrobe**, select a physical shop and **Visit entrance**. Buy at its level/location, then equip owned items in **Wardrobe**. Tops, trousers and shoes change the walking avatar's materials; jackets add lapels/buttons, shoes gain trim, and bags/caps add geometry. Clicking a window product also opens its shop catalogue. There is no cloth simulation, body-size fitting or complete avatar replacement yet.

The exploration wallet starts at $10,000 virtual currency. Purchase logic checks proximity including elevation, availability, ownership and balance; repeated clicks do not charge twice. A receipt owns a SKU independently of its current shop. A store renovation never deletes purchased clothes. Eleven original SKUs cover five wearable slots and three curated assortments. Purchase UI, catalog and window merchandise consume the same SKU data.

## Refit capability and limits

**Renovation studio** offers one pilot unit at a time: change its tenant name, choose tailored/weekend/travel inventory, and select original/ivory/noir/sage finishes. Changes update its 3D sign, merchandise and material instances, not neighbouring units. Restore original resets only that unit; receipts/outfit survive. Each apply increments a local revision.

This is a compatible-assortment/material replacement, **not** arbitrary relocation of walls or converting a clothing shop into a restaurant. Future construction revisions must provide a new independently exported asset, update colliders and service connections together, and pass the geometry tests. Legacy central boutiques outside these 26 units still need migration. The mall is not construction-complete or photoreal.

## Ownership, persistence and safety boundary

The wallet, receipts, outfit and overrides are stored in browser local storage under a versioned key. They do not debit population/resident accounts, call payments or sync to a shared server. This is a single-browser exploration sandbox; it is not tamper-proof, cross-device authoritative or a production commerce system. Clearing browser storage removes this progress. Validation filters malformed saves, unknown products and unowned equipment. Cloud saves, transaction idempotency across devices, sizes, consumables, delivery and NPC staffing are future work.

## Modules and verification

- `mall-tenants-plan.json`: physical lease slots and original tenant identity.
- Blender `build-mall-tenant-upgrade.py` + `mall-fitout-detail.py`: independently exported models and detail layer.
- `mall-retail-catalog.ts`: prices (integer cents), SKU shapes/colors, wearable slots and assortments.
- `mall-retail-state.ts`: pure, testable transactions and migration/validation.
- `use-mall-retail.ts`: browser persistence adapter.
- `mall-retail-panel.tsx`: shop, wardrobe and renovation UI.
- `retail-products.tsx`: on-shelf and worn accessory geometry.
- `mall-tenants.tsx`: unit-scoped materials, replaceable signage and merchandise.

Run `node --import tsx scripts/check-mall-retail.mjs` for purchase/refit/save invariants and `check-mall-tenants.mjs` for physical entries, independent asset paths and per-unit geometry budgets. Existing circulation/sports tests remain regression gates. Browser QA must additionally verify a real purchase, changed appearance, renovation and persistence after reload; code tests alone are not visual proof.
