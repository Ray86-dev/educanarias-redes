"""Tipografías estáticas y logotipo en trazos, a partir de las fuentes variables de la web de EduCanarias.

Uso (desde redes/fuente/, con fontTools y brotli instalados: pip install fonttools brotli):
    python fuentes.py <carpeta con newsreader-latin-opsz-normal.woff2 y geist-latin-wght-normal.woff2>

Escribe:
  ../marca/tipografias/Newsreader/*.ttf  · Newsreader 48pt (titulares): Regular, Medium y SemiBold
  ../marca/tipografias/Geist/*.ttf       · Geist (textos): Regular, Medium, SemiBold y Bold
  wordmark.json                          · «EduCanarias» en trazos (Newsreader Medium, opsz 32), con su interletraje
"""
import json
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

AQUI = Path(__file__).resolve().parent
TIPOS = AQUI.parent / "marca" / "tipografias"

NEWSREADER = "newsreader-latin-opsz-normal.woff2"
GEIST = "geist-latin-wght-normal.woff2"

WORDMARK = "EduCanarias"
WORDMARK_AXES = {"wght": 500, "opsz": 32}
TRACKING = -0.02  # em, como el «tracking-tight» del logotipo de la app


def set_names(font: TTFont, family: str, style: str) -> None:
    """Nombres para que Windows, macOS y Canva agrupen bien la familia."""
    name = font["name"]
    ps = f"{family.replace(' ', '')}-{style.replace(' ', '')}"
    rib = style in ("Regular", "Bold", "Italic", "Bold Italic")
    for rec in list(name.names):
        if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 25) or rec.nameID >= 256:
            name.removeNames(nameID=rec.nameID)
    name.setName(family if rib else f"{family} {style}", 1, 3, 1, 0x409)
    name.setName(style if rib else "Regular", 2, 3, 1, 0x409)
    name.setName(f"{ps};EduCanarias", 3, 3, 1, 0x409)
    name.setName(f"{family} {style}", 4, 3, 1, 0x409)
    name.setName(ps, 6, 3, 1, 0x409)
    if not rib:
        name.setName(family, 16, 3, 1, 0x409)
        name.setName(style, 17, 3, 1, 0x409)
    for tag in ("STAT",):
        if tag in font:
            del font[tag]


def static(src: Path, axes: dict, family: str, style: str, out: Path) -> None:
    font = TTFont(src)
    inst = instancer.instantiateVariableFont(font, axes)
    inst.flavor = None
    set_names(inst, family, style)
    weight = int(axes["wght"])
    inst["OS/2"].usWeightClass = weight
    fs = inst["OS/2"].fsSelection & ~0b1100001  # sin ITALIC, BOLD ni REGULAR
    fs |= 0b100000 if style == "Bold" else (0b1000000 if style == "Regular" else 0)
    inst["OS/2"].fsSelection = fs
    inst["head"].macStyle = 1 if style == "Bold" else 0
    out.parent.mkdir(parents=True, exist_ok=True)
    inst.save(out)
    print(f"{out.relative_to(AQUI.parent)} · {out.stat().st_size // 1024} KB")


def pair_kerning(font: TTFont, left: str, right: str) -> int:
    """Ajuste de la pareja (GPOS «kern», tablas PairPos 1 y 2): lo que aplicaría el navegador."""
    gpos = font["GPOS"].table
    lookups = set()
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == "kern":
            lookups.update(fr.Feature.LookupListIndex)
    for idx in sorted(lookups):
        lookup = gpos.LookupList.Lookup[idx]
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                if st.ExtensionLookupType != 2:
                    continue
                st = st.ExtSubTable
            elif lookup.LookupType != 2:
                continue
            cov = st.Coverage.glyphs
            if left not in cov:
                continue
            if st.Format == 1:
                pset = st.PairSet[cov.index(left)]
                for pvr in pset.PairValueRecord:
                    if pvr.SecondGlyph == right:
                        return getattr(pvr.Value1, "XAdvance", 0) or 0
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs.get(left, 0)
                c2 = st.ClassDef2.classDefs.get(right, 0)
                rec = st.Class1Record[c1].Class2Record[c2]
                return getattr(rec.Value1, "XAdvance", 0) or 0
    return 0


def wordmark(src: Path) -> dict:
    font = instancer.instantiateVariableFont(TTFont(src), WORDMARK_AXES)
    upm = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    hmtx = font["hmtx"]
    names = [cmap[ord(c)] for c in WORDMARK]
    scale = 100 / upm  # cuerpo 100: el JSON se escala en cada uso
    pen = SVGPathPen(glyphs)
    bounds = BoundsPen(glyphs)
    x = 0.0
    for i, g in enumerate(names):
        t = (scale, 0, 0, -scale, x * scale, 0)
        glyphs[g].draw(TransformPen(pen, t))
        glyphs[g].draw(TransformPen(bounds, t))
        x += hmtx[g][0]
        if i < len(names) - 1:
            x += pair_kerning(font, g, names[i + 1]) + TRACKING * upm
    x0, y0, x1, y1 = bounds.bounds
    caps = font["OS/2"].sCapHeight * scale
    return {
        "text": WORDMARK,
        "axes": WORDMARK_AXES,
        "tracking_em": TRACKING,
        "size": 100,
        "d": pen.getCommands(),
        "bbox": [round(v, 2) for v in (x0, y0, x1, y1)],
        "advance": round(x * scale, 2),
        "cap_height": round(caps, 2),
    }


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else AQUI / "fonts")
    nr, ge = src / NEWSREADER, src / GEIST
    for style, w in (("Regular", 400), ("Medium", 500), ("SemiBold", 600)):
        static(nr, {"wght": w, "opsz": 48}, "Newsreader 48pt", style, TIPOS / "Newsreader" / f"Newsreader48pt-{style}.ttf")
    for style, w in (("Regular", 400), ("Medium", 500), ("SemiBold", 600), ("Bold", 700)):
        static(ge, {"wght": w}, "Geist", style, TIPOS / "Geist" / f"Geist-{style}.ttf")
    wm = wordmark(nr)
    (AQUI / "wordmark.json").write_text(json.dumps(wm, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wordmark.json · bbox {wm['bbox']} · avance {wm['advance']}")


if __name__ == "__main__":
    main()
