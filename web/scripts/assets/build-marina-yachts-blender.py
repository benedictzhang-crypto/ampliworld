"""Original 14/18/22 metre moored yachts for the 150-berth harbor.

Each hull is a station-built closed volume, not a card, texture or boat-shaped
box. Exported instances are static visual replacements for the harbor fleet.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/'public/assets/3d/ampliworld/GC-YACHT-FLEET-001'
SOURCE=ROOT/'asset-library/blender/marina'
OUTPUT.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)

def material(name,color,metal=0,rough=.5,alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,alpha)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if alpha<1:
        m.surface_render_method='BLENDED';p.inputs['Alpha'].default_value=alpha
    return m

def point(x,y,z):return (x,-z,y)
def cube(name,x,y,z,w,h,d,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=point(x,y,z))
    o=bpy.context.object;o.name=name;o.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        modifier=o.modifiers.new('marine softened edge','BEVEL');modifier.width=bevel;modifier.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=modifier.name)
        o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o
def cyl(name,x,y,z,r,h,mat,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=point(x,y,z))
    o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    return o
def sphere(name,x,y,z,r,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=r,location=point(x,y,z))
    o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    return o
def hull(length,beam,white,navy):
    # Five longitudinal stations, six vertices per section: keel/chines/sheers.
    stations=[(-.5,.31),(-.35,.82),(-.08,1),(.27,.90),(.49,.07)]
    ring=[(-.34,0),(-.18,-.70),(.64,-1),(.64,1),(-.18,.70),(-.34,0)]
    vertices=[]
    for x,width in stations:
        for y,z in ring:vertices.append(point(x*length,y*beam,z*beam*.5*width))
    faces=[]
    for i in range(len(stations)-1):
        for j in range(5):faces.append((i*6+j,i*6+j+1,(i+1)*6+j+1,(i+1)*6+j))
    for end in (0,len(stations)-1):
        faces.extend([(end*6, end*6+j, end*6+j+1) for j in range(1,5)])
    mesh=bpy.data.meshes.new('station-built hull');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('closed chine and flared bow hull',mesh)
    bpy.context.collection.objects.link(obj);mesh.materials.append(white)
    for polygon in mesh.polygons:polygon.use_smooth=True
    cube('deep navy waterline',-.035*length,-.22*beam,0,length*.76,.05,beam*.77,navy,.03)

def build(length,kind):
    global ivory,navy,glass,teak,steel,accent,light
    ivory=material('ceramic gelcoat',(.87,.87,.82),rough=.37)
    navy=material('deep hull navy',(.055,.105,.18),rough=.34)
    glass=material('continuous smoked bridge glazing',(.12,.27,.32),metal=.1,rough=.14,alpha=.65)
    teak=material('weathered deck teak',(.45,.31,.17),rough=.59)
    steel=material('polished stainless rail',(.69,.75,.74),metal=.86,rough=.19)
    accent=material('marine blue accent',(.14,.35,.48) if kind!='expedition' else (.38,.43,.43),metal=.27,rough=.4)
    light=material('navigation light',(.91,.69,.36),rough=.25)
    beam=length*(.255 if kind=='expedition' else .245)
    hull(length,beam,ivory,navy)
    cube('true timber main deck',-.08*length,.73*beam,0,length*.77,.13,beam*.81,teak,.18)
    cube('broad aft swim platform',-.515*length,.34*beam,0,length*.15,.19,beam*.84,teak,.12)
    # The superstructure changes substantially with vessel class.
    cabin_length=length*(.39 if kind=='sport' else .5)
    cabin_x=length*(.01 if kind=='sport' else -.005)
    cube('lower cabin volume',cabin_x,1.1*beam,0,cabin_length,.84*beam,beam*.72,ivory,.32)
    cube('raked panoramic windshield',cabin_x+cabin_length*.42,1.15*beam,0,.13,.58*beam,beam*.63,glass,.055)
    for side in (-1,1):
        cube('continuous side glazing '+str(side),cabin_x,1.21*beam,side*beam*.37,cabin_length*.86,.44*beam,.075,glass,.09)
        cube('side window division '+str(side),cabin_x+cabin_length*.07,1.23*beam,side*beam*.42,.055,.47*beam,.10,steel,.02)
    cube('swept hardtop',cabin_x-.04*length,1.67*beam,0,cabin_length*1.15,.1*beam,beam*.84,ivory,.31)
    if kind!='sport':
        cube('open flybridge sole',-.10*length,1.81*beam,0,length*.38,.10*beam,beam*.69,teak,.18)
        cube('upper console',.025*length,2.07*beam,0,length*.14,.28*beam,beam*.33,accent,.12)
        cube('flybridge windscreen',.105*length,2.18*beam,0,.08,.24*beam,beam*.55,glass,.02)
        for side in (-1,1):
            cube('flybridge sofa '+str(side),-.19*length,2.01*beam,side*beam*.22,length*.2,.21*beam,beam*.17,teak,.10)
        cube('radar arch bridge',-.12*length,2.41*beam,0,.16,.53*beam,beam*.65,steel,.08)
    if kind=='expedition':
        cube('raised pilot house',.14*length,1.93*beam,0,length*.23,.5*beam,beam*.62,ivory,.20)
        cube('pilot bridge glazing',.14*length,2.02*beam,beam*.315,length*.21,.29*beam,.08,glass,.07)
        cube('pilot roof',.14*length,2.23*beam,0,length*.27,.08*beam,beam*.66,ivory,.16)
    # Real railing posts, rub rail, aft seating and hardware at readable scale.
    for side in (-1,1):
        for i in range(9):
            x=length*(-.43+i*.095)
            width=beam*.47*(.9 if x>length*.27 else 1)
            z=side*width
            cyl('stainless stanchion '+str(side)+' '+str(i),x,beam*.96,z,.024,beam*.42,steel,8)
            if i<8:
                nx=length*(-.43+(i+1)*.095)
                cube('continuous deck guard '+str(side)+' '+str(i),(x+nx)/2,beam*1.17,z,nx-x,.028,.028,steel,.008)
        cube('full-length rub rail '+str(side),-.03*length,beam*.45,side*beam*.475,length*.77,.065,.06,steel,.018)
        for i in range(3):
            x=-length*(.32-i*.085)
            sphere('aft side fender '+str(side)+' '+str(i),x,beam*.43,side*beam*.49,beam*.08,ivory)
    cube('aft lounge seat',-.34*length,beam*.86,0,length*.19,.21*beam,beam*.58,ivory,.14)
    cube('aft cockpit table',-.35*length,beam*.90,0,length*.11,.055*beam,beam*.28,teak,.08)
    cyl('radar dome',-.12*length,beam*(2.76 if kind!='sport' else 1.94),0,beam*.13,beam*.16,ivory,16)
    cyl('navigation mast',-.1*length,beam*(3.0 if kind!='sport' else 2.18),0,.035,beam*.6,steel,8)
    for side in (-1,1):sphere('navigation lamp '+str(side),.32*length,beam*.94,side*beam*.36,beam*.06,light)
    return {'lengthMeters':length,'beamMeters':beam,'class':kind,'origin':'waterline center','upAxis':'Y'}

manifest={'id':'GC-YACHT-FLEET-001','units':'METERS','upAxis':'Y','provenance':'Project-original editable Blender meshes. No third-party boat assets.','variants':{}}
for length,kind in [(14,'sport'),(18,'flybridge'),(22,'expedition')]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    detail=build(length,kind)
    for m in list(bpy.data.materials):
        members=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
        if len(members)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in members:obj.select_set(True)
        bpy.context.view_layer.objects.active=members[0];bpy.ops.object.join()
        bpy.context.object.name='yacht '+m.name
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    file=OUTPUT/(str(length)+'m.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',export_apply=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('yacht-'+str(length)+'m.blend')),compress=True)
    detail.update({'file':file.name,'bytes':file.stat().st_size,'triangles':sum(len(p.vertices)-2 for obj in bpy.context.scene.objects if obj.type=='MESH' for p in obj.data.polygons)})
    manifest['variants'][str(length)]=detail
    world=bpy.data.worlds.new('marine inspection');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.48,.67,.78,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.75
    bpy.context.scene.world=world
    bpy.ops.object.light_add(type='SUN',location=(6,-12,12));bpy.context.object.data.energy=2.5
    bpy.ops.object.camera_add(location=(length*.8,-length*.9,length*.64))
    camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=length*1.55
    bpy.context.scene.camera=camera;bpy.context.scene.render.engine='CYCLES'
    bpy.context.scene.cycles.samples=12;bpy.context.scene.cycles.use_denoising=True
    bpy.context.scene.render.resolution_x=960;bpy.context.scene.render.resolution_y=640
    bpy.context.scene.render.filepath=str(SOURCE/('yacht-'+str(length)+'m-preview.png'))
    bpy.ops.render.render(write_still=True)
    print('YACHT',length,detail['triangles'],detail['bytes'],flush=True)
(OUTPUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
