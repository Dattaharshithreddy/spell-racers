"""Judy Hopps + Nick Wilde (fan-art style) built and rendered in headless Blender.
Usage: python3 chars.py <outdir> [quick]
Renders per character: idle, run0..run7, jump  -> PNG with transparent bg.
"""
import bpy, math, sys, os
from mathutils import Vector, Euler

OUT = sys.argv[1]
QUICK = len(sys.argv) > 2 and sys.argv[2] == "quick"
os.makedirs(OUT, exist_ok=True)
R = math.radians

# ------------------------------------------------------------ scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 24 if QUICK else 64
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x = 360
    sc.render.resolution_y = 440
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    # toon-ish ink lines
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = "ABSOLUTE"
    sc.render.line_thickness = 1.6
    vl = sc.view_layers[0]
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new("L")
    ls.select_by_visibility = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("LS")
    ls.linestyle.color = (0.08, 0.06, 0.12)
    ls.linestyle.thickness = 1.6
    # world light
    w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.85, 0.88, 1.0, 1); bg.inputs[1].default_value = 0.22
    # key / rim lights
    def light(name, typ, loc, rot, energy, size=2):
        d = bpy.data.lights.new(name, typ); d.energy = energy
        if typ == "AREA": d.size = size
        o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = Euler([R(a) for a in rot])
        sc.collection.objects.link(o)
    light("key", "AREA", (2.5, -4, 4), (55, 0, 30), 260, 3)
    light("fill", "AREA", (-3, -3, 2), (70, 0, -40), 70, 4)
    light("rim", "AREA", (-1, 4, 3), (-60, 0, 180), 220, 2)
    # orthographic camera looking +Y
    cd = bpy.data.cameras.new("cam"); cd.type = "ORTHO"; cd.ortho_scale = 2.25
    cam = bpy.data.objects.new("cam", cd); cam.location = (0.05, -8, 0.92); cam.rotation_euler = Euler((R(90), 0, 0))
    sc.collection.objects.link(cam); sc.camera = cam
    return sc

MATS = {}
def mat(name, rgb, rough=0.6, sheen=0.0, tex=None):
    key = name
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    col = (*[c / 255 for c in rgb], 1) if max(rgb) > 1 else (*rgb, 1)
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rough
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
        b.inputs["Sheen Tint"].default_value = (1, 1, 1, 1)
    if tex:
        img = bpy.data.images.load(tex); t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    m.diffuse_color = col
    MATS[key] = m
    return m

def smooth(o, sub=2):
    for p in o.data.polygons: p.use_smooth = True
    if sub:
        md = o.modifiers.new("s", "SUBSURF"); md.levels = sub; md.render_levels = sub

def sph(name, loc, scl, m, parent=None, rot=(0, 0, 0), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1, location=(0, 0, 0))
    o = bpy.context.object; o.name = name
    o.scale = scl; o.rotation_euler = Euler([R(a) for a in rot])
    o.data.materials.append(m); smooth(o, 1)
    if parent: o.parent = parent
    o.location = loc
    return o

def cone(name, loc, r1, r2, depth, m, parent=None, rot=(0, 0, 0), scl=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=r1, radius2=r2, depth=depth, location=(0, 0, 0))
    o = bpy.context.object; o.name = name
    o.rotation_euler = Euler([R(a) for a in rot]); o.scale = scl
    o.data.materials.append(m); smooth(o, 1)
    if parent: o.parent = parent
    o.location = loc
    return o

def cyl(name, loc, r, depth, m, parent=None, rot=(0, 0, 0), scl=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=depth, location=(0, 0, 0))
    o = bpy.context.object; o.name = name
    o.rotation_euler = Euler([R(a) for a in rot]); o.scale = scl
    o.data.materials.append(m); smooth(o, 0)
    if parent: o.parent = parent
    o.location = loc
    return o

def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(o)
    if parent: o.parent = parent
    o.location = loc
    return o

def eye(prefix, loc, parent, iris_rgb, size, lid_mat=None, lid=0.0):
    """Eye facing +X. lid: 0 = open, 0.45 = Nick's sly half-lid."""
    e = empty(prefix, loc, parent)
    white = mat("eyewhite", (250, 250, 250), 0.25)
    sph(prefix + "W", (0, 0, 0), (size * 0.55, size * 0.85, size), white, e)
    sph(prefix + "I", (size * 0.4, 0, -size * 0.05), (size * 0.25, size * 0.6, size * 0.68), mat("iris" + prefix[0], iris_rgb, 0.2), e)
    sph(prefix + "P", (size * 0.55, 0, -size * 0.05), (size * 0.15, size * 0.32, size * 0.4), mat("pupil", (10, 8, 16), 0.15), e)
    sph(prefix + "H", (size * 0.66, -size * 0.18, size * 0.28), (size * 0.08, size * 0.14, size * 0.14), mat("glint", (255, 255, 255), 0.05), e)
    if lid_mat is not None and lid > 0:
        # half-sphere eyelid covering the top part of the eye
        l = sph(prefix + "L", (size * 0.06, 0, size * (1 - lid * 2) + size * 0.55), (size * 0.62, size * 0.92, size * 0.6), lid_mat, e)
    return e

# ------------------------------------------------------------ JUDY
def build_judy():
    fur = mat("j_fur", (139, 146, 160), 0.85, sheen=0.4)
    fur_l = mat("j_furL", (226, 224, 222), 0.85, sheen=0.4)
    dark = mat("j_tip", (38, 36, 44), 0.8)
    pink = mat("j_pink", (232, 150, 172), 0.7)
    nose = mat("j_nose", (214, 102, 138), 0.4)
    shirt = mat("j_shirt", (48, 92, 196), 0.6)
    vest = mat("j_vest", (24, 32, 70), 0.45)
    pants = mat("j_pants", (28, 40, 86), 0.6)
    belt = mat("j_belt", (16, 16, 22), 0.4)
    gold = mat("j_gold", (232, 186, 52), 0.25)

    root = empty("root", (0, 0, 0))
    hips = empty("hips", (0, 0, 0.40), root)
    torso = empty("torso", (0, 0, 0), hips)
    # body
    sph("pelvis", (0, 0, 0.02), (0.12, 0.12, 0.11), pants, torso)
    sph("chest", (0.01, 0, 0.19), (0.12, 0.13, 0.19), shirt, torso)
    sph("vest", (0.022, 0, 0.21), (0.115, 0.135, 0.15), vest, torso)
    cyl("belt", (0.0, 0, 0.07), 0.125, 0.05, belt, torso, scl=(1, 0.97, 1))
    cyl("buckle", (0.122, 0, 0.07), 0.025, 0.02, gold, torso, rot=(0, 90, 0))
    cyl("badge", (0.13, 0.05, 0.25), 0.032, 0.014, gold, torso, rot=(0, 80, 0))
    cyl("radio", (0.09, -0.1, 0.29), 0.022, 0.06, belt, torso)
    sph("tail", (-0.13, 0, 0.03), (0.055, 0.055, 0.055), fur_l, torso)
    # neck + head
    neck = empty("neck", (0, 0, 0.36), torso)
    head = empty("head", (0.02, 0, 0.17), neck); head.scale = (1.28, 1.28, 1.28)
    sph("neckfur", (0, 0, -0.08), (0.07, 0.07, 0.08), fur, neck)
    sph("skull", (0, 0, 0), (0.15, 0.15, 0.145), fur, head)
    sph("cheekL", (0.06, 0.08, -0.06), (0.09, 0.07, 0.07), fur_l, head)
    sph("cheekR", (0.06, -0.08, -0.06), (0.09, 0.07, 0.07), fur_l, head)
    sph("muzzle", (0.12, 0, -0.06), (0.06, 0.075, 0.055), fur_l, head)
    sph("chin", (0.08, 0, -0.1), (0.06, 0.06, 0.04), fur_l, head)
    sph("nose", (0.178, 0, -0.035), (0.016, 0.024, 0.016), nose, head)
    sph("forehead", (0.08, 0, 0.06), (0.08, 0.06, 0.06), fur, head)
    # big purple eyes
    eye("jeyeL", (0.115, 0.062, 0.015), head, (112, 68, 196), 0.05)
    eye("jeyeR", (0.115, -0.062, 0.015), head, (112, 68, 196), 0.05)
    # brows (fur ridge)
    sph("browL", (0.12, 0.065, 0.075), (0.02, 0.035, 0.008), fur, head, rot=(10, 0, 0))
    sph("browR", (0.12, -0.065, 0.075), (0.02, 0.035, 0.008), fur, head, rot=(-10, 0, 0))
    # ears: long, black tips, pink inner
    for side, y in (("L", 0.055), ("R", -0.055)):
        ep = empty("ear" + side, (-0.02, y, 0.11), head)
        ep.rotation_euler = Euler((R(14 if y > 0 else -14), R(-14), 0))
        sph("earO" + side, (0, 0, 0.19), (0.05, 0.03, 0.2), fur, ep)
        sph("earI" + side, (0.024, 0, 0.18), (0.024, 0.02, 0.16), pink, ep)
        sph("earT" + side, (0, 0, 0.335), (0.04, 0.024, 0.06), dark, ep)
    # arms
    arms = {}
    for side, y in (("L", 0.12), ("R", -0.12)):
        sh = empty("sh" + side, (0.0, y, 0.29), torso)
        sph("upper" + side, (0, 0, -0.08), (0.045, 0.045, 0.1), shirt, sh)
        el = empty("el" + side, (0, 0, -0.17), sh)
        sph("fore" + side, (0, 0, -0.06), (0.036, 0.036, 0.08), fur, el)
        sph("hand" + side, (0.01, 0, -0.14), (0.038, 0.032, 0.04), fur, el)
        arms[side] = (sh, el)
    # legs: thick thighs (rabbit), big bare feet
    legs = {}
    for side, y in (("L", 0.06), ("R", -0.06)):
        hp = empty("hip" + side, (0, y, -0.02), hips)
        sph("thigh" + side, (0.0, 0, -0.1), (0.058, 0.055, 0.12), pants, hp)
        kn = empty("kn" + side, (0, 0, -0.2), hp)
        sph("shin" + side, (0, 0, -0.07), (0.038, 0.038, 0.1), pants, kn)
        an = empty("an" + side, (0, 0, -0.16), kn)
        sph("foot" + side, (0.07, 0, -0.015), (0.12, 0.05, 0.035), fur, an)
        sph("sole" + side, (0.07, 0, -0.035), (0.11, 0.045, 0.015), fur_l, an)
        legs[side] = (hp, kn, an)
    return dict(root=root, hips=hips, torso=torso, neck=neck, head=head, arms=arms, legs=legs,
                ears=(bpy.data.objects["earL"], bpy.data.objects["earR"]), hip_h=0.40)

# ------------------------------------------------------------ NICK
def build_nick():
    import numpy as np
    # hawaiian shirt texture: pale green with darker leaf blobs + small purple flowers
    from PIL import Image, ImageDraw
    import random
    random.seed(7)
    W_, H_ = 512, 256
    img = Image.new("RGB", (W_, H_), (128, 190, 92)); d = ImageDraw.Draw(img)
    for _ in range(70):
        x, y = random.randrange(W_), random.randrange(H_); r = random.randrange(10, 22)
        d.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=(70, 130, 60))
    for _ in range(40):
        x, y = random.randrange(W_), random.randrange(H_)
        for a in range(5):
            ang = a * 2 * math.pi / 5
            d.ellipse((x + 6 * math.cos(ang) - 4, y + 6 * math.sin(ang) - 4, x + 6 * math.cos(ang) + 4, y + 6 * math.sin(ang) + 4), fill=(120, 80, 150))
    tex = os.path.join(OUT, "_shirt.png"); img.save(tex)

    fur = mat("n_fur", (214, 104, 40), 0.85, sheen=0.4)
    cream = mat("n_cream", (240, 222, 188), 0.85, sheen=0.4)
    darkfur = mat("n_dark", (70, 40, 28), 0.85)
    shirt = mat("n_shirt", (128, 190, 92), 0.7, tex=tex)
    tie = mat("n_tie", (40, 56, 120), 0.45)
    tie2 = mat("n_tie2", (90, 110, 170), 0.45)
    pants = mat("n_pants", (104, 98, 86), 0.75)
    nose = mat("n_nose", (20, 14, 14), 0.3)

    root = empty("root", (0, 0, 0))
    hips = empty("hips", (0, 0, 0.44), root)
    torso = empty("torso", (0, 0, 0), hips)
    sph("pelvis", (0, 0, 0.02), (0.14, 0.14, 0.12), pants, torso)
    sph("chest", (0.0, 0, 0.21), (0.14, 0.155, 0.22), shirt, torso)
    # open collar showing cream chest + tie
    sph("chestfur", (0.11, 0, 0.33), (0.04, 0.06, 0.07), cream, torso)
    tl = empty("tieroot", (0.135, 0, 0.36), torso)
    sph("tieknot", (0.0, 0, 0.0), (0.02, 0.025, 0.022), tie, tl)
    sph("tieblade", (0.012, 0, -0.13), (0.014, 0.034, 0.12), tie, tl, rot=(0, -6, 0))
    for i in range(4):
        sph(f"tiestripe{i}", (0.024, 0, -0.05 - i * 0.05), (0.004, 0.03, 0.006), tie2, tl, rot=(35, 0, 0))
    sph("collarL", (0.1, 0.06, 0.37), (0.04, 0.05, 0.025), shirt, torso, rot=(30, 0, 0))
    sph("collarR", (0.1, -0.06, 0.37), (0.04, 0.05, 0.025), shirt, torso, rot=(-30, 0, 0))
    # big tail
    tp = empty("tail", (-0.11, 0, 0.0), torso)
    tp.rotation_euler = Euler((0, R(-120), 0))
    sph("tail1", (0, 0, 0.14), (0.07, 0.068, 0.17), fur, tp)
    sph("tail2", (0, 0, 0.29), (0.058, 0.056, 0.06), cream, tp)
    # head with long snout
    neck = empty("neck", (0, 0, 0.42), torso)
    head = empty("head", (0.02, 0, 0.16), neck); head.scale = (1.15, 1.15, 1.15)
    sph("neckfur", (0, 0, -0.08), (0.075, 0.075, 0.08), fur, neck)
    sph("skull", (0, 0, 0.01), (0.14, 0.14, 0.13), fur, head)
    sph("cheekL", (0.03, 0.1, -0.05), (0.07, 0.06, 0.06), cream, head)
    sph("cheekR", (0.03, -0.1, -0.05), (0.07, 0.06, 0.06), cream, head)
    sn = empty("snout", (0.1, 0, -0.04), head)
    sn.rotation_euler = Euler((0, R(8), 0))
    sph("snoutTop", (0.06, 0, 0.01), (0.12, 0.06, 0.05), fur, sn)
    sph("snoutLow", (0.05, 0, -0.025), (0.11, 0.058, 0.04), cream, sn)
    sph("nose", (0.175, 0, 0.022), (0.025, 0.028, 0.022), nose, sn)
    sph("mouth", (0.09, 0, -0.045), (0.07, 0.04, 0.006), darkfur, sn)
    # sly half-lidded green eyes
    eye("neyeL", (0.105, 0.058, 0.035), head, (82, 160, 60), 0.042, fur, 0.42)
    eye("neyeR", (0.105, -0.058, 0.035), head, (82, 160, 60), 0.042, fur, 0.42)
    sph("browL", (0.115, 0.06, 0.085), (0.025, 0.035, 0.008), darkfur, head, rot=(14, 10, 0))
    sph("browR", (0.115, -0.06, 0.08), (0.025, 0.035, 0.008), darkfur, head, rot=(-14, 10, 0))
    # big pointed ears with dark backs
    for side, y in (("L", 0.07), ("R", -0.07)):
        ep = empty("ear" + side, (-0.02, y, 0.1), head)
        ep.rotation_euler = Euler((R(18 if y > 0 else -18), R(-10), 0))
        cone("earO" + side, (0, 0, 0.08), 0.07, 0.004, 0.17, fur, ep, scl=(0.6, 1, 1))
        cone("earI" + side, (0.022, 0, 0.07), 0.05, 0.004, 0.13, darkfur, ep, scl=(0.4, 1, 1))
        cone("earT" + side, (-0.004, 0, 0.14), 0.026, 0.002, 0.06, darkfur, ep, scl=(0.6, 1, 1))
    arms = {}
    for side, y in (("L", 0.15), ("R", -0.15)):
        sh = empty("sh" + side, (0.0, y, 0.33), torso)
        sph("upper" + side, (0, 0, -0.07), (0.05, 0.05, 0.09), shirt, sh)
        el = empty("el" + side, (0, 0, -0.16), sh)
        sph("fore" + side, (0, 0, -0.07), (0.033, 0.033, 0.09), fur, el)
        sph("hand" + side, (0.01, 0, -0.16), (0.036, 0.03, 0.04), darkfur, el)
        arms[side] = (sh, el)
    legs = {}
    for side, y in (("L", 0.07), ("R", -0.07)):
        hp = empty("hip" + side, (0, y, -0.02), hips)
        sph("thigh" + side, (0, 0, -0.1), (0.06, 0.06, 0.13), pants, hp)
        kn = empty("kn" + side, (0, 0, -0.21), hp)
        sph("shin" + side, (0, 0, -0.08), (0.048, 0.048, 0.11), pants, kn)
        an = empty("an" + side, (0, 0, -0.19), kn)
        sph("foot" + side, (0.05, 0, -0.012), (0.085, 0.045, 0.03), darkfur, an)
        legs[side] = (hp, kn, an)
    return dict(root=root, hips=hips, torso=torso, neck=neck, head=head, arms=arms, legs=legs,
                ears=(bpy.data.objects["earL"], bpy.data.objects["earR"]), hip_h=0.44, tail=tp)

# ------------------------------------------------------------ posing
def pose(rig, kind, t=None, jump=False):
    """t in [0,1) = run cycle phase; None = idle."""
    hips, torso, head, neck = rig["hips"], rig["torso"], rig["head"], rig["neck"]
    base = rig["hip_h"]
    def setr(o, x=0, y=0, z=0): o.rotation_euler = Euler((R(x), R(y), R(z)))
    face = -42  # 3/4 turn toward camera
    setr(rig["root"], 0, 0, face)
    if jump:
        hips.location.z = base + 0.02
        setr(torso, 0, 12, 0); setr(neck, 0, -8, 0)
        for side, s in (("L", 1), ("R", -1)):
            hp, kn, an = rig["legs"][side]
            setr(hp, 0, -70 if s > 0 else -25, 0); setr(kn, 0, 95 if s > 0 else 60, 0); setr(an, 0, -20, 0)
            sh, el = rig["arms"][side]
            setr(sh, 0, -150 if s > 0 else 40, 15 * s); setr(el, 0, -20, 0)
        if "tail" in rig: setr(rig["tail"], 0, -95, 0)
        return
    if t is None:
        hips.location.z = base
        setr(torso, 0, 0, 0); setr(neck, 0, 0, 0)
        for side, s in (("L", 1), ("R", -1)):
            hp, kn, an = rig["legs"][side]
            setr(hp, 0, -4 * s, 0); setr(kn, 0, 6, 0); setr(an, 0, -2, 0)
            sh, el = rig["arms"][side]
            setr(sh, 8 * s, 0, 0); setr(el, 0, -20, 0)
        if kind == "nick":  # hand on hip swagger
            sh, el = rig["arms"]["R"]; setr(sh, -40, 25, 0); setr(el, 0, -110, 0)
        if "tail" in rig: setr(rig["tail"], 0, -150, 0)
        return
    ph = t * 2 * math.pi
    stride = 42 if kind == "judy" else 38
    hips.location.z = base + 0.035 * abs(math.sin(ph)) - 0.012
    setr(torso, 0, 12, 0)  # lean into the run
    setr(neck, 0, -10 + 3 * math.sin(2 * ph), 0)
    for side, s in (("L", 1), ("R", -1)):
        p = ph + (0 if s > 0 else math.pi)
        hp, kn, an = rig["legs"][side]
        swing = -stride * math.sin(p) - 10
        knee = 25 + 55 * max(0, math.cos(p))   # bend knee on the recovery swing
        setr(hp, 0, swing, 0); setr(kn, 0, knee, 0); setr(an, 0, -15 * math.sin(p) - 5, 0)
        sh, el = rig["arms"][side]
        setr(sh, 6 * s, stride * 0.9 * math.sin(p), 0); setr(el, 0, -55, 0)
    for e, s in zip(rig["ears"], (1, -1)):
        pass
    if "tail" in rig: setr(rig["tail"], 0, -112 + 8 * math.sin(2 * ph), 8 * math.sin(ph))

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

# ------------------------------------------------------------ main
for kind in ("judy", "nick"):
    MATS.clear()
    reset()
    rig = build_judy() if kind == "judy" else build_nick()
    frames = [("idle", None, False), ("jump", None, True)] + [(f"run{i}", i / 8, False) for i in range(8)]
    if QUICK: frames = frames[:1] + frames[2:3] + frames[5:6] + frames[1:2]
    for name, t, j in frames:
        pose(rig, kind, t, j)
        bpy.context.view_layer.update()
        render(os.path.join(OUT, f"{kind}_{name}.png"))
        print("rendered", kind, name, flush=True)
