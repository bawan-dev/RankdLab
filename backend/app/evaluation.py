"""Reviewed-window agreement only; unlabeled replay time cannot establish recall."""

from collections import Counter

VERSION = "review-set-1"


def evaluate(records: list[dict]) -> dict:
    findings = [r for r in records if r.get("record_type") == "finding"]
    reviews = [r for r in records if r.get("record_type") == "review"]
    latest = {}
    for r in reviews:
        key = r["replay_ref"], r["player_ref"], r["category"], r["start"], r["end"]
        latest[key] = r
    counts: Counter = Counter()
    groups: dict[str, Counter] = {}
    qualified = []
    for r in latest.values():
        if r["label"] == "uncertain":
            counts["uncertain_reviews"] += 1
            continue
        if r.get("reviewer_qualification") != "externally-verified-expert":
            counts["unverified_owner_reviews"] += 1
            continue
        hit = any(
            f["replay_ref"] == r["replay_ref"]
            and f["player_ref"] == r["player_ref"]
            and f["category"] == r["category"]
            and r["start"] <= f["time"] <= r["end"]
            for f in findings
        )
        outcome = (
            ("tp" if hit else "fn") if r["label"] == "confirmed_issue" else ("fp" if hit else "tn")
        )
        counts[outcome] += 1
        for group_key in ("playlist:" + str(r["playlist"]), "category:" + r["category"]):
            groups.setdefault(group_key, Counter())[outcome] += 1
        qualified.append(r)

    def metrics(c):
        tp, fp, fn = c.get("tp", 0), c.get("fp", 0), c.get("fn", 0)
        return {
            "precision": tp / (tp + fp) if tp + fp else None,
            "reviewed_window_recall": tp / (tp + fn) if tp + fn else None,
        }

    matches = [r for r in records if r.get("record_type") == "match"]
    seconds = sum(r.get("active_seconds", 0) for r in matches)
    return {
        "finding_counts_by_playlist": dict(Counter(f.get("playlist") for f in findings)),
        "findings_per_match": len(findings) / len(matches) if matches else None,
        "findings_per_active_minute": len(findings) / seconds * 60 if seconds else None,
        "schema_version": VERSION,
        "reviews": len(latest),
        "qualified_examples": len(qualified),
        "counts": dict(counts),
        "metrics": metrics(counts) if qualified else None,
        "by_group": {k: {"counts": dict(v), **metrics(v)} for k, v in groups.items()},
        "warning": "No production accuracy claim. Metrics, if present, cover only reviewed "
        "windows and assumed externally verified reviewer provenance. Small or selectively "
        "reviewed sets do not establish whole-match precision or recall.",
    }
