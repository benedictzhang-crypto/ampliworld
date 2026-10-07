"""Additional original sports retail millwork, soft goods and fitting spaces.
Executed by build-mall-sports.py; uses its materials, primitive cache and colliders.
"""
# Packed surface maps survive glTF export; no facade images or external assets.
for name,base in [('Court maple',(.46,.25,.10)),('Turf',(.055,.22,.08))]:
    m=materials[name];p=m.node_tree.nodes.get('Principled BSDF');rng=random.Random(82);size=256;pixels=[]
    for v in range(size):
        for u in range(size):
            if name=='Court maple':
                seam=-.10 if u%32<1 else 0
                variation=.022*math.sin(v*.22+math.sin(u*.035))+.014*((u//32)%3-1)+seam+rng.uniform(-.01,.01)
            else:variation=rng.uniform(-.035,.035)+.015*(u//32%2)
            pixels.extend([max(.01,min(1,c+variation)) for c in base]+[1])
    tex=bpy.data.images.new(name+' tactile finish',width=size,height=size);tex.pixels.foreach_set(pixels);tex.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex
    m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
    p.inputs['Roughness'].default_value=.39 if name=='Court maple' else .96
# Wall-sized panels replace undifferentiated black walls without blocking any floor path.
for shop in PLAN['shops']:
    z0=shop['min'][1];z1=shop['max'][1]
    for z in range(int(z0+3),int(z1-1),4):
        box('Wall acoustic timber panel','Walnut',185.7,Y+2.7,z,.18,4.6,3.75)
        box('Wall grazing strip','Warm light',185.58,Y+2.7,z-1.86,.05,4.3,.035)
    # Entry threshold is inset above the original coplanar shell floor.
    ex,ez=shop['entry'];box('Entry stone threshold','Ink',128,Y+.023,ez,4,.012,5.4)
    for z in [ez-3.15,ez+3.15]:box('Entry bronze jamb','Bronze',126,Y+2.4,z,.42,4.8,.24)
    box('Entry lit soffit','Warm light',128,Y+4.85,ez,4,.055,5.7)
    for z in range(int(z0+4),int(z1-2),6):
        box('Ceiling acoustic raft','Walnut',177,Y+6.55,z,13,.14,1.3)
# Product display mannequins use continuous rounded volumes at human scale.
def mannequin(x,z,color,pose=0):
    box('Mannequin display island','Travertine',x,Y+.14,z,2.6,.28,2.0,True,.14)
    # Soft mesh garment torso and neck, with bent limbs and modeled shoes.
    box('Tailored sports torso',color,x,Y+1.47,z,.46,.62,.25,False,.10)
    cylinder('Mannequin neck','Sport white',x,Y+1.86,z,.07,.15)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=.13,location=(x,-z,Y+2.04))
    bpy.context.object.data.materials.append(materials['Sport white'])
    for s in [-1,1]:
        elbow=(x+s*.32,Y+1.34,z+pose*.15);hand=(x+s*.27,Y+1.08,z+pose*.32)
        link('Sleeved upper arm',color,(x+s*.23,Y+1.70,z),elbow,.078)
        link('Mannequin forearm','Sport white',elbow,hand,.055)
        link('Jogger leg','Ink',(x+s*.12,Y+1.17,z),(x+s*.15,Y+.52,z+s*.10),.087)
        shoe(x+s*.16,Y+.35,z+s*.10,'Sport white')
for x,z,col in [(143,-47,'Sport orange'),(174,-34,'Sport blue'),(160,18,'Sport white')]:mannequin(x,z,col,1)
# Shoe-care / fitting pods: actual side walls, bench and mirror, door opening faces west.
for z in [-69,-61]:
    box('Fitting pod back','Walnut',183.8,Y+1.7,z,.16,3.4,3.2,True)
    for zz in [z-1.6,z+1.6]:box('Fitting pod side','Walnut',181.8,Y+1.7,zz,4.2,3.4,.13,True)
    box('Fitting mirror','Glass',183.68,Y+1.7,z,.035,2.4,1.6)
    box('Fitting stool','Sage upholstery',182.3,Y+.45,z,1.2,.9,.65,True,.12)
    label('FITTING',182,Y+3.65,z,.23)
# Raised seam lines and retail storytelling panels; keep the court run-off unobstructed.
for x in range(150,166):box('Court plank seam','Walnut',x,Y+.043,-63,.013,.003,14,False,0)
box('Court identity panel','Ink',157.5,Y+4.3,-75,12,1.8,.18)
label('COURT 01',157.5,Y+4.36,-74.87,.67)
label('BASKETBALL / FOOTWEAR LAB',157.5,Y+3.91,-74.86,.21)
for x in [172,176,180]:
    box('Spectator bench','Walnut',x,Y+.46,-48,2.9,.40,1.1,True,.15)
    box('Bench support','Ink',x,Y+.17,-48,2.0,.34,.6)
# Golf lounge outside the terrain boundary. Bags get real handles, pockets and clubs.
for x in [143,151,159,167,175]:
    box('Golf lounge bench','Sage upholstery',x,Y+.5,36,4.8,.5,1.2,True,.19)
    box('Golf lounge back','Sage upholstery',x,Y+1.0,35.5,4.8,.7,.23)
for x in [150,160,170]:
    cylinder('Golf bag','Sport blue',x+1.8,Y+.73,74,.23,1.1)
    box('Golf bag pocket','Ink',x+1.8,Y+.7,74.22,.3,.45,.17,False,.08)
    link('Bag carry handle','Bronze',(x+1.54,Y+.6,74),(x+1.54,Y+1.0,74),.035)
# Bicycles: wheel orientation, hubs, spokes and bars align with the real frame plane.
for x in [158,164]:
    z=-4
    for zz in [z-.82,z+.82]:
        ring('Display cycle wheel','Ink',x,Y+.50,zz,.43,True);bpy.context.object.rotation_euler.z=math.pi/2
        for n in range(12):
            a=n*math.tau/12;link('Cycle spoke','Bronze',(x,Y+.5,zz),(x,Y+.5+.4*math.sin(a),zz+.4*math.cos(a)),.006)
    for a,b in [((x,Y+.5,z-.82),(x,Y+1.05,z-.25)),((x,Y+1.05,z-.25),(x,Y+.5,z+.82)),((x,Y+.5,z+.82),(x,Y+.5,z-.82))]:link('Display cycle frame','Sport orange',a,b,.04)
    link('Handlebar stem','Ink',(x,Y+.5,z+.82),(x,Y+1.13,z+.65),.035)
    link('Handlebars','Ink',(x-.32,Y+1.13,z+.65),(x+.32,Y+1.13,z+.65),.024)
    box('Cycle saddle','Ink',x,Y+1.19,z-.25,.25,.11,.4)
