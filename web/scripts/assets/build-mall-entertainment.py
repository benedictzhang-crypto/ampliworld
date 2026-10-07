"""Original metre-scale arcade, five auditoria and freight tower.
Separate export and budget from retail fit-out; no licensed media is embedded.
"""
import runpy
from pathlib import Path
globals().update(runpy.run_path(str(Path(__file__).with_name('mall-blender-primitives.py'))))
OUT=ROOT/'public/assets/3d/ampliworld/GC-MALL-LEISURE-001';OUT.mkdir(parents=True,exist_ok=True)
from mathutils import Vector
def material(name,color,emission=0,alpha=1,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,alpha)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=.32;p.inputs['Metallic'].default_value=metal
    p.inputs['Alpha'].default_value=alpha
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    if alpha<1:m.surface_render_method='DITHERED'
    materials[name]=m
for n,c,e,a,m in [('Neon cyan',(.025,.62,.75),.8,1,0),('Neon pink',(.7,.035,.20),.7,1,0),('Gold',(.75,.46,.12),0,1,.8),('Glass',(.6,.8,.85),0,.14,.1),('Screen',(.10,.28,.45),.45,1,0),('Cinema red',(.23,.025,.035),0,1,0)]:material(n,c,e,a,m)
def orb(name,mat,x,y,z,r=.15):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=r,location=(x,-z,y));o=bpy.context.object;o.name=name;o.data.materials.append(materials[mat]);return o
def ring(name,mat,x,y,z,r=.25,t=.025,vertical=True):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=20,minor_segments=6,location=(x,-z,y),rotation=(math.pi/2 if vertical else 0,0,0));bpy.context.object.name=name;bpy.context.object.data.materials.append(materials[mat])
def link(name,mat,a,b,r=.025):
    v=Vector((b[0]-a[0],a[2]-b[2],b[1]-a[1]));o=cylinder(name,mat,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,v.length);o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
def sign(s,x,y,z,size=.25):text(s,x,y,z,size,True)
Y=SPATIAL['floors'][5]['y'];machines=[];halls=[]
def batch_geometry():
    # Bound dependency-graph size while creating the next room. Shared source
    # meshes stay in the caches; each completed zone becomes material batches.
    for mesh in [*box_meshes.values(),*cylinder_meshes.values()]:mesh.use_fake_user=True
    for m in materials.values():
        bpy.ops.object.select_all(action='DESELECT');group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material==m]
        for o in group:o.select_set(True)
        if len(group)>1:
            group[0].data=group[0].data.copy()
            bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();group[0].name='Leisure '+m.name
# Arcade: three old shell rooms are replaced by one connected 58 x 23 m hall.
for x in [38,96]:box('Arcade side wall','Ink',x,Y+3.5,62.5,.25,7,23,True)
box('Arcade back wall','Ink',67,Y+3.5,74,58,7,.25,True)
box('Arcade acoustic ceiling','Ink',67,Y+7,62.5,58,.18,23,True)
box('Arcade floor','Ink',67,Y+.014,62.5,58,.028,23)
for a,b in [(38,44.2),(47.8,65.2),(68.8,86.2),(89.8,96)]:
    box('Arcade glazing','Glass',(a+b)/2,Y+2.2,51,b-a,4.4,.08,True)
box('Playlab fascia','Ink',67,Y+5.25,51,58,1.7,.3,True)
sign('AUREA PLAYLAB  /  ARCADE',67,Y+5.0,50.7,.75)
for x in [40,50,60,70,80,90]:
    box('Arcade ceiling beam','Neon cyan',x,Y+6.6,62.5,.09,.06,21)
for z in [55,64,72]:box('Arcade path inlay','Neon pink',67,Y+.032,z,56,.01,.025)

def cabinet(kind,x,z,index,w=1.5,d=1.5):
    accent=['Neon cyan','Neon pink','Gold'][index%3]
    machines.append({'id':f'ARCADE-{index:02d}','kind':kind,'position':[x,Y,z],'footprint':[w,d],'status':'modeled; gameplay not connected'})
    box(kind+' footprint','Ink',x,Y+.24,z,w,.48,d,True,.09)
    if kind in ['claw','coin-pusher']:
        box(kind+' cabinet','Ink',x,Y+.75,z,w,1.4,d,True,.08)
        box(kind+' glass case','Glass',x,Y+1.72,z,w,1.45,d,True,0)
        for dx in [-w/2,w/2]:
            for dz in [-d/2,d/2]:box('Cabinet frame',accent,x+dx,Y+1.65,z+dz,.055,1.7,.055)
        box('Illuminated marquee',accent,x,Y+2.54,z,w+.12,.28,d+.08)
        if kind=='claw':
            for k in range(6):
                tx=x+(k%3-1)*.32;tz=z+(k//3-.5)*.36
                orb('Plush body','Sage upholstery' if k%2 else 'Burgundy',tx,Y+1.10,tz,.16)
                orb('Plush head','Warm porcelain',tx,Y+1.31,tz,.13)
                for dx in [-.08,.08]:orb('Plush ears','Warm porcelain',tx+dx,Y+1.43,tz,.055)
            link('Claw suspension','Gold',(x,Y+2.4,z),(x,Y+1.9,z),.012)
            for dx in [-.15,.15]:link('Claw finger','Gold',(x,Y+1.9,z),(x+dx,Y+1.65,z),.018)
        else:
            for zz,yy in [(-.22,1.15),(.25,1.35)]:
                box('Pusher shelf','Gold',x,Y+yy,z+zz,w-.12,.06,.55)
                for k in range(24):cylinder('Token','Gold',x+(k%6-2.5)*.17,Y+yy+.055+(k%3)*.01,z+zz+(k//6-1.5)*.10,.065,.018)
        box('Control shelf',accent,x,Y+.91,z-d/2-.14,w,.12,.35,True)
        cylinder('Start button','Neon pink',x+.3,Y+1.0,z-d/2-.12,.05,.035)
    elif kind in ['racing','motorcycle','shooting']:
        box('Screen housing','Ink',x,Y+1.65,z+d/2-.1,w,1.7,.22,True)
        box('Game display','Screen',x,Y+1.70,z+d/2-.23,w-.18,1.2,.025)
        for lane in [-.3,.3]:box('Screen track',accent,x+lane,Y+1.65,z+d/2-.25,.05,.85,.018)
        if kind=='racing':
            box('Bucket seat','Cinema red',x,Y+.55,z-.7,.75,.25,.85,True,.13)
            box('Seat back','Cinema red',x,Y+1.02,z-1.03,.75,.9,.15,True,.12)
            box('Dashboard','Ink',x,Y+.92,z+.1,w-.2,.35,.45,True)
            ring('Steering wheel','Gold',x,Y+1.08,z-.15,.23,.035)
            for dx in [-.15,.15]:box('Pedal','Bronze',x+dx,Y+.3,z+.3,.18,.06,.35)
        elif kind=='motorcycle':
            for dz in [-.65,.65]:ring('Motorbike wheel','Ink',x,Y+.46,z+dz,.35,.10)
            box('Bike fairing',accent,x,Y+.70,z,.55,.6,1.65,True,.12)
            box('Bike saddle','Ink',x,Y+1.0,z-.35,.42,.18,.65,True,.09)
            link('Handlebar','Gold',(x-.5,Y+1.25,z+.55),(x+.5,Y+1.25,z+.55),.04)
        else:
            box('Twin gun pedestal',accent,x,Y+.7,z-.5,w,1.4,.4,True)
            for dx in [-.35,.35]:
                box('Arcade lightgun','Ink',x+dx,Y+1.45,z-.48,.16,.18,.52)
                link('Tether','Gold',(x+dx,Y+1.4,z-.3),(x+dx,Y+.75,z-.4),.014)
    elif kind=='basketball':
        box('Ball return','Ink',x,Y+.7,z,w,1.1,d,True)
        box('Backboard','Warm porcelain',x,Y+2.65,z+d/2-.1,w,1.05,.10,True)
        ring('Basket hoop','Neon pink',x,Y+2.30,z+d/2-.55,.30,.035,False)
        for dz in [-d/2,d/2]:
            for dx in [-w/2,w/2]:link('Cage post','Bronze',(x+dx,Y+1.0,z+dz),(x+dx,Y+3.3,z+dz),.025)
        for i in range(5):
            for dx in [-w/2,w/2]:link('Safety cage mesh','Bronze',(x+dx,Y+1.6+i*.3,z-d/2),(x+dx,Y+1.6+i*.3,z+d/2),.008)
        for dx in [-.4,0,.4]:orb('Basketball','Gold',x+dx,Y+1.32,z-.4,.18)
    elif kind=='digital-fishing':
        box('Fishing screen surround','Ink',x,Y+1.55,z,w,2.5,.25,True)
        box('Ocean display','Screen',x,Y+1.6,z-.14,w-.15,2.2,.02)
        for k in range(9):orb('Screen fish','Gold',x+(k%3-1)*.65,Y+1+(k//3)*.5,z-.18,.10)
        box('Fishing console','Neon cyan',x,Y+.7,z-1.2,w,1.4,.45,True)
        for dx in [-.8,0,.8]:ring('Fishing controller','Gold',x+dx,Y+1.48,z-1.25,.12,.02)
    else:
        cylinder('Rotating prize basin',accent,x,Y+.82,z,1.1,.75)
        box('Prize basin collision','Ink',x,Y+.82,z,2.2,1.5,2.2,True)
        cylinder('Prize carousel','Screen',x,Y+1.23,z,.98,.08)
        for k in range(8):
            a=k*math.tau/8;orb('Fishing prize','Gold',x+math.cos(a)*.65,Y+1.38,z+math.sin(a)*.65,.13)
        for dx in [-1,1]:link('Prize fishing rod','Bronze',(x+dx,Y+1.1,z-1),(x+dx*.25,Y+2.2,z),.02)
    sign(kind.upper().replace('-',' '),x,Y+2.9,z-.8,.17)

for i,x in enumerate([42,46,50,54]):cabinet('coin-pusher',x,58,len(machines)+1)
for i,x in enumerate([42,46,50,54,58,62]):cabinet('claw',x,70,len(machines)+1,w=1.4+(i%3)*.12)
for x in [67,72,77,82]:cabinet('racing',x,59,len(machines)+1,2.5,3.4)
for x in [88,92]:cabinet('motorcycle',x,59,len(machines)+1,2.4,3.4)
for x in [67,73]:cabinet('shooting',x,69,len(machines)+1,2.8,2.6)
for x in [80,85,90]:cabinet('basketball',x,70,len(machines)+1,2.5,3.4)
cabinet('digital-fishing',58,60,len(machines)+1,3.2,2.6)
for x in [42,48]:cabinet('rotary-prize-fishing',x,65,len(machines)+1,2.2,2.2)
batch_geometry();print('ARCADE GEOMETRY READY',flush=True)

# Five physically separate auditoria in the expanded west wing. Screens face
# stadium seats; a continuous centre stair connects the entrance to every row.
cp=SPATIAL['cinema'];names=['IMAX-STYLE GRAND SCREEN','DOLBY-STYLE IMMERSIVE','SCREEN 3','SCREEN 4','SCREEN 5']
for idx,cz in enumerate(cp['centersZ']):
    h=16;w=28;doorX=cp['maxX'];screenH=12 if idx==0 else 9 if idx==1 else 8
    for zz in [cz-14,cz+14]:box('Auditorium acoustic wall','Ink',-154.5,Y+h/2,zz,59,h,.28,True)
    box('Screen rear wall','Ink',-184,Y+h/2,cz,.25,h,28,True)
    for side in [-1,1]:box('Hall entry wall','Ink',doorX,Y+h/2,cz+side*8,.3,h,12,True)
    box('Hall door header','Ink',doorX,Y+10,cz,.3,12,4,True)
    box('Auditorium acoustic lid','Ink',-154.5,Y+h,cz,59,.2,28,True)
    box('Auditorium carpet','Cinema red',-154.5,Y+.012,cz,59,.024,28)
    box('Screen frame','Ink',-180.9,Y+2+screenH/2,cz,.35,screenH+.6,23,True)
    box('Projection screen','Warm porcelain',-180.68,Y+2+screenH/2,cz,.025,screenH,22)
    # Abstract original test image is geometry; no movie playback is claimed.
    for k in range(8):box('Screen calibration band','Screen' if k%2 else 'Neon cyan',-180.64,Y+2.3+screenH*(k+.5)/8,cz,.012,screenH/10,21)
    for step in range(24):
        xx=-174+(step+.5)*1.5;yy=(step+1)*.15
        box('Seating tier','Ink',xx,Y+yy/2,cz,1.5,yy,27.5,True,0)
        xx=-138+(step+.5)*.5;yy=(24-step)*.15
        box('Entry stair tread','Ink',xx,Y+yy/2,cz,.5,yy,2.4,True,0)
        box('Entry step light','Warm light',xx+.24,Y+yy+.015,cz,.025,.03,2.1)
    seats=0
    for row in range(12):
        xx=-172.5+row*3;yy=Y+(row+1)*.3
        for offset in list(range(-10,-1))+list(range(2,11)):
            zz=cz+offset*1.06;seats+=1
            box('Cinema seat','Cinema red',xx,yy+.48,zz,.74,.22,.84,True,.09)
            box('Recliner back','Cinema red',xx+.35,yy+.93,zz,.16,.98,.86,True,.07)
            for dz in [-.48,.48]:
                box('Armrest','Ink',xx+.02,yy+.70,zz+dz,.72,.12,.10)
                cylinder('Cup holder','Gold',xx-.12,yy+.77,zz+dz,.065,.035)
        # Wide centre aisle remains free of seats at every elevation.
        for k in range(2):box('Aisle tread light','Warm light',xx-1.4+k*1.5,Y+(row*2+k+1)*.15+.01,cz,.035,.025,2.4)
    for xx in [-174,-164,-154,-144]:
        for side in [-1,1]:
            box('Surround speaker','Ink',xx,Y+5,cz+side*13.5,.7,1.1,.35)
            box('Acoustic timber panel','Walnut',xx,Y+8,cz+side*13.7,3.2,7,.10)
    if idx==1:
        for xx in [-172,-162,-152,-142]:
            for zz in [cz-6,cz+6]:box('Overhead speaker array','Ink',xx,Y+13,zz,.8,.35,.8)
    box('Projection equipment','Ink',-133,Y+7,cz,1.8,1,1)
    # Name plaque faces east into the foyer.
    before=set(bpy.context.scene.objects);sign(names[idx],0,Y+4.3,0,.4)
    for o in set(bpy.context.scene.objects)-before:o.rotation_euler.z+=math.pi/2;o.location.x=-124.7;o.location.y=-cz
    halls.append({'id':f'HALL-{idx+1}','name':names[idx],'min':[-184,Y,cz-14],'max':[-125,Y+16,cz+14],'seats':seats,'screenMeters':[22,screenH],'arrival':[-121,Y,cz],'conceptOnly':True})
    batch_geometry();print('AUDITORIUM READY',idx+1,flush=True)
# Foyer seating and concession counter are outside the 6m through-walkway.
for z in [-75,-44,-13,18,49,77]:
    box('Cinema lobby bench','Sage upholstery',-110,Y+.48,z,2.0,.45,3.5,True,.12)
    box('Cinema lobby planter','Travertine',-110,Y+.5,z+2.5,1.2,1,1.2,True,.08);plant(-110,Y+1,z+2.5,1.0)

# Freight shaft: front landings are runtime doors; shaft remains hollow.
s=SPATIAL['serviceLift'];bottom=SPATIAL['shaftBottom'];top=SPATIAL['shaftTop'];mid=(bottom+top)/2
for x in [s['x']-4,s['x']+4]:box('Freight shaft side','Travertine',x,mid,s['z'],.30,top-bottom,10,True)
box('Freight shaft rear','Travertine',s['x'],mid,s['z']-5,8,top-bottom,.30,True)
levels=[-25.2,-19.2,-13.2,-7.2]+[f['y'] for f in SPATIAL['floors']]+[SPATIAL['roofY']]
for i,y in enumerate(levels):
    hi=levels[i+1] if i+1<len(levels) else top
    if hi>y+4.2:box('Freight shaft front header','Travertine',s['x'],(y+4.2+hi)/2,s['z']+4.5,8,hi-y-4.2,.2,True)
    for dx in [-3.7,3.7]:box('Freight door jamb','Bronze',s['x']+dx,y+2.1,s['z']+4.5,.6,4.2,.2,True)
    text('SERVICE LIFT',s['x'],y+4.35,s['z']+4.7,.35)

# Greenery, resting places and reserved tenant bays in the expanded wings.
for floor in SPATIAL['floors']:
    y=floor['y']
    for z in [-42,42]:
        for x in [-32,0,32]:
            box('Gallery planted island','Travertine',x,y+.48,z+(-4 if z<0 else 4),2.6,.96,1.2,True,.1)
            plant(x,y+.97,z+(-4 if z<0 else 4),1.1)
    for x in ([145,177] if floor['id']=='L6' else [-176,-144,145,177]):
        if floor['id'] in ['L1','L2'] or floor['id']=='L3' and x<0:continue # Leased tenant wings.
        for z in [-57,0,57]:
            box('Wing planter','Travertine',x,y+.55,z,3,1.1,2.2,True,.12);plant(x,y+1.1,z,1.4)
            box('Wing seat','Walnut',x,y+.5,z+2.1,3,.3,.8,True,.08)
    # Physical tile joints and bay markers define room for future tenants.
    for x in [-150,150]:
        if floor['id'] in ['L1','L2'] or floor['id']=='L3' and x<0:continue
        if x<0 and floor['id']=='L6':continue
        for z in [-66,-22,22,66]:
            box('Reserved bay floor inset','Travertine',x,y+.006,z,60,.012,34,False,0)
            text('FUTURE RETAIL',x,y+.07,z,.7)
# Roof equipment placed inside a fenced compound, away from guest promenade.
ry=SPATIAL['roofY']
for x in [133,145,157]:
    box('Air handling unit','Ink',x,ry+1.5,-60,8,3,10,True,.12)
    for z in [-63,-58]:cylinder('AHU fan','Bronze',x,ry+3.05,z,1.4,.10)
    box('Plant-room duct','Bronze',x,ry+2,-49,1.8,1.8,12,True)
text('MECHANICAL / STAFF ONLY',145,ry+2,-40,.55)

for m in materials.values():
    bpy.ops.object.select_all(action='DESELECT');group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material==m]
    for o in group:o.select_set(True)
    if group:bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();group[0].name='Leisure '+m.name
bpy.ops.export_scene.gltf(filepath=str(OUT/'leisure.glb'),export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=18)
manifest={'id':'GC-MALL-LEISURE-001','origin':[0,0,-188],'arcade':{'machines':machines,'entry':[67,Y,55]},'cinema':{'halls':halls,'status':'Walkable modeled cinema; no licensed movie playback or format certification'},'serviceLift':s,'colliders':colliders,'meshes':len(bpy.context.scene.objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')}
(OUT/'leisure-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
editable=ROOT/'asset-library/blender/mall';editable.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(editable/'GC-MALL-LEISURE-001.blend'),compress=True)
print('LEISURE READY',len(machines),'machines',len(halls),'auditoria',len(colliders),'colliders',manifest['triangles'],'triangles',flush=True)
