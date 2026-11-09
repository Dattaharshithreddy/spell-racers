"""Vehicles for MAATHU, built at a 'film CGI' level of detail:
auto-rickshaw, Bullet-style motorbike, open jeep, KSRTC bus, hatchback car.
Front faces -Y (-> +Z in three). Z is up, ground at z=0.
Every wheel is its own object with its origin exactly at the hub, built only from its own parts,
so the game can spin and steer it cleanly.
python3 vehicles.py <outdir> [glb|preview]"""
import sys
OUTD = sys.argv[1]; VMODE = sys.argv[2] if len(sys.argv) > 2 else "glb"
sys.argv = [sys.argv[0], OUTD, "none"]
exec(open("heroes.py").read().split('if __name__ == "__main__":')[0])
import os, bmesh

# ------------------------------------------------------------------ materials (names are read by the game)
def M():
    return dict(
        paint=vcol_mat("v_paint", 0.28, metal=0.25), tyre=vcol_mat("v_tyre", 0.92), rubber=vcol_mat("v_rubber", 0.7),
        chrome=vcol_mat("v_chrome", 0.12, metal=1.0), alloy=vcol_mat("v_alloy", 0.3, metal=0.9),
        plastic=vcol_mat("v_plastic", 0.55), glass=vcol_mat("v_glass", 0.04), canvas=vcol_mat("v_canvas", 0.85),
        seat=vcol_mat("v_seat", 0.6), lamp=vcol_mat("v_lamp", 0.1, emit=2.5), tail=vcol_mat("v_tail", 0.2, emit=1.2),
        amber=vcol_mat("v_amber", 0.2, emit=0.8), plate=vcol_mat("v_plate", 0.4))

def col(o, hexs, mat, smooth=True):
    paint(o.data, lambda co, n: hexc(hexs)); finish(o, mat, smooth); return o

def apply_mods(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)

def shaped(name, size, loc, hexs, mat, bevel=0.04, segs=3, top=(1.0, 0.0, 0.0), rot=(0, 0, 0), smooth=True):
    """box with a shaped top face: top=(width scale, front inset, back inset) -> sloped windscreens, tapered cabins"""
    o = prim("cube", name, size=1, scl=size, rot=rot)
    me = o.data; zt = max(v.co.z for v in me.vertices)
    for v in me.vertices:
        if abs(v.co.z - zt) < 1e-4:
            v.co.x *= top[0]
            if v.co.y < 0: v.co.y += top[1]
            else: v.co.y -= top[2]
    me.transform(Matrix.Translation(loc))
    if bevel:
        b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = segs; b.limit_method = "ANGLE"
        apply_mods(o)
    return col(o, hexs, mat, smooth)

def cyl(name, r, depth, loc, hexs, mat, rot=(0, 0, 0), verts=24, bevel=0.0):
    o = prim("cyl", name, vertices=verts, radius=r, depth=depth, loc=loc, rot=rot)
    if bevel:
        b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 2; apply_mods(o)
    return col(o, hexs, mat)

def ball(name, r, loc, hexs, mat, scl=(1, 1, 1), segs=20):
    return col(prim("sphere", name, segments=segs, ring_count=segs // 2, radius=r, loc=loc, scl=scl), hexs, mat)

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for p in objs: p.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
    j = bpy.context.object; j.name = name; j.data.name = name; return j

def wheel(name, r, w, loc, m, rim_hex="#C9CCD1", spokes=6, wire=False):
    """tyre (rounded torus profile + tread blocks), alloy rim, spokes, brake disc, hub cap. Built at the origin."""
    parts = []
    side = r * 0.3
    t = prim("torus", name + "_tyre", major_radius=r - side, minor_radius=side, major_segments=40, minor_segments=12, rot=(0, 90, 0))
    for v in t.data.vertices: v.co.x *= (w / 2) / side          # flatten to tyre width
    parts.append(col(t, "#18181A", m["tyre"]))
    for k in range(20):                                           # tread blocks
        a = k / 20 * math.tau
        o = prim("cube", f"{name}_tr{k}", size=1, scl=(w * 0.82, r * 0.11, r * 0.05),
                 loc=(0, math.cos(a) * (r - r * 0.015), math.sin(a) * (r - r * 0.015)), rot=(math.degrees(a) + 90, 0, 0))
        parts.append(col(o, "#121214", m["tyre"], smooth=False))
    rim_r = r - side * 1.55
    parts.append(cyl(name + "_rim", rim_r + side * 0.35, w * 0.7, (0, 0, 0), "#2A2A2E", m["rubber"], rot=(0, 90, 0), verts=32))
    parts.append(cyl(name + "_lip", rim_r + side * 0.12, w * 0.78, (0, 0, 0), rim_hex, m["alloy"], rot=(0, 90, 0), verts=32, bevel=0.012))
    parts.append(cyl(name + "_disc", rim_r * 0.72, w * 0.82, (0, 0, 0), "#55575C", m["alloy"], rot=(0, 90, 0), verts=24))
    n = 28 if wire else spokes
    for k in range(n):
        a = k / n * math.tau
        if wire:
            o = prim("cyl", f"{name}_sp{k}", vertices=6, radius=0.006, depth=rim_r * 1.9, rot=(math.degrees(a), 0, 0),
                     loc=(((k % 2) - 0.5) * w * 0.3, 0, 0))
        else:
            o = prim("cube", f"{name}_sp{k}", size=1, scl=(w * 0.12, rim_r * 0.22, rim_r * 0.92),
                     loc=(w * 0.42, math.sin(a) * rim_r * 0.5, math.cos(a) * rim_r * 0.5), rot=(-math.degrees(a), 0, 0))
        parts.append(col(o, rim_hex, m["alloy"]))
        if not wire:   # mirror the spokes on the inner face too so the wheel reads from both sides
            o2 = prim("cube", f"{name}_spi{k}", size=1, scl=(w * 0.12, rim_r * 0.22, rim_r * 0.92),
                      loc=(-w * 0.42, math.sin(a) * rim_r * 0.5, math.cos(a) * rim_r * 0.5), rot=(-math.degrees(a), 0, 0))
            parts.append(col(o2, rim_hex, m["alloy"]))
    parts.append(cyl(name + "_hub", rim_r * 0.24, w * 1.02, (0, 0, 0), "#E6E8EB", m["chrome"], rot=(0, 90, 0), verts=16, bevel=0.01))
    for k in range(5):  # lug nuts
        a = k / 5 * math.tau
        parts.append(cyl(f"{name}_nut{k}", rim_r * 0.045, w * 1.08, (0, math.cos(a) * rim_r * 0.15, math.sin(a) * rim_r * 0.15), "#9EA3AA", m["chrome"], rot=(0, 90, 0), verts=6))
    j = join(parts, name)
    for f in j.data.polygons: f.use_smooth = True
    j.location = loc
    return j

def lamp_pair(prefix, x, y, z, r, m, P, hexs="#FFF6D6", housing="#D9DCE0"):
    for sx in (1, -1):
        P.append(cyl(f"{prefix}H{sx}", r * 1.18, 0.06, (x * sx, y + 0.02, z), housing, m["chrome"], rot=(90, 0, 0), verts=24))
        P.append(ball(f"{prefix}L{sx}", r, (x * sx, y - 0.01, z), hexs, m["lamp"], scl=(1, 0.35, 1)))

def mirrors(prefix, x, y, z, m, P, arm=0.16, hexs="#1C1C1E"):
    for sx in (1, -1):
        P.append(cyl(f"{prefix}Ma{sx}", 0.012, arm, (x * sx + 0.05 * sx, y, z), "#1C1C1E", m["plastic"], rot=(0, 90, 0), verts=6))
        P.append(shaped(f"{prefix}Mh{sx}", (0.06, 0.08, 0.1), (x * sx + (arm + 0.02) * sx, y, z), hexs, m["paint"], 0.025))
        P.append(shaped(f"{prefix}Mg{sx}", (0.01, 0.065, 0.08), (x * sx + (arm + 0.02) * sx, y + 0.04, z), "#B8D0DC", m["chrome"], 0.0))

def plate(name, loc, m, P, w=0.42, h=0.13):
    P.append(shaped(name, (w, 0.02, h), loc, "#F4F2EA", m["plate"], 0.008))
    P.append(shaped(name + "t", (w * 0.8, 0.022, h * 0.42), loc, "#1E2A55", m["plastic"], 0.0))

# ------------------------------------------------------------------ AUTO-RICKSHAW (Bajaj RE style, Bengaluru green+yellow)
def auto():
    m = M(); P = []
    G, Y, BLK = "#1E8A3A", "#F6C21C", "#1B1B1D"
    P.append(shaped("A_floor", (1.3, 2.45, 0.12), (0, 0.05, 0.36), "#2A2A2C", m["plastic"], 0.02))
    P.append(shaped("A_cowl", (0.92, 0.72, 0.62), (0, -0.92, 0.7), G, m["paint"], 0.16, 4, top=(0.82, 0.12, 0.0)))
    P.append(shaped("A_nose", (0.6, 0.28, 0.5), (0, -1.28, 0.58), G, m["paint"], 0.13, 4, top=(0.85, 0.06, 0)))
    P.append(shaped("A_mud", (0.42, 0.5, 0.14), (0, -1.12, 0.6), BLK, m["plastic"], 0.06))
    P.append(shaped("A_rear", (1.34, 1.22, 0.6), (0, 0.6, 0.7), G, m["paint"], 0.15, 4))
    P.append(shaped("A_stripe", (1.37, 1.25, 0.07), (0, 0.6, 0.93), Y, m["paint"], 0.02))
    P.append(shaped("A_tailpanel", (1.3, 0.04, 0.4), (0, 1.22, 0.74), BLK, m["plastic"], 0.01))
    for sx in (1, -1):
        P.append(shaped(f"A_tail{sx}", (0.16, 0.03, 0.09), (0.48 * sx, 1.245, 0.86), "#E0262B", m["tail"], 0.01))
        P.append(shaped(f"A_ind{sx}", (0.08, 0.03, 0.06), (0.3 * sx, 1.245, 0.86), "#FF9F1A", m["amber"], 0.01))
        P.append(shaped(f"A_indF{sx}", (0.07, 0.03, 0.05), (0.24 * sx, -1.43, 0.7), "#FF9F1A", m["amber"], 0.01))
    plate("A_plateB", (0, 1.25, 0.6), m, P)
    # roof + canvas hood
    P.append(shaped("A_roof", (1.44, 2.12, 0.1), (0, 0.05, 1.86), Y, m["paint"], 0.05))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.73, depth=2.08, location=(0, 0.05, 1.5), rotation=(math.radians(90), 0, 0))
    can = bpy.context.object; bpy.ops.object.transform_apply(rotation=True)
    bm = bmesh.new(); bm.from_mesh(can.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 1.62], context="VERTS"); bm.to_mesh(can.data); bm.free()
    can.scale = (1, 1, 0.55); bpy.ops.object.transform_apply(scale=True)
    s = can.modifiers.new("s", "SOLIDIFY"); s.thickness = 0.035; apply_mods(can); can.name = "A_hood"
    P.append(col(can, BLK, m["canvas"]))
    P.append(shaped("A_back", (1.36, 0.05, 0.9), (0, 1.12, 1.38), BLK, m["canvas"], 0.02))
    P.append(shaped("A_backwin", (0.7, 0.055, 0.22), (0, 1.12, 1.55), "#41606F", m["glass"], 0.01))
    for sx in (1, -1):
        P.append(shaped(f"A_side{sx}", (0.05, 0.85, 0.58), (0.68 * sx, 0.64, 1.44), BLK, m["canvas"], 0.01))
        P.append(cyl(f"A_pillar{sx}", 0.028, 1.15, (0.6 * sx, -0.95, 1.35), "#D7DADF", m["chrome"], verts=12))
        P.append(cyl(f"A_rail{sx}", 0.02, 0.9, (0.66 * sx, 0.15, 1.05), "#D7DADF", m["chrome"], rot=(90, 0, 0), verts=10))
    P.append(shaped("A_wind", (1.04, 0.025, 0.62), (0, -1.0, 1.42), "#BFD9E6", m["glass"], 0.0, rot=(-12, 0, 0)))
    P.append(shaped("A_wiper", (0.42, 0.02, 0.015), (0.1, -1.04, 1.13), BLK, m["plastic"], 0.0, rot=(-12, 0, 20)))
    # handlebar, dash, meter
    P.append(cyl("A_bar", 0.022, 0.86, (0, -0.7, 1.12), "#D7DADF", m["chrome"], rot=(0, 90, 0), verts=12))
    for sx in (1, -1): P.append(cyl(f"A_grip{sx}", 0.032, 0.14, (0.4 * sx, -0.7, 1.12), BLK, m["rubber"], rot=(0, 90, 0), verts=12))
    P.append(cyl("A_meter", 0.07, 0.04, (0, -0.8, 1.16), "#E8E4D8", m["chrome"], rot=(70, 0, 0), verts=20))
    P.append(shaped("A_meterbox", (0.32, 0.18, 0.22), (0.38, -0.82, 1.12), "#2B2B2E", m["plastic"], 0.03))
    P.append(cyl("A_headH", 0.125, 0.07, (0, -1.41, 0.82), "#D9DCE0", m["chrome"], rot=(90, 0, 0), verts=24))
    P.append(ball("A_headL", 0.105, (0, -1.44, 0.82), "#FFF6D6", m["lamp"], scl=(1, 0.35, 1)))
    mirrors("A_", 0.5, -0.92, 1.3, m, P, 0.12)
    # seats
    P.append(shaped("A_seatD", (0.5, 0.42, 0.13), (0, -0.4, 0.82), "#2E211B", m["seat"], 0.05))
    P.append(shaped("A_seatP", (1.18, 0.5, 0.17), (0, 0.55, 1.08), "#2E211B", m["seat"], 0.06))
    P.append(shaped("A_seatPB", (1.18, 0.12, 0.5), (0, 0.85, 1.35), "#2E211B", m["seat"], 0.05))
    plate("A_plateF", (0, -1.44, 0.46), m, P)
    b = join(P, "body")
    w = [wheel("wheel_f", 0.26, 0.15, (0, -1.08, 0.26), m), wheel("wheel_rl", 0.27, 0.17, (0.62, 0.72, 0.27), m),
         wheel("wheel_rr", 0.27, 0.17, (-0.62, 0.72, 0.27), m)]
    return b, w

# ------------------------------------------------------------------ BULLET-STYLE MOTORBIKE
def bike():
    m = M(); P = []
    MAR, GOLD, BLK = "#6E1027", "#E2B13C", "#141416"
    P.append(ball("B_tank", 0.24, (0, -0.15, 0.9), MAR, m["paint"], scl=(0.72, 1.35, 0.66), segs=32))
    for sx in (1, -1):
        P.append(ball(f"B_badge{sx}", 0.07, (0.165 * sx, -0.18, 0.9), GOLD, m["chrome"], scl=(0.25, 1.1, 0.8)))
        P.append(shaped(f"B_knee{sx}", (0.03, 0.18, 0.1), (0.15 * sx, -0.02, 0.84), BLK, m["rubber"], 0.015))
        P.append(shaped(f"B_side{sx}", (0.04, 0.24, 0.18), (0.13 * sx, 0.18, 0.66), MAR, m["paint"], 0.04))
    P.append(shaped("B_seat", (0.28, 0.72, 0.1), (0, 0.38, 0.88), "#26201C", m["seat"], 0.045))
    # engine: crankcase + finned cylinder
    P.append(shaped("B_case", (0.26, 0.42, 0.26), (0, 0.02, 0.44), "#B9BEC4", m["alloy"], 0.06))
    for k in range(6):
        P.append(shaped(f"B_fin{k}", (0.24 - k * 0.01, 0.24, 0.02), (0, -0.08, 0.6 + k * 0.04), "#8E949B", m["alloy"], 0.006))
    P.append(cyl("B_head", 0.06, 0.08, (0, -0.08, 0.86), "#C9CED4", m["chrome"], verts=12))
    # exhaust
    P.append(cyl("B_pipe", 0.035, 0.5, (-0.17, -0.15, 0.4), "#D7DADF", m["chrome"], rot=(90, 0, 0), verts=12))
    P.append(cyl("B_muff", 0.055, 0.6, (-0.2, 0.42, 0.36), "#D7DADF", m["chrome"], rot=(96, 0, 0), verts=16, bevel=0.01))
    # frame + forks + rear shocks
    P.append(cyl("B_frame", 0.032, 1.25, (0, 0.0, 0.62), BLK, m["plastic"], rot=(90, 0, 0), verts=10))
    P.append(cyl("B_down", 0.03, 0.65, (0, -0.4, 0.55), BLK, m["plastic"], rot=(-40, 0, 0), verts=10))
    for sx in (1, -1):
        P.append(cyl(f"B_fork{sx}", 0.028, 0.75, (0.08 * sx, -0.66, 0.62), "#D7DADF", m["chrome"], rot=(-20, 0, 0), verts=12))
        P.append(cyl(f"B_shock{sx}", 0.03, 0.42, (0.13 * sx, 0.62, 0.6), "#D7DADF", m["chrome"], rot=(25, 0, 0), verts=12))
        P.append(cyl(f"B_spring{sx}", 0.042, 0.26, (0.13 * sx, 0.62, 0.6), "#C8C028", m["paint"], rot=(25, 0, 0), verts=12))
    P.append(cyl("B_bar", 0.02, 0.72, (0, -0.58, 1.08), "#D7DADF", m["chrome"], rot=(0, 90, 0), verts=12))
    for sx in (1, -1):
        P.append(cyl(f"B_grip{sx}", 0.03, 0.12, (0.32 * sx, -0.58, 1.08), BLK, m["rubber"], rot=(0, 90, 0), verts=12))
        P.append(cyl(f"B_mstem{sx}", 0.01, 0.2, (0.25 * sx, -0.6, 1.18), "#D7DADF", m["chrome"], verts=6))
        P.append(ball(f"B_mir{sx}", 0.05, (0.25 * sx, -0.6, 1.29), "#D7DADF", m["chrome"], scl=(1, 0.4, 0.75)))
        P.append(ball(f"B_ind{sx}", 0.03, (0.14 * sx, -0.78, 0.98), "#FF9F1A", m["amber"], scl=(1, 1.4, 1)))
    P.append(ball("B_lamp", 0.12, (0, -0.8, 0.98), "#D7DADF", m["chrome"], scl=(1, 0.85, 1)))
    P.append(cyl("B_lens", 0.095, 0.02, (0, -0.9, 0.98), "#FFF6D6", m["lamp"], rot=(90, 0, 0), verts=24))
    P.append(cyl("B_speedo", 0.05, 0.05, (0, -0.68, 1.12), "#F0EDE6", m["chrome"], rot=(60, 0, 0), verts=16))
    P.append(shaped("B_ffend", (0.15, 0.5, 0.04), (0, -0.78, 0.66), MAR, m["paint"], 0.02, top=(1, 0.05, 0.05)))
    P.append(shaped("B_rfend", (0.17, 0.55, 0.04), (0, 0.74, 0.7), MAR, m["paint"], 0.02, rot=(-15, 0, 0)))
    P.append(shaped("B_tail", (0.1, 0.04, 0.06), (0, 1.02, 0.66), "#E0262B", m["tail"], 0.01))
    plate("B_plate", (0, 1.04, 0.56), m, P, 0.22, 0.12)
    b = join(P, "body")
    w = [wheel("wheel_f", 0.34, 0.1, (0, -0.78, 0.34), m, spokes=0, wire=True), wheel("wheel_r", 0.34, 0.12, (0, 0.72, 0.34), m, spokes=0, wire=True)]
    return b, w

# ------------------------------------------------------------------ OPEN JEEP (Thar-style)
def jeep():
    m = M(); P = []
    RED, DK, BLK = "#B3121F", "#7E0B16", "#151517"
    P.append(shaped("J_body", (1.74, 3.35, 0.6), (0, 0.0, 0.84), RED, m["paint"], 0.1, 4))
    P.append(shaped("J_hood", (1.6, 1.15, 0.2), (0, -1.1, 1.2), RED, m["paint"], 0.08, 4, top=(0.97, 0.03, 0)))
    P.append(shaped("J_grill", (1.2, 0.05, 0.46), (0, -1.69, 0.96), BLK, m["plastic"], 0.02))
    for k in range(7):
        P.append(shaped(f"J_slot{k}", (0.07, 0.06, 0.36), (-0.42 + k * 0.14, -1.71, 0.97), "#3C3C40", m["chrome"], 0.01))
    lamp_pair("J_head", 0.52, -1.72, 1.03, 0.12, m, P)
    P.append(shaped("J_bump", (1.82, 0.16, 0.2), (0, -1.78, 0.6), BLK, m["plastic"], 0.03))
    P.append(shaped("J_bumpR", (1.82, 0.16, 0.2), (0, 1.74, 0.6), BLK, m["plastic"], 0.03))
    for sx in (1, -1):
        P.append(shaped(f"J_archF{sx}", (0.3, 1.0, 0.12), (0.86 * sx, -1.08, 0.98), BLK, m["plastic"], 0.05))
        P.append(shaped(f"J_archR{sx}", (0.3, 1.0, 0.12), (0.86 * sx, 1.08, 0.98), BLK, m["plastic"], 0.05))
        P.append(shaped(f"J_step{sx}", (0.18, 1.1, 0.06), (0.9 * sx, 0.0, 0.5), BLK, m["plastic"], 0.02))
        P.append(shaped(f"J_tail{sx}", (0.12, 0.04, 0.22), (0.72 * sx, 1.69, 0.95), "#E0262B", m["tail"], 0.015))
        P.append(shaped(f"J_ind{sx}", (0.1, 0.04, 0.06), (0.78 * sx, -1.72, 0.78), "#FF9F1A", m["amber"], 0.01))
        P.append(shaped(f"J_hinge{sx}", (0.04, 0.12, 0.06), (0.88 * sx, -0.35, 1.0), "#2A2A2E", m["chrome"], 0.01))
    P.append(shaped("J_inside", (1.55, 2.1, 0.08), (0, 0.4, 1.12), "#2E241E", m["plastic"], 0.02))
    P.append(shaped("J_dash", (1.5, 0.3, 0.2), (0, -0.62, 1.32), BLK, m["plastic"], 0.04))
    P.append(cyl("J_steer", 0.17, 0.03, (0.4, -0.4, 1.48), BLK, m["rubber"], rot=(60, 0, 0), verts=24))
    for k, x in enumerate((-0.4, 0.4)):
        P.append(shaped(f"J_seat{k}", (0.55, 0.5, 0.18), (x, -0.15, 1.25), "#262020", m["seat"], 0.07))
        P.append(shaped(f"J_back{k}", (0.55, 0.14, 0.62), (x, 0.12, 1.55), "#262020", m["seat"], 0.06, top=(0.92, 0, 0)))
    P.append(shaped("J_seatR", (1.4, 0.45, 0.2), (0, 0.85, 1.25), "#262020", m["seat"], 0.07))
    P.append(shaped("J_wind", (1.52, 0.03, 0.58), (0, -0.55, 1.62), "#BFD9E6", m["glass"], 0.0, rot=(-15, 0, 0)))
    P.append(shaped("J_wframe", (1.6, 0.07, 0.06), (0, -0.47, 1.9), BLK, m["plastic"], 0.02, rot=(-15, 0, 0)))
    for sx in (1, -1):
        P.append(shaped(f"J_wside{sx}", (0.06, 0.07, 0.62), (0.78 * sx, -0.55, 1.62), BLK, m["plastic"], 0.02, rot=(-15, 0, 0)))
        P.append(cyl(f"J_roll{sx}", 0.042, 0.95, (0.74 * sx, 1.15, 1.6), BLK, m["plastic"], verts=12))
    P.append(cyl("J_rollT", 0.042, 1.48, (0, 1.15, 2.06), BLK, m["plastic"], rot=(0, 90, 0), verts=12))
    mirrors("J_", 0.86, -0.4, 1.35, m, P, 0.12, RED)
    plate("J_plateF", (0, -1.87, 0.6), m, P)
    plate("J_plateB", (0, 1.83, 0.6), m, P)
    b = join(P, "body")
    spare = wheel("J_spare", 0.36, 0.24, (0, 0, 0), m)
    spare.rotation_euler = (0, 0, math.radians(90)); spare.location = (0, 1.9, 1.0)
    bpy.ops.object.select_all(action="DESELECT"); spare.select_set(True); bpy.context.view_layer.objects.active = spare
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    b = join([b, spare], "body")
    w = [wheel(f"wheel_{n}", 0.4, 0.28, (x, y, 0.4), m, "#3A3B3F") for n, x, y in (("fl", 0.82, -1.12), ("fr", -0.82, -1.12), ("rl", 0.82, 1.1), ("rr", -0.82, 1.1))]
    return b, w

# ------------------------------------------------------------------ KSRTC BUS
def bus():
    m = M(); P = []
    RED, CREAM, GOLD, BLK = "#B8101F", "#F2ECE0", "#E9A800", "#18181A"
    P.append(shaped("U_body", (2.4, 9.0, 2.2), (0, 0, 1.75), RED, m["paint"], 0.16, 4))
    P.append(shaped("U_skirt", (2.42, 8.6, 0.32), (0, 0, 0.82), "#2A2A2C", m["plastic"], 0.04))
    P.append(shaped("U_stripe", (2.44, 9.04, 0.3), (0, 0, 1.45), CREAM, m["paint"], 0.04))
    P.append(shaped("U_stripe2", (2.44, 9.04, 0.1), (0, 0, 1.2), GOLD, m["paint"], 0.02))
    P.append(shaped("U_roof", (2.3, 8.8, 0.2), (0, 0, 2.92), CREAM, m["paint"], 0.08))
    P.append(shaped("U_ac", (1.4, 2.0, 0.22), (0, 1.4, 3.1), "#DADDE0", m["plastic"], 0.08))
    for sx in (1, -1):
        for k in range(7):
            P.append(shaped(f"U_win{sx}{k}", (0.04, 0.98, 0.78), (1.205 * sx, -3.25 + k * 1.12, 2.22), "#2F4C5B", m["glass"], 0.0))
            P.append(shaped(f"U_post{sx}{k}", (0.05, 0.1, 0.84), (1.21 * sx, -3.81 + k * 1.12, 2.22), BLK, m["plastic"], 0.0))
        for k, y in enumerate((-3.0, 2.8)):
            P.append(shaped(f"U_arch{sx}{k}", (0.06, 1.45, 0.75), (1.2 * sx, y, 0.85), BLK, m["plastic"], 0.03))
        P.append(shaped(f"U_tail{sx}", (0.22, 0.04, 0.5), (0.95 * sx, 4.51, 1.2), "#E0262B", m["tail"], 0.02))
        P.append(shaped(f"U_ind{sx}", (0.18, 0.04, 0.1), (0.85 * sx, -4.53, 1.32), "#FF9F1A", m["amber"], 0.01))
    mirrors("U_", 1.2, -4.2, 2.3, m, P, 0.3)
    P.append(shaped("U_wind", (2.24, 0.05, 1.12), (0, -4.51, 2.2), "#2F4C5B", m["glass"], 0.0))
    P.append(shaped("U_windbar", (0.05, 0.06, 1.12), (0, -4.53, 2.2), BLK, m["plastic"], 0.0))
    for sx in (1, -1): P.append(shaped(f"U_wiper{sx}", (0.6, 0.02, 0.02), (0.5 * sx, -4.55, 1.72), BLK, m["plastic"], 0.0, rot=(0, 25 * sx, 0)))
    P.append(shaped("U_back", (2.2, 0.05, 0.72), (0, 4.51, 2.3), "#2F4C5B", m["glass"], 0.0))
    P.append(shaped("U_door", (0.05, 0.92, 1.62), (-1.21, -3.0, 1.38), "#2F4C5B", m["glass"], 0.0))
    P.append(shaped("U_doorF", (0.06, 0.96, 1.66), (-1.205, -3.0, 1.38), BLK, m["plastic"], 0.0))
    P.append(shaped("U_board", (1.7, 0.05, 0.3), (0, -4.52, 2.92), "#0E0E0F", m["plastic"], 0.02))
    P.append(shaped("U_boardL", (1.3, 0.06, 0.15), (0, -4.54, 2.92), "#FFB347", m["amber"], 0.0))
    lamp_pair("U_head", 0.82, -4.52, 1.0, 0.15, m, P)
    P.append(shaped("U_grill", (1.0, 0.05, 0.35), (0, -4.52, 1.0), "#3A3A3E", m["chrome"], 0.02))
    P.append(shaped("U_bump", (2.42, 0.22, 0.26), (0, -4.56, 0.65), BLK, m["plastic"], 0.05))
    P.append(shaped("U_bumpR", (2.42, 0.22, 0.26), (0, 4.56, 0.65), BLK, m["plastic"], 0.05))
    plate("U_plateF", (0, -4.68, 0.66), m, P, 0.5, 0.14)
    plate("U_plateB", (0, 4.68, 0.66), m, P, 0.5, 0.14)
    b = join(P, "body")
    w = [wheel(f"wheel_{n}", 0.55, 0.34, (x, y, 0.55), m, "#C3C6CA", spokes=8) for n, x, y in (("fl", 1.03, -3.0), ("fr", -1.03, -3.0), ("rl", 1.03, 2.8), ("rr", -1.03, 2.8))]
    return b, w

# ------------------------------------------------------------------ HATCHBACK CAR
def car():
    m = M(); P = []
    WH, BLK = "#EDEDEA", "#161618"
    P.append(shaped("C_body", (1.66, 3.55, 0.6), (0, 0, 0.72), WH, m["paint"], 0.18, 5, top=(0.98, 0.08, 0.05)))
    P.append(shaped("C_hood", (1.6, 1.0, 0.12), (0, -1.2, 1.06), WH, m["paint"], 0.08, 4, top=(0.95, 0.12, 0)))
    P.append(shaped("C_cabin", (1.54, 2.1, 0.6), (0, 0.3, 1.32), WH, m["paint"], 0.14, 4, top=(0.86, 0.55, 0.22)))
    P.append(shaped("C_glassF", (1.32, 0.04, 0.62), (0, -0.53, 1.33), "#22323B", m["glass"], 0.0, rot=(-52, 0, 0)))
    P.append(shaped("C_glassB", (1.3, 0.04, 0.5), (0, 1.3, 1.32), "#22323B", m["glass"], 0.0, rot=(22, 0, 0)))
    for sx in (1, -1):
        P.append(shaped(f"C_side{sx}", (0.03, 1.5, 0.44), (0.725 * sx, 0.35, 1.36), "#22323B", m["glass"], 0.0, top=(1, 0.3, 0.12)))
        P.append(shaped(f"C_bpil{sx}", (0.035, 0.08, 0.46), (0.735 * sx, 0.35, 1.36), BLK, m["plastic"], 0.0))
        P.append(shaped(f"C_handle{sx}", (0.02, 0.14, 0.03), (0.83 * sx, 0.05, 1.0), "#C9CCD1", m["chrome"], 0.008))
        P.append(shaped(f"C_handle2{sx}", (0.02, 0.14, 0.03), (0.83 * sx, 0.85, 1.0), "#C9CCD1", m["chrome"], 0.008))
        P.append(shaped(f"C_line{sx}", (0.006, 0.02, 0.5), (0.83 * sx, 0.45, 0.82), "#9A9A98", m["plastic"], 0.0))
        P.append(shaped(f"C_sill{sx}", (0.06, 2.2, 0.08), (0.8 * sx, 0.0, 0.46), BLK, m["plastic"], 0.02))
        P.append(shaped(f"C_archF{sx}", (0.05, 0.9, 0.4), (0.8 * sx, -1.15, 0.6), BLK, m["plastic"], 0.03))
        P.append(shaped(f"C_archR{sx}", (0.05, 0.9, 0.4), (0.8 * sx, 1.15, 0.6), BLK, m["plastic"], 0.03))
        P.append(shaped(f"C_head{sx}", (0.42, 0.08, 0.14), (0.52 * sx, -1.75, 0.92), "#DDE7EE", m["chrome"], 0.03))
        P.append(shaped(f"C_headL{sx}", (0.3, 0.06, 0.09), (0.52 * sx, -1.785, 0.92), "#FFF6D6", m["lamp"], 0.02))
        P.append(shaped(f"C_drl{sx}", (0.36, 0.04, 0.025), (0.52 * sx, -1.79, 0.99), "#FFFFFF", m["lamp"], 0.0))
        P.append(shaped(f"C_tail{sx}", (0.32, 0.06, 0.2), (0.6 * sx, 1.76, 1.0), "#C8121D", m["tail"], 0.03))
        P.append(shaped(f"C_fog{sx}", (0.14, 0.04, 0.06), (0.6 * sx, -1.8, 0.56), "#FFF6D6", m["lamp"], 0.01))
    mirrors("C_", 0.76, -0.45, 1.2, m, P, 0.1, WH)
    P.append(shaped("C_grill", (0.86, 0.05, 0.18), (0, -1.78, 0.74), BLK, m["plastic"], 0.03))
    P.append(shaped("C_badge", (0.1, 0.03, 0.07), (0, -1.81, 0.74), "#D7DADF", m["chrome"], 0.01))
    P.append(shaped("C_bump", (1.68, 0.14, 0.24), (0, -1.76, 0.5), "#E4E4E0", m["paint"], 0.07))
    P.append(shaped("C_lip", (1.4, 0.1, 0.05), (0, -1.8, 0.38), BLK, m["plastic"], 0.02))
    P.append(shaped("C_bumpR", (1.68, 0.14, 0.24), (0, 1.76, 0.5), "#E4E4E0", m["paint"], 0.07))
    P.append(shaped("C_spoiler", (1.3, 0.22, 0.04), (0, 1.28, 1.63), WH, m["paint"], 0.015))
    P.append(shaped("C_rails", (1.2, 1.6, 0.03), (0, 0.4, 1.64), BLK, m["plastic"], 0.01))
    P.append(cyl("C_antenna", 0.008, 0.2, (0, 1.05, 1.72), BLK, m["plastic"], rot=(-30, 0, 0), verts=6))
    plate("C_plateF", (0, -1.84, 0.52), m, P)
    plate("C_plateB", (0, 1.84, 0.62), m, P)
    b = join(P, "body")
    w = [wheel(f"wheel_{n}", 0.34, 0.22, (x, y, 0.34), m, "#B7BBC0", spokes=5) for n, x, y in (("fl", 0.76, -1.15), ("fr", -0.76, -1.15), ("rl", 0.76, 1.15), ("rr", -0.76, 1.15))]
    return b, w

reset(); MATS.clear()
roots = []
for name, fn, off in (("veh_auto", auto, 0), ("veh_bike", bike, 4), ("veh_jeep", jeep, 8), ("veh_bus", bus, 14), ("veh_car", car, 21)):
    root = link(bpy.data.objects.new(name, None))
    b, ws = fn()
    for o in [b] + ws:
        mw = o.matrix_world.copy(); o.parent = root; o.matrix_world = mw
    root.location.x = off if VMODE == "preview" else 0
    roots.append(root)
if VMODE == "glb":
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUTD, "vehicles.glb"), export_format="GLB", use_selection=True, export_apply=True, export_vertex_color="MATERIAL")
    print("exported vehicles", flush=True)
else:
    sc = bpy.context.scene
    cam = studio(sc, cam_loc=(12, -20, 6.5), cam_rot=(76, 0, 22), lens=30, samples=32, res=(1400, 560))
    render(os.path.join(OUTD, "vehicles_preview.png")); print("rendered", flush=True)
