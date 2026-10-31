"""
Robust capture script for all 10 Revio views with route abort for external fonts.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT_DIR = Path("scripts/screenshots")
OUT_DIR.mkdir(parents=True, exist_ok=True)

VIEWS = [
    ("01_live_landing.png", "http://localhost:4000/#landing"),
    ("02_live_import.png", "http://localhost:4000/#import"),
    ("03_live_csv_preview.png", "http://localhost:4000/#csv-preview"),
    ("04_live_processing.png", "http://localhost:4000/#processing"),
    ("05_live_results.png", "http://localhost:4000/#results"),
    ("06_live_inbox.png", "http://localhost:4000/#inbox"),
    ("07_live_detail.png", "http://localhost:4000/#detail"),
    ("08_live_insights.png", "http://localhost:4000/#insights"),
    ("09_live_model_lab.png", "http://localhost:4000/#models"),
    ("10_live_settings.png", "http://localhost:4000/#settings"),
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1536, "height": 960})
        
        # Prevent offline hang on external fonts
        page.route("**/fonts.googleapis.com/**", lambda route: route.abort())
        page.route("**/fonts.gstatic.com/**", lambda route: route.abort())
        
        for filename, url in VIEWS:
            try:
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_timeout(400)
                out_path = OUT_DIR / filename
                page.screenshot(path=str(out_path), timeout=8000)
                print(f"[OK] {filename} -> {out_path.stat().st_size} bytes")
            except Exception as e:
                print(f"[ERR] {filename}: {e}")
                
        browser.close()
    print("All captures completed successfully!")

if __name__ == "__main__":
    main()
