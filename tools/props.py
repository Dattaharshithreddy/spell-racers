"""Landmarks + NPCs for MAATHU. python3 props.py <outdir> [glb|preview]"""
import bpy, math, sys, os
from mathutils import Euler, Matrix, Vector
OUT = sys.argv[1]; MODE = sys.argv[2] if len(sys.argv) > 2 else "glb"
os.makedirs(OUT, exist_ok=True)
R = math.radians
bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene

MATS = {}
def M(name, hexs, rough=0.8, metal=0.0, emit=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    h = hexs.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [(x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = emit
    MATS[name] = m; return m

GROUP = []
def _fin(o, mat, smooth, bevel):
    if bevel:
        bv = o.modifiers.new("b", "BEVEL"); bv.width = bevel; bv.segments = 2; bv.limit_method = "ANGLE"
    o.data.materials.clear(); o.data.materials.append(mat)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    GROUP.append(o); return o
def box(sz, loc, mat, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=[R(a) for a in rot]); o = bpy.context.object; o.scale = sz
    return _fin(o, mat, False, bevel)
def cyl(r, h, loc, mat, v=24, rot=(0, 0, 0), smooth=True, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc, rotation=[R(a) for a in rot])
    else: bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=h, location=loc, rotation=[R(a) for a in rot])
    return _fin(bpy.context.object, mat, smooth, 0)
def sph(r, loc, mat, scl=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc); o = bpy.context.object; o.scale = scl
    return _fin(o, mat, True, 0)
def dome(r, loc, mat, h=1.0, onion=False, seg=24):
    """hemisphere (or onion) dome sitting on loc"""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=(0, 0, 0)); o = bpy.context.object
    me = o.data
    for v in me.vertices:
        if v.co.z < 0: v.co.z = 0
        if onion:
            t = v.co.z / r
            k = 1 + 0.35 * math.sin(t * math.pi * 0.9) - 0.75 * t ** 3
            v.co.x *= k; v.co.y *= k; v.co.z = v.co.z * 1.25
    o.location = loc; o.scale = (1, 1, h)
    return _fin(o, mat, True, 0)

def group(name):
    """join everything built since last group() into one object named `name`."""
    global GROUP
    objs = [o for o in GROUP if o.name in bpy.data.objects]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); j = bpy.context.object; j.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    GROUP = []; return j

STONE = M("stone_cream", "#E2D9C6"); STONE2 = M("stone_grey", "#B9B0A0"); DARK = M("window", "#4E4740")
GOLD = M("gold", "#E2A93A", 0.3, 1.0); GLOW = M("glow", "#FFE7A3", 0.5, 0, 6.0)

# ------------------------------------------------------------------ Vidhana Soudha (front faces -Y)
def vidhana():
    box((46, 20, 1.2), (0, 0, 0.6), STONE2)
    box((42, 14, 9), (0, 2, 5.7), STONE, bevel=0.1)
    for row in range(2):
        for i in range(16):
            x = -19.5 + i * 2.6
            if abs(x) < 7: continue
            box((1.0, 0.3, 2.2), (x, -5.05, 3.4 + row * 4.0), DARK)
    for i in range(12):
        cyl(0.42, 8.0, (-8.8 + i * 1.6, -7.2, 5.2), STONE, v=16)
    box((19.5, 4.4, 1.0), (0, -6.0, 9.6), STONE, bevel=0.05)
    for i in range(6): box((19 - i * 0.8, 0.6, 0.4), (0, -7.0 - i * 0.6, 1.2 + -0.0 - i * 0.0 + 0.2 + i * -0.0), STONE2)
    for i in range(5): box((20 - i, 1.2, 0.35), (0, -9.6 + i * 0.5, 0.3 + i * 0.35), STONE2)
    cyl(4.6, 3.2, (0, 2, 11.8), STONE, v=32)
    for i in range(16):
        a = i / 16 * math.tau; cyl(0.25, 3.0, (4.7 * math.cos(a), 2 + 4.7 * math.sin(a), 11.8), STONE2, v=8)
    dome(4.8, (0, 2, 13.4), STONE, h=1.15, seg=32)
    cyl(0.5, 1.2, (0, 2, 19.3), GOLD, v=12); sph(0.55, (0, 2, 20.2), GOLD)
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = (sx * 18.5, 2 + sy * 5.0, 10.2)
            for k in range(4): cyl(0.18, 2.0, (p[0] + 1.1 * math.cos(k * math.pi / 2 + .8), p[1] + 1.1 * math.sin(k * math.pi / 2 + .8), 11.2), STONE, v=8)
            box((2.8, 2.8, 0.4), (p[0], p[1], 12.3), STONE); dome(1.5, (p[0], p[1], 12.5), STONE, h=1.1)
    return group("lm_vidhana")

# ------------------------------------------------------------------ Mysuru Palace
def palace():
    G2 = M("palace_stone", "#C9C0B0"); PINK = M("palace_pink", "#C44E5E", 0.7); ARCH = M("palace_arch", "#7A2633")
    box((50, 22, 1.2), (0, 0, 0.6), STONE2)
    box((44, 14, 11), (0, 2, 6.7), G2, bevel=0.1)
    for row in range(2):
        for i in range(13):
            x = -19.2 + i * 3.2
            box((2.2, 0.4, 3.4 if row == 0 else 2.6), (x, -5.1, 3.6 + row * 4.6), ARCH)
            sph(1.1, (x, -5.1, 5.3 + row * 4.6 - (0.3 if row else 0)), ARCH, scl=(1, 0.36, 0.6))
    box((10, 10, 20), (0, -2, 10), G2, bevel=0.1)
    for row in range(4):
        for i in range(3): box((1.8, 0.4, 2.6), (-3 + i * 3, -7.1, 4 + row * 4.4), ARCH)
    cyl(3.6, 2.4, (0, -2, 21.2), G2, v=8)
    dome(4.2, (0, -2, 22.4), GOLD, h=1.0, onion=True, seg=32)
    cyl(0.25, 3.0, (0, -2, 29.8), GOLD, v=8); sph(0.5, (0, -2, 31.2), GOLD)
    for sx in (-1, 1):
        box((6, 6, 15), (sx * 14, -1, 7.5), G2, bevel=0.1)
        cyl(2.4, 1.6, (sx * 14, -1, 15.8), G2, v=8)
        dome(2.8, (sx * 14, -1, 16.6), PINK, h=1.0, onion=True)
        sph(0.35, (sx * 14, -1, 21.5), GOLD)
        for k in range(4):
            x = sx * (21.5 - 0.0) ; y = -4.6 + k * 4.5
            cyl(0.7, 2.4, (sx * 21, y, 13.4), G2, v=8); dome(0.95, (sx * 21, y, 14.6), PINK, onion=True)
    for i in range(46):  # bulbs along the roofline (the famous palace lights)
        sph(0.18, (-22 + i * (44 / 45), -5.3, 12.4), GLOW, seg=8)
    for i in range(24):
        a = i / 24; sph(0.18, (-5 + a * 10, -7.3, 20.2), GLOW, seg=8)
    return group("lm_palace")

# ------------------------------------------------------------------ Hampi: stone chariot + Virupaksha gopuram + boulders
def hampi():
    GR = M("hampi_granite", "#C7A985"); GR2 = M("hampi_granite2", "#A98B6A"); BOULDER = M("boulder", "#B48E6C", 0.9)
    box((8, 6, 1.4), (0, 0, 0.7), GR2, bevel=0.1)
    box((5, 3.6, 1.6), (0, 0, 2.2), GR, bevel=0.1)
    for i in range(4): box((4.4 - i * 0.7, 3.2 - i * 0.5, 0.7), (0, 0, 3.35 + i * 0.7), GR, bevel=0.06)
    dome(0.9, (0, 0, 6.15), GR, h=1.3)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(1.25, 0.45, (sx * 2.75, sy * 1.1, 1.35), GR2, v=24, rot=(0, 90, 0))
            cyl(0.35, 0.6, (sx * 2.85, sy * 1.1, 1.35), GR, v=12, rot=(0, 90, 0))
    for k in range(2): box((0.7, 2.6, 1.2), (-3.8 - k * 0.0, 0, 2.0), GR)  # elephants' stand-ins (stone)
    # gopuram behind
    gx, gy = 0, 26
    box((16, 10, 8), (gx, gy, 4), GR, bevel=0.1)
    box((4, 0.6, 6), (gx, gy - 5.1, 3), M("door", "#3A2C22"))
    for i in range(9):
        w = 14 - i * 1.25; d = 8.6 - i * 0.7
        box((w, d, 2.4), (gx, gy, 9.2 + i * 2.4), GR, bevel=0.08)
        for j in range(int(w / 1.6)):
            box((0.5, 0.3, 1.2), (gx - w / 2 + 0.9 + j * 1.6, gy - d / 2 - 0.05, 9.3 + i * 2.4), GR2)
    cyl(1.4, w - 0.5, (gx, gy, 31.5), GR, v=16, rot=(0, 90, 0))
    for k in range(5): sph(0.4, (gx - 3 + k * 1.5, gy, 33.2), GOLD)
    import random; rnd = random.Random(3)
    for k in range(18):
        a = rnd.random() * math.tau; d = 10 + rnd.random() * 20
        r = 1.5 + rnd.random() * 3.5
        sph(r, (math.cos(a) * d + 6, math.sin(a) * d - 4, r * 0.5), BOULDER, scl=(1 + rnd.random() * 0.4, 1, 0.8 + rnd.random() * 0.3), seg=14)
    return group("lm_hampi")

# ------------------------------------------------------------------ Jog Falls: cliff amphitheatre + 4 falls
def jog():
    ROCK = M("jog_rock", "#5E5A4E", 0.95); MOSS = M("jog_moss", "#3F6B34", 0.95)
    FALL = M("fall", "#EAF6FF", 0.2, 0, 0.6); POOL = M("water", "#2F86B4", 0.1)
    for i in range(9):
        a = math.radians(-70 + i * 17.5); d = 26
        x, y = math.sin(a) * d, math.cos(a) * d
        box((10, 8, 34), (x, y, 17), ROCK, rot=(0, 0, -math.degrees(a)))
        box((10.4, 8.4, 2.5), (x, y, 34.5), MOSS, rot=(0, 0, -math.degrees(a)))
    for k, (x, w) in enumerate(((-9, 3.2), (-3, 2.2), (3, 1.4), (8.5, 2.6))):
        box((w, 0.4, 32), (x, 19.5 + (k % 2) * 0.6, 17.5), FALL)
    cyl(17, 0.6, (0, 8, 0.3), POOL, v=40)
    return group("lm_jog")

# ------------------------------------------------------------------ Gol Gumbaz
def golgumbaz():
    BS = M("basalt", "#8F887C"); BS2 = M("basalt2", "#76705F")
    box((30, 30, 1.2), (0, 0, 0.6), BS2)
    box((24, 24, 20), (0, 0, 11.2), BS, bevel=0.15)
    for s in range(4):
        rot = s * 90
        for i in range(3):
            x = -7 + i * 7
            v = Vector((x, -12.05, 0)); v.rotate(Euler((0, 0, R(rot))))
            box((4.6, 0.5, 11), (v.x, v.y, 8 + (2 if i == 1 else 0)), BS2, rot=(0, 0, rot))
    cyl(11.2, 2.2, (0, 0, 22.3), BS, v=48)
    for i in range(32):
        a = i / 32 * math.tau; box((1.2, 0.5, 1.4), (11.6 * math.cos(a), 11.6 * math.sin(a), 22.6), BS2, rot=(0, 0, math.degrees(a) + 90))
    dome(12.5, (0, 0, 23.4), BS, h=0.95, seg=48)
    cyl(0.6, 2.2, (0, 0, 35.8), BS2, v=8); sph(0.8, (0, 0, 37.3), GOLD)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * 12.6, sy * 12.6
            for t in range(7):
                cyl(2.8 - t * 0.08, 3.6, (x, y, 1.8 + t * 3.6), BS, v=8)
                cyl(3.0 - t * 0.08, 0.4, (x, y, 3.6 + t * 3.6), BS2, v=8)
            cyl(1.8, 1.2, (x, y, 27.5), BS2, v=8); dome(2.2, (x, y, 28.1), BS, h=1.05, onion=True); sph(0.3, (x, y, 31.4), GOLD)
    return group("lm_golgumbaz")

# ------------------------------------------------------------------ Badami red cliffs with cave temples + lake
def badami():
    RED = M("sandstone", "#B85B3C", 0.95); RED2 = M("sandstone2", "#9C4A31", 0.95); CAVE = M("cave", "#2E1C16")
    import random; rnd = random.Random(8)
    for i in range(14):
        x = -30 + i * 4.6; h = 14 + rnd.random() * 10
        box((5 + rnd.random() * 2, 9 + rnd.random() * 4, h), (x, 6 + rnd.random() * 3, h / 2), RED if i % 2 else RED2, rot=(0, 0, rnd.uniform(-6, 6)), bevel=0.4)
    for k, x in enumerate((-18, -6, 6, 18)):
        z = 3 + k * 2.2
        box((5, 1.2, 3.2), (x, 0.6, z), CAVE)
        for c in range(4): cyl(0.28, 3.0, (x - 1.8 + c * 1.2, 0.0, z), RED2, v=8)
        box((5.6, 1.0, 0.5), (x, 0.0, z + 1.8), RED2)
        for s in range(int(z)): box((2, 1.2, 0.5), (x, -1.0 - s * 0.6, s * 0.5 + 0.25), RED2)
    cyl(16, 0.5, (0, -16, 0.25), M("water", "#2F86B4", 0.1), v=40)
    return group("lm_badami")

# ------------------------------------------------------------------ Coorg: Raja's Seat pavilion on a terrace
def coorg():
    WH = M("pav_white", "#F2EEE6"); ROOF = M("pav_roof", "#A45436"); GRASS = M("lawn", "#5E9A3E")
    box((22, 16, 1.0), (0, 0, 0.5), GRASS)
    box((8, 8, 1.2), (0, 0, 1.6), STONE2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(0.4, 4.4, (sx * 3, sy * 3, 4.4), WH, v=16)
            sph(0.5, (sx * 3, sy * 3, 2.4), WH)
    box((7.6, 7.6, 0.6), (0, 0, 6.9), WH)
    for sx in (-1, 1):
        for sy in (-1, 1): sph(0.8, (sx * 3, sy * 3, 7.6), WH)
    dome(2.8, (0, 0, 7.2), ROOF, h=1.1); sph(0.4, (0, 0, 10.5), GOLD)
    for i in range(10):  # flower beds
        a = i / 10 * math.tau; sph(0.9, (8 * math.cos(a), 6 * math.sin(a), 1.2), M(f"flower{i % 3}", ["#E8435A", "#F4C430", "#B455D6"][i % 3]), scl=(1, 1, 0.6))
    return group("lm_coorg")

# ------------------------------------------------------------------ Murudeshwar gopuram + lighthouse on the coast
def coast():
    WH = M("gopuram_white", "#F1E7D4"); COL = [M("gp_red", "#C8463C"), M("gp_blue", "#3D7FC4"), M("gp_yel", "#E7B13A"), M("gp_grn", "#4EA35A")]
    box((22, 14, 1.2), (0, 0, 0.6), STONE2)
    box((14, 9, 7), (0, 0, 4.7), WH, bevel=0.1)
    box((3.6, 0.6, 5.4), (0, -4.6, 3.9), M("door", "#3A2C22"))
    for i in range(18):
        w = 12.6 - i * 0.55; d = 7.8 - i * 0.32
        box((w, d, 2.0), (0, 0, 9.2 + i * 2.0), WH, bevel=0.06)
        for j in range(int(w / 1.5)):
            box((0.55, 0.3, 1.0), (-w / 2 + 0.85 + j * 1.5, -d / 2 - 0.05, 9.3 + i * 2.0), COL[(i + j) % 4])
    cyl(1.4, w - 0.4, (0, 0, 46.3), WH, v=16, rot=(0, 90, 0))
    for k in range(7): sph(0.45, (-3.6 + k * 1.2, 0, 48.0), GOLD)
    # lighthouse
    for k in range(8):
        cyl(2.0 - k * 0.12, 3.0, (24, 10, 1.5 + k * 3.0), M("lh_red", "#D33C33") if k % 2 else M("lh_white", "#F4F1EA"), v=24)
    cyl(1.3, 2.2, (24, 10, 25.1), GLOW, v=16); dome(1.6, (24, 10, 26.2), M("lh_red", "#D33C33"))
    return group("lm_coast")

# ------------------------------------------------------------------ NPCs (story guardians)
def npc_parrot():
    G = M("parrot_green", "#2DB04A", 0.6); RB = M("parrot_beak", "#E0402F", 0.4); Y = M("parrot_collar", "#F2C230", 0.6); BL = M("eye_black", "#141210", 0.2)
    sph(0.22, (0, 0, 0.42), G, scl=(0.9, 1.0, 1.25)); sph(0.17, (0, -0.05, 0.72), G)
    cyl(0.07, 0.12, (0, -0.2, 0.69), RB, r2=0.01, rot=(70, 0, 0))
    sph(0.035, (0.09, -0.15, 0.76), BL); sph(0.035, (-0.09, -0.15, 0.76), BL)
    cyl(0.16, 0.05, (0, -0.02, 0.6), Y, v=24)
    for sx in (-1, 1): sph(0.15, (0.2 * sx, 0.05, 0.42), G, scl=(0.35, 1.0, 1.4))
    box((0.16, 0.5, 0.04), (0, 0.32, 0.18), M("parrot_tail", "#1E7F7A"), rot=(-35, 0, 0))
    box((0.06, 0.06, 0.4), (0, 0, 0.0), M("perch", "#7A5236")); box((0.5, 0.08, 0.06), (0, 0, 0.2), M("perch", "#7A5236"))
    return group("npc_parrot")
def npc_elephant():
    GR = M("ele", "#8C8994", 0.85); CL = M("ele_cloth", "#B0172D", 0.7); IV = M("ivory", "#F5EBD6", 0.4); BL = M("eye_black", "#141210", 0.2)
    sph(1.3, (0, 0.3, 2.0), GR, scl=(1.0, 1.35, 0.95))
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.38, 1.6, (sx * 0.65, 0.3 + sy * 0.9, 0.8), GR, v=16)
    sph(0.9, (0, -1.35, 2.6), GR)
    for i in range(8): sph(0.28 - i * 0.022, (0, -2.05 - i * 0.05, 2.3 - i * 0.25), GR)
    for sx in (-1, 1):
        sph(0.75, (sx * 0.95, -1.05, 2.75), GR, scl=(0.2, 0.9, 1.0))
        cyl(0.09, 0.9, (sx * 0.38, -1.95, 1.95), IV, r2=0.03, rot=(-60, 0, 0))
        sph(0.07, (sx * 0.5, -2.08, 2.85), BL)
    box((2.6, 2.4, 0.15), (0, 0.3, 3.15), CL, rot=(0, 0, 0)); box((2.7, 2.5, 0.12), (0, 0.3, 3.05), GOLD)
    box((0.9, 0.12, 1.1), (0, -2.1, 3.05), CL, rot=(18, 0, 0)); sph(0.1, (0, -2.22, 3.4), GOLD)
    return group("npc_elephant")
def npc_monkey():
    BR = M("monkey", "#8A5A36", 0.85); FC = M("monkey_face", "#E8B9A2", 0.6); BL = M("eye_black", "#141210", 0.2)
    sph(0.3, (0, 0, 0.55), BR, scl=(0.9, 0.8, 1.15)); sph(0.27, (0, -0.02, 1.05), BR)
    sph(0.18, (0, -0.17, 1.0), FC, scl=(1.1, 0.7, 0.95))
    for sx in (-1, 1):
        sph(0.09, (sx * 0.27, -0.02, 1.08), FC, scl=(0.5, 1, 1)); sph(0.035, (sx * 0.07, -0.29, 1.06), BL)
        cyl(0.07, 0.55, (sx * 0.28, -0.05, 0.6), BR, rot=(0, sx * 15, 0)); cyl(0.08, 0.45, (sx * 0.14, -0.05, 0.18), BR)
    for i in range(10): sph(0.05, (0, 0.28 + math.sin(i * 0.35) * 0.3, 0.3 + i * 0.09), BR)
    return group("npc_monkey")
def npc_bull():
    WH = M("bull", "#EEE6DA", 0.85); HN = M("horn_red", "#C8313B", 0.5); HN2 = M("horn_blue", "#2F6FC4", 0.5); BL = M("eye_black", "#141210", 0.2)
    sph(1.0, (0, 0.2, 1.5), WH, scl=(0.85, 1.5, 0.85)); sph(0.45, (0, -0.4, 2.35), WH, scl=(1, 1, 0.7))
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.22, 1.2, (sx * 0.5, 0.2 + sy * 0.9, 0.6), WH, v=12)
    sph(0.5, (0, -1.35, 1.95), WH, scl=(0.9, 1.1, 0.95)); sph(0.3, (0, -1.75, 1.75), M("muzzle", "#3B3330"))
    for sx in (-1, 1):
        cyl(0.11, 0.9, (sx * 0.35, -1.25, 2.6), HN if sx > 0 else HN2, r2=0.03, rot=(0, sx * 30, 0))
        sph(0.06, (sx * 0.3, -1.68, 2.1), BL)
    for i in range(14):
        a = i / 13 * math.pi; sph(0.11, (0.55 * math.cos(a), -1.0 + 0.1 * math.sin(a), 1.55 - 0.35 * math.sin(a)), M(f"garland{i % 2}", ["#F28C1E", "#F5D33A"][i % 2]))
    return group("npc_bull")

objs = [vidhana(), palace(), hampi(), jog(), golgumbaz(), badami(), coorg(), coast(), npc_parrot(), npc_elephant(), npc_monkey(), npc_bull()]
for o in objs: print(o.name, len(o.data.polygons))
if MODE == "glb":
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "props.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
else:
    # contact sheet render
    SC.render.engine = "CYCLES"; SC.cycles.samples = 16; SC.render.film_transparent = True
    SC.render.resolution_x, SC.render.resolution_y = 1600, 900
    w = bpy.data.worlds.new("W"); SC.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 3.5; so = bpy.data.objects.new("sun", sun); SC.collection.objects.link(so); so.rotation_euler = Euler((R(50), R(10), R(30)))
    xs = 0
    for o in objs[:8]:
        o.location.x = xs; xs += 62
    for i, o in enumerate(objs[8:]): o.location = (i * 6 + 10, -40, 0); o.scale = (3, 3, 3)
    cd = bpy.data.cameras.new("c"); cd.type = "ORTHO"; cd.ortho_scale = 470
    cam = bpy.data.objects.new("c", cd); SC.collection.objects.link(cam); SC.camera = cam
    cam.location = (220, -300, 160); cam.rotation_euler = Euler((R(66), 0, R(0)))
    SC.render.filepath = os.path.join(OUT, "props_preview.png"); bpy.ops.render.render(write_still=True)
