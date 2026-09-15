"""Background Blender finishing pass. Source GLBs and their collision manifests stay paired.
Run after build-mall-campus.mjs and build-hospitality.mjs with Blender --background --python.
"""
import bpy
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/assets/3d/ampliworld'
EDITABLE = ROOT / 'asset-library/blender/cbd'
EDITABLE.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
jobs = [('GC-MALL-002', 'mall-lod0.glb', 'mall-manifest.json')]
jobs += [(f'GC-RESTAURANT-00{i}', 'model.glb', 'manifest.json') for i in range(1, 4)]
if '--mall-only' in sys.argv:
    jobs = jobs[:1]
for asset_id, filename, manifest_name in jobs:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    folder = ASSETS / asset_id
    bpy.ops.import_scene.gltf(filepath=str(folder / filename))
    # Exportable texture images, metre-scale planar UVs: the Web client receives
    # the same stone grain and timber surfaces as the Blender inspection render.
    rng = random.Random(41)
    for material in bpy.data.materials:
        label = material.name.lower()
        timber = any(k in label for k in ['wood','teak'])
        stone = any(k in label for k in ['ivory','stone'])
        if not (timber or stone) or not material.use_nodes:
            continue
        shader = material.node_tree.nodes.get('Principled BSDF')
        if not shader:
            continue
        tex = bpy.data.images.new(material.name+' surface', width=256, height=256)
        pixels = []
        for y in range(256):
            for x in range(256):
                grain = rng.uniform(-.026,.026)
                if timber:
                    v = .48+.07*math.sin(x*.23+math.sin(y*.045))+.025*math.sin(x*1.6)+grain
                    rgb = (v*.9,v*.64,v*.38)
                else:
                    v = .78+.015*math.sin(y*.32+math.sin(x*.08))+grain
                    if x<1 or y<1: v -= .1
                    rgb = (v,v*.985,v*.95)
                pixels.extend((*rgb,1))
        tex.pixels.foreach_set(pixels)
        tex.pack()
        node = material.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = tex
        material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
        shader.inputs['Roughness'].default_value = .6 if timber else .72
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH': continue
        uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name='MetricSurface')
        for polygon in obj.data.polygons:
            axis = max(range(3),key=lambda a:abs(polygon.normal[a]))
            axes = [a for a in range(3) if a!=axis]
            for li in polygon.loop_indices:
                co = obj.data.vertices[obj.data.loops[li].vertex_index].co
                uv.data[li].uv = (co[axes[0]]/2,co[axes[1]]/2)
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
    if big:
        camera.data.type = 'PERSP'
        camera.data.lens = 28
        camera.location = (25,-135,1.7)
        camera.rotation_euler = (Vector((0,-90,6))-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath = str(EDITABLE / f'{asset_id}-arrival.png')
        bpy.ops.render.render(write_still=True)
    print('FINISHED', asset_id, manifest['triangles'], flush=True)
