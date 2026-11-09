"""
Spell Racers — 3D runner generator (Blender 5.x, run headless with the `bpy` module).

Builds the five original runners from organic sculpted forms (voxel-fused shapes), gives them real
particle fur, glossy eyes and fabric clothes, poses them and renders sprite
sheets with Cycles.

  python tools/blender/runners.py [runner_id ...] [--test]

Output: img/runners/<id>.png (sprite sheet, one row) + img/runners/sheet.json
"""
import bpy, addon_utils, math, os, sys, json
from mathutils import Vector, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "img", "runners")
TEST = "--test" in sys.argv
FW, FH = (240, 300)          # frame size in pixels
ORTHO = 2.9                 # world units visible vertically

# ---------------------------------------------------------------- scene setup
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    addon_utils.enable("cycles", default_set=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 24 if TEST else 40
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.cycles.transparent_max_bounces = 16
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = FW, FH
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = -0.15
    sc.render.hair_type = "STRAND" if hasattr(sc.render, "hair_type") else None
    # soft sky world
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.78, 0.86, 1.0, 1); bg.inputs[1].default_value = 0.32
    # camera: three-quarter view from the front-left, orthographic
    cam = bpy.data.cameras.new("cam"); cam.type = "ORTHO"; cam.ortho_scale = ORTHO
    co = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co); sc.camera = co
    ang = math.radians(50)
    co.location = (math.sin(ang) * 10, -math.cos(ang) * 10 , 1.30)
    co.rotation_euler = Euler((math.radians(90), 0, ang), "XYZ")
    cam.shift_y = 0.0
    # lights: warm key, cool rim, soft fill
    def area(name, loc, rot, energy, color, size):
        l = bpy.data.lights.new(name, "AREA"); l.energy = energy; l.color = color; l.size = size
        o = bpy.data.objects.new(name, l); o.location = loc; o.rotation_euler = Euler([math.radians(a) for a in rot]); sc.collection.objects.link(o)
    area("key", (4.5, -3.5, 4.5), (48, 0, 52), 1300, (1.0, 0.93, 0.82), 2.5)
    area("rim", (-3.0, 3.5, 3.0), (-62, 0, -140), 1500, (0.70, 0.82, 1.0), 2)
    area("fill", (-2.0, -5.0, 1.0), (85, 0, -20), 220, (1.0, 0.9, 0.95), 4)
    return sc

# ---------------------------------------------------------------- materials
MATS = {}
def lin(c):
    """design colours are written in sRGB; Blender wants linear"""
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def mat(name, color, rough=0.6, sss=0.0, sheen=0.0, spec=0.4, coat=0.0, emit=None, bump=0.0, bump_scale=60):
    key = (name, tuple(color))
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin(color), 1)
    b.inputs["Roughness"].default_value = rough
    if sss: b.inputs["Subsurface Weight"].default_value = sss; b.inputs["Subsurface Radius"].default_value = (0.4, 0.2, 0.15); b.inputs["Subsurface Scale"].default_value = 0.05
    if sheen: b.inputs["Sheen Weight"].default_value = sheen; b.inputs["Sheen Roughness"].default_value = 0.4
    b.inputs["Specular IOR Level"].default_value = spec
    if coat: b.inputs["Coat Weight"].default_value = coat
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 2.0
    if bump:
        n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = bump_scale; n.inputs["Detail"].default_value = 6
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.02
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    MATS[key] = m
    return m

def hair_mat(name, color, tip=None, stripes=None):
    """Principled hair coloured by direct colour; optional object-space stripes (tiger, squirrel)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    h = nt.nodes.new("ShaderNodeBsdfHairPrincipled")
    h.parametrization = "COLOR"
    h.inputs["Roughness"].default_value = 0.42
    h.inputs["Radial Roughness"].default_value = 0.6
    h.inputs["Coat"].default_value = 0.15
    col = (*lin(color), 1)
    if stripes or tip:
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
        mix.inputs["A"].default_value = col
        if stripes:
            tc = nt.nodes.new("ShaderNodeTexCoord")
            wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = stripes.get("dir", "X")
            wv.inputs["Scale"].default_value = stripes.get("scale", 3.5); wv.inputs["Distortion"].default_value = stripes.get("dist", 6)
            wv.inputs["Detail"].default_value = 2
            ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = stripes.get("lo", 0.72); ramp.color_ramp.elements[1].position = stripes.get("hi", 0.8)
            ramp.color_ramp.elements[0].color = (0, 0, 0, 1); ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
            nt.links.new(tc.outputs["Object"], wv.inputs["Vector"]); nt.links.new(wv.outputs["Fac"], ramp.inputs["Fac"])
            nt.links.new(ramp.outputs["Color"], mix.inputs["Factor"])
            mix.inputs["B"].default_value = (*lin(stripes["color"]), 1)
        else:
            hi = nt.nodes.new("ShaderNodeHairInfo")
            nt.links.new(hi.outputs["Intercept"], mix.inputs["Factor"])
            mix.inputs["B"].default_value = (*lin(tip), 1)
        nt.links.new(mix.outputs["Result"], h.inputs["Color"])
    else:
        h.inputs["Color"].default_value = col
    nt.links.new(h.outputs["BSDF"], out.inputs["Surface"])
    return m

def stripe_skin(name, color, stripes):
    """Matching surface material under the fur so stripes read through."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.8
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = stripes.get("dir", "X")
    wv.inputs["Scale"].default_value = stripes.get("scale", 3.5); wv.inputs["Distortion"].default_value = stripes.get("dist", 6); wv.inputs["Detail"].default_value = 2
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = stripes.get("lo", 0.72); ramp.color_ramp.elements[1].position = stripes.get("hi", 0.8)
    ramp.color_ramp.elements[0].color = (*lin(color), 1); ramp.color_ramp.elements[1].color = (*lin(stripes["color"]), 1)
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"]); nt.links.new(wv.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    return m

# ---------------------------------------------------------------- modelling helpers
def pivot(name, loc, parent=None, rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(o)
    o.location = loc; o.rotation_euler = Euler([math.radians(a) for a in rot])
    if parent: o.parent = parent
    return o

def _sel(objs):
    for ob in bpy.context.selected_objects: ob.select_set(False)
    for ob in objs: ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def _ellipsoid(c, s, r):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=1, location=c, rotation=[math.radians(a) for a in r])
    o = bpy.context.object; o.scale = s; return o

def _capsule(a, b, r1, r2=None):
    r2 = r2 if r2 is not None else r1
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    out = [_ellipsoid(a, (r1, r1, r1), (0, 0, 0)), _ellipsoid(b, (r2, r2, r2), (0, 0, 0))]
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=r1, radius2=r2, depth=L, location=(a + b) / 2)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); out.append(o)
    return out

def part(name, shapes, material, parent=None, voxel=0.014, smooth=6, flat=False):
    """Sculpt-like part: union of ellipsoids/capsules fused by voxel remesh, then smoothed.
       shapes: ("e", center, (sx,sy,sz), rot_deg) | ("c", a, b, r1, r2)  — in parent space."""
    objs = []
    for sh in shapes:
        if sh[0] == "e": objs.append(_ellipsoid(sh[1], sh[2], sh[3] if len(sh) > 3 else (0, 0, 0)))
        else: objs += _capsule(sh[1], sh[2], sh[3], sh[4] if len(sh) > 4 else None)
    _sel(objs); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY"); loc = o.location.copy()
    if not flat:
        m = o.modifiers.new("vox", "REMESH"); m.mode = "VOXEL"; m.voxel_size = voxel; m.use_smooth_shade = True
        bpy.ops.object.modifier_apply(modifier="vox")
        sm = o.modifiers.new("sm", "SMOOTH"); sm.factor = 0.8; sm.iterations = smooth
        bpy.ops.object.modifier_apply(modifier="sm")
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    if parent:
        o.parent = parent; o.location = loc
    return o

def fur(o, hmat, length=0.025, count=4000, children=40, clump=0.35, rough=0.002, align=(-0.004, 0, -0.006), radius=0.0028):
    o.data.materials.append(hmat)
    o.modifiers.new("fur", "PARTICLE_SYSTEM")
    s = o.particle_systems[-1].settings
    s.type = "HAIR"; s.count = 250 if TEST else max(300, int(count * 0.3)); s.hair_length = length
    s.use_advanced_hair = True; s.normal_factor = length; s.object_align_factor = align
    s.material = len(o.data.materials)
    s.child_type = "INTERPOLATED"; s.rendered_child_count = 10 if TEST else 14; s.child_percent = 3
    s.clump_factor = clump; s.clump_shape = 0.3; s.roughness_1 = rough; s.roughness_endpoint = rough * 2; s.child_length = 1.0
    s.root_radius = 1.0; s.tip_radius = 0.1; s.radius_scale = radius
    s.display_step = 3; s.render_step = 3; s.use_hair_bspline = True
    return o

def on_surface(center, radii, az, el, k=1.0):
    d = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)), math.cos(math.radians(el)) * math.sin(math.radians(az)), math.sin(math.radians(el))))
    p = Vector(center) + Vector((d.x * radii[0], d.y * radii[1], d.z * radii[2])) * k
    n = Vector((d.x / radii[0], d.y / radii[1], d.z / radii[2])).normalized()
    return p, n

# ---------------------------------------------------------------- the runners
SPECS = {
 "mithra": dict(species="hare", fur=(0.95, 0.93, 0.90), fur2=(0.80, 0.75, 0.70), belly=(1.0, 1.0, 0.98), inner=(1.0, 0.56, 0.66),
                iris=(0.10, 0.42, 0.95), top=(0.04, 0.68, 0.62), acc=(1.0, 0.34, 0.02), shoe=(1.0, 0.22, 0.36), sole=(0.98, 0.98, 0.98), nose=(1.0, 0.45, 0.55)),
 "chiku":  dict(species="squirrel", fur=(0.62, 0.44, 0.30), fur2=(0.42, 0.29, 0.19), belly=(0.98, 0.88, 0.74), inner=(0.92, 0.62, 0.55),
                iris=(0.35, 0.20, 0.10), top=(0.92, 0.16, 0.24), acc=(1.0, 0.80, 0.12), shoe=(0.18, 0.44, 0.98), sole=(0.98, 0.98, 0.98), nose=(0.25, 0.12, 0.10)),
 "raja":   dict(species="tiger", fur=(1.0, 0.50, 0.08), fur2=(0.85, 0.36, 0.04), belly=(1.0, 0.97, 0.90), inner=(1.0, 0.70, 0.64),
                iris=(0.30, 0.78, 0.32), top=(0.16, 0.20, 0.62), acc=(1.0, 0.80, 0.12), shoe=(0.97, 0.97, 0.97), sole=(0.18, 0.18, 0.28), nose=(0.95, 0.42, 0.50)),
 "gaja":   dict(species="elephant", fur=(0.60, 0.64, 0.74), fur2=(0.48, 0.52, 0.62), belly=(0.70, 0.74, 0.82), inner=(0.96, 0.62, 0.72),
                iris=(0.28, 0.20, 0.40), top=(0.80, 0.07, 0.36), acc=(1.0, 0.76, 0.16), shoe=(1.0, 0.76, 0.16), sole=(0.62, 0.36, 0.10), nose=(0.5, 0.5, 0.6)),
 "neela":  dict(species="peacock", fur=(0.10, 0.36, 0.90), fur2=(0.06, 0.24, 0.66), belly=(0.32, 0.64, 1.0), inner=(1.0, 0.80, 0.20),
                iris=(0.12, 0.08, 0.14), top=(0.10, 0.72, 0.60), acc=(1.0, 0.80, 0.12), shoe=(1.0, 0.62, 0.10), sole=(0.92, 0.48, 0.10), nose=(1.0, 0.7, 0.2)),
}
class Rig: pass

def build(rid):
    S = SPECS[rid]; sp = S["species"]; R = Rig(); R.sp = sp
    furry = sp != "elephant"
    stripes = dict(color=(0.07, 0.04, 0.03), dir="X", scale=4.5, dist=7, lo=0.74, hi=0.79) if sp == "tiger" else None
    skin = stripe_skin("skin", S["fur"], stripes) if stripes else mat("skin", S["fur"], rough=0.7 if sp != "elephant" else 0.55,
            sss=0.25 if sp == "elephant" else 0.05, bump=0.3 if sp == "elephant" else 0, bump_scale=70)
    skin2 = mat("skin2", S["fur2"], rough=0.8)
    belly = mat("belly", S["belly"], rough=0.8, sss=0.1 if sp == "elephant" else 0)
    hfur = hair_mat("hfur", S["fur"], stripes=stripes)
    hbelly = hair_mat("hbelly", S["belly"])
    cloth = mat("cloth", S["top"], rough=0.85, sheen=0.8, bump=0.12, bump_scale=400)
    acc = mat("acc", S["acc"], rough=0.8, sheen=0.8, bump=0.12, bump_scale=350)
    shoe = mat("shoe", S["shoe"], rough=0.35, spec=0.6, coat=0.5)
    sole = mat("sole", S["sole"], rough=0.5)
    inner = mat("inner", S["inner"], rough=0.6, sss=0.4)
    nose = mat("nose", S["nose"], rough=0.2, spec=0.8, coat=0.8)
    white = mat("eyewhite", (0.97, 0.97, 0.98), rough=0.1, coat=1.0)
    iris = mat("iris", S["iris"], rough=0.15, coat=1.0)
    pupil = mat("pupil", (0.01, 0.01, 0.02), rough=0.05, coat=1.0)
    glint = mat("glint", (1, 1, 1), emit=(1, 1, 1))
    dark = mat("dark", (0.08, 0.05, 0.06), rough=0.4)

    R.root = pivot("root", (0, 0, 0))
    R.hips = pivot("hips", (0, 0, 0.50), R.root)
    R.torso = pivot("torso", (0, 0, 0), R.hips)
    # body: pear-shaped torso in a hoodie, belly patch
    part("body", [("e", (0, 0, 0.26), (0.31, 0.29, 0.36)), ("e", (0.02, 0, 0.12), (0.30, 0.28, 0.24))], cloth, R.torso)
    part("hood", [("e", (-0.17, 0, 0.53), (0.15, 0.24, 0.10), (0, -20, 0))], cloth, R.torso)
    part("pocket", [("e", (0.25, 0, 0.12), (0.06, 0.17, 0.08))], mat("pocket", tuple(min(1, c * 0.82) for c in S["top"]), rough=0.9, sheen=0.6), R.torso)
    part("zip", [("c", (0.30, 0, 0.30), (0.27, 0, 0.53), 0.012)], acc, R.torso)
    # scarf ring + flowing ends
    part("scarf", [("e", (0.03 + math.cos(a) * 0.19, math.sin(a) * 0.20, 0.58 + math.cos(a) * 0.02), (0.09, 0.09, 0.075)) for a in [i * math.pi / 8 for i in range(16)]], acc, R.torso)
    R.scarf_tail = pivot("scarftail", (-0.17, -0.02, 0.56), R.torso)
    part("scarfend", [("e", (-0.15, 0, -0.03), (0.17, 0.04, 0.075), (0, 12, 0)), ("e", (-0.33, 0, -0.08), (0.12, 0.035, 0.07), (0, 25, 0)), ("e", (-0.42, 0, -0.13), (0.05, 0.03, 0.05))], acc, R.scarf_tail)

    # head
    R.head = pivot("head", (0.05, 0, 0.60), R.torso)
    HC = (0.0, 0.0, 0.40); HR = (0.42, 0.40, 0.38) if sp != "elephant" else (0.44, 0.42, 0.40)
    hshapes = [("e", HC, HR), ("e", (0.05, 0, 0.18), (0.30, 0.30, 0.18))]
    if sp in ("hare", "squirrel", "tiger"):
        hshapes += [("e", (0.30, -0.12, 0.27), (0.14, 0.15, 0.12)), ("e", (0.30, 0.12, 0.27), (0.14, 0.15, 0.12))]  # cheeks
    if sp == "tiger": hshapes += [("e", (0.0, -0.36, 0.30), (0.12, 0.10, 0.10)), ("e", (0.0, 0.36, 0.30), (0.12, 0.10, 0.10))]  # ruff
    head = part("headmesh", hshapes, skin, R.head)
    if furry and sp != "peacock": fur(head, hfur, length=0.024, count=6000)
    if sp == "peacock": fur(head, hfur, length=0.018, count=6000, clump=0.6)
    if sp in ("hare", "squirrel", "tiger"):
        mz = part("muzzle", [("e", (0.36, -0.07, 0.27), (0.10, 0.10, 0.08)), ("e", (0.36, 0.07, 0.27), (0.10, 0.10, 0.08)), ("e", (0.33, 0, 0.21), (0.08, 0.08, 0.06))], belly, R.head)
        fur(mz, hbelly, length=0.014, count=1500)
        part("nose", [("e", (0.45, 0, 0.32), (0.035, 0.055, 0.035))], nose, R.head)
        part("mouth", [("c", (0.425, -0.065, 0.245), (0.455, 0.0, 0.205), 0.010), ("c", (0.455, 0.0, 0.205), (0.425, 0.065, 0.245), 0.010)], dark, R.head, voxel=0.006)
        if sp in ("hare", "squirrel"): part("teeth", [("e", (0.43, -0.018, 0.19), (0.012, 0.016, 0.025)), ("e", (0.43, 0.018, 0.19), (0.012, 0.016, 0.025))], white, R.head, flat=True)
        whisk = mat("whisk", (0.95, 0.95, 0.95), rough=0.3)
        for y in (-1, 1):
            for k in range(3):
                part("wh", [("c", (0.40, y * 0.09, 0.27 - k * 0.025), (0.50, y * (0.26 + k * 0.02), 0.30 - k * 0.05), 0.004)], whisk, R.head, flat=True)
    if sp == "elephant":
        R.trunk = pivot("trunk", (0.36, 0, 0.28), R.head)
        part("trunkmesh", [("c", (0, 0, 0.04), (0.12, 0, -0.10), 0.11, 0.09), ("c", (0.12, 0, -0.10), (0.18, 0, -0.28), 0.09, 0.07), ("c", (0.18, 0, -0.28), (0.26, 0, -0.38), 0.07, 0.065)], skin, R.trunk)
        part("cap", [("e", (0.36, 0, 0.58), (0.06, 0.17, 0.13), (0, -32, 0))], cloth, R.head)
        part("capgold", [("c", (0.40, -0.13, 0.48), (0.40, 0.13, 0.48), 0.02)], acc, R.head)
        for i, (y, z) in enumerate([(0, 0.0), (-0.1, -0.07), (0.1, -0.07)]):
            part("gem", [("e", (0.42, y * 0.8, 0.60 + z), (0.03, 0.03, 0.03))], acc, R.head)
        for side, y in (("L", -1), ("R", 1)):
            ep = pivot("ear" + side, (-0.08, y * 0.34, 0.42), R.head); setattr(R, "ear" + side, ep)
            part("earmesh", [("e", (-0.06, y * 0.06, 0.0), (0.24, 0.05, 0.30), (y * 10, 0, 0))], skin, ep)
            part("earin", [("e", (-0.05, y * 0.025, 0.0), (0.18, 0.03, 0.23), (y * 10, 0, 0))], inner, ep)
        ivory = mat("ivory", (0.98, 0.95, 0.86), rough=0.3, coat=0.4)
        for y in (-1, 1): part("tusk", [("c", (0.34, y * 0.13, 0.16), (0.44, y * 0.15, 0.10), 0.03, 0.018)], ivory, R.head)
    if sp == "peacock":
        part("beak", [("e", (0.43, 0, 0.30), (0.12, 0.07, 0.06), (0, 10, 0)), ("e", (0.40, 0, 0.25), (0.09, 0.06, 0.04))], mat("beak", (1.0, 0.66, 0.12), rough=0.3, coat=0.6), R.head)
        part("facepatch", [("e", (0.24, -0.25, 0.43), (0.10, 0.05, 0.13)), ("e", (0.24, 0.25, 0.43), (0.10, 0.05, 0.13))], mat("facew", (0.97, 0.97, 1.0)), R.head)
        for i in range(3):
            cp = pivot("crest%d" % i, (-0.06 + i * 0.08, 0, 0.74), R.head, (0, -25 + i * 22, 0))
            part("cstem", [("c", (0, 0, 0), (0, 0, 0.2), 0.012)], mat("stem", (0.1, 0.3, 0.7)), cp, flat=True)
            part("ctip", [("e", (0, 0, 0.23), (0.035, 0.035, 0.05))], mat("ctip", (0.08, 0.78, 0.62), rough=0.3, coat=0.6), cp)
    # cheek blush
    for y in (-1, 1):
        p, n = on_surface(HC, HR, y * 52, -12, 0.985)
        part("blush", [("e", tuple(p), (0.06, 0.06, 0.035), (0, 0, y * 52))], mat("blush", (1.0, 0.52, 0.60), rough=0.7), R.head, flat=True)
    # eyes: big, glossy, catchlights, eyelids for blinking
    R.lids = []
    for side, y in (("L", -1), ("R", 1)):
        p, n = on_surface(HC, HR, y * 27, 8, 0.97)
        ep = pivot("eye" + side, tuple(p), R.head); ep.rotation_euler = n.to_track_quat("X", "Z").to_euler()
        part("ew", [("e", (0, 0, 0), (0.07, 0.115, 0.145))], white, ep)
        part("ir", [("e", (0.045, 0.005, -0.005), (0.035, 0.085, 0.10))], iris, ep)
        part("pu", [("e", (0.066, 0.006, 0.0), (0.02, 0.05, 0.06))], pupil, ep)
        part("gl", [("e", (0.078, -0.03, 0.045), (0.012, 0.024, 0.026))], glint, ep, flat=True)
        part("gm", [("e", (0.078, 0.03, -0.035), (0.01, 0.012, 0.012))], glint, ep, flat=True)
        lid = part("lid", [("e", (0, 0, 0), (0.078, 0.122, 0.152))], skin, ep)
        lid.location = (0.0, 0.0, 0.0); R.lids.append(lid)
    # ears
    if sp == "hare":
        for side, y, rz in (("L", -1, -8), ("R", 1, 12)):
            ep = pivot("ear" + side, (-0.06, y * 0.14, 0.68), R.head, (y * 24, -14, rz)); setattr(R, "ear" + side, ep)
            e = part("earmesh", [("e", (0, 0, 0.30), (0.10, 0.06, 0.34)), ("e", (0, 0, 0.08), (0.08, 0.06, 0.12))], skin, ep)
            fur(e, hfur, length=0.016, count=2000)
            part("earin", [("e", (0.045, 0, 0.30), (0.05, 0.03, 0.27))], inner, ep)
    if sp in ("squirrel", "tiger"):
        for side, y in (("L", -1), ("R", 1)):
            ep = pivot("ear" + side, (-0.06, y * 0.22, 0.68), R.head, (y * 22, -8, 0)); setattr(R, "ear" + side, ep)
            e = part("earmesh", [("e", (0, 0, 0.06), (0.06, 0.12, 0.14 if sp == "squirrel" else 0.11))], skin, ep)
            fur(e, hfur, length=0.016, count=900)
            part("earin", [("e", (0.035, 0, 0.05), (0.03, 0.08, 0.09))], inner if sp == "squirrel" else dark, ep)
            if sp == "squirrel": part("tuft", [("c", (0, 0, 0.16), (-0.03, 0, 0.26), 0.03, 0.008)], skin2, ep)
            if sp == "tiger": part("spot", [("e", (-0.04, 0, 0.06), (0.02, 0.06, 0.05))], mat("wspot", (1, 1, 1)), ep)

    # arms
    R.arms = []
    handmat = skin if sp != "peacock" else mat("wing", S["fur2"], rough=0.5, sheen=0.5)
    for side, y in (("L", -1), ("R", 1)):
        sh = pivot("shoulder" + side, (0.02, y * 0.27, 0.43), R.torso)
        part("sleeve", [("c", (0, 0, 0), (0, y * 0.02, -0.20), 0.085, 0.075)], cloth, sh)
        part("cuff", [("e", (0, y * 0.02, -0.21), (0.08, 0.08, 0.035))], acc, sh)
        el = pivot("elbow" + side, (0, y * 0.02, -0.21), sh)
        fa = part("fore", [("c", (0, 0, 0), (0, 0, -0.12), 0.065, 0.06), ("e", (0.015, 0, -0.17), (0.085, 0.075, 0.08))], handmat, el)
        if sp in ("hare", "squirrel", "tiger"): fur(fa, hfur, length=0.016, count=900)
        R.arms.append((sh, el))
    # legs
    R.legs = []
    legmat = skin if sp != "peacock" else mat("legp", (1.0, 0.62, 0.18), rough=0.5)
    shorts = mat("shorts", tuple(c * 0.55 for c in S["top"]), rough=0.9, sheen=0.5)
    for side, y in (("L", -1), ("R", 1)):
        hp = pivot("hip" + side, (0.0, y * 0.14, 0.04), R.hips)
        part("thigh", [("c", (0, 0, 0), (0, 0, -0.20), 0.115, 0.09)], shorts, hp)
        kn = pivot("knee" + side, (0, 0, -0.21), hp)
        sh_ = part("shin", [("c", (0, 0, 0.02), (0, 0, -0.17), 0.08, 0.07)], legmat, kn)
        if sp in ("hare", "squirrel", "tiger"): fur(sh_, hfur, length=0.016, count=800)
        part("sock", [("e", (0, 0, -0.16), (0.075, 0.075, 0.04))], mat("sock", (0.98, 0.98, 0.98), rough=0.9, sheen=0.5), kn)
        an = pivot("ankle" + side, (0, 0, -0.20), kn)
        part("shoe", [("e", (0.07, 0, -0.03), (0.17, 0.095, 0.085)), ("e", (0.14, 0, -0.045), (0.10, 0.09, 0.07)), ("e", (-0.02, 0, 0.0), (0.08, 0.085, 0.08))], shoe, an)
        part("sole", [("e", (0.07, 0, -0.10), (0.19, 0.10, 0.03))], sole, an)
        part("swoosh", [("e", (0.08, y * 0.09, -0.04), (0.08, 0.008, 0.025), (0, -10, 0))], sole, an, flat=True)
        R.legs.append((hp, kn, an))
    # tails
    R.tail = pivot("tail", (-0.28, 0, 0.14), R.hips)
    if sp == "hare":
        t = part("tailmesh", [("e", (-0.04, 0, 0.04), (0.11, 0.11, 0.11))], belly, R.tail); fur(t, hbelly, length=0.05, count=1500, rough=0.01, clump=0.2)
    elif sp == "squirrel":
        t = part("tailmesh", [("c", (0, 0, 0), (-0.22, 0, 0.22), 0.10, 0.13), ("c", (-0.22, 0, 0.22), (-0.20, 0, 0.55), 0.13, 0.15), ("c", (-0.20, 0, 0.55), (0.02, 0, 0.74), 0.15, 0.12), ("e", (0.08, 0, 0.70), (0.09, 0.09, 0.09))], skin, R.tail)
        fur(t, hair_mat("htail", S["fur"], tip=(0.97, 0.90, 0.78)), length=0.09, count=5000, rough=0.02, clump=0.5, align=(-0.01, 0, 0.01))
    elif sp == "tiger":
        t = part("tailmesh", [("c", (0, 0, 0), (-0.28, 0, 0.02), 0.055, 0.05), ("c", (-0.28, 0, 0.02), (-0.44, 0, 0.20), 0.05, 0.05), ("e", (-0.46, 0, 0.26), (0.055, 0.055, 0.06))], skin, R.tail)
        fur(t, hfur, length=0.016, count=900)
    elif sp == "elephant":
        part("tailmesh", [("c", (0, 0, 0), (-0.06, 0, -0.16), 0.022), ("e", (-0.07, 0, -0.19), (0.035, 0.035, 0.05))], skin2, R.tail)
    elif sp == "peacock":
        feather = mat("feather", (0.06, 0.60, 0.40), rough=0.3, coat=0.7, sheen=0.6)
        fe1, fe2 = mat("fe1", (0.98, 0.78, 0.10), rough=0.3), mat("fe2", (0.08, 0.28, 0.92), rough=0.2, coat=0.8)
        for i in range(9):
            fp = pivot("fth%d" % i, (0, 0, 0.06), R.tail, (-60 + i * 15, -40 - abs(i - 4) * 5, 0))
            part("fb", [("c", (0, 0, 0), (-0.62, 0, 0), 0.03, 0.11), ("e", (-0.66, 0, 0), (0.14, 0.11, 0.025))], feather, fp)
            part("fe", [("e", (-0.64, 0, 0.022), (0.065, 0.055, 0.012))], fe1, fp, flat=True)
            part("fp", [("e", (-0.645, 0, 0.032), (0.035, 0.03, 0.012))], fe2, fp, flat=True)
    return R

# ---------------------------------------------------------------- posing
def rot(o, x=0, y=0, z=0): o.rotation_euler = Euler((math.radians(x), math.radians(y), math.radians(z)))

def pose(R, kind, t=0.0):
    """kind: run (t=0..1), jumpup, jumpdown, slide, idle (t), win, stun"""
    s = math.sin(t * 2 * math.pi)
    root_z, lean, head, hipz = 0.0, 0.0, 0.0, 0.50
    legs = [(0, 0), (0, 0)]; arms = [(0, 0, 0), (0, 0, 0)]; ears = (0, 0); tail = 0; blink = 0.0; scarf = -10
    if kind == "run":
        root_z = abs(math.sin(t * 2 * math.pi)) * 0.07; lean = 20; head = -8 + s * 2
        for i, ph in enumerate((0, math.pi)):
            a = math.sin(t * 2 * math.pi + ph); k = max(0.0, -math.cos(t * 2 * math.pi + ph))
            legs[i] = (a * 62, 25 + k * 95)
            arms[i] = (-a * 75, -80, 0)
        ears = (-22 - s * 6, -22 + s * 6); tail = s * 14; scarf = -35 + s * 12
    elif kind == "jumpup":
        lean = 6; head = -12; legs = [(55, 95), (-25, 40)]; arms = [(-140, -40, 0), (-110, -50, 0)]; ears = (-45, -40); tail = 20; scarf = -55
    elif kind == "jumpdown":
        lean = 4; head = 6; legs = [(25, 50), (-10, 35)]; arms = [(-80, -30, 0), (-60, -30, 0)]; ears = (15, 20); tail = -10; scarf = 15
    elif kind == "slide":
        root_z = -0.16; lean = -60; head = 38; legs = [(80, 10), (65, 35)]; arms = [(-30, -20, 0), (-50, -30, 0)]; ears = (-60, -60); tail = 30; scarf = -70
    elif kind == "idle":
        root_z = s * 0.006; head = s * 2; legs = [(3, 6), (-3, 6)]; arms = [(6, -18, 0), (-6, -18, 0)]; ears = (s * 4, -s * 4); tail = s * 8; scarf = 0
        blink = 1.0 if t > 0.85 else 0.0
    elif kind == "win":
        root_z = 0.10; lean = -8; head = -14; legs = [(30, 50), (-5, 15)]; arms = [(-170, -15, 0), (-160, -20, 0)]; ears = (-10, 12); tail = 22; scarf = -25
    elif kind == "stun":
        lean = -10; head = 20; legs = [(-10, 15), (10, 30)]; arms = [(30, -25, 0), (40, -35, 0)]; ears = (40, 60); tail = -12; blink = 0.6
    R.root.location.z = root_z
    R.hips.location.z = hipz
    rot(R.hips, 0, lean, 0)
    rot(R.head, 0, head, 0)
    for (hp, kn, an), (h, k) in zip(R.legs, legs):
        rot(hp, 0, -h - lean * 0.6, 0); rot(kn, 0, k, 0); rot(an, 0, -k * 0.6 + h * 0.5 + lean * 0.5, 0)
    for (sh, el), (a, e, _) in zip(R.arms, arms):
        rot(sh, (-8 if sh.location.y < 0 else 8), a, 0); rot(el, 0, e, 0)
    for side, v in zip(("earL", "earR"), ears):
        e = getattr(R, side, None)
        if e is not None:
            if "base" not in e.keys(): e["base"] = list(e.rotation_euler)
            b = e["base"]; e.rotation_euler = Euler((b[0], b[1] + math.radians(v), b[2]))
    rot(R.tail, 0, tail, 0)
    rot(R.scarf_tail, 0, scarf, 0)
    for lid in R.lids:
        # lid hides inside the eyeball when open, slides down over it when blinking
        if blink: lid.scale = (1, 1, blink); lid.location = (0.006, 0, 0.145 * (1 - blink))
        else: lid.scale = (0.5, 0.5, 0.02); lid.location = (-0.03, 0, 0)

FRAMES = [("idle", 0.0), ("idle", 0.25), ("idle", 0.5), ("idle", 0.9),
          ("run", 0.0), ("run", 0.125), ("run", 0.25), ("run", 0.375), ("run", 0.5), ("run", 0.625), ("run", 0.75), ("run", 0.875),
          ("jumpup", 0), ("jumpdown", 0), ("slide", 0), ("win", 0), ("stun", 0)]

def render_runner(rid, frames=FRAMES):
    from bpy_extras.object_utils import world_to_camera_view
    sc = reset(); R = build(rid)
    os.makedirs(os.path.join(OUT, "_f"), exist_ok=True)
    paths = []
    for i, (k, t) in enumerate(frames):
        pose(R, k, t)
        bpy.context.view_layer.update()
        p = os.path.join(OUT, "_f", "%s_%02d.png" % (rid, i)); sc.render.filepath = p
        bpy.ops.render.render(write_still=True); paths.append(p)
        print("rendered", rid, i, k, t, flush=True)
    foot = world_to_camera_view(sc, sc.camera, Vector((0, 0, 0)))
    return paths, (foot.x * FW, (1 - foot.y) * FH)

def assemble(rid, paths, anchor):
    """Join frames into one horizontal sprite sheet and record its layout."""
    img = bpy.data.images
    frames = [img.load(p) for p in paths]
    w, h = FW, FH
    sheet = img.new(rid + "_sheet", w * len(frames), h, alpha=True)
    px = [0.0] * (w * len(frames) * h * 4)
    for i, f in enumerate(frames):
        fp = list(f.pixels)
        for y in range(h):
            row = fp[y * w * 4:(y + 1) * w * 4]
            o = (y * w * len(frames) + i * w) * 4
            px[o:o + w * 4] = row
    sheet.pixels = px
    sheet.filepath_raw = os.path.join(OUT, rid + ".png"); sheet.file_format = "PNG"; sheet.save()
    meta_p = os.path.join(OUT, "sheet.json")
    meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
    meta[rid] = {"fw": w, "fh": h, "ax": round(anchor[0], 1), "ay": round(anchor[1], 1), "ppu": FH / ORTHO,
                 "frames": [k for k, t in FRAMES]}
    json.dump(meta, open(meta_p, "w"), indent=1)

if __name__ == "__main__":
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or list(SPECS)
    only = None
    for a in sys.argv:
        if a.startswith("--frames="): only = [FRAMES[int(x)] for x in a.split("=")[1].split(",")]
    for rid in ids:
        paths, anchor = render_runner(rid, only or FRAMES)
        if not only: assemble(rid, paths, anchor)
