"""
Updates user-facing labels in frontend/js/revio-app.js
- Changes 'Calibrated Class Probability' to 'Positive-class Probability'
- Changes 'AUTO-ACKNOWLEDGE' to 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED'
- Changes table pill to 'Low priority'
"""
with open('frontend/js/revio-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ("const statusLabel = r.reviewed ? 'Reviewed' : (r.needs_human_review ? 'Needs review' : 'Auto-ack');",
     "const statusLabel = r.reviewed ? 'Reviewed' : (r.needs_human_review ? 'Needs review' : 'Low priority');"),
    ("const statusClass = r.reviewed ? 'auto-ack' : (r.needs_human_review ? 'needs-review' : 'auto-ack');",
     "const statusClass = r.reviewed ? 'reviewed' : (r.needs_human_review ? 'needs-review' : 'low-priority auto-ack');"),
    ("// Calibrated Class Probability Breakdown",
     "// Positive-class Probability Breakdown"),
    ("if (triageStatusEl) triageStatusEl.textContent = `AUTO-ACKNOWLEDGE (${cat})`;",
     "if (triageStatusEl) triageStatusEl.textContent = 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED';"),
    ("attEl.textContent = `High-confidence praise with no critical risk triggers. Safe for automated customer acknowledgement.`;",
     "attEl.textContent = 'High-confidence praise with no critical risk triggers. Classified as low priority (no manual human review required).';"),
    (": 'Auto-acknowledged by triage rule. Safe for automated customer follow-up.';",
     ": 'Classified as low priority (no manual human review required).';"),
    ("High-confidence positive polarity exceeding the calibrated operational threshold",
     "High-confidence positive polarity exceeding the operational decision threshold"),
    ("Polarity falls below the calibrated operational threshold",
     "Positive-class probability falls below the operational decision threshold"),
    ("AUTO-ACKNOWLEDGE (High Confidence Praise)",
     "LOW PRIORITY / NO HUMAN REVIEW REQUIRED"),
    ("'High-confidence review processed and acknowledged in accordance with threshold policy.'",
     "'High-confidence positive review meeting operational threshold. Classified as low priority (no manual human review required).'"),
    ('"triage_status": "AUTO-ACKNOWLEDGE"',
     '"triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED"'),
    ("triage_status: isNeg ? 'ESCALATE (Negative / Risk)' : 'AUTO-ACKNOWLEDGE'",
     "triage_status: isNeg ? 'ESCALATE (Negative / Risk)' : 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED'"),
    ("triage_status: isNeg ? 'ESCALATE (High Risk)' : (isMixed ? 'ESCALATE (Mixed Review)' : 'AUTO-ACKNOWLEDGE')",
     "triage_status: isNeg ? 'ESCALATE (High Risk)' : (isMixed ? 'ESCALATE (Mixed Review)' : 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED')")
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        count += 1
    else:
        print('NOT FOUND:', old[:60])

with open('frontend/js/revio-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Successfully updated {count}/{len(replacements)} blocks in frontend/js/revio-app.js')

