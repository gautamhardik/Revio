import csv
import json
import urllib.request
import time
from pathlib import Path

csv_path = Path("revio_100_reviews_comprehensive_test.csv")

with open(csv_path, mode="r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Total rows in CSV: {len(rows)}")

# Simulate Revio frontend parseCsvContent validation
valid_reviews = []
invalid_reviews = []

for idx, r in enumerate(rows):
    text = (r.get("review_text") or "").strip()
    if len(text) > 3:
        valid_reviews.append(r)
    else:
        invalid_reviews.append(r)

print(f"Valid reviews (>3 chars): {len(valid_reviews)}")
print(f"Invalid / empty reviews: {len(invalid_reviews)}")

# Send valid reviews to Vercel live batch endpoint
batch_payload = {
    "reviews": [r["review_text"] for r in valid_reviews]
}

t0 = time.perf_counter()
req = urllib.request.Request(
    "https://revio-taupe.vercel.app/api/v1/revio/batch",
    data=json.dumps(batch_payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "User-Agent": "RevioTest100/1.0"}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
elapsed_total_ms = (time.perf_counter() - t0) * 1000

print(f"\nBatch processing HTTP response: {resp.status}")
print(f"Total processed by API: {res.get('count')}")
print(f"Total network roundtrip latency: {elapsed_total_ms:.2f} ms")

results = res.get("reviews", [])
sum_inference_ms = sum(r.get("latency_ms", 0.0) for r in results)
avg_inference_ms = sum_inference_ms / len(results) if results else 0

print(f"Sum of serverless inference latencies: {sum_inference_ms:.2f} ms (~{avg_inference_ms:.2f} ms/review)")

# Merge metadata back with results
merged = []
for orig, r in zip(valid_reviews, results):
    merged.append({
        "id": orig["review_id"],
        "category": orig["test_category"],
        "domain": orig["domain"],
        "rating": orig["rating"],
        "text": orig["review_text"],
        "expected_sentiment": orig["expected_sentiment"],
        "pred_sentiment": r["sentiment"],
        "pos_prob": r["positive_probability"],
        "triage_status": r["triage_status"],
        "needs_human_review": r["needs_human_review"],
        "domain_validated": r.get("domain_validated", True)
    })

# Distribution analysis
pos_count = sum(1 for r in merged if r["pred_sentiment"] == "Positive")
neg_count = sum(1 for r in merged if r["pred_sentiment"] == "Negative")
ambiguity_count = sum(1 for r in merged if "Ambiguity" in r.get("triage_status", ""))
unvalidated_domain_count = sum(1 for r in merged if not r.get("domain_validated", True))
low_priority_count = sum(1 for r in merged if "LOW PRIORITY" in r.get("triage_status", ""))
negative_escalate_count = sum(1 for r in merged if "Negative / High Risk" in r.get("triage_status", ""))

print("\n--- SUMMARY METRICS (98 Valid Rows Analysed) ---")
print(f"Positive Sentiment: {pos_count} ({pos_count/len(merged)*100:.1f}%)")
print(f"Negative Sentiment: {neg_count} ({neg_count/len(merged)*100:.1f}%)")
print(f"Ambiguity Corridor Escalations [0.40, 0.60]: {ambiguity_count}")
print(f"Unvalidated Domain Quarantines: {unvalidated_domain_count}")
print(f"Low Priority / No Human Review Required: {low_priority_count}")
print(f"Negative / High Risk Escalations: {negative_escalate_count}")

# Save detailed results
detailed_output = {
    "summary": {
        "total_csv_rows": len(rows),
        "valid_processed": len(valid_reviews),
        "invalid_filtered": len(invalid_reviews),
        "positive": pos_count,
        "negative": neg_count,
        "ambiguity_corridor_escalations": ambiguity_count,
        "unvalidated_domain_quarantines": unvalidated_domain_count,
        "low_priority_auto_approved": low_priority_count,
        "negative_high_risk_escalations": negative_escalate_count,
        "avg_inference_latency_ms": avg_inference_ms,
        "total_roundtrip_ms": elapsed_total_ms
    },
    "results": merged
}

with open("scripts/revio_100_reviews_evaluation_results.json", "w", encoding="utf-8") as out_f:
    json.dump(detailed_output, out_f, indent=2)

print("\nFull evaluation saved to scripts/revio_100_reviews_evaluation_results.json")
