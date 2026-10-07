"""Six floor-aligned washroom suites, each replacing one north-gallery room.
Private single-user cubicles include one larger accessible-layout cubicle.
Modeled layout only: no claim of building-code certification or plumbing logic.
"""
RESTROOMS=[]
for floor in SPATIAL['floors']:
    before=set(bpy.context.scene.objects);start=len(colliders)
    x=SPATIAL['restrooms']['centerX'];y=floor['y'];h=floor['clearHeight']
    for dx in [-7.85,7.85]:box('Restroom enclosing wall','Travertine',x+dx,y+h/2,62.5,.3,h,23,True)
    box('Restroom back wall','Travertine',x,y+h/2,73.85,15.4,h,.25,True)
    box('Restroom stone floor','White marble',x,y+.01,62.5,15.4,.02,22.7)
    box('Restroom ceiling','Warm porcelain',x,y+3.65,62.5,15.4,.12,22.7,True)
    # Main opening remains 3.4m, with a high facade and lower service-room ceiling.
    for side in [-1,1]:box('Restroom front wall','Travertine',x+side*4.75,y+h/2,51,6.1,h,.25,True)
    box('Restroom door lintel','Travertine',x,y+(h+3.2)/2,51,3.4,h-3.2,.25,True)
    label('RESTROOMS  /  '+floor['id'],x,y+3.32,50.75,.36,'Bronze')
    label('PRIVATE CUBICLES  /  FAMILY & ACCESSIBLE',x,y+2.78,50.72,.15,'Bronze')
    for dx in [-4.6,4.6]:
        box('Stone wash counter','Travertine',x+dx,y+.76,60.3,2.2,.17,5.4,True,.08)
        for zz in [58.5,60.3,62.1]:
            # Recessed bowl effect: raised porcelain rim around a dark basin.
            cylinder('Washbasin bowl','Warm porcelain',x+dx,y+.88,zz,.38,.12)
            cylinder('Recessed basin','Ink',x+dx,y+.947,zz,.29,.008)
            curve_tube('Basin faucet','Chrome',[(x+dx+.32,y+.9,zz),(x+dx+.32,y+1.22,zz),(x+dx+.1,y+1.22,zz),(x+dx+.1,y+1.1,zz)],.021)
            cylinder('Soap dispenser','Bronze',x+dx-.40,y+.99,zz,.055,.23)
            box('Backlit mirror','Chrome',x+dx,y+1.78,zz+.48,1.25,1.35,.04)
            for side in [-.66,.66]:box('Mirror light','Warm light',x+dx+side,y+1.78,zz+.49,.025,1.3,.035)
        box('Waste bin','Ink',x+dx,y+.36,64.2,.65,.72,.55,True,.055)
    # Clear 2m-wide centre circulation reaches all four independently entered stalls.
    for index,(dx,w) in enumerate([(-5.5,3.4),(-2,2.7),(1.5,2.7),(5,3.2)]):
        tx=x+dx;front=68.7;back=73.3
        for side in [-1,1]:box('Cubicle partition','Walnut',tx+side*w/2,y+1.45,71,.10,2.9,4.6,True)
        opening=1.5 if index==0 else 1.2
        panel=(w-opening)/2
        for side in [-1,1]:box('Cubicle front jamb','Walnut',tx+side*(opening/2+panel/2),y+1.45,front,panel,2.9,.10,True)
        # Door shown swung inward, with a matching thin physical volume.
        box('Open cubicle door','Walnut',tx+opening/2,y+1.4,front+opening/2,.10,2.8,opening,True)
        label('ACCESSIBLE' if index==0 else 'PRIVATE',tx,y+2.95,front-.08,.16,'Bronze')
        box('WC cistern','Warm porcelain',tx,y+.78,72.7,.60,.74,.25,True,.08)
        orb('Porcelain WC bowl','Warm porcelain',tx,y+.42,72.25,.34,.24,.49)
        box('WC base collision','Warm porcelain',tx,y+.3,72.3,.58,.60,.8,True,.09)
        cylinder('Toilet seat','Warm porcelain',tx,y+.59,72.15,.31,.065)
        cylinder('Seat opening','Ink',tx,y+.626,72.15,.22,.005)
        box('Tissue holder','Chrome',tx+w/2-.12,y+.68,72,.16,.2,.21)
        if index==0:
            link('Accessible grab rail','Chrome',(tx-.6,y+.80,72.6),(tx-.6,y+.80,71.7),.03)
            link('Accessible rear rail','Chrome',(tx-.7,y+.92,72.9),(tx+.6,y+.92,72.9),.03)
    box('Baby changing counter','Warm porcelain',x+5.4,y+.88,55,2,.16,1.0,True,.09)
    box('Changing pad','Sage upholstery',x+5.4,y+1.02,55,1.5,.12,.75,False,.08)
    for zz in [55,61,66,71]:
        for dx in [-3.2,3.2]:box('Restroom ceiling light','Warm light',x+dx,y+3.52,zz,2.4,.055,.16)
    # Turn the complete suite to face the north gallery. Same transformation
    # applies to meshes AND AABBs, avoiding mirrored invisible walls.
    for o in set(bpy.context.scene.objects)-before:
        o.location.x=2*x-o.location.x;o.location.y=-o.location.y;o.rotation_euler.z+=math.pi
    for c in colliders[start:]:
        lo=c['min'][:];hi=c['max'][:]
        c['min']=[2*x-hi[0],lo[1],-hi[2]];c['max']=[2*x-lo[0],hi[1],-lo[2]]
    RESTROOMS.append({'id':'WC-'+floor['id'],'level':floor['id'],'floorY':y,'centerX':x,'doorZ':-51,'arrival':[x,y,-55],
      'privateCubicles':4,'largerCubicles':1,'washbasins':6,'changingTables':1,'clearDoorMeters':3.4})
