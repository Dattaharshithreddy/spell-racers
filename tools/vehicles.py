"""Drivable vehicles for MAATHU: auto-rickshaw, Bullet-style motorbike, open jeep.
Front faces -Y (-> +Z in three). Wheels are separate objects (origin at hub) so the game can spin/steer them.
python3 vehicles.py <outdir> [glb|preview]"""
import sys
OUTD = sys.argv[1]; VMODE = sys.argv[2] if len(sys.argv) > 2 else "glb"
sys.argv = [sys.argv[0], OUTD, "none"]
exec(open("heroes.py").read().split('if __name__ == "__main__":')[0])
import os

def solidc(o, hexs, mat):
    paint(o.data, lambda co, n: hexc(hexs)); finish(o, mat); return o
def rbox(name, size, loc, hexs, mat, bevel=0.04, rot=(0, 0, 0)):
    o = prim("cube", name, size=1, loc=loc, scl=size, rot=rot)
    if bevel: b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 3
    return solidc(o, hexs, mat)
def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for p in objs:
        p.select_set(True); bpy.context.view_layer.objects.active = p
        for md in list(p.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); j = bpy.context.object; j.name = name; return j
def wheel(name, r, w, loc, tyre_m, rim_m, rim_hex="#C9CCD1"):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=w, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
    t = bpy.context.object; bpy.ops.object.transform_apply(rotation=True)
    bv = t.modifiers.new("b", "BEVEL"); bv.width = r * 0.18; bv.segments = 3
    solidc(t, "#1C1B1F", tyre_m)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r * 0.55, depth=w * 1.06, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
    h = bpy.context.object; bpy.ops.object.transform_apply(rotation=True); solidc(h, rim_hex, rim_m)
    for k in range(5):  # spokes so spinning is visible
        a = k / 5 * math.tau
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, math.cos(a) * r * 0.3, math.sin(a) * r * 0.3)); s = bpy.context.object
        s.scale = (w * 1.1, r * 0.12, r * 0.6); s.rotation_euler = (a, 0, 0); bpy.ops.object.transform_apply(rotation=True, scale=True)
        solidc(s, "#8F939A", rim_m)
    j = join([t, h] + [o for o in bpy.context.scene.objects if o.type == "MESH" and o.name.startswith("Cube")], name)
    for f in j.data.polygons: f.use_smooth = True
    j.location = loc
    return j

def auto():
    body = vcol_mat("v_paint", 0.35); tyre = vcol_mat("v_tyre", 0.9); chrome = vcol_mat("v_chrome", 0.15, metal=1.0)
    canv = vcol_mat("v_canvas", 0.85); glass = vcol_mat("v_glass", 0.05); lamp = vcol_mat("v_lamp", 0.1, emit=2.0)
    GREEN, YEL = "#2F9E44", "#F7C51E"
    P = []
    P.append(rbox("A_floor", (1.32, 2.5, 0.14), (0, 0.05, 0.36), "#262626", tyre, 0.02))
    P.append(rbox("A_cowl", (0.95, 0.75, 0.75), (0, -0.92, 0.72), GREEN, body, 0.18))
    P.append(rbox("A_nose", (0.6, 0.3, 0.55), (0, -1.28, 0.58), GREEN, body, 0.14))
    P.append(rbox("A_rear", (1.36, 1.25, 0.62), (0, 0.6, 0.72), GREEN, body, 0.16))
    P.append(rbox("A_stripe", (1.38, 1.27, 0.07), (0, 0.6, 0.95), YEL, body, 0.02))
    P.append(rbox("A_roof", (1.46, 2.15, 0.12), (0, 0.05, 1.86), YEL, body, 0.06))
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.73, depth=2.1, location=(0, 0.05, 1.5), rotation=(math.radians(90), 0, 0))
    can = bpy.context.object; bpy.ops.object.transform_apply(rotation=True)
    import bmesh as _bm
    bm = _bm.new(); bm.from_mesh(can.data); _bm.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 1.62], context="VERTS"); bm.to_mesh(can.data); bm.free()
    can.scale = (1, 1, 0.55); bpy.ops.object.transform_apply(scale=True)
    sol = can.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.04
    P.append(solidc(can, "#1E1E1E", canv))
    P.append(rbox("A_back", (1.38, 0.06, 0.95), (0, 1.12, 1.35), "#1E1E1E", canv, 0.02))
    for sx in (1, -1):
        P.append(rbox(f"A_side{sx}", (0.05, 0.9, 0.62), (0.68 * sx, 0.62, 1.42), "#1E1E1E", canv, 0.01))
        o = prim("cyl", f"A_pillar{sx}", vertices=10, radius=0.03, depth=1.15, loc=(0.6 * sx, -0.95, 1.35)); P.append(solidc(o, "#C9CCD1", chrome))
    P.append(rbox("A_wind", (1.05, 0.03, 0.62), (0, -1.0, 1.4), "#BFE3F2", glass, 0.0, rot=(-12, 0, 0)))
    o = prim("cyl", "A_bar", vertices=10, radius=0.025, depth=0.85, loc=(0, -0.7, 1.12), rot=(0, 90, 0)); P.append(solidc(o, "#C9CCD1", chrome))
    o = prim("sphere", "A_lamp", segments=16, ring_count=8, radius=0.11, loc=(0, -1.43, 0.82), scl=(1, 0.6, 1)); P.append(solidc(o, "#FFF6C8", lamp))
    P.append(rbox("A_seatD", (0.5, 0.42, 0.14), (0, -0.4, 0.82), "#3A2A22", canv, 0.04))
    P.append(rbox("A_seatP", (1.2, 0.5, 0.18), (0, 0.55, 1.08), "#3A2A22", canv, 0.05))
    P.append(rbox("A_seatPB", (1.2, 0.12, 0.5), (0, 0.85, 1.35), "#3A2A22", canv, 0.04))
    P.append(rbox("A_plate", (0.42, 0.02, 0.14), (0, -1.44, 0.48), "#FFFFFF", body, 0.0))
    b = join(P, "body")
    w = [wheel("wheel_f", 0.26, 0.16, (0, -1.08, 0.26), tyre, chrome), wheel("wheel_rl", 0.27, 0.18, (0.62, 0.72, 0.27), tyre, chrome), wheel("wheel_rr", 0.27, 0.18, (-0.62, 0.72, 0.27), tyre, chrome)]
    return b, w

def bike():
    paint_m = vcol_mat("v_paint", 0.35); tyre = vcol_mat("v_tyre", 0.9); chrome = vcol_mat("v_chrome", 0.15, metal=1.0)
    canv = vcol_mat("v_canvas", 0.85); lamp = vcol_mat("v_lamp", 0.1, emit=2.0)
    P = []
    o = prim("sphere", "B_tank", segments=24, ring_count=12, radius=0.24, loc=(0, -0.15, 0.88), scl=(0.75, 1.35, 0.7)); P.append(solidc(o, "#7D1630", paint_m))
    for sx in (1, -1):
        o = prim("sphere", f"B_badge{sx}", segments=12, ring_count=6, radius=0.07, loc=(0.17 * sx, -0.18, 0.88), scl=(0.3, 1, 1)); P.append(solidc(o, "#E2B13C", chrome))
    P.append(rbox("B_seat", (0.3, 0.75, 0.1), (0, 0.38, 0.86), "#2A1C16", canv, 0.05))
    P.append(rbox("B_engine", (0.3, 0.45, 0.32), (0, 0.0, 0.48), "#9EA3AA", chrome, 0.06))
    o = prim("cyl", "B_pipe", vertices=12, radius=0.05, depth=1.0, loc=(-0.2, 0.35, 0.36), rot=(90, 0, 0)); P.append(solidc(o, "#C9CCD1", chrome))
    o = prim("cyl", "B_frame", vertices=10, radius=0.035, depth=1.25, loc=(0, 0.0, 0.6), rot=(90, 0, 0)); P.append(solidc(o, "#1C1B1F", tyre))
    o = prim("cyl", "B_fork", vertices=10, radius=0.03, depth=0.75, loc=(0, -0.68, 0.62), rot=(-20, 0, 0)); P.append(solidc(o, "#C9CCD1", chrome))
    o = prim("cyl", "B_bar", vertices=10, radius=0.022, depth=0.7, loc=(0, -0.58, 1.08), rot=(0, 90, 0)); P.append(solidc(o, "#C9CCD1", chrome))
    o = prim("sphere", "B_head", segments=16, ring_count=8, radius=0.12, loc=(0, -0.8, 0.98)); P.append(solidc(o, "#C9CCD1", chrome))
    o = prim("cyl", "B_lens", vertices=16, radius=0.09, depth=0.02, loc=(0, -0.91, 0.98), rot=(90, 0, 0)); P.append(solidc(o, "#FFF6C8", lamp))
    P.append(rbox("B_fender", (0.16, 0.5, 0.05), (0, 0.72, 0.68), "#7D1630", paint_m, 0.02, rot=(-15, 0, 0)))
    b = join(P, "body")
    w = [wheel("wheel_f", 0.34, 0.12, (0, -0.78, 0.34), tyre, chrome), wheel("wheel_r", 0.34, 0.14, (0, 0.72, 0.34), tyre, chrome)]
    return b, w

def jeep():
    paint_m = vcol_mat("v_paint", 0.4); tyre = vcol_mat("v_tyre", 0.9); chrome = vcol_mat("v_chrome", 0.15, metal=1.0)
    canv = vcol_mat("v_canvas", 0.85); glass = vcol_mat("v_glass", 0.05); lamp = vcol_mat("v_lamp", 0.1, emit=2.0)
    OL, DK = "#C8102E", "#8E0B20"
    P = []
    P.append(rbox("J_body", (1.75, 3.4, 0.62), (0, 0.0, 0.82), OL, paint_m, 0.12))
    P.append(rbox("J_hood", (1.6, 1.15, 0.22), (0, -1.1, 1.18), OL, paint_m, 0.1))
    P.append(rbox("J_grill", (1.2, 0.06, 0.45), (0, -1.71, 0.95), "#1C1B1F", tyre, 0.02))
    for sx in (1, -1):
        o = prim("cyl", f"J_lamp{sx}", vertices=16, radius=0.12, depth=0.06, loc=(0.55 * sx, -1.74, 1.02), rot=(90, 0, 0)); P.append(solidc(o, "#FFF6C8", lamp))
        P.append(rbox(f"J_arch{sx}", (0.28, 0.9, 0.12), (0.86 * sx, -1.05, 0.95), DK, paint_m, 0.05))
        P.append(rbox(f"J_arch2{sx}", (0.28, 0.9, 0.12), (0.86 * sx, 1.05, 0.95), DK, paint_m, 0.05))
    P.append(rbox("J_inside", (1.55, 2.1, 0.1), (0, 0.4, 1.1), "#3A2A22", canv, 0.02))
    P.append(rbox("J_seatF", (1.4, 0.45, 0.25), (0, -0.25, 1.25), "#2A1C16", canv, 0.08))
    P.append(rbox("J_seatFB", (1.4, 0.12, 0.5), (0, 0.0, 1.5), "#2A1C16", canv, 0.05))
    P.append(rbox("J_seatR", (1.4, 0.45, 0.25), (0, 0.85, 1.25), "#2A1C16", canv, 0.08))
    P.append(rbox("J_wind", (1.55, 0.04, 0.6), (0, -0.55, 1.6), "#BFE3F2", glass, 0.0, rot=(-15, 0, 0)))
    P.append(rbox("J_wframe", (1.62, 0.07, 0.07), (0, -0.48, 1.9), "#1C1B1F", tyre, 0.02, rot=(-15, 0, 0)))
    for sx in (1, -1):
        o = prim("cyl", f"J_roll{sx}", vertices=10, radius=0.045, depth=0.9, loc=(0.74 * sx, 1.15, 1.55)); P.append(solidc(o, "#1C1B1F", tyre))
    o = prim("cyl", "J_rollT", vertices=10, radius=0.045, depth=1.48, loc=(0, 1.15, 2.0), rot=(0, 90, 0)); P.append(solidc(o, "#1C1B1F", tyre))
    o = prim("cyl", "J_spare", vertices=24, radius=0.36, depth=0.2, loc=(0, 1.8, 1.0), rot=(90, 0, 0)); P.append(solidc(o, "#1C1B1F", tyre))
    b = join(P, "body")
    w = [wheel(f"wheel_{n}", 0.4, 0.28, (x, y, 0.4), tyre, chrome) for n, x, y in (("fl", 0.82, -1.15), ("fr", -0.82, -1.15), ("rl", 0.82, 1.1), ("rr", -0.82, 1.1))]
    return b, w


def bus():
    paint_m = vcol_mat("v_paint", 0.4); tyre = vcol_mat("v_tyre", 0.9); chrome = vcol_mat("v_chrome", 0.15, metal=1.0)
    glass = vcol_mat("v_glass", 0.05); lamp = vcol_mat("v_lamp", 0.1, emit=2.0); canv = vcol_mat("v_canvas", 0.85)
    P = []
    P.append(rbox("U_body", (2.4, 9.0, 2.2), (0, 0, 1.75), "#C8102E", paint_m, 0.18))
    P.append(rbox("U_stripe", (2.44, 9.04, 0.32), (0, 0, 1.45), "#F4EFE6", paint_m, 0.05))
    P.append(rbox("U_stripe2", (2.44, 9.04, 0.12), (0, 0, 1.18), "#F2B705", paint_m, 0.03))
    P.append(rbox("U_roof", (2.3, 8.8, 0.18), (0, 0, 2.9), "#F4EFE6", paint_m, 0.08))
    for sx in (1, -1):
        for k in range(7):
            P.append(rbox(f"U_win{sx}{k}", (0.04, 0.95, 0.75), (1.21 * sx, -3.3 + k * 1.15, 2.2), "#3F6578", glass, 0.0))
    P.append(rbox("U_wind", (2.2, 0.05, 1.05), (0, -4.51, 2.2), "#3F6578", glass, 0.0))
    P.append(rbox("U_back", (2.2, 0.05, 0.7), (0, 4.51, 2.3), "#3F6578", glass, 0.0))
    P.append(rbox("U_door", (0.05, 0.9, 1.6), (-1.21, -3.0, 1.35), "#2A2A2E", canv, 0.0))
    P.append(rbox("U_board", (1.6, 0.05, 0.3), (0, -4.52, 2.9), "#111111", canv, 0.02))
    P.append(rbox("U_boardL", (1.2, 0.06, 0.16), (0, -4.54, 2.9), "#FFB347", lamp, 0.0))
    for sx in (1, -1):
        o = prim("cyl", f"U_lamp{sx}", vertices=16, radius=0.15, depth=0.05, loc=(0.85 * sx, -4.52, 1.0), rot=(90, 0, 0)); P.append(solidc(o, "#FFF6C8", lamp))
    P.append(rbox("U_bump", (2.4, 0.2, 0.25), (0, -4.55, 0.65), "#2A2A2E", tyre, 0.05))
    b = join(P, "body")
    w = [wheel(f"wheel_{n}", 0.55, 0.35, (x, y, 0.55), tyre, chrome) for n, x, y in (("fl", 1.05, -3.0), ("fr", -1.05, -3.0), ("rl", 1.05, 2.8), ("rr", -1.05, 2.8))]
    return b, w

def car():
    paint_m = vcol_mat("v_paint", 0.3); tyre = vcol_mat("v_tyre", 0.9); chrome = vcol_mat("v_chrome", 0.15, metal=1.0)
    glass = vcol_mat("v_glass", 0.05); lamp = vcol_mat("v_lamp", 0.1, emit=2.0)
    P = []
    P.append(rbox("C_body", (1.65, 3.5, 0.62), (0, 0, 0.72), "#F4F4F2", paint_m, 0.2))
    P.append(rbox("C_cabin", (1.5, 2.0, 0.6), (0, 0.25, 1.3), "#F4F4F2", paint_m, 0.22))
    P.append(rbox("C_glassF", (1.42, 0.05, 0.5), (0, -0.78, 1.3), "#3F6578", glass, 0.0, rot=(-30, 0, 0)))
    P.append(rbox("C_glassB", (1.42, 0.05, 0.45), (0, 1.25, 1.3), "#3F6578", glass, 0.0, rot=(25, 0, 0)))
    for sx in (1, -1):
        P.append(rbox(f"C_side{sx}", (0.04, 1.6, 0.45), (0.76 * sx, 0.25, 1.32), "#3F6578", glass, 0.0))
        o = prim("cyl", f"C_lamp{sx}", vertices=16, radius=0.13, depth=0.05, loc=(0.55 * sx, -1.76, 0.85), rot=(90, 0, 0)); P.append(solidc(o, "#FFF6C8", lamp))
        P.append(rbox(f"C_tail{sx}", (0.3, 0.05, 0.14), (0.6 * sx, 1.76, 0.9), "#C8102E", lamp, 0.0))
    P.append(rbox("C_grill", (0.8, 0.05, 0.2), (0, -1.76, 0.65), "#2A2A2E", tyre, 0.02))
    b = join(P, "body")
    w = [wheel(f"wheel_{n}", 0.34, 0.24, (x, y, 0.34), tyre, chrome) for n, x, y in (("fl", 0.78, -1.15), ("fr", -0.78, -1.15), ("rl", 0.78, 1.15), ("rr", -0.78, 1.15))]
    return b, w

reset(); MATS.clear()
roots = []
for name, fn, off in (("veh_auto", auto, 0), ("veh_bike", bike, 4), ("veh_jeep", jeep, 8), ("veh_bus", bus, 14), ("veh_car", car, 20)):
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
    cam = studio(sc, cam_loc=(10, -18, 7.0), cam_rot=(72, 0, 18), lens=28, samples=24, res=(1200, 560))
    render(os.path.join(OUTD, "vehicles_preview.png")); print("rendered", flush=True)
