"""Compose 108 distinct SEED final/twin card illustrations from owned paintings.

The source paintings are already shipped with the game. This offline script
builds three WebP atlases; the browser never runs PIL or loads 108 textures.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Image.open(ROOT / 'public/assets/seed-solo-atlas-v3-ui.webp').convert('RGBA')
CURATED = Image.open(ROOT / 'public/assets/seed-forms-atlas-v4-ui.png').convert('RGBA')
FIRST = Image.open(ROOT / 'public/assets/seed-first-forms-atlas-v1-ui.webp').convert('RGBA')
ENTRIES = json.loads((ROOT / 'src/final-identity-manifest.json').read_text(encoding='utf-8'))['entries']
SIZE = 192
LAW_TILE = {'reflect': 0, 'split': 1, 'chain': 2, 'orbit': 3, 'pierce': 4,
            'burst': 5, 'recall': 6, 'gravity': 7, 'frost': 8}
LAW_COLOR = {'reflect': (126, 219, 252), 'split': (115, 229, 143),
             'chain': (254, 204, 89), 'orbit': (242, 216, 134),
             'pierce': (179, 221, 255), 'burst': (255, 134, 79),
             'recall': (120, 228, 147), 'gravity': (207, 130, 255),
             'frost': (159, 225, 255)}
CURATED_IDS = ['collapse', 'frostguard', 'returnblade', 'prism', 'thunderlance',
               'frostbloom', 'stormcrown', 'tidepull', 'seedstorm', 'mirrorguard']
FIRST_IDS = ['icicle', 'halobloom', 'frostnet', 'rewindbolt', 'refractlance',
             'thundermirror', 'sunmirror', 'pierceshower', 'ebbring', 'pullgarden',
             'spearring', 'accretiondisk', 'rimeback', 'coldwell', 'rimepetal', 'echolane']


def source_tile(law):
    i = LAW_TILE[law]
    return SOURCE.crop(((i % 4) * 256, (i // 4) * 256,
                        (i % 4 + 1) * 256, (i // 4 + 1) * 256)).resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def fusion_tile(fusion):
    if fusion in CURATED_IDS:
        i = CURATED_IDS.index(fusion)
        atlas = CURATED
    elif fusion in FIRST_IDS:
        i = FIRST_IDS.index(fusion)
        atlas = FIRST
    else:
        return None
    w, h = atlas.width // 4, atlas.height // (4 if atlas is FIRST else 3)
    return atlas.crop(((i % 4)*w, (i // 4)*h,
                       (i % 4 + 1)*w, (i // 4 + 1)*h)).resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def ellipse_mask(box, feather=12):
    mask = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse(box, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def lobe_mask(side, phase=0):
    mask = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(mask)
    if side == 0:
        d.polygon([(0, 0), (SIZE * .63, 0), (SIZE * (.46 + phase), SIZE), (0, SIZE)], fill=255)
    else:
        d.polygon([(SIZE * .57, 0), (SIZE, 0), (SIZE, SIZE), (SIZE * (.42 + phase), SIZE)], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(13))


def glow_layer(draw_commands, color, radius=6):
    layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    draw_commands(dr, (*color, 255))
    glow = layer.filter(ImageFilter.GaussianBlur(radius))
    glow.putalpha(glow.getchannel('A').point(lambda a: int(a * .63)))
    return glow, layer


def line(d, points, color, width=2):
    d.line(points, fill=color, width=width, joint='curve')


def motif(d, law, x, y, scale, color, angle=0):
    """Nine mechanical silhouettes, readable at 40px and reused as visual grammar."""
    s = scale
    if law == 'reflect':
        for a in (-1, 0, 1):
            xx=x+a*s*.42
            d.polygon([(xx, y-s*.77), (xx+s*.33, y-s*.12), (xx, y+s*.75),
                       (xx-s*.32, y+s*.1)], outline=color, width=3)
            line(d, [(xx-s*.22, y+s*.06), (xx+s*.22, y-s*.09)], color)
    elif law == 'split':
        for a in range(6):
            q=a*math.pi/3+angle
            px=x+math.cos(q)*s*.65; py=y+math.sin(q)*s*.65
            d.ellipse((px-s*.24,py-s*.12,px+s*.24,py+s*.12),outline=color,width=3)
            line(d,[(x,y),(px,py)],color)
    elif law == 'chain':
        for a in (-1,0,1):
            x0=x+a*s*.62; y0=y+(a%2)*s*.4
            line(d,[(x0-s*.15,y0-s*.63),(x0+s*.13,y0-s*.16),(x0-s*.1,y0+s*.08),
                    (x0+s*.18,y0+s*.58)],color,3)
        d.ellipse((x-s*.15,y-s*.15,x+s*.15,y+s*.15),outline=color,width=2)
    elif law == 'orbit':
        d.ellipse((x-s,y-s*.65,x+s,y+s*.65),outline=color,width=3)
        for q in (-.6, 1.4, 3.4):
            px=x+math.cos(q)*s; py=y+math.sin(q)*s*.65
            d.polygon([(px,py-s*.19),(px+s*.17,py),(px,py+s*.19),(px-s*.17,py)],fill=color)
    elif law == 'pierce':
        d.polygon([(x,y-s),(x+s*.19,y-s*.15),(x+s*.17,y+s*.82),
                   (x,y+s*.59),(x-s*.17,y+s*.82),(x-s*.19,y-s*.15)],outline=color,width=3)
        line(d,[(x,y-s*.62),(x,y+s*.52)],color,2)
        line(d,[(x-s*.32,y+s*.11),(x+s*.32,y+s*.11)],color,2)
    elif law == 'burst':
        d.ellipse((x-s*.29,y-s*.29,x+s*.29,y+s*.29),outline=color,width=3)
        for a in range(8):
            q=a*math.pi/4+angle
            line(d,[(x+math.cos(q)*s*.45,y+math.sin(q)*s*.45),
                    (x+math.cos(q)*s*.88,y+math.sin(q)*s*.88)],color,3)
    elif law == 'recall':
        d.arc((x-s,y-s*.8,x+s,y+s*.8),30,310,fill=color,width=3)
        d.polygon([(x-s*.78,y+s*.23),(x-s*.25,y+s*.33),(x-s*.57,y+s*.68)],fill=color)
        d.arc((x-s*.58,y-s*.4,x+s*.58,y+s*.4),210,520,fill=color,width=2)
    elif law == 'gravity':
        for j in range(3):
            v=s*(1-j*.3)
            d.arc((x-v,y-v,x+v,y+v),60+j*28,320+j*28,fill=color,width=3)
        d.ellipse((x-s*.18,y-s*.18,x+s*.18,y+s*.18),fill=color)
    elif law == 'frost':
        for q in (0,math.pi/3,-math.pi/3):
            dx=math.cos(q)*s*.8; dy=math.sin(q)*s*.8
            line(d,[(x-dx,y-dy),(x+dx,y+dy)],color,2)
        for a in range(6):
            q=a*math.pi/3
            px=x+math.cos(q)*s*.55; py=y+math.sin(q)*s*.55
            d.polygon([(px,py-s*.18),(px+s*.13,py),(px,py+s*.18),(px-s*.13,py)],outline=color,width=2)


def branch_path(d, entry, color):
    """A small flight-diagram seal, keyed to the authored combat motion."""
    motion = entry.get('combatMotion')
    if not motion:
        return
    variation = entry.get('variation') or ''
    x, y = 155, 153
    d.rounded_rectangle((127, 126, 181, 180), radius=12,
                        fill=(5, 17, 27, 232), outline=(*color, 235), width=2)
    c = (*color, 255)
    # Avoid a generic law badge: these ten glyphs reflect the actual routes
    # that the corresponding attack takes in the game.
    if motion == 'mortar':
        d.arc((135, 135, 173, 166), 185, 345, fill=c, width=3)
        d.line((165, 157, 173, 160), fill=c, width=2)
        d.ellipse((167, 159, 175, 167), outline=c, width=2)
    elif motion == 'satellite':
        d.ellipse((135, 139, 175, 169), outline=c, width=2)
        d.ellipse((151, 150, 159, 158), fill=(246, 228, 171, 255))
        for px, py in ((136, 153), (170, 143), (171, 164)):
            d.ellipse((px-3, py-3, px+3, py+3), fill=c)
    elif motion == 'ricochet':
        d.line((137, 168, 147, 141, 157, 159, 174, 137), fill=c, width=3, joint='curve')
        for px, py in ((147, 141), (157, 159)):
            d.ellipse((px-3, py-3, px+3, py+3), outline=c, width=2)
    elif motion == 'mark':
        d.ellipse((139, 138, 171, 170), outline=c, width=2)
        d.line((155, 132, 155, 145), fill=c, width=2)
        d.line((155, 163, 155, 176), fill=c, width=2)
        d.line((133, 154, 146, 154), fill=c, width=2)
        d.line((164, 154, 177, 154), fill=c, width=2)
    elif motion == 'sweep':
        d.polygon([(135, 169), (165, 136), (173, 137), (143, 172)], outline=c, width=3)
        d.line((137, 139, 171, 171), fill=(*color, 130), width=2)
    elif motion == 'spiral':
        points = [(155+int((3+i*.9)*math.cos(i*.42)),
                   154+int((3+i*.9)*math.sin(i*.42))) for i in range(33)]
        d.line(points, fill=c, width=3, joint='curve')
    elif motion == 'field':
        for r in (7, 14, 21):
            d.ellipse((155-r, 154-r*.73, 155+r, 154+r*.73), outline=c, width=2)
        d.ellipse((152, 151, 158, 157), fill=c)
    elif motion == 'fan':
        for dx in (-18, -9, 0, 9, 18):
            d.line((155, 170, 155+dx, 137+abs(dx)//3), fill=c, width=2)
            d.ellipse((153+dx, 136+abs(dx)//3, 157+dx, 140+abs(dx)//3), fill=c)
    elif motion == 'return':
        d.arc((135, 138, 174, 171), 195, 525, fill=c, width=3)
        d.polygon([(137, 161), (143, 167), (134, 171)], fill=c)
        d.line((148, 151, 167, 151), fill=c, width=2)
    elif motion == 'relay':
        nodes = [(139, 163), (151, 143), (161, 158), (174, 138)]
        d.line(nodes, fill=c, width=3, joint='curve')
        for px, py in nodes:
            d.ellipse((px-3, py-3, px+3, py+3), fill=c)
    # A unique terminal mark separates alternate branches within a family.
    ticks = 1 + sum(map(ord, variation)) % 4
    for t in range(ticks):
        d.line((132+t*5, 174, 132+t*5, 177), fill=c, width=2)


def card(entry, index):
    a,b=entry['laws']
    img=Image.new('RGBA',(SIZE,SIZE),(7,20,28,255))
    left=fusion_tile(entry['fusion']) if entry['kind']=='final' else None
    left=left or source_tile(a)
    right=source_tile(entry['addedLaw'] if entry['kind']=='final' else b)
    # Existing hand-painted relics form the material. Curved feathered masks
    # give each paired relic a joined silhouette rather than a hard split.
    img.paste(left,(0,0),lobe_mask(0,((index%5)-2)*.035))
    img.paste(right,(0,0),lobe_mask(1,((index%7)-3)*.025))
    overlay=Image.new('RGBA',(SIZE,SIZE),(0,0,0,0))
    brush=ImageDraw.Draw(overlay)
    brush.rectangle((0,0,SIZE-1,SIZE-1),outline=(228,211,145,160),width=2)
    brush.rounded_rectangle((7,7,SIZE-8,SIZE-8),radius=27,outline=(252,239,196,90),width=2)
    img=Image.alpha_composite(img,overlay)
    if entry['kind']=='final':
        featured=entry['addedLaw']; other=b if featured==a else a
        # One branch foregrounds its added solo, the counterpart foregrounds
        # the established fusion. The two end forms no longer share one hero
        # silhouette with only a color/glyph swap.
        detail=(fusion_tile(entry['fusion']) if featured == a else None) or source_tile(featured)
        # The branch-defining solo evolution is brought to the foreground;
        # the other law remains a small rear orbit/rune. Opposite branches of
        # one fusion therefore have a different focal subject and geometry.
        subject=detail.resize((146,146),Image.Resampling.LANCZOS)
        submask=ellipse_mask((21,20,171,170),13).crop((23,23,169,169))
        img.paste(subject,(23,23),submask)
        col=LAW_COLOR[featured]; subcol=LAW_COLOR[other]
        def details(d,c):
            motif(d,featured,96,100,57,c,angle=(index%4)*.2)
            motif(d,other,37 if featured==a else 155,32,16,(*subcol,190))
            # A drawn flight path gives the attack a direction and visually
            # distinguishes outward, anchored, orbiting and returning roles.
            if featured in ('recall','orbit'):
                d.arc((18,18,174,174),205,511,fill=c,width=3)
            elif featured in ('gravity','frost'):
                d.ellipse((17,17,175,175),outline=c,width=2)
            else:
                line(d,[(20,165),(59,149),(96,139),(138,117),(171,64)],c,3)
            branch_path(d,entry,col)
        g,l=glow_layer(details,col)
    else:
        col=LAW_COLOR[a]; subcol=LAW_COLOR[b]
        def details(d,c):
            motif(d,a,59,96,34,c,angle=(index%5)*.2)
            motif(d,b,135,96,34,(*subcol,255),angle=(index%7)*.17)
            # Interlocked hourglass: two solo sources cooperate, neither sits
            # behind the other as a generic diagonal half-card.
            line(d,[(72,48),(113,82),(79,120),(120,151)],c,4)
            line(d,[(120,48),(79,82),(113,120),(72,151)],(*subcol,255),4)
            d.ellipse((83,82,109,108),outline=(250,232,180,255),width=3)
        g,l=glow_layer(details,col)
    img=Image.alpha_composite(img,g)
    img=Image.alpha_composite(img,l)
    vignette=Image.new('RGBA',(SIZE,SIZE),(0,0,0,0)); d=ImageDraw.Draw(vignette)
    d.rounded_rectangle((5,5,SIZE-6,SIZE-6),radius=22,outline=(250,218,150,178),width=2)
    for px,py in ((14,14),(SIZE-14,14),(14,SIZE-14),(SIZE-14,SIZE-14)):
        d.ellipse((px-2,py-2,px+2,py+2),fill=(255,237,181,230))
    return Image.alpha_composite(img,vignette).convert('RGB')


for page in range(3):
    atlas=Image.new('RGB',(SIZE*6,SIZE*6),(5,18,24))
    for entry in ENTRIES[page*36:(page+1)*36]:
        i=entry['tile']; atlas.paste(card(entry,page*36+i),((i%6)*SIZE,(i//6)*SIZE))
    destination=ROOT / f'public/assets/seed-final-identity-atlas-v1-{page+1}.webp'
    atlas.save(destination,'WEBP',quality=81,method=6)
    print(destination.name,destination.stat().st_size)
