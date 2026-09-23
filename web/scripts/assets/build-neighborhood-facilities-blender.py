"""Editable metric street buildings: ground-floor kitchens, express hotels,
fire stations and two secure justice facilities. All models are original.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
ASSET=ROOT/'public/assets/3d/ampliworld/GC-NEIGHBORHOOD-001'
SOURCE=ROOT/'asset-library/blender/neighborhood'
ASSET.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)

def mat(name,rgb,metal=0,rough=.55,alpha=1):
    material=bpy.data.materials.new(name);material.diffuse_color=(*rgb,alpha);material.use_nodes=True
    p=material.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if alpha<1:
        material.surface_render_method='BLENDED';p.inputs['Alpha'].default_value=alpha
    return material
def point(x,y,z):return (x,-z,y)
def box(name,x,y,z,w,h,d,m,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=point(x,y,z));o=bpy.context.object;o.name=name;o.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('architectural chamfer','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o
def cylinder(name,x,y,z,r,h,m,vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=point(x,y,z))
    bpy.context.object.name=name;bpy.context.object.data.materials.append(m)
def materials():
    global limestone,concrete,glass,bronze,wood,dark,green,red,blue
    limestone=mat('textured limestone',(.68,.65,.57),rough=.8)
    concrete=mat('warm architectural concrete',(.53,.55,.54),rough=.78)
    glass=mat('real building glazing',(.23,.42,.48),metal=.13,rough=.14,alpha=.58)
    bronze=mat('brushed bronze',(.54,.39,.22),metal=.77,rough=.27)
    wood=mat('oak and walnut',(.47,.29,.16),rough=.57)
    dark=mat('graphite frame',(.09,.13,.14),metal=.55,rough=.34)
    green=mat('live planting',(.17,.34,.2),rough=.88)
    red=mat('emergency red',(.76,.17,.13),rough=.35)
    blue=mat('municipal blue',(.22,.36,.48),rough=.48)

def lobby(name,w,d,height=4.2):
    box(name+' floor',0,.09,0,w,.18,d,limestone,.07)
    box(name+' rear',0,height/2,-d/2+.15,w,height,.3,concrete,.07)
    for side in (-1,1):
        box(name+' side '+str(side),side*(w/2-.16),height/2,0,.32,height,d,concrete,.07)
        box(name+' shopfront '+str(side),side*(w/4+1),height/2,d/2-.05,w/2-2.5,height-.2,.12,glass,.03)
        box(name+' entry pier '+str(side),side*1.6,height/2,d/2,.16,height,.2,bronze,.025)
    box(name+' transom',0,height-.24,d/2,w,.48,.32,limestone,.06)

def mixed(variant):
    w,d=16,12;levels=[5,6,7][variant];floor_h=3.7
    lobby('ground-floor independent kitchen',w,d)
    box('warm food counter',0,1.05,0,6.4,1.4,1.2,wood,.11)
    for side in (-1,1):
        box('dining table '+str(side),side*4.3,.78,2.4,2.1,.14,1.4,wood,.09)
        for z in (1.4,3.4):box('dining chair '+str(side)+str(z),side*4.3,.49,z,.75,.74,.72,bronze,.08)
        box('awning '+str(side),side*4.2,4.13,7.1,6.2,.2,2.4,wood,.2)
    for level in range(1,levels):
        y=4.15+(level-1)*floor_h
        setback=(level%3==0 and variant==2)*.55
        box('real slab '+str(level),0,y-.1,-setback,w+.35,.28,d+.25,limestone,.15)
        box('rear infill '+str(level),0,y+floor_h*.47,-d/2+.18,w,floor_h*.91,.27,concrete,.08)
        for side in (-1,1):
            box('side core '+str(level)+str(side),side*(w/2-.19),y+floor_h*.47,0,.38,floor_h*.91,d,concrete,.09)
        for bay,x in enumerate((-5.5,0,5.5)):
            box('window '+str(level)+str(bay),x,y+1.7,d/2-.035,4.55,2.55,.12,glass,.04)
            box('window head '+str(level)+str(bay),x,y+3.08,d/2+.02,4.8,.2,.25,bronze,.04)
            if variant==1 or (level+bay)%3==0:
                box('projecting balcony '+str(level)+str(bay),x,y+.15,d/2+1.1,4.8,.26,2.2,limestone,.32)
                box('glass balcony rail '+str(level)+str(bay),x,y+.78,d/2+2.15,4.35,1.15,.1,glass,.055)
            if variant==2 and bay!=1:
                box('sculpted fin '+str(level)+str(bay),x+2.4,y+1.8,d/2+.1,.28,3.2,.65,limestone,.12)
    roof=4.15+(levels-1)*floor_h
    box('crowned roof',0,roof,-.2,w+.9,.45,d+.5,limestone,.34)
    for side in (-1,1):
        box('roof planter '+str(side),side*5.8,roof+.34,-3.2,2.8,.68,2.2,concrete,.12)
        for i in range(3):cylinder('roof planting '+str(side)+str(i),side*(4.9+i*.55),roof+.8,-3.2,.34,.45,green,9)
    return {'footprint':[16,12],'floors':levels,'groundFloor':'independent restaurant with physical furniture','upperFloors':'exterior only; occupancy not assigned'}

def hotel():
    w,d=28,18;floors=5;h=3.5
    lobby('express hotel',w,d)
    box('check-in desk',0,1.08,1.5,7,1.3,1.25,wood,.14)
    for side in (-1,1):
        box('reception seating '+str(side),side*8,.72,-1.4,5,1.1,2.1,wood,.18)
        box('entry monolith '+str(side),side*12,4.2,10,1.3,8.4,1.4,limestone,.16)
    for f in range(1,floors):
        y=4.25+(f-1)*h
        box('structural hotel floor '+str(f),0,y,0,w+.3,.32,d+.4,limestone,.13)
        box('rear hotel wall '+str(f),0,y+h/2,-d/2+.14,w,h,.28,concrete,.07)
        for side in (-1,1):box('side hotel wall '+str(f)+str(side),side*(w/2-.14),y+h/2,0,.28,h,d,concrete,.07)
        for x in (-11.2,-8.4,-5.6,-2.8,0,2.8,5.6,8.4,11.2):
            box('guest room bay '+str(f)+str(x),x,y+h*.53,d/2-.07,2.2,2.22,.13,glass,.045)
            box('guest sill '+str(f)+str(x),x,y+.88,d/2+.02,2.3,.13,.25,bronze,.045)
    roof=4.25+(floors-1)*h
    box('rounded hotel roof',0,roof+.13,-.15,w+1,.35,d+.7,limestone,.27)
    box('elevator machine enclosure',4,roof+1.65,-3.6,6,3,5,concrete,.23)
    return {'footprint':[28,18],'floors':5,'type':'small express hotel','interiors':'ground-floor lobby only'}

def fire_station():
    w,d=30,20
    box('station paved apron',0,.07,11,34,.14,40,concrete,.08)
    box('station shell rear',0,4,-10,w,8,.35,limestone,.09)
    for side in (-1,1):box('station side '+str(side),side*14.8,4,0,.4,8,d,limestone,.09)
    box('station mezzanine',0,8.15,0,31,.34,21,limestone,.24)
    box('operations floor',0,10.05,0,30,3.4,20,concrete,.14)
    box('upper glass front',0,10.03,10,28,3,.12,glass,.04)
    box('top cornice',0,11.92,0,31.7,.44,21.5,limestone,.35)
    for x in (-9,0,9):
        box('open response bay lintel '+str(x),x,6.5,10.15,8.5,1.4,.4,red,.06)
        for side in (-1,1):box('open response bay pier '+str(x)+str(side),x+side*4.15,3.2,10.15,.35,6.4,.4,dark,.05)
    for x in (-9,0,9):
        box('emergency truck chassis '+str(x),x,1.05,0,2.55,.65,5.5,dark,.12)
        box('emergency truck cab '+str(x),x,2.3,1.5,2.5,1.9,2.4,red,.18)
        box('emergency truck body '+str(x),x,2.35,-1.2,2.6,2,3.4,red,.17)
        for z in (-1.9,1.9):
            for side in (-1,1):cylinder('truck wheel '+str(x)+str(z)+str(side),x+side*1.22,.66,z,.51,.3,dark)
    return {'footprint':[30,20],'responseBays':3,'floors':2,'vehicles':3}

def justice(kind):
    prison=(kind=='prison');w,d=(36,26) if prison else (30,20);floors=3 if prison else 2;h=4
    box('secured campus court',0,.08,8,w+2,.16,38,concrete,.08)
    for f in range(floors):
        y=f*h
        box('secure floor '+str(f),0,y+.1,0,w,.24,d,limestone,.08)
        box('rear secure wall '+str(f),0,y+2,-d/2+.17,w,4,.34,concrete,.07)
        for side in (-1,1):box('secure sidewall '+str(f)+str(side),side*(w/2-.18),y+2,0,.36,4,d,concrete,.07)
        for x in range(-int(w/2)+3,int(w/2)-2,3):
            box('inset secure window '+str(f)+str(x),x,y+2.3,d/2-.08,1.1,1.45,.09,glass,.04)
            for bar in (-.35,0,.35):box('secure window bar '+str(f)+str(x)+str(bar),x+bar,y+2.3,d/2+.04,.055,1.55,.06,dark,.015)
    top=floors*h
    box('secure roof',0,top+.25,0,w+.7,.5,d+.7,limestone,.21)
    for x in (-w/2+1,w/2-1):
        box('secure fence vertical '+str(x),x,2.15,8,.13,4.3,40,dark,.04)
        box('guard tower platform '+str(x),x,5.1,d/2+11,3.7,.35,3.7,concrete,.08)
        box('guard tower glazing '+str(x),x,7.0,d/2+11,3.2,3.2,3.2,glass,.08)
        box('guard tower roof '+str(x),x,8.8,d/2+11,4.2,.3,4.2,limestone,.11)
    box('secure north cross fence',0,2.15,-12,w,4.3,.13,dark,.04)
    for side in (-1,1):box('secure south cross fence '+str(side),side*(w/4+1.5),2.15,28,w/2-3,4.3,.13,dark,.04)
    box('entry security gate',0,2,28,6,4,.35,dark,.07)
    box('secure central path',0,.15,d/2+7,5.5,.16,18,limestone,.07)
    return {'footprint':[w,d],'floors':floors,'role':'regional prison' if prison else 'court-linked detention intake','interior':'not enterable; secured exterior and gate only'}

builders=[('mixed-1',lambda:mixed(0)),('mixed-2',lambda:mixed(1)),('mixed-3',lambda:mixed(2)),('express-hotel',hotel),('fire-station',fire_station),('detention',lambda:justice('detention')),('prison',lambda:justice('prison'))]
manifest={'id':'GC-NEIGHBORHOOD-001','units':'METERS','upAxis':'Y','provenance':'Original editable Blender meshes; no external photos, meshes or brands.','variants':{}}
for name,build in builders:
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0;materials()
    detail=build()
    for material in list(bpy.data.materials):
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==material]
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        bpy.context.object.name='facility '+material.name
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    target=ASSET/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_apply=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')),compress=True)
    detail.update({'file':target.name,'bytes':target.stat().st_size,'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)})
    manifest['variants'][name]=detail
    world=bpy.data.worlds.new('facility daylight');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.62,.71,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.78
    bpy.context.scene.world=world
    bpy.ops.object.light_add(type='SUN',location=(7,-9,15));bpy.context.object.data.energy=2.2
    bpy.ops.object.camera_add(location=(34,-43,28))
    camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,5))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=44 if name.startswith('mixed') else 60
    bpy.context.scene.camera=camera;bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=8
    bpy.context.scene.render.resolution_x=800;bpy.context.scene.render.resolution_y=640
    bpy.context.scene.render.filepath=str(SOURCE/(name+'-preview.png'))
    bpy.ops.render.render(write_still=True)
    print('NEIGHBORHOOD',name,detail['triangles'],detail['bytes'],flush=True)
(ASSET/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
