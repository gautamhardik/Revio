"""
Capture screenshots of all Revio views using Playwright for visual auditing.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = Path(__file__).resolve().parent / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

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
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        # Initial load and setup demo data so all views render with real data
        page.goto("http://localhost:4000/#import")
        page.wait_for_timeout(500)
        
        # Click "Try a sample" to populate the state with reviews
        sample_card = page.locator("[data-choice='sample']")
        if sample_card.count() > 0:
            sample_card.click()
            page.wait_for_timeout(300)
            
        for filename, url in VIEWS:
            out_file = SCREENSHOTS_DIR / filename
            page.goto(url)
            page.wait_for_timeout(600)
            page.screenshot(path=str(out_file), full_page=False)
            print(f"[CAPTURED] {filename} -> {out_file.stat().st_size} bytes")
            
        browser.close()
    print("All screenshots successfully captured!")

if __name__ == "__main__":
    main()

