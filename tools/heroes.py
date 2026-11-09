"""Bangara (golden rabbit) and Gundamma (panda) — original characters for MAATHU.
Organic metaball meshes + vertex-colour fur patterns, bone-parented rigid parts,
named actions exported to GLB, plus Cycles key-art renders.

python3 heroes.py <outdir> [glb|art|preview|all]
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Euler, Matrix, Quaternion

OUT = sys.argv[1]; MODE = sys.argv[2] if len(sys.argv) > 2 else "all"
os.makedirs(OUT, exist_ok=True)
R = math.radians
FPS = 30

def hexc(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def lin(c):  # sRGB -> linear for vertex colour storage
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
def mix(a, b, t):
    t = max(0.0, min(1.0, t)); return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))
def sstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.fps = FPS
    return sc

MATS = {}
def vcol_mat(name, rough=0.6, metal=0.0, sheen=0.0, emit=0.0, alpha=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
    nt.links.new(vc.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
    if emit:
        nt.links.new(vc.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    MATS[name] = m
    return m

def paint(me, fn):
    """fn(co: Vector, normal: Vector) -> sRGB tuple; stored as point colour 'Col'."""
    if "Col" in me.color_attributes: me.color_attributes.remove(me.color_attributes["Col"])
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        c = lin(fn(v.co, v.normal)); ca.data[v.index].color = (*c, 1.0)
    me.color_attributes.active_color = ca

def finish(o, mat, smooth=True):
    me = o.data
    if smooth:
        for p in me.polygons: p.use_smooth = True
    me.materials.clear(); me.materials.append(mat)
    return o

def link(o):
    bpy.context.scene.collection.objects.link(o); return o

def meta(name, elems, res=0.022, thresh=0.1):
    """elems: list of dicts {t:'BALL'|'ELLIPSOID'|'CAPSULE', co, r, s:(x,y,z), rot:(deg xyz), neg, stiff}"""
    mb = bpy.data.metaballs.new(name + "_mb"); mb.resolution = res; mb.render_resolution = res; mb.threshold = thresh
    ob = link(bpy.data.objects.new(name + "_MB", mb))
    for e in elems:
        el = mb.elements.new(type=e.get("t", "BALL"))
        el.co = e["co"]; el.radius = e.get("r", 0.1) * 1.12; el.stiffness = e.get("stiff", 2.0)
        if "s" in e: el.size_x, el.size_y, el.size_z = e["s"]
        if "rot" in e: el.rotation = Euler([R(a) for a in e["rot"]]).to_quaternion()
        el.use_negative = e.get("neg", False)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me.name = name
    bpy.data.objects.remove(ob); bpy.data.metaballs.remove(mb)
    o = link(bpy.data.objects.new(name, me))
    return o

def prim(kind, name, **kw):
    fn = {"sphere": bpy.ops.mesh.primitive_uv_sphere_add, "torus": bpy.ops.mesh.primitive_torus_add,
          "cyl": bpy.ops.mesh.primitive_cylinder_add, "cone": bpy.ops.mesh.primitive_cone_add,
          "cube": bpy.ops.mesh.primitive_cube_add}[kind]
    loc = kw.pop("loc", (0, 0, 0)); rot = kw.pop("rot", (0, 0, 0)); scl = kw.pop("scl", (1, 1, 1))
    fn(**kw); o = bpy.context.object; o.name = name
    o.location = loc; o.rotation_euler = Euler([R(a) for a in rot]); o.scale = scl
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # bake location into mesh too so parts have origin at world 0 (easy bone parenting)
    o.data.transform(Matrix.Translation(o.location)); o.location = (0, 0, 0)
    return o

def eye(prefix, c, r, iris_hex, iris2_hex, look=(0, -1, 0), scale=(1, 1, 1.15)):
    """Glossy cartoon eye centred at c, facing -Y. Returns list of objects."""
    cx, cy, cz = c; sx, sy, sz = scale
    parts = []
    w = prim("sphere", prefix + "_white", segments=32, ring_count=16, radius=r, loc=c, scl=(sx, sy * 0.75, sz))
    paint(w.data, lambda co, n: hexc("#FBFAF7")); finish(w, vcol_mat("eye_white", 0.15)); parts.append(w)
    ir = r * 0.78
    i = prim("sphere", prefix + "_iris", segments=32, ring_count=16, radius=ir, loc=(cx, cy - r * 0.52, cz - r * 0.02), scl=(sx, 0.32, sz))
    a, b2 = hexc(iris_hex), hexc(iris2_hex)
    def irisfn(co, n):
        d = math.hypot((co.x - cx) / sx, (co.z - (cz - r * 0.02)) / sz) / ir
        col = mix(b2, a, sstep(0.25, 0.85, d))
        if d > 0.9: col = mix(col, (0.12, 0.06, 0.02), sstep(0.9, 1.0, d))
        return col
    paint(i.data, irisfn); finish(i, vcol_mat("eye_iris", 0.08)); parts.append(i)
    p = prim("sphere", prefix + "_pupil", segments=24, ring_count=12, radius=ir * 0.48, loc=(cx, cy - r * 0.66, cz - r * 0.02), scl=(sx, 0.25, sz * 1.05))
    paint(p.data, lambda co, n: hexc("#140C08")); finish(p, vcol_mat("eye_pupil", 0.05)); parts.append(p)
    for k, (dx, dz, rr) in enumerate(((0.32, 0.36, 0.26), (-0.3, -0.34, 0.12))):
        h = prim("sphere", f"{prefix}_glint{k}", segments=16, ring_count=8, radius=r * rr,
                 loc=(cx + dx * r * sx, cy - r * 0.8, cz + dz * r * sz), scl=(1, 0.3, 1))
        paint(h.data, lambda co, n: (1, 1, 1)); finish(h, vcol_mat("eye_glint", 0.0, emit=2.0)); parts.append(h)
    return parts

# ------------------------------------------------------------------ armature helpers
def make_armature(name, bones):
    """bones: list of (name, head, tail, parent)"""
    ad = bpy.data.armatures.new(name + "_rig"); ao = link(bpy.data.objects.new(name, ad))
    bpy.context.view_layer.objects.active = ao; ao.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for bn, h, t, par in bones:
        eb = ad.edit_bones.new(bn); eb.head = h; eb.tail = t; eb.roll = 0
        if par: eb.parent = ad.edit_bones[par]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in ao.pose.bones: pb.rotation_mode = "XYZ"
    return ao

def attach(o, rig, bone):
    mw = o.matrix_world.copy()
    o.parent = rig; o.parent_type = "BONE"; o.parent_bone = bone
    bpy.context.view_layer.update()
    o.matrix_world = mw

# ------------------------------------------------------------------ BUILDERS
GOLD = hexc("#E89A1C"); GOLD_D = hexc("#B8650E"); CREAM = hexc("#FFF0D2"); PINK = hexc("#F2A3A8")
RED = hexc("#D21F2B"); YEL = hexc("#FFCC1F")

def shell(name, elems, zmin, zmax, thick, colfn, mat, res=0.02, grow=1.06, center=(0, 0, 0)):
    """Clothing shell hugging a metaball body: inflate, keep a z-band, solidify."""
    o = meta(name, [dict(e, r=e.get("r", 0.1) * grow) for e in elems], res=res)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < zmin or v.co.z > zmax], context="VERTS")
    bm.to_mesh(o.data); bm.free()
    sol = o.modifiers.new("solid", "SOLIDIFY"); sol.thickness = thick; sol.offset = 1
    paint(o.data, colfn); finish(o, mat)
    return o

def build_bangara():
    fur = vcol_mat("bangara_fur", 0.75, sheen=0.6)
    parts = {}
    def add(bone, o): parts.setdefault(bone, []).append(o)

    BODY = [dict(t="ELLIPSOID", co=(0, 0.0, 0.5), r=0.16, s=(0.95, 0.85, 1.0)),
            dict(t="ELLIPSOID", co=(0, 0.015, 0.35), r=0.18, s=(0.95, 0.9, 0.82))]
    body = meta("B_body", BODY)
    def bodyc(co, n):
        belly = sstep(-0.02, -0.12, co.y) * (1 - sstep(0.56, 0.62, co.z))
        c = mix(GOLD, CREAM, belly)
        return mix(c, GOLD_D, sstep(0.06, 0.16, co.y) * 0.35)
    paint(body.data, bodyc); finish(body, fur); add("spine", body)

    HC = 0.82
    head = meta("B_head", [
        dict(t="ELLIPSOID", co=(0, 0.0, HC), r=0.21, s=(1.0, 0.88, 0.9)),
        dict(t="BALL", co=(0.105, -0.085, HC - 0.07), r=0.09),
        dict(t="BALL", co=(-0.105, -0.085, HC - 0.07), r=0.09),
        dict(t="ELLIPSOID", co=(0, -0.145, HC - 0.065), r=0.07, s=(1.0, 0.8, 0.72)),
        dict(t="ELLIPSOID", co=(0.025, -0.08, HC + 0.18), r=0.055, s=(0.6, 1.0, 0.7), rot=(35, 0, 25)),
        dict(t="ELLIPSOID", co=(-0.03, -0.05, HC + 0.19), r=0.045, s=(0.6, 1.0, 0.7), rot=(25, 0, -30)),
    ], res=0.014)
    def headc(co, n):
        cream = sstep(-0.1, -0.16, co.y) * (1 - sstep(HC, HC + 0.04, co.z))
        cheek = sstep(HC - 0.04, HC - 0.1, co.z) * sstep(-0.02, -0.1, co.y)
        c = mix(GOLD, CREAM, max(cream, cheek))
        c = mix(c, GOLD_D, sstep(0.05, 0.17, co.y) * 0.45)
        for sx in (1, -1):
            d = math.dist((co.x, co.z), (0.13 * sx, HC - 0.07))
            if co.y < -0.06: c = mix(c, hexc("#F27E6B"), (1 - sstep(0.0, 0.05, d)) * 0.5)
        return c
    paint(head.data, headc); finish(head, fur); add("head", head)

    nose = prim("sphere", "B_nose", segments=20, ring_count=10, radius=0.025, loc=(0, -0.212, HC - 0.04), scl=(1.15, 0.7, 0.8))
    paint(nose.data, lambda co, n: hexc("#E4587A")); finish(nose, vcol_mat("nose_soft", 0.3)); add("head", nose)
    for sx in (1, -1):
        m = prim("torus", f"B_mouth{sx}", major_radius=0.019, minor_radius=0.005, major_segments=16, minor_segments=6,
                 loc=(0.018 * sx, -0.205, HC - 0.078), rot=(90, 0, 0))
        bm = bmesh.new(); bm.from_mesh(m.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > HC - 0.074], context="VERTS"); bm.to_mesh(m.data); bm.free()
        paint(m.data, lambda co, n: hexc("#5B2A1E")); finish(m, vcol_mat("mouth", 0.4)); add("head", m)
    for sx, bn in ((1, "eye.L"), (-1, "eye.R")):
        for o in eye(f"B_eye{sx}", (0.082 * sx, -0.14, HC + 0.02), 0.062, "#A9480A", "#FFC12E", scale=(0.92, 1, 1.18)):
            add(bn, o)
    for sx in (1, -1):  # confident brows
        b = meta(f"B_brow{sx}", [dict(t="ELLIPSOID", co=(0.085 * sx, -0.165, HC + 0.115), r=0.032, s=(1.5, 0.5, 0.42), rot=(0, -16 * sx, 0))], res=0.008)
        paint(b.data, lambda co, n: GOLD_D); finish(b, fur); add("head", b)

    def ear(name, segs, bone, cx):
        o = meta(name, [dict(t="ELLIPSOID", co=c, r=r, s=s_) for c, r, s_ in segs], res=0.011)
        top = max(c[2] for c, _, _ in segs)
        def earc(co, n):
            inner = sstep(0.0, -0.016, co.y - segs[0][0][1]) * (1 - sstep(0.014, 0.03, abs(co.x - cx)))
            c = mix(GOLD, PINK, inner)
            return mix(c, GOLD_D, sstep(top + 0.02, top + 0.12, co.z) * 0.85)
        paint(o.data, earc); finish(o, fur); add(bone, o)
    EZ = HC + 0.17
    ear("B_earL", [((0.08, 0.01, EZ + 0.1), 0.052, (0.95, 0.52, 2.2)), ((0.085, 0.01, EZ + 0.26), 0.055, (0.95, 0.52, 1.8))], "ear.L", 0.083)
    ear("B_earR1", [((-0.08, 0.01, EZ + 0.1), 0.052, (0.95, 0.52, 2.2))], "ear.R1", -0.08)
    ear("B_earR2", [((-0.08, 0.01, EZ + 0.26), 0.055, (0.95, 0.52, 1.8))], "ear.R2", -0.08)

    for sx, bn in ((1, "arm.L"), (-1, "arm.R")):
        a = meta(f"B_arm{sx}", [
            dict(t="CAPSULE", co=(0.165 * sx, -0.005, 0.47), r=0.045, s=(0.085, 1, 1), rot=(0, 90 - 12 * sx, 0)),
            dict(t="BALL", co=(0.19 * sx, -0.015, 0.37), r=0.055),
        ], res=0.011)
        paint(a.data, lambda co, n: mix(GOLD, CREAM, sstep(0.4, 0.35, co.z))); finish(a, fur); add(bn, a)
    for sx, bl, bf in ((1, "leg.L", "foot.L"), (-1, "leg.R", "foot.R")):
        l = meta(f"B_leg{sx}", [
            dict(t="ELLIPSOID", co=(0.095 * sx, 0.02, 0.23), r=0.105, s=(0.85, 0.95, 1.0)),
            dict(t="CAPSULE", co=(0.095 * sx, 0.005, 0.12), r=0.048, s=(0.05, 1, 1), rot=(0, 90, 0)),
        ], res=0.012)
        paint(l.data, lambda co, n: GOLD); finish(l, fur); add(bl, l)
        f = meta(f"B_foot{sx}", [dict(t="ELLIPSOID", co=(0.095 * sx, -0.06, 0.045), r=0.07, s=(0.85, 1.85, 0.64))], res=0.011)
        paint(f.data, lambda co, n: mix(GOLD, CREAM, max(sstep(0.04, 0.015, co.z), sstep(-0.13, -0.18, co.y))))
        finish(f, fur); add(bf, f)
    ank = prim("torus", "B_anklet", major_radius=0.054, minor_radius=0.011, major_segments=24, minor_segments=8, loc=(-0.095, 0.005, 0.1))
    paint(ank.data, lambda co, n: hexc("#E2B13C")); finish(ank, vcol_mat("brass", 0.25, metal=1.0)); add("leg.R", ank)
    bell = prim("sphere", "B_bell", segments=16, ring_count=8, radius=0.021, loc=(-0.095, -0.058, 0.09))
    paint(bell.data, lambda co, n: hexc("#F0C24A")); finish(bell, vcol_mat("brass", 0.25, metal=1.0)); add("leg.R", bell)
    t = meta("B_tail", [dict(t="BALL", co=(0, 0.175, 0.33), r=0.065), dict(t="BALL", co=(0.025, 0.2, 0.35), r=0.04),
                        dict(t="BALL", co=(-0.025, 0.195, 0.31), r=0.04)], res=0.01)
    paint(t.data, lambda co, n: CREAM); finish(t, fur); add("spine", t)

    # Karnataka-flag scarf (yellow + red)
    scarf_m = vcol_mat("scarf", 0.85, sheen=0.3)
    wrap = prim("torus", "B_scarf", major_radius=0.1, minor_radius=0.05, major_segments=40, minor_segments=14, loc=(0, 0.0, 0.625), scl=(1, 0.95, 0.85))
    paint(wrap.data, lambda co, n: YEL if math.sin(math.atan2(co.y, co.x) * 6) > 0.7 else RED); finish(wrap, scarf_m); add("chest", wrap)
    knot = prim("sphere", "B_knot", segments=20, ring_count=10, radius=0.045, loc=(0.07, -0.115, 0.615), scl=(1, 0.75, 0.9))
    paint(knot.data, lambda co, n: RED); finish(knot, scarf_m); add("chest", knot)
    for i in range(3):
        y0 = 0.17 + i * 0.12
        seg = prim("cube", f"B_scarfT{i}", size=1, loc=(0.0, y0, 0.61), scl=(0.085 - i * 0.008, 0.125, 0.02))
        bev = seg.modifiers.new("b", "BEVEL"); bev.width = 0.007; bev.segments = 2
        def tailc(co, n, i=i, y0=y0):
            if i == 2 and co.y - y0 > 0.035: return YEL
            return YEL if abs(co.x) > 0.032 - i * 0.004 else RED
        paint(seg.data, tailc); finish(seg, scarf_m, smooth=False); add(f"scarf{i + 1}", seg)
    return parts

B_BONES = [
    ("root", (0, 0, 0), (0, 0, 0.15), None),
    ("hips", (0, 0, 0.32), (0, 0, 0.42), "root"),
    ("spine", (0, 0, 0.32), (0, 0, 0.56), "hips"),
    ("chest", (0, 0, 0.56), (0, 0, 0.64), "spine"),
    ("head", (0, 0, 0.64), (0, 0, 0.95), "chest"),
    ("eye.L", (0.082, -0.14, 0.84), (0.082, -0.2, 0.84), "head"),
    ("eye.R", (-0.082, -0.14, 0.84), (-0.082, -0.2, 0.84), "head"),
    ("ear.L", (0.08, 0.01, 0.97), (0.085, 0.01, 1.32), "head"),
    ("ear.R1", (-0.08, 0.01, 0.97), (-0.08, 0.01, 1.17), "head"),
    ("ear.R2", (-0.08, 0.01, 1.17), (-0.08, 0.01, 1.36), "ear.R1"),
    ("arm.L", (0.15, 0, 0.55), (0.19, 0, 0.37), "chest"),
    ("arm.R", (-0.15, 0, 0.55), (-0.19, 0, 0.37), "chest"),
    ("leg.L", (0.095, 0, 0.3), (0.095, 0, 0.08), "hips"),
    ("leg.R", (-0.095, 0, 0.3), (-0.095, 0, 0.08), "hips"),
    ("foot.L", (0.095, 0, 0.08), (0.095, -0.15, 0.04), "leg.L"),
    ("foot.R", (-0.095, 0, 0.08), (-0.095, -0.15, 0.04), "leg.R"),
    ("scarf1", (0, 0.11, 0.61), (0, 0.23, 0.61), "chest"),
    ("scarf2", (0, 0.23, 0.61), (0, 0.35, 0.61), "scarf1"),
    ("scarf3", (0, 0.35, 0.61), (0, 0.47, 0.61), "scarf2"),
]

WHITE = hexc("#F7F4EE"); BLACK = hexc("#262221"); MUST = hexc("#E39A12"); MAROON = hexc("#7D1630"); STEEL = hexc("#D8DDE2")

def build_gundamma():
    fur = vcol_mat("gundamma_fur", 0.8, sheen=0.6)
    parts = {}
    def add(bone, o): parts.setdefault(bone, []).append(o)

    BODY = [dict(t="ELLIPSOID", co=(0, 0.0, 0.38), r=0.3, s=(1.0, 0.88, 0.85)),
            dict(t="ELLIPSOID", co=(0, 0.0, 0.62), r=0.24, s=(1.0, 0.88, 0.85))]
    body = meta("G_body", BODY, res=0.022)
    paint(body.data, lambda co, n: mix(WHITE, BLACK, sstep(0.66, 0.72, co.z))); finish(body, fur); add("spine", body)

    HC = 0.98
    head = meta("G_head", [
        dict(t="ELLIPSOID", co=(0, 0.0, HC), r=0.26, s=(1.0, 0.9, 0.86)),
        dict(t="BALL", co=(0.135, -0.09, HC - 0.08), r=0.125),
        dict(t="BALL", co=(-0.135, -0.09, HC - 0.08), r=0.125),
        dict(t="ELLIPSOID", co=(0, -0.165, HC - 0.085), r=0.09, s=(1.05, 0.75, 0.7)),
    ], res=0.016)
    def headc(co, n):
        c = WHITE
        if co.y < -0.02:
            for sx in (1, -1):
                dx, dz = co.x - 0.092 * sx, co.z - (HC - 0.01)
                a = R(-28 * sx); u = dx * math.cos(a) - dz * math.sin(a) + 0.012 * sx; v = dx * math.sin(a) + dz * math.cos(a)
                k = (u / 0.098) ** 2 + (v / 0.07) ** 2
                c = mix(c, BLACK, 1 - sstep(0.85, 1.05, k))
                d = math.dist((co.x, co.z), (0.15 * sx, HC - 0.1))
                c = mix(c, hexc("#F4A3A8"), (1 - sstep(0.0, 0.045, d)) * 0.45)
        return c
    paint(head.data, headc); finish(head, fur); add("head", head)
    for sx in (1, -1):
        e = meta(f"G_ear{sx}", [dict(t="ELLIPSOID", co=(0.17 * sx, 0.01, HC + 0.19), r=0.088, s=(1, 0.62, 0.95))], res=0.011)
        paint(e.data, lambda co, n: BLACK); finish(e, fur); add("head", e)
    nose = prim("sphere", "G_nose", segments=20, ring_count=10, radius=0.036, loc=(0, -0.245, HC - 0.06), scl=(1.25, 0.7, 0.75))
    paint(nose.data, lambda co, n: hexc("#1A1514")); finish(nose, vcol_mat("nose_gloss", 0.15)); add("head", nose)
    smile = prim("torus", "G_smile", major_radius=0.042, minor_radius=0.0065, major_segments=24, minor_segments=6, loc=(0, -0.235, HC - 0.1), rot=(90, 0, 0))
    bm = bmesh.new(); bm.from_mesh(smile.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > HC - 0.11], context="VERTS"); bm.to_mesh(smile.data); bm.free()
    paint(smile.data, lambda co, n: hexc("#3A1E18")); finish(smile, vcol_mat("mouth", 0.4)); add("head", smile)
    bindi = prim("sphere", "G_bindi", segments=12, ring_count=6, radius=0.015, loc=(0, -0.215, HC + 0.105), scl=(1, 0.5, 1))
    paint(bindi.data, lambda co, n: hexc("#D0152C")); finish(bindi, vcol_mat("bindi", 0.2)); add("head", bindi)
    for sx, bn in ((1, "eye.L"), (-1, "eye.R")):
        for o in eye(f"G_eye{sx}", (0.09 * sx, -0.2, HC), 0.036, "#2E1A0C", "#A86E34", scale=(1, 1, 1.08)):
            add(bn, o)
    gold = vcol_mat("gold", 0.25, metal=1.0)
    for sx in (1, -1):
        g = prim("torus", f"G_glass{sx}", major_radius=0.06, minor_radius=0.0078, major_segments=32, minor_segments=8,
                 loc=(0.092 * sx, -0.245, HC + 0.005), rot=(90, 0, 0))
        paint(g.data, lambda co, n: hexc("#D9A441")); finish(g, gold); add("head", g)
        tmp = prim("cyl", f"G_temple{sx}", radius=0.006, depth=0.2, loc=(0.158 * sx, -0.15, HC + 0.015), rot=(90, 0, 0))
        paint(tmp.data, lambda co, n: hexc("#D9A441")); finish(tmp, gold); add("head", tmp)
    br = prim("cyl", "G_bridge", radius=0.006, depth=0.064, loc=(0, -0.25, HC + 0.015), rot=(0, 90, 0))
    paint(br.data, lambda co, n: hexc("#D9A441")); finish(br, gold); add("head", br)
    jas = vcol_mat("jasmine", 0.5, sheen=0.4)
    for k in range(9):
        a = R(200 + k * 17)
        p = (-0.125 + 0.088 * math.cos(a), 0.03 + 0.03 * math.sin(a * 2), HC + 0.15 + 0.088 * math.sin(a))
        f = prim("sphere", f"G_jas{k}", segments=10, ring_count=6, radius=0.023 if k % 2 else 0.019, loc=p)
        paint(f.data, lambda co, n: hexc("#FFFDF3")); finish(f, jas); add("head", f)
    leaf = prim("sphere", "G_leaf", segments=10, ring_count=6, radius=0.03, loc=(-0.215, 0.01, HC + 0.1), scl=(0.5, 1, 1.4), rot=(0, 30, 0))
    paint(leaf.data, lambda co, n: hexc("#3E8E3A")); finish(leaf, jas); add("head", leaf)

    for sx, bn in ((1, "arm.L"), (-1, "arm.R")):
        a = meta(f"G_arm{sx}", [
            dict(t="CAPSULE", co=(0.265 * sx, -0.015, 0.56), r=0.075, s=(0.085, 1, 1), rot=(0, 90 - 16 * sx, 0)),
            dict(t="BALL", co=(0.295 * sx, -0.03, 0.44), r=0.088),
        ], res=0.014)
        paint(a.data, lambda co, n: BLACK); finish(a, fur); add(bn, a)
    for sx, bl, bf in ((1, "leg.L", "foot.L"), (-1, "leg.R", "foot.R")):
        l = meta(f"G_leg{sx}", [dict(t="ELLIPSOID", co=(0.14 * sx, 0.0, 0.15), r=0.11, s=(1, 1, 1.1))], res=0.014)
        paint(l.data, lambda co, n: BLACK); finish(l, fur); add(bl, l)
        f = meta(f"G_foot{sx}", [dict(t="ELLIPSOID", co=(0.14 * sx, -0.06, 0.05), r=0.09, s=(1, 1.45, 0.62))], res=0.012)
        paint(f.data, lambda co, n: mix(BLACK, hexc("#4A3B38"), sstep(0.03, 0.01, co.z))); finish(f, fur); add(bf, f)
    tail = meta("G_tail", [dict(t="BALL", co=(0, 0.27, 0.3), r=0.06)], res=0.011)
    paint(tail.data, lambda co, n: WHITE); finish(tail, fur); add("spine", tail)

    # mustard shawl with maroon border hugging the shoulders
    shawl_m = vcol_mat("shawl", 0.85, sheen=0.35)
    def shawlc(co, n):
        z = co.z
        if z < 0.55: return MAROON
        if z < 0.565: return hexc("#F3C64B")
        ang = math.atan2(co.y, co.x)
        if 0.6 < z < 0.62 and math.sin(ang * 22) > 0.4: return MAROON
        return MUST
    sh = shell("G_shawl", BODY[1:], 0.5, 0.8, 0.014, shawlc, shawl_m, res=0.018, grow=1.07)
    add("chest", sh)
    sash = prim("torus", "G_sash", major_radius=0.285, minor_radius=0.032, major_segments=48, minor_segments=10,
                loc=(0, 0.0, 0.52), rot=(0, -38, 0), scl=(1, 0.86, 1))
    def sashc(co, n):
        return MAROON if (co.y < -0.02 and n.y < -0.3 and abs(n.x) < 0.25) or n.y > 0.0 and False else (MAROON if abs(n.z) > 0.7 else MUST)
    bpy.data.objects.remove(sash)

    steel = vcol_mat("steel", 0.18, metal=1.0)
    for k in range(3):
        c = prim("cyl", f"G_tif{k}", vertices=32, radius=0.12, depth=0.085, loc=(0, 0.33, 0.42 + k * 0.095))
        bv = c.modifiers.new("b", "BEVEL"); bv.width = 0.012; bv.segments = 3
        paint(c.data, lambda co, n: STEEL); finish(c, steel); add("chest", c)
    lid = prim("sphere", "G_tiflid", segments=32, ring_count=12, radius=0.12, loc=(0, 0.33, 0.7), scl=(1, 1, 0.35))
    paint(lid.data, lambda co, n: STEEL); finish(lid, steel); add("chest", lid)
    hd = prim("torus", "G_tifhandle", major_radius=0.1, minor_radius=0.012, major_segments=32, minor_segments=8, loc=(0, 0.33, 0.75), rot=(90, 0, 90))
    bm = bmesh.new(); bm.from_mesh(hd.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0.74], context="VERTS"); bm.to_mesh(hd.data); bm.free()
    paint(hd.data, lambda co, n: STEEL); finish(hd, steel); add("chest", hd)
    return parts

G_BONES = [
    ("root", (0, 0, 0), (0, 0, 0.15), None),
    ("hips", (0, 0, 0.3), (0, 0, 0.4), "root"),
    ("spine", (0, 0, 0.3), (0, 0, 0.7), "hips"),
    ("chest", (0, 0, 0.7), (0, 0, 0.78), "spine"),
    ("head", (0, 0, 0.78), (0, 0, 1.15), "chest"),
    ("eye.L", (0.09, -0.19, 0.98), (0.09, -0.25, 0.98), "head"),
    ("eye.R", (-0.09, -0.19, 0.98), (-0.09, -0.25, 0.98), "head"),
    ("arm.L", (0.25, 0, 0.66), (0.3, -0.03, 0.44), "chest"),
    ("arm.R", (-0.25, 0, 0.66), (-0.3, -0.03, 0.44), "chest"),
    ("leg.L", (0.14, 0, 0.26), (0.14, 0, 0.08), "hips"),
    ("leg.R", (-0.14, 0, 0.26), (-0.14, 0, 0.08), "hips"),
    ("foot.L", (0.14, 0, 0.08), (0.14, -0.14, 0.05), "leg.L"),
    ("foot.R", (-0.14, 0, 0.08), (-0.14, -0.14, 0.05), "leg.R"),
]

# ------------------------------------------------------------------ animation
def key_all(rig, frame, pose):
    """pose: {bone: dict(rot=(x,y,z) deg, loc=(x,y,z), scl=(x,y,z))}; unspecified bones reset."""
    for pb in rig.pose.bones:
        p = pose.get(pb.name, {})
        pb.rotation_euler = Euler([R(a) for a in p.get("rot", (0, 0, 0))])
        pb.location = p.get("loc", (0, 0, 0))
        pb.scale = p.get("scl", (1, 1, 1))
        pb.keyframe_insert("rotation_euler", frame=frame)
        pb.keyframe_insert("location", frame=frame)
        pb.keyframe_insert("scale", frame=frame)

def make_action(rig, name, nframes, posefn, loop=True):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    rig.animation_data_create(); rig.animation_data.action = act
    for f in range(0, nframes + 1, 1 if nframes <= 24 else 2):
        t = f / nframes
        key_all(rig, f, posefn(t))
    if loop:
        key_all(rig, nframes, posefn(0.0))
    rig.animation_data.action = None
    return act

S = math.sin; C = math.cos; TAU = 2 * math.pi

def bangara_anims(rig):
    fold = lambda t, a=0: {"rot": (0, 0, 0), "loc": (0, 0, 0)}
    def earR2(base=-115, wob=0.0):
        k = (base + 115) / 115.0  # 0 = full flop, 1 = upright-ish
        return {"rot": (12 + wob * 0.3, 0, 105 * (1 - k) + wob)}
    def blink(t, at=0.62):
        d = abs(t - at); s = 1.0 if d > 0.04 else 0.12 + 0.88 * (d / 0.04)
        return {"scl": (1, 1, s)}
    def idle(t):
        b = S(t * TAU)
        p = {"spine": {"rot": (2 * b, 0, 0), "scl": (1, 1, 1 + 0.015 * b)},
             "head": {"rot": (-3 + 2 * S(t * TAU + 1), 0, 4 * S(t * TAU * 0.5) )},
             "ear.L": {"rot": (6 * max(0, S(t * TAU * 2 - 1)) ** 4 - 4, 0, 4 * S(t * TAU))},
             "ear.R1": {"rot": (-6, 0, -6)}, "ear.R2": earR2(-118, 6 * S(t * TAU)),
             "arm.L": {"rot": (4 * b, 0, -6)}, "arm.R": {"rot": (-4 * b, 0, 6)},
             "scarf1": {"rot": (-55 + 3 * b, 0, 4 * S(t * TAU))}, "scarf2": {"rot": (-30 + 4 * S(t * TAU + 1), 0, 0)}, "scarf3": {"rot": (-15 + 6 * S(t * TAU + 2), 0, 0)}}
        p["eye.L"] = blink(t); p["eye.R"] = blink(t)
        return p
    def run(t):
        a = t * TAU
        p = {"hips": {"loc": (0, 0.045 * abs(S(a)) - 0.01, 0), "rot": (0, 6 * S(a), 0)},
             "spine": {"rot": (14, 0, 0)}, "head": {"rot": (-10 + 4 * S(2 * a), 0, -3 * S(a))},
             "leg.L": {"rot": (55 * S(a), 0, 0)}, "leg.R": {"rot": (-55 * S(a), 0, 0)},
             "foot.L": {"rot": (-30 * max(0, C(a)) + 10, 0, 0)}, "foot.R": {"rot": (-30 * max(0, -C(a)) + 10, 0, 0)},
             "arm.L": {"rot": (-65 * S(a), 0, -10)}, "arm.R": {"rot": (65 * S(a), 0, 10)},
             "ear.L": {"rot": (32 + 8 * S(2 * a), 0, 3)}, "ear.R1": {"rot": (28, 0, -4)}, "ear.R2": earR2(-95, 20 * S(2 * a)),
             "scarf1": {"rot": (-80 + 8 * S(2 * a), 0, 10 * S(a))}, "scarf2": {"rot": (-10 + 18 * S(2 * a + 1), 0, 8 * S(a + 1))},
             "scarf3": {"rot": (-10 + 25 * S(2 * a + 2), 0, 12 * S(a + 2))}}
        return p
    def jump(t):
        w = S(t * TAU)
        return {"hips": {"loc": (0, 0.02, 0)}, "spine": {"rot": (-6, 0, 0)}, "head": {"rot": (8, 0, 0)},
                "leg.L": {"rot": (-50, 0, 0)}, "leg.R": {"rot": (30, 0, 0)}, "foot.L": {"rot": (40, 0, 0)}, "foot.R": {"rot": (-30, 0, 0)},
                "arm.L": {"rot": (-15, 0, -125 + 10 * w)}, "arm.R": {"rot": (-25, 0, 115 - 10 * w)},
                "ear.L": {"rot": (-20 + 6 * w, 0, 8)}, "ear.R1": {"rot": (-15, 0, -8)}, "ear.R2": earR2(-60, 15 * w),
                "scarf1": {"rot": (-20 + 10 * w, 0, 0)}, "scarf2": {"rot": (20, 0, 0)}, "scarf3": {"rot": (25 + 10 * w, 0, 0)}}
    def talk(t):
        a = t * TAU
        p = idle(t)
        p["head"] = {"rot": (-4 + 6 * S(2 * a), 0, 6 * S(a))}
        p["arm.R"] = {"rot": (-70 + 25 * S(2 * a), 0, 20)}; p["arm.L"] = {"rot": (-20 + 10 * S(2 * a + 1), 0, -15)}
        return p
    def cheer(t):
        a = t * TAU; h = abs(S(a))
        return {"hips": {"loc": (0, 0.12 * h, 0)}, "spine": {"rot": (-8 * h, 0, 0)}, "head": {"rot": (6 * h, 0, 8 * S(a))},
                "leg.L": {"rot": (-30 * h, 0, 0)}, "leg.R": {"rot": (-30 * h, 0, 0)},
                "arm.L": {"rot": (-12, 0, -140 - 15 * h)}, "arm.R": {"rot": (-12, 0, 140 + 15 * h)},
                "ear.L": {"rot": (-10 * h, 0, 10 * S(2 * a))}, "ear.R1": {"rot": (-10 * h, 0, -10 * S(2 * a))}, "ear.R2": earR2(-100 + 40 * h),
                "scarf1": {"rot": (-60 + 30 * h, 0, 0)}, "scarf2": {"rot": (10 * h, 0, 0)}, "scarf3": {"rot": (20 * h, 0, 0)},
                "eye.L": {"scl": (1, 1, 0.45)}, "eye.R": {"scl": (1, 1, 0.45)}}
    def dash(t):
        a = t * TAU
        return {"hips": {"loc": (0, -0.03, 0)}, "spine": {"rot": (38, 0, 0)}, "head": {"rot": (-30, 0, 0)},
                "leg.L": {"rot": (-70 + 10 * S(2 * a), 0, 0)}, "leg.R": {"rot": (60 + 10 * S(2 * a), 0, 0)},
                "arm.L": {"rot": (75, 0, -20)}, "arm.R": {"rot": (75, 0, 20)},
                "ear.L": {"rot": (75, 0, 5)}, "ear.R1": {"rot": (70, 0, -5)}, "ear.R2": earR2(-10, 8 * S(4 * a)),
                "scarf1": {"rot": (-88, 0, 6 * S(4 * a))}, "scarf2": {"rot": (8 * S(4 * a), 0, 0)}, "scarf3": {"rot": (10 * S(4 * a + 1), 0, 0)}}
    acts = [make_action(rig, "idle", 72, idle), make_action(rig, "run", 18, run), make_action(rig, "jump", 24, jump),
            make_action(rig, "talk", 40, talk), make_action(rig, "cheer", 30, cheer), make_action(rig, "dash", 12, dash)]
    return {"idle": idle, "run": run, "jump": jump, "talk": talk, "cheer": cheer, "dash": dash}

def gundamma_anims(rig):
    def blink(t, at=0.4):
        d = abs(t - at); s = 1.0 if d > 0.035 else 0.1 + 0.9 * (d / 0.035)
        return {"scl": (1, 1, s)}
    def idle(t):
        b = S(t * TAU)
        return {"spine": {"rot": (1.5 * b, 0, 0), "scl": (1 + 0.012 * b, 1, 1 + 0.012 * b)},
                "head": {"rot": (-2 + 2 * S(t * TAU + 1), 3 * S(t * TAU), 5 * S(t * TAU * 0.5))},
                "arm.L": {"rot": (3 * b, 0, -4)}, "arm.R": {"rot": (-3 * b, 0, 4)},
                "eye.L": blink(t), "eye.R": blink(t)}
    def run(t):
        a = t * TAU
        return {"hips": {"loc": (0, 0.035 * abs(S(a)) - 0.008, 0), "rot": (0, 9 * S(a), 0)},
                "spine": {"rot": (10, 0, -6 * S(a))}, "head": {"rot": (-6, 0, 6 * S(a))},
                "leg.L": {"rot": (40 * S(a), 0, 0)}, "leg.R": {"rot": (-40 * S(a), 0, 0)},
                "foot.L": {"rot": (-20 * max(0, C(a)) + 6, 0, 0)}, "foot.R": {"rot": (-20 * max(0, -C(a)) + 6, 0, 0)},
                "arm.L": {"rot": (-45 * S(a), 0, -18)}, "arm.R": {"rot": (45 * S(a), 0, 18)}}
    def jump(t):
        w = S(t * TAU)
        return {"spine": {"rot": (-5, 0, 0)}, "head": {"rot": (6, 0, 0)},
                "leg.L": {"rot": (-35, 0, 8)}, "leg.R": {"rot": (-35, 0, -8)},
                "arm.L": {"rot": (-30 + 8 * w, 0, -70)}, "arm.R": {"rot": (-30 - 8 * w, 0, 70)}}
    def talk(t):
        a = t * TAU; p = idle(t)
        p["head"] = {"rot": (-3 + 5 * S(2 * a), 0, 7 * S(a))}
        p["arm.L"] = {"rot": (-60 + 20 * S(2 * a), 0, -15)}
        return p
    def cheer(t):
        a = t * TAU; h = abs(S(a))
        return {"hips": {"loc": (0, 0.07 * h, 0)}, "spine": {"rot": (-6 * h, 0, 4 * S(a))}, "head": {"rot": (8 * h, 0, 8 * S(a))},
                "arm.L": {"rot": (-10, 0, -135 - 12 * h)}, "arm.R": {"rot": (-10, 0, 135 + 12 * h)},
                "eye.L": {"scl": (1, 1, 0.35)}, "eye.R": {"scl": (1, 1, 0.35)}}
    def pound(t):  # wind up, slam, recover
        if t < 0.45:
            k = sstep(0, 0.45, t)
            return {"hips": {"loc": (0, 0.06 * k, 0)}, "spine": {"rot": (-14 * k, 0, 0)},
                    "arm.L": {"rot": (-165 * k, 0, -20)}, "arm.R": {"rot": (-165 * k, 0, 20)}, "head": {"rot": (10 * k, 0, 0)}}
        k = sstep(0.45, 0.6, t); r = sstep(0.75, 1.0, t)
        return {"hips": {"loc": (0, 0.06 - 0.14 * k * (1 - r), 0)}, "spine": {"rot": (-14 + 44 * k * (1 - r), 0, 0), "scl": (1 + 0.1 * k * (1 - r), 1, 1 - 0.1 * k * (1 - r))},
                "arm.L": {"rot": (-165 + 140 * k + 25 * r, 0, -20 - 25 * k * (1 - r))}, "arm.R": {"rot": (-165 + 140 * k + 25 * r, 0, 20 + 25 * k * (1 - r))},
                "leg.L": {"rot": (-20 * k * (1 - r), 0, 10 * k * (1 - r))}, "leg.R": {"rot": (-20 * k * (1 - r), 0, -10 * k * (1 - r))},
                "head": {"rot": (10 - 20 * k * (1 - r), 0, 0)}}
    def throw(t):  # team-up: scoop Bangara up and launch
        k = sstep(0, 0.4, t); u = sstep(0.4, 0.6, t); r = sstep(0.7, 1.0, t)
        return {"hips": {"loc": (0, -0.08 * k * (1 - u) + 0.04 * u * (1 - r), 0)}, "spine": {"rot": (20 * k * (1 - u) - 12 * u * (1 - r), 0, 0)},
                "arm.L": {"rot": (-40 * k - 130 * u + 170 * r * u, 0, -10)}, "arm.R": {"rot": (-40 * k - 130 * u + 170 * r * u, 0, 10)},
                "head": {"rot": (-10 * k + 20 * u * (1 - r), 0, 0)}}
    for nm, n, fn in (("idle", 90, idle), ("run", 22, run), ("jump", 24, jump), ("talk", 44, talk), ("cheer", 34, cheer)):
        make_action(rig, nm, n, fn)
    make_action(rig, "pound", 30, pound, loop=False); make_action(rig, "throw", 24, throw, loop=False)
    return {"idle": idle, "run": run, "jump": jump, "talk": talk, "cheer": cheer, "pound": pound, "throw": throw}

def apply_pose(rig, pose):
    for pb in rig.pose.bones:
        p = pose.get(pb.name, {})
        pb.rotation_euler = Euler([R(a) for a in p.get("rot", (0, 0, 0))])
        pb.location = p.get("loc", (0, 0, 0)); pb.scale = p.get("scl", (1, 1, 1))
    bpy.context.view_layer.update()

def build(kind):
    reset(); MATS.clear()
    parts = build_bangara() if kind == "bangara" else build_gundamma()
    rig = make_armature("Bangara" if kind == "bangara" else "Gundamma", B_BONES if kind == "bangara" else G_BONES)
    for bone, objs in parts.items():
        for o in objs: attach(o, rig, bone)
    poses = bangara_anims(rig) if kind == "bangara" else gundamma_anims(rig)
    return rig, poses

def decimate_all(ratio):
    for o in bpy.context.scene.objects:
        if o.type == "MESH" and len(o.data.polygons) > 1500:
            d = o.modifiers.new("dec", "DECIMATE"); d.ratio = ratio

def export_glb(rig, path):
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for o in rig.children_recursive: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
                              export_vertex_color="MATERIAL", export_yup=True, export_skins=False,
                              export_optimize_animation_size=True)

# ------------------------------------------------------------------ art renders
def studio(sc, ortho=None, cam_loc=(0.0, -3.2, 0.75), cam_rot=(86, 0, 0), lens=60, res=(900, 1100), samples=96):
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.render.film_transparent = True; sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = "AgX"
    try: sc.view_settings.look = "AgX - Punchy"
    except Exception: pass
    w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.85, 0.95, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.5
    def light(name, loc, rot, energy, size, col=(1, 1, 1)):
        d = bpy.data.lights.new(name, "AREA"); d.energy = energy; d.size = size; d.color = col
        o = link(bpy.data.objects.new(name, d)); o.location = loc; o.rotation_euler = Euler([R(a) for a in rot])
    light("key", (1.8, -2.4, 2.4), (52, 0, 36), 260, 2.0, (1.0, 0.95, 0.88))
    light("fill", (-2.4, -1.8, 1.2), (70, 0, -52), 90, 3.0, (0.85, 0.9, 1.0))
    light("rim", (-0.6, 2.2, 2.2), (-58, 0, 195), 280, 1.4, (1.0, 0.85, 0.7))
    light("rim2", (1.2, 2.0, 1.4), (-65, 0, 150), 160, 1.0, (0.8, 0.9, 1.0))
    cd = bpy.data.cameras.new("cam"); cd.lens = lens
    if ortho: cd.type = "ORTHO"; cd.ortho_scale = ortho
    cam = link(bpy.data.objects.new("cam", cd)); cam.location = cam_loc; cam.rotation_euler = Euler([R(a) for a in cam_rot])
    sc.camera = cam
    return cam

def render(path):
    bpy.context.scene.render.filepath = path; bpy.ops.render.render(write_still=True)

if __name__ == "__main__":
    for kind in ("bangara", "gundamma"):
        rig, poses = build(kind)
        if MODE in ("glb", "all"):
            decimate_all(0.45)
            export_glb(rig, os.path.join(OUT, f"{kind}.glb"))
            print("exported", kind, flush=True)
        if MODE in ("preview", "art", "all", "sheet"):
            sc = bpy.context.scene
            h = 1.45 if kind == "bangara" else 1.35
            cam = studio(sc, cam_loc=(0.9, -3.4, h * 0.5 + 0.12), cam_rot=(87, 0, 15), lens=55 if kind == "bangara" else 50,
                         samples=32 if MODE in ("preview", "sheet") else 128, res=(700, 900) if MODE in ("preview", "sheet") else (1000, 1300))
            if MODE == "sheet": cam.location = (2.6, -2.4, h * 0.5 + 0.12); cam.rotation_euler = Euler((R(86), 0, R(47)))
            rig.rotation_euler = Euler((0, 0, 0))
            shots = [("hero", poses["idle"](0.2))]
            if MODE == "sheet":
                shots = [(nm, poses[nm](t)) for nm, t in (("idle", 0.2), ("run", 0.25), ("run", 0.75), ("jump", 0.1), ("cheer", 0.25), ("talk", 0.3))]
                shots = [(f"{nm}{i}", p) for i, (nm, p) in enumerate(shots)]
            if MODE != "preview":
                shots += [(nm, poses[nm](t)) for nm, t in (("run", 0.25), ("cheer", 0.25), ("talk", 0.3))]
            for nm, p in shots:
                apply_pose(rig, p); render(os.path.join(OUT, f"{kind}_{nm}.png")); print("rendered", kind, nm, flush=True)
