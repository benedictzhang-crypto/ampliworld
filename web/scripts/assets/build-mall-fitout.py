"""Original mall retail fit-out built from shared metric Blender primitives."""
import runpy
from pathlib import Path
globals().update(runpy.run_path(str(Path(__file__).with_name('mall-blender-primitives.py'))))

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
    'scope':'Nineteen businesses across twenty fitted rooms, including seven restaurants and a gym; original concepts, not official stores or live purchases',
    'boutiques':BRAND_ROOMS,
    'restrooms':restroom_result['RESTROOMS'],
    'colliders':colliders,'meshes':len(bpy.context.scene.objects),
    'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')}
(OUT/'fitout-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
editable=ROOT/'asset-library/blender/mall';editable.mkdir(parents=True,exist_ok=True)
# Cached source meshes are useful during batching, not in the final editable asset.
for mesh in list(bpy.data.meshes):
    mesh.use_fake_user=False
    if mesh.users==0:bpy.data.meshes.remove(mesh)
bpy.ops.wm.save_as_mainfile(filepath=str(editable/'GC-MALL-FITOUT-001.blend'),compress=True)
print('MALL FITOUT READY',len(colliders),'colliders',manifest['meshes'],'material batches',flush=True)
