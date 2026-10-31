"""
Capture visual evidence of theme consistency across light and dark mode.
"""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = Path(__file__).resolve().parent / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR = Path(r"C:\Users\hiten\.gemini\antigravity\brain\7f7fe3d0-6b8a-4cad-adfe-5ea0a302c154")

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        # 1. Landing Page Fold (Light Mode Default)
        page.goto("http://localhost:4000/revio.html#landing")
        page.wait_for_timeout(1000)
        hero_path = SCREENSHOTS_DIR / "audit_01_landing_hero.png"
        page.screenshot(path=str(hero_path))
        print(f"Captured: {hero_path}")
        
        # 2. Landing Studio Stage
        page.locator("#revioStudioStage").scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        studio_path = SCREENSHOTS_DIR / "audit_02_landing_studio_stage.png"
        page.screenshot(path=str(studio_path))
        print(f"Captured: {studio_path}")
        
        # 3. Landing Bento Section (The previously jarring section)
        page.locator(".revio-bento-section").scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        bento_path = SCREENSHOTS_DIR / "audit_03_landing_bento_grid_light.png"
        page.screenshot(path=str(bento_path))
        print(f"Captured: {bento_path}")

        # 4. Full Landing Page in Light Mode
        full_light_path = SCREENSHOTS_DIR / "audit_04_landing_full_light.png"
        page.screenshot(path=str(full_light_path), full_page=True)
        print(f"Captured: {full_light_path}")

        # 5. Toggle to Dark Mode via landing Theme Button
        page.locator("#landingThemeBtn").click()
        page.wait_for_timeout(500)
        
        # 6. Full Landing Page in Dark Mode
        full_dark_path = SCREENSHOTS_DIR / "audit_05_landing_full_dark.png"
        page.screenshot(path=str(full_dark_path), full_page=True)
        print(f"Captured: {full_dark_path}")

        # 7. Bento Grid in Dark Mode
        page.locator(".revio-bento-section").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        bento_dark_path = SCREENSHOTS_DIR / "audit_06_landing_bento_dark.png"
        page.screenshot(path=str(bento_dark_path))
        print(f"Captured: {bento_dark_path}")

        # 8. App Shell - Review Inbox in Dark Mode
        page.goto("http://localhost:4000/revio.html#inbox")
        page.wait_for_timeout(600)
        inbox_dark_path = SCREENSHOTS_DIR / "audit_07_inbox_dark.png"
        page.screenshot(path=str(inbox_dark_path))
        print(f"Captured: {inbox_dark_path}")

        # 9. App Shell - Settings with Theme Buttons
        page.goto("http://localhost:4000/revio.html#settings")
        page.wait_for_timeout(500)
        settings_dark_path = SCREENSHOTS_DIR / "audit_08_settings_dark.png"
        page.screenshot(path=str(settings_dark_path))
        print(f"Captured: {settings_dark_path}")

        # 10. Switch back to light mode via Settings
        page.locator("#themeBtnLight").click()
        page.wait_for_timeout(400)
        settings_light_path = SCREENSHOTS_DIR / "audit_09_settings_light.png"
        page.screenshot(path=str(settings_light_path))
        print(f"Captured: {settings_light_path}")

        # 11. App Shell - Review Inbox in Light Mode
        page.goto("http://localhost:4000/revio.html#inbox")
        page.wait_for_timeout(600)
        inbox_light_path = SCREENSHOTS_DIR / "audit_10_inbox_light.png"
        page.screenshot(path=str(inbox_light_path))
        print(f"Captured: {inbox_light_path}")

        browser.close()

    # Copy files to artifacts dir
    for f in SCREENSHOTS_DIR.glob("audit_*.png"):
        dest = ARTIFACTS_DIR / f.name
        shutil.copy2(f, dest)
        print(f"Copied to artifact: {dest}")

if __name__ == "__main__":
    capture()

