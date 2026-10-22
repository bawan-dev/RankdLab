# ML infrastructure, without a deployed model

No genuine coaching-labelled dataset is bundled, no model is trained for users,
and no ML predictions or model accuracy claims appear in the product.

`app/features.py` extracts ten versioned numerical features from an actual Active
frame. Coordinates, distances and speeds use native Unreal units; boost is a
percentage. Missing measurements or incomplete team context are rejected.

Authenticated owner review API:

- `POST /api/replays/{id}/labels`: `{player_id, time, category, label: 0|1}`.
  `category` is one of the three implemented rule categories. The nearest actual
  frame and its features are stored with reviewer, time and feature version.
  Re-reviewing the same owner/player/frame/category updates that label.
- `GET /api/labels/export`: owner-scoped JSONL containing explicit labels,
  feature version, engine version and rule decision near that timestamp.
- Feedback that a flag is inaccurate is kept separate from explicit labels.
  Owner labels are recorded as `account_owner_not_expert_verified`.
  There is not yet a dedicated expert-reviewer UI or coach qualification system.
- Replay/account deletion cascades into stored labels. Previously downloaded
  exports and backups require their own retention/deletion policy.

To experiment locally, install `backend[ml]` (or `uv sync --extra dev --extra ml`
from backend). Export reviewed examples via the API and filter to one category:

```text
python -m app.ml path/to/reviewed-category.jsonl --output data/experiments/baseline.json
```

The script requires at least 40 explicitly labelled examples, both classes and
at least four independent groups. It trains logistic regression behind a scaler
fit only on training data. Connected match/player components are held out
together, so neither matches nor players leak across the split. It records
dataset hash, split identities, seed, version, confusion matrices, balanced
accuracy and F1 against majority and stored-rule baselines. The rule baseline
means a stored finding within one second, including sustain/cooldown behaviour.

Optional local tracking: install `backend[tracking]` and pass `--mlflow`. Tracking
is file-based under `data/mlruns`; no external telemetry credentials are needed.
This optional MLflow path has not been executed because no real experiment has
begun. The baseline plumbing is smoke-tested with explicitly synthetic test
numbers only; those test metrics are not genuine gameplay evaluation results.

Before enabling any model: recruit qualified coaches, document label criteria,
measure agreement, include reviewed negatives and unflagged situations, audit
selection bias, increase independent held-out coverage, compare rule baselines,
evaluate by rank/mode/season and report uncertainty. A single split on 40 examples
is only an engineering guard, not sufficient validation or permission to deploy.

Sources checked: sklearn GroupShuffleSplit and LogisticRegression documentation,
and MLflow's tracking API documentation. No serialized model is loaded by the API.
