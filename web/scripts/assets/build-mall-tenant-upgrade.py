"""Modular original tenant interiors, floor finishes and building services.
Brand names are illustrative concepts. Real retail operations are not implied.
"""
import runpy
from pathlib import Path
globals().update(runpy.run_path(str(Path(__file__).with_name('mall-blender-primitives.py'))))
PLAN=json.loads((ROOT/'app/world-client/mall-tenants-plan.json').read_text())
SHELL=json.loads((ROOT/'public/assets/3d/ampliworld/GC-MALL-002/mall-manifest.json').read_text())
OUT=ROOT/'public/assets/3d/ampliworld/GC-MALL-TENANTS-001';OUT.mkdir(parents=True,exist_ok=True)
from mathutils import Vector
shops=[];fixtures=[]
unit_objects={}
def newmat(name,c,rough=.5,metal=0,alpha=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,alpha)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
    if alpha<1:m.surface_render_method='DITHERED'
    materials[name]=m;return m
newmat('Tenant glass',(.72,.83,.84),.1,0,.13)
newmat('Cream marble',(.68,.64,.56),.25)
newmat('Roof lawn',(.09,.25,.13),.94)
newmat('Chocolate',(.14,.05,.018),.3)
newmat('Rose cloth',(.47,.21,.20),.8)
# A packed marble map, repeated at metre scale, including small tile joints.
m=materials['Cream marble'];size=256;pixels=[]
for v in range(size):
    for u in range(size):
        vein=math.exp(-abs(math.sin(u*.027+v*.013+math.sin(v*.033)*.7))*28)
        seam=.07 if u<1 or v<1 else 0
        pixels.extend([max(0,c-vein*.12-seam) for c in [.69,.665,.61]]+[1])
tex=bpy.data.images.new('Cut marble with mineral veining',width=size,height=size);tex.pixels.foreach_set(pixels);tex.pack()
node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex;m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def link(name,mat,a,b,r=.025):
    v=Vector((b[0]-a[0],a[2]-b[2],b[1]-a[1]));o=cylinder(name,mat,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,v.length);o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
def sphere(name,mat,x,y,z,r=.15):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=r,location=(x,-z,y));bpy.context.object.name=name;bpy.context.object.data.materials.append(materials[mat])
def bench(x,y,z,w=3):
    box('Upholstered seat','Sage upholstery',x,y+.46,z,w,.48,1,True,.17)
    box('Upholstered back','Sage upholstery',x,y+.95,z-.43,w,.8,.22,False,.1)
    for dx in [-w*.35,w*.35]:box('Bronze sofa leg','Bronze',x+dx,y+.18,z,.08,.36,.7)
def chair(x,y,z):
    box('Dining seat','Sage upholstery',x,y+.48,z,.55,.15,.55,False,.07)
    box('Dining back','Walnut',x,y+.87,z-.25,.55,.65,.08,False,.03)
    for dx in [-.21,.21]:
        for dz in [-.21,.21]:link('Chair leg','Walnut',(x+dx,y,z+dz),(x+dx,y+.44,z+dz),.028)
def table(x,y,z):
    cylinder('Cafe pedestal','Bronze',x,y+.36,z,.065,.72);cylinder('Cafe foot','Bronze',x,y+.03,z,.36,.06)
    box('Cafe tabletop','Cream marble',x,y+.76,z,1.2,.08,1.2,True,.10)
    for dx in [-.92,.92]:chair(x+dx,y,z)
    cylinder('Porcelain cup','Warm porcelain',x+.15,y+.88,z,.07,.15)
def book(x,y,z,k):
    col=['Burgundy','Walnut','Ink','Sage upholstery','Rose cloth'][k%5]
    box('Bound book cover',col,x,y,z,.075,.35+(k%3)*.035,.23,False,.006)
    box('Book pages','Warm porcelain',x,y+.002,z+.008,.056,.32+(k%3)*.035,.20,False,0)
    box('Spine foil','Bronze',x,y+.10,z-.114,.058,.012,.005,False,0)
def product(kind,x,y,z,k):
    if kind in ['bookstore','stationery']:
        if kind=='bookstore':book(x,y+.20,z,k)
        else:
            box('Hardcover notebook','Ink' if k%2 else 'Burgundy',x,y+.035,z,.24,.07,.34,False,.015)
            box('Notebook elastic','Bronze',x+.07,y+.073,z,.012,.009,.32)
    elif kind in ['beauty','coffee','healthy-food']:
        cylinder('Bottle base','Burgundy' if kind=='beauty' else 'Foliage',x,y+.13,z,.065,.26)
        cylinder('Bottle cap','Bronze',x,y+.285,z,.04,.05)
    elif kind=='chocolate':
        box('Chocolate gift box','Walnut',x,y+.035,z,.35,.07,.3)
        for dx in [-.1,0,.1]:
            for dz in [-.08,.04]:box('Individual praline','Chocolate',x+dx,y+.09,z+dz,.075,.045,.075,False,.012)
    elif kind=='watches':
        cylinder('Watch display pillow','Ink',x,y+.11,z,.14,.22)
        o=cylinder('Tonneau watch face','Bronze',x,y+.235,z,.085,.025)
        box('Watch dial','Ink',x,y+.251,z,.085,.009,.105)
        box('Watch hands','Warm porcelain',x,y+.26,z,.012,.009,.072)
    elif kind in ['bags','gifts']:
        box('Leather bag','Walnut' if kind=='bags' else 'Rose cloth',x,y+.17,z,.38,.34,.18,False,.075)
        for dx in [-.1,.1]:link('Bag handle','Bronze',(x+dx,y+.31,z),(x+dx,y+.49,z),.018)
        link('Bag handle top','Bronze',(x-.1,y+.49,z),(x+.1,y+.49,z),.018)
    elif kind=='electronics':
        box('Laptop keyboard','Ink',x,y+.025,z,.42,.035,.30,False,.015)
        box('Laptop screen','Ink',x,y+.20,z-.13,.42,.32,.023,False,.018)
        box('Screen display','Sage upholstery',x,y+.20,z-.115,.37,.27,.004)
    else:box('Folded knitwear','Rose cloth' if k%2 else 'Warm porcelain',x,y+.09,z,.36,.18,.3,False,.035)
def shelf(x,y,z,kind,w=4):
    box('Retail display base','Walnut',x,y+.15,z,w,.3,1.3,True,.05)
    for h in [.48,1.05,1.62,2.19]:
        box('Retail shelf','Walnut',x,y+h,z,w,.065,1.25)
        for k in range(7):product(kind,x-w*.4+k*w*.8/6,y+h+.04,z,k)
    if kind=='bookstore':
        for h in [.48,1.05,1.62,2.19]:
            for k in range(22):book(x-w*.44+k*w*.88/21,y+h+.23,z-.36,k)
# Floor sheets follow the shell's cutouts exactly, leaving lift shafts and atrium empty.
for p in SHELL['surfaces']:
    if p.get('level') not in [f['id'] for f in SPATIAL['floors']]:continue
    if '-plate-' not in p['id']:continue
    x0,z0=p['min'];x1,z1=p['max'];box('Marble finish '+p['id'],'Cream marble',(x0+x1)/2,p['y']+.003,(z0+z1)/2,x1-x0,.004,z1-z0,False,0)
compact_scene()
# Repeated building services: modeled vents/speakers, capped runtime light pool elsewhere.
for floor in SPATIAL['floors']:
    y=floor['y'];cy=y+min(floor['clearHeight']-.25,5.7)
    for z in [-43,43]:
        for x in [-84,-42,0,42,84]:
            box('HVAC diffuser','Ink',x,cy,z,2.6,.10,.55)
            for dx in [-.95,-.57,-.19,.19,.57,.95]:box('Diffuser blade','Warm porcelain',x+dx,cy-.065,z,.11,.02,.43)
            cylinder('Ceiling speaker','Ink',x+2,cy-.035,z,.17,.12)
            cylinder('Speaker grille','Warm porcelain',x+2,cy-.10,z,.13,.018)
            fixtures.append({'kind':'HVAC and speaker','level':floor['id'],'position':[x,cy,z]})
    # Directory markers are outside escalator axes and restaurant entrances.
    for x in [-22,22]:
        box('Wayfinding totem','Ink',x,y+1.1,47,1.0,2.2,.30,True,.07)
        text(floor['id']+' / AUREA',x,y+1.77,46.81,.15,True)
        text('SHOPS / DINING',x,y+1.32,46.81,.10,True)
        text('LIFTS  /  WC',x,y+.99,46.81,.12,True)
compact_scene()
for s in PLAN['shops']:
    previous_objects=set(bpy.context.scene.objects)
    y=-7.2 if s['level']=='B1' else next(f['y'] for f in SPATIAL['floors'] if f['id']==s['level'])
    x,z,w,d=s['x'],s['z'],s['w'],s['d'];front=-1 if z>0 else 1;door=z-front*d/2;back=z+front*d/2
    # front points outward toward the central east-west gallery.
    front=1 if z<0 else -1;door=z+front*d/2;back=z-front*d/2
    mat='Tenant '+s['id'];newmat(mat,s['color'])
    box('Tenant floor '+s['id'],'Cream marble',x,y+.014,z,w,.02,d)
    for xx in [x-w/2,x+w/2]:box('Tenant side '+s['id'],'Travertine',xx,y+2.4,z,.16,4.8,d,True)
    box('Tenant back '+s['id'],mat,x,y+2.4,back,w,4.8,.16,True)
    for a,b in [(x-w/2,x-2),(x+2,x+w/2)]:box('Storefront glass','Tenant glass',(a+b)/2,y+1.9,door,b-a,3.8,.08,True,0)
    box('Store fascia',mat,x,y+4.3,door,w,.9,.26,True)
    text(s['name'],x,y+4.05,door+front*.17,min(.55,w/(len(s['name'])*.62)),front<0)
    for xx in [x-w*.32,x+w*.32]:
        box('Lighting cove','Warm light',xx,y+4.65,z,.075,.045,d-1)
        if s['theme'] not in ['auto-showroom','alterations','watch-repair','concierge','members','styling','spa','art-gallery','shoes']:
            for zz in [z-d*.26,z+d*.26]:shelf(xx,y,zz,s['theme'],min(5,w*.28))
    # Clear continuous central aisle and real cashier position.
    box('Cashier desk','Walnut',x+w*.24,y+.55,back+front*3,w*.28,1.1,1.8,True,.10)
    box('Checkout screen','Ink',x+w*.24,y+1.35,back+front*3,.5,.38,.10)
    if s['theme'] in ['quick-food','coffee','healthy-food','chocolate','bookstore']:
        counterX=x-w*.25;counterZ=back+front*4
        box('Food preparation counter','Cream marble',counterX,y+.58,counterZ,min(12,w*.42),1.16,2.2,True,.10)
        box('Glass pastry case','Tenant glass',counterX,y+1.44,counterZ,3,.55,1.7)
        for k in range(6):
            sphere('Bread roll','Travertine',counterX-1+k*.38,y+1.22,counterZ,.12)
            cylinder('Drink cup','Warm porcelain',counterX-1+k*.38,y+1.33,counterZ+.5,.08,.23)
        for xx in [x-w*.26,x+w*.26]:
            for zz in [z-d*.08,z+d*.08]:table(xx,y,zz)
        if s['theme']=='healthy-food':
            for k in range(5):
                cylinder('Salad bowl','Warm porcelain',counterX-2+k,y+1.25,counterZ,.25,.15)
                for j in range(5):sphere('Salad vegetables','Foliage',counterX-2+k+.1*math.sin(j),y+1.36,counterZ+.1*math.cos(j),.07)
    if s['theme']=='bookstore':
        for xx in [x-20,x-10,x+10,x+20]:
            shelf(xx,y,z,'bookstore',6)
            bench(xx,y,z+10,4)
        # Gift cards and collectible model cars sit in their own glass cases.
        for xx in [x-22,x+22]:
            box('Collectibles case','Tenant glass',xx,y+1.1,z-12,6,1.4,1.3,True)
            for k in range(8):
                cx=xx-2.3+k*.65
                box('Scale car body','Burgundy',cx,y+1.15,z-12,.42,.12,.20,False,.05)
                box('Scale car cabin','Ink',cx,y+1.24,z-12,.20,.10,.18,False,.04)
                for dx in [-.14,.14]:
                    for dz in [-.105,.105]:sphere('Model car wheel','Ink',cx+dx,y+1.09,z-12+dz,.046)
                box('Greeting card','Rose cloth',cx,y+.63,z-11.4,.32,.42,.015)
    if s['theme'] in ['fashion','tailoring']:
        for xx in [x-w*.28,x+w*.28]:
            for k in range(5):
                zz=z-3+k*1.4;box('Tailored jacket',mat,xx,y+1.38,zz,.56,.74,.18,False,.08)
                for dx in [-.36,.36]:box('Jacket sleeve',mat,xx+dx,y+1.35,zz,.19,.61,.16,False,.05)
                for dx in [-.12,.12]:box('Suit trousers','Ink',xx+dx,y+.69,zz,.18,.72,.14,False,.04)
                for b in range(3):sphere('Suit button','Bronze',xx,y+1.23+b*.12,zz+.11,.017)
    if s['theme']=='electronics':
        for xx in [x-18,x+18]:
            for zz in [z-12,z,z+12]:
                box('Device demonstration table','Walnut',xx,y+.85,zz,9,.16,2.2,True,.08)
                for k in range(7):product('electronics',xx-3+k,y+.95,zz,k)
    if s['theme'] in ['hifi','furniture']:
        for xx in [x-21,x+21]:
            for zz in [z-13,z+13]:
                box('Lounge rug','Rose cloth',xx,y+.04,zz,11,.04,10)
                bench(xx,y,zz+2,6)
                box('Stone coffee table','Cream marble',xx,y+.38,zz-1,3.2,.13,1.4,True,.14)
                for dx in [-4,4]:
                    if s['theme']=='hifi':
                        box('Floorstanding speaker','Walnut',xx+dx,y+.85,zz-3,.65,1.7,.65,True,.12)
                        for h in [.38,.88,1.36]:
                            o=cylinder('Speaker driver','Ink',xx+dx,y+h,zz-2.66,.21,.06);o.rotation_euler.x=math.pi/2
                    else:chair(xx+dx,y,zz)
    if s['theme']=='gifts':
        for k in range(8):
            xx=x-10+k*3;sphere('Plush body','Rose cloth',xx,y+1.12,z,.24);sphere('Plush head','Rose cloth',xx,y+1.43,z,.21)
            for dx in [-.14,.14]:sphere('Plush ear','Rose cloth',xx+dx,y+1.62,z,.095)
    runpy.run_path(str(Path(__file__).with_name('mall-service-interiors.py')),init_globals=globals())
    runpy.run_path(str(Path(__file__).with_name('mall-fitout-detail.py')),init_globals=globals())
    unit_id='AUR-'+s['level']+'-'+s['id'].upper()
    # Namespace each unit's materials BEFORE batching: replacement no longer
    # requires touching neighbouring shops or the mall's structural shell.
    for obj in set(bpy.context.scene.objects)-previous_objects:
        if obj.type!='MESH':continue
        obj.data=obj.data.copy()
        for slot in obj.material_slots:
            if not slot.material:continue
            source=slot.material
            role=''
            if s['id'] in ['chanel-tailoring','balenciaga','dior','hermes','loewe','shoe-salon']:
                if obj.name.startswith(('Leather bag','Bag handle','Folded knitwear','Tailored jacket','Jacket sleeve','Suit trousers','Suit button','Shoe leather','Shoe sole','Shoe heel')):role='Inventory::'
                if obj.name.startswith('Wayfinding '+s['name']):role='Signage::'
            key=unit_id+'::'+role+source.name
            if key not in materials:
                clone=source.copy();clone.name=key;materials[key]=clone
            slot.material=materials[key]
    shops.append({**s,'unitId':unit_id,'revision':2,'asset':'/assets/3d/ampliworld/GC-MALL-TENANTS-001/units/'+s['id']+'.glb','floorY':y,'entry':[x,y,door+front*2],'inside':[x,y,door-front*3]})
    compact_scene()
# Roof: retained promenade, discrete gardens and seated outlooks, not a full opaque slab.
ry=SPATIAL['roofY']
for x in [-150,150]:
    for z in [-20,20,58]:
        box('Roof raised garden','Travertine',x,ry+.40,z,22,.8,9,True,.1)
        box('Roof planted lawn','Roof lawn',x,ry+.81,z,21.4,.03,8.4)
        for dx in [-8,-4,0,4,8]:plant(x+dx,ry+.83,z,1.7)
        bench(x,ry,z+7,9)
for z in [-72,72]:
    for x in [-85,-40,0,40,85]:
        bench(x,ry,z,5);table(x+5,ry,z)
# Outer roof edge guards, real colliders; existing inner atrium guards remain intact.
for x in [-189,189]:box('Roof edge glass','Tenant glass',x,ry+.65,0,.12,1.3,166,True,0)
for z in [-84,84]:box('Roof edge glass','Tenant glass',0,ry+.65,z,378,1.3,.12,True,0)
compact_scene()
bpy.ops.export_scene.gltf(filepath=str(OUT/'tenants.glb'),export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=18)
(OUT/'units').mkdir(exist_ok=True)
def export_selected(path,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),use_selection=True,export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=18)
for unit in shops:
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material and o.active_material.name.startswith(unit['unitId']+'::')]
    unit['meshes']=len(objects)
    unit['triangles']=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
    export_selected(OUT/'units'/(unit['id']+'.glb'),objects)
export_selected(OUT/'shared.glb',[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material and not o.active_material.name.startswith('AUR-')])
for mesh in list(bpy.data.meshes):
    mesh.use_fake_user=False
    if mesh.users==0:bpy.data.meshes.remove(mesh)
manifest={'id':'GC-MALL-TENANTS-001','origin':PLAN['origin'],'shops':shops,'fixtures':fixtures,'colliders':colliders,'meshes':len(bpy.context.scene.objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'roofY':ry,'limits':'Physical concept fit-outs; purchases, food service and staff workflow not connected. Brand labels imply no affiliation.'}
(OUT/'tenants-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'asset-library/blender/mall/GC-MALL-TENANTS-001.blend'),compress=True)
print('TENANTS READY',len(shops),'shops',manifest['triangles'],'triangles',flush=True)
