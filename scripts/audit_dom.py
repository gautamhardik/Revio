"""
Revio DOM & Front-End Integrity Auditor
Verifies HTML structure, JS ID binding, CSS rule coverage, and event handlers.
"""

import sys
import re
from html.parser import HTMLParser
from pathlib import Path

# Force utf-8 encoding on stdout for windows terminal safety
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = Path(__file__).resolve().parent.parent
HTML_PATH = REPO_ROOT / "frontend" / "revio.html"
CSS_PATH = REPO_ROOT / "frontend" / "css" / "revio-app.css"
TOKENS_PATH = REPO_ROOT / "frontend" / "css" / "design-tokens.css"
JS_PATH = REPO_ROOT / "frontend" / "js" / "revio-app.js"

class DomCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.classes = set()
        self.handlers = []
        self.links = []
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        attr_dict = dict(attrs)
        if "id" in attr_dict:
            self.ids.append(attr_dict["id"])
        if "class" in attr_dict:
            for c in attr_dict["class"].split():
                self.classes.add(c)
        for k, v in attr_dict.items():
            if k.startswith("on"):
                self.handlers.append((k, v))
        if tag == "a" and "href" in attr_dict:
            self.links.append(attr_dict["href"])

def run_audit():
    print("=" * 60)
    print("REVIO DOM, CSS & JS INTEGRITY AUDIT")
    print("=" * 60)

    html_content = HTML_PATH.read_text(encoding="utf-8")
    css_content = CSS_PATH.read_text(encoding="utf-8")
    tokens_content = TOKENS_PATH.read_text(encoding="utf-8")
    js_content = JS_PATH.read_text(encoding="utf-8")

    parser = DomCollector()
    parser.feed(html_content)

    print(f"\n1. HTML Structure:")
    print(f"   - Total tags parsed: {len(parser.tags)}")
    print(f"   - Unique IDs defined: {len(set(parser.ids))}")
    print(f"   - Unique Classes: {len(parser.classes)}")
    print(f"   - Inline Event Handlers: {len(parser.handlers)}")

    # Check for duplicate IDs
    seen_ids = set()
    dup_ids = set()
    for el_id in parser.ids:
        if el_id in seen_ids:
            dup_ids.add(el_id)
        seen_ids.add(el_id)
    if dup_ids:
        print(f"   [!] DUPLICATE IDs DETECTED: {dup_ids}")
    else:
        print("   [OK] No duplicate IDs in HTML.")

    # 2. Check JS getElementById references against HTML
    print(f"\n2. JavaScript getElementById References:")
    js_ids = set(re.findall(r'getElementById\([\'"]([^\'"]+)[\'"]\)', js_content))
    print(f"   - Total getElementById references in JS: {len(js_ids)}")
    
    missing_ids = js_ids - seen_ids
    if missing_ids:
        print(f"   [!] JS REFERENCES MISSING IN HTML ({len(missing_ids)}):")
        for m in sorted(missing_ids):
            print(f"       - '{m}'")
    else:
        print("   [OK] All getElementById references exist in HTML.")

    # 3. Check inline event handlers in HTML against JS definitions
    print(f"\n3. Inline Event Handlers Verification:")
    handler_funcs = set()
    for attr, expr in parser.handlers:
        # Match function name before parentheses or parameters
        m = re.match(r'([a-zA-Z0-9_$]+)\s*\(?', expr.strip())
        if m:
            handler_funcs.add(m.group(1))

    missing_handlers = []
    for fn in sorted(handler_funcs):
        # Look for window.fn or function fn in JS
        pattern = rf'(window\.{fn}\s*=|function\s+{fn}\b|const\s+{fn}\s*=|let\s+{fn}\s*=)'
        if not re.search(pattern, js_content):
            missing_handlers.append(fn)

    if missing_handlers:
        print(f"   [!] MISSING HANDLERS IN JS ({len(missing_handlers)}):")
        for h in missing_handlers:
            print(f"       - '{h}'")
    else:
        print(f"   [OK] All {len(handler_funcs)} inline handler functions are properly exposed in JS.")

    # 4. Check CSS Classes used in HTML vs defined in CSS
    print(f"\n4. CSS Classes & Token Coverage:")
    defined_classes = set(re.findall(r'\.([a-zA-Z0-9_-]+)\s*[{:,.\s]', css_content))
    defined_classes.update(re.findall(r'\.([a-zA-Z0-9_-]+)\s*[{:,.\s]', tokens_content))

    missing_classes = []
    for cls in sorted(parser.classes):
        if cls not in defined_classes:
            missing_classes.append(cls)

    if missing_classes:
        print(f"   [i] Classes in HTML without explicit top-level CSS selector ({len(missing_classes)}):")
        for c in missing_classes:
            print(f"       - .{c}")
    else:
        print("   [OK] All HTML classes have matching CSS definitions.")

    # 5. Check CSS Variables used vs defined
    print(f"\n5. CSS Variable Resolution:")
    used_vars = set(re.findall(r'var\((--[a-zA-Z0-9_-]+)\)', css_content))
    defined_vars = set(re.findall(r'(--[a-zA-Z0-9_-]+)\s*:', tokens_content))
    defined_vars.update(re.findall(r'(--[a-zA-Z0-9_-]+)\s*:', css_content))

    unresolved_vars = used_vars - defined_vars
    if unresolved_vars:
        print(f"   [!] UNRESOLVED CSS VARIABLES ({len(unresolved_vars)}):")
        for v in sorted(unresolved_vars):
            print(f"       - {v}")
    else:
        print(f"   [OK] All {len(used_vars)} CSS custom properties successfully resolve.")

    print("\n" + "=" * 60)
    print("AUDIT COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run_audit()
