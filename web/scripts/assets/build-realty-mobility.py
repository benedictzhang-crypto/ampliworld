"""Original Blender kit for property offices, car rental, city vehicles and helipads."""
from pathlib import Path
import math
import bpy

OUT=Path(__file__).resolve().parents[2]/'public/assets/3d/ampliworld/GC-REALTY-MOBILITY-001'
SRC=Path(__file__).resolve().parents[2]/'asset-library/blender/realty-mobility'
OUT.mkdir(parents=True,exist_ok=True); SRC.mkdir(parents=True,exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    global mat
    mat={}
    for name,color,metal,rough in [
        ('stone',(.70,.72,.70,1),.02,.67),('ivory',(.87,.86,.80,1),.02,.52),
        ('glass',(.21,.40,.47,.54),.1,.16),('bronze',(.55,.41,.20,1),.72,.29),
        ('dark',(.13,.18,.21,1),.35,.52),('asphalt',(.19,.24,.26,1),.04,.91),
        ('white',(.89,.92,.91,1),.1,.4),('amber',(.85,.51,.12,1),.35,.37),
        ('green',(.15,.43,.32,1),.02,.7),('rubber',(.035,.045,.05,1),.01,.95)]:
        m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
        p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color
        p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
        if name=='glass':p.inputs['Alpha'].default_value=color[3];m.surface_render_method='DITHERED'
        mat[name]=m

def box(name,xyz,size,material,bevel=.0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat[material])
    if bevel:
        m=o.modifiers.new('Cast edge','BEVEL');m.width=bevel;m.segments=3;m.limit_method='ANGLE'
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('Weighted normal','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def cylinder(name,xyz,radius,depth,material,vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=xyz)
    o=bpy.context.object;o.name=name;o.data.materials.append(mat[material]);return o

def label(name,body,xyz,size=1):
    bpy.ops.object.text_add(location=xyz,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name
    o.data.body=body;o.data.size=size;o.data.extrude=.025;o.data.materials.append(mat['white']);bpy.ops.object.convert(target='MESH')

def facade(width,height,depth):
    box('Solid rear structure',(0,-depth/2+.25,height/2),(width,.5,height),'stone')
    for x in (-width/2+.25,width/2-.25):box('Full-depth side wall',(x,0,height/2),(.5,depth,height),'stone')
    box('Ground slab',(0,0,.22),(width,depth,.44),'stone',.12)
    for x in (-width/2+2,-width/4,width/4,width/2-2):
        box('True glazing frame',(x,depth/2-.1,height/2),(.15,.2,height-.8),'bronze')
    for x in (-width/4,width/4):box('Floor-to-ceiling showroom glass',(x,depth/2,height/2),(width/2-.9,.09,height-.8),'glass')
    box('Entrance framed glazing',(0,depth/2+.08,2.2),(3.4,.1,4.4),'glass')

def brokerage():
    facade(28,8.4,17)
    box('Stone overhanging canopy',(0,0,8.65),(31,20,.52),'ivory',.6)
    for x in (-10.5,10.5):
        box('Bronze balcony return',(x,7.8,5.9),(3.1,1.8,.22),'bronze',.12)
        box('Display property table',(x,5.5,1.1),(3.1,1.8,.5),'ivory',.2)
        box('Scaled architectural model',(x,5.5,1.8),(1.3,1.0,.9),'stone',.1)
    label('Agency fascia','AUREA REALTY',(-5.4,8.83,5.55),1.03)

def developer():
    facade(32,18,21)
    for level in (7,12):
        box('Continuous cantilever terrace',(0,0,level),(34,23,.55),'ivory',.5)
        for x in (-14,-9,-4,4,9,14):box('Vertical bronze fin',(x,10.75,level+2.2),(.18,.4,4.4),'bronze')
    box('Faceted roof crest',(0,-1,18.6),(34,22,.8),'ivory',1.4)
    for x in (-11,11):cylinder('Entry tree planter',(x,14,.5),1.3,1,'stone')
    label('Developer sign','AMPLI DEVELOPMENTS',(-9.3,11.0,14.4),.96)

def car(x,z,paint):
    box('Fleet fastback body',(x,z,1),(4.6,2.05,1.15),paint,.45)
    box('Cabin glass',(x-.28,z,1.72),(2.25,1.76,.72),'glass',.27)
    for dx in (-1.5,1.5):
        for dy in (-.92,.92):
            w=cylinder('Tyre',(x+dx,z+dy,.48),.47,.26,'rubber',20);w.rotation_euler[0]=math.pi/2

def rental():
    facade(30,7.5,18)
    box('Angled rentable fleet canopy',(0,13.5,6.1),(33,10,.48),'white',.5)
    for x in (-14,14):box('Canopy steel column',(x,16,3.1),(.32,.32,6.2),'bronze')
    for x,paint in [(-10,'ivory'),(0,'dark'),(10,'green')]:car(x,15,paint)
    label('Rental identity','AUREA FLEET',(-5.9,9.2,5.0),1.16)

def utility_vehicle(kind):
    box('Commercial chassis',(0,0,1.0),(7,2.45,.48),'dark',.12)
    box('Cab over engine',(-2,0,1.9),(2.15,2.32,1.65),'ivory',.36)
    box('Large windshield',(-2,1.19,2.03),(1.55,.06,.86),'glass',.13)
    for x in (-2.45,2.25):
        for y in (-1.15,1.15):
            w=cylinder('Heavy tyre',(x,y,.57),.55,.31,'rubber',22);w.rotation_euler[0]=math.pi/2
    if kind=='sprinkler':
        tank=cylinder('Stainless water tank',(1.25,0,2.05),1.12,3.65,'stone',32);tank.rotation_euler[1]=math.pi/2
        box('Rear irrigation boom',(3.34,0,1.23),(.14,3.8,.14),'bronze')
        for y in (-1.7,-.85,0,.85,1.7):cylinder('Mist nozzle',(3.43,y,1.18),.11,.18,'amber',12)
    else:
        box('Sweeper hopper',(1.3,0,2.0),(3.7,2.1,1.8),'green',.4)
        for y in (-1.15,1.15):cylinder('Rotary curb brush',(1.2,y,.26),.57,.14,'amber',20)

def helipad():
    cylinder('Structural landing deck',(0,0,.32),13,.65,'dark',64)
    cylinder('Safety perimeter gold',(0,0,.68),12.1,.08,'amber',64)
    cylinder('Landing surface',(0,0,.74),11.4,.06,'asphalt',64)
    box('H left bar',(-2,0,.81),(1.05,7,.08),'white')
    box('H right bar',(2,0,.81),(1.05,7,.08),'white')
    box('H crossbar',(0,0,.81),(4.4,1.0,.08),'white')
    for i in range(12):
        a=i*math.tau/12
        cylinder('Perimeter landing lamp',(11.7*math.cos(a),11.7*math.sin(a),.88),.15,.2,'white',12)

for name,build in [('brokerage',brokerage),('developer',developer),('car-rental',rental),
                   ('sprinkler',lambda:utility_vehicle('sprinkler')),
                   ('sweeper',lambda:utility_vehicle('sweeper')),('helipad',helipad)]:
    reset();build();bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_apply=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/(name+'.blend')),compress=True)
    print('EXPORTED',name,flush=True)
