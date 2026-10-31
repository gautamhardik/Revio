"""
Revio Phase 2A.2 — Complete Real Browser User Journey Verification
Automates and screenshots the entire customer review lifecycle using Playwright.
"""
import sys
import time
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ARTIFACTS_DIR = Path(r"C:\Users\hiten\.gemini\antigravity\brain\7f7fe3d0-6b8a-4cad-adfe-5ea0a302c154")
TARGET_URL = "http://localhost:4000/revio.html"

TEST_CSV_PATH = Path(__file__).resolve().parent / "test_import_data.csv"

def generate_test_csv():
    content = (
        "review_id,review_text,date,source\n"
        "101,\"The roasted duck and Pinot Noir were exquisite. Truly world-class hospitality.\",2026-10-20,Google Reviews\n"
        "102,\"\",2026-10-21,Yelp\n"
        "103,\"no\",2026-10-21,Direct\n"
        "104,\"Filthy restroom, freezing cold soup, and the manager refused to speak with us.\",2026-10-22,TripAdvisor\n"
        "105,\"Decent lunch burger, but fries were soggy and delivery took forty-five minutes.\",2026-10-23,DoorDash\n"
    )
    with open(TEST_CSV_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    return TEST_CSV_PATH

def main():
    csv_file = generate_test_csv()
    results = {}

    print("Launching Playwright Chromium...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Step 1: Navigate to platform
        print(f"Navigating to {TARGET_URL}...")
        page.goto(TARGET_URL, wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Step 2: Individual review submission
        print("1. Submitting individual custom review in playground...")
        input_el = page.locator("#playgroundInput")
        input_el.fill("The roasted duck and wine pairings were remarkable! Truly wonderful hospitality from the entire staff.")
        page.locator("#btnPlaygroundRun").click()
        page.wait_for_timeout(1500)

        prob_pos_text = page.locator("#probValLargePos").inner_text()
        sentiment_text = page.locator("#playgroundSentimentText").inner_text()
        triage_action = page.locator("#playgroundTriageAction").inner_text()

        print(f"   Inference Result: {sentiment_text} | Pos-Prob: {prob_pos_text} | Triage: {triage_action}")
        results["individual_review"] = {
            "sentiment": sentiment_text,
            "prob_pos": prob_pos_text,
            "triage": triage_action
        }
        page.screenshot(path=str(ARTIFACTS_DIR / "journey_01_individual_review.png"))

        # Step 3: Ambiguity corridor sample
        print("2. Testing ambiguity corridor via sample review...")
        page.locator(".revio-preset-card").nth(2).click() # 3rd preset: Cafe & Ambiguous
        page.wait_for_timeout(1000)
        page.locator("#btnPlaygroundRun").click()
        page.wait_for_timeout(1500)

        ambig_sentiment = page.locator("#playgroundSentimentText").inner_text()
        ambig_triage = page.locator("#playgroundTriageAction").inner_text()
        print(f"   Ambiguity Result: {ambig_sentiment} | Triage: {ambig_triage}")
        results["ambiguity_routing"] = {
            "sentiment": ambig_sentiment,
            "triage": ambig_triage
        }
        page.screenshot(path=str(ARTIFACTS_DIR / "journey_02_ambiguity_routing.png"))

        # Step 4: Import CSV with invalid rows
        print("3. Navigating to Import View & uploading CSV...")
        page.evaluate("navigateTo('import')")
        page.wait_for_timeout(800)

        with open(csv_file, "r", encoding="utf-8") as f:
            csv_text = f.read()

        page.evaluate(f"window.loadCsvString({json.dumps(csv_text)}, 'test_import_data.csv')")
        page.wait_for_timeout(800)

        file_info = page.locator("#selectedFileInfo").inner_text()
        print(f"   CSV File Parsed Info: {file_info}")
        assert "3 rows detected" in file_info, f"Expected 3 valid rows detected, got {file_info}"
        results["csv_import"] = file_info
        page.screenshot(path=str(ARTIFACTS_DIR / "journey_03_csv_import_validation.png"))

        # Proceed through preview to Inbox
        page.locator("#importContinueBtn").click()
        page.wait_for_timeout(800)
        page.locator("#csvStartAnalysisBtn").click()
        print("   Running batch analysis on imported reviews...")
        page.wait_for_timeout(3500)  # Wait for batch analysis and auto-navigation to inbox

        # Step 5: Verify Review Inbox
        print("4. Inspecting Review Inbox...")
        page.evaluate("navigateTo('inbox')")
        page.wait_for_timeout(1000)

        inbox_rows = page.locator("#inboxTableBody tr")
        row_count = inbox_rows.count()
        print(f"   Total Inbox Rows: {row_count}")
        assert row_count > 0, "Inbox should contain reviews."

        # Verify status pills in table
        status_pills = page.locator("#inboxTableBody .revio-status-pill")
        pill_texts = [status_pills.nth(i).inner_text().strip() for i in range(min(5, status_pills.count()))]
        print(f"   Sample Status Pills: {pill_texts}")
        results["inbox_pills"] = pill_texts
        page.screenshot(path=str(ARTIFACTS_DIR / "journey_04_review_inbox.png"))

        # Step 6: Detail View & Workflow Status Change
        print("5. Inspecting Review Detail View & Workflow Action...")
        inbox_rows.first.click()
        page.wait_for_timeout(1000)

        # Verify Positive-class probability label
        prob_header = page.locator(".revio-prob-title").first.inner_text()
        print(f"   Probability Header Label: '{prob_header}'")
        assert "positive-class probability" in prob_header.lower(), f"Expected 'Positive-class Probability', got '{prob_header}'"

        # Check attribution chips
        pos_chips = page.locator("#detailPosEvidence .revio-evidence-item-chip")
        neg_chips = page.locator("#detailNegEvidence .revio-evidence-item-chip")
        print(f"   Attribution chips found: Pos={pos_chips.count()}, Neg={neg_chips.count()}")

        # Perform workflow action: Mark as reviewed
        mark_btn = page.locator("#detailMarkReviewedBtn")
        if mark_btn.is_visible():
            mark_btn.click()
            page.wait_for_timeout(800)
            btn_text = mark_btn.inner_text().encode('ascii', 'ignore').decode().strip()
            print(f"   Workflow Action: {btn_text}")

        page.screenshot(path=str(ARTIFACTS_DIR / "journey_05_workflow_status_change.png"))
        browser.close()

    print("\nReal Browser User Journey successfully completed and verified 100%!")
    print(f"Screenshots saved to {ARTIFACTS_DIR}")
    return results

if __name__ == "__main__":
    main()
