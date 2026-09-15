# Mall arrival and vertical circulation

The arrival facade now has a limestone entrance frame, bronze soffit, warm emissive
panels, display windows and planted seating. Deterministic stone/timber textures are
embedded in the GLB with metric UVs; they are not Blender-only procedural shaders.
Inspection image: `asset-library/blender/cbd/GC-MALL-002-arrival.png`.

Five paired escalators link L1–L6 in the east gallery. Exported steps and glass rails
share the same dimensions as the walker's continuous support and automatic 0.65m/s
transport. Upper floor slabs contain actual openings. Existing 16 lifts still serve
11 stops each. Escalator tread meshes are currently static; the passenger transport
works, but circulating tread/handrail animation remains for a later pass.

Checked all ten escalator directions, continuous ground support and full-body collider
clearance along the route; existing mall/elevator checks and TypeScript also pass.
Blender render is an asset inspection, not a measured in-browser performance result.
The visual target still needs richer landscape, less repetitive massing and lighting.
