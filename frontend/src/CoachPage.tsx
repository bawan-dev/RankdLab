import { ArrowRight, ArrowUpRight, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, message } from "./api";
import { useAuth } from "./auth";
import { rocketLeague } from "./game";
import type { Playlist } from "./game";
import { rankLabel, useRocketProfile } from "./Profile";
import { ReplayList, useReplays } from "./Replays";
import { EmptyState, ErrorMessage, Loading, PageHeader } from "./ui";
import type { Analytics, Replay } from "./types";

type History = Analytics & {
  sessions: {
    id: string;
    date: number;
    playlist: string | null;
    filename: string;
    rate: number | null;
    active_seconds: number;
    reviewed: number;
    findings: number;
    engine_version: string;
  }[];
  feedback: {
    replay_id: string;
    finding_id: string;
    note: string;
    inaccurate: boolean;
  }[];
};
function flags(r: Replay) {
  return r.findings.filter(
    (f) => f.source === "rule" && f.player_id === r.selected_player,
  );
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export function PlaylistCards() {
  const { profile, error } = useRocketProfile();
  return (
    <>
      <ErrorMessage error={error} />
      <div className="mode-grid dashboard-modes">
        {rocketLeague.playlists.map((p) => (
          <Link key={p.id} className="mode-card" to={`/coach/${p.id}`}>
            <span className="mode-number">{p.id}</span>
            <h3>{p.name} coach</h3>
            <p>{p.focus}</p>
            <div className="mode-rank">
              {rankLabel(profile?.ranks[p.id])}
              <small>Self-reported</small>
            </div>
            <ArrowUpRight size={20} />
          </Link>
        ))}
      </div>
      {profile && !profile.onboarding_complete && (
        <Link className="setup-reminder" to="/onboarding">
          Add your Rocket League profile <ArrowRight size={15} />
          <span>Optional ranks help tailor explanations.</span>
        </Link>
      )}
    </>
  );
}

export function Dashboard({ history = false }: { history?: boolean }) {
  const { user } = useAuth(),
    { items, busy, error } = useReplays();
  const ready = items.filter((r) => r.status === "ready"),
    selected = ready.filter((r) => r.selected_player),
    findings = selected.flatMap((r) =>
      flags(r).map((f) => ({ ...f, replay: r })),
    );
  return (
    <>
      <PageHeader
        eyebrow={
          history ? "YOUR MATCH ARCHIVE" : "ROCKET LEAGUE / YOUR WORKSPACE"
        }
        title={history ? "Replay library" : `Your game. A fresh perspective.`}
        description={
          history
            ? "Every recorded match, every saved review."
            : `Welcome back, ${user?.display_name}. Choose your playlist and give the next match a purpose.`
        }
        action={
          <Link className="button primary" to="/upload">
            <Upload size={16} />
            Upload replay
          </Link>
        }
      />
      <ErrorMessage error={error} />
      {!history && (
        <>
          <PlaylistCards />
          <div className="stat-grid">
            <Stat
              label="Matches uploaded"
              value={items.length}
              note={`${ready.length} ready to review`}
            />
            <Stat
              label="Potential issues"
              value={findings.length}
              note={`Across ${selected.length} selected-player matches`}
            />
            <Stat
              label="Moments reviewed"
              value={selected.reduce(
                (sum, r) =>
                  sum +
                  r.findings.filter(
                    (f) =>
                      f.player_id === r.selected_player &&
                      r.reviewed_ids.includes(f.id),
                  ).length,
                0,
              )}
              note="Reviewed by you; not expert validation"
            />
          </div>
          <section className="next-session">
            <div>
              <p className="eyebrow">YOUR NEXT ACTION</p>
              <h2>
                {user?.coaching_goal ||
                  (findings.length
                    ? `Review ${findings[0].category.replaceAll("_", " ")}`
                    : "Find one decision worth a second look.")}
              </h2>
              <p>
                {findings.length
                  ? "Start with the recorded situation. Decide whether the observation fits the match context."
                  : "Upload a match, select your player and mark a decision you want to understand. Zero flags does not mean flawless play."}
              </p>
            </div>
            <Link
              className="button subtle"
              to={
                findings.length
                  ? `/replays/${findings[0].replay.id}`
                  : ready.length
                    ? `/replays/${ready[0].id}`
                    : "/upload"
              }
            >
              Start a review <ArrowRight size={16} />
            </Link>
          </section>
        </>
      )}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{history ? "All replays" : "Recent matches"}</h2>
            <p>Recorded stats and coaching context stay with each match.</p>
          </div>
          {!history && (
            <Link className="text-link" to="/history">
              View library <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
        {busy ? (
          <Loading />
        ) : items.length ? (
          <ReplayList items={history ? items : items.slice(0, 5)} />
        ) : (
          <EmptyState title="Your first match belongs here.">
            Upload a replay to start your review history.
          </EmptyState>
        )}
      </section>
      {!history && (
        <div className="two-columns">
          <section className="panel focus-card">
            <p className="eyebrow">RECENT COACHING OBSERVATIONS</p>
            {findings.length ? (
              findings.slice(0, 3).map((f) => (
                <Link
                  className="finding-link"
                  key={f.id}
                  to={`/replays/${f.replay.id}`}
                >
                  <strong>{f.title}</strong>
                  <span>
                    {f.replay.metadata.classification?.format ?? "Unclassified"}{" "}
                    · Experimental
                  </span>
                </Link>
              ))
            ) : (
              <>
                <h2>No qualifying flags yet.</h2>
                <p>
                  Rules cover specific spatial patterns. Manual review can
                  capture the decisions they miss.
                </p>
              </>
            )}
          </section>
          <section className="panel focus-card">
            <p className="eyebrow">BUILD A REVIEW HABIT</p>
            <h2>A rate needs context.</h2>
            <p>
              Compare findings per five active minutes within the same playlist.
              Different opponents and detector versions can change the result.
            </p>
            <Link className="text-link" to="/analytics">
              Open improvement history <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      )}
    </>
  );
}

export function CoachPage() {
  const { playlist } = useParams(),
    mode = rocketLeague.playlists.find((p) => p.id === playlist);
  const { profile, error: profileError } = useRocketProfile();
  const { items, busy, error } = useReplays();
  if (!mode)
    return (
      <EmptyState title="Choose a supported playlist.">
        Use Duel, Doubles or Standard from the navigation.
      </EmptyState>
    );
  const matches = items.filter(
      (r) => r.metadata.classification?.format === mode.id,
    ),
    selected = matches.filter((r) => r.selected_player && r.status === "ready"),
    moments = selected.flatMap(flags);
  const available = selected
    .map(
      (r) => r.metadata.players?.find((p) => p.id === r.selected_player)?.stats,
    )
    .filter(Boolean);
  const statSum = (key: string) => {
    const values = available
      .map((s) => s?.[key])
      .filter((v): v is number => typeof v === "number");
    return values.length
      ? `${values.reduce((a, b) => a + b, 0)} / ${values.length} matches`
      : "Not available";
  };
  return (
    <>
      <PageHeader
        eyebrow={`ROCKET LEAGUE / ${mode.id}`}
        title={`${mode.name} coach`}
        description={mode.detail}
        action={
          <Link className="button primary" to={`/upload?playlist=${mode.id}`}>
            <Upload size={16} />
            Upload {mode.id} replay
          </Link>
        }
      />
      <ErrorMessage error={error || profileError} />
      <section className="playlist-intro panel">
        <span className="playlist-watermark">{mode.id}</span>
        <div>
          <p className="eyebrow">YOUR {mode.name.toUpperCase()} RANK</p>
          <h2>{rankLabel(profile?.ranks[mode.id])}</h2>
          <p>
            Self-reported ·{" "}
            {profile?.ranks[mode.id]?.mmr != null
              ? `${profile.ranks[mode.id]?.mmr} MMR entered by you`
              : "No verified MMR"}
          </p>
          <Link className="text-link" to="/profile/rocket-league">
            Update rank <ArrowUpRight size={15} />
          </Link>
        </div>
        <div>
          <h3>{mode.focus}</h3>
          <p>
            {mode.id === "1v1"
              ? "Candidate coverage: sustained goalward ball exposure with an opponent nearby."
              : mode.id === "2v2"
                ? "Candidate coverage: simultaneous same-side challenges, defensive spacing and exposed coverage."
                : "Candidate coverage: defensive bunching under pressure, overlapping challenges and exposed coverage."}
          </p>
          <span className="badge">EXPERIMENTAL GEOMETRY RULES</span>
        </div>
      </section>
      <div className="stat-grid">
        <Stat
          label="Selected-player matches"
          value={selected.length}
          note={`${matches.length} matches in this format`}
        />
        <Stat
          label="Recorded goals"
          value={statSum("goals")}
          note="Totals from available replay metadata"
        />
        <Stat
          label="Recorded saves"
          value={statSum("saves")}
          note="Not a judgement of decision quality"
        />
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent {mode.id} matches</h2>
            <p>
              {moments.length} potential issues across your selected players.
            </p>
          </div>
        </div>
        {busy ? (
          <Loading />
        ) : matches.length ? (
          <ReplayList items={matches.slice(0, 8)} />
        ) : (
          <EmptyState title={`Start your ${mode.name.toLowerCase()} history.`}>
            Upload a {mode.id} replay. We will check its team format before
            coaching.
          </EmptyState>
        )}
      </section>
      <HistoryPanel key={mode.id} playlist={mode.id} />
    </>
  );
}

function HistoryPanel({ playlist }: { playlist: Playlist }) {
  const [data, setData] = useState<History | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<History>(`/analytics?playlist=${playlist}`)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
    };
  }, [playlist]);
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Loading />;
  const series = [...data.sessions].reverse(),
    max = Math.max(...series.map((s) => s.rate ?? 0), 1);
  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div>
          <h2>{playlist} patterns & progress</h2>
          <p>
            {data.matches} matches · {data.minutes.toFixed(1)} active minutes ·{" "}
            {data.findings} experimental flags
          </p>
        </div>
      </div>
      {!data.matches ? (
        <p className="empty-copy">
          Select your player in a processed {playlist} replay to start tracking.
          Rates appear when active gameplay is available.
        </p>
      ) : (
        <>
          <div className="history-chart">
            <div>
              <h3>Flags per five active minutes</h3>
              <p>
                Ordered by upload date. Fewer flags alone do not establish
                improvement.
              </p>
            </div>
            <svg
              viewBox="0 0 600 130"
              role="img"
              aria-label={`${playlist} flag rates by match; exact values in the session table below`}
            >
              <line x1="10" x2="590" y1="112" y2="112" stroke="#38516a" />
              {series.map((s, i) => {
                const x =
                    series.length === 1
                      ? 300
                      : 15 + (i * 570) / (series.length - 1),
                  y = 110 - ((s.rate ?? 0) / max) * 90;
                return s.rate == null ? null : (
                  <g key={s.id}>
                    <line
                      x1={x}
                      x2={x}
                      y1="112"
                      y2={y}
                      stroke="#244860"
                      strokeWidth="3"
                    />
                    <circle cx={x} cy={y} r="4" fill="#38bdf8">
                      <title>
                        {new Date(s.date * 1000).toLocaleDateString()}:{" "}
                        {s.rate.toFixed(2)} per 5 minutes
                      </title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="history-categories">
            {data.categories.length ? (
              data.categories.map((c) => (
                <div key={c.category}>
                  <span>{c.category.replaceAll("_", " ")}</span>
                  <strong>{c.per_5_minutes.toFixed(2)} / 5 min</strong>
                  <small>{c.count} observations</small>
                </div>
              ))
            ) : (
              <p>
                No qualifying automatic findings in these matches. Coverage is
                limited.
              </p>
            )}
          </div>
          <div className="comparison-grid">
            <div>
              <span>Recent (up to 5 matches)</span>
              <strong>{data.recent_rate?.toFixed(2) ?? "—"}</strong>
              <small>flags / 5 active minutes</small>
            </div>
            <div>
              <span>Previous (up to 5 matches)</span>
              <strong>{data.previous_rate?.toFixed(2) ?? "—"}</strong>
              <small>flags / 5 active minutes</small>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Active minutes</th>
                  <th>Flags / 5 min</th>
                  <th>Reviewed moments</th>
                  <th>Analysis version</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        className="text-link"
                        to={`/replays/${s.id}/report`}
                      >
                        {new Date(s.date * 1000).toLocaleString()}
                      </Link>
                    </td>
                    <td>{(s.active_seconds / 60).toFixed(1)}</td>
                    <td>{s.rate?.toFixed(2) ?? "—"}</td>
                    <td>{s.reviewed}</td>
                    <td>{s.engine_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="history-notes">
            <h3>Review priorities</h3>
            <p>
              {data.categories.length
                ? `Begin with ${data.categories[0].category.replaceAll("_", " ")}, the most frequent recorded category. Check context before treating it as a mistake.`
                : "Choose a manual review focus; automatic rules have not identified a recurring pattern."}
            </p>
            <h3>Your feedback</h3>
            {data.feedback.length ? (
              data.feedback.map((f) => (
                <p key={f.finding_id}>
                  <Link to={`/replays/${f.replay_id}`} className="text-link">
                    {f.inaccurate ? "Flag marked inaccurate" : "Flag feedback"}
                  </Link>
                  {f.note ? ` · ${f.note}` : " · No written note"}
                </p>
              ))
            ) : (
              <p>No feedback submitted for this playlist.</p>
            )}
            <p className="small">
              Reviewed means opened and continued by you, not coach-validated.
              Raw rates include disputed flags and normalize time, not tactical
              opportunities. Compare analysis versions before drawing
              conclusions.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

export function ImprovementPage() {
  const [playlist, setPlaylist] = useState<Playlist>("2v2");
  return (
    <>
      <PageHeader
        eyebrow="YOUR LONG-TERM REVIEW"
        title="Improvement history"
        description="Keep each playlist in context. Follow observations, time spent and your own feedback."
      />
      <div className="playlist-tabs" aria-label="History playlist">
        {rocketLeague.playlists.map((p) => (
          <button
            className="button subtle"
            key={p.id}
            aria-pressed={playlist === p.id}
            onClick={() => setPlaylist(p.id)}
          >
            {p.id} {p.name}
          </button>
        ))}
      </div>
      <HistoryPanel key={playlist} playlist={playlist} />
      <Link className="text-link" to="/profile/rocket-league">
        View self-reported rank progression <ArrowUpRight size={16} />
      </Link>
    </>
  );
}
