"""
Capture all live views with pre-seeded reviews for visual comparison.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT_DIR = Path("scripts/screenshots")
OUT_DIR.mkdir(parents=True, exist_ok=True)

VIEWS = [
    ("01_live_landing.png", "http://localhost:4000/#landing"),
    ("02_live_import.png", "http://localhost:4000/#import"),
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
        
        # Load app
        page.goto("http://localhost:4000/#import")
        page.wait_for_timeout(500)
        
        # Seed state with reviews directly
        page.evaluate("""() => {
            if (typeof SAMPLE_REVIEWS !== 'undefined' && typeof state !== 'undefined') {
                state.reviews = SAMPLE_REVIEWS.map((r, i) => ({
                    id: 1000 + i,
                    text: r.text,
                    sentiment: r.sentiment || (i % 3 === 0 ? 'Negative' : (i % 3 === 1 ? 'Mixed' : 'Positive')),
                    positive_probability: (i % 3 === 0 ? 0.18 : (i % 3 === 1 ? 0.52 : 0.94)),
                    needs_human_review: i % 3 === 0 || i % 3 === 1,
                    triage_status: (i % 3 === 0 ? 'ESCALATE (Negative / Risk)' : (i % 3 === 1 ? 'ESCALATE (Mixed Review)' : 'AUTO-ACKNOWLEDGE')),
                    word_contributions: [
                        { term: 'clean', weight: 1.8, polarity: 'Positive' },
                        { term: 'staff', weight: 1.4, polarity: 'Positive' },
                        { term: 'delay', weight: -1.6, polarity: 'Negative' },
                        { term: 'unresponsive', weight: -2.1, polarity: 'Negative' }
                    ],
                    source: r.source || 'Google Reviews',
                    date: r.date || '12 Oct 2026',
                    reviewed: false
                }));
                state.selectedReviewId = state.reviews[0].id;
                persistReviews();
            }
        }""")
        
        for filename, url in VIEWS:
            page.goto(url)
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT_DIR / filename))
            print(f"[OK] {filename}")
            
        browser.close()
    print("Done capturing all views!")

if __name__ == "__main__":
    main()

