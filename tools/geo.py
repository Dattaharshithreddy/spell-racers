"""Build the MAATHU world: real Karnataka geography -> game data.
python3 geo.py <datadir> <outdir>
Outputs: height.bin (Uint16), district.bin (Uint8), color.png, veg.png, world.json
"""
import json, math, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

DATA, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

LON0, LAT0 = 76.2, 15.0
KX = math.cos(math.radians(LAT0)) * 111.32 * 4  # units per degree lon
KZ = 110.57 * 4
X0, X1, Z0, Z1 = -1060, 1100, -1620, 1620
CELL = 5.0
NX = int((X1 - X0) / CELL) + 1; NZ = int((Z1 - Z0) / CELL) + 1
EXAG = 6.0
M2U = 4.0 / 1000 * EXAG  # metres -> units vertically
print("grid", NX, NZ)

def proj(lon, lat): return ((lon - LON0) * KX, (LAT0 - lat) * KZ)
def to_px(x, z): return ((x - X0) / CELL, (z - Z0) / CELL)
def ll_px(lon, lat): return to_px(*proj(lon, lat))
LON_MIN = LON0 + X0 / KX; LON_MAX = LON0 + X1 / KX; LAT_MAX = LAT0 - Z0 / KZ; LAT_MIN = LAT0 - Z1 / KZ
print("bbox lon", round(LON_MIN, 2), round(LON_MAX, 2), "lat", round(LAT_MIN, 2), round(LAT_MAX, 2))

gx, gz = np.meshgrid(np.arange(NX), np.arange(NZ))
LON = LON0 + (X0 + gx * CELL) / KX
LAT = LAT0 - (Z0 + gz * CELL) / KZ

def rings(geom):
    if geom["type"] == "Polygon": return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon": return geom["coordinates"]
    return []

def in_bbox(coords):
    xs = [c[0] for c in coords]; ys = [c[1] for c in coords]
    return max(xs) > LON_MIN - 0.5 and min(xs) < LON_MAX + 0.5 and max(ys) > LAT_MIN - 0.5 and min(ys) < LAT_MAX + 0.5

# ------------------------------------------------------------------ land + districts
NAMES = {"Bangalore": "Bengaluru Urban", "Bangalore Rural": "Bengaluru Rural", "Belgaum": "Belagavi", "Bellary": "Ballari",
         "Bijapur": "Vijayapura", "Chamrajnagar": "Chamarajanagar", "Chikmagalur": "Chikkamagaluru", "Gulbarga": "Kalaburagi",
         "Mysore": "Mysuru", "Shimoga": "Shivamogga", "Tumkur": "Tumakuru", "Chikkaballapura": "Chikkaballapur"}
dj = json.load(open(os.path.join(DATA, "ka_districts.geojson")))
land = Image.new("L", (NX, NZ), 0); ld = ImageDraw.Draw(land)
dist = Image.new("L", (NX, NZ), 0); dd = ImageDraw.Draw(dist)
districts = []
ka = sorted([f for f in dj["features"] if f["properties"]["ST_NM"] == "Karnataka"], key=lambda f: f["properties"]["DISTRICT"])
for f in dj["features"]:
    for poly in rings(f["geometry"]):
        if not in_bbox(poly[0]): continue
        ld.polygon([ll_px(*c[:2]) for c in poly[0]], fill=255)
for i, f in enumerate(ka, start=1):
    nm = f["properties"]["DISTRICT"]; nm = NAMES.get(nm, nm)
    pts = []
    for poly in rings(f["geometry"]):
        dd.polygon([ll_px(*c[:2]) for c in poly[0]], fill=i)
        pts += poly[0]
    lon = sum(p[0] for p in pts) / len(pts); lat = sum(p[1] for p in pts) / len(pts)
    districts.append(dict(id=i, name=nm, lon=round(lon, 3), lat=round(lat, 3)))
LAND = np.array(land) > 0
DIST = np.array(dist)
# fill tiny gaps between districts
DIST = np.where((DIST == 0) & LAND, ndimage.grey_dilation(DIST, size=3) * (ndimage.grey_dilation(DIST, size=3) > 0), DIST)
KA = DIST > 0
print("land cells", LAND.sum(), "karnataka cells", KA.sum())

# distance to sea in km
dsea = ndimage.distance_transform_edt(LAND) * CELL / 4.0

# ------------------------------------------------------------------ elevation (metres)
ANCH = [(12.97, 77.59, 920), (12.30, 76.65, 770), (12.52, 76.9, 680), (13.0, 76.1, 960), (13.34, 77.10, 820), (13.14, 78.13, 850),
        (13.43, 77.73, 900), (11.92, 76.94, 700), (13.32, 75.77, 1090), (13.93, 75.57, 570), (14.46, 75.92, 600), (14.23, 76.40, 730),
        (15.14, 76.92, 490), (15.27, 76.39, 470), (16.2, 77.36, 400), (17.33, 76.83, 450), (17.91, 77.52, 650), (16.83, 75.71, 600),
        (16.18, 75.70, 540), (15.85, 74.50, 750), (15.46, 75.01, 700), (15.36, 75.12, 640), (15.43, 75.63, 650), (14.79, 75.40, 570),
        (15.35, 76.15, 530), (16.77, 77.14, 390), (14.62, 74.84, 600), (12.42, 75.74, 1150), (12.94, 75.78, 950), (12.74, 77.83, 880),
        (11.68, 76.13, 900), (16.7, 74.24, 550), (17.66, 75.9, 450), (17.38, 78.48, 540), (14.68, 77.6, 350), (15.83, 78.05, 280),
        (12.52, 78.21, 510), (11.34, 77.72, 180), (11.6, 78.5, 250), (18.5, 74.5, 600), (18.4, 76.5, 550), (18.4, 78.0, 520),
        (13.6, 78.5, 650), (12.0, 75.8, 300), (11.6, 75.9, 200), (14.0, 77.0, 600), (13.6, 76.6, 750), (16.0, 76.6, 500)]
alat = np.array([a[0] for a in ANCH]); alon = np.array([a[1] for a in ANCH]); aval = np.array([a[2] for a in ANCH], float)
P = np.zeros_like(LON); W = np.zeros_like(LON)
for la, lo, v in ANCH:
    d2 = ((LON - lo) * 1.03) ** 2 + (LAT - la) ** 2
    w = 1.0 / (d2 + 0.02) ** 1.6
    P += w * v; W += w
P /= W

def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# Western Ghats: escarpment distance + crest height vary with latitude
d_esc = np.interp(LAT, [11.5, 12.5, 13.5, 14.5, 15.5, 16.5, 18.5], [35, 38, 30, 24, 30, 35, 40])
crest = np.interp(LAT, [11.5, 12.2, 12.8, 13.2, 13.6, 14.3, 15.0, 15.8, 16.8, 18.5], [1200, 1250, 1050, 1350, 1100, 820, 760, 900, 950, 1000])

rng = np.random.default_rng(42)
def fbm(oct=5, base=8, seed=0):
    r = np.random.default_rng(seed); out = np.zeros((NZ, NX)); amp = 1.0; tot = 0
    for o in range(oct):
        n = base * 2 ** o
        g = r.random((n + 1, int(n * NX / NZ) + 2))
        up = ndimage.zoom(g, (NZ / g.shape[0], NX / g.shape[1]), order=3)[:NZ, :NX]
        out += amp * (up - 0.5); tot += amp; amp *= 0.5
    return out / tot
N1 = fbm(6, 6, 1); N2 = fbm(5, 20, 2); RID = 1 - np.abs(fbm(5, 14, 3) * 2)  # ridged

coastal = 45 * sstep(0, 18, dsea) + 25 * N2
rise = sstep(0, 1, (dsea - d_esc) / 14.0)
ghat = crest * np.exp(-((dsea - (d_esc + 22)) / 26.0) ** 2) * (0.55 + 0.75 * RID * (0.6 + 0.8 * np.clip(fbm(4, 40, 21) + 0.5, 0, 1)))
E = coastal * (1 - rise) + np.maximum(P, ghat) * rise + ghat * (1 - rise) * sstep(d_esc - 10, d_esc, dsea)
E += (N1 * 90 + N2 * 35) * sstep(0, 20, dsea)

PEAKS = [(13.39, 75.72, 1930, 9), (13.13, 75.27, 1890, 10), (12.21, 75.63, 1750, 8), (12.66, 75.69, 1710, 7), (11.95, 75.98, 1600, 7),
         (13.37, 77.68, 1480, 4), (12.27, 76.67, 1060, 3.2), (11.99, 77.14, 1600, 9), (11.95, 77.59, 1300, 8), (12.92, 77.29, 1230, 3.5),
         (13.17, 77.23, 1370, 3.5), (14.23, 76.40, 900, 6), (15.92, 75.68, 700, 5), (13.5, 75.4, 1450, 9), (14.03, 74.95, 1000, 8),
         (15.3, 74.3, 1000, 9), (12.78, 75.5, 1300, 9)]
for la, lo, h, rkm in PEAKS:
    d = np.sqrt(((LON - lo) * 107.5) ** 2 + ((LAT - la) * 110.6) ** 2)
    bump = np.exp(-(d / rkm) ** 2)
    E = np.maximum(E, E * (1 - bump) + h * bump * (0.92 + 0.08 * RID))

# Hampi boulder hills: bumpy granite
d_h = np.sqrt(((LON - 76.46) * 107.5) ** 2 + ((LAT - 15.33) * 110.6) ** 2)
E += np.exp(-(d_h / 9) ** 2) * (np.clip(fbm(4, 60, 7), 0, 1) * 220)

# ------------------------------------------------------------------ rivers
rv = json.load(open(os.path.join(DATA, "ne_10m_rivers_lake_centerlines_scale_rank.geojson")))
rivers = []
def lines(geom):
    if geom["type"] == "LineString": return [geom["coordinates"]]
    if geom["type"] == "MultiLineString": return geom["coordinates"]
    return []
for f in rv["features"]:
    for ln in lines(f["geometry"]):
        if not in_bbox(ln): continue
        pts = [c for c in ln if LON_MIN - .3 < c[0] < LON_MAX + .3 and LAT_MIN - .3 < c[1] < LAT_MAX + .3]
        if len(pts) < 2: continue
        rivers.append(dict(name=f["properties"].get("name") or "", rank=f["properties"].get("scalerank", 9), pts=pts))
# Sharavathi (Jog Falls) + Netravati + Kali: west-flowing rivers the 10m set lacks
EXTRA_R = [("Sharavathi", [(75.05, 14.02), (74.93, 14.1), (74.85, 14.18), (74.793, 14.2269), (74.7, 14.26), (74.58, 14.27), (74.44, 14.28)]),
           ("Netravati", [(75.55, 12.98), (75.3, 12.88), (75.1, 12.85), (74.95, 12.86), (74.84, 12.84)]),
           ("Kali", [(74.75, 15.25), (74.6, 15.12), (74.4, 15.02), (74.25, 14.92), (74.12, 14.84)]),
           ("Kabini", [(76.0, 11.82), (76.25, 11.95), (76.5, 12.05), (76.75, 12.2)]),
           ("Hemavati", [(75.6, 13.1), (75.9, 12.95), (76.25, 12.85), (76.5, 12.62), (76.62, 12.43)])]
for nm, pts in EXTRA_R:
    if not any(nm in r["name"] for r in rivers): rivers.append(dict(name=nm, rank=6, pts=[list(p) for p in pts]))
riv_mask = Image.new("L", (NX, NZ), 0); rmd = ImageDraw.Draw(riv_mask)
for r in rivers:
    w = 3 if r["rank"] <= 5 else 2
    rmd.line([ll_px(*p[:2]) for p in r["pts"]], fill=255, width=w)
RM = np.array(riv_mask.filter(ImageFilter.GaussianBlur(1.6))) / 255.0
RM = np.clip(RM * 2.2, 0, 1)
# valley: smooth terrain near rivers, then carve
smoothE = ndimage.gaussian_filter(E, 6)
valley = np.clip(ndimage.gaussian_filter(RM, 5) * 2.5, 0, 1)
E = E * (1 - valley * 0.8) + smoothE * valley * 0.8 - valley * 40
E -= RM * 70

# sea
E = np.where(LAND, np.maximum(E, 2), -60 - np.clip(ndimage.distance_transform_edt(~LAND) * CELL / 4, 0, 60) * 2)
E = ndimage.gaussian_filter(E, 0.7)
H = E * M2U  # units
print("height range", H.min(), H.max())

# ------------------------------------------------------------------ roads
rj = json.load(open(os.path.join(DATA, "ne_10m_roads.geojson")))
roads = []
for f in rj["features"]:
    pr = f["properties"]
    if pr.get("type") not in ("Major Highway", "Road", "Secondary Highway", "Unknown"): continue
    for ln in lines(f["geometry"]):
        if not in_bbox(ln): continue
        pts = [c for c in ln if LON_MIN < c[0] < LON_MAX and LAT_MIN < c[1] < LAT_MAX]
        if len(pts) < 2: continue
        roads.append(dict(type=pr.get("type"), name=pr.get("name") or pr.get("label") or "", pts=pts))
print("roads", len(roads), "rivers", len(rivers))

# ------------------------------------------------------------------ cities
pj = json.load(open(os.path.join(DATA, "ne_10m_populated_places_simple.geojson")))
cities = []
for f in pj["features"]:
    pr = f["properties"]; lon, lat = f["geometry"]["coordinates"]
    if not (LON_MIN < lon < LON_MAX and LAT_MIN < lat < LAT_MAX): continue
    px, pz = ll_px(lon, lat); ix, iz = int(px), int(pz)
    if 0 <= ix < NX and 0 <= iz < NZ and DIST[iz, ix] > 0:
        cities.append(dict(name=pr["name"], lon=lon, lat=lat, pop=int(pr.get("pop_max") or 0)))
NAMEFIX = {"Bangalore": "Bengaluru", "Mysore": "Mysuru", "Mangalore": "Mangaluru", "Belgaum": "Belagavi", "Bellary": "Ballari",
           "Bijapur": "Vijayapura", "Gulbarga": "Kalaburagi", "Shimoga": "Shivamogga", "Tumkur": "Tumakuru", "Hubli": "Hubballi",
           "Hospet": "Hosapete", "Chikmagalur": "Chikkamagaluru", "Karwar": "Karwar", "Davangere": "Davanagere"}
for c in cities: c["name"] = NAMEFIX.get(c["name"], c["name"])
have = {c["name"] for c in cities}
for nm, lat, lon, pop in [("Udupi", 13.34, 74.75, 150000), ("Madikeri", 12.42, 75.74, 35000), ("Hampi", 15.335, 76.46, 3000),
                          ("Gokarna", 14.55, 74.32, 25000), ("Murudeshwar", 14.094, 74.484, 15000), ("Badami", 15.92, 75.68, 30000),
                          ("Bidar", 17.91, 77.52, 220000), ("Chitradurga", 14.23, 76.4, 140000), ("Hassan", 13.0, 76.1, 155000),
                          ("Sagara", 14.17, 75.03, 55000), ("Sirsi", 14.62, 74.84, 65000), ("Kolar", 13.14, 78.13, 140000)]:
    if nm not in have: cities.append(dict(name=nm, lon=lon, lat=lat, pop=pop))

# ------------------------------------------------------------------ colour + vegetation maps
def hx(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
C = np.zeros((NZ, NX, 3))
west = sstep(76.6, 75.6, LON) * sstep(15.6, 14.9, LAT) + sstep(75.0, 74.55, LON) * sstep(16.3, 15.6, LAT)  # Malnad / wet west
west = np.clip(west, 0, 1)
dry_n = sstep(15.2, 16.4, LAT) * (1 - west)
fields = (fbm(3, 90, 11) > 0.0).astype(float)
plateau = hx("#C2A660") * (1 - fields[..., None]) + hx("#A3A64E") * fields[..., None]
red_soil = hx("#B9764A")
black_soil = hx("#6E5A44")
forest = hx("#2F6B34"); malnad = hx("#4C8A3A"); sand = hx("#E8D29A"); rock = hx("#A88C72")
E_m = E
C[:] = plateau
south_red = sstep(14.2, 13.0, LAT) * (1 - west)
C = C * (1 - south_red[..., None] * 0.45) + red_soil * south_red[..., None] * 0.45
C = C * (1 - dry_n[..., None] * 0.5) + black_soil * dry_n[..., None] * 0.5
C = C * (1 - dry_n[..., None] * 0.25) + hx("#D2B572") * dry_n[..., None] * 0.25
C = C * (1 - west[..., None]) + malnad * west[..., None]
fz = np.clip(sstep(450, 900, E_m) * sstep(130, 30, dsea) + sstep(1000, 1300, E_m) * 0.6, 0, 1) * (LAT < 16.3)
C = C * (1 - fz[..., None]) + forest * fz[..., None]
beach = sstep(2.2, 0.6, dsea) * LAND
C = C * (1 - beach[..., None]) + sand * beach[..., None]
hampi = np.exp(-(d_h / 8) ** 2)
C = C * (1 - hampi[..., None] * 0.7) + rock * hampi[..., None] * 0.7
green_r = np.clip(ndimage.gaussian_filter(RM, 3) * 3, 0, 1)
C = C * (1 - green_r[..., None] * 0.6) + hx("#5E9A3E") * green_r[..., None] * 0.6
C *= (0.92 + 0.16 * (fbm(4, 120, 13)[..., None] + 0.5))
C = np.where(LAND[..., None], C, hx("#2C7FA8"))
C = np.clip(C, 0, 255).astype(np.uint8)
Image.fromarray(C).save(os.path.join(OUT, "color.png"), optimize=True)

trees = np.clip(fz * 0.9 + west * 0.35 + green_r * 0.4 + (1 - dry_n) * 0.08, 0, 1) * LAND * (1 - beach) * (1 - hampi * 0.8) * (RM < 0.3)
palms = np.clip(sstep(25, 3, dsea) * sstep(0.5, 3, dsea), 0, 1) * LAND * (LAT < 16)
rocks = np.clip(hampi * 1.2 + sstep(0.4, 0.9, fbm(3, 30, 17)) * 0.15 * dry_n, 0, 1) * LAND
V = np.stack([trees, palms, rocks, KA.astype(float)], -1) * 255
Image.fromarray(V.astype(np.uint8), "RGBA").save(os.path.join(OUT, "veg.png"), optimize=True)

# ------------------------------------------------------------------ binaries
HMIN, HSCALE = -40.0, 1000.0
Hq = np.clip((H - HMIN) * HSCALE / 100, 0, 65535).astype(np.uint16)  # 0.1 unit... resolution 0.1/1? -> (H+40)*10
Hq = np.clip((H - HMIN) * 500, 0, 65535).astype("<u2")
Hq.tofile(os.path.join(OUT, "height.bin"))
DIST.astype(np.uint8).tofile(os.path.join(OUT, "district.bin"))

def pl(pts, step=1):
    out = []
    for p in pts[::step]:
        x, z = proj(p[0], p[1]); out.append([round(x, 1), round(z, 1)])
    if pts and (len(pts) - 1) % step: x, z = proj(pts[-1][0], pts[-1][1]); out.append([round(x, 1), round(z, 1)])
    return out
world = dict(lon0=LON0, lat0=LAT0, kx=KX, kz=KZ, x0=X0, z0=Z0, cell=CELL, nx=NX, nz=NZ, hmin=HMIN, hq=500, m2u=M2U,
             districts=[dict(d, x=round(proj(d["lon"], d["lat"])[0], 1), z=round(proj(d["lon"], d["lat"])[1], 1)) for d in districts],
             cities=[dict(c, x=round(proj(c["lon"], c["lat"])[0], 1), z=round(proj(c["lon"], c["lat"])[1], 1)) for c in cities],
             rivers=[dict(name=r["name"], rank=r["rank"], pts=pl(r["pts"])) for r in rivers],
             roads=[dict(type=r["type"], name=r["name"], pts=pl(r["pts"])) for r in roads])
json.dump(world, open(os.path.join(OUT, "world.json"), "w"), separators=(",", ":"))
# preview
prev = Image.fromarray(C).copy()
sh = np.clip(128 + (np.gradient(H, axis=1) - np.gradient(H, axis=0)) * 60, 0, 255)
pv = (np.array(prev, float) * (0.55 + 0.45 * sh[..., None] / 128)).clip(0, 255).astype(np.uint8)
pim = Image.fromarray(pv); d = ImageDraw.Draw(pim)
for r in roads: d.line([to_px(*p) for p in pl(r["pts"])], fill=(60, 60, 60), width=1)
for r in rivers: d.line([to_px(*p) for p in pl(r["pts"])], fill=(40, 120, 220), width=2)
edge = (ndimage.grey_dilation(DIST, size=2) != ndimage.grey_erosion(DIST, size=2)) & KA
pv2 = np.array(pim); pv2[edge] = (255, 255, 255); pim = Image.fromarray(pv2); d = ImageDraw.Draw(pim)
for c in sorted(cities, key=lambda c: -c["pop"])[:30]:
    x, z = ll_px(c["lon"], c["lat"]); d.ellipse((x - 2, z - 2, x + 2, z + 2), fill=(255, 30, 30)); d.text((x + 3, z - 5), c["name"], fill=(0, 0, 0))
pim.save(os.path.join(OUT, "_preview.png"))
print("districts", len(districts), "cities", len(cities), "done")
