"""Architectural detail layer: solid joinery, window reveals, rugs and lighting.
No new floating colliders across the customer aisle; store envelope stays fixed.
"""
# Store-specific ceiling field, framing and warm perimeter lighting.
box('Acoustic ceiling field','Warm porcelain',x,y+4.91,z,w-.35,.12,d-.35,False,.04)
for xx in [x-w/2+.22,x+w/2-.22]:
    box('Stone wall base','Walnut',xx,y+.16,z,.16,.32,d-.6)
    box('Upper cove reveal','Bronze',xx,y+4.64,z,.18,.16,d-.6)
for xx in [x-2.14,x+2.14]:
    box('Entry portal bronze reveal','Bronze',xx,y+1.94,door,.20,3.88,.34)
    box('Entry portal luminous inset','Warm light',xx,y+1.95,door+front*.19,.035,3.55,.035)
for xx in [x-w*.3,x+w*.3]:
    for zz in [z-d*.29,z,z+d*.29]:
        box('Suspended lighting track','Ink',xx,y+4.64,zz,4,.10,.10)
        for dx in [-1.4,0,1.4]:
            cylinder('Recessed spotlight housing','Ink',xx+dx,y+4.51,zz,.115,.20)
            cylinder('Spotlight diffuser','Warm light',xx+dx,y+4.40,zz,.085,.025)
for xx in [x-w*.42,x+w*.42]:
    cylinder('Entry planter pot','Travertine',xx,y+.36,door-front*2,.43,.72)
    plant(xx,y+.73,door-front*2,1.45)
if s['theme'] in ['fashion','tailoring','bags','shoes']:
    for xx in [x-w*.30,x+w*.30]:
        box('Inset textile rug','Sage upholstery',xx,y+.037,z, min(7,w*.35),.035,9)
        bench(xx,y,z+6,min(3.6,w*.2))
        # Upholstered window presentation plinth: a real layered volume.
        box('Window display base','Walnut',xx,y+.16,door-front*4,min(4,w*.23),.32,2.4,True,.12)
        box('Window display stone cap','Cream marble',xx,y+.34,door-front*4,min(4,w*.23)-.1,.05,2.3,False,.05)
