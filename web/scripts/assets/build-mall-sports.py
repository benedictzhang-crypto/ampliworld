"""Original metric sports anchor stores. Product geometry, not photo facades.
Concept brand names imply no licensing; sport minigames are not implemented.
"""
import runpy
from pathlib import Path
globals().update(runpy.run_path(str(Path(__file__).with_name('mall-blender-primitives.py'))))
from mathutils import Vector
PLAN=json.loads((ROOT/'app/world-client/mall-sports-plan.json').read_text())
OUT=ROOT/'public/assets/3d/ampliworld/GC-MALL-SPORTS-001';OUT.mkdir(parents=True,exist_ok=True)
Y=PLAN['floorY'];inventory=[]
def material(name,c,metal=0,alpha=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,alpha)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.4;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
    if alpha<1:m.surface_render_method='DITHERED'
    materials[name]=m
for name,c,metal,alpha in [('Court maple',(.65,.40,.19),0,1),('Turf',(.08,.32,.14),0,1),('Sport orange',(.94,.23,.035),0,1),('Sport blue',(.055,.26,.55),0,1),('Sport white',(.90,.91,.88),0,1),('Glass',(.62,.84,.88),.1,.16)]:material(name,c,metal,alpha)
def link(name,mat,a,b,r=.025):
    v=Vector((b[0]-a[0],a[2]-b[2],b[1]-a[1]));o=cylinder(name,mat,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,v.length);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def ring(name,mat,x,y,z,r=.3,vertical=False):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.022,major_segments=40,minor_segments=6,location=(x,-z,y),rotation=(math.pi/2 if vertical else 0,0,0));bpy.context.object.name=name;bpy.context.object.data.materials.append(materials[mat])
def ball(name,x,y,z,r=.12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=r,location=(x,-z,y));bpy.context.object.name=name;bpy.context.object.data.materials.append(materials['Sport orange'])
def label(s,x,y,z,size=.5,side=False):
    text(s,x,y,z,size,True)
    if side:bpy.context.object.rotation_euler.z=math.pi/2
def shoe(x,y,z,mat):
    box('Sculpted shoe sole','Sport white',x,y,z,.31,.055,.64,False,.026)
    box('Trainer toe',mat,x,y+.105,z+.12,.28,.17,.34,False,.07)
    box('Trainer heel',mat,x,y+.14,z-.14,.27,.27,.24,False,.065)
    for j in range(4):box('Laces','Sport white',x,y+.2,z-.07+j*.06,.21,.014,.018,False,.006)
def shirt(x,y,z,mat):
    box('Fabric jersey',mat,x,y,z,.53,.68,.12,False,.045)
    for dx in [-.35,.35]:box('Jersey sleeve',mat,x+dx,y+.20,z,.23,.25,.13,False,.04)
    ring('Jersey neck','Ink',x,y+.31,z+.075,.075,True)
    link('Hanger','Bronze',(x-.23,y+.39,z),(x,y+.53,z));link('Hanger','Bronze',(x,y+.53,z),(x+.23,y+.39,z))
def rack(x,z,kind='apparel'):
    box('Display plinth','Travertine',x,Y+.18,z,3.3,.36,2.1,True,.12)
    inventory.append({'kind':kind,'position':[x,Y,z]})
    if kind=='apparel':
        for dx in [-1.45,1.45]:link('Clothes rail support','Bronze',(x+dx,Y+.36,z),(x+dx,Y+2.1,z),.035)
        link('Clothes rail','Bronze',(x-1.45,Y+2.1,z),(x+1.45,Y+2.1,z),.035)
        for n in range(4):shirt(x-1.04+n*.7,Y+1.35,z,['Ink','Sport blue','Sport orange','Sport white'][n])
    else:
        for h in [.65,1.25,1.85]:
            box('Merchandise shelf','Walnut',x,Y+h,z,3.1,.08,1.7)
            for n in range(5):
                xx=x-1.2+n*.6
                if kind=='footwear':shoe(xx,Y+h+.07,z,['Ink','Sport blue','Sport orange'][n%3])
                elif kind=='balls':ball('Sports ball',xx,Y+h+.2,z,.17)
                elif kind=='swim':
                    for dx in [-.08,.08]:ring('Swim goggles','Sport blue',xx+dx,Y+h+.16,z,.07,True)
                else:box('Equipment bag','Sport blue',xx,Y+h+.26,z,.43,.45,.42,False,.1)
for shop in PLAN['shops']:
    x0,z0=shop['min'];x1,z1=shop['max'];cz=(z0+z1)/2;ex,ez=shop['entry']
    box('Anchor floor '+shop['id'],'Court maple' if shop['id']=='NIKE-COURT' else 'Travertine',(x0+x1)/2,Y-.025,cz,x1-x0,.05,z1-z0)
    for z in [z0,z1]:box('Anchor partition '+shop['id'],'Ink',(x0+x1)/2,Y+2.7,z,x1-x0,5.4,.2,True)
    box('Anchor rear wall','Ink',x1,Y+2.7,cz,.2,5.4,z1-z0,True)
    # Wide west entrances open into the shared 12 m gallery; no fake door decal.
    for a,b in [(z0,ez-3),(ez+3,z1)]:box('Anchor window','Glass',x0,Y+2.25,(a+b)/2,.08,4.5,b-a,True,0)
    box('Anchor fascia','Ink',x0,Y+5.0,cz,.35,1.0,z1-z0,True)
    label(shop['name'].upper(),x0-.22,Y+4.72,cz,.62,True)
    for x in [136,151,166,181]:box('Suspended light','Warm light',x,Y+6.65,cz,.15,.07,z1-z0-4)
    box('Cash wrap','Walnut',134,Y+.58,z1-5,7,1.16,2,True,.16)
    for x in [132,135]:box('POS terminal','Ink',x,Y+1.35,z1-5,.45,.35,.22)
    for z in [ez-4.5,ez+4.5]:
        box('Entrance planter','Travertine',129,Y+.45,z,1.4,.9,1.4,True,.08);plant(129,Y+.9,z,1.1)
    compact_scene()
# Nike concept: a 15 x 14 m half court, with separate run-off and a glass enclosure.
c=PLAN['court'];x0,z0=c['min'];x1,z1=c['max'];cx=(x0+x1)/2
box('Half court maple','Court maple',cx,Y+.01,(z0+z1)/2,x1-x0,.02,z1-z0)
for x in [x0,x1]:box('Court sideline','Sport white',x,Y+.024,(z0+z1)/2,.055,.008,z1-z0)
for z in [z0,z1]:box('Court baseline','Sport white',cx,Y+.024,z,x1-x0,.008,.055)
for x in [cx-2.45,cx+2.45]:box('Paint lane line','Sport white',x,Y+.024,z0+2.9,.055,.008,5.8)
box('Free throw line','Sport white',cx,Y+.024,z0+5.8,4.9,.008,.055)
for j in range(80):
    a=math.pi*j/80;b=math.pi*(j+1)/80
    link('Three point arc','Sport white',(cx+6.5*math.cos(a),Y+.028,z0+1.2+6.5*math.sin(a)),(cx+6.5*math.cos(b),Y+.028,z0+1.2+6.5*math.sin(b)),.025)
ring('Free throw circle','Sport white',cx,Y+.028,z0+5.8,1.8)
for x in c['glassMin'][0],c['glassMax'][0]:box('Court side glass','Glass',x,Y+2.4,-63,.10,4.8,22,True,0)
box('Court end glass','Glass',158,Y+2.4,-74,22,4.8,.1,True,0)
for a,b in [(147,156.5),(159.5,169)]:box('Court door glass','Glass',(a+b)/2,Y+2.4,-52,b-a,4.8,.1,True,0)
for x in range(147,170,2):
    for z in [-74,-52]:box('Glass clamp','Bronze',x,Y+.18,z,.06,.36,.18)
box('Basket stanchion','Ink',cx,Y+1.95,-72,.5,3.9,.5,True,.08)
link('Basket arm','Ink',(cx,Y+3.6,-72),(cx,Y+3.6,-69),.16)
box('Transparent backboard','Glass',cx,Y+3.45,-69,1.8,1.05,.06,True,0)
ring('Basket rim','Sport orange',cx,Y+3.05,-68.58,.225)
for j in range(12):
    a=j*math.tau/12;link('Basket net','Sport white',(cx+.225*math.cos(a),Y+3.05,-68.58+.225*math.sin(a)),(cx+.13*math.cos(a+.3),Y+2.6,-68.58+.13*math.sin(a)),.007)
for x in [133,139]:
    for z in [-68,-59]:rack(x,z,'footwear')
for z in [-68,-60,-52,-43]:rack(178,z,'apparel')
for x in [144,153,164]:box('Try-on bench','Sage upholstery',x,Y+.46,-33,5,.5,1.3,True,.18)
label('COURT 01 / TRAIN. TRY. PLAY.',157.5,Y+5.2,-75,.58)
compact_scene()
# Multi-sport: clearly different product families, not identical generic boxes.
for i,(name,kind) in enumerate([('RUN / TRAIN','footwear'),('TEAM SPORTS','balls'),('SWIM','swim'),('OUTDOOR','bags')]):
    x=137+i*12
    label(name,x,Y+3.1,-12,.4)
    for z in [-8,10]:rack(x,z,kind)
    rack(x,18,'apparel')
for n in range(6):
    x=140+n*2.4;z=-15
    ring('Tennis racket head','Sport blue',x,Y+1.6,z,.3,True)
    link('Racket handle','Ink',(x,Y+.8,z),(x,Y+1.3,z),.045)
    for dx in [-.18,-.09,0,.09,.18]:link('Racket string','Sport white',(x+dx,Y+1.38,z),(x+dx,Y+1.82,z),.005)
for x in [170,178]:
    for dz in [-.8,.8]:ring('Bicycle wheel','Ink',x,Y+.48,-5+dz,.42,True)
    for a,b in [((x,Y+.48,-5.8),(x,Y+1.0,-5)),((x,Y+1.,-5),(x,Y+.48,-4.2)),((x,Y+.48,-4.2),(x,Y+.48,-5.8))]:link('Cycle frame','Sport orange',a,b,.045)
    box('Bicycle saddle','Ink',x,Y+1.13,-5,.28,.12,.35)
compact_scene()
# Indoor putting landscape is a real continuous triangulated mesh, with matching support.
g=PLAN['green'];gx,gz=g['min'];mx,mz=g['max'];step=g['step']
def height(x,z):
    u=(x-gx)/(mx-gx);v=(z-gz)/(mz-gz)
    return g['maxRise']*math.sin(math.pi*u)**2*math.sin(math.pi*v)**2*(.72+.28*math.cos(3*math.pi*u))
nx=round((mx-gx)/step);nz=round((mz-gz)/step);verts=[];faces=[]
for j in range(nz+1):
    for i in range(nx+1):
        x=gx+i*step;z=gz+j*step;verts.append((x,-z,Y+.012+height(x,z)))
for j in range(nz):
    for i in range(nx):
        a=j*(nx+1)+i;b=a+1;c=a+nx+2;d=a+nx+1;faces.extend([(a,c,b),(a,d,c)])
mesh=bpy.data.meshes.new('Rolling putting terrain');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Contoured practice green',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials['Turf'])
for p in mesh.polygons:p.use_smooth=True
for n,(x,z) in enumerate([(148,48),(161,61),(174,51)]):
    y=Y+.015+height(x,z);cylinder('Target cup','Ink',x,y,z,.11,.018);link('Practice flagpole','Sport white',(x,y,z),(x,y+1.25,z),.013)
    box('Practice flag','Sport orange',x+.16,y+1.14,z,.32,.21,.008)
    label(str(n+1),x,y+1.18,z+.03,.14)
for z in [40,47,64,71]:
    rack(134,z,'apparel' if z>60 else 'bags')
for x in [150,160,170]:
    box('Club display','Walnut',x,Y+.25,74,4,.5,1.3,True)
    for k in range(5):
        xx=x-1.2+k*.6;link('Golf shaft','Bronze',(xx,Y+.5,74),(xx,Y+1.65,74),.018);box('Golf club head','Ink',xx+.09,Y+.55,74,.23,.11,.14,False,.04)
label('CONTOUR / INDOOR PUTTING GARDEN',161,Y+4.4,77.7,.56)
compact_scene()
bpy.ops.export_scene.gltf(filepath=str(OUT/'sports.glb'),export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=18)
for mesh in list(bpy.data.meshes):
    mesh.use_fake_user=False
    if mesh.users==0:bpy.data.meshes.remove(mesh)
manifest={'id':'GC-MALL-SPORTS-001','origin':PLAN['origin'],'shops':PLAN['shops'],'court':PLAN['court'],'green':g,'inventory':inventory,'colliders':colliders,'meshes':len(bpy.context.scene.objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'status':'Walkable physical concept stores; basketball and golf gameplay not connected'}
(OUT/'sports-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'asset-library/blender/mall/GC-MALL-SPORTS-001.blend'),compress=True)
print('SPORTS READY',manifest['triangles'],'triangles',len(colliders),'colliders')
