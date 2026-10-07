"""Nine original, metric, walk-in concept shops. Uses shared Blender primitives.
No imported storefront photographs; no affiliation, live sales or staff AI implied.
Keep the 3.4 m front door and centre aisle empty in every room.
"""
FLOORS={f['id']:f['y'] for f in SPATIAL['floors']}
finish('Toy yellow',(.95,.64,.025),.34)
finish('Toy blue',(.025,.21,.64),.35)
INVENTORY={}
RESTAURANTS={'hotpot','grill','sushi','noodles','steak','cantonese','seafood'}

def chair(x,y,z,mat='Walnut'):
    box('Upholstered chair seat',mat,x,y+.48,z,.58,.12,.59,True,.075)
    box('Chair back',mat,x,y+.87,z+.26,.58,.71,.10,True,.055)
    for dx in [-.23,.23]:
        for dz in [-.23,.23]:box('Chair leg','Walnut',x+dx,y+.22,z+dz,.055,.44,.055)

def table(x,y,z,w=2.0,d=1.8):
    box('Dining tabletop','Walnut',x,y+.79,z,w,.10,d,True,.075)
    box('Dining table pedestal','Ink',x,y+.38,z,.38,.76,.38,True)

def crockery(x,y,z,noodle=False):
    cylinder('Ceramic bowl','Warm porcelain',x,y+.05,z,.18,.10)
    rim=loop('Bowl rim','Warm porcelain',x,y+.11,z,.17,.015)
    rim.rotation_euler=(0,0,0)
    # Food is geometry, not a photographed texture or an empty coloured label.
    cylinder('Broth','Bronze',x,y+.105,z,.14,.006)
    for j in range(3):
        if noodle:
            curve_tube('Noodle strands','Warm porcelain',[(x-.09+k*.018,y+.114,z-.06+j*.05+.014*math.sin(k)) for k in range(11)],.006)
        else:box('Sushi rice','Warm porcelain',x-.10+j*.10,y+.11,z,.08,.055,.13,False,.025)
    for dx in [.23,.26]:box('Chopsticks','Walnut',x+dx,y+.018,z,.009,.009,.29,False,0)

def clover(x,y,z):
    for dx,dy in [(-.027,0),(.027,0),(0,-.027),(0,.027)]:
        orb('Clover gold border','Bronze',x+dx,y+dy,z,.030,.030,.012)
        orb('Mother of pearl petal','Warm porcelain',x+dx,y+dy,z-.009,.024,.024,.008)

def apparel(x,y,z,active=False,mat='Puffer black'):
    # Torso and sloping sleeves have a clear garment silhouette at human scale.
    box('Jersey torso' if active else 'Tailored coat',mat,x,y+.5,z,.43,.72 if active else .96,.15,False,.07)
    for side in [-1,1]:
        link('Garment sleeve',mat,(x+side*.20,y+.80,z),(x+side*.40,y+.31,z),.068)
        box('Jacket lapel','Chrome' if not active else mat,x+side*.095,y+.76,z-.082,.052,.22,.02,False,.012)
    curve_tube('Clothes hanger','Chrome',[(x-.24,y+.98,z),(x,y+1.10,z),(x+.24,y+.98,z)],.008)
    loop('Hanger hook','Chrome',x,y+1.14,z,.042,.007)
    if active:
        for side in [-1,1]:box('Leggings',mat,x+side*.085,y-.18,z,.14,.65,.12,False,.045)

def brick(x,y,z,w=2,d=2,mat='Toy yellow',scale=.13):
    box('Toy brick',mat,x,y+scale*.35,z,w*scale,.7*scale,d*scale,False,.012)
    for i in range(w):
        for j in range(d):cylinder('Brick stud',mat,x+(i-(w-1)/2)*scale,y+scale*.77,z+(j-(d-1)/2)*scale,scale*.28,scale*.18)

def shell(shop,y):
    x=shop['centerX'];kind=shop['id'];h=next(f['clearHeight'] for f in SPATIAL['floors'] if f['y']==y)
    accent={'vancleef':'Sage upholstery','givenchy':'Black marble','lululemon':'Burgundy','lego':'Toy yellow','gym':'Ink','hotpot':'Cartier lacquer','grill':'Walnut','sushi':'Walnut','noodles':'Warm porcelain','lukfook':'Bronze','chowtaifook':'Cartier lacquer','steak':'Walnut','cantonese':'Sage upholstery','seafood':'Toy blue'}[kind]
    wall='White marble' if kind=='givenchy' else 'Ivory plaster'
    for dx in [-7.85,7.85]:box(kind+' wall',wall,x+dx,y+h/2,62.5,.30,h,23,True)
    if kind in RESTAURANTS:
        box(kind+' rear wall left',accent,x-7.05,y+h/2,73.86,1.3,h,.25,True)
        box(kind+' rear wall right',accent,x+1.95,y+h/2,73.86,11.5,h,.25,True)
        box(kind+' staff door lintel',accent,x-5.1,y+(h+2.8)/2,73.86,2.6,h-2.8,.25,True)
        label('STAFF / SERVICE CORRIDOR',x-5.1,y+2.95,73.66,.17,'Bronze')
    else:box(kind+' back wall',accent,x,y+h/2,73.86,15.4,h,.25,True)
    box(kind+' floor','Black marble' if kind in ['givenchy','gym'] else 'Travertine',x,y+.009,62.5,15.4,.018,22.7)
    box(kind+' ceiling',wall,x,y+h,62.5,15.4,.12,22.7,True)
    for dx in [-7.65,-1.85,1.85,7.65]:box(kind+' front pier',accent,x+dx,y+h/2,51,.28,h,.45,True)
    for dx in [-4.75,4.75]:
        box(kind+' window','Display crystal',x+dx,y+(h-1.2)/2,51,5.5,h-1.2,.018,True,0)
        box(kind+' display plinth',accent,x+dx,y+.20,52,5.4,.4,1.15,True,.06)
    box(kind+' sign band',accent,x,y+h-.65,50.91,15.5,.72,.38,True)
    label(shop['label'],x,y+h-.84,50.66,min(.52,10/max(1,len(shop['label']))),'Warm porcelain' if kind!='lego' else 'Ink',kind=='vancleef')
    for zz in [56,62,68]:
        box('Ceiling acoustic raft',accent,x,y+h-.16,zz,11,.16,3.4)
        for dx in [-4.5,0,4.5]:cylinder('Recessed ceiling lamp','White light' if kind in ['gym','givenchy','lego'] else 'Warm light',x+dx,y+h-.26,zz,.17,.04)
    # True reception countertop beside, not across, the door.
    box('Reception counter',accent,x+5.5,y+.5,55,2.7,1,1.15,True,.06)
    box('Counter stone top','White marble',x+5.5,y+1.035,55,2.8,.07,1.22)
    box('Payment terminal','Ink',x+5.8,y+1.20,55,.25,.26,.16)
    return accent

def jewelry_salon(shop,y):
    x=shop['centerX']
    for dx in [-3.5,3.5]:
        display_case(x+dx,y,59,'Sage upholstery')
        clover(x+dx,y+1.16,58.85)
        curve_tube('Clover necklace chain','Bronze',[(x+dx-.10,y+1.34,58.85),(x+dx,y+1.16,58.85),(x+dx+.10,y+1.34,58.85)],.004)
        for zz in [65,69]:
            table(x+dx,y,zz,1.6,1.2)
            for side in [-1,1]:chair(x+dx+side*1.25,y,zz,'Sage upholstery')
    for dx in [-6.4,6.4]:
        for zz in [57,62,68]:
            box('Green recessed jewelry niche','Sage upholstery',x+dx,y+1.7,zz,.6,2.5,2.2,True)
            box('Niche floating shelf','Bronze',x+dx-.4,y+1.4,zz,1.2,.06,1.9)
            clover(x+dx-.4,y+1.62,zz)
    INVENTORY[shop['id']]=['clover pendants','rings','jewelry consultation tables']

def fashion(shop,y,active=False):
    x=shop['centerX']
    for dx in [-5.6,5.6]:
        for zz in [59,64,68]:
            for edge in [-1.4,1.4]:box('Rack support','Chrome',x+dx+edge,y+1.3,zz,.05,2.6,.05,True)
            link('Apparel rail','Chrome',(x+dx-1.4,y+2.58,zz),(x+dx+1.4,y+2.58,zz),.025)
            for n,mat in enumerate(['Puffer black','Puffer grey','Puffer white'] if not active else ['Puffer green','Burgundy','Puffer black']):apparel(x+dx+(n-1)*.82,y+1.39,zz,active,mat)
        box('Fitting room side','Ivory plaster',x+dx,y+1.5,71.7,2.9,3,.10,True)
        box('Fitting mirror','Chrome',x+dx,y+1.5,71.62,1.6,2.4,.035)
        if active:
            for n in range(4):cylinder('Rolled yoga mat','Sage upholstery',x+dx+(n-1.5)*.4,y+.5,69.8,.14,.85)
        else:bag(x+dx,y+.41,52,'Puffer black')
    for dx in [-3.5,3.5]:
        box('Folded apparel table','Walnut',x+dx,y+.75,61,2.3,.14,1.8,True)
        for n in [-.65,0,.65]:
            for k in range(3):box('Folded clothing','Puffer grey' if active else 'Puffer black',x+dx+n,y+.87+k*.08,61,.50,.07,.6,False,.04)
    INVENTORY[shop['id']]=['activewear','leggings','yoga mats','fitting mirrors'] if active else ['tailored coats','leather bags','folded garments','fitting mirrors']

def toy_shop(shop,y):
    x=shop['centerX'];colors=['Toy yellow','Toy blue','Puffer red','Puffer green']
    for dx in [-6.3,6.3]:
        for zz in [58,63,68]:
            box('Toy shelf back','Warm porcelain',x+dx,y+1.7,zz,.16,3,3.5,True)
            for yy in [.5,1.35,2.2]:
                box('Toy shelf','Toy yellow',x+dx,y+yy,zz,1.5,.09,3.5)
                for n in range(4):
                    box('Boxed construction set',colors[n],x+dx,y+yy+.33,zz-1.2+n*.8,.62,.56,.60,False,.02)
                    brick(x+dx-.34,y+yy+.20,zz-1.2+n*.8,2,2,colors[(n+1)%4],.10)
    for dx in [-3.6,3.6]:
        table(x+dx,y,61,2.8,2.5)
        box('Build table baseplate','Toy blue',x+dx,y+.86,61,2.4,.035,2.1)
        for k in range(8):brick(x+dx+(k%3-1)*.5,y+.90+(k//3)*.11,61+(k%2-.5)*.5,3,2,colors[k%4])
        for dz in [-1.8,1.8]:chair(x+dx,y,61+dz,'Toy yellow')
    # Oversized original brick city is display sculpture, not a branded set replica.
    for side in [-1,1]:
        for n in range(3):
            for k in range(2+n):brick(x+side*4.75+(n-1)*1.1,y+.40+k*.21,52,3,3,colors[n%4],.25)
    label('BUILD  /  EXPLORE  /  CREATE',x,y+2.7,73.64,.38,'Toy yellow')
    INVENTORY[shop['id']]=['boxed construction sets','studded bricks','two build tables','brick skyline display']

def restaurant(shop,y):
    x=shop['centerX'];kind=shop['id']
    # Human-scale wall joinery, display niches and planted corners reduce the
    # empty-room appearance without filling the central circulation route.
    for side in [-1,1]:
        box('Dining timber dado','Walnut',x+side*7.62,y+.60,62.5,.12,1.2,22)
        box('Dado brass cap','Bronze',x+side*7.53,y+1.23,62.5,.08,.04,22)
        for zz in [57,62,67]:
            box('Dining wall framed panel','Walnut',x+side*7.53,y+2.30,zz,.13,1.6,2.2)
            box('Dining textured panel','Sage upholstery' if kind=='sushi' else 'Burgundy' if kind=='hotpot' else 'Warm porcelain',x+side*7.43,y+2.3,zz,.08,1.42,2.02)
            for k in range(5):box('Decorative timber slat','Walnut',x+side*7.35,y+2.3,zz-.8+k*.4,.08,1.3,.045)
    for zz in [54.5]:
        cylinder('Dining planter','Travertine',x-6.6,y+.4,zz,.42,.8)
        box('Planter solid','Travertine',x-6.6,y+.4,zz,.64,.8,.64,True)
        plant(x-6.6,y+.8,zz,.65)
    for dx in [-4,4]:
        for zz in [57.5,61,64.5]:
            table(x+dx,y,zz)
            for s in [-1,1]:chair(x+dx+s*1.4,y,zz,'Burgundy' if kind=='hotpot' else 'Walnut')
            if kind=='hotpot':
                cylinder('Induction hob','Ink',x+dx,y+.855,zz,.46,.035)
                cylinder('Stainless hot pot','Chrome',x+dx,y+.98,zz,.38,.22)
                cylinder('Hot pot broth','Cartier lacquer',x+dx,y+1.10,zz,.34,.012)
                box('Divided broth pot','Chrome',x+dx,y+1.11,zz,.035,.08,.69)
                for s in [-1,1]:loop('Hot pot handle','Chrome',x+dx+s*.43,y+1.0,zz,.085,.017)
            elif kind=='grill':
                box('Table grill','Ink',x+dx,y+.86,zz,.8,.06,.8)
                for n in range(11):box('Grill bars','Chrome',x+dx-.34+n*.068,y+.903,zz,.018,.015,.7)
                cylinder('Table extraction hood','Chrome',x+dx,y+2.4,zz,.32,.28)
                ceiling=next(f['clearHeight'] for f in SPATIAL['floors'] if f['y']==y)
                cylinder('Extraction duct','Chrome',x+dx,y+(ceiling+2.54)/2,zz,.13,ceiling-2.54)
                for n in [-.2,.1]:box('Grilled meat','Burgundy',x+dx+n,y+.928,zz,.18,.03,.30,False,.04)
            elif kind=='steak':
                cylinder('Steak dinner plate','Warm porcelain',x+dx,y+.86,zz,.38,.04)
                orb('Grilled steak','Walnut',x+dx,y+.92,zz,.27,.05,.17)
                for k in range(5):box('Steak grill mark','Ink',x+dx-.18+k*.09,y+.975,zz,.018,.01,.27,False,0)
                for side in [-.72,.72]:
                    cylinder('Wineglass stem','Chrome',x+dx+side,y+1.0,zz,.012,.26)
                    orb('Wineglass bowl','Display crystal',x+dx+side,y+1.19,zz,.09,.13,.09)
            elif kind=='cantonese':
                for offset in [-.48,0,.48]:
                    cylinder('Bamboo dim sum basket','Walnut',x+dx+offset,y+.94,zz,.20,.16)
                    for k in [-.07,.07]:orb('Dim sum dumpling','Warm porcelain',x+dx+offset+k,y+1.04,zz,.065,.07,.065)
                orb('Porcelain teapot','Warm porcelain',x+dx,y+1.0,zz+.5,.13,.12,.13)
            elif kind=='seafood':
                cylinder('Seafood platter','Warm porcelain',x+dx,y+.86,zz,.40,.05)
                for k in range(4):orb('Shellfish','Bronze',x+dx-.22+k*.15,y+.92,zz,.07,.045,.11)
            else:crockery(x+dx,y+.86,zz,kind=='noodles')
            for s in [-1,1]:
                cylinder('Side dish','Warm porcelain',x+dx+s*.65,y+.86,zz+.45,.16,.035)
                for k in range(3):orb('Vegetables','Foliage',x+dx+s*.65+(k-1)*.045,y+.9,zz+.45,.04,.04,.07)
    # Open kitchen with a staff access gap at the left; central customer aisle ends here.
    box('Kitchen partition','Ivory plaster',x+2,y+1.4,69.5,10.5,2.8,.18,True)
    box('Service counter','Walnut',x+2,y+.50,68.8,10,1,1.05,True)
    box('Counter top','White marble',x+2,y+1.05,68.8,10.2,.10,1.15)
    for dx in [-1.2,2.2,5.5]:
        box('Kitchen steel cabinet','Chrome',x+dx,y+.45,72.8,2.8,.9,1.4,True)
        cylinder('Kitchen burner','Ink',x+dx,y+.93,72.8,.32,.035)
    box('Extraction canopy','Chrome',x+2,y+2.95,72.6,10,.45,1.7)
    box('Walk-in chiller','Chrome',x-7.05,y+1.05,72,.75,2.1,1.3,True)
    box('Kitchen wash basin','Ink',x+5.5,y+.92,72.8,1.15,.04,.85)
    curve_tube('Kitchen tap','Chrome',[(x+5.7,y+.93,73),(x+5.7,y+1.35,73),(x+5.4,y+1.35,72.8)],.025)
    for dx in [-2,0,2]:
        box('Storage shelf','Chrome',x+dx,y+2.0,73.4,1.8,.065,.55)
        box('Ingredient crate','Walnut',x+dx,y+2.20,73.4,.70,.35,.42)
    if kind=='seafood':
        box('Aquarium base','Ink',x+6.3,y+.5,66.6,1.8,1,2.6,True)
        box('Aquarium tank','Display crystal',x+6.3,y+1.6,66.6,1.8,1.2,2.6,True)
        for k in range(6):orb('Aquarium fish','Bronze',x+6.3+(k%2-.5)*.6,y+1.5+(k%3)*.15,65.7+k*.35,.17,.07,.06)
    if kind=='sushi':
        box('Sushi glass display','Display crystal',x+2,y+1.3,68.7,8,.4,.65)
        for n in range(7):
            crockery(x-1+n,y+1.11,68.7)
            if n!=1:chair(x-1+n*1.1,y,67.5)
        for dx in [-6.8,6.8]:
            for zz in [56,61,66]:
                cylinder('Paper lantern','Warm porcelain',x+dx,y+2.9,zz,.25,.6)
                cylinder('Lantern glow','Warm light',x+dx,y+2.6,zz,.20,.02)
    if kind=='noodles':
        label('NOODLE BOWLS  $8  /  DUMPLINGS  $5',x,y+2.7,69.35,.27,'Ink')
        label('ILLUSTRATIVE MENU',x,y+2.35,69.35,.16,'Ink')
        for n in range(5):crockery(x+n-1,y+1.1,68.7,True)
    INVENTORY[kind]={'hotpot':['divided hot pots','induction hobs','vegetable dishes','walk-in kitchen'],'grill':['table grills','extraction hoods','meat plates','walk-in kitchen'],'sushi':['sushi counter','display case','paper lanterns','walk-in kitchen'],'noodles':['noodle bowls','menu board','affordable seating','walk-in kitchen'],'steak':['steak plates','wineglasses','timber dining','walk-in kitchen'],'cantonese':['dim sum baskets','teapots','jade-toned dining','walk-in kitchen'],'seafood':['aquarium','seafood platters','walk-in kitchen']}[kind]

def gym(shop,y):
    x=shop['centerX']
    for zz in [58,62,66]:
        tx=x-4.3
        box('Treadmill base','Ink',tx,y+.22,zz,1.3,.24,2.4,True,.09)
        box('Treadmill belt','Puffer black',tx,y+.355,zz,1,.035,2.1)
        for dx in [-.55,.55]:link('Treadmill riser','Chrome',(tx+dx,y+.3,zz-.9),(tx+dx,y+1.35,zz-.8),.04)
        box('Treadmill console','Ink',tx,y+1.35,zz-.8,1.05,.42,.12)
        box('Treadmill screen','Toy blue',tx,y+1.38,zz-.72,.65,.22,.01)
    for zz in [59,64]:
        tx=x+4.4
        for dx in [-1,1]:box('Weight rack column','Chrome',tx+dx,y+1.3,zz,.12,2.6,.12,True)
        link('Olympic bar','Chrome',(tx-1.4,y+1.4,zz),(tx+1.4,y+1.4,zz),.025)
        for dx in [-1.15,1.15]:orb('Weight plates','Ink',tx+dx,y+1.4,zz,.10,.30,.30)
        box('Workout bench','Ink',tx,y+.5,zz+1, .60,.24,1.7,True,.09)
    for dx in [-4,4]:
        box('Stretch mat','Sage upholstery',x+dx,y+.035,70,1.7,.04,2.3)
        cylinder('Water bottle','Display crystal',x+dx+.65,y+.15,70.8,.07,.28)
    box('Gym wall mirror','Chrome',x+7.66,y+1.7,63,.018,2.6,14)
    label('STRENGTH  /  CARDIO  /  RECOVER',x,y+2.8,73.65,.3,'Warm porcelain')
    INVENTORY[shop['id']]=['three treadmills','two weight racks','two benches','stretch mats','mirror wall']

for shop in PLAN['shops']:
    if shop.get('fitout')!='retail-expansion':continue
    for level in shop['levels']:
        y=FLOORS[level];shell(shop,y);kind=shop['id']
        if kind in ['vancleef','lukfook','chowtaifook']:
            jewelry_salon(shop,y)
            if kind!='vancleef':
                for dx in [-3.5,3.5]:
                    for k in range(5):loop('Gold bangle','Bronze',shop['centerX']+dx+(k-2)*.16,y+1.17,59,.065,.012)
                    jewelry(shop['centerX']+dx,y+1.05,59.4)
                INVENTORY[kind]=['gold bangles','necklaces','bridal jewelry cases','consultation tables']
        elif kind in ['givenchy','lululemon']:fashion(shop,y,kind=='lululemon')
        elif kind=='lego':toy_shop(shop,y)
        elif kind=='gym':gym(shop,y)
        else:restaurant(shop,y)
        BRAND_ROOMS.append({'id':kind,'label':shop['label'],'centerX':shop['centerX'],'doorZ':51,'floorY':y,'level':level,'theme':shop['theme'],'clearDoorMeters':3.4,'light':shop['light'],'inventory':INVENTORY[kind]})
        compact_scene()
