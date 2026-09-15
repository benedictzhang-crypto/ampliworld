"""Original sculpted residences inspired by the owner's spatial references.
Blender-native metre geometry; references are not used as facade textures.
"""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
root=Path(__file__).resolve().parents[2]
out=root/'public/assets/3d/ampliworld/GC-CBD-RESIDENCES-001'
edit=root/'asset-library/blender/cbd';out.mkdir(parents=True,exist_ok=True)
palette={'limestone':(.58,.55,.49,1),'bronze':(.22,.17,.11,1),'teak':(.34,.17,.075,1),'glass':(.36,.52,.57,.25),'cream':(.8,.75,.64,1),'leaf':(.12,.25,.1,1),'trunk':(.19,.11,.055,1),'light':(1,.66,.27,1),'marble':(.73,.71,.67,1)}
mats={};buckets={};colliders=[];surfaces=[];buildings=[]
for name,color in palette.items():
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color
 p.inputs['Roughness'].default_value=.23 if name in ['bronze','marble','glass'] else .55
 p.inputs['Metallic'].default_value=.75 if name=='bronze' else 0
 if name=='glass':p.inputs['Alpha'].default_value=.25;m.surface_render_method='DITHERED'
 if name=='light':p.inputs['Emission Color'].default_value=color;p.inputs['Emission Strength'].default_value=2
 mats[name]=m
def mesh(name,verts,faces):
 v,f=buckets.setdefault(name,([],[]));n=len(v);v.extend(verts);f.extend([tuple(n+i for i in a)for a in faces])
def box(name,x,y,z,w,d,h,solid=False,label='solid'):
 mesh(name,[(x+a*w/2,y+b*d/2,z+c*h/2)for c in [-1,1]for b in [-1,1]for a in [-1,1]],[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)])
 if solid:colliders.append({'id':f'{label}-{len(colliders)}','min':[x-w/2,z-h/2,-y-d/2],'max':[x+w/2,z+h/2,-y+d/2]})
def contour(x,y,w,d,phase=0):
 pts=[]
 for i in range(64):
  a=i*math.tau/64;c=math.cos(a);s=math.sin(a)
  xx=w/2*math.copysign(abs(c)**.5,c);yy=d/2*math.copysign(abs(s)**.6,s)
  if s<0:yy-=2.0*math.cos(xx/w*math.tau*2+phase)
  pts.append((x+xx,y+yy))
 return pts
def slab(name,points,z,h):
 n=len(points);mesh(name,[(x,y,z+t*h)for t in [0,1]for x,y in points],[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)])
def band(name,points,z,h,thickness):
 # Curved continuous terrace fascia/railing, including actual inner face.
 cx=sum(p[0]for p in points)/len(points);cy=sum(p[1]for p in points)/len(points)
 inner=[(x-(x-cx)*thickness/15,y-(y-cy)*thickness/12)for x,y in points];n=len(points)
 verts=[(x,y,zz)for zz in [z,z+h]for ring in [points,inner]for x,y in ring];faces=[]
 for i in range(n):
  j=(i+1)%n;faces.extend([(i,j,j+2*n,i+2*n),(n+j,n+i,3*n+i,3*n+j),(i+n,j+n,j,i),(i+2*n,j+2*n,j+3*n,i+3*n)])
 mesh(name,verts,faces)
def sphere(name,x,y,z,r,scale=(1,1,1)):
 verts=[]
 for j in range(7):
  a=math.pi*j/6
  for i in range(12):
   b=math.tau*i/12;verts.append((x+r*math.sin(a)*math.cos(b)*scale[0],y+r*math.sin(a)*math.sin(b)*scale[1],z+r*math.cos(a)*scale[2]))
 mesh(name,verts,[(j*12+i,j*12+(i+1)%12,(j+1)*12+(i+1)%12,(j+1)*12+i)for j in range(6)for i in range(12)])
def sofa(x,y,z):
 box('cream',x,y,z+.38,3,1,.55,True,'sofa');box('cream',x,y+.42,z+.8,3,.25,.8)
 for s in [-1,1]:box('cream',x+s*1.38,y,z+.68,.3,1,.6)
 box('marble',x,y-1.8,z+.43,1.8,.95,.13,True,'coffee-table');box('bronze',x,y-1.8,z+.21,.8,.5,.4)
# Five independent buildings in the eastern CBD pocket; 45–65m spacing.
placements=[(-30,70,7),(30,60,8),(-32,-10,6),(32,-20,7),(0,-90,8)]
for index,(cx,cy,floors) in enumerate(placements):
 w=29+(index%2)*2;d=23+(index%3);phase=index*.37
 buildings.append({'id':f'GC-CBD-LUX-{index+1:02}','name':f'云庭 {index+1} 座','position':[cx,0,-cy],'floors':floors,'floorHeight':4.2,'terraceDepth':3.5,'interior':'furnished ground lobby; upper floors visual only'})
 points=contour(cx,cy,w,d,phase)
 slab('limestone',contour(cx,cy,w+5,d+5,phase),0,.16)
 surfaces.append({'min':[cx-w/2-2,-cy-d/2-2],'max':[cx+w/2+2,-cy+d/2+2],'y':.16})
 surfaces.append({'min':[cx-10,-cy-6],'max':[cx+10,-cy+6],'y':.245})
 # Ground lobby: three solid sides, two glazed frontage wings, open central door.
 box('limestone',cx,cy+6,2.15,20,.45,4.3,True,'rear-wall')
 for side in [-1,1]:
  box('limestone',cx+side*10,cy,2.15,.45,12,4.3,True,'side-wall')
  box('glass',cx+side*6.3,cy-6,2.15,7.4,.14,3.9,True,'lobby-glazing')
  sofa(cx+side*5.5,cy+2,.16)
  box('bronze',cx+side*2.6,cy-6,2.1,.18,.4,4.2,True,'entry-jamb')
 box('marble',cx,cy+4.4,1.05,5,1,1.8,True,'concierge')
 for f in range(floors):
  z=-.16 if f==0 else .16+f*4.2
  # Broad sculpted floor plates with timber ceilings, not strips over a box.
  slab('limestone',points,z,.32);slab('teak',contour(cx,cy,w-.35,d-.35,phase),z+.33,.075)
  if f>0:slab('teak',contour(cx,cy,w-.4,d-.4,phase),z-.045,.035)
  band('bronze',points,z+.15,.13,.12)
  if f>0:
   band('glass',points,z+.44,1.08,.09);band('bronze',points,z+1.52,.055,.065)
  if f>0:
   inner=contour(cx,cy,w-7,d-7,phase)
   band('glass',inner,z+.4,3.75,.1)
   # Opaque lift/service core makes occupied depth visible behind the glazing.
   box('limestone',cx,cy+2,z+2.1,4,7,3.85)
   for s in [-1,1]:sofa(cx+s*5,cy-1,z+.4)
  # Warm ceiling downlights and vertical stone piers, spaced as structure.
  for sx in [-1,1]:
   box('limestone',cx+sx*(w/2-5),cy,z+2.3,.75,d-6,3.9,f==0,'pier')
   for yy in [-7,-2,3,8]:box('light',cx+sx*(w/2-2),cy+yy,z+4.1,.22,.22,.04)
   # Wood decking, terrace furniture and planted pots.
   for yy in range(-9,10):box('bronze',cx+sx*(w/2-2),cy+yy,z+.414,3,.025,.018)
   if f>0:
    box('teak',cx+sx*(w/2-2),cy-3,z+.82,1.6,.8,.12)
    sphere('cream',cx+sx*(w/2-2),cy-5,z+.85,.6,(1,.9,.65))
    box('limestone',cx+sx*(w/2-2),cy+6,z+.75,.9,.9,.7)
    sphere('leaf',cx+sx*(w/2-2),cy+6,z+1.4,.6)
 slab('teak',points,.16+floors*4.2,.16);slab('limestone',contour(cx,cy,w+.4,d+.4,phase),.32+floors*4.2,.3)
 # Dense-but-grounded garden clusters around the communal paths.
 for side in [-1,1]:
  tx=cx+side*(w/2+3);ty=cy-6
  box('limestone',tx,ty,.42,2.2,4,.65,True,'garden')
  box('trunk',tx,ty,2.4,.25,.25,4)
  for j in range(7):sphere('leaf',tx+math.sin(j*2.4),ty+math.cos(j*2.4),4.1+j%3*.6,1.2,(1,.9,1.3))
 # Entry walk meets the public garden circulation without a raised stair.
 box('limestone',cx,cy-20,.06,5,17,.12)
# Spine promenade; no asphalt or existing road is overwritten.
box('limestone',0,0,.055,6,230,.11)
box('limestone',-37.5,-113,.055,75,4,.11)
surfaces.append({'min':[-75,111],'max':[3,115],'y':.11})
for mat,(v,f) in buckets.items():
 data=bpy.data.meshes.new(mat);data.from_pydata(v,[],f);data.update()
 obj=bpy.data.objects.new(mat,data);bpy.context.collection.objects.link(obj);data.materials.append(mats[mat])
 if mat in ['cream','marble']:
  bevel=obj.modifiers.new('Soft furniture edges','BEVEL');bevel.width=.025;bevel.segments=1;bevel.limit_method='ANGLE'
 if mat=='leaf':
  for p in data.polygons:p.use_smooth=True
scene=bpy.context.scene
bpy.ops.export_scene.gltf(filepath=str(out/'residences.glb'),export_format='GLB',export_apply=True)
deps=bpy.context.evaluated_depsgraph_get()
triangles=sum(sum(len(p.vertices)-2 for p in o.evaluated_get(deps).data.polygons) for o in scene.objects if o.type=='MESH')
manifest={'id':'GC-CBD-RESIDENCES-001','name':'云庭曲廊 · 五栋露台公馆','units':'metres','triangles':triangles,'bytes':(out/'residences.glb').stat().st_size,'buildings':buildings,'colliders':colliders,'surfaces':surfaces,'bounds':{'min':[-53,0,-115],'max':[53,35,115]},'provenance':'Original geometry inspired by user reference spatial features; no facade photography used','limitations':['Upper apartments are furnished visual shells; functional lifts and upper-floor access are pending.','No resident accounts or ownership reassignment in this asset pass.']}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
scene.world=bpy.data.worlds.new('Daylight');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.58,.72,.88,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='SUN',location=(0,0,60));bpy.context.object.data.energy=3;bpy.context.object.rotation_euler=(.5,-.5,-.3)
bpy.ops.object.camera_add(location=(145,-230,100));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,13))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=42;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.filepath=str(edit/'GC-CBD-RESIDENCES-001.png')
bpy.ops.wm.save_as_mainfile(filepath=str(edit/'GC-CBD-RESIDENCES-001.blend'),compress=True)
bpy.ops.render.render(write_still=True)
print('Five sculpted residences exported',flush=True)
