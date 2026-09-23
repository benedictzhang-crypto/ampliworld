"""Build an instancing-friendly, enterable 16 x 12 m street shop in Blender.

The exported mesh is authored in metres at the origin. Site coordinates and
collision envelopes live in city-service-plan.ts/city-service-buildings.tsx.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT / 'public/assets/3d/ampliworld/GC-STREET-SERVICE-KIT-001'
SOURCE = ROOT / 'asset-library/blender/services'
ASSET.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0

def material(name, color, metallic=0, roughness=.65, transmission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Transmission Weight'].default_value = transmission
    return m

stone = material('warm limestone', (.63, .59, .51), roughness=.82)
ivory = material('ivory concrete', (.82, .80, .73), roughness=.7)
glass = material('deep teal glazing', (.15, .26, .29), metallic=.12, roughness=.16)
bronze = material('brushed bronze', (.39, .27, .15), metallic=.7, roughness=.3)
timber = material('warm timber', (.43, .28, .16), roughness=.52)
interior = material('interior plaster', (.87, .83, .75), roughness=.8)
green = material('planter green', (.18, .31, .20), roughness=.9)
dark = material('signage field', (.08, .12, .12), roughness=.42)

def blender_point(x, y, z):
    # Authoring coordinates use the game's Y-up convention. Blender is Z-up;
    # its glTF exporter maps (x, -z, y) back to game-space (x, y, z).
    return (x, -z, y)

def cube(name, center, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=blender_point(*center))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('machined architectural edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('weighted normals', 'WEIGHTED_NORMAL')
    return obj

# Real volumetric shell: no front wall across the doorway. The interior stays
# visible from the street and is navigable once the matching wall colliders load.
cube('terrazzo floor', (0, .13, 0), (16, .26, 12), stone, .09)
cube('rear masonry', (0, 3.1, -5.85), (16, 6.2, .3), ivory, .09)
for side in (-1, 1):
    cube(f'side wall {side}', (side * 7.85, 3.1, 0), (.3, 6.2, 11.9), ivory, .08)
    cube(f'corner pier {side}', (side * 7.45, 2.7, 5.88), (.85, 5.4, .55), stone, .08)
    cube(f'entry pier {side}', (side * 1.65, 2.3, 5.9), (.35, 4.6, .45), bronze, .05)
    cube(f'side glazing {side}', (side * 4.5, 2.2, 5.94), (5.6, 3.65, .12), glass, .015)
    door = cube(f'open glass leaf {side}', (side * 1.3, 1.9, 5.15), (1.31, 3.3, .1), glass, .015)
    door.rotation_euler.z = side * .9
    cube(f'entry pull {side}', (side * 1.02, 1.8, 5.44), (.055, .72, .09), bronze, .025)
    cube(f'limestone planter {side}', (side * 6.25, .48, 7.5), (2.2, .96, 1.15), stone, .12)
    cube(f'planter soil {side}', (side * 6.25, .96, 7.5), (1.9, .08, .85), dark)
    for branch in range(3):
        x = side * (5.65 + branch * .55)
        cube(f'foliage trunk {side} {branch}', (x, 1.3, 7.5), (.08, .7, .08), green)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.45, location=blender_point(x, 1.75, 7.5))
        bpy.context.object.name = f'pruned foliage {side} {branch}'
        bpy.context.object.data.materials.append(green)

cube('front canopy with softened corners', (0, 4.75, 6.58), (17.2, .42, 3.4), ivory, .33)
cube('bronze canopy fascia', (0, 4.56, 8.1), (15.2, .12, .14), bronze, .04)
cube('upper sign field', (0, 5.49, 6.09), (13.7, .72, .16), dark, .07)
cube('upper sign reveal', (0, 5.1, 6.2), (13.9, .08, .2), bronze, .02)
for x in (-6.95, -4.65, -2.35, 2.35, 4.65, 6.95):
    cube(f'brise soleil {x}', (x, 2.35, 6.12), (.15, 4.55, .5), bronze, .045)
for y in (.45, 3.98):
    cube(f'glazing rail {y}', (0, y, 6.06), (14.5, .08, .22), bronze, .02)

# Raised parapet and a set-back planted roof make the model complete from the
# game's overhead camera, without adding a dummy billboard façade.
cube('sculpted roof slab', (0, 6.08, -.1), (16.8, .5, 12.8), ivory, .48)
for side in (-1, 1):
    cube(f'roof garden bed {side}', (side * 5.65, 6.53, -2.6), (3.5, .48, 2.6), stone, .12)
    for ix in range(3):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.58,
            location=blender_point(side * (4.7 + ix * .8), 7.05, -2.6))
        bpy.context.object.name = f'roof shrub {side} {ix}'
        bpy.context.object.data.materials.append(green)

# Furnished visible lobby: counters, display shelves and a rear service door.
cube('interior service counter', (0, 1.05, -.1), (7.8, 1.35, 1.15), timber, .15)
cube('counter top', (0, 1.77, -.1), (8.15, .13, 1.4), stone, .06)
for x in (-5.4, 5.4):
    cube(f'interior display case {x}', (x, 1.25, -3.1), (1.7, 2.5, 2.9), timber, .08)
    for y in (.6, 1.4, 2.2):
        cube(f'interior shelf {x} {y}', (x, y, -1.6), (1.6, .08, .35), bronze, .02)
cube('rear staff door', (0, 1.55, -5.66), (1.6, 3.1, .06), timber, .05)

# Group objects by material for a handful of GPU-instanced draw calls.
for mat in (stone, ivory, glass, bronze, timber, interior, green, dark):
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.data.materials and o.data.materials[0] == mat]
    if not objects:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = f'Instanced {mat.name}'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

glb = ASSET / 'model.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_apply=True)
manifest = {
    'id': 'GC-STREET-SERVICE-KIT-001', 'units': 'meters', 'file': 'model.glb',
    'bounds': {'min': [-8.6, 0, -6.5], 'max': [8.6, 7.7, 8.3]},
    'placementEnvelope': {'halfWidth': 18, 'back': 13, 'front': 31},
    'source': 'asset-library/blender/services/street-service-kit.blend',
    'bytes': glb.stat().st_size,
    'triangles': sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type == 'MESH' for p in o.data.polygons),
}
(ASSET / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'street-service-kit.blend'), compress=True)

world = bpy.data.worlds.new('blue hour inspection')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.43, .55, .65, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .7
bpy.context.scene.world = world
bpy.ops.object.light_add(type='AREA', location=(5, -4, 15))
bpy.context.object.data.energy = 3800
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 8
bpy.ops.object.camera_add(location=(18, -20, 13))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, -3, 2.5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 31
bpy.context.scene.camera = camera
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 24
bpy.context.scene.cycles.use_denoising = True
bpy.context.scene.render.resolution_x = 1280
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.render.filepath = str(SOURCE / 'street-service-kit-preview.png')
bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
print('STREET_SERVICE_KIT', manifest['triangles'], manifest['bytes'], flush=True)
