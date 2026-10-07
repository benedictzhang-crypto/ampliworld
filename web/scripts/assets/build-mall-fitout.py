"""Original Blender retail fit-out. Separate from the structural shell.
Coordinates are mall-local metres (X/Y-up/Z in the exported manifest).
No downloaded brand imagery. Existing shop doors, lift shafts and escalators stay clear.
"""
import bpy, json, math, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SPATIAL=json.loads((ROOT/'app/world-client/mall-spatial-plan.json').read_text())
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
    # Packed image maps survive GLB export; Blender-only noise nodes did not.
    if name in ('Travertine','Walnut','Sage upholstery'):
        size=256;rng=random.Random(79);pixels=[];normals=[]
        base={'Travertine':(.57,.565,.535),'Walnut':(.24,.12,.055),'Sage upholstery':(.24,.34,.29)}[name]
        for v in range(size):
            for u in range(size):
                grain=rng.uniform(-.018,.018)
                if name=='Travertine':
                    # Low-contrast mineral variation, not repetitive wavy stripes.
                    a=math.sin(u*.033+v*.019+math.sin(v*.041))
                    b=math.sin(u*.061-v*.045+math.sin(u*.024))
                    detail=.009*a+.007*b+grain*.25
                    if u<1 or v<1:detail-=.035
                elif name=='Walnut':
                    detail=.012*math.sin(u*.43+math.sin(v*.035))+.009*math.sin(u*1.1)+grain*.5
                else:detail=.018*((u%4<2)-(v%4<2))+grain
                pixels.extend([max(.015,min(1,c+detail)) for c in base]+[1])
                normals.extend([.5+grain*.9,.5+grain*.6,1,1])
        tex=bpy.data.images.new(name+' basecolor',width=size,height=size)
        tex.pixels.foreach_set(pixels);tex.pack()
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex
        m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
        normal=bpy.data.images.new(name+' micro normal',width=size,height=size)
        normal.colorspace_settings.name='Non-Color';normal.pixels.foreach_set(normals);normal.pack()
        normaltex=m.node_tree.nodes.new('ShaderNodeTexImage');normaltex.image=normal
        normalmap=m.node_tree.nodes.new('ShaderNodeNormalMap');normalmap.inputs['Strength'].default_value=.3
        m.node_tree.links.new(normaltex.outputs['Color'],normalmap.inputs['Color'])
        m.node_tree.links.new(normalmap.outputs['Normal'],p.inputs['Normal'])
    materials[name]=m
colliders=[]
box_meshes={}
cylinder_meshes={}
def metric_uv(o):
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Metre-scale finish')
    for poly in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(poly.normal[a]));axes=[a for a in range(3) if a!=axis]
        for li in poly.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]/1.2,co[axes[1]]/1.2)
def box(name,mat,x,y,z,w,h,d,solid=False,bevel=.035):
    key=(mat,w,h,d,bevel)
    if key in box_meshes:
        o=bpy.data.objects.new(name,box_meshes[key]);bpy.context.collection.objects.link(o);o.location=(x,-z,y)
        if solid:colliders.append({'id':f'{name}-{len(colliders):04d}','min':[x-w/2,y-h/2,z-d/2],'max':[x+w/2,y+h/2,z+d/2]})
        return o
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name
    o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(materials[mat])
    if bevel:
        b=o.modifiers.new('Soft manufactured edge','BEVEL');b.width=min(bevel,min(w,h,d)/3);b.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
    metric_uv(o)
    box_meshes[key]=o.data
    if solid:colliders.append({'id':f'{name}-{len(colliders):04d}','min':[x-w/2,y-h/2,z-d/2],'max':[x+w/2,y+h/2,z+d/2]})
    return o
def text(label,x,y,z,size=.38,reverse=False):
    bpy.ops.object.text_add(location=(x,-z,y),rotation=(math.pi/2,0,0));o=bpy.context.object
    o.name='Wayfinding '+label;o.data.body=label;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.006
    if reverse:o.rotation_euler.z=math.pi
    o.data.materials.append(materials['Warm porcelain']);bpy.ops.object.convert(target='MESH')
def cylinder(name,mat,x,y,z,r,h):
    key=(mat,r,h)
    if key in cylinder_meshes:
        o=bpy.data.objects.new(name,cylinder_meshes[key]);bpy.context.collection.objects.link(o);o.location=(x,-z,y);return o
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=h,location=(x,-z,y))
    o=bpy.context.object;o.name=name;o.data.materials.append(materials[mat]);cylinder_meshes[key]=o.data;return o

def plant(x,y,z,scale=1):
    """Curved solid leaves, not flat crossed billboards or spherical crowns."""
    cylinder('Plant stem','Walnut',x,y+.65*scale,z,.026*scale,1.3*scale)
    for n in range(18):
        angle=n*2.39996;level=.22+(n%6)*.19
        length=(.48+.1*(n%3))*scale
        verts=[]
        for j in range(6):
            t=j/5;rad=length*t;width=math.sin(math.pi*t)*.14*scale
            yy=y+(level+.25*math.sin(t*math.pi)-.12*t)*scale
            for side in [-1,0,1]:
                xx=x+math.cos(angle)*rad-math.sin(angle)*width*side
                zz=z+math.sin(angle)*rad+math.cos(angle)*width*side
                verts.append((xx,-zz,yy+(.035*scale if side==0 else 0)))
        faces=[(j*3+k,j*3+k+1,(j+1)*3+k+1,(j+1)*3+k) for j in range(5) for k in range(2)]
        mesh=bpy.data.meshes.new('Curved leaf');mesh.from_pydata(verts,[],faces);mesh.update()
        o=bpy.data.objects.new('Botanical leaf',mesh);bpy.context.collection.objects.link(o)
        o.data.materials.append(materials['Foliage'])
        for p in mesh.polygons:p.use_smooth=True
        solid=o.modifiers.new('Leaf thickness','SOLIDIFY');solid.thickness=.008
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)

# Inset gallery carpets in stone: narrow overlays, never spanning shaft openings.
for floor,y in enumerate([f['y'] for f in SPATIAL['floors'][:2]]):
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
            plant(x+dx,1.12,z,1.25)

# L2 quiet seating pockets on the west gallery, away from all lift shafts.
for z in [-25,0,25]:
    y=SPATIAL['floors'][1]['y']
    box('L2 upholstered bench base','Walnut',-48,y+.23,z,1.35,.46,4,True,.09)
    box('L2 upholstered bench seat','Sage upholstery',-48,y+.56,z,1.4,.22,4.05,False,.12)
    box('L2 bench back','Sage upholstery',-47.45,y+.91,z,.24,.86,4,True,.09)
    for dz in [-3.2,3.2]:
        box('L2 planter','Warm porcelain',-48,y+.55,z+dz,1.15,1.1,1.15,True,.10)
        plant(-48,y+1.11,z+dz,1.05)
    box('L2 reading lamp diffuser','Warm light',-47.3,y+2.4,z,1.3,.06,.4)
    cylinder('L2 reading lamp stem','Bronze',-47.3,y+1.35,z,.035,2.5)

# Level-specific warm pendants, short enough for the lower L2 ceiling.
for x in [-84,-42,0,42,84]:
    for z in [-43,43]:
        cylinder('L2 pendant stem','Bronze',x,SPATIAL['floors'][1]['y']+5.65,z,.028,1.2)
        cylinder('L2 pendant shade','Bronze',x,SPATIAL['floors'][1]['y']+5.08,z,.72,.18)
        cylinder('L2 pendant diffuser','Warm light',x,SPATIAL['floors'][1]['y']+4.97,z,.64,.035)

import runpy
luxury=runpy.run_path(str(ROOT/'scripts/assets/mall-luxury-fitout.py'),init_globals=globals())
BRAND_ROOMS=luxury['BRAND_ROOMS']
runpy.run_path(str(ROOT/'scripts/assets/mall-retail-expansion.py'),init_globals={**luxury,'BRAND_ROOMS':BRAND_ROOMS})
restroom_result=runpy.run_path(str(ROOT/'scripts/assets/mall-restrooms.py'),init_globals=luxury)


# Sculptural ceiling pendants do not obstruct the tall atrium nor hang over lift wells.
for x in [-84,-42,0,42,84]:
    for z in [-43,43]:
        for r,y in [(1.9,6.65),(1.45,6.38)]:
            bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.055,major_segments=32,minor_segments=8,location=(x,-z,y))
            bpy.context.object.data.materials.append(materials['Bronze' if r>1.5 else 'Warm light'])
        cylinder('Pendant stem','Bronze',x,7.28,z,.025,1.2)
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
bpy.ops.export_scene.gltf(filepath=str(OUT/'fitout.glb'),export_format='GLB',export_apply=True,
    export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
    export_draco_position_quantization=18,export_draco_normal_quantization=12,
    export_draco_texcoord_quantization=14)
manifest={'id':'GC-MALL-FITOUT-001','units':'meters','origin':[0,0,-188],
    'scope':'Nine retail brands, four restaurants and a gym; original concept interiors, not official stores or live purchases',
    'boutiques':BRAND_ROOMS,
    'restrooms':restroom_result['RESTROOMS'],
    'colliders':colliders,'meshes':len(bpy.context.scene.objects),
    'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')}
(OUT/'fitout-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
editable=ROOT/'asset-library/blender/mall';editable.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(editable/'GC-MALL-FITOUT-001.blend'),compress=True)
print('MALL FITOUT READY',len(colliders),'colliders',manifest['meshes'],'material batches',flush=True)
