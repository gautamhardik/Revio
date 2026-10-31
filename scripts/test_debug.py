from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page()
    page.goto('http://localhost:4000/revio.html')
    content = 'review_text,date\nDelicious food and fast delivery\nBad food cold soup\nAverage meal'
    res = page.evaluate('csv => window.loadCsvString(csv, "test.csv")', content)
    print('Parsed:', res)
    b.close()

