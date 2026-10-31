"""
Capture comprehensive visual evidence of the Revio landing page professional refinement.
"""
from pathlib import Path
import shutil
import time
from playwright.sync_api import sync_playwright

ARTIFACTS_DIR = Path(r"C:\Users\hiten\.gemini\antigravity\brain\7f7fe3d0-6b8a-4cad-adfe-5ea0a302c154")
SCREENSHOTS_DIR = Path(__file__).resolve().parent / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # =====================================================================
        # 1. Desktop Experience (1440 x 900)
        # =====================================================================
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:4000/revio.html#landing")
        page.wait_for_timeout(1200)

        # 1.1 Hero Section
        p1 = SCREENSHOTS_DIR / "refinement_01_hero_desktop.png"
        page.screenshot(path=str(p1))
        print(f"Captured: {p1}")

        # 1.2 Studio Stage with Preset 0 (Dining / Pizza) evaluated
        page.locator("#revioStudioStage").scroll_into_view_if_needed()
        page.wait_for_timeout(600)
        p2 = SCREENSHOTS_DIR / "refinement_02_workspace_preset0_pizza.png"
        page.screenshot(path=str(p2))
        print(f"Captured: {p2}")

        # 1.3 Click Preset 1: Hospitality / Hotel
        presets = page.locator(".revio-preset-card")
        presets.nth(1).click()
        page.wait_for_timeout(800)
        p3 = SCREENSHOTS_DIR / "refinement_03_workspace_preset1_hospitality.png"
        page.screenshot(path=str(p3))
        print(f"Captured: {p3}")

        # 1.4 Click Preset 2: Travel / Facilities
        presets.nth(2).click()
        page.wait_for_timeout(800)
        p4 = SCREENSHOTS_DIR / "refinement_04_workspace_preset2_travel.png"
        page.screenshot(path=str(p4))
        print(f"Captured: {p4}")

        # 1.5 Click Preset 3: Guest Service / Ambiguous
        presets.nth(3).click()
        page.wait_for_timeout(800)
        p5 = SCREENSHOTS_DIR / "refinement_05_workspace_preset3_ambiguous.png"
        page.screenshot(path=str(p5))
        print(f"Captured: {p5}")

        # 1.6 Architecture & Signals (Bento Grid)
        page.locator(".revio-bento-section").scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        p6 = SCREENSHOTS_DIR / "refinement_06_architecture_signals.png"
        page.screenshot(path=str(p6))
        print(f"Captured: {p6}")

        # 1.7 Final CTA & Footer
        page.locator(".revio-bottom-banner").scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        p7 = SCREENSHOTS_DIR / "refinement_07_cta_and_footer.png"
        page.screenshot(path=str(p7))
        print(f"Captured: {p7}")

        # 1.8 Full Landing Page
        p8 = SCREENSHOTS_DIR / "refinement_08_full_page.png"
        page.screenshot(path=str(p8), full_page=True)
        print(f"Captured: {p8}")
        page.close()

        # =====================================================================
        # 2. Tablet Viewport (768 x 1024)
        # =====================================================================
        page_tablet = browser.new_page(viewport={"width": 768, "height": 1024})
        page_tablet.goto("http://localhost:4000/revio.html#landing")
        page_tablet.wait_for_timeout(1000)
        page_tablet.locator("#revioStudioStage").scroll_into_view_if_needed()
        page_tablet.wait_for_timeout(500)
        p9 = SCREENSHOTS_DIR / "refinement_09_tablet_workspace.png"
        page_tablet.screenshot(path=str(p9))
        print(f"Captured: {p9}")
        page_tablet.close()

        # =====================================================================
        # 3. Mobile Viewport (375 x 812)
        # =====================================================================
        page_mobile = browser.new_page(viewport={"width": 375, "height": 812})
        page_mobile.goto("http://localhost:4000/revio.html#landing")
        page_mobile.wait_for_timeout(1000)
        page_mobile.locator("#revioStudioStage").scroll_into_view_if_needed()
        page_mobile.wait_for_timeout(500)
        p10 = SCREENSHOTS_DIR / "refinement_10_mobile_workspace.png"
        page_mobile.screenshot(path=str(p10))
        print(f"Captured: {p10}")
        page_mobile.close()

        browser.close()

    # Copy all to artifacts dir
    for f in SCREENSHOTS_DIR.glob("refinement_*.png"):
        dest = ARTIFACTS_DIR / f.name
        shutil.copy2(f, dest)
        print(f"Copied to artifact: {dest}")

if __name__ == "__main__":
    run()
