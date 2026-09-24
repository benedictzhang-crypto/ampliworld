"""Render an asset-review image without launching the playable client."""
import bpy
import math
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='public/assets/3d/ampliworld/GC-CRESCENT-COMMONS-001/commons.glb')
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1600
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath='/tmp/ampliworld-crescent-commons-review.png'
scene.world.color=(0.38,0.47,0.55)

bpy.ops.object.light_add(type='SUN',location=(180,-280,550))
bpy.context.object.data.energy=2.2
bpy.context.object.rotation_euler=(math.radians(25),math.radians(-25),math.radians(-30))
bpy.ops.object.light_add(type='AREA',location=(-180,160,250))
bpy.context.object.data.energy=65000
bpy.context.object.data.shape='DISK'
bpy.context.object.data.size=400

bpy.ops.object.camera_add(location=(420,-610,460))
camera=bpy.context.object
target=Vector((0,0,0))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=750
scene.camera=camera
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False
bpy.ops.render.render(write_still=True)
