#!/usr/bin/env python3
"""
Build learning-app content from the Daintta PNT Engineering Word documents.

Usage:
    python3 tools/build_content.py --src path/to/docx_folder --out .

Requires: pandoc, Python 3.9+, beautifulsoup4, Pillow
    pip install beautifulsoup4 pillow

For each Module_NN docx it will:
  * extract the text, tables and images (images are resized and converted to WebP)
  * split the module into lessons at each top-level (Heading 1) section
  * turn single-cell "call-out" tables into styled call-out boxes
  * convert the Knowledge Check section into an interactive practice quiz
  * collect the Key Terms table into a programme-wide glossary

Output (relative to --out):
  content/catalog.js          module list, lesson titles, version
  content/modules/mNN.js      lesson HTML + practice quiz for each module
  content/glossary.js         all key terms
  assets/img/mNN-imageX.webp  images

Assessment questions are NOT generated from the documents; they live in
content/assessments/ and are maintained by hand (see README).
"""
import argparse, glob, json, os, re, subprocess, sys, tempfile
from bs4 import BeautifulSoup, NavigableString
from PIL import Image

IMG_MAX = 1600

def run_pandoc(path, fmt, media_dir=None):
    args = ["pandoc", path, "-t", fmt, "--wrap=none"]
    if media_dir:
        args += ["--extract-media", media_dir]
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]

def clean_heading(t):
    return re.sub(r"^\d+(\.\d+)*\.?\s*", "", t.strip())

# ---------------------------------------------------------------- practice quiz
def parse_knowledge_check(md):
    """Parse the Knowledge Check + answer key from pandoc markdown.
    Handles the three layouts used across the modules."""
    m = re.search(r"^# [\d. ]*Knowledge Check\s*$", md, re.M)
    if not m:
        return []
    rest = md[m.end():]
    # stop at the next H1 that is not the answer section
    stop = None
    for h in re.finditer(r"^# (.+)$", rest, re.M):
        if "Answer" in h.group(1):
            continue
        stop = h.start(); break
    block = rest[:stop] if stop else rest
    ak = re.search(r"^#+ .*Answer", block, re.M)
    qpart, apart = (block[:ak.start()], block[ak.start():]) if ak else (block, "")

    qs = []
    qre = re.compile(r"^(?:\*\*|## )(\d+)\.\s*(.+?)(?:\*\*)?\s*$", re.M)
    heads = list(qre.finditer(qpart))
    for i, h in enumerate(heads):
        body = qpart[h.end(): heads[i + 1].start() if i + 1 < len(heads) else len(qpart)]
        text = h.group(2).strip().rstrip("*").strip()
        multi = bool(re.search(r"select all", text, re.I))
        text = re.sub(r"\\?\[Select (one|all that apply)\\?\]\s*", "", text, flags=re.I)
        text = re.sub(r"^Select all that apply\.\s*", "", text, flags=re.I)
        opts = []
        for om in re.finditer(r"^(?:- )?([A-F])\.\s+(.+)$", body, re.M):
            opts.append({"id": om.group(1), "text": om.group(2).strip()})
        qs.append({"n": int(h.group(1)), "prompt": text.replace("\\", ""), "multi": multi,
                   "options": opts, "answer": [], "rationale": ""})

    answers = {}
    # "**1. B:** rationale"  or  "- 1\. B: rationale"
    for am in re.finditer(r"^(?:- )?(?:\*\*)?(\d+)\\?\.\s*([A-F](?:[ ,]+(?:and\s+)?[A-F])*)\s*:\s*(?:\*\*)?\s*(.+)$", apart, re.M):
        answers[int(am.group(1))] = (re.findall(r"[A-F]", am.group(2)), am.group(3).strip())
    # table: | 1 | B | rationale |
    for am in re.finditer(r"^\|\s*(\d+)\s*\|\s*([A-F ,and]+?)\s*\|\s*(.+?)\s*\|\s*$", apart, re.M):
        answers[int(am.group(1))] = (re.findall(r"[A-F]", am.group(2)), am.group(3).strip())
    for q in qs:
        if q["n"] in answers:
            q["answer"], q["rationale"] = answers[q["n"]]
            if len(q["answer"]) > 1:
                q["multi"] = True
    return [q for q in qs if q["options"] and q["answer"]]

# ---------------------------------------------------------------- lesson HTML
CALLOUT_KINDS = [
    ("principle", r"principle|rule|remember|key point|central idea|central question|boundary test"),
    ("warning", r"warning|caution|misconception|pitfall|trap|danger|beware|anti-pattern|mistake"),
    ("example", r"example|scenario|case|exercise|try this|in practice"),
]

def callout_kind(title):
    for kind, pat in CALLOUT_KINDS:
        if re.search(pat, title, re.I):
            return kind
    return "note"

def transform_section(soup, nodes, module_id, img_map, section_title):
    wrapper = soup.new_tag("div")
    for n in nodes:
        wrapper.append(n)

    # single-cell tables -> call-outs
    for tbl in wrapper.find_all("table"):
        cells = tbl.find_all(["td", "th"])
        if len(cells) == 1:
            cell = cells[0]
            strong = cell.find("strong")
            title = strong.get_text(" ", strip=True) if strong else ""
            if strong:
                strong.decompose()
            box = soup.new_tag("aside", attrs={"class": f"callout callout-{callout_kind(title)}"})
            if title:
                h = soup.new_tag("p", attrs={"class": "callout-title"}); h.string = title
                box.append(h)
            inner = soup.new_tag("div", attrs={"class": "callout-body"})
            for c in list(cell.contents):
                inner.append(c)
            # strip leading <br>
            first = inner.find(True)
            if first is not None and first.name == "br":
                first.decompose()
            box.append(inner)
            tbl.replace_with(box)
        else:
            for col in tbl.find_all(["colgroup", "col"]):
                col.decompose()
            for t in tbl.find_all(True):
                t.attrs.pop("style", None)
            w = soup.new_tag("div", attrs={"class": "table-wrap", "tabindex": "0"})
            tbl.wrap(w)

    # images -> figures
    for img in wrapper.find_all("img"):
        src = img.get("src", "")
        base = os.path.splitext(os.path.basename(src))[0]
        key = f"{module_id}-{base}"
        if key not in img_map:
            continue
        w, h = img_map[key]
        fig = soup.new_tag("figure", attrs={"class": "figure"})
        btn = soup.new_tag("button", attrs={"class": "figure-zoom", "type": "button",
                                            "aria-label": "Enlarge diagram"})
        new = soup.new_tag("img", attrs={"src": f"assets/img/{key}.webp", "alt": f"Diagram: {section_title}",
                                         "loading": "lazy", "width": str(w), "height": str(h)})
        btn.append(new)
        fig.append(btn)
        parent = img.parent
        if parent is not None and parent.name == "p" and len(parent.get_text(strip=True)) == 0:
            parent.replace_with(fig)
        else:
            img.replace_with(fig)

    for a in wrapper.find_all("a"):
        if a.get("href", "").startswith("http"):
            a["target"] = "_blank"; a["rel"] = "noopener"
    for t in wrapper.find_all(True):
        if t.name != "img":
            t.attrs.pop("style", None)
        if t.name in ("h2", "h3", "h4") and t.get("id"):
            t["id"] = f"{module_id}-{t['id']}"
    return wrapper.decode_contents().strip()

def parse_key_terms(nodes):
    terms = []
    for n in nodes:
        if getattr(n, "name", None) != "table":
            continue
        for tr in n.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) >= 2 and cells[0].lower() not in ("term",):
                terms.append({"term": cells[0], "definition": cells[1]})
    return terms

def build_module(path, out, tmp):
    num = re.search(r"Module_(\d+)", path).group(1)
    mid = f"m{num}"
    media = os.path.join(tmp, mid)
    html = run_pandoc(path, "html", media)
    md = run_pandoc(path, "gfm")

    # images
    img_map = {}
    os.makedirs(os.path.join(out, "assets", "img"), exist_ok=True)
    for p in sorted(glob.glob(os.path.join(media, "media", "*"))):
        base = os.path.splitext(os.path.basename(p))[0]
        im = Image.open(p)
        if im.mode not in ("RGB",):
            im = im.convert("RGB")
        im.thumbnail((IMG_MAX, IMG_MAX))
        im.save(os.path.join(out, "assets", "img", f"{mid}-{base}.webp"), "WEBP", quality=80, method=6)
        img_map[f"{mid}-{base}"] = im.size

    soup = BeautifulSoup(html, "html.parser")
    # fix image src to be relative basenames
    for img in soup.find_all("img"):
        img["src"] = os.path.basename(img["src"])

    top = list(soup.children)
    # title page (before first h1)
    first_h1 = next((i for i, n in enumerate(top) if getattr(n, "name", None) == "h1" and n.get_text(strip=True)), None)
    pre = top[:first_h1]
    pre_text = " ".join(getattr(n, "get_text", lambda *a, **k: str(n))(" ", strip=True) for n in pre)
    ver = re.search(r"Version\s+([\d.]+)", pre_text)
    version = ver.group(1) if ver else ""
    mt = re.search(r"MODULE\s+\d+\s+(.+?)(?:\s{2,}|$)", pre_text)
    # intro call-outs on the title page that carry real teaching text
    intro_nodes = [n for n in pre if getattr(n, "name", None) == "table" and len(n.get_text(strip=True)) > 80]
    subtitle = ""
    for n in pre:
        if getattr(n, "name", None) == "p":
            t = n.get_text(" ", strip=True)
            if t and not re.search(r"DAINTTA|MODULE|Programme|Version", t):
                subtitle = t

    sections, cur = [], None
    for n in top[first_h1:]:
        if getattr(n, "name", None) == "h1":
            title = n.get_text(" ", strip=True)
            if not title:          # empty heading: continue the current section
                continue
            cur = {"title": title, "nodes": []}
            sections.append(cur)
        elif cur is not None:
            cur["nodes"].append(n)
    if intro_nodes and sections:
        sections[0]["nodes"] = intro_nodes + sections[0]["nodes"]

    lessons, key_terms, objectives = [], [], []
    for s in sections:
        t = clean_heading(s["title"])
        if re.search(r"knowledge check", t, re.I):
            continue
        if re.search(r"key terms", t, re.I):
            key_terms = parse_key_terms(s["nodes"])
        for i, n in enumerate(s["nodes"]):
            if getattr(n, "name", None) == "h2" and "objective" in n.get_text().lower():
                ul = next((x for x in s["nodes"][i + 1:] if getattr(x, "name", None) == "ul"), None)
                if ul:
                    objectives = [li.get_text(" ", strip=True) for li in ul.find_all("li")]
        body = transform_section(soup, s["nodes"], mid, img_map, t)
        lessons.append({"id": slug(t), "title": t, "html": body})

    # module title from first H1 of the document title page, else filename
    fname_title = re.sub(r"_", " ", re.search(r"Module_\d+_(.+)\.docx", os.path.basename(path)).group(1))
    title = fname_title
    if mt:
        title = mt.group(1).strip().title()
    title = TITLE_OVERRIDES.get(mid, title)

    practice = parse_knowledge_check(md)
    mod = {"id": mid, "number": int(num), "title": title, "subtitle": subtitle, "version": version,
           "objectives": objectives, "lessons": lessons, "practice": practice}
    return mod, key_terms

TITLE_OVERRIDES = {
    "m01": "PNT Fundamentals",
    "m02": "How GNSS Works",
    "m03": "GNSS Signals, Errors and Performance",
    "m04": "High-Accuracy and Augmented GNSS",
    "m05": "Alternative PNT Technologies",
    "m06": "PNT Threats and Vulnerabilities",
    "m07": "Resilient PNT Engineering",
    "m08": "PNT Architecture and Systems Engineering",
    "m09": "PNT Verification, Validation and Assurance",
    "m10": "Applied PNT Engineering (Capstone)",
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.src, "*Module_*.docx")))
    if not files:
        sys.exit("No Module_NN docx files found in " + a.src)
    os.makedirs(os.path.join(a.out, "content", "modules"), exist_ok=True)
    catalog, glossary = [], {}
    with tempfile.TemporaryDirectory() as tmp:
        for f in files:
            mod, terms = build_module(f, a.out, tmp)
            with open(os.path.join(a.out, "content", "modules", f"{mod['id']}.js"), "w", encoding="utf-8") as fh:
                fh.write("/* Generated by tools/build_content.py - do not edit by hand */\n")
                fh.write(f"PNT.registerModule({json.dumps(mod, ensure_ascii=False)});\n")
            catalog.append({k: mod[k] for k in ("id", "number", "title", "subtitle", "version", "objectives")} |
                           {"lessons": [{"id": l["id"], "title": l["title"]} for l in mod["lessons"]],
                            "practiceCount": len(mod["practice"])})
            for t in terms:
                k = t["term"].lower()
                if k not in glossary:
                    glossary[k] = t | {"modules": []}
                glossary[k]["modules"].append(mod["number"])
            print(f"{mod['id']}: {len(mod['lessons'])} lessons, {len(mod['practice'])} practice questions, "
                  f"{len(terms)} key terms, version {mod['version']}")
    with open(os.path.join(a.out, "content", "catalog.js"), "w", encoding="utf-8") as fh:
        fh.write("/* Generated by tools/build_content.py - do not edit by hand */\n")
        fh.write(f"PNT.catalog = {json.dumps(catalog, ensure_ascii=False, indent=1)};\n")
    gl = sorted(glossary.values(), key=lambda t: t["term"].lower())
    with open(os.path.join(a.out, "content", "glossary.js"), "w", encoding="utf-8") as fh:
        fh.write("/* Generated by tools/build_content.py - do not edit by hand */\n")
        fh.write(f"PNT.glossary = {json.dumps(gl, ensure_ascii=False)};\n")
    print(f"glossary: {len(gl)} terms")

if __name__ == "__main__":
    main()
