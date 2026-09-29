"""Original Blender retail fit-out. Separate from the structural shell.
Coordinates are mall-local metres (X/Y-up/Z in the exported manifest).
No downloaded brand imagery. Existing shop doors, lift shafts and escalators stay clear.
"""
import bpy, json, math, random
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
def metric_uv(o):
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Metre-scale finish')
    for poly in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(poly.normal[a]));axes=[a for a in range(3) if a!=axis]
        for li in poly.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]/1.2,co[axes[1]]/1.2)
def box(name,mat,x,y,z,w,h,d,solid=False,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name
    o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(materials[mat])
    if bevel:
        b=o.modifiers.new('Soft manufactured edge','BEVEL');b.width=min(bevel,min(w,h,d)/3);b.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
    metric_uv(o)
    if solid:colliders.append({'id':f'{name}-{len(colliders):04d}','min':[x-w/2,y-h/2,z-d/2],'max':[x+w/2,y+h/2,z+d/2]})
    return o
def text(label,x,y,z,size=.38,reverse=False):
    bpy.ops.object.text_add(location=(x,-z,y),rotation=(math.pi/2,0,0));o=bpy.context.object
    o.name='Wayfinding '+label;o.data.body=label;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.006
    if reverse:o.rotation_euler.z=math.pi
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

# Four complete original fit-out themes inside the existing south-side shop shells.
# The 3.4m door and centre aisle remain clear. No brand assets are copied.
for idx,x in enumerate([-54,-33,46,67]):
    theme=['Burgundy','Walnut','Ink','Sage upholstery'][idx]
    box('Boutique feature wall',theme,x,2.1,73.76,15.4,3.7,.08,True)
    box('Boutique stone floor','Travertine',x,.184,62.4,15.6,.016,22.4,False,0)
    # Recessed coffer ceiling, perimeter cove and real solid bulkhead.
    box('Boutique ceiling','Warm porcelain',x,4.08,62.5,15.7,.18,22.7,True)
    for dx in [-7.3,7.3]:
        box('Ceiling border','Walnut',x+dx,3.89,62.5,.6,.25,22.4,True)
        box('Cove light','Warm light',x+dx*.94,3.81,62.5,.075,.065,21.8)
        box('Wall panel',theme,x+dx,2.02,64,.16,3.66,18.5,True)
        for zz in [55,60,65,70]:box('Wall seam','Bronze',x+dx*.987,2.02,zz,.08,3.45,.035)
    for zz in [52,73]:box('Ceiling cross border','Walnut',x,3.9,zz,15,.24,.7)
    for dx in [-7.1,7.1]:box('Bronze reveal','Bronze',x+dx,2.05,72.9,.13,3.65,1.6)
    # Broad stone portal with a dark recessed head; never close the door.
    for dx in [-7.85,-1.87,1.87,7.85]:box('Shopfront pier','Travertine',x+dx,1.96,50.87,.26,3.56,.34,True)
    box('Shopfront lintel',theme,x,3.72,50.83,15.9,.48,.4)
    box('Door threshold','Bronze',x,.185,51,3.35,.012,.2,False,0)
    for dx in [-4.9,4.9]:
        box('Window display plinth','Travertine',x+dx,.53,53.1,4.2,.7,1.1,True,.08)
        # Rounded leather goods with straps, jewelry busts, shoes and watch stands.
        for n in [-1,0,1]:
            xx=x+dx+n*1.1
            if idx==0:
                box('Leather handbag',['Burgundy','Walnut','Sage upholstery'][n+1],xx,1.08,53.1,.56,.48,.23,False,.10)
                bpy.ops.mesh.primitive_torus_add(major_radius=.17,minor_radius=.021,major_segments=16,minor_segments=6,location=(xx,-53.1,1.40),rotation=(math.pi/2,0,0))
                bpy.context.object.data.materials.append(materials['Bronze'])
                box('Bag clasp','Bronze',xx,1.11,52.973,.09,.06,.025)
            elif idx==1:
                box('Watch display riser','Ink',xx,.98,53.16,.24,.20,.24)
                box('Leather watch strap','Walnut',xx,1.21,53.12,.09,.50,.055)
                o=cylinder('Watch case','Bronze',xx,1.21,53.07,.14,.055);o.rotation_euler.x=math.pi/2
                o=cylinder('Watch dial','Warm porcelain',xx,1.21,53.035,.117,.012);o.rotation_euler.x=math.pi/2
                box('Hour hand','Ink',xx,1.24,53.021,.013,.085,.008)
                box('Minute hand','Ink',xx+.043,1.21,53.020,.09,.009,.008)
                for a in range(12):
                    angle=a*math.pi/6
                    box('Hour index','Bronze',xx+math.sin(angle)*.099,1.21+math.cos(angle)*.099,53.019,.012,.018,.006,False,0)
            elif idx==2:
                bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(xx,-53.1,1.10))
                o=bpy.context.object;o.scale=(.30,.16,.38);o.data.materials.append(materials['Ink'])
                bpy.ops.mesh.primitive_torus_add(major_radius=.23,minor_radius=.025,major_segments=20,minor_segments=6,location=(xx,-53.0,1.12),rotation=(math.pi/3,0,0))
                bpy.context.object.data.materials.append(materials['Bronze'])
            else:
                box('Shoe sole','Ink',xx,.945,53.1,.24,.065,.61,False,.06)
                box('Shoe upper','Walnut',xx,1.05,53.05,.23,.20,.45,False,.09)
        box('Window soffit','Warm light',x+dx,3.38,53.3,5,.08,2.5)
    for dx in [-6,-3,0,3,6]:
        box('Backwall niche frame','Bronze',x+dx,2.1,73.51,2.25,2.4,.15)
        box('Backwall niche recess','Ink',x+dx,2.1,73.39,2.08,2.22,.13)
        for yy in [1.15,2,2.85]:
            box('Display shelf','Travertine',x+dx,yy,73.12,2.05,.065,.6)
            box('Shelf light','Warm light',x+dx,yy+.08,73.36,1.85,.025,.06)
            for u in [-.53,.53]:box('Packaged collection',theme,x+dx+u,yy+.26,73.09,.4,.43,.24,False,.035)
    # Consultation salon opposite the existing sales counter.
    for dx in [-5.5,-2.7]:
        box('Salon chair seat','Sage upholstery',x+dx,.66,69,.95,.24,1,True,.12)
        box('Salon chair back','Sage upholstery',x+dx,1.08,69.4,.95,.85,.18,True,.09)
        for u in [-.34,.34]:
            for v in [-.35,.35]:box('Chair leg','Walnut',x+dx+u,.36,69+v,.065,.38,.065)
    cylinder('Consultation table','Bronze',x-4.1,.73,69,.56,.08)
    box('Table support','Walnut',x-4.1,.44,69,.65,.55,.65,True,.06)
    for xx in [-5,0,5]:
        for zz in [57,63,70]:
            cylinder('Downlight trim','Bronze',x+xx,3.95,zz,.15,.06)
            cylinder('Downlight diffuser','Warm light',x+xx,3.91,zz,.11,.025)

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
    'scope':'L1 lounge, four furnished boutique themes, packed material maps, coffer ceilings and L1/L2 gallery finishes; upper-floor fit-out still pending',
    'boutiques':[{'centerX':x,'doorZ':51,'theme':theme,'clearDoorMeters':3.4,'floorY':.17} for x,theme in zip([-54,-33,46,67],['leather goods','watches','jewelry','footwear'])],
    'colliders':colliders,'meshes':len(bpy.context.scene.objects),
    'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')}
(OUT/'fitout-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
editable=ROOT/'asset-library/blender/mall';editable.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(editable/'GC-MALL-FITOUT-001.blend'),compress=True)
print('MALL FITOUT READY',len(colliders),'colliders',manifest['meshes'],'material batches',flush=True)
