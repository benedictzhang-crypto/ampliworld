"""Blender CLI visual QA for a generated GLB: blender -b --python this.py -- model.glb preview.png"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :]
source, output = map(Path, args[:2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
corners = []
for obj in meshes:
    corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
center = (minimum + maximum) * 0.5
span = maximum - minimum

bpy.ops.mesh.primitive_plane_add(size=max(span.x, span.y) * 2.4, location=(center.x, center.y, minimum.z - 0.08))
ground = bpy.context.object
ground_material = bpy.data.materials.new("Preview ground")
ground_material.diffuse_color = (0.12, 0.15, 0.14, 1)
ground.data.materials.append(ground_material)

bpy.ops.object.light_add(type="SUN", location=(center.x + span.x, center.y - span.y, maximum.z * 2))
sun = bpy.context.object
sun.data.energy = 2.3
sun.rotation_euler = (center - sun.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.light_add(type="AREA", location=(center.x + span.x * 0.25, center.y - span.y, maximum.z * 1.4))
area = bpy.context.object
area.data.energy = 5200
area.data.shape = "DISK"
area.data.size = max(span.x, span.y) * 0.7
area.rotation_euler = (center - area.location).to_track_quat("-Z", "Y").to_euler()

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.location = (center.x + span.x * 1.4, center.y - span.y * 1.9, maximum.z + max(span.x, span.y) * 0.8)
direction = center - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 42
bpy.context.scene.camera = camera

world = bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.18, 0.26, 0.34, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(output)
scene.render.film_transparent = False
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
