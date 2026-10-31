"""
Revio Sustained Performance Load Test & Resource Audit
Directly benchmarks HTTP throughput, latency percentiles (p50, p95, p99),
error rates, CPU, and memory utilization under sustained concurrent load.
"""
import time
import json
import statistics
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import psutil

TARGET_URL = "http://localhost:8008/api/v1/revio/predict"
GATEWAY_URL = "http://localhost:4000/api/v1/revio/predict"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "revio_business_review_experiment" / "artifacts" / "load_test_results.json"

TEST_REVIEWS = [
    "The ribeye steak was cooked to absolute perfection, and the wine pairing was outstanding!",
    "Terrible customer service. Waited 45 minutes for drinks and our waiter was completely rude.",
    "Decent lunch spot, food was okay but nothing to write home about.",
    "The room was fairly clean and close to transit, but the heating made an intermittent humming noise.",
    "Exceptional boutique hotel! Impeccable cleanliness, charming decor, and delicious breakfast included.",
    "Completely unacceptable experience. The air conditioner leaked all over our luggage and manager refused refund.",
    "Standard pizza, reasonably fast delivery, but the crust was slightly underbaked.",
    "Outstanding hospitality from the front desk staff, highly recommended for business travelers."
]

thread_local = threading.local()

def get_session():
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
    return thread_local.session

def send_request(url: str, text: str, version: str = "candidate") -> tuple[float, int, bool]:
    session = get_session()
    payload = {"text": text, "model_version": version}
    t0 = time.perf_counter()
    try:
        resp = session.post(url, json=payload, timeout=10.0)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return elapsed_ms, resp.status_code, resp.status_code == 200
    except Exception:
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return elapsed_ms, 500, False

def run_benchmark(url: str, total_requests: int = 500, concurrency: int = 10, label: str = "ML Service (FastAPI)"):
    print(f"\n--- Running Load Test on {label} ---")
    print(f"Target: {url} | Total Requests: {total_requests} | Concurrency: {concurrency}")

    # Warmup
    for _ in range(20):
        send_request(url, TEST_REVIEWS[0])

    process = psutil.Process()
    cpu_before = psutil.cpu_percent(interval=0.2)
    mem_before_mb = process.memory_info().rss / (1024 * 1024)

    latencies = []
    errors = 0
    t_start = time.perf_counter()

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(send_request, url, TEST_REVIEWS[i % len(TEST_REVIEWS)])
            for i in range(total_requests)
        ]
        for f in as_completed(futures):
            elapsed_ms, status_code, success = f.result()
            latencies.append(elapsed_ms)
            if not success:
                errors += 1

    t_end = time.perf_counter()
    duration_sec = t_end - t_start
    cpu_after = psutil.cpu_percent(interval=0.2)
    mem_after_mb = process.memory_info().rss / (1024 * 1024)

    latencies.sort()
    p50 = statistics.median(latencies)
    p90 = latencies[int(len(latencies) * 0.90)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    mean_lat = statistics.mean(latencies)
    throughput = len(latencies) / duration_sec

    results = {
        "service": label,
        "target_url": url,
        "total_requests": len(latencies),
        "concurrency": concurrency,
        "duration_seconds": round(duration_sec, 3),
        "measured_throughput_rps": round(throughput, 2),
        "error_count": errors,
        "error_rate_pct": round((errors / len(latencies)) * 100, 2),
        "latency_ms": {
            "min": round(min(latencies), 2),
            "mean": round(mean_lat, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "max": round(max(latencies), 2),
        },
        "resources": {
            "cpu_percent": round(max(cpu_before, cpu_after), 1),
            "memory_rss_mb": round(mem_after_mb, 1),
            "system_ram_percent": psutil.virtual_memory().percent
        }
    }

    print(f"Completed in {duration_sec:.2f}s | Throughput: {throughput:.2f} req/sec | Errors: {errors}")
    print(f"Latency: p50={p50:.2f}ms, p95={p95:.2f}ms, p99={p99:.2f}ms, max={max(latencies):.2f}ms")
    print(f"Resources: CPU={results['resources']['cpu_percent']}%, Memory RSS={results['resources']['memory_rss_mb']} MB")

    return results

def main():
    # 1. Test direct ML Service
    ml_results = run_benchmark(TARGET_URL, total_requests=250, concurrency=5, label="Direct ML Service (:8008)")

    # 2. Test Express Gateway
    gw_results = run_benchmark(GATEWAY_URL, total_requests=150, concurrency=5, label="Express API Gateway (:4000)")

    combined = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "direct_ml_service": ml_results,
        "express_gateway": gw_results,
        "methodology": "Sustained concurrent HTTP benchmark measuring end-to-end round-trip latency, not synthetic single-core CPU execution time."
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2)

    print(f"\nSaved empirical load test results to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
