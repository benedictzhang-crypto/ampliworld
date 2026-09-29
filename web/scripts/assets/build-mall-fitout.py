"""Original Blender retail fit-out. Separate from the structural shell.
Coordinates are mall-local metres (X/Y-up/Z in the exported manifest).
No downloaded brand imagery. Existing shop doors, lift shafts and escalators stay clear.
"""
import bpy, json, math
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/3d/ampliworld/GC-MALL-FITOUT-001'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
materials = {}
for name, color, metallic, rough in [
    ('Travertine',(.62,.55,.43,1),0,.6),('Bronze',(.37,.25,.11,1),.75,.3),
    ('Walnut',(.18,.085,.038,1),0,.5),('Sage upholstery',(.20,.29,.24,1),0,.8),
    ('Warm porcelain',(.80,.76,.65,1),0,.35),('Ink',(.045,.065,.072,1),.15,.38),
    ('Warm light',(1,.78,.43,1),0,.3),('Foliage',(.12,.24,.13,1),0,.9),
    ('Burgundy',(.31,.075,.10,1),0,.6)]:
    m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color
    p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=rough
    if name=='Warm light':
        p.inputs['Emission Color'].default_value=color;p.inputs['Emission Strength'].default_value=.65
    if name in ('Travertine','Walnut'):
        noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=18
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12
        bump.inputs['Distance'].default_value=.03
        m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    materials[name]=m
colliders=[]
def box(name,mat,x,y,z,w,h,d,solid=False,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name
    o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(materials[mat])
    if bevel:
        b=o.modifiers.new('Soft manufactured edge','BEVEL');b.width=min(bevel,min(w,h,d)/3);b.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
    if solid:colliders.append({'id':name,'min':[x-w/2,y-h/2,z-d/2],'max':[x+w/2,y+h/2,z+d/2]})
    return o
def text(label,x,y,z,size=.38):
    bpy.ops.object.text_add(location=(x,-z,y),rotation=(math.pi/2,0,0));o=bpy.context.object
    o.name='Wayfinding '+label;o.data.body=label;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.006
    o.data.materials.append(materials['Warm porcelain']);bpy.ops.object.convert(target='MESH')
def cylinder(name,mat,x,y,z,r,h):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=h,location=(x,-z,y))
    o=bpy.context.object;o.name=name;o.data.materials.append(materials[mat]);return o

# Inset gallery carpets in stone: narrow overlays, never spanning shaft openings.
for floor,y in enumerate([.17,6.48]):
    for z in [-43,43]:
        box('Gallery stone inlay','Travertine',0,y+.005,z,218,.008,10,bevel=0)
        for dz in [-4.6,4.6]:box('Bronze floor border','Bronze',0,y+.011,z+dz,218,.004,.045,bevel=0)
        for x in range(-105,106,3):box('Stone joint','Warm porcelain',x,y+.012,z,.016,.003,9.2,bevel=0)
    # Side gallery west; east is left clear because it contains moving escalators.
    box('West gallery inlay','Travertine',-53,y+.005,0,12,.008,70,bevel=0)

# Ground-floor lounge alcoves sit against the garden, outside the cross-axes.
for x in [-29,29]:
    for z in [-30,30]:
        for dx in [-4,4]:
            box('Lounge base','Walnut',x+dx,.34,z,3.2,.34,1.5,True,.09)
            box('Lounge cushion','Sage upholstery',x+dx,.64,z,3.15,.28,1.45,False,.12)
            box('Lounge back','Sage upholstery',x+dx,1.02,z+.64,3.15,.70,.25,True,.10)
        cylinder('Coffee table','Bronze',x,.50,z,1.05,.10)
        box('Table base','Bronze',x,.30,z,1.35,.5,1.35,True,.10)
        for dx in [-7,7]:
            cylinder('Ceramic planter','Travertine',x+dx,.66,z,.60,1)
            box('Planter collision','Travertine',x+dx,.52,z,.78,.8,.78,True,.08)
            for n in range(5):
                a=n*2.4;bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=.55,location=(x+dx+math.sin(a)*.28,-z+math.cos(a)*.28,1.5+n*.14))
                o=bpy.context.object;o.scale=(.7,.7,1.2);o.data.materials.append(materials['Foliage'])

# Four bespoke south-side boutiques: physical framed display interiors, open 3.4m doors.
for idx,x in enumerate([-54,-33,46,67]):
    box('Boutique feature wall','Walnut' if idx%2 else 'Burgundy',x,2.1,73.76,15.4,3.7,.08)
    for dx in [-7.1,7.1]:box('Bronze reveal','Bronze',x+dx,2.05,72.9,.13,3.65,1.6)
    for dx in [-4.9,4.9]:
        box('Window display plinth','Travertine',x+dx,.53,53.1,4.2,.7,1.1,True,.08)
        cylinder('Display vessel','Bronze',x+dx,1.27,53.1,.25,.72)
        box('Window soffit','Warm light',x+dx,3.38,53.3,5,.08,2.5)
    for dx in [-6,-3,0,3,6]:box('Backwall display niche','Bronze',x+dx,2.1,73.5,2.1,.08,.6)

# Sculptural ceiling pendants do not obstruct the tall atrium nor hang over lift wells.
for x in [-84,-42,0,42,84]:
    for z in [-43,43]:
        for r,y in [(1.9,4.85),(1.45,4.58)]:
            bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.055,major_segments=32,minor_segments=8,location=(x,-z,y))
            bpy.context.object.data.materials.append(materials['Bronze' if r>1.5 else 'Warm light'])
        cylinder('Pendant stem','Bronze',x,5.48,z,.025,1.2)
for x in [-20,20]:
    box('Suspended directory','Ink',x,4.45,40,8,1.15,.15)
    text('L1  /  GALLERIA',x,4.50,40.1,.43)
    text('LIFTS A-D   /   DINING L5-L6',x,4.12,40.1,.21)

# Batch by material: no per-chair React objects or hundreds of draw calls.
for m in materials.values():
    bpy.ops.object.select_all(action='DESELECT')
    group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material==m]
    for o in group:o.select_set(True)
    if group:
        bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();group[0].name='Fitout '+m.name
bpy.ops.export_scene.gltf(filepath=str(OUT/'fitout.glb'),export_format='GLB',export_apply=True)
manifest={'id':'GC-MALL-FITOUT-001','units':'meters','origin':[0,0,-188],
    'scope':'L1 lounge, four boutiques, lighting and L1/L2 gallery finishes; upper-floor fit-out still pending',
    'colliders':colliders,'meshes':len(bpy.context.scene.objects),
    'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')}
(OUT/'fitout-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
editable=ROOT/'asset-library/blender/mall';editable.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(editable/'GC-MALL-FITOUT-001.blend'),compress=True)
print('MALL FITOUT READY',len(colliders),'colliders',manifest['meshes'],'material batches',flush=True)
