"""Original concept interiors, executed inside build-mall-fitout.py's Blender scene.
Brand labels identify reference concepts, not licensed tenants or official stores.
All dimensions are metres. Structural shop shells are replaced, not overlaid.
"""
from mathutils import Vector
PLAN=json.loads((ROOT/'app/world-client/mall-luxury-plan.json').read_text())

def finish(name,color,rough=.4,metal=0,pattern=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if pattern:
        size=256;pixels=[];rng=random.Random(143)
        for v in range(size):
            for u in range(size):
                n=rng.uniform(-.008,.008);a=u/256;b=v/256
                if pattern=='marble':
                    vein=abs(math.sin(a*8+b*11+.55*math.sin(a*31+b*7)+.24*math.sin(a*63-b*37)))
                    strength=.014 if sum(color)>1 else .045
                    detail=(strength if vein<.012 else 0)+n*.15
                elif pattern=='jacquard':
                    xx=(u%64)/64-.5;zz=(v%64)/64-.5
                    ring=min(abs(math.hypot(xx-.12,zz)-.25),abs(math.hypot(xx+.12,zz)-.25))
                    detail=(-.105 if ring<.028 else 0)+n+(.006 if u%2 else -.006)
                else:detail=n
                pixels.extend([min(1,max(.005,c+detail)) for c in color]+[1])
        im=bpy.data.images.new(name+' packed finish',width=size,height=size);im.pixels.foreach_set(pixels);im.pack()
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
        m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10;bump.inputs['Distance'].default_value=.018
        m.node_tree.links.new(tex.outputs['Color'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    materials[name]=m
    return m

finish('Tiffany blue',(.18,.66,.62),.3)
finish('Cartier lacquer',(.25,.018,.035),.24)
finish('Ivory plaster',(.78,.73,.64),.72)
finish('Black marble',(.018,.023,.028),.19,pattern='marble')
finish('White marble',(.72,.73,.70),.23,pattern='marble')
finish('Gucci jacquard',(.40,.28,.16),.7,pattern='jacquard')
finish('Chrome',(.60,.65,.68),.17,.95)
for n,c in [('Puffer green',(.025,.24,.10)),('Puffer red',(.52,.016,.035)),('Puffer black',(.018,.021,.025)),('Puffer white',(.84,.84,.80)),('Puffer grey',(.23,.25,.27))]:
    finish(n,c,.3)
glass=finish('Display crystal',(.70,.88,.90),.075)
gp=glass.node_tree.nodes.get('Principled BSDF');gp.inputs['Alpha'].default_value=.17
glass.diffuse_color=(.70,.88,.90,.17);glass.surface_render_method='DITHERED';glass.use_backface_culling=True
cold=finish('White light',(.92,.97,1),.3)
cp=cold.node_tree.nodes.get('Principled BSDF');cp.inputs['Emission Color'].default_value=(.92,.97,1,1);cp.inputs['Emission Strength'].default_value=1.4
serif=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Times New Roman.ttf')
sans=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial.ttf')

def label(body,x,y,z,size=.5,mat='Bronze',serif_face=False):
    bpy.ops.object.text_add(location=(x,-z,y),rotation=(math.pi/2,0,math.pi));o=bpy.context.object
    o.data.body=body;o.data.font=serif if serif_face else sans;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.008;o.data.bevel_depth=0;o.data.resolution_u=4
    o.data.materials.append(materials[mat]);bpy.ops.object.convert(target='MESH')

orb_meshes={}
loop_meshes={}
def orb(name,mat,x,y,z,sx,sy,sz):
    if mat in orb_meshes:
        o=bpy.data.objects.new(name,orb_meshes[mat]);bpy.context.collection.objects.link(o);o.location=(x,-z,y);o.scale=(sx,sz,sy);return o
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.scale=(sx,sz,sy);o.data.materials.append(materials[mat])
    for p in o.data.polygons:p.use_smooth=True
    orb_meshes[mat]=o.data
    return o

def link(name,mat,a,b,r=.024):
    aa=Vector((a[0],-a[2],a[1]));bb=Vector((b[0],-b[2],b[1]));delta=bb-aa
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=delta.length,location=(aa+bb)/2);o=bpy.context.object;o.name=name;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.data.materials.append(materials[mat]);return o

def loop(name,mat,x,y,z,r=.22,minor=.015):
    key=(mat,r,minor)
    if key in loop_meshes:
        o=bpy.data.objects.new(name,loop_meshes[key]);bpy.context.collection.objects.link(o);o.location=(x,-z,y);o.rotation_euler=(math.pi/2,0,0);return o
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=minor,major_segments=24,minor_segments=6,location=(x,-z,y),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.materials.append(materials[mat])
    loop_meshes[key]=o.data
    return o

def bag(x,y,z,mat='Walnut'):
    box('Leather bag body',mat,x,y+.22,z,.52,.40,.20,False,.095)
    box('Bag flap',mat,x,y+.34,z-.11,.50,.15,.04,False,.04)
    loop('Bag handle','Bronze',x,y+.54,z,.13,.019)
    box('Bag clasp','Bronze',x,y+.28,z-.138,.075,.052,.018)

def curve_tube(name,mat,points,r=.006):
    bpy.ops.object.select_all(action='DESELECT')
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r;c.bevel_resolution=2
    spline=c.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(co[0],-co[2],co[1],1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat])
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)

def diamond(x,y,z,r=.018):
    # Faceted crown / girdle / pavilion, opaque pale crystal for readable facets.
    vertices=[]
    for radius,yy in [(r*.48,y+r*.48),(r,y),(r*.10,y-r*.72)]:
        vertices.extend((x+radius*math.cos(i*math.tau/8),-z+radius*math.sin(i*math.tau/8),yy) for i in range(8))
    faces=[tuple(range(8))]
    for j in range(2):
        for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    mesh=bpy.data.meshes.new('Cut diamond');mesh.from_pydata(vertices,[],faces);mesh.materials.append(materials['White marble'])
    o=bpy.data.objects.new('Diamond crown and pavilion',mesh);bpy.context.collection.objects.link(o)

def jewelry(x,y,z,smile=False):
    orb('Velvet necklace bust','Ink',x,y+.22,z,.18,.29,.115)
    if smile:
        # Fine chains descend into a continuous smile-shaped bar, not a pendant blob.
        curve_tube('Fine necklace chain','Bronze',[(x-.11,y+.43,z-.07),(x-.12,y+.28,z-.13),(x-.105,y+.22,z-.145)],.003)
        curve_tube('Fine necklace chain','Bronze',[(x+.11,y+.43,z-.07),(x+.12,y+.28,z-.13),(x+.105,y+.22,z-.145)],.003)
        curve_tube('Smile arc necklace','Bronze',[(x+.105*t,y+.175+.045*t*t,z-.146) for t in [i/12 for i in range(-12,13)]],.009)
    else:loop('Gold necklace','Bronze',x,y+.28,z-.12,.15,.009)
    for dx in [-.43,.43]:
        box('Ring cushion','Sage upholstery',x+dx,y+.035,z,.20,.07,.18,False,.035)
        loop('Solitaire ring','Bronze',x+dx,y+.085,z,.024,.005)
        diamond(x+dx,y+.114,z,.023)
    box('Earring velvet pad','Sage upholstery',x+.75,y+.035,z,.20,.07,.18,False,.025)
    for dx in [.72,.78]:
        cylinder('Diamond stud setting','Chrome',x+dx,y+.075,z,.018,.018)
        diamond(x+dx,y+.09,z,.017)

garment_meshes={}
def quilted_garment(x,y,z,mat):
    if mat not in garment_meshes:
        vertices=[];faces=[]
        # A continuous sewn shell with shallow quilt channels, not stacked balls.
        def tube(rings,sides,profile):
            offset=len(vertices)
            for j in range(rings+1):
                t=j/rings;cx,yy,rx,rz=profile(t)
                for k in range(sides):
                    a=k*math.tau/sides
                    vertices.append((cx+math.cos(a)*rx,-math.sin(a)*rz,yy))
            for j in range(rings):
                for k in range(sides):
                    a=offset+j*sides+k;b=offset+j*sides+(k+1)%sides
                    faces.append((a,b,b+sides,a+sides))
            faces.append(tuple(offset+k for k in reversed(range(sides))))
            faces.append(tuple(offset+rings*sides+k for k in range(sides)))
        def torso(t):
            q=.012*(1-math.cos(t*math.pi*10))
            shoulder=1-.34*max(0,(t-.80)/.20)
            return (0,.20+t*.70,(.253+.014*math.sin(t*math.pi)+q)*shoulder,.142+q*.65)
        tube(40,24,torso)
        for side in [-1,1]:
            def arm(t,side=side):
                q=.007*(1-math.cos(t*math.pi*8))
                return (side*(.42-.13*t),.22+t*.62,.077+.018*t+q,.096+.012*t+q)
            tube(32,16,arm)
        mesh=bpy.data.meshes.new('Continuous quilted shell');mesh.from_pydata(vertices,[],faces);mesh.update();mesh.materials.append(materials[mat])
        for p in mesh.polygons:p.use_smooth=True
        garment_meshes[mat]=mesh
    o=bpy.data.objects.new('Tailored quilted jacket',garment_meshes[mat]);bpy.context.collection.objects.link(o);o.location=(x,-z,y)

def puffer(x,y,z,mat):
    # Soft quilted body, articulated sleeves, collar, hood and visible zipper.
    quilted_garment(x,y,z,mat)
    for side in [-1,1]:
        box('Jacket cuff','Puffer black',x+side*.42,y+.20,z,.17,.075,.20,False,.045)
    orb('Raised collar',mat,x,y+.94,z,.16,.11,.12)
    loop('Hood seam',mat,x,y+.98,z+.075,.135,.034)
    box('Jacket zipper','Chrome',x,y+.55,z-.165,.012,.61,.016,False,0)
    for side in [-1,1]:box('Pocket zipper','Chrome',x+side*.15,y+.41,z-.16,.09,.012,.018,False,0)
    link('Hanger','Chrome',(x-.25,y+1.03,z),(x,y+1.19,z),.012);link('Hanger','Chrome',(x,y+1.19,z),(x+.25,y+1.03,z),.012)
    loop('Hanger hook','Chrome',x,y+1.26,z,.055,.009)

def display_case(x,y,z,accent,kind='jewelry'):
    box('Display cabinet solid base',accent,x,y+.40,z,2.5,.80,.95,True,.065)
    box('Cabinet bronze reveal','Bronze',x,y+.81,z,2.55,.045,.98)
    box('Display velvet tray','Ink',x,y+.855,z,2.32,.045,.77)
    for dz in [-.48,.48]:box('Crystal case wall','Display crystal',x,y+1.10,z+dz,2.5,.5,.012)
    for dx in [-1.25,1.25]:box('Crystal case side','Display crystal',x+dx,y+1.10,z,.012,.5,.96)
    box('Crystal case top','Display crystal',x,y+1.355,z,2.52,.018,.98)
    for dx in [-1.22,1.22]:box('Case frame','Bronze',x+dx,y+1.10,z,.026,.51,.96)
    if kind in ['jewelry','smile']:jewelry(x,y+.89,z,kind=='smile')
    else:
        for dx in [-.6,0,.6]:bag(x+dx,y+.86,z,'Gucci jacquard')

def fit_shop(shop,base):
    x=shop['centerX'];brand=shop['id'];duplex=brand=='gucci';is_upper=base>1
    accent={'tiffany':'Tiffany blue','gucci':'Walnut','cartier':'Cartier lacquer','moncler':'Black marble','chloe':'Ivory plaster'}[brand]
    floor='Black marble' if brand=='moncler' else 'White marble' if brand in ['tiffany','cartier'] else 'Travertine'
    metal='Chrome' if brand in ['moncler','tiffany'] else 'Bronze';light='White light' if brand in ['moncler','tiffany'] else 'Warm light'
    height=next(f['clearHeight'] for f in SPATIAL['floors'] if f['y']==base)
    glazing_h=height-1.25
    sign_y=height-.7
    # Genuine enclosing wall volumes; 3.4m door is the only front opening.
    wall='Ivory plaster' if brand in ['tiffany','chloe','cartier'] else accent
    for dx in [-7.85,7.85]:box(brand+' party wall',wall,x+dx,base+height/2,62.5,.30,height,23,True,.025)
    box(brand+' rear wall',accent,x,base+height/2,73.86,15.4,height,.25,True)
    if not is_upper:
        box(brand+' inset floor',floor,x,base+.009,62.5,15.4,.018,22.7,False,0)
    else:
        # Do not lay a decorative carpet across either structural opening.
        box('Gucci upper centre floor',floor,x,base+.009,62.5,6,.018,22.7,False,0)
    if not duplex or is_upper:
        box(brand+' ceiling','Ivory plaster',x,base+height,62.5,15.4,.18,22.7,True)
    for dx in [-7.65,-1.85,1.85,7.65]:box(brand+' front pier',accent,x+dx,base+height/2,50.93,.28,height,.45,True)
    for dx in [-4.75,4.75]:
        box(brand+' glazing','Display crystal',x+dx,base+glazing_h/2,51,5.5,glazing_h,.028,True,0)
        box('Deep window sill',floor,x+dx,base+.25,51.7,5.55,.5,1.30,True,.08)
        box('Window canopy',accent,x+dx,base+glazing_h+.14,51.4,5.6,.22,1)
        box('Window washing light',light,x+dx,base+glazing_h-.02,51.8,5.2,.06,.30)
        if brand=='moncler':
            for n,col in enumerate(['Puffer red','Puffer white','Puffer black']):puffer(x+dx+(n-1)*1.35,base+.65,51.8,col)
        elif brand in ['tiffany','cartier']:jewelry(x+dx,base+.55,51.7,brand=='tiffany')
        else:
            for n in [-1,0,1]:bag(x+dx+n*1.4,base+.51,51.6,'Gucci jacquard' if duplex else 'Walnut')
    box(brand+' sign fascia',accent,x,base+sign_y,50.9,15.5,.8,.5,True)
    label(shop['label'],x,base+sign_y-.20,50.62,.64,metal,brand in ['tiffany','cartier','chloe'])
    label('LEATHER GOODS  /  PRIVATE SALON' if duplex else shop['theme'].upper(),x,base+glazing_h-.34,50.64,.16,metal)
    for dx in [-6.7,6.7]:
        if duplex and dx<0:continue # Left-hand stairs, no cabinetry in their envelope.
        if duplex:zzs=[56,60,64]
        else:zzs=[56,60,64,68,71.5]
        for zz in zzs:
            if brand=='moncler':
                side=1 if dx>0 else -1
                box('Apparel niche back','Ink',x+dx+side*.64,base+2.05,zz,.10,3.6,3.2,True)
                for edge in [-1.55,1.55]:box('Apparel niche cheek','Chrome',x+dx,base+2.05,zz+edge,1.35,3.6,.10,True)
                box('Apparel niche base','Black marble',x+dx,base+.35,zz,1.35,.20,3.2,True)
                box('White niche light',light,x+dx,base+3.76,zz,1.2,.05,2.9)
                link('Garment rail','Chrome',(x+dx-.35,base+2.8,zz-1.1),(x+dx-.35,base+2.8,zz+1.1))
                for n,col in enumerate(['Puffer green','Puffer red','Puffer black','Puffer white','Puffer grey']):
                    puffer(x+dx-.38,base+1.45,zz-1+n*.5,col)
            else:
                side=1 if dx>0 else -1
                box('Cabinet recessed back',accent,x+dx+side*.55,base+2.25,zz,.10,3.6,2.7,True)
                for edge in [-1.30,1.30]:box('Cabinet cheek',metal,x+dx,base+2.25,zz+edge,1.2,3.6,.08,True)
                box('Cabinet crown',accent,x+dx,base+4.01,zz,1.2,.09,2.7,True)
                for yy in [.8,1.8,2.8]:
                    box('Floating stone shelf',floor,x+dx,base+yy,zz,1.27,.055,2.6)
                    box('Shelf wash',light,x+dx,base+yy+.10,zz+.99,1.05,.04,.07)
                    if brand in ['tiffany','cartier']:jewelry(x+dx,base+yy+.05,zz,brand=='tiffany')
                    else:bag(x+dx,base+yy+.04,zz,'Gucci jacquard' if duplex else 'Walnut')
    # Islands stay outside central access and the Gucci lift approach.
    for dx in ([-2.8,2.8] if not duplex else [0]):
        if brand in ['tiffany','cartier']:display_case(x+dx,base,60,accent,'smile' if brand=='tiffany' else 'jewelry')
        elif brand=='moncler':
            box('Moncler upholstered bench','Puffer grey',x+dx,base+.43,61,1.7,.60,3,True,.18)
            for yy in [height-.24]:box('White linear ceiling',light,x+dx,base+yy,62,.16,.06,18)
        else:
            display_case(x+dx,base,60,accent,'bags')
    if not duplex:
        for dx in [-2.3,2.3]:
            box('Consultation sofa',accent,x+dx,base+.37,70,2.7,.5,1,True,.16)
            box('Sofa curved back',accent,x+dx,base+.81,70.40,2.7,.65,.20,True,.095)
        cylinder('Consultation table',metal,x,base+.62,69,.70,.10)
        box('Table support',metal,x,base+.30,69,.50,.60,.50,True)
    for zz in [55.5,61.5,67.5]:
        if not duplex or is_upper:
            box('Recessed ceiling field','White marble',x,base+height-.1,zz,10,.10,4.8)
            for dx in [-4.9,4.9]:box('Cove diffuser',light,x+dx,base+height-.17,zz,.07,.04,4.6)
            for dx in [-3,0,3]:cylinder('Downlight',light,x+dx,base+height-.19,zz,.13,.035)
    if brand=='chloe':
        # Curved brass fitting-room arch and a soft, nonrectangular display island.
        for dx in [-3.5,3.5]:link('Fitting portal',metal,(x+dx,base,72.8),(x+dx,base+2.6,72.8),.06)
        points=[(x+3.5*math.cos(i*math.pi/24),base+2.6+1.0*math.sin(i*math.pi/24),72.8) for i in range(25)]
        for a,b in zip(points,points[1:]):link('Curved fitting arch',metal,a,b,.06)
    return {'id':shop['id'],'label':shop['label'],'centerX':x,'doorZ':51,'floorY':base,'theme':shop['theme'],'clearDoorMeters':3.4,'light':shop['light'],'inventory':['smile arc necklaces','solitaire rings','diamond stud earrings'] if brand=='tiffany' else []}

BRAND_ROOMS=[]
for shop in PLAN['shops']:
    if shop.get('fitout')=='retail-expansion':continue
    for level in shop['levels']:BRAND_ROOMS.append(fit_shop(shop,next(f['y'] for f in SPATIAL['floors'] if f['id']==level)))

# Gucci stair is a real staircase through an actual L2 slab opening.
s=PLAN['stairs'];step_d=(s['max'][1]-s['min'][1])/s['steps'];step_h=(s['high']-s['low'])/s['steps'];cx=(s['min'][0]+s['max'][0])/2
for i in range(s['steps']):
    z=s['min'][1]+(i+.5)*step_d;y=s['low']+(i+1)*step_h
    box('Gucci stair tread','White marble',cx,y-.10,z,3.4,.20,step_d+.006,True,.018)
    box('Stair nosing','Bronze',cx,y+.012,z-step_d*.45,3.30,.022,.035,False,0)
    for dx in [-1.7,1.7]:
        box('Stair guarded edge','Display crystal',cx+dx,y+.52,z,.065,1.08,step_d+.01,True,0)
        link('Stair brass handrail','Bronze',(cx+dx,y+1.10,z-step_d/2),(cx+dx,y+1.10+step_h,z+step_d/2),.035)
label('GUCCI  /  PRIVATE SALON L2',-54,2.8,72.9,.35,'Bronze')
for xx in s['min'][0],s['max'][0]:
    box('L2 stair void guard','Display crystal',xx,s['high']+.59,63,.075,1.18,18,True,0)
    box('L2 stair void cap','Bronze',xx,s['high']+1.19,63,.10,.065,18)
box('L2 void front guard','Display crystal',cx,s['high']+.59,54,3.4,1.18,.075,True,0)

# Continuous glass lift enclosure; the two landing doors and cab are runtime meshes.
l=PLAN['lift'];x=l['x'];z=l['z']
private_top=SPATIAL['floors'][1]['y']+SPATIAL['floors'][1]['clearHeight']
for dx in [-1.46,1.46]:box('Private lift side','Display crystal',x+dx,(private_top+.17)/2,z,.12,private_top-.17,5,True,0)
box('Private lift rear','Walnut',x,(private_top+.17)/2,z+2.5,2.92,private_top-.17,.16,True)
for i,y in enumerate([f['y'] for f in SPATIAL['floors'][:2]]):
    upper=SPATIAL['floors'][1]['y'] if i==0 else private_top
    box('Private lift upper front','Display crystal',x,(upper+y+3.73)/2,z-2.48,2.92,upper-y-3.73,.12,True,0)
    box('Private lift header','Walnut',x,y+3.43,z-2.48,2.92,.6,.16,True)
    label('LIFT  /  L1 — L2',x,y+3.3,z-2.60,.18,'Bronze')
    for dx in [-1.46,1.46]:box('Private lift door jamb','Bronze',x+dx,y+1.55,z-2.48,.12,3.1,.20,True)

"""Published references recorded in docs/MALL_LUXURY_DESIGN.md; no web photos embedded."""
