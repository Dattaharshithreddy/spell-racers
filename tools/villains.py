"""Mute Gang goon (Mouna's henchman) + hero weapons.  python3 villains.py <outdir> [glb|preview]"""
import sys
OUTD = sys.argv[1]; VMODE = sys.argv[2] if len(sys.argv) > 2 else "glb"
sys.argv = [sys.argv[0], OUTD, "none"]
exec(open("heroes.py").read().split('if __name__ == "__main__":')[0])
import os

VIO = hexc("#3B2D63"); VIO_D = hexc("#251B42"); PANTS = hexc("#1E1B2E"); MASK = hexc("#EEE9F4"); INK = hexc("#120C1E")
GLOWP = hexc("#B98CFF")

def build_goon():
    cloth = vcol_mat("goon_cloth", 0.85, sheen=0.4)
    parts = {}
    def add(b, o): parts.setdefault(b, []).append(o)
    body = meta("V_body", [dict(t="ELLIPSOID", co=(0, 0, 0.78), r=0.2, s=(0.95, 0.75, 1.15)),
                           dict(t="ELLIPSOID", co=(0, 0.01, 0.58), r=0.17, s=(0.95, 0.8, 0.8))], res=0.02)
    def bodyc(co, n):
        c = VIO
        if 0.55 < co.z < 0.6: c = INK                      # belt
        if co.y < -0.12 and abs(co.x) < 0.035 and 0.8 < co.z < 0.9: c = MASK  # 'shh' emblem bar
        if co.y < -0.13 and math.dist((co.x, co.z), (0, 0.93)) < 0.04: c = MASK
        return mix(c, VIO_D, sstep(0.05, 0.15, co.y) * 0.5)
    paint(body.data, bodyc); finish(body, cloth); add("spine", body)
    buckle = prim("cube", "V_buckle", size=1, loc=(0, -0.155, 0.575), scl=(0.06, 0.02, 0.04))
    paint(buckle.data, lambda co, n: hexc("#C9C3D6")); finish(buckle, vcol_mat("chrome", 0.2, metal=1.0), smooth=False); add("spine", buckle)

    HC = 1.18
    hood = meta("V_hood", [dict(t="ELLIPSOID", co=(0, 0.02, HC + 0.01), r=0.2, s=(1.0, 1.05, 1.08)),
                           dict(t="ELLIPSOID", co=(0, 0.1, HC + 0.17), r=0.08, s=(0.8, 1.2, 0.7)),
                           dict(t="ELLIPSOID", co=(0, -0.13, HC - 0.01), r=0.15, s=(0.82, 0.6, 1.0), neg=True, stiff=3.0)], res=0.016)
    paint(hood.data, lambda co, n: mix(VIO, VIO_D, sstep(-0.05, 0.12, co.y))); finish(hood, cloth); add("head", hood)
    mask = prim("sphere", "V_mask", segments=32, ring_count=16, radius=0.13, loc=(0, -0.085, HC - 0.02), scl=(0.95, 0.62, 1.12))
    paint(mask.data, lambda co, n: MASK); finish(mask, vcol_mat("mask", 0.35)); add("head", mask)
    for sx in (1, -1):  # angry slanted eye slits with glowing pupils
        e = prim("cube", f"V_eye{sx}", size=1, loc=(0.05 * sx, -0.165, HC + 0.03), scl=(0.095, 0.02, 0.034), rot=(0, 24 * sx, 0))
        paint(e.data, lambda co, n: INK); finish(e, vcol_mat("ink", 0.4), smooth=False); add("head", e)
        g = prim("sphere", f"V_glow{sx}", segments=10, ring_count=6, radius=0.019, loc=(0.05 * sx, -0.178, HC + 0.026))
        paint(g.data, lambda co, n: GLOWP); finish(g, vcol_mat("eye_glint_p", 0.0, emit=4.0)); add("head", g)
    lip = prim("cube", "V_lip", size=1, loc=(0, -0.165, HC - 0.075), scl=(0.09, 0.012, 0.008))
    paint(lip.data, lambda co, n: INK); finish(lip, vcol_mat("ink", 0.4), smooth=False); add("head", lip)
    for k in range(4):
        st = prim("cube", f"V_st{k}", size=1, loc=(-0.033 + k * 0.022, -0.166, HC - 0.075), scl=(0.006, 0.01, 0.034))
        paint(st.data, lambda co, n: INK); finish(st, vcol_mat("ink", 0.4), smooth=False); add("head", st)

    for sx in (1, -1):  # shoulder pads
        sp = meta(f"V_pad{sx}", [dict(t="ELLIPSOID", co=(0.17 * sx, 0, 0.93), r=0.09, s=(1.1, 0.9, 0.6))], res=0.012)
        paint(sp.data, lambda co, n: VIO_D); finish(sp, cloth); add("chest", sp)
    for sx, bn in ((1, "arm.L"), (-1, "arm.R")):
        a = meta(f"V_arm{sx}", [dict(t="CAPSULE", co=(0.21 * sx, 0, 0.78), r=0.05, s=(0.12, 1, 1), rot=(0, 90 - 8 * sx, 0))], res=0.012)
        paint(a.data, lambda co, n: VIO); finish(a, cloth); add(bn, a)
        h = meta(f"V_hand{sx}", [dict(t="BALL", co=(0.225 * sx, -0.01, 0.62), r=0.055)], res=0.01)
        paint(h.data, lambda co, n: INK); finish(h, vcol_mat("glove", 0.5)); add(bn, h)
    for sx, bl, bf in ((1, "leg.L", "foot.L"), (-1, "leg.R", "foot.R")):
        l = meta(f"V_leg{sx}", [dict(t="CAPSULE", co=(0.085 * sx, 0, 0.3), r=0.06, s=(0.17, 1, 1), rot=(0, 90, 0))], res=0.013)
        paint(l.data, lambda co, n: PANTS); finish(l, cloth); add(bl, l)
        f = meta(f"V_boot{sx}", [dict(t="ELLIPSOID", co=(0.085 * sx, -0.05, 0.05), r=0.075, s=(0.95, 1.6, 0.7))], res=0.012)
        paint(f.data, lambda co, n: INK); finish(f, vcol_mat("glove", 0.5)); add(bf, f)

    # Hush Blaster in the right hand, pointing DOWN along the arm (aim pose swings it forward)
    gm = vcol_mat("gun_dark", 0.35, metal=0.6); gg = vcol_mat("gun_glow", 0.2, emit=3.0)
    gx, gy, gz = -0.225, -0.02, 0.6
    body_g = prim("cube", "V_gun", size=1, loc=(gx, gy - 0.02, gz - 0.12), scl=(0.085, 0.11, 0.32))
    bv = body_g.modifiers.new("b", "BEVEL"); bv.width = 0.01; bv.segments = 2
    paint(body_g.data, lambda co, n: hexc("#2A2438")); finish(body_g, gm, smooth=False); add("arm.R", body_g)
    coil = prim("cyl", "V_coil", vertices=16, radius=0.05, depth=0.2, loc=(gx, gy - 0.02, gz - 0.18))
    paint(coil.data, lambda co, n: GLOWP); finish(coil, gg); add("arm.R", coil)
    muz = prim("cyl", "V_muz", vertices=16, radius=0.045, depth=0.1, loc=(gx, gy - 0.02, gz - 0.33))
    paint(muz.data, lambda co, n: hexc("#4A4060")); finish(muz, gm); add("arm.R", muz)
    return parts

V_BONES = [
    ("root", (0, 0, 0), (0, 0, 0.15), None),
    ("hips", (0, 0, 0.55), (0, 0, 0.65), "root"),
    ("spine", (0, 0, 0.55), (0, 0, 0.95), "hips"),
    ("chest", (0, 0, 0.95), (0, 0, 1.02), "spine"),
    ("head", (0, 0, 1.02), (0, 0, 1.35), "chest"),
    ("arm.L", (0.19, 0, 0.92), (0.225, 0, 0.62), "chest"),
    ("arm.R", (-0.19, 0, 0.92), (-0.225, 0, 0.62), "chest"),
    ("leg.L", (0.085, 0, 0.5), (0.085, 0, 0.09), "hips"),
    ("leg.R", (-0.085, 0, 0.5), (-0.085, 0, 0.09), "hips"),
    ("foot.L", (0.085, 0, 0.09), (0.085, -0.15, 0.04), "leg.L"),
    ("foot.R", (-0.085, 0, 0.09), (-0.085, -0.15, 0.04), "leg.R"),
]

def goon_anims(rig):
    AIM_R = (-88, 0, -4); AIM_L = (-70, 0, -38)
    def idle(t):
        b = S(t * TAU)
        return {"spine": {"rot": (2 * b, 0, 0)}, "head": {"rot": (-2, 0, 6 * S(t * TAU * 0.5))},
                "arm.R": {"rot": (-20 + 3 * b, 0, 4)}, "arm.L": {"rot": (4 * b, 0, -6)}}
    def run(t):
        a = t * TAU
        return {"hips": {"loc": (0, 0.04 * abs(S(a)) - 0.01, 0), "rot": (0, 5 * S(a), 0)}, "spine": {"rot": (12, 0, 0)}, "head": {"rot": (-8, 0, 0)},
                "leg.L": {"rot": (45 * S(a), 0, 0)}, "leg.R": {"rot": (-45 * S(a), 0, 0)},
                "foot.L": {"rot": (-25 * max(0, C(a)) + 8, 0, 0)}, "foot.R": {"rot": (-25 * max(0, -C(a)) + 8, 0, 0)},
                "arm.L": {"rot": (-50 * S(a), 0, -8)}, "arm.R": {"rot": (-35 + 25 * S(a), 0, 6)}}
    def aim(t):
        b = S(t * TAU)
        return {"spine": {"rot": (4, 0, -6)}, "head": {"rot": (0, 0, -4)}, "leg.L": {"rot": (-10, 0, 4)}, "leg.R": {"rot": (12, 0, -4)},
                "arm.R": {"rot": (AIM_R[0] + 2 * b, 0, AIM_R[2])}, "arm.L": {"rot": AIM_L}}
    def shoot(t):
        k = max(0.0, 1 - t * 4)
        return {"spine": {"rot": (4 - 6 * k, 0, -6)}, "head": {"rot": (-4 * k, 0, -4)}, "leg.L": {"rot": (-10, 0, 4)}, "leg.R": {"rot": (12, 0, -4)},
                "arm.R": {"rot": (AIM_R[0] - 14 * k, 0, AIM_R[2])}, "arm.L": {"rot": AIM_L}}
    def hit(t):
        k = S(min(1, t * 2) * math.pi)
        return {"spine": {"rot": (-22 * k, 0, 8 * k)}, "head": {"rot": (-15 * k, 0, 0)}, "arm.R": {"rot": (-20 + 30 * k, 0, 20 * k)}, "arm.L": {"rot": (20 * k, 0, -30 * k)}}
    def die(t):
        k = sstep(0, 0.6, t)
        return {"hips": {"loc": (0, -0.42 * k, 0.1 * k), "rot": (-80 * k, 0, 0)}, "head": {"rot": (-20 * k, 0, 0)},
                "arm.R": {"rot": (-20 - 130 * k, 0, 40 * k)}, "arm.L": {"rot": (-150 * k, 0, -40 * k)}, "leg.L": {"rot": (40 * k, 0, 0)}, "leg.R": {"rot": (20 * k, 0, 0)}}
    make_action(rig, "idle", 60, idle); make_action(rig, "run", 18, run); make_action(rig, "aim", 40, aim)
    make_action(rig, "shoot", 10, shoot, loop=False); make_action(rig, "hit", 12, hit, loop=False); make_action(rig, "die", 24, die, loop=False)
    return {"idle": idle, "run": run, "aim": aim, "die": die}

# ------------------------------------------------------------------ hero weapons (grip at origin, barrel pointing DOWN -Z)
def weapons():
    out = []
    brass = vcol_mat("w_brass", 0.25, metal=1.0); glow = vcol_mat("w_glow_y", 0.1, emit=3.5); red = vcol_mat("w_red", 0.4)
    parts = []
    g = prim("cyl", "WB_grip", vertices=12, radius=0.022, depth=0.09, loc=(0, 0.035, 0.0), rot=(90, 0, 0)); paint(g.data, lambda co, n: hexc("#5B3A1E")); finish(g, vcol_mat("w_wood", 0.6)); parts.append(g)
    b = prim("cyl", "WB_body", vertices=20, radius=0.042, depth=0.2, loc=(0, 0, -0.08)); paint(b.data, lambda co, n: hexc("#E2B13C")); finish(b, brass); parts.append(b)
    bulb = prim("sphere", "WB_bulb", segments=20, ring_count=10, radius=0.055, loc=(0, 0, -0.0)); paint(bulb.data, lambda co, n: hexc("#E2B13C")); finish(bulb, brass); parts.append(bulb)
    for k in range(3):
        f = prim("torus", f"WB_fin{k}", major_radius=0.05, minor_radius=0.009, major_segments=20, minor_segments=6, loc=(0, 0, -0.05 - k * 0.045))
        paint(f.data, lambda co, n: hexc("#D21F2B") if k % 2 else hexc("#FFCC1F")); finish(f, red); parts.append(f)
    tip = prim("cone", "WB_tip", vertices=16, radius1=0.03, radius2=0.018, depth=0.06, loc=(0, 0, -0.21), rot=(180, 0, 0)); paint(tip.data, lambda co, n: hexc("#E2B13C")); finish(tip, brass); parts.append(tip)
    gl = prim("sphere", "WB_glow", segments=12, ring_count=6, radius=0.02, loc=(0, 0, -0.245)); paint(gl.data, lambda co, n: hexc("#FFE36B")); finish(gl, glow); parts.append(gl)
    out.append(("w_blaster", parts))
    steel = vcol_mat("w_steel", 0.18, metal=1.0); glowc = vcol_mat("w_glow_c", 0.1, emit=3.0)
    parts = []
    t = prim("cyl", "WC_tube", vertices=24, radius=0.075, depth=0.42, loc=(0, 0, -0.14)); paint(t.data, lambda co, n: hexc("#D8DDE2")); finish(t, steel); parts.append(t)
    for k in range(3):
        r = prim("torus", f"WC_ring{k}", major_radius=0.08, minor_radius=0.014, major_segments=24, minor_segments=8, loc=(0, 0, 0.02 - k * 0.12)); paint(r.data, lambda co, n: hexc("#AEB6BE")); finish(r, steel); parts.append(r)
    mz = prim("cyl", "WC_muz", vertices=24, radius=0.09, depth=0.05, loc=(0, 0, -0.36)); paint(mz.data, lambda co, n: hexc("#7D1630")); finish(mz, vcol_mat("w_maroon", 0.5)); parts.append(mz)
    gl = prim("cyl", "WC_glow", vertices=24, radius=0.06, depth=0.01, loc=(0, 0, -0.386)); paint(gl.data, lambda co, n: hexc("#FFB347")); finish(gl, glowc); parts.append(gl)
    h = prim("torus", "WC_handle", major_radius=0.06, minor_radius=0.012, major_segments=20, minor_segments=6, loc=(0, 0.08, -0.12), rot=(0, 90, 0)); paint(h.data, lambda co, n: hexc("#D8DDE2")); finish(h, steel); parts.append(h)
    out.append(("w_cannon", parts))
    joined = []
    for name, ps in out:
        bpy.ops.object.select_all(action="DESELECT")
        for p in ps:
            p.select_set(True); bpy.context.view_layer.objects.active = p
            for md in list(p.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
        bpy.context.view_layer.objects.active = ps[0]; bpy.ops.object.join(); j = bpy.context.object; j.name = name; joined.append(j)
    return joined

if VMODE == "glb":
    reset(); MATS.clear()
    parts = build_goon(); rig = make_armature("Goon", V_BONES)
    for b, objs in parts.items():
        for o in objs: attach(o, rig, b)
    goon_anims(rig); decimate_all(0.5)
    export_glb(rig, os.path.join(OUTD, "goon.glb")); print("exported goon", flush=True)
    reset(); MATS.clear()
    ws = weapons()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUTD, "weapons.glb"), export_format="GLB", use_selection=True, export_apply=True, export_vertex_color="MATERIAL")
    print("exported weapons", flush=True)
else:
    reset(); MATS.clear()
    parts = build_goon(); rig = make_armature("Goon", V_BONES)
    for b, objs in parts.items():
        for o in objs: attach(o, rig, b)
    poses = goon_anims(rig)
    sc = bpy.context.scene
    cam = studio(sc, cam_loc=(1.4, -3.4, 0.85), cam_rot=(87, 0, 22), lens=50, samples=24, res=(500, 640))
    for nm, t in (("idle", 0.2), ("aim", 0.2), ("run", 0.25), ("die", 1.0)):
        apply_pose(rig, poses[nm](t)); render(os.path.join(OUTD, f"goon_{nm}.png"))
    print("rendered", flush=True)
