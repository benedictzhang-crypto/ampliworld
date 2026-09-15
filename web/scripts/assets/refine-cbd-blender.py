"""Background Blender finishing pass. Source GLBs and their collision manifests stay paired.
Run after build-mall-campus.mjs and build-hospitality.mjs with Blender --background --python.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/assets/3d/ampliworld'
EDITABLE = ROOT / 'asset-library/blender/cbd'
EDITABLE.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
jobs = [('GC-MALL-002', 'mall-lod0.glb', 'mall-manifest.json')]
jobs += [(f'GC-RESTAURANT-00{i}', 'model.glb', 'manifest.json') for i in range(1, 4)]
for asset_id, filename, manifest_name in jobs:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    folder = ASSETS / asset_id
    bpy.ops.import_scene.gltf(filepath=str(folder / filename))
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        # Small physical chamfers catch light on frames, furniture and stonework.
        names = ' '.join(m.name.lower() for m in obj.data.materials if m)
        if any(k in names for k in ['gold', 'bronze', 'wood', 'teak', 'stone', 'ivory']):
            mod = obj.modifiers.new('Architectural edge highlight', 'BEVEL')
            mod.width = .025 if 'MALL' in asset_id else .015
            mod.segments = 2
            mod.limit_method = 'ANGLE'
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new('CBD daylight')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.52, .65, .8, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .45
    # Export only the asset, excluding the inspection camera/light.
    bpy.ops.export_scene.gltf(filepath=str(folder / filename), export_format='GLB', export_apply=True)
    manifest = json.loads((folder / manifest_name).read_text())
    manifest['bytes'] = (folder / filename).stat().st_size
    deps = bpy.context.evaluated_depsgraph_get()
    manifest['triangles'] = sum(sum(len(p.vertices)-2 for p in o.evaluated_get(deps).data.polygons)
                                for o in scene.objects if o.type == 'MESH')
    manifest['finishing'] = {'tool': 'Blender 4.5.3', 'editable': f'asset-library/blender/cbd/{asset_id}.blend', 'bevelMeters': .025 if 'MALL' in asset_id else .015}
    (folder / manifest_name).write_text(json.dumps(manifest, indent=2)+'\n')
    big = 'MALL' in asset_id
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 100))
    bpy.context.object.rotation_euler = (.45, -.5, -.4)
    bpy.context.object.data.energy = 2.4
    bpy.ops.object.camera_add(location=(300,-400,240) if big else (24,-32,20))
    camera = bpy.context.object
    target = Vector((0, 0, 10 if big else 1.6))
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 350 if big else 32
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 850
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(EDITABLE / f'{asset_id}.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE / f'{asset_id}.blend'), compress=True)
    bpy.ops.render.render(write_still=True)
    print('FINISHED', asset_id, manifest['triangles'], flush=True)
