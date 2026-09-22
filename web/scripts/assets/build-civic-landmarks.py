"""Editable Blender models for two original civic landmarks (metres, Z up)."""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public/assets/3d/ampliworld"
EDITABLE = ROOT / "asset-library/blender/civic"
EDITABLE.mkdir(parents=True, exist_ok=True)

PALETTE = {
    "warm limestone": ((0.76, 0.73, 0.66, 1), 0.78, 0.0),
    "ivory stone": ((0.88, 0.85, 0.78, 1), 0.72, 0.0),
    "shadow stone": ((0.37, 0.38, 0.37, 1), 0.85, 0.0),
    "bronze": ((0.44, 0.32, 0.18, 1), 0.29, 0.78),
    "champagne metal": ((0.71, 0.57, 0.34, 1), 0.26, 0.72),
    "smoked glass": ((0.19, 0.31, 0.34, 0.63), 0.14, 0.18),
    "clear glass": ((0.36, 0.55, 0.57, 0.42), 0.11, 0.08),
    "dark metal": ((0.14, 0.18, 0.2, 1), 0.38, 0.62),
    "paving": ((0.55, 0.55, 0.52, 1), 0.94, 0.0),
    "water": ((0.17, 0.48, 0.55, 0.86), 0.12, 0.0),
    "foliage": ((0.13, 0.29, 0.18, 1), 0.9, 0.0),
    "timber": ((0.42, 0.27, 0.15, 1), 0.65, 0.0),
    "warm light": ((1.0, 0.66, 0.32, 1), 0.32, 0.0),
}


def material(name):
    color, roughness, metalness = PALETTE[name]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metalness
    if color[3] < 1:
        shader.inputs["Alpha"].default_value = color[3]
        mat.surface_render_method = "DITHERED"
    if name == "warm light":
        shader.inputs["Emission Color"].default_value = color
        shader.inputs["Emission Strength"].default_value = 2.4
    return mat


def box(name, location, dimensions, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(MATS[mat])
    if bevel:
        modifier = obj.modifiers.new("Soft architectural arris", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normal = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj


def cylinder(name, location, radius, depth, mat, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(MATS[mat])
    return obj


def rounded_plate(name, width, depth, radius, bottom, thickness, mat, center=(0, 0)):
    points = []
    for sx, sy, start in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        cx = center[0] + sx * (width / 2 - radius)
        cy = center[1] + sy * (depth / 2 - radius)
        for step in range(9):
            angle = math.radians(start + step * 90 / 8)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    n = len(points)
    vertices = [(x, y, z) for z in (bottom, bottom + thickness) for x, y in points]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(MATS[mat])
    return obj


def tree(x, y, height=7):
    cylinder("Dark trunk", (x, y, height * 0.3), 0.27, height * 0.6, "timber", 10)
    for dx, dy, dz, size in ((0, 0, .72, 2.0), (-.7, .3, .62, 1.5), (.7, -.2, .66, 1.6)):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=size, location=(x + dx, y + dy, height * dz))
        bpy.context.object.name = "Garden canopy"
        bpy.context.object.data.materials.append(MATS["foliage"])


def city_hall():
    # 140 x 110 metre landscape and a stepped, three-dimensional civic building.
    box("Stone city square", (0, 0, .09), (144, 112, .18), "paving")
    for x in range(-65, 66, 13):
        box("Paving joint", (x, -43, .195), (.09, 22, .01), "shadow stone")
    rounded_plate("Garden reflecting pool rim", 52, 16, 7, .2, .55, "ivory stone", (0, -44))
    rounded_plate("Still water", 49, 13, 6, .77, .035, "water", (0, -44))
    for x in (-68, -57, 57, 68):
        for y in (-43, -27, -8, 14, 35):
            tree(x, y, 6.5 + abs(x) / 100)
    for x in (-42, 42):
        for y in (-43, -31):
            box("Public stone bench", (x, y, .7), (9, 1.7, .55), "ivory stone", .24)
            box("Bench recessed base", (x, y, .31), (6.5, 1.1, .4), "shadow stone", .15)

    rounded_plate("Broad plinth", 116, 76, 11, .2, .18, "warm limestone", (0, 8))
    # The wings and rear service core leave an actual public entry void.
    box("West stone wing", (-39, 7, 10.3), (36, 46, 18.5), "warm limestone", 1.6)
    box("East stone wing", (39, 7, 10.3), (36, 46, 18.5), "warm limestone", 1.6)
    box("Rear civic chamber", (0, 24, 11.5), (42, 24, 21), "ivory stone", .8)
    box("Atrium floor", (0, -13, 1.0), (43, 22, .24), "ivory stone", .22)
    for x in (-16, 16):
        box("Atrium glazed wall", (x, -21.2, 8.6), (10, .13, 14), "clear glass")
    for x in (-13, 13):
        box("Bronze entrance jamb", (x, -22, 8.2), (.55, .9, 14), "bronze", .1)
    rounded_plate("Cantilevered bronze portico", 90, 26, 8, 17.9, 1.1, "bronze", (0, -23))
    rounded_plate("Deep ivory cornice", 120, 79, 12, 20.8, 1.2, "ivory stone", (0, 8))
    for x in (-48, -36, 36, 48):
        rounded_plate("Living roof garden", 8, 18, 3, 22.02, .28, "foliage", (x, 14))
        for y in (8, 14, 20):
            cylinder("Planter specimen", (x, y, 23.2), 1.05, 1.7, "foliage", 12)
    for x in (-31, -17, 17, 31):
        cylinder("Portico pillar", (x, -29, 9.8), .8, 18, "champagne metal", 20)
    for x in range(-52, 53, 13):
        box("Fluted stone pier", (x, -16.8, 10.5), (.8, .8, 15), "ivory stone", .13)
    for x in (-38, 38):
        for z in (6, 12, 18):
            box("Deep window reveal", (x, -16.4, z), (28, .42, 3.05), "shadow stone", .12)
            box("Wing ribbon glazing", (x, -16.65, z), (26.8, .13, 2.3), "smoked glass")
            box("Stone projecting sill", (x, -17.2, z - 1.45), (29, 1.45, .32), "ivory stone", .12)
        rounded_plate("Wing garden terrace", 31, 29, 5, 22.04, .25, "warm limestone", (x, 5))
        for y in (-5, 12):
            rounded_plate("Terrace planting bed", 22, 3.2, 1.4, 22.3, .32, "foliage", (x, y))
        for off in (-11, 11):
            box("Terrace pergola upright", (x + off, 4, 24.2), (.38, .5, 4), "bronze", .1)
        box("Terrace pergola canopy", (x, 4, 26.3), (23, 12, .42), "champagne metal", .24)

    # Layered glass office tower, viewed through real facade depth and bronze fins.
    box("Tower occupied core", (0, 15, 50), (35, 38, 55), "shadow stone", 1.3)
    for z in range(26, 76, 5):
        rounded_plate("Tower floor lip", 45, 48, 3.2, z, .38, "ivory stone", (0, 15))
        box("South curtain wall", (0, -8.9, z + 2.3), (39, .18, 4.2), "smoked glass")
        box("West curtain wall", (-19.8, 15, z + 2.3), (.18, 43, 4.2), "smoked glass")
        box("East curtain wall", (19.8, 15, z + 2.3), (.18, 43, 4.2), "smoked glass")
        for x in range(-18, 19, 6):
            box("Warm office glow", (x, -9.1, z + 3.0), (2.8, .06, .13), "warm light")
    for x in range(-20, 21, 5):
        box("Vertical bronze fin", (x, -10.1, 50.5), (.28, 1.2, 52), "bronze", .09)
    rounded_plate("Floating crown", 58, 62, 9, 76.1, 1.35, "champagne metal", (0, 15))
    rounded_plate("Crown shadow roof", 51, 55, 7, 77.5, .4, "shadow stone", (0, 15))
    rounded_plate("Rooftop skylight bronze curb", 24, 15, 5, 77.94, .33, "bronze", (0, 15))
    rounded_plate("Rooftop skylight glass", 22, 13, 4.6, 78.28, .12, "smoked glass", (0, 15))
    for x in (-21, 21):
        rounded_plate("Roof garden green", 5.3, 27, 2.5, 77.95, .22, "foliage", (x, 15))
    for x in (-45, 45):
        box("Illuminated wayfinding", (x, -24.5, 2.2), (5, .7, 3.5), "bronze", .15)


def court():
    box("Civic stone square", (0, 2, .09), (138, 103, .18), "paving")
    for x in (-59, -48, 48, 59):
        for y in (-42, -22, 0, 22):
            tree(x, y, 6)
    rounded_plate("Courthouse stepped base", 114, 72, 7, .2, .18, "warm limestone", (0, 7))
    for i in range(4):
        box("Broad courthouse stair", (0, -34 - 2.3 * i, .4 + .28 * i), (105 - 4 * i, 4.6, .6), "ivory stone", .17)
    # Side wings frame a glazed hearing hall with a walkable entrance recess.
    box("Left archive wing", (-39, 7, 13.3), (29, 53, 24.5), "warm limestone", 1.1)
    box("Right archive wing", (39, 7, 13.3), (29, 53, 24.5), "warm limestone", 1.1)
    box("Rear courtroom volume", (0, 22, 17.5), (50, 25, 33), "ivory stone", .7)
    for x in (-13.5, 13.5):
        box("Public hearing room glass", (x, -16.3, 15), (19, .18, 28), "smoked glass")
    for x in (-21, -14, -7, 7, 14, 21):
        box("Glazed court mullion", (x, -16.5, 15), (.38, .4, 28), "bronze", .07)
    for x in (-42, -31, 31, 42):
        for z in (7, 15, 23):
            box("Deep wing window reveal", (x, -19.78, z), (9.2, .42, 3.1), "shadow stone", .12)
            box("Recessed wing glazing", (x, -20.02, z), (8.5, .14, 2.1), "smoked glass")
            box("Stone light shelf", (x, -20.65, z - 1.52), (9.8, 1.2, .25), "ivory stone", .1)
    for x in (-53, -24, 24, 53):
        box("Layered courtroom wall blade", (x, -12, 14), (1.8, 44, 27), "ivory stone", .36)
    for x in (-36, -24, -12, 12, 24, 36):
        cylinder("Courthouse portico column", (x, -25, 14.8), 1.15, 28, "ivory stone", 24)
        cylinder("Bronze column base", (x, -25, 1.5), 1.5, 1.2, "bronze", 24)
    rounded_plate("Floating courthouse roof", 118, 82, 10, 29.3, 1.75, "shadow stone", (0, 4))
    rounded_plate("Roof gold edge", 117, 81, 10, 30.55, .12, "champagne metal", (0, 4))
    rounded_plate("Raised roof lantern", 54, 37, 6, 31.2, 2.8, "bronze", (0, 11))
    rounded_plate("Lantern glazing", 49, 32, 5, 34, .17, "smoked glass", (0, 11))
    for x in (-43, 43):
        rounded_plate("Judicial roof garden", 15, 49, 5, 31.08, .26, "foliage", (x, 6))
        for y in (-11, 2, 15):
            box("Garden timber promenade", (x, y, 31.4), (9, 2.8, .16), "timber", .12)
    for y in (-17, -7, 3, 13, 23):
        box("Lantern roof light fin", (0, y, 34.6), (40, .5, .54), "champagne metal", .17)
    for x in (-32, -20, -8, 8, 20, 32):
        box("Downlit stone soffit", (x, -30, 28.9), (3, 4.2, .1), "warm light")
    for x in (-39, 39):
        box("Civic relief panel", (x, -20.1, 17), (14, .22, 8), "bronze", .24)
        box("Inset relief", (x, -20.3, 17), (12, .09, 5.8), "champagne metal", .2)
    for x in (-55, 55):
        box("Public art stone pedestal", (x, -39, .95), (5, 5, 1.5), "shadow stone", .3)
        bpy.ops.mesh.primitive_torus_add(major_radius=2.3, minor_radius=.32, location=(x, -39, 4.9))
        sculpture = bpy.context.object
        sculpture.name = "Bronze civic ring sculpture"
        sculpture.rotation_euler[0] = math.radians(90)
        sculpture.data.materials.append(MATS["bronze"])


JOBS = [
    {
        "id": "GC-CITYHALL-001", "name": "AmpliWorld City Hall and Civic Services",
        "build": city_hall,
        "bounds": {"min": [-72, 0, -56], "max": [72, 79, 56]},
        "colliders": [
            {"id": "west-wing", "min": [-57, 0, -30], "max": [-21, 20, 16]},
            {"id": "east-wing", "min": [21, 0, -30], "max": [57, 20, 16]},
            {"id": "rear-chamber", "min": [-21, 0, -36], "max": [21, 22, -12]},
            {"id": "tower", "min": [-21, 21, -39], "max": [21, 78, 9]},
        ],
        "surfaces": [
            {"id": "civic-square", "min": [-72, -56], "max": [72, 56], "y": .18},
            {"id": "civic-plinth", "min": [-58, -46], "max": [58, 30], "y": .38},
        ],
        "entrance": [0, 0, 52],
    },
    {
        "id": "GC-COURT-001", "name": "Metropolitan Court and Justice Center",
        "build": court,
        "bounds": {"min": [-69, 0, -54], "max": [69, 35, 52]},
        "colliders": [
            {"id": "west-wing", "min": [-54, 0, -34], "max": [-24, 26, 20]},
            {"id": "east-wing", "min": [24, 0, -34], "max": [54, 26, 20]},
            {"id": "hearing-hall", "min": [-25, 0, -34], "max": [25, 34, -9]},
            {"id": "front-glazing-west", "min": [-23, 0, 16], "max": [-4, 29, 17]},
            {"id": "front-glazing-east", "min": [4, 0, 16], "max": [23, 29, 17]},
        ],
        "surfaces": [
            {"id": "court-square", "min": [-69, -52], "max": [69, 54], "y": .18},
            {"id": "court-plinth", "min": [-57, -43], "max": [57, 29], "y": .38},
        ],
        "entrance": [0, 0, 49],
    },
]


for job in JOBS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    MATS = {name: material(name) for name in PALETTE}
    job["build"]()
    output = ASSETS / job["id"]
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output / "model.glb"), export_format="GLB", export_apply=True)
    manifest = {
        "id": job["id"], "name": job["name"], "file": "model.glb", "units": "METERS", "upAxis": "Y",
        "bounds": job["bounds"], "colliders": job["colliders"], "surfaces": job["surfaces"],
        "entrance": job["entrance"],
        "bytes": (output / "model.glb").stat().st_size,
        "triangles": sum(len(poly.vertices) - 2 for obj in bpy.context.scene.objects if obj.type == "MESH" for poly in obj.data.polygons),
        "provenance": {"type": "ORIGINAL_BLENDER_GEOMETRY", "externalAssets": [], "externalImages": [], "license": "Project-original"},
        "limitations": ["Upper interior rooms are visual shells; room-by-room interaction remains future work."],
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE / (job["id"] + ".blend")), compress=True)
    print("EXPORTED", job["id"], manifest["triangles"], manifest["bytes"], flush=True)
