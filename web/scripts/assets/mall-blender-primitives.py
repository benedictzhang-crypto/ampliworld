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
def compact_scene():
    """Batch completed zones without modifying meshes kept in primitive caches."""
    for mesh in [*box_meshes.values(),*cylinder_meshes.values()]:mesh.use_fake_user=True
    # Other builders may keep shared spheres/torus meshes; preserve their data
    # too before unlinking instances during the join.
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.data.use_fake_user=True
    for m in materials.values():
        bpy.ops.object.select_all(action='DESELECT')
        group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material==m]
        if len(group)<2:continue
        for o in group:o.select_set(True)
        group[0].data=group[0].data.copy()
        bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();group[0].name='Batched '+m.name
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
        # Closed leaf shell directly, avoiding a dependency-graph rebuild for
        # every Solidify modifier after thousands of furniture instances.
        count=len(verts);front=faces[:]
        verts += [(xx,zz,yy-.008) for xx,zz,yy in verts]
        faces += [tuple(i+count for i in reversed(f)) for f in front]
        edge_count={}
        for f in front:
            for a,b in zip(f,f[1:]+f[:1]):
                key=tuple(sorted((a,b)));edge_count[key]=edge_count.get(key,0)+1
        for (a,b),n in edge_count.items():
            if n==1:faces.append((a,b,b+count,a+count))
        mesh=bpy.data.meshes.new('Curved leaf');mesh.from_pydata(verts,[],faces);mesh.update()
        o=bpy.data.objects.new('Botanical leaf',mesh);bpy.context.collection.objects.link(o)
        o.data.materials.append(materials['Foliage'])
        for p in mesh.polygons:p.use_smooth=True
