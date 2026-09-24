"""Original metric Blender geometry for the first AmpliWorld metro kit.

Blender uses Z-up; glTF export converts to the game's Y-up coordinate system.
The underground platform remains an asset study until the city terrain has a
real excavation/collision opening. Do not advertise it as a usable station.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/assets/3d/ampliworld/GC-METRO-001"
EDITABLE = ROOT / "asset-library/blender/metro"
OUT.mkdir(parents=True, exist_ok=True)
EDITABLE.mkdir(parents=True, exist_ok=True)

COLORS = {
    "limestone": ((.76, .74, .70, 1), .78, .0),
    "white": ((.88, .89, .86, 1), .42, .08),
    "concrete": ((.36, .39, .39, 1), .86, .0),
    "graphite": ((.11, .16, .19, 1), .48, .35),
    "steel": ((.35, .41, .43, 1), .28, .78),
    "gold": ((.72, .54, .26, 1), .26, .70),
    "glass": ((.29, .50, .59, .38), .08, .16),
    "green": ((.12, .35, .31, 1), .46, .22),
    "light": ((.76, .93, 1, 1), .30, .04),
    "rubber": ((.045, .055, .065, 1), .92, .0),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    global MATS
    MATS = {}
    for name, (color, roughness, metalness) in COLORS.items():
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = color
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = color
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = metalness
        if name == "glass":
            shader.inputs["Alpha"].default_value = color[3]
            mat.surface_render_method = "DITHERED"
        if name == "light":
            shader.inputs["Emission Color"].default_value = color
            shader.inputs["Emission Strength"].default_value = 1.8
        MATS[name] = mat


def block(name, location, dimensions, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    mesh = bpy.context.object
    mesh.name = name
    mesh.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mesh.data.materials.append(MATS[material])
    if bevel:
        modifier = mesh.modifiers.new("Cast architectural edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = mesh
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normal = mesh.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return mesh


def cylinder(name, location, radius, depth, material, vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    bpy.context.object.name = name
    bpy.context.object.data.materials.append(MATS[material])
    return bpy.context.object


def sculpted_canopy(name, half_length, half_width, base_z, crown, material, thickness=.38):
    """A real double-sided shell, not a textured box or a line-only roof."""
    across, along = 20, 28
    vertices = []
    for level in (0, 1):
        for i in range(along + 1):
            x = -half_length + 2 * half_length * i / along
            end_taper = .92 + .08 * math.sin(math.pi * i / along)
            for j in range(across + 1):
                u = -1 + 2 * j / across
                y = half_width * end_taper * u
                arch = crown * (1 - u * u) ** 1.55
                wave = .12 * math.cos(2 * math.pi * i / along) * (1 - u * u)
                vertices.append((x, y, base_z + arch + wave - level * thickness))
    layer = (along + 1) * (across + 1)
    faces = []
    for i in range(along):
        for j in range(across):
            a = i * (across + 1) + j
            b = a + across + 1
            faces.extend([(a, b, b + 1, a + 1),
                          (a + layer + 1, b + layer + 1, b + layer, a + layer)])
    for i in range(along):
        for j in (0, across):
            a = i * (across + 1) + j
            b = a + across + 1
            faces.append((a, a + layer, b + layer, b))
    for i in (0, along):
        for j in range(across):
            a = i * (across + 1) + j
            faces.append((a, a + 1, a + layer + 1, a + layer))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(MATS[material])
    bevel = obj.modifiers.new('Continuous cast edge', 'BEVEL')
    bevel.width = .08
    bevel.segments = 2
    bevel.limit_method = 'ANGLE'
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def escalator(name, x, y0, z0, y1, z1):
    length = math.hypot(y1 - y0, z1 - z0)
    angle = math.atan2(z1 - z0, y1 - y0)
    center = (x, (y0 + y1) / 2, (z0 + z1) / 2)
    slab = block(name + " moving belt", center, (2.2, length, .28), "graphite", .08)
    slab.rotation_euler[0] = angle
    for side in (-1, 1):
        rail = block(name + " bronze handrail", (x + side * 1.25, center[1], center[2] + .65), (.12, length, .12), "gold", .06)
        rail.rotation_euler[0] = angle
    for step in range(22):
        t = (step + .5) / 22
        yy = y0 + (y1 - y0) * t
        zz = z0 + (z1 - z0) * t
        block(name + " tread", (x, yy, zz + .07), (2.06, .36, .1), "steel", .025)


def elevator(name, x, y, height, base=0):
    block(name + " lift floor", (x, y, base + .22), (4.6, 4.6, .44), "limestone", .12)
    block(name + " roof", (x, y, base + height + .2), (4.8, 4.8, .4), "gold", .12)
    for side_x in (-2.25, 2.25):
        for side_y in (-2.25, 2.25):
            block(name + " corner steel", (x + side_x, y + side_y, base + height / 2), (.16, .16, height), "steel")
    for side_x in (-2.3, 2.3):
        block(name + " glass side", (x + side_x, y, base + height / 2), (.08, 4.2, height - .5), "glass")
    block(name + " rear glass", (x, y + 2.3, base + height / 2), (4.2, .08, height - .5), "glass")
    for side in (-1, 1):
        block(name + " split door", (x + side * 1.04, y - 2.3, base + 1.45), (2.03, .08, 2.9), "glass")


def metro_sign(name, x, y, z):
    block(name + " green enamel sign", (x, y, z), (5.8, .22, 1.75), "green", .16)
    bpy.ops.object.text_add(location=(x - 2.45, y - .16, z - .43), rotation=(math.pi / 2, 0, 0))
    lettering = bpy.context.object
    lettering.name = name + " raised lettering"
    lettering.data.body = "METRO"
    lettering.data.size = 1.06
    lettering.data.extrude = .025
    lettering.data.materials.append(MATS["light"])
    bpy.ops.object.convert(target="MESH")


def elevated_station():
    block("Station forecourt", (0, 0, .12), (54, 42, .24), "limestone", .10)
    for x in (-20, -7, 7, 20):
        for y in (-6, 6):
            cylinder("Concrete viaduct pier", (x, y, 5.6), .75, 11.2, "concrete")
            block("Pier gold capital", (x, y, 11.25), (2.0, 2.0, .45), "gold", .15)
    block("Elevated island platform", (0, 0, 11.5), (52, 13.5, .55), "white", .18)
    for y in (-5.5, 5.5):
        block("Tactile platform edge", (0, y, 11.84), (49, .38, .06), "gold")
        block("Track beam", (0, y + (2.0 if y > 0 else -2.0), 10.95), (55, 1.1, .45), "concrete")
        for offset in (-.46, .46):
            block("Running rail", (0, y + (2.0 if y > 0 else -2.0) + offset, 11.25), (55, .10, .14), "steel")
    for x in (-19, -10, 0, 10, 19):
        for y in (-5, 5):
            block("Canopy slender column", (x, y, 13.8), (.22, .22, 4.1), "graphite")
    sculpted_canopy("Sweeping white station roof", 27, 8.4, 16.2, 1.35, "white")
    sculpted_canopy("Recessed bronze roof soffit", 26.3, 7.8, 16.12, 1.30, "gold", .07)
    for x in range(-23, 24, 5):
        for side in (-1, 1):
            y = side * 7.75
            block("Floating roof luminous edge", (x, y, 16.24), (4.45, .07, .11), "light", .04)
        block("Soffit luminaire", (x, 0, 17.30), (2.9, 4.5, .07), "light", .04)
    for x in (-24, 24):
        for y in (-6, 6):
            block("Sculptural corner fin", (x, y, 14.1), (.42, .42, 3.65), "gold", .10)
    for x in (-15, 15):
        block("Platform glazed windscreen", (x, 5.7, 13.23), (12, .09, 2.5), "glass", .08)
        block("Windscreen bronze cap", (x, 5.7, 14.52), (12.2, .12, .12), "gold", .04)
    for x in (-21, 21):
        for y in (-12, 12):
            cylinder("Forecourt planter", (x, y, .58), 1.05, .95, "concrete", 28)
            cylinder("Forecourt raised planting", (x, y, 1.10), .88, .15, "green", 28)
    elevator("Public glass elevator", 19, -11, 12.3)
    escalator("Up escalator", -12, -17.5, .4, 2.5, 11.9)
    escalator("Down escalator", -8, -17.5, .4, 2.5, 11.9)
    for x in (-22, 22):
        metro_sign("Elevated station identity", x, -7.8, 14.15)
    for x in (-5, -3, -1, 1, 3, 5):
        block("Ticket gate pedestal", (x, -11, .72), (.42, 1.6, 1.44), "graphite", .1)
        block("Ticket gate sensor", (x, -11, 1.49), (.35, .45, .08), "light")


def underground_station():
    # Four independent slabs leave a true 13 × 19 m opening. The real city
    # terrain still needs a matching cut and stair/elevator colliders.
    for x in (-12, 12):
        block("Civic paving side", (x, 0, .13), (10, 26, .26), "limestone", .16)
    for y in (-11, 11):
        block("Civic paving end", (0, y, .13), (14, 4, .26), "limestone", .16)
    for x in (-13, 13):
        block("Stone entrance pier", (x, 0, 3.1), (1.2, 15.5, 6.2), "white", .18)
    for y in (-6.7, 6.7):
        block("Stone entrance end pier", (0, y, 3.1), (25, 1.0, 6.2), "white", .18)
    for x in range(-10, 11, 5):
        for y in (-6, 6):
            block("Bronze pavilion mullion", (x, y, 3.1), (.14, .14, 5.7), "gold")
    for y in (-6.25, 6.25):
        block("Pavilion glass wall", (0, y, 3.0), (24, .07, 5.4), "glass")
    block("Pavilion roof west wing", (-8, 0, 6.55), (13, 19, .44), "gold", .7)
    block("Pavilion roof east wing", (8, 0, 6.55), (13, 19, .44), "gold", .7)
    block("Central translucent skylight", (0, 0, 6.58), (4.3, 16.5, .12), "glass", .3)
    for x in (-8, 8):
        block("Ivory roof upper", (x, 0, 6.87), (12.6, 17.7, .23), "white", .7)
    elevator("Deep underground elevator", 10.5, 0, 70.3, base=-64)
    for tier in range(4):
        upper = .3 - 16 * tier
        lower = upper - 16
        top_y, low_y = (-14, 14) if tier % 2 == 0 else (14, -14)
        escalator("Tier " + str(tier + 1) + " up escalator", -6, top_y, upper, low_y, lower)
        escalator("Tier " + str(tier + 1) + " down escalator", -2.5, top_y, upper, low_y, lower)
        landing_y = low_y
        block("Tier " + str(tier + 1) + " transfer landing", (-4, landing_y, lower - .22), (13, 6.0, .44), "limestone", .13)
        block("Tier " + str(tier + 1) + " lift lobby", (9, 0, lower - .22), (7, 8, .44), "white", .13)
        for y in (-15, 15):
            block("Vertical atrium edge rail", (-4, y, upper - 7), (13, .13, 1.25), "gold", .05)
    block("Deep island platform floor", (0, 0, -64.3), (64, 13, .55), "white", .18)
    block("Deep platform vault centre", (0, 0, -58.3), (64, 13.5, .55), "concrete", .22)
    for x in range(-27, 28, 9):
        block("Platform vault linear light", (x, 0, -58.7), (5.5, .16, .12), "light")
    metro_sign("Underground surface station identity", 0, -7.2, 4.5)
    for y in (-5.7, 5.7):
        block("Platform safety strip", (0, y, -63.98), (61, .38, .06), "gold")
        block("Tunnel running rail", (0, y * 1.45, -64.26), (72, .13, .18), "steel")


def train():
    block("Aluminium train car shell", (0, 0, 2.26), (29, 3.1, 3.5), "white", .58)
    block("Panoramic dark window band", (0, -1.57, 2.78), (26.6, .12, 1.48), "graphite", .16)
    block("Opposite window band", (0, 1.57, 2.78), (26.6, .12, 1.48), "graphite", .16)
    for side in (-1, 1):
        for x in (-10, -3.3, 3.3, 10):
            block("Glass passenger window", (x, side * 1.64, 2.86), (3.7, .06, 1.18), "glass", .1)
        for x in (-6.6, 6.6):
            block("Passenger door", (x, side * 1.66, 2.12), (2.1, .07, 2.55), "steel", .12)
            for direction in (-1, 1):
                block("Door vision glass", (x + direction * .53, side * 1.72, 2.65), (.74, .05, .94), "glass", .08)
        block("Continuous destination light ribbon", (0, side * 1.7, 3.57), (26.4, .055, .12), "light")
        block("Gold transit livery stripe", (0, side * 1.72, 1.52), (27, .055, .16), "gold")
    for x in (-9, 9):
        for y in (-1.0, 1.0):
            cylinder("Rail wheel", (x, y, .41), .39, .18, "rubber", 16)
    block("Train destination display", (14.55, 0, 2.74), (.08, 1.4, .52), "light")


def sloped_strip(name, x0, x1, half_width, z0, z1, thickness, material):
    vertices = [(x, y, z + offset) for offset in (0, -thickness)
                for x, z in ((x0, z0), (x1, z1)) for y in (-half_width, half_width)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 2, 6, 4),
             (1, 5, 7, 3), (0, 4, 5, 1), (2, 3, 7, 6)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(MATS[material])
    return obj


def portal_transition():
    # Original interpretation of a surface-to-tunnel portal, not a copy of
    # Boston's Blandford Street portal. Rail rise: 4 m in 180 m = 2.22%.
    sloped_strip("Continuous railbed descending into tunnel", -90, 90, 6.2, -4, 0, .7, "concrete")
    for y in (-4.25, 4.25):
        for offset in (-.56, .56):
            rail = sloped_strip("Continuous steel running rail", -90, 90, .08, -3.76, .24, .15, "steel")
            rail.location.y = y + offset
        for x in range(-84, 90, 6):
            z = -4 + (x + 90) / 180 * 4
            block("Rail sleeper", (x, y, z + .08), (.32, 2.8, .17), "graphite", .03)
    for side in (-1, 1):
        for x in range(-81, 91, 18):
            grade = -4 + (x + 90) / 180 * 4
            wall_height = max(2, 2.4 - grade)
            block("Portal retaining wall segment", (x, side * 7, grade + wall_height / 2),
                  (18.2, .55, wall_height), "limestone", .08)
            block("Portal safety rail", (x, side * 7.12, grade + wall_height + .75),
                  (17.7, .1, 1.5), "gold", .04)
    block("Covered tunnel transition roof", (-73, 0, 2.8), (34, 15.2, .8), "graphite", .3)
    for side in (-1, 1):
        block("Tunnel portal monumental pier", (-54, side * 6.8, -1.0), (1.8, 1.5, 7.4), "limestone", .16)
    block("Tunnel portal lintel", (-54, 0, 3.2), (1.8, 15, 1.0), "gold", .16)
    metro_sign("Tunnel portal wayfinding", -54, -7.8, 4.3)
    for x in (-32, 0, 32, 64):
        for side in (-1, 1):
            grade = -4 + (x + 90) / 180 * 4
            block("Portal wall luminaire", (x, side * 6.66, grade + 2.2), (3.4, .09, .11), "light", .05)


JOBS = [
    ("elevated-station", elevated_station, [-27, 0, -21], [27, 17, 21], [0, 0, 18]),
    ("underground-station", underground_station, [-32, -65, -17], [32, 7, 17], [0, 0, -64]),
    ("train", train, [-14.5, 0, -1.75], [14.5, 4.1, 1.75], [0, 0, 0]),
    ("portal-transition", portal_transition, [-90, -5, -8], [90, 6, 8], [-90, 0, 0]),
]

for name, construct, bounds_min, bounds_max, entrance in JOBS:
    reset()
    construct()
    destination = OUT / (name + ".glb")
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format="GLB", export_apply=True)
    target = Vector((0, 0, 8 if name == "elevated-station" else -24 if name == "underground-station" else 1.4))
    camera_data = bpy.data.cameras.new("Metro review camera")
    camera = bpy.data.objects.new("Metro review camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (67, -77, 46 if name == "elevated-station" else 19 if name == "underground-station" else 36)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 112 if name == "underground-station" else 84 if name == "elevated-station" else 195 if name == "portal-transition" else 43
    bpy.context.scene.camera = camera
    for index, (xyz, energy) in enumerate([((-35, -25, 65), 5500), ((35, 30, 50), 4300)]):
        light_data = bpy.data.lights.new("Review softbox", "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = 35
        light = bpy.data.objects.new("Review softbox " + str(index), light_data)
        bpy.context.collection.objects.link(light)
        light.location = xyz
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(EDITABLE / (name + "-preview.png"))
    scene.world = bpy.data.worlds.new("Metro preview sky")
    scene.world.color = (.20, .26, .31)
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE / (name + ".blend")), compress=True)
    print("EXPORTED", destination.name, destination.stat().st_size, flush=True)

(OUT / "manifest.json").write_text(json.dumps({
    "id": "GC-METRO-001", "units": "METERS", "upAxis": "Y",
    "assets": [{"file": name + ".glb", "bounds": {"min": lo, "max": hi}, "entrance": entry}
               for name, _, lo, hi, entry in JOBS],
    "headwaySeconds": 180, "dwellSeconds": 25,
    "provenance": {"type": "ORIGINAL_BLENDER_GEOMETRY", "externalAssets": [], "externalImages": []},
    "limitations": ["The city ground has not yet been cut for underground station access.",
                    "Tracks, moving trains, boarding and elevator gameplay are not yet connected."],
}, indent=2) + "\n")
