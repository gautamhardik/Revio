import csv
import io
import json
import urllib.request

raw_csv = '''review_id,review_text,domain,reference_sentiment,test_category
RV001,"The paneer tikka was smoky and perfectly seasoned, and the staff checked on us without being intrusive. I would happily come back.",restaurant,positive,clear_positive
RV002,"Fresh ingredients, generous portions, and excellent service. The meal arrived hot and exactly as ordered.",restaurant,positive,clear_positive
RV003,"The coffee was rich, the seating area was clean, and the barista was friendly. A great place to work for an hour.",cafe,positive,clear_positive
RV004,"Our room was spotless, the bed was comfortable, and reception arranged an early check-in. Excellent stay.",hotel,positive,clear_positive
RV005,"The food was cold, the order was incomplete, and nobody responded when we asked for help. Very disappointing.",restaurant,negative,clear_negative
RV006,We waited almost an hour after our reservation time. The table was dirty and the manager was dismissive.,restaurant,negative,clear_negative
RV007,"The room smelled damp, the air conditioner barely worked, and the towels were not replaced during our stay.",hotel,negative,clear_negative
RV008,Overpriced for the quality. The pasta was bland and the portion was tiny.,restaurant,negative,clear_negative
RV009,"The location is convenient and the staff were polite, but the food took a long time and was only average.",restaurant,mixed,mixed_signal_binary_model
RV010,"Beautiful ambience and tasty dessert. Unfortunately, our main courses arrived cold.",restaurant,mixed,mixed_signal_binary_model
RV011,"Nothing special, but nothing terrible either. The room was fine and the breakfast was ordinary.",hotel,neutral,neutral_or_ambiguous
RV012,It was okay. Service was neither particularly good nor particularly bad.,restaurant,neutral,short_ambiguous
RV013,They charged my card twice and customer support has refused to refund the extra payment despite three calls.,restaurant,negative,out_of_domain_text_conflict
RV014,"The mobile network stopped working for two days, and the telecom support team closed my complaint without resolving it.",telecommunications,negative,out_of_domain
RV015,"The delivery arrived late, but the packaging was intact and the support agent quickly resolved the issue.",retail,mixed,adjacent_domain
RV016,"The guide was knowledgeable and the views were beautiful, although the bus was uncomfortable and arrived late.",travel,mixed,adjacent_domain
RV017,The staff handled our complaint professionally and replaced the incorrect dish immediately. The experience ended well.,restaurant,positive,recovery_after_problem
RV018,"The booking process was confusing, nobody answered the phone, and we were told our reservation did not exist when we arrived.",hotel,negative,operational_failure
RV019,"Delicious food 😋, quick service, and a lovely atmosphere. Definitely recommended!",restaurant,positive,unicode_emoji
RV020,"The café was clean, but the music was too loud for conversation; the cappuccino was good, though.",cafe,mixed,punctuation_and_mixed
RV021,no,restaurant,invalid,invalid_short_noise
RV022,,restaurant,invalid,invalid_empty'''

reader = csv.DictReader(io.StringIO(raw_csv.strip()))
rows = list(reader)

valid_rows = [r for r in rows if len(r['review_text'].strip()) > 3]
invalid_rows = [r for r in rows if len(r['review_text'].strip()) <= 3]
print(f"Total CSV rows: {len(rows)} | Valid reviews: {len(valid_rows)} | Invalid/Filtered rows: {len(invalid_rows)}")

results = []
for r in valid_rows:
    payload = json.dumps({'text': r['review_text'], 'domain': r['domain']}).encode('utf-8')
    req = urllib.request.Request(
        'https://revio-taupe.vercel.app/api/v1/revio/predict',
        data=payload,
        headers={'Content-Type': 'application/json', 'User-Agent': 'RevioEvaluation/1.0'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        results.append({
            'id': r['review_id'],
            'category': r['test_category'],
            'ref': r['reference_sentiment'],
            'pred_sentiment': res['sentiment'],
            'pos_prob': res['positive_probability'],
            'triage': res['triage_status'],
            'domain_validated': res['domain_validated'],
            'domain': res['domain'],
            'latency_ms': res['latency_ms']
        })

print("\n--- DETAILED EVALUATION TABLE ---")
print(f"{'ID':<6} | {'Category':<28} | {'Ref':<8} | {'Pred':<8} | {'P(Pos)':<7} | {'Triage Status':<36} | {'Domain Valid'}")
print("-" * 115)
for res in results:
    p_pct = f"{res['pos_prob']*100:.1f}%"
    print(f"{res['id']:<6} | {res['category']:<28} | {res['ref']:<8} | {res['pred_sentiment']:<8} | {p_pct:<7} | {res['triage']:<36} | {res['domain_validated']}")

with open("scripts/user_test_csv_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)
