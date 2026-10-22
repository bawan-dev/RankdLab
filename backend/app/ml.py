"""Offline-only experimental baseline. No model is loaded by the product."""

import argparse
import hashlib
import json
from pathlib import Path

from app.features import FEATURE_NAMES, VERSION, grouped_split


def train(records: list[dict], output: Path) -> dict:
    import numpy as np
    import pandas as pd
    from sklearn.dummy import DummyClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import balanced_accuracy_score, confusion_matrix, f1_score
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    if len(records) < 40 or {record["label"] for record in records} != {0, 1}:
        raise ValueError("Need at least 40 explicitly reviewed examples with both label classes")
    if {r["feature_version"] for r in records} != {VERSION}:
        raise ValueError("Feature versions must match this extractor")
    if len({r["category"] for r in records}) != 1:
        raise ValueError("Train one coaching category at a time")
    train_indices, test_indices = grouped_split(records)
    table = pd.DataFrame([r["features"] for r in records], columns=FEATURE_NAMES)
    labels = np.array([r["label"] for r in records])
    if table.isna().any().any() or not np.isfinite(table.to_numpy()).all():
        raise ValueError("Features must be complete and finite")
    if any(len(set(labels[indices])) != 2 for indices in (train_indices, test_indices)):
        raise ValueError("Both held-out and training partitions need positive and negative labels")
    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, random_state=42))
    model.fit(table.iloc[train_indices], labels[train_indices])
    prediction = model.predict(table.iloc[test_indices])
    baseline = DummyClassifier(strategy="most_frequent").fit(
        table.iloc[train_indices], labels[train_indices]
    )
    test_labels = labels[test_indices]
    rule_prediction = np.array([r["rule_prediction"] for r in records])[test_indices]

    def metrics(values):
        return {
            "balanced_accuracy": float(balanced_accuracy_score(test_labels, values)),
            "f1": float(f1_score(test_labels, values, zero_division=0)),
            "confusion_matrix": confusion_matrix(test_labels, values, labels=[0, 1]).tolist(),
        }

    result = {
        "experiment_version": "logistic-baseline-0.1.0",
        "feature_version": VERSION,
        "category": records[0]["category"],
        "random_seed": 42,
        "training_examples": len(train_indices),
        "held_out_examples": len(test_indices),
        "dataset_sha256": hashlib.sha256(json.dumps(records, sort_keys=True).encode()).hexdigest(),
        "model": metrics(prediction),
        "majority_baseline": metrics(baseline.predict(table.iloc[test_indices])),
        "rule_baseline": metrics(rule_prediction),
        "held_out_replays": sorted({records[i]["replay_id"] for i in test_indices}),
        "held_out_players": sorted({records[i]["player_id"] for i in test_indices}),
        "label_sources": sorted({r.get("label_source", "unknown") for r in records}),
        "production_approved": False,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path, help="Owner-exported reviewed JSONL examples")
    parser.add_argument("--output", type=Path, default=Path("data/experiments/baseline.json"))
    parser.add_argument(
        "--mlflow", action="store_true", help="Log metrics to a local file-based run"
    )
    args = parser.parse_args()
    records = [
        json.loads(line)
        for line in args.dataset.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    try:
        result = train(records, args.output)
    except ValueError as error:
        parser.error(str(error))
    if args.mlflow:
        import mlflow

        mlflow.set_tracking_uri(Path("data/mlruns").resolve().as_uri())
        with mlflow.start_run(run_name=result["experiment_version"]):
            mlflow.log_params(
                {
                    key: result[key]
                    for key in ("feature_version", "category", "random_seed", "dataset_sha256")
                }
            )
            mlflow.log_metrics(
                {
                    f"{group}_{key}": value
                    for group in ("model", "majority_baseline", "rule_baseline")
                    for key, value in result[group].items()
                    if isinstance(value, float)
                }
            )
            mlflow.log_artifact(str(args.output))
    print(f"Saved experimental evaluation to {args.output}. No production model was enabled.")


if __name__ == "__main__":
    main()
