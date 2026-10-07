"""Category-specific service rooms. Executed inside the tenant builder context.
Original concept designs: no downloaded brand imagery, no operational claims.
"""
theme=s['theme']
def mirror(xx,zz,width=2):
    box('Mirror bronze frame','Bronze',xx,y+1.55,zz,width+.15,2.5,.12)
    box('Mirror face','Tenant glass',xx,y+1.55,zz+.08,width,2.35,.02)
def garment(xx,zz):
    box('Garment rail foot','Bronze',xx,y+.04,zz,2.7,.08,.65,True)
    for dx in [-1.2,1.2]:link('Garment rail upright','Bronze',(xx+dx,y,zz),(xx+dx,y+1.95,zz),.035)
    link('Garment rail','Bronze',(xx-1.2,y+1.95,zz),(xx+1.2,y+1.95,zz),.035)
    for i in range(5):
        cx=xx-1+i*.5
        box('Hanging coat','Rose cloth' if i%2 else 'Ink',cx,y+1.30,zz,.40,.85,.20,False,.08)
        for dx in [-.24,.24]:box('Coat sleeve','Walnut',cx+dx,y+1.37,zz,.14,.6,.16,False,.04)
def consultation(xx,zz):
    table(xx,y,zz);plant(xx+2,y,zz,1.4)
def shoes(xx,zz):
    box('Shoe display cabinet','Walnut',xx,y+.18,zz,5,.36,1.3,True,.08)
    for h in [.6,1.25,1.9]:
        box('Shoe shelf','Cream marble',xx,y+h,zz,5,.08,1.1)
        for k in range(5):
            cx=xx-1.9+k*.95
            box('Shoe leather upper','Walnut' if k%2 else 'Burgundy',cx,y+h+.17,zz,.30,.22,.58,False,.1)
            box('Shoe sole','Ink',cx,y+h+.055,zz,.32,.04,.62,False,.05)
            box('Shoe heel','Bronze',cx,y+h+.13,zz-.20,.2,.20,.15,False,.04)
if theme=='auto-showroom':
    for name,col in [('Pearl coachwork',(.65,.69,.70)),('Graphite coachwork',(.06,.09,.13)),('Copper coachwork',(.42,.15,.07))]:
        if name not in materials:newmat(name,col,.22,.65)
    def car(cx,cz,paint,high=False):
        # Lofted longitudinal cross-sections create a sculpted body, not a box decal.
        sections=[(-2.45,.64,.55),(-2.15,.99,.84),(-1.3,1.03,.93),(.35,1.03,.91),(1.65,.96,.83),(2.38,.66,.60)]
        verts=[]
        for zz,hw,top in sections:
            for xx,hh in [(-hw*.86,.32),(-hw,.52),(-hw*.89,top),(hw*.89,top),(hw,.52),(hw*.86,.32)]:verts.append((cx+xx,-(cz+zz),y+hh+.06))
        faces=[tuple(reversed(range(6))),tuple(range(30,36))]
        for j in range(5):
            for k in range(6):faces.append((j*6+k,j*6+(k+1)%6,(j+1)*6+(k+1)%6,(j+1)*6+k))
        mesh=bpy.data.meshes.new('Sculpted coachwork');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('Original concept vehicle',mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(materials[paint])
        for p in mesh.polygons:p.use_smooth=True
        roof=1.68 if high else 1.40
        # Glazed trapezoid greenhouse, roof and four alloy wheels.
        vs=[(cx+a,-(cz+b),y+h) for a,b,h in [(-.86,-.92,.92),(.86,-.92,.92),(-.66,-.52,roof),(.66,-.52,roof),(-.84,1.05,.92),(.84,1.05,.92),(-.64,.55,roof),(.64,.55,roof)]]
        gm=bpy.data.meshes.new('Car glazing');gm.from_pydata(vs,[],[(0,1,3,2),(4,6,7,5),(0,2,6,4),(1,5,7,3),(2,3,7,6)]);gm.update()
        go=bpy.data.objects.new('Dark automotive greenhouse',gm);bpy.context.collection.objects.link(go);gm.materials.append(materials['Ink'])
        box('Floating roof',paint,cx,y+roof+.02,cz+.02,1.29,.07,1.02,False,.07)
        for dx in [-1.0,1.0]:
            for dz in [-1.50,1.48]:
                for material,r,depth in [('Ink',.40,.25),('Bronze',.28,.265),('Ink',.08,.28)]:
                    wheel=cylinder('Alloy wheel',material,cx+dx,y+.45,cz+dz,r,depth);wheel.rotation_euler.y=math.pi/2
                for dz2 in [-.2,.28]:box('Door handle','Bronze',cx+dx*.96,y+.91,cz+dz2,.04,.055,.24,False,.02)
        for dx in [-.60,.60]:
            box('LED headlamp','Warm light',cx+dx,y+.68,cz-2.26,.50,.08,.12,False,.035)
            box('Rear lamp','Burgundy',cx+dx,y+.65,cz+2.23,.48,.07,.12,False,.02)
        colliders.append({'id':'Display vehicle','min':[cx-1.15,y,cz-2.50],'max':[cx+1.15,y+roof+.12,cz+2.50]})
    for i,(dx,dz) in enumerate([(-17,-11),(17,-11),(-17,10),(17,10)]):
        cx,cz=x+dx,z+dz
        box('Flush vehicle exhibit pad','Ink',cx,y+.025,cz,8,.05,9)
        car(cx,cz,['Pearl coachwork','Graphite coachwork','Copper coachwork'][i%3],i==3)
        box('Vehicle configuration kiosk','Bronze',cx+3,y+.65,cz,1,1.3,.5,True,.08)
        box('Configuration screen','Ink',cx+3,y+1.4,cz,1,.65,.08)
    for xx in [x-20,x+20]:
        consultation(xx,back+front*9)
        for k in range(6):box('Paint and trim sample',['Walnut','Bronze','Ink'][k%3],xx-2.5+k,y+2.2,back+front*.15,.6,.6,.10,False,.04)
    text('SALES / CONFIGURATION / SERVICE BOOKING',x,y+3.2,back+front*.2,.35,front<0)
    text('FULL WORKSHOP AT AUREA MOTOR CAMPUS',x,y+2.65,back+front*.2,.3,front<0)
elif theme=='shoes':
    for xx in [x-20,x+20]:
        for zz in [z-15,z,z+15]:shoes(xx,zz)
        for zz in [z-8,z+8]:bench(xx,y,zz,4)
        mirror(xx,back+front*.3,4)
elif theme in ['alterations','styling']:
    for xx in [x-w*.3,x+w*.3]:
        garment(xx,z-4);garment(xx,z+4)
        mirror(xx,back+front*.3)
    bx=x-w*.25;bz=back+front*6
    box('Tailor cutting table','Walnut',bx,y+.88,bz,4,.15,2,True,.1)
    box('Sewing machine base','Warm porcelain',bx,y+1.04,bz,.7,.13,.40)
    box('Sewing machine arm','Warm porcelain',bx+.16,y+1.28,bz,.20,.48,.26)
    box('Sewing machine bridge','Warm porcelain',bx-.05,y+1.52,bz,.60,.13,.25)
    for k in range(4):cylinder('Thread spool','Rose cloth',bx-.7+k*.2,y+1.09,bz+.5,.06,.21)
    # A screened consultation/fitting alcove, door opening left on its front.
    box('Fitting alcove side','Walnut',x+w*.32,y+1.3,z+8,.1,2.6,4,True)
    box('Fitting curtain','Rose cloth',x+w*.22,y+1.2,z+10,2,2.4,.06,True)
    consultation(x-w*.25,z+9)
elif theme=='watch-repair':
    for xx in [x-5,x+5]:
        box('Watchmaker bench','Walnut',xx,y+.93,z,3.4,.15,1.8,True,.08)
        box('Antistatic work mat','Sage upholstery',xx,y+1.02,z,2.3,.02,1.1)
        for k in range(6):
            product('watches',xx-.95+k*.37,y+1.05,z,k)
            cylinder('Watch tool','Bronze',xx-.9+k*.35,y+1.15,z+.5,.018,.25)
        link('Task lamp arm','Bronze',(xx+1.3,y+1,z),(xx+.8,y+1.9,z),.035)
        cylinder('Magnifier rim','Bronze',xx+.65,y+1.85,z,.19,.04)
        chair(xx,y,z+1.3)
    box('Secure parts cabinet','Ink',x-5,y+1.2,back+front*2,3,2.4,1.1,True,.07)
    for h in [.5,1,1.5,2]:box('Parts drawer','Bronze',x-5,y+h,back+front*2.6,2.7,.04,.03)
elif theme in ['members','concierge']:
    for xx in [x-w*.26,x+w*.26]:
        bench(xx,y,z,4);consultation(xx,z+7)
    box('Concierge service counter','Travertine',x,y+.57,back+front*8,w*.5,1.14,2,True,.16)
    text('MEMBERS / APPOINTMENTS' if theme=='members' else 'INFORMATION / GIFT WRAP',x,y+2.2,back+front*.2,.3,front<0)
    for k in range(5):box('Gift wrapping parcel','Rose cloth',x-3+k,y+1.25,back+front*8,.6,.2,.45,False,.025)
elif theme=='spa':
    for xx in [x-19,x+19]:
        for zz in [z-12,z+12]:
            box('Treatment privacy divider','Walnut',xx+4,y+1.7,zz,.15,3.4,11,True)
            box('Treatment couch','Warm porcelain',xx,y+.75,zz,1.3,.35,2.6,True,.20)
            box('Treatment pillow','Sage upholstery',xx,y+.98,zz-.9,1,.2,.5,False,.10)
            box('Treatment storage','Walnut',xx-2,y+.6,zz,1,1.2,1,True,.06)
            for k in range(4):product('beauty',xx-2,y+1.22,zz-.3+k*.2,k)
            plant(xx-3,y,zz-3,1.5)
    for xx in [x-8,x+8]:mirror(xx,back+front*.3,3);chair(xx,y,back+front*2)
elif theme=='art-gallery':
    for xx in [x-20,x+20]:
        for zz in [z-14,z+14]:
            box('Gallery display wall','Warm porcelain',xx,y+1.8,zz,10,3.6,.22,True)
            box('Artwork frame','Bronze',xx,y+2,zz+.15,3,2,.12)
            box('Abstract canvas','Ink',xx,y+2,zz+.23,2.8,1.8,.05)
            for k in range(5):box('Original geometric artwork','Rose cloth' if k%2 else 'Sage upholstery',xx-.9+k*.45,y+1.6+k*.2,zz+.27,.4,.6,.04)
    for xx in [x-12,x+12]:bench(xx,y,z,5)
