"""Original metre-scale, three-dimensional amusement park for AmpliWorld.

Blender is Z-up; helper coordinates below use the game's X / Y-up / Z frame.
No photograph, facade plane or third-party ride mesh is embedded in the GLB.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
PLAN = json.loads((ROOT / "app/world-client/amusement-park-plan.json").read_text())
OUT = ROOT / "public/assets/3d/ampliworld/GC-AMUSEMENT-001"
EDIT = ROOT / "asset-library/blender/amusement"
OUT.mkdir(parents=True, exist_ok=True)
EDIT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0

PALETTE = {
    "stone": ((.66, .67, .63, 1), .79, .0),
    "cream": ((.86, .83, .72, 1), .60, .0),
    "paving": ((.51, .55, .52, 1), .85, .0),
    "asphalt": ((.21, .25, .28, 1), .91, .0),
    "grass": ((.22, .40, .30, 1), .95, .0),
    "leaf": ((.16, .40, .29, 1), .90, .0),
    "dark": ((.08, .12, .19, 1), .50, .17),
    "steel": ((.37, .43, .46, 1), .28, .78),
    "gold": ((.75, .57, .28, 1), .28, .65),
    "blue": ((.05, .38, .88, 1), .20, .65),
    "red": ((.82, .09, .15, 1), .27, .50),
    "purple": ((.38, .20, .57, 1), .36, .36),
    "orange": ((.90, .43, .12, 1), .43, .35),
    "wood": ((.46, .26, .14, 1), .88, .0),
    "white": ((.88, .91, .90, 1), .46, .10),
    "glass": ((.21, .49, .62, .4), .09, .20),
    "light": ((.95, .81, .44, 1), .20, .0),
    "foam": ((.21, .57, .83, 1), .85, .0),
}
M = {}
SOLIDS = []
for key, (color, rough, metal) in PALETTE.items():
    mat = bpy.data.materials.new(key)
    mat.diffuse_color = color
    mat.use_nodes = True
    p = mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = color
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if key == "glass":
        p.inputs["Alpha"].default_value = color[3]
        mat.surface_render_method = "DITHERED"
    if key == "light":
        p.inputs["Emission Color"].default_value = color
        p.inputs["Emission Strength"].default_value = 2
    M[key] = mat


def block(name, x, z, y, w, d, h, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(M[material])
    if bevel:
        mod = ob.modifiers.new("Architectural edge", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = ob.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def cylinder(name, x, z, y, radius, height, material, vertices=16, top=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius,
                                   radius2=radius if top is None else top,
                                   depth=height, location=(x, -z, y))
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(M[material])
    return ob


def ball(name, x, z, y, radius, material, segments=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=8,
                                        radius=radius, location=(x, -z, y))
    bpy.context.object.name = name
    bpy.context.object.data.materials.append(M[material])


def tube(name, points, radius, material):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for q, (x, z, y) in zip(spline.points, points):
        q.co = (x, -z, y, 1)
    ob = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(M[material])
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target="MESH")


def roof_gable(name,x,z,half_w,half_d,eave,ridge,material):
    vertices=[(x-half_w,-z-half_d,eave),(x,-z-half_d,ridge),(x+half_w,-z-half_d,eave),
              (x-half_w,-z+half_d,eave),(x,-z+half_d,ridge),(x+half_w,-z+half_d,eave)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],[(0,3,4,1),(1,4,5,2),(0,1,2),(3,5,4)])
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(M[material])


def sloped_walkway(name,x0,x1,z,y0,y1,width,material):
    vertices=[]
    for xx,yy in ((x0,y0),(x1,y1)):
        for zz in (z-width/2,z+width/2):
            vertices.append((xx,-zz,yy))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],[(0,1,3,2)])
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(M[material])


def label(name, body, x, z, y, size, material="light"):
    bpy.ops.object.text_add(location=(x, -z, y), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.object
    ob.name = name
    ob.data.body = body
    ob.data.size = size
    ob.data.extrude = .025
    ob.data.materials.append(M[material])
    bpy.ops.object.convert(target="MESH")


def tree(x, z, height=9):
    cylinder("Park tree trunk", x, z, height * .25, .37, height * .5, "wood", 8)
    for offset, radius in ((.62, 2.5), (.78, 2.1), (.96, 1.65)):
        ball("Layered broadleaf canopy", x, z, height * offset, radius, "leaf")


def solid(name,x,z,w,d,h):
    SOLIDS.append({"id":name,"min":[x-w/2,0,z-d/2],"max":[x+w/2,h,z+d/2]})


def fence(name,x0,z0,x1,z1):
    length=math.hypot(x1-x0,z1-z0)
    block(name+" low stone plinth",(x0+x1)/2,(z0+z1)/2,.36,
          length if abs(x1-x0)>abs(z1-z0) else .55,
          .55 if abs(x1-x0)>abs(z1-z0) else length,.72,"stone",.12)
    for height in (1.15,2.42):
        tube(name+" continuous bronze guard",[(x0,z0,height),(x1,z1,height)],.095,"gold")
    for i in range(math.floor(length/11)+1):
        t=i/max(1,math.floor(length/11))
        x,z=x0+(x1-x0)*t,z0+(z1-z0)*t
        cylinder(name+" slender steel picket",x,z,1.55,.11,2.15,"steel",8)
        ball(name+" gold finial",x,z,2.78,.19,"gold",8)


def grounds():
    block("Park lawn foundation", 0, 0, -.08, 1290, 890, .20, "grass")
    for x in (-644, 644):
        fence("Park side perimeter",x,-444,x,444)
        solid("Park perimeter side",x,0,3,890,2.2)
    for z in (-444, 444):
        if z > 0:
            for x in (-332, 332):
                fence("Park entrance fence wing",x-310,z,x+310,z)
                solid("Park perimeter entrance wing",x,z,620,3,2.2)
        else:
            fence("Park north perimeter",-644,z,644,z)
            solid("Park perimeter north",0,z,1290,3,2.2)
    block("Main festival boulevard", 0, 181, .07, 18, 520, .12, "paving", .45)
    block("Thrill zone cross boulevard", 0, 20, .065, 1080, 16, .12, "paving", .35)
    block("Halloween quarter path", 350, -152, .07, 14, 265, .12, "paving", .35)
    block("Coaster promenade", -315, -85, .065, 14, 610, .12, "paving", .35)
    block("Family games path", 0, 331, .065, 690, 13, .12, "paving", .35)
    block("Entry pedestrian forecourt", 0, 414, .08, 115, 48, .14, "paving", .6)
    cylinder("Skyline plaza paved roundel",390,10,.03,76,.12,"stone",64)
    cylinder("Festival court roundel",170,110,.03,58,.12,"cream",56)
    cylinder("Halloween quarter stone roundel",350,-155,.03,57,.12,"stone",48)
    cylinder("Entry garden roundel",0,355,.03,43,.12,"cream",48)
    cylinder("Festival fountain outer stone basin",170,110,.8,15,1.3,"stone",40)
    cylinder("Festival fountain water surface",170,110,1.5,12,.16,"blue",40)
    cylinder("Festival fountain central plinth",170,110,3.1,2.1,3.4,"gold",20)
    for i in range(12):
        a=i*math.pi/6
        tube("Festival fountain water arc",[(170+2*math.cos(a),110+2*math.sin(a),4.7),
                                           (170+7*math.cos(a),110+7*math.sin(a),6.0),
                                           (170+11*math.cos(a),110+11*math.sin(a),1.5)],.12,"glass")
    for x in (-43, 43):
        block("Grand gate limestone pier", x, 432, 7, 7, 7, 14, "cream", .5)
        cylinder("Gate finial", x, 432, 15, 3.7, 3.0, "gold")
    block("Grand gate lintel", 0, 432, 13.7, 79, 6, 4.4, "dark", 1.2)
    label("Park entry identity", "AUREOLE ADVENTURE", -33, 435.1, 13.1, 2.55)
    for x in (-37, 37):
        block("Ticket pavilion", x, 389, 3.25, 22, 16, 6.5, "cream", .75)
        block("Ticket glazing", x, 397.05, 3.1, 16, .13, 3.4, "glass")
        block("Ticket roof", x, 389, 6.75, 25, 19, .75, "gold", .8)
    for x in range(-585, 586, 65):
        for z in (-421, 421):
            if abs(x) < 72 and z > 0:
                continue
            tree(x, z, 8 + (abs(x) % 3))
    for z in range(-380, 380, 64):
        for x in (-615, 615):
            tree(x, z, 7.8)
    for x, z in [(-54, 268), (54, 268), (-54, 145), (54, 145),
                 (-540, 55), (-540, -130), (-345, -5), (345, -5),
                 (350, -145), (350, -385)]:
        cylinder("Decorative street lamp", x, z, 4.1, .15, 8.2, "dark", 12)
        ball("Warm globe lamp", x, z, 8.4, .61, "light")
    # Distinct Halloween planting reads from the upper-right plan view.
    for x in (166, 350, 535):
        for z in (-390, -170):
            tree(x, z, 11)
    for x in (-300, -260, -220, 180, 220, 260):
        block("Seating bench", x, 270, .45, 3, 1.2, .55, "wood", .1)
    for x,z in [(-92,382),(92,382),(240,350),(-80,110),(286,92),
                (-535,321),(-547,-360),(140,-120),(537,68)]:
        block("Festival food kiosk sculpted wall",x,z,2.7,17,11,5.4,"cream",.7)
        block("Festival food kiosk glazed counter",x,z+5.6,2.4,13,.12,2.8,"glass",.25)
        block("Festival kiosk folded gold roof",x,z,5.8,20,14,.6,"gold",1.2)
        block("Festival kiosk service awning",x,z+8,4.6,18,6,.2,"red" if x<0 else "blue",.5)
        solid("Festival food kiosk",x,z,17,11,5.4)
    for x,z in [(-88,305),(-85,218),(82,220),(88,310),
                (510,220),(455,210),(280,25),(220,-88),(-500,-5),(-210,-75)]:
        tree(x,z,9.8)
    for x,z in [(-115,265),(114,265),(270,110),(297,-125),(-294,-112)]:
        block("Raised flower garden stone edge",x,z,.28,20,8,.5,"stone",.3)
        for n in range(9):
            ball("Orange and purple festival planting",x-8+n*2,z+2*math.sin(n),.9,
                 .85,"orange" if n%2 else "purple",8)


def track(name, cx, cz, rx, rz, peak, material, phase, inverted=False, wooden=False):
    points = []
    count = 132
    for i in range(count + 1):
        t = 2 * math.pi * i / count
        wave = max(0, math.cos(t + phase)) ** 9
        hill = max(0, math.sin(3 * t - phase)) ** 6
        y = 10 + (peak - 10) * wave + peak * .26 * hill
        if inverted:
            y += 8 * math.sin(2*t) ** 2
        if wooden:
            y = 9 + (peak - 9) * max(0, math.sin(2*t + phase)) ** 4 + 5 * math.sin(7*t) ** 2
        points.append((cx + rx * math.cos(t), cz + rz * math.sin(t), y))
    for side in (-1, 1):
        rail = []
        for i, (x, z, y) in enumerate(points):
            ax, az, _ = points[max(0, i-1)]
            bx, bz, _ = points[min(count, i+1)]
            length = max(.01, math.hypot(bx-ax, bz-az))
            rail.append((x + side * (bz-az)/length * .65,
                         z - side * (bx-ax)/length * .65, y))
        tube(name + " continuous running rail " + str(side), rail, .19 if wooden else .16, material)
    tube(name + " steel central spine", [(x,z,y-.63) for x,z,y in points], .76 if wooden else .66, material)
    for i in range(0, count, 3):
        x, z, y = points[i]
        block(name + " track cross tie", x, z, y-.13, 2.3, .38, .25, "wood" if wooden else "steel", .06)
    for i in range(0, count, 8):
        x, z, y = points[i]
        if wooden:
            for dx in (-2, 2):
                cylinder(name + " timber bent", x+dx, z, y/2, .46, y, "wood", 8)
                solid(name+" timber bent",x+dx,z,1,1,y)
            block(name + " timber head beam", x, z, y-.7, 5, .4, .5, "wood")
            for q in range(max(1,int(y/9))):
                by=2+q*8
                if by>=y-2: break
                block(name+" timber level brace",x,z,by,5,.4,.34,"wood")
            tube(name+" timber cross brace",[(x-2,z,1),(x+2,z,y-1)],.18,"wood")
        else:
            for dx in (-1.5,1.5):
                cylinder(name + " structural pier", x+dx, z, y/2, .66, y, "steel", 12)
                cylinder(name + " pier footing", x+dx, z, .2, 1.4, .4, "stone", 12)
                solid(name+" track pier",x+dx,z,1.4,1.4,y)
            tube(name+" paired pier diagonal",[(x-1.5,z,1),(x+1.5,z,y-1)],.22,"steel")
            block(name+" pier head beam",x,z,y-.58,4.4,.9,.8,"steel",.2)
    # Trains are now animated in the client along this exact centreline.
    return points


def coaster_station(name, x, z, material):
    block(name + " platform", x, z, .36, 48, 25, .35, "paving", .35)
    for dx in (-18, 18):
        for dz in (-8, 8):
            cylinder(name + " canopy support", x+dx, z+dz, 4.8, .22, 9.3, "steel", 10)
    block(name + " floating station canopy", x, z, 9.65, 52, 29, .8, material, 1.8)
    for dz in (-11,11):
        for dx in (-15,15):
            block(name+" boarding windscreen wing",x+dx,z+dz,4.7,15,.12,7.6,"glass",.35)
    block(name + " ticket fascia", x, z+10.2, 3.4, 29, .4, 3, "dark", .3)
    label(name + " luminous marquee", name.upper(), x-13, z+10.5, 2.7, 1.65)
    for dx in (-12, -8, -4, 0, 4, 8, 12):
        block(name + " queue bollard", x+dx, z+18, .53, .25, .25, 1.05, "gold", .06)


def coasters():
    track("Leviathan", -362, -219, 220, 145, 90, "blue", 0.0)
    coaster_station("Leviathan", -365, -25, "blue")
    track("Wraith", -370, 149, 186, 127, 65, "purple", 1.3, inverted=True)
    coaster_station("Wraith", -372, 297, "purple")
    track("Timberfall", -20, 148, 146, 102, 42, "wood", .7, wooden=True)
    coaster_station("Timberfall", -37, 274, "wood")
    track("Eclipse", 0, -255, 94, 66, 27, "red", 1.8)
    # The dark ride is a real enclosing volume, with large glazing that
    # exposes the three-dimensional interior rather than a pasted picture.
    for x in (-120, 120):
        block("Eclipse hall stone side wall", x, -255, 14, 2, 196, 28, "dark", 1)
        solid("Eclipse side wall",x,-255,2,196,28)
    block("Eclipse hall rear wall", 0, -353, 14, 244, 2, 28, "dark", 1)
    solid("Eclipse rear wall",0,-353,244,2,28)
    for x in (-89, 89):
        block("Eclipse hall south wall with entry", x, -157, 14, 66, 2, 28, "dark", 1)
        solid("Eclipse entrance wing",x,-157,66,2,28)
    block("Eclipse hall glazed south facade", 0, -156, 18, 110, .16, 18, "glass")
    for x in (-68, 68):
        block("Eclipse hall curved roof wing", x, -255, 28.7, 104, 200, 1.2, "dark", 5)
        block("Eclipse hall light seam", x, -255, 29.35, 97, 3, .12, "red")
    for x in range(-108,109,18):
        crown=30+5*math.sin((x+120)/240*math.pi)
        tube("Eclipse wave roof rib",[(x,-352,crown),(x,-300,crown+2),(x,-255,crown+3),
                                      (x,-210,crown+2),(x,-158,crown)],.42,"steel")
    coaster_station("Eclipse", 0, -142, "red")
    track("Little Comet", 261, 185, 103, 79, 21, "orange", .4)
    coaster_station("Little Comet", 263, 291, "orange")
    # Distinct vertical inversion and corkscrew structures for the suspended ride.
    loop = []
    for i in range(49):
        t = 2 * math.pi * i / 48
        loop.append((-370 + 28 * math.sin(t), 148, 36 - 28 * math.cos(t)))
    for side in (-.7, .7):
        tube("Wraith vertical loop rail", [(x,z+side,y) for x,z,y in loop], .17, "purple")
    for x,z,y in [(-575, 133, 20), (-190, 133, 20)]:
        cylinder("Wraith inversion support", x,z,y/2,.4,y,"steel",12)


def towers():
    for name, x, height, hue in (("Skyfall Blue", 350, 110, "blue"),
                                 ("Skyfire Red", 430, 105, "red")):
        cylinder(name + " stone podium", x, -30, 2, 15, 4, "stone", 24)
        cylinder(name + " tubular ride mast", x, -30, height/2+3, 4.4, height, "steel", 24)
        solid(name+" mast",x,-30,9,9,height+3)
        for sx,sz in ((-3.4,0),(3.4,0),(0,-3.4),(0,3.4)):
            block(name+" continuous coloured shaft",x+sx,-30+sz,height/2+4,
                  1.0 if sz==0 else 1.5,1.5 if sz==0 else 1.0,height-8,hue,.25)
        for yy in range(15,int(height),15):
            cylinder(name+" illuminated mast collar",x,-30,yy,5.3,1.2,"gold",24)
        for side in (-1,1):
            block(name + " vertical colour fin", x+side*3.7, -30, height/2+4,
                  .45, 1.2, height-9, hue, .14)
        # The gondola is a moving client object, not a duplicate fixed halfway up.
        cylinder(name + " illuminated crown", x, -30, height+3.8, 6, 4.5, hue, 24, top=2)
        block(name + " queue terrace", x, 6, .25, 39, 19, .4, "paving", .4)
        label(name + " illuminated destination", name.upper(), x-16, 19, 4.2, 1.85)
    block("Twin-tower golden gateway", 390, -30, 14, 58, 3.2, 2.4, "gold", .7)


def family_and_games():
    # Architectural carousel and cups are separate recognisable ride volumes.
    cylinder("Carousel stepped plinth", 45, 337, .5, 29, 1, "gold", 48)
    cylinder("Carousel rotating deck", 45, 337, 1.1, 27, .4, "cream", 48)
    cylinder("Carousel central mast", 45, 337, 7, 1.2, 11, "gold", 20)
    solid("Carousel centre",45,337,2.4,2.4,13)
    cylinder("Carousel tent roof", 45, 337, 12.0, 29, 5, "red", 48, top=1.5)
    for i in range(16):
        a=i*2*math.pi/16
        x,z=45+20*math.cos(a),337+20*math.sin(a)
        cylinder("Carousel gilded pole",x,z,6.3,.11,9.4,"gold",8)
        ball("Carousel sculpted horse body",x,z,2.3,1.5,"white")
        cylinder("Carousel horse neck",x+.7,z,3.0,.38,1.5,"white",10)
        ball("Carousel horse head",x+1.2,z,3.6,.54,"cream")
    cylinder("Teacup turntable",160,337,.48,28,.7,"purple",48)
    cylinder("Teacup central urn",160,337,2.2,2,4,"gold",24)
    for i in range(9):
        a=i*2*math.pi/9
        x,z=160+18*math.cos(a),337+18*math.sin(a)
        cylinder("Spinning cup shell",x,z,1.0,3,1.5,"red" if i%3==0 else "blue" if i%3==1 else "cream",20,top=3.4)
        cylinder("Cup seating ring",x,z,1.8,2.5,.28,"gold",20)
        cylinder("Cup central wheel",x,z,1.9,.52,.55,"steel",12)
    block("Basketball skill court",-140,345,.12,64,36,.18,"asphalt",.4)
    for dx in (-19,0,19):
        block("Basketball backboard",-140+dx,329,4.1,5,.25,3.2,"white",.2)
        tube("Basketball iron hoop",[(-140+dx+1.1*math.cos(i*2*math.pi/24),332+1.1*math.sin(i*2*math.pi/24),3.35) for i in range(25)],.11,"red")
        cylinder("Basketball support pole",-140+dx,326,2,.25,4,"steel",12)
    block("Foam-pit waterproof basin",-270,345,.12,88,47,.2,"blue",.7)
    for i in range(72):
        x=-310+(i*37%80)
        z=324+(i*19%42)
        ball("Soft foam safety ball",x,z,.66,.62,["foam","white","orange","purple"][i%4],8)
    for i in range(12):
        block("Elevated balance beam section",-306+i*6.3,345+3.1*math.sin(i*.7),2.05,6.8,1.25,.3,"wood",.22)
    sloped_walkway("Foam-walk ascending approach",-321,-309,345,.22,2.2,2.2,"wood")


HAUNT_WALLS = []


def haunt_wall(name, x, z, y, w, d, h, mat):
    block(name,x,z,y,w,d,h,mat,.12)
    HAUNT_WALLS.append({"id":name,"min":[x-w/2,0,z-d/2],"max":[x+w/2,h,z+d/2]})


def haunted_house(name, cx, cz, style):
    mat = "dark" if style == "lab" else "stone"
    block(name+" walkable lower floor",cx,cz,.13,144,154,.25,"paving",.3)
    # The south entrance and north exit are 14 m wide. Five alternating
    # partitions make a single serpent route through six real rooms.
    for sx in (-72,72):
        haunt_wall(name+" exterior side",cx+sx,cz,7,2.2,154,14,mat)
    for zz,face in ((cz+76,"south"),(cz-76,"north")):
        for sx in (-40,40):
            haunt_wall(name+" "+face+" split portal wall",cx+sx,zz,7,65,2.2,14,mat)
    for i, dz in enumerate((51,26,1,-24,-49)):
        gap_right=i%2==0
        wx=cx-9 if gap_right else cx+9
        haunt_wall(name+" stage partition "+str(i+1),wx,cz+dz,4,124,1.5,8,mat)
        # Raised cornice and door jamb make each room legible from the route.
        cylinder(name+" passage lantern",cx+(63 if gap_right else -63),cz+dz,5,.75,1.2,"light",12)
    for sx in (-55,55):
        for dz in (-60,60):
            cylinder(name+" corner buttress",cx+sx,cz+dz,8,.95,16,"wood" if style=="manor" else "steel",8)
    for dx in (-46,46):
        if style == "manor":
            roof_gable(name+" steep double gable roof",cx+dx,cz,47,77,15.4,30,"purple")
            for rz in (-48,0,48):
                block("Manor copper dormer",cx+dx,cz+rz,23,9,10,7,"cream",.5)
                roof_gable("Manor dormer peaked roof",cx+dx,cz+rz,5,6,26.5,31,"purple")
        else:
            block(name+" secure cantilevered roof",cx+dx,cz,16.8,56,160,1.5,mat,2)
            for rz in (-54,0,54):
                block("Midnight Lab roof light well",cx+dx,cz+rz,18.1,42,4,.25,"glass",.8)
    for dx in (-30,30):
        block(name+" weathered portico",cx+dx,cz+78,12.4,10,5,20,mat,1)
        block(name+" portal roof",cx+dx,cz+81,22.5,15,7,.7,"purple" if style=="manor" else "red",.4)
    label(name+" gate lettering",name.upper(),cx-51,cz+82,12.3,3.1,"light")
    if style == "manor":
        for dx in (-55,55):
            cylinder("Manor octagonal turret",cx+dx,cz+62,12,5.5,24,"stone",8)
            cylinder("Manor pointed turret roof",cx+dx,cz+62,27,7,7,"purple",8,top=.4)
            for yy in (7,14,20):
                block("Manor arched dark window",cx+dx,cz+67.6,yy,2.4,.25,3.8,"dark",.4)
                block("Manor stone window sill",cx+dx,cz+67.9,yy-2.1,3.5,.5,.4,"cream",.1)
        for dx in (-49,-30,30,49):
            block("Manor facade pilaster",cx+dx,cz+76,8.7,1.5,2.0,17.4,"cream",.3)
            block("Manor upper mullioned window",cx+dx,cz+77.2,10,4,.25,5,"glass",.5)
        block("Manor elevated clock gable",cx,cz+75.5,20,21,3,11,"stone",2)
        cylinder("Manor clock face",cx,cz+77.5,20,3,.25,"gold",24)
    else:
        for dx in (-58,-29,29,58):
            block("Midnight Lab exterior glowing fin",cx+dx,cz+77.2,10,.7,1.0,19,"red",.25)
            block("Midnight Lab high security glazing",cx+dx+10,cz+77.4,10,13,.12,8,"glass",1.2)
        for yy in (6,13,20):
            tube("Midnight Lab power conduit",[(cx-66,cz+77.5,yy),(cx+66,cz+77.5,yy)],.19,"steel")
        cylinder("Midnight Lab command observatory",cx,cz,20,19,10,"dark",32)
        cylinder("Midnight Lab warning crown",cx,cz,25.5,19,.75,"red",32)
    for i,dz in enumerate((62,38,14,-10,-34,-61)):
        x=cx+(-43 if i%2==0 else 43)
        if style=="manor":
            block("Antique haunted portrait",x,cz+dz,4.0,3.4,.3,5.2,"gold",.2)
            ball("Manor apparition sculpt",x+4,cz+dz,3.2,1.3,"cream")
        else:
            cylinder("Laboratory specimen tank",x,cz+dz,3.6,2.5,6.8,"glass",16)
            ball("Specimen floating volume",x,cz+dz,3.3,1.0,"foam")
            cylinder("Emergency beacon",x+4,cz+dz,6.5,.6,.7,"red",12)


def haunts():
    haunted_house("The Manor",245,-280,"manor")
    haunted_house("Midnight Laboratory",445,-280,"lab")
    for x in (190,290,390,490):
        cylinder("Halloween pumpkin pedestal",x,-176,.55,1.5,1.1,"wood",10)
        ball("Carved pumpkin volume",x,-176,1.5,1.2,"orange")


grounds()
coasters()
towers()
family_and_games()
haunts()

# Keep the named, individually editable production scene. The runtime GLB
# joins objects by material so thousands of sculptural details need only a
# handful of draw calls near the park.
bpy.ops.wm.save_as_mainfile(filepath=str(EDIT/"amusement-park-source.blend"),compress=True)
for material in M.values():
    meshes=[ob for ob in bpy.context.scene.objects if ob.type=="MESH" and
            len(ob.data.materials)>0 and ob.data.materials[0]==material]
    if len(meshes)<2:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for ob in meshes:
        ob.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.object.join()
    meshes[0].name="Runtime merged " + material.name
    for polygon in meshes[0].data.polygons:
        polygon.material_index=0
    meshes[0].data.materials.clear()
    meshes[0].data.materials.append(material)

asset = OUT / "amusement-park.glb"
bpy.ops.export_scene.gltf(filepath=str(asset), export_format="GLB", export_apply=True)
print("EXPORTED", asset, asset.stat().st_size, flush=True)

target=Vector((0,0,28))
camera_data=bpy.data.cameras.new("Aureole park review camera")
camera=bpy.data.objects.new("Aureole park review camera",camera_data)
bpy.context.collection.objects.link(camera)
camera.location=(1150,-1550,1010)
camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
camera_data.type="ORTHO"
camera_data.ortho_scale=1700
camera_data.clip_end=5000
bpy.context.scene.camera=camera
for name,location,energy in (("sun",(-450,-600,1250),18000),("fill",(750,700,850),13500)):
    lamp_data=bpy.data.lights.new(name,"AREA")
    lamp_data.energy=energy
    lamp_data.shape="DISK"
    lamp_data.size=800
    lamp=bpy.data.objects.new(name,lamp_data)
    bpy.context.collection.objects.link(lamp)
    lamp.location=location
    lamp.rotation_euler=(target-lamp.location).to_track_quat("-Z","Y").to_euler()
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=1500
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.filepath=str(EDIT/"amusement-park-preview.png")
scene.world=bpy.data.worlds.new("Park review sky")
scene.world.use_nodes=True
scene.world.node_tree.nodes.get("Background").inputs["Color"].default_value=(.46,.62,.73,1)
scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.85
scene.view_settings.view_transform="Standard"
scene.view_settings.look="Medium High Contrast"
bpy.ops.render.render(write_still=True)
for suffix,location,focus,scale in (
    ("towers",(850,-620,360),(390,30,52),490),
    ("haunts",(800,-300,220),(350,280,17),380),
    ("coasters",(-850,640,400),(-320,40,32),750),
):
    camera.location=location
    aim=Vector(focus)
    camera.rotation_euler=(aim-camera.location).to_track_quat("-Z","Y").to_euler()
    camera_data.ortho_scale=scale
    scene.render.filepath=str(EDIT/("amusement-park-"+suffix+"-preview.png"))
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(EDIT/"amusement-park.blend"),compress=True)

manifest={
    "id":PLAN["id"],"name":PLAN["name"],"units":"METERS","upAxis":"Y",
    "file":asset.name,"center":PLAN["center"],"footprint":PLAN["footprint"],
    "entrance":PLAN["entrance"],"attractions":PLAN["attractions"],
    "hauntRoutes":PLAN["hauntRoutes"],"hauntWallColliders":HAUNT_WALLS,
    "structuralColliders":SOLIDS,
    "provenance":{"type":"ORIGINAL_BLENDER_GEOMETRY","externalAssets":[],"externalImages":[]},
    "limitations":PLAN["limitations"]}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
