"""Author four physical service venues in metres, with distinct usable interiors.

Run: /Applications/Blender.app/Contents/MacOS/Blender -b -t 2 -P scripts/assets/build-fitness-arcade-blender.py
The built GLBs are game Y-up; no image facade or third-party asset is used.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'public/assets/3d/ampliworld/GC-FITNESS-ARCADE-001'
SOURCE = ROOT / 'asset-library/blender/services'
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0

def mat(name, rgb, metal=0, rough=.5, alpha=1):
    result=bpy.data.materials.new(name)
    result.diffuse_color=(*rgb,alpha)
    result.use_nodes=True
    bsdf=result.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*rgb,alpha)
    bsdf.inputs['Metallic'].default_value=metal
    bsdf.inputs['Roughness'].default_value=rough
    if alpha<1:
        result.surface_render_method='BLENDED'
        bsdf.inputs['Alpha'].default_value=alpha
    return result

def configure_materials():
    global stone,white,dark,glass,bronze,timber,rubber,blue,green,purple,cyan,red
    stone=mat('warm limestone',(.75,.72,.65),rough=.75)
    white=mat('gallery white',(.9,.89,.84),rough=.6)
    dark=mat('graphite steel',(.09,.13,.15),metal=.6,rough=.32)
    glass=mat('clear tinted glass',(.53,.73,.76),rough=.11,alpha=.32)
    bronze=mat('satin champagne metal',(.63,.45,.24),metal=.78,rough=.24)
    timber=mat('warm oak',(.51,.33,.19),rough=.55)
    rubber=mat('charcoal rubber',(.09,.09,.10),rough=.9)
    blue=mat('pool ceramic and water',(.12,.49,.62),metal=.15,rough=.22)
    green=mat('living planting',(.14,.36,.22),rough=.85)
    purple=mat('arcade violet',(.47,.20,.61),metal=.28,rough=.32)
    cyan=mat('arcade cyan',(.12,.77,.81),metal=.22,rough=.25)
    red=mat('arcade coral',(.84,.22,.25),rough=.35)

def point(x,y,z): return (x,-z,y)
def cube(name,x,y,z,w,h,d,material,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=point(x,y,z))
    obj=bpy.context.object;obj.name=name;obj.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material)
    if bevel:
        mod=obj.modifiers.new('soft architectural edges','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return obj
def cylinder(name,x,y,z,r,h,material,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=point(x,y,z))
    obj=bpy.context.object;obj.name=name;obj.data.materials.append(material)
    return obj
def ground(name,w,d,material,side_open=False):
    cube(name+' polished base',0,.1,0,w,.2,d,material,.08)
    cube(name+' recessed rear wall',0,2.55,-d/2+.16,w,5.1,.3,stone,.07)
    for side in (-1,1):
        if side_open:
            cube(name+' side glass '+str(side),side*(w/2-.16),2.55,0,.19,5.1,d-.4,glass,.03)
            for z in (-d/2+1,-d/4,0,d/4,d/2-1):
                cube(name+' side stone fin '+str(side)+' '+str(z),side*(w/2-.16),2.6,z,.52,5.2,.55,stone,.07)
        else:cube(name+' side masonry '+str(side),side*(w/2-.16),2.55,0,.32,5.1,d,stone,.08)
        cube(name+' front clear pane '+str(side),side*(w/4+1.15),2.1,d/2-.06,w/2-2.5,4.2,.12,glass,.025)
        cube(name+' entrance jamb '+str(side),side*1.55,2,d/2,.15,4,.24,bronze,.025)
    cube(name+' high entry lintel',0,4.75,d/2,w,.6,.35,white,.09)
    cube(name+' open door canopy',0,5.15,d/2+1.5,w+1,.22,3.0,stone,.22)
    cube(name+' illuminated fascia',0,5.04,d/2+2.92,w-.6,.09,.18,bronze,.04)
    for x in range(-int(w/2)+2,int(w/2)-1,4):
        cube(name+' vertical fin '+str(x),x,2.45,d/2+.03,.10,4.4,.42,bronze,.025)

def treadmill(x,z,index):
    cube('treadmill deck '+str(index),x,.33,z,1.0,.22,2.15,rubber,.08)
    cube('treadmill console '+str(index),x,1.48,z-.83,.78,.45,.16,dark,.05)
    for side in (-1,1):
        cube('treadmill hand rail '+str(index)+str(side),x+side*.48,1.06,z-.42,.055,1.12,1.0,bronze,.025)

def weight_rack(x,z,index):
    for side in (-1,1):
        cube('squat upright '+str(index)+str(side),x+side*.82,1.25,z,.1,2.5,.12,dark,.025)
        for y in (.56,1.2,1.8,2.25):
            cube('rack catch '+str(index)+str(side)+str(y),x+side*.79,y,z+.2,.25,.07,.28,bronze)
    cube('barbell '+str(index),x,1.4,z+.21,2.1,.07,.07,bronze)
    for side in (-1,1): cylinder('loaded plate '+str(index)+str(side),x+side*.95,1.4,z+.21,.27,.12,dark)

def bench(x,z,index):
    cube('bench cushion '+str(index),x,.76,z,.56,.15,1.65,rubber,.08)
    for dz in (-.5,.5):cube('bench frame '+str(index)+str(dz),x,.4,z+dz,.6,.7,.08,bronze)

def plants(w,d):
    for x in (-w/2+1,w/2-1):
        cube('stone planted border '+str(x),x,.5,d/2+3,1.15,1,1.4,stone,.1)
        cylinder('columnar planter '+str(x),x,1.5,d/2+3,.4,1.7,green,9)

def premium():
    w,d=30,20;ground('aquatic club',w,d,white,side_open=True)
    # Pool sits in a real recessed rear volume, separate from the front workout floor.
    cube('aquatic basin rim',-6,.16,-4,13,.18,7,stone,.12)
    cube('pool water surface',-6,.26,-4,11.8,.025,5.7,blue,.08)
    for x in (-9.5,-6,-2.5):cube('lane stripe '+str(x),x,.275,-4,.08,.012,5.4,white)
    for x in (-13,-.3):
        for z in (-6.7,-1.3):cylinder('pool rail socket '+str(x)+str(z),x,.9,z,.055,1.4,bronze,12)
    cube('pool separating clear wall',1,2.25,-4,.12,4.5,12.7,glass)
    for i,x in enumerate((5,8.1,11.2)):treadmill(x,-3.8,i)
    for i,x in enumerate((5,9)):weight_rack(x,3.7,i)
    for i,x in enumerate((5,9)):bench(x,1.0,i)
    cube('check in island',0,1,5,5.8,1.5,1.0,timber,.18)
    cube('stone check in countertop',0,1.8,5,6.0,.12,1.25,stone,.05)
    # A real upper gallery only covers the weights wing; the pool remains a
    # two-storey atrium, visible through side glazing and from the entrance.
    cube('upper fitness gallery',8.9,6.12,-.2,11.9,.32,18.6,stone,.2)
    cube('atrium edge glass guard',2.85,6.82,-.2,.10,1.4,16,glass,.02)
    cube('atrium edge bronze handrail',2.85,7.56,-.2,.16,.09,16,bronze,.02)
    for x in (5.2,9,12.3):
        cube('upper lounge sofa '+str(x),x,6.53,-2.8,2.6,.76,1.4,timber,.23)
        cube('upper planter '+str(x),x,6.62,3.3,1.45,.95,1.45,stone,.12)
        cylinder('upper planting '+str(x),x,7.62,3.3,.58,1.2,green,12)
    for x in (-10,0,10):
        cube('arched exterior blade '+str(x),x,5.7,9.3,.44,11.4,.6,stone,.2)
        cube('upper glazing '+str(x),x+2.15,8.05,9.75,3.65,5.0,.12,glass)
        cube('upper bronze transom '+str(x),x+2.15,10.57,9.86,3.6,.09,.12,bronze)
    cube('recessed sculpted rooftop',0,11.6,-.6,29,.34,19.2,white,.7)
    for x in (-11,-5,3,10):cube('roof hedge '+str(x),x,12,-6,2.6,.6,1.4,green,.15)
    for side in (-1,1):
        cube('curved balcony slab '+str(side),side*9,6.08,11.2,12.4,.28,3.1,white,.95)
        cube('balcony clear parapet '+str(side),side*9,6.78,12.64,11.5,1.22,.12,glass,.055)
        cube('bronze parapet cap '+str(side),side*9,7.43,12.7,11.5,.08,.17,bronze,.04)
    for z in (-8,8):
        cube('rooftop glass balustrade '+str(z),0,12.28,z,26,1.25,.12,glass,.045)
        cube('rooftop bronze rail '+str(z),0,12.95,z,26,.08,.15,bronze,.035)
    plants(w,d)
    return {'footprint':[30,20],'floors':2,'poolMeters':[11.8,5.7],'equipment':['treadmills','squat racks','benches']}

def studio():
    w,d=16,12;ground('fitness studio',w,d,white)
    for i,x in enumerate((-4.5,-1.5,1.5,4.5)):treadmill(x,-2.5,i)
    for i,x in enumerate((-4,0,4)):bench(x,1.2,i)
    cube('full-height mirror left',-7.78,2.45,0,.05,4.4,8,glass)
    cube('light ceiling raft',0,5.8,0,15.2,.24,11.2,timber,.35)
    for x in (-5,0,5):cube('linear studio light '+str(x),x,5.65,0,.12,.04,9,white)
    plants(w,d)
    return {'footprint':[16,12],'floors':1,'equipment':['treadmills','benches','mirror']}

def iron():
    w,d=16,12;ground('iron gym',w,d,dark)
    for i,x in enumerate((-4,0,4)):weight_rack(x,-2.7,i)
    for i,x in enumerate((-4,0,4)):bench(x,1.4,i)
    cube('industrial roof',0,5.75,-1,16.6,.45,11.8,dark,.08)
    for z in (-3.5,1.5):
        cube('visible steel girder '+str(z),0,5.38,z,15.8,.34,.28,bronze)
    for x in (-6,6):
        cylinder('plate storage '+str(x),x,.65,2.2,.62,.22,rubber)
        cylinder('plate storage upper '+str(x),x,.92,2.2,.46,.22,rubber)
    return {'footprint':[16,12],'floors':1,'equipment':['squat racks','free weights','benches']}

def arcade():
    w,d=16,12;ground('arcade',w,d,dark)
    cube('faceted games canopy',0,5.55,5.8,17,.7,3,purple,.35)
    for i,x in enumerate((-5.4,-3.2,-1.0,1.2,3.4,5.6)):
        z=-2.9 if i%2 else 1.1
        cube('cabinet shell '+str(i),x,1.2,z,1.35,2.25,1.15,dark,.09)
        cube('cabinet active screen '+str(i),x,1.54,z+.6,1.04,.92,.035,[cyan,purple,red][i%3],.025)
        cube('cabinet control deck '+str(i),x,.95,z+1,.9,.16,.55,bronze,.06)
        for offset in (-.2,.2):cylinder('button '+str(i)+str(offset),x+offset,1.055,z+1.07,.07,.035,red,12)
    cube('ticket counter',0,1,-5,5.5,1.3,1,timber,.1)
    for x in (-6.2,6.2):cube('neon facade spine '+str(x),x,2.5,6.05,.12,4.6,.16,cyan)
    plants(w,d)
    return {'footprint':[16,12],'floors':1,'equipment':['six physical game cabinets','ticket counter']}

manifest={'id':'GC-FITNESS-ARCADE-001','units':'metres','provenance':'Original Blender geometry; no imported meshes, advertisements or copyrighted logos.','venues':{}}
for variant,build in [('aquatic',premium),('studio',studio),('iron',iron),('arcade',arcade)]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    configure_materials()
    detail=build()
    # Four venue variants remain distinct, but each exports only one mesh per
    # material so repeated city placement does not create hundreds of draws.
    for material in list(bpy.data.materials):
        members=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.data.materials and obj.data.materials[0]==material]
        if len(members)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in members:obj.select_set(True)
        bpy.context.view_layer.objects.active=members[0]
        bpy.ops.object.join()
        bpy.context.object.name='venue '+material.name
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    target=OUTPUT/(variant+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_apply=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('fitness-arcade-'+variant+'.blend')),compress=True)
    detail.update({'file':target.name,'bytes':target.stat().st_size,'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)})
    manifest['venues'][variant]=detail
    world=bpy.data.worlds.new('venue daylight')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.64,.72,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.65
    bpy.context.scene.world=world
    bpy.ops.object.light_add(type='SUN',location=(8,-12,18))
    bpy.context.object.rotation_euler=(.35,-.5,-.25)
    bpy.context.object.data.energy=2.3
    bpy.ops.object.camera_add(location=(39 if variant=='aquatic' else 23,-36 if variant=='aquatic' else -24,25 if variant=='aquatic' else 16))
    camera=bpy.context.object
    camera.rotation_euler=(Vector((0,0,4))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=47 if variant=='aquatic' else 29
    bpy.context.scene.camera=camera
    bpy.context.scene.render.engine='CYCLES'
    bpy.context.scene.cycles.samples=12
    bpy.context.scene.cycles.use_denoising=True
    bpy.context.scene.render.resolution_x=960
    bpy.context.scene.render.resolution_y=720
    bpy.context.scene.render.image_settings.file_format='PNG'
    bpy.context.scene.render.filepath=str(SOURCE/('fitness-arcade-'+variant+'-preview.png'))
    bpy.ops.render.render(write_still=True)
    print(variant,detail['triangles'],detail['bytes'],flush=True)
(OUTPUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
