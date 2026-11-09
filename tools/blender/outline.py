"""Bakes a soft ink outline around every frame of the rendered runner sheets
so the 3D characters read clearly against bright game backgrounds.
   python3 tools/blender/outline.py   (needs Pillow)"""
import os, json
from PIL import Image, ImageFilter, ImageChops
D = os.path.join(os.path.dirname(__file__), "..", "..", "img", "runners")
for f in sorted(os.listdir(D)):
    if not f.endswith(".png"): continue
    p = os.path.join(D, f); im = Image.open(p).convert("RGBA")
    if im.info.get("outlined"): continue
    a = im.split()[3].point(lambda v: 255 if v > 90 else 0)
    ring = a.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    ink = Image.new("RGBA", im.size, (27, 21, 48, 0)); ink.putalpha(ring.point(lambda v: int(v * 0.85)))
    out = Image.alpha_composite(ink, im)
    from PIL.PngImagePlugin import PngInfo
    meta = PngInfo(); meta.add_text("outlined", "1")
    out.save(p, optimize=True, pnginfo=meta)
    print("outlined", f, out.size)
