import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, message } from "./api";
import type { Finding, Replay } from "./types";
import { ErrorMessage } from "./ui";

type Review = {
  id: string;
  start: number;
  end: number;
  category: string;
  label: string;
  explanation: string;
  finding_id: string | null;
  player_id: string;
};
const categories: Record<string, string[]> = {
  "1v1": ["duel_goal_exposure", "duel_cover_advance", "duel_recovery_drift"],
  "2v2": [
    "potential_double_commit",
    "defensive_bunching",
    "potential_exposed_goal",
    "doubles_second_man_advance",
    "doubles_uncovered_recovery",
  ],
  "3v3": [
    "potential_double_commit",
    "defensive_bunching",
    "potential_exposed_goal",
    "standard_third_man_advance",
    "standard_central_coverage_gap",
  ],
};

export default function ReviewWorkbench({
  replay,
  playerId,
  time,
  active,
  onUpdate,
  onOpen,
}: {
  replay: Replay;
  playerId: string;
  time: number;
  active: Finding | null;
  onUpdate: (r: Replay) => void;
  onOpen: (r: Review) => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const [start, setStart] = useState(time.toFixed(2)),
    [end, setEnd] = useState(time.toFixed(2)),
    [area, setArea] = useState(false);
  useEffect(() => {
    let live = true;
    api<Review[]>(`/replays/${replay.id}/reviews`)
      .then((r) => {
        if (live) setReviews(r);
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
    };
  }, [replay.id]);
  const mode = replay.metadata.classification?.format ?? "2v2";
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<Review>(`/replays/${replay.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          player_id: playerId,
          start: Number(start),
          end: Number(end),
          category: f.get("category"),
          label: f.get("label"),
          explanation: f.get("explanation"),
          finding_id: active?.source === "rule" ? active.id : null,
          target: area
            ? { x: Number(f.get("x")), y: Number(f.get("y")), z: 20 }
            : null,
        }),
      });
      setReviews((v) => [...v, r]);
      onUpdate(await api<Replay>(`/replays/${replay.id}`));
      setSaved(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel review-workbench">
      <summary>Review or correct a tactical situation</summary>
      <p>
        Your account-owner judgement is stored separately from the detector. It
        is not an expert-verified label.
      </p>
      <ErrorMessage error={error} />
      <form onSubmit={save}>
        <button
          className="button subtle"
          type="button"
          onClick={() => {
            setStart(
              Math.max(0, (active?.context_window?.start ?? time) - 1).toFixed(
                2,
              ),
            );
            setEnd((active?.time ?? time).toFixed(2));
            setSaved(false);
          }}
        >
          Use current moment
        </button>
        <div className="rank-inputs">
          <label>
            Review start (elapsed seconds)
            <input
              type="number"
              min="0"
              max={replay.metadata.duration}
              step=".01"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Review end (elapsed seconds)
            <input
              type="number"
              min="0"
              max={replay.metadata.duration}
              step=".01"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label>
          Coaching category
          <select
            name="category"
            key={active?.id ?? mode}
            defaultValue={
              active?.source === "rule"
                ? active.category
                : categories[mode]?.[0]
            }
          >
            {(categories[mode] ?? []).map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Review judgement
          <select name="label">
            <option value="uncertain">Uncertain</option>
            <option value="confirmed_issue">
              Confirmed issue (your judgement)
            </option>
            <option value="reasonable_decision">
              Reasonable decision / reject flag
            </option>
          </select>
        </label>
        <label>
          Reviewer explanation
          <textarea name="explanation" required maxLength={1500} rows={3} />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={area}
            onChange={(e) => setArea(e.target.checked)}
          />
          Suggest a schematic positioning area
        </label>
        {area && (
          <div className="rank-inputs">
            <label>
              Field X
              <input name="x" type="number" min="-4096" max="4096" required />
            </label>
            <label>
              Field Y
              <input name="y" type="number" min="-5120" max="5120" required />
            </label>
          </div>
        )}
        <button className="button primary" disabled={busy}>
          Save tactical review
        </button>
        {saved && <p role="status">Tactical review saved.</p>}
      </form>
      <div className="review-records">
        {reviews
          .filter((r) => r.player_id === playerId)
          .map((r) => (
            <article key={r.id}>
              <strong>
                {r.label.replaceAll("_", " ")} · {r.start.toFixed(1)}–
                {r.end.toFixed(1)}s
              </strong>
              <p>{r.explanation}</p>
              <button className="text-link" onClick={() => onOpen(r)}>
                Open reviewed situation
              </button>
            </article>
          ))}
      </div>
      <a className="text-link" href="/api/reviews/export" download>
        Export your versioned review dataset
      </a>
    </details>
  );
}

export function FindingRating({
  replayId,
  finding,
  initialRating,
}: {
  replayId: string;
  finding: Finding;
  initialRating?: string | null;
}) {
  const [saved, setSaved] = useState(""),
    [error, setError] = useState("");
  return (
    <label className="finding-rating">
      Was this observation useful?
      <select
        aria-label="Finding usefulness"
        defaultValue={initialRating ?? ""}
        onChange={async (e) => {
          try {
            await api(`/replays/${replayId}/findings/${finding.id}/feedback`, {
              method: "PUT",
              body: JSON.stringify({ rating: e.target.value }),
            });
            setSaved("Feedback saved. This is not an objective review label.");
          } catch (e) {
            setError(message(e));
          }
        }}
      >
        <option value="" disabled>
          Choose feedback
        </option>
        <option value="helpful">Helpful</option>
        <option value="not_helpful">Not helpful</option>
        <option value="incorrect">Incorrect</option>
        <option value="unsure">Unsure</option>
      </select>
      {saved && <small role="status">{saved}</small>}
      <ErrorMessage error={error} />
    </label>
  );
}
