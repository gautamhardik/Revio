"""
Visual comparison generator between page_references and live screenshots.
"""
from pathlib import Path
from PIL import Image

REF_DIR = Path("revio_antigravity_handoff/revio_antigravity_handoff/page_references")
SHOTS_DIR = Path("scripts/screenshots")

PAIRS = [
    ("01_landing_page.png", "01_live_landing.png", "comp_01.png"),
    ("02_onboarding_import.png", "02_live_import.png", "comp_02.png"),
    ("04_analysis_processing.png", "04_live_processing.png", "comp_04.png"),
    ("05_results_overview.png", "05_live_results.png", "comp_05.png"),
    ("06_review_inbox.png", "06_live_inbox.png", "comp_06.png"),
    ("07_review_detail.png", "07_live_detail.png", "comp_07.png"),
    ("08_insights.png", "08_live_insights.png", "comp_08.png"),
    ("09_model_lab.png", "09_live_model_lab.png", "comp_09.png"),
    ("10_settings.png", "10_live_settings.png", "comp_10.png"),
]

def main():
    for ref_name, live_name, comp_name in PAIRS:
        ref_file = REF_DIR / ref_name
        live_file = SHOTS_DIR / live_name
        if not ref_file.exists() or not live_file.exists():
            print(f"Skipping {comp_name}: missing {ref_file.exists()} / {live_file.exists()}")
            continue
        im_ref = Image.open(ref_file)
        im_live = Image.open(live_file)
        
        # Scale to same height
        target_h = 800
        ref_w = int(im_ref.width * (target_h / im_ref.height))
        live_w = int(im_live.width * (target_h / im_live.height))
        
        im_ref_scaled = im_ref.resize((ref_w, target_h), Image.Resampling.LANCZOS)
        im_live_scaled = im_live.resize((live_w, target_h), Image.Resampling.LANCZOS)
        
        canvas = Image.new("RGB", (ref_w + live_w + 10, target_h), (50, 50, 50))
        canvas.paste(im_ref_scaled, (0, 0))
        canvas.paste(im_live_scaled, (ref_w + 10, 0))
        
        out_path = SHOTS_DIR / comp_name
        canvas.save(out_path)
        print(f"Created {comp_name}: Ref({ref_w}x{target_h}) | Live({live_w}x{target_h})")

if __name__ == "__main__":
    main()

