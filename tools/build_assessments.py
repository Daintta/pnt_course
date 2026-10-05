#!/usr/bin/env python3
"""
Build assessment data from the Markdown question files in assessments/.

    python3 tools/build_assessments.py --mode local      # standalone app
    python3 tools/build_assessments.py --mode server     # admin/Supabase app

local  : writes content/assessments.js including answers and explanations
         (scored in the learner's browser).
server : writes content/assessments.js WITHOUT answers or explanations, and
         supabase/seed_assessments.sql containing the answer keys, which are
         only readable by the database scoring function.

See README "Editing assessments" for the question format.
"""
import argparse, hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TYPES = {"single", "multi", "truefalse", "match", "order"}

def hid(*parts):
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:6]

def parse_file(path, module_id):
    text = open(path, encoding="utf-8").read()
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    title_m = re.search(r"^# (.+)$", text, re.M)
    blocks = re.split(r"^## ", text, flags=re.M)[1:]
    questions = []
    for n, block in enumerate(blocks, 1):
        lines = [l.rstrip() for l in block.strip().splitlines()]
        qtype = lines[0].strip().lower()
        if qtype not in TYPES:
            sys.exit(f"{path}: question {n}: unknown type '{qtype}'")
        qid = f"{module_id}-q{n:02d}"
        prompt, opts, correct, pairs, items, expl, tf = [], [], [], [], [], [], None
        for l in lines[1:]:
            s = l.strip()
            if not s:
                continue
            if s.startswith(">"):
                expl.append(s[1:].strip())
            elif s.startswith("= "):
                tf = s[2:].strip().lower()
            elif qtype == "match" and s.startswith("- ") and " = " in s:
                left, right = s[2:].split(" = ", 1)
                pairs.append((left.strip(), right.strip()))
            elif qtype == "order" and re.match(r"^\d+\.\s", s):
                items.append(re.sub(r"^\d+\.\s+", "", s))
            elif qtype in ("single", "multi") and s[:2] in ("- ", "* "):
                opts.append(s[2:].strip())
                if s.startswith("* "):
                    correct.append(len(opts) - 1)
            else:
                prompt.append(s)
        q = {"id": qid, "type": qtype, "prompt": " ".join(prompt), "explanation": " ".join(expl)}
        if qtype in ("single", "multi"):
            if len(opts) < 2 or not correct:
                sys.exit(f"{path}: {qid}: needs options and at least one correct (*) option")
            if qtype == "single" and len(correct) != 1:
                sys.exit(f"{path}: {qid}: single-choice needs exactly one correct option")
            ids = [hid(qid, "o", str(i), o) for i, o in enumerate(opts)]
            q["options"] = [{"id": i, "text": t} for i, t in zip(ids, opts)]
            q["answer"] = ",".join(sorted(ids[i] for i in correct))
        elif qtype == "truefalse":
            if tf not in ("true", "false"):
                sys.exit(f"{path}: {qid}: truefalse needs '= true' or '= false'")
            q["options"] = [{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]
            q["answer"] = tf
        elif qtype == "match":
            if len(pairs) < 2:
                sys.exit(f"{path}: {qid}: match needs at least two pairs")
            rights = [p[1] for p in pairs]
            if len(set(rights)) != len(rights):
                sys.exit(f"{path}: {qid}: match right-hand items must be unique")
            lids = [hid(qid, "l", p[0]) for p in pairs]
            rids = [hid(qid, "r", p[1]) for p in pairs]
            q["left"] = [{"id": i, "text": p[0]} for i, p in zip(lids, pairs)]
            q["right"] = sorted([{"id": i, "text": p[1]} for i, p in zip(rids, pairs)], key=lambda r: r["id"])
            q["answer"] = ";".join(f"{l}={r}" for l, r in sorted(zip(lids, rids)))
        elif qtype == "order":
            if len(items) < 3:
                sys.exit(f"{path}: {qid}: order needs at least three items")
            iids = [hid(qid, "i", t) for t in items]
            q["items"] = sorted([{"id": i, "text": t} for i, t in zip(iids, items)], key=lambda r: r["id"])
            q["answer"] = ">".join(iids)
        questions.append(q)
    return {"moduleId": module_id, "title": title_m.group(1) if title_m else module_id, "questions": questions}

def sql_str(s):
    return "'" + s.replace("'", "''") + "'"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["local", "server"], required=True)
    ap.add_argument("--pass-mark", type=float, default=80)
    a = ap.parse_args()
    src = os.path.join(ROOT, "assessments")
    files = sorted(f for f in os.listdir(src) if re.match(r"m\d\d\.md$", f))
    data = [parse_file(os.path.join(src, f), f[:3]) for f in files]

    # lesson counts from the content catalog (used by the server to gate assessments)
    catalog_path = os.path.join(ROOT, "content", "catalog.js")
    cat = open(catalog_path, encoding="utf-8").read()
    catalog = json.loads(cat[cat.index("["): cat.rindex("]") + 1])
    lessons = {m["id"]: len(m["lessons"]) for m in catalog}
    titles = {m["id"]: m["title"] for m in catalog}
    version = catalog[0].get("version", "")

    out = []
    for d in data:
        qs = []
        for q in d["questions"]:
            q2 = dict(q)
            if a.mode == "server":
                q2.pop("answer"); q2.pop("explanation")
            qs.append(q2)
        out.append({"moduleId": d["moduleId"], "questions": qs})
    os.makedirs(os.path.join(ROOT, "content"), exist_ok=True)
    with open(os.path.join(ROOT, "content", "assessments.js"), "w", encoding="utf-8") as fh:
        fh.write(f"/* Generated by tools/build_assessments.py --mode {a.mode} - edit assessments/*.md instead */\n")
        fh.write(f"PNT.assessments = {json.dumps(out, ensure_ascii=False)};\n")

    if a.mode == "server":
        os.makedirs(os.path.join(ROOT, "supabase"), exist_ok=True)
        lines = ["-- Generated by tools/build_assessments.py --mode server",
                 "-- Loads module settings, lesson list and assessment answer keys.",
                 "-- Safe to re-run: answer keys are replaced; lessons are updated without touching learner progress.",
                 "begin;", "delete from public.assessment_questions;"]
        for d in data:
            mid = d["moduleId"]
            lines.append(
                f"insert into public.assessment_config (module_id, title, question_count, lesson_count, pass_mark, content_version) values "
                f"({sql_str(mid)}, {sql_str(titles.get(mid, mid))}, {len(d['questions'])}, {lessons.get(mid, 0)}, {a.pass_mark}, {sql_str(version)}) "
                f"on conflict (module_id) do update set title = excluded.title, question_count = excluded.question_count, "
                f"lesson_count = excluded.lesson_count, pass_mark = excluded.pass_mark, content_version = excluded.content_version;")
            meta = next((m for m in catalog if m["id"] == mid), None)
            for pos, l in enumerate(meta["lessons"] if meta else [], 1):
                lines.append(f"insert into public.lessons (module_id, lesson_id, position, title) values "
                             f"({sql_str(mid)}, {sql_str(l['id'])}, {pos}, {sql_str(l['title'])}) "
                             f"on conflict (module_id, lesson_id) do update set position = excluded.position, title = excluded.title;")
            for q in d["questions"]:
                lines.append(f"insert into public.assessment_questions (module_id, question_id, answer, explanation) values "
                             f"({sql_str(mid)}, {sql_str(q['id'])}, {sql_str(q['answer'])}, {sql_str(q['explanation'])});")
        lines.append("commit;")
        with open(os.path.join(ROOT, "supabase", "seed_assessments.sql"), "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
    total = sum(len(d["questions"]) for d in data)
    print(f"{len(data)} assessments, {total} questions ({a.mode} mode)")
    for d in data:
        kinds = {}
        for q in d["questions"]:
            kinds[q["type"]] = kinds.get(q["type"], 0) + 1
        print(f"  {d['moduleId']}: {len(d['questions'])} questions {kinds}")

if __name__ == "__main__":
    main()
