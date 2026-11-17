#!/usr/bin/env python3
"""
EDX Decals (Next.js) - package verification. Python 3.8+, standard library only.

  python scripts/verify.py --write-manifest          regenerate MANIFEST.txt (every file + size)
  python scripts/verify.py --zip ../edx-decals-next.zip --report ../VERIFICATION-REPORT.txt

Checks
- every file in MANIFEST.txt exists, is not empty, size matches; no unlisted files
- required files exist
- every import (@/..., relative, packages) resolves to a file or a dependency in package.json
- every "/images/..", "/brand/.." asset path used in code exists in public/
- every CSS url() resolves; every CSS var(--x) used is defined somewhere
- every <Icon name="..."> exists in the icon set (68 icons)
- every Supabase table / rpc used in code exists in supabase/migrations
- every process.env.X used in code is documented in .env.example
- all SVG files are valid XML
- quality: night backgrounds not #000 + WCAG contrast pairs, 16px body, large-text option,
  default night mode, focus/hover/active/disabled states, responsive breakpoints, no TODO / lorem
- TypeScript syntax of every .ts/.tsx (node scripts/check-ts.mjs, needs the typescript package)
- the zip opens, CRC passes, one clean top folder, contents == manifest
"""
import argparse, json, os, re, subprocess, sys, zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SKIP_DIRS = {"node_modules", ".next", ".git", "legacy", ".vercel"}
NOT_IN_MANIFEST = {"VERIFICATION-REPORT.txt"}
results = []


def check(cat, name, ok, detail=""):
    results.append((cat, name, bool(ok), detail))
    return ok


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def read(p):
    with open(os.path.join(ROOT, p) if not os.path.isabs(p) else p, "r", encoding="utf-8") as f:
        return f.read()


def all_files():
    out = []
    for d, dirs, fs in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in fs:
            out.append(rel(os.path.join(d, f)))
    return sorted(out)


def write_manifest():
    files = [f for f in all_files() if f not in NOT_IN_MANIFEST and f != "MANIFEST.txt"]
    body = lambda own: "\n".join(
        ["# EDX DECALS (Next.js) - MANIFEST", "# size_in_bytes  path", f"# {len(files) + 1} files"]
        + [f"{os.path.getsize(os.path.join(ROOT, f)):>9}  {f}" for f in files]
        + [f"{own:>9}  MANIFEST.txt"]
    ) + "\n"
    size = 0
    for _ in range(10):  # the manifest lists its own size: iterate to a fixed point
        text = body(size)
        new = len(text.encode("utf-8"))
        if new == size:
            break
        size = new
    with open(os.path.join(ROOT, "MANIFEST.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(body(size))
    print(f"MANIFEST.txt written: {len(files) + 1} files")


ap = argparse.ArgumentParser()
ap.add_argument("--zip")
ap.add_argument("--report")
ap.add_argument("--write-manifest", action="store_true")
args = ap.parse_args()
if args.write_manifest:
    write_manifest()
    sys.exit(0)

FILES = all_files()

# ---------------------------------------------------------------- 1. manifest
manifest = []
if os.path.isfile(os.path.join(ROOT, "MANIFEST.txt")):
    for line in read("MANIFEST.txt").splitlines():
        m = re.match(r"^\s*(\d+)\s+(\S.*?)\s*$", line)
        if m and not line.startswith("#"):
            manifest.append((m.group(2), int(m.group(1))))
check("manifest", "MANIFEST.txt present and parsed", manifest, f"{len(manifest)} entries")
for p, size in manifest:
    full = os.path.join(ROOT, p)
    ok = os.path.isfile(full) and os.path.getsize(full) > 0
    check("manifest", f"exists + not empty: {p}", ok)
    if ok:
        check("manifest", f"size matches: {p}", os.path.getsize(full) == size, f"listed {size}, actual {os.path.getsize(full)}")
listed = {p for p, _ in manifest}
extra = [f for f in FILES if f not in listed and f not in NOT_IN_MANIFEST]
check("manifest", "no files missing from the manifest", not extra, ", ".join(extra[:5]))

# ---------------------------------------------------------------- 2. required
REQUIRED = [
    "README.md", "package.json", "tsconfig.json", "next.config.mjs", "middleware.ts", ".env.example", ".gitignore",
    "supabase/migrations/0001_schema.sql", "supabase/migrations/0002_security.sql", "supabase/seed.sql",
    "scripts/migrate-from-sqlite.mjs", "src/styles/tokens.css", "src/styles/base.css", "src/styles/components.css",
    "src/app/layout.tsx", "src/app/(store)/page.tsx", "src/app/(store)/checkout/page.tsx",
    "src/app/api/checkout/route.ts", "src/app/api/webhooks/paymongo/route.ts", "src/lib/paymongo.ts", "src/lib/pricing.ts",
    "src/app/admin/login/page.tsx", "src/app/admin/(panel)/layout.tsx", "src/components/Icon.tsx",
    "public/brand/symbol-light.svg", "public/brand/symbol-dark.svg", "public/brand/favicon.svg",
]
for p in REQUIRED:
    full = os.path.join(ROOT, p)
    check("required", p, os.path.isfile(full) and os.path.getsize(full) > 0)

code_files = [f for f in FILES if re.search(r"\.(ts|tsx|mjs)$", f) and not f.endswith(".d.ts")]
pkg = json.loads(read("package.json"))
deps = set(pkg.get("dependencies", {})) | set(pkg.get("devDependencies", {}))

# ---------------------------------------------------------------- 3. imports
def resolve_module(base_dir, spec):
    target = os.path.normpath(os.path.join(base_dir, spec))
    for cand in [target, target + ".ts", target + ".tsx", target + ".mjs", target + ".js",
                 os.path.join(target, "index.ts"), os.path.join(target, "index.tsx")]:
        if os.path.isfile(cand):
            return True
    return False

import_re = re.compile(r"""(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|^import\s+["']([^"']+)["']""", re.M)
n_imports = 0
for f in code_files:
    text = read(f)
    for m in import_re.finditer(text):
        spec = m.group(1) or m.group(2) or m.group(3)
        n_imports += 1
        if spec.startswith("@/"):
            ok = resolve_module(os.path.join(ROOT, "src"), spec[2:])
        elif spec.startswith("."):
            ok = resolve_module(os.path.dirname(os.path.join(ROOT, f)), spec)
        elif spec.startswith("node:"):
            ok = True
        else:
            name = "/".join(spec.split("/")[:2]) if spec.startswith("@") else spec.split("/")[0]
            ok = name in deps or name == "react-dom" and "react-dom" in deps
        check("imports", f"{f}: {spec}", ok, "" if ok else "does not resolve")
check("imports", f"{n_imports} import statements scanned", n_imports > 100)

# ---------------------------------------------------------------- 4. public assets
asset_re = re.compile(r"""["'`(](/(?:images|brand)/[A-Za-z0-9_/-]+\.[a-z0-9]+)""")
for f in [x for x in FILES if re.search(r"\.(ts|tsx|css|sql|mjs)$", x)]:
    for a in set(asset_re.findall(read(f))):
        check("assets", f"{f}: {a}", os.path.isfile(os.path.join(ROOT, "public", a.lstrip("/"))))

# ---------------------------------------------------------------- 5. css url() + var()
css_files = [f for f in FILES if f.endswith(".css")]
defined = set()
for f in css_files:
    nc = re.sub(r"/\*.*?\*/", "", read(f), flags=re.S)
    defined |= set(re.findall(r"(--[a-z0-9-]+)\s*:", nc))
    for u in re.findall(r"url\(\s*['\"]?([^'\")]+)", nc):
        if not u.startswith(("#", "data:", "http")):
            check("css-urls", f"{f}: url({u})", os.path.exists(os.path.join(os.path.dirname(os.path.join(ROOT, f)), u)))
LOCAL_VARS = {"--swatch-color", "--c", "--font-manrope", "--font-space-grotesk", "--rot", "--dy"}
used = set()
for f in css_files + [x for x in code_files if x.endswith(".tsx")]:
    used |= set(re.findall(r"var\((--[a-z0-9-]+)", read(f)))
for v in sorted(used):
    check("css-vars", f"var({v}) is defined", v in defined or v in LOCAL_VARS)

# ---------------------------------------------------------------- 6. icons
icon_src = read("src/components/Icon.tsx")
icon_names = set(re.findall(r'^\s{2}"?([a-z-]+)"?: \[', icon_src, re.M))
check("icons", "icon set has 68 icons", len(icon_names) == 68, f"{len(icon_names)} found")
for f in [x for x in code_files if x.endswith(".tsx")]:
    for name in set(re.findall(r'<Icon\s+name="([a-z-]+)"', read(f))) | set(re.findall(r'icon:\s*"([a-z-]+)"', read(f))):
        check("icons", f"{f}: {name}", name in icon_names)

# ---------------------------------------------------------------- 7. database names
schema = read("supabase/migrations/0001_schema.sql") + read("supabase/migrations/0002_security.sql")
tables = set(re.findall(r"create table if not exists public\.([a-z_]+)", schema))
funcs = set(re.findall(r"create or replace function public\.([a-z_]+)", schema))
buckets = set(re.findall(r"values \('([a-z-]+)', '[a-z-]+', (?:true|false)", schema))
for f in code_files:
    t = read(f)
    for tb in set(re.findall(r'\.from\("([a-z_]+)"\)', t)):
        check("database", f"{f}: table/bucket {tb}", tb in tables or tb in buckets)
    for fn in set(re.findall(r'\.rpc\(\s*"([a-z_]+)"', t)):
        check("database", f"{f}: rpc {fn}", fn in funcs)
check("database", "RLS enabled on every table", all(re.search(rf"alter table public\.{t}\s+enable row level security", schema) for t in tables), ", ".join(sorted(tables)))

# ---------------------------------------------------------------- 8. env
env_doc = set(re.findall(r"^([A-Z0-9_]+)=", read(".env.example"), re.M))
for f in code_files + ["next.config.mjs"]:
    for name in set(re.findall(r"process\.env\.([A-Z0-9_]+)", read(f))):
        if name != "NODE_ENV":
            check("env", f"{f}: {name} documented in .env.example", name in env_doc)

# ---------------------------------------------------------------- 9. svg
for f in [x for x in FILES if x.endswith(".svg")]:
    try:
        ET.parse(os.path.join(ROOT, f))
        check("svg-xml", f, True)
    except ET.ParseError as e:
        check("svg-xml", f, False, str(e))

# ---------------------------------------------------------------- 10. quality
def lum(h):
    h = h.lstrip("#")
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)

tok = re.sub(r"/\*.*?\*/", "", read("src/styles/tokens.css"), flags=re.S)
combos = 0
for m in re.finditer(r':root\[data-palette="(\w+)"\]\[data-theme="(\w+)"\][^{]*\{([^}]*)\}', tok):
    pal, mode, body = m.groups()
    v = dict(re.findall(r"--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})", body))
    combos += 1
    for label, a, b, need in [("text/bg", "text", "bg", 7.0), ("text/surface", "text", "surface", 7.0), ("muted/surface", "muted", "surface", 4.5),
                              ("accent-text/surface", "accent-text", "surface", 4.5), ("button", "button-primary-text", "button-primary-bg", 4.5),
                              ("on-accent/accent", "on-accent", "accent", 4.5), ("focus/bg", "focus", "bg", 3.0)]:
        r = ratio(v[a], v[b])
        check("contrast", f"{pal}/{mode} {label} = {r:.2f}:1 (needs {need}:1)", r >= need)
    if mode == "dark":
        check("dark-mode", f"{pal} night background {v['bg']} is softened near-black", v["bg"].upper() != "#000000" and 0.003 < lum(v["bg"]) < 0.03)
check("contrast", "10 palette x mode combinations", combos == 10, f"{combos} found")
base = read("src/styles/base.css")
comp = read("src/styles/components.css")
check("typography", "html font-size 100% (16px)", re.search(r"html\s*\{[^}]*font-size:\s*100%", base))
check("typography", "--fs-body is 1rem", "--fs-body: 1rem" in tok)
check("typography", "large-text option html[data-text=\"large\"]", 'html[data-text="large"]' in base)
check("typography", "large-text toggle in the UI", "edx-text" in read("src/components/ThemeToggle.tsx"))
check("theme", "default mode is night (dark)", "'dark'" in read("src/components/ThemeScript.tsx") and 'data-theme="dark"' in read("src/app/layout.tsx"))
check("theme", "mode saved in localStorage", "localStorage" in read("src/components/ThemeToggle.tsx"))
selectors = re.findall(r"([^{}]+)\{", re.sub(r"/\*.*?\*/", "", comp, flags=re.S))
def has_state(cls, state):
    return any(re.search(re.escape(cls) + r"[^,{]*" + state, s) for s in selectors)
for cls, states in {".button": ["hover", "active", "focus-visible", r"\[disabled\]"], ".input": ["hover", "focus", "disabled"],
                    ".select": ["hover", "focus", "disabled"], ".tab": ["hover", "active", "focus-visible", "aria-disabled"],
                    ".site-nav a": ["hover", "active", "focus-visible", "aria-disabled"], ".sidebar-nav a": ["hover", "active", "focus-visible", "aria-disabled"],
                    ".stepper button": ["hover", "active", "focus-visible", r"\[disabled\]"], ".text-button": ["hover", "active", "focus-visible", r"\[disabled\]"],
                    ".theme-toggle": ["hover", "active", "focus-visible", r"\[disabled\]"], ".swatch-option": ["hover", "focus-visible", "disabled"]}.items():
    for st in states:
        check("states", f"{cls} {st.replace(chr(92), '')}", has_state(cls, st))
check("responsive", "tablet breakpoint 640px", "(min-width: 640px)" in base and "(min-width: 640px)" in comp)
check("responsive", "desktop breakpoint 1024px", "(min-width: 1024px)" in base and "(min-width: 1024px)" in comp)
check("responsive", "mobile rules (max-width: 639px)", "(max-width: 639px)" in comp)
text_files = [f for f in FILES if re.search(r"\.(ts|tsx|mjs|css|sql|md|json)$", f) and not f.startswith("scripts/verify")]
check("rules", "no TODO / TBD / FIXME", not [f for f in text_files if re.search(r"\b(TODO|TBD|FIXME)\b", read(f))])
check("rules", "no lorem ipsum", not [f for f in text_files if "lorem ipsum" in read(f).lower()])
check("rules", "no secrets committed (.env.local absent)", not os.path.exists(os.path.join(ROOT, ".env.local")))
check("rules", "no absolute drive paths in code", not [f for f in code_files if re.search(r"""["'][A-Za-z]:\\\\""", read(f))])

# ---------------------------------------------------------------- 11. ts syntax
try:
    proc = subprocess.run(["node", os.path.join(HERE, "check-ts.mjs")], capture_output=True, text=True, timeout=180)
    out = (proc.stdout + proc.stderr).strip().splitlines()
    summary = out[-1] if out else "no output"
    check("typescript", f"syntax check: {summary}", proc.returncode == 0, "\n".join(out[:-1][:5]))
except Exception as e:  # node missing
    check("typescript", "syntax check could run", False, str(e))

# ---------------------------------------------------------------- 12. zip
if args.zip:
    try:
        with zipfile.ZipFile(args.zip) as z:
            check("zip", "zip opens and CRC test passes", z.testzip() is None)
            names = [n for n in z.namelist() if not n.endswith("/")]
            top = os.path.basename(ROOT) + "/"
            check("zip", "one clean top folder, relative paths only", all(n.startswith(top) and ":" not in n and not n.startswith("/") for n in names))
            stripped = {n[len(top):] for n in names}
            missing = sorted(listed - stripped)
            unexpected = sorted(stripped - listed)
            check("zip", f"zip contains every manifest file ({len(listed)})", not missing, ", ".join(missing[:5]))
            check("zip", "zip contains nothing outside the manifest", not unexpected, ", ".join(unexpected[:5]))
            sizes = dict(manifest)
            bad = [n for n in names if sizes.get(n[len(top):]) != z.getinfo(n).file_size]
            check("zip", "every zipped file size matches the manifest", not bad, ", ".join(bad[:5]))
    except Exception as e:
        check("zip", "zip opens", False, str(e))
else:
    check("zip", "zip check (pass --zip)", False, "no --zip given")

# ---------------------------------------------------------------- report
cats = {}
for cat, name, ok, detail in results:
    cats.setdefault(cat, [0, 0])[0 if ok else 1] += 1
tp = sum(c[0] for c in cats.values())
tf = sum(c[1] for c in cats.values())
lines = ["EDX DECALS (Next.js) - VERIFICATION REPORT", "=" * 60, "",
         f"Project folder : {os.path.basename(ROOT)}", f"Manifest       : {len(manifest)} files",
         f"Code files     : {len(code_files)}", f"Icons          : {len(icon_names)}",
         f"Zip checked    : {os.path.basename(args.zip) if args.zip else 'no'}", "",
         f"{'CATEGORY':<14}{'PASS':>8}{'FAIL':>8}", "-" * 30]
lines += [f"{c:<14}{p:>8}{f:>8}" for c, (p, f) in sorted(cats.items())]
lines += ["-" * 30, f"{'TOTAL':<14}{tp:>8}{tf:>8}", "", "RESULT: " + ("ALL CHECKS PASSED" if tf == 0 else f"{tf} CHECK(S) FAILED"), ""]
if tf:
    lines += ["FAILURES", "-" * 30] + [f"[{c}] {n} {('- ' + d) if d else ''}" for c, n, ok, d in results if not ok]
report = "\n".join(lines)
print(report)
with open(args.report or os.path.join(ROOT, "VERIFICATION-REPORT.txt"), "w", encoding="utf-8") as f:
    f.write(report + "\n")
sys.exit(1 if tf else 0)
