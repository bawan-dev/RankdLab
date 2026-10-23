import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Flag,
  Maximize,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  SkipBack,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, message } from "./api";
import Arena from "./Arena";
import ReviewWorkbench, { FindingRating } from "./ReviewWorkbench";
import type { CameraMode } from "./Arena";
import { continueCoaching, frameIndex, nextMoment } from "./playback";
import type { CoachingState } from "./playback";
import { formatTime } from "./time";
import type { Finding, Replay, ReplayData } from "./types";
import { ErrorMessage, Loading, PageHeader } from "./ui";

export default function ReplayPage() {
  const { id } = useParams(),
    navigate = useNavigate();
  const [replay, setReplay] = useState<Replay | null>(null),
    [data, setData] = useState<ReplayData | null>(null),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmingMode, setConfirmingMode] = useState(false);
  useEffect(() => {
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    setReplay(null);
    setData(null);
    setError("");
    const load = async () => {
      try {
        const value = await api<Replay>(`/replays/${id}`);
        if (cancelled) return;
        setReplay(value);
        if (value.status === "ready") {
          const frames = await api<ReplayData>(`/replays/${id}/frames`);
          if (!cancelled) setData(frames);
        } else if (value.status !== "failed" && value.status !== "deleting")
          timer = setTimeout(load, 1500);
      } catch (error) {
        if (!cancelled) setError(message(error));
      }
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);
  async function remove() {
    try {
      await api(`/replays/${id}`, { method: "DELETE" });
      navigate("/history");
    } catch (error) {
      setError(message(error));
    }
  }
  if (error && !replay) return <ErrorMessage error={error} />;
  if (!replay) return <Loading text="Opening replay…" />;
  if (!data)
    return (
      <>
        <PageHeader
          eyebrow="REPLAY WORKSPACE"
          title={
            replay.status === "failed"
              ? "This replay needs another look."
              : "Preparing your perspective."
          }
          description={replay.filename}
        />
        <ErrorMessage error={error} />
        <div className="panel processing-panel">
          {replay.status === "failed" || replay.status === "deleting" ? (
            <>
              <Flag size={32} />
              <h2>We couldn’t reconstruct this replay.</h2>
              <p>
                {replay.error ??
                  "A deletion was interrupted. Retry removing this replay."}
              </p>
              <Link className="button primary" to="/upload">
                Choose another replay <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <Loading
                text={
                  replay.status === "queued"
                    ? "Queued for replay processing…"
                    : "Reading match data and reconstructing frames…"
                }
              />
              <p>
                The page updates automatically. It’s safe to return to your
                library.
              </p>
              <div className="processing-steps">
                <span className="done">
                  <Check size={14} /> Uploaded
                </span>
                <ChevronRight size={14} />
                <span>Parse recorded data</span>
                <ChevronRight size={14} />
                <span>Review</span>
              </div>
            </>
          )}
          {replay.status !== "processing" && (
            <div
              className="actions"
              style={{ justifyContent: "center", marginTop: 24 }}
            >
              {confirmDelete ? (
                <>
                  <button className="button danger" onClick={remove}>
                    Confirm delete replay
                  </button>
                  <button
                    className="button subtle"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="text-link danger-text"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={13} /> Delete replay
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  if (replay.mode_confirmation_required)
    return (
      <section className="panel mode-confirm">
        <p className="eyebrow">CHECK THE MATCH FORMAT</p>
        <h2>
          {replay.metadata.classification?.format
            ? "This replay belongs to a different mode."
            : "Confirm the coaching format."}
        </h2>
        <p>
          {replay.metadata.classification?.message}{" "}
          {replay.requested_playlist
            ? `You uploaded from ${replay.requested_playlist}.`
            : ""}{" "}
          Recorded team counts:{" "}
          {replay.metadata.classification?.team_counts.join(" / ")}.
        </p>
        <ErrorMessage error={error} />
        <div className="actions">
          {(replay.metadata.classification?.format
            ? [replay.metadata.classification.format]
            : ["1v1", "2v2", "3v3"]
          ).map((mode) => (
            <button
              key={mode}
              disabled={confirmingMode}
              className="button primary"
              onClick={async () => {
                setConfirmingMode(true);
                try {
                  setReplay(
                    await api<Replay>(
                      `/replays/${replay.id}/mode?playlist=${mode}`,
                      { method: "PUT" },
                    ),
                  );
                } catch (e) {
                  setError(message(e));
                } finally {
                  setConfirmingMode(false);
                }
              }}
            >
              Use {mode} coach
            </button>
          ))}
        </div>
        <Link className="text-link" to="/upload">
          Upload another match
        </Link>
      </section>
    );
  return (
    <>
      <ErrorMessage error={error} />
      <CoachingViewer
        key={replay.id}
        replay={replay}
        data={data}
        onUpdate={setReplay}
      />
      <div className="viewer-bottom">
        <p className="muted small">
          Recorded movement · {data.parser_version} · Original geometric arena ·
          Unvalidated coaching rules
        </p>
        {confirmDelete ? (
          <div className="actions">
            <button className="text-link danger-text" onClick={remove}>
              Confirm delete replay
            </button>
            <button
              className="text-link"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="text-link muted small"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} /> Delete replay
          </button>
        )}
      </div>
    </>
  );
}

function CoachingViewer({
  replay,
  data,
  onUpdate,
}: {
  replay: Replay;
  data: ReplayData;
  onUpdate: (replay: Replay) => void;
}) {
  const [playerId, setPlayerId] = useState(replay.selected_player ?? ""),
    [time, setTime] = useState(replay.session_time),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [camera, setCamera] = useState<CameraMode>("director");
  const [coach, setCoach] = useState<CoachingState>({
      phase: "watching",
      activeId: null,
      reviewed: replay.reviewed_ids,
    }),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [manual, setManual] = useState(false),
    [feedbackBusy, setFeedbackBusy] = useState(false),
    [noted, setNoted] = useState<string[]>(
      replay.feedback?.filter((f) => f.inaccurate).map((f) => f.finding_id) ??
        [],
    );
  const [autoPause, setAutoPause] = useState(true);
  const [zoom, setZoom] = useState(1);
  const noteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (manual) noteDialog.current?.showModal();
  }, [manual]);
  const timeRef = useRef(time),
    coachRef = useRef(coach),
    viewer = useRef<HTMLDivElement>(null);
  const events = useMemo(
    () =>
      replay.findings
        .filter((f) => f.player_id === playerId)
        .sort((a, b) => a.time - b.time),
    [replay.findings, playerId],
  );
  const active = events.find((f) => f.id === coach.activeId) ?? null;
  const player = data.metadata.players.find((p) => p.id === playerId);
  const frame = data.frames[frameIndex(data.frames, time)];
  const score = [...data.metadata.goals]
    .reverse()
    .find((goal) => goal.time <= time)?.score ??
    data.metadata.initial_score ?? [null, null];
  useEffect(() => {
    timeRef.current = time;
    coachRef.current = coach;
  }, [time, coach]);
  useEffect(() => {
    if (coach.phase !== "framing") return;
    const timer = setTimeout(
      () => setCoach((state) => ({ ...state, phase: "review" })),
      700,
    );
    return () => clearTimeout(timer);
  }, [coach.phase, coach.activeId]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0,
      last = performance.now();
    const tick = (now: number) => {
      const previous = timeRef.current;
      const next = Math.min(
        data.metadata.duration,
        previous + Math.min(0.1, (now - last) / 1000) * speed,
      );
      last = now;
      const hit =
        autoPause || coachRef.current.phase === "context"
          ? nextMoment(events, coachRef.current, previous, next)
          : null;
      if (hit) {
        timeRef.current = hit.time;
        setTime(hit.time);
        setPlaying(false);
        const state: CoachingState = {
          ...coachRef.current,
          phase: "framing",
          activeId: hit.id,
        };
        coachRef.current = state;
        setCoach(state);
        return;
      }
      timeRef.current = next;
      setTime(next);
      if (next >= data.metadata.duration) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, data.metadata.duration, events, autoPause]);

  const persist = useCallback(
    async (pid: string, value: number, reviewed: string[]) => {
      if (!pid) return;
      try {
        await api(`/replays/${replay.id}/session`, {
          method: "PUT",
          body: JSON.stringify({
            player_id: pid,
            time: value,
            reviewed_ids: reviewed,
          }),
        });
        setSaved(true);
        setError("");
      } catch (error) {
        setError(message(error));
      }
    },
    [replay.id],
  );
  useEffect(() => {
    if (!playerId) return;
    const timer = setInterval(() => {
      void persist(playerId, timeRef.current, coachRef.current.reviewed);
    }, 15000);
    return () => clearInterval(timer);
  }, [playerId, persist]);
  function seek(value: number) {
    const next = Math.max(0, Math.min(data.metadata.duration, value));
    timeRef.current = next;
    setTime(next);
    setSaved(false);
  }
  function review(finding: Finding) {
    seek(
      Math.max(
        finding.time - 8,
        (finding.context_window?.start ?? finding.time - 2) - 1,
      ),
    );
    setCoach({ ...coach, phase: "context", activeId: finding.id });
    setPlaying(true);
  }
  function proceed() {
    const next = continueCoaching(coach);
    coachRef.current = next;
    setCoach(next);
    void persist(playerId, time, next.reviewed);
    setPlaying(true);
  }
  function replayContext() {
    if (!active) return;
    seek(active.time - 3);
    setCoach({ ...coach, phase: "context" });
    setPlaying(true);
  }
  function togglePlay() {
    if (coach.phase === "review") {
      replayContext();
      return;
    }
    if (time >= data.metadata.duration) seek(0);
    if (playing) void persist(playerId, time, coach.reviewed);
    setPlaying(!playing);
  }
  async function choosePlayer(value: string) {
    setPlaying(false);
    setPlayerId(value);
    setCoach({ phase: "watching", activeId: null, reviewed: [] });
    await persist(value, 0, []);
    seek(0);
  }
  async function feedback() {
    if (!active) return;
    setFeedbackBusy(true);
    try {
      await api(`/replays/${replay.id}/findings/${active.id}/feedback`, {
        method: "PUT",
        body: JSON.stringify({ inaccurate: !noted.includes(active.id) }),
      });
      setNoted((previous) =>
        previous.includes(active.id)
          ? previous.filter((id) => id !== active.id)
          : [...previous, active.id],
      );
    } catch (error) {
      setError(message(error));
    } finally {
      setFeedbackBusy(false);
    }
  }
  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const updated = await api<Replay>(`/replays/${replay.id}/moments`, {
        method: "POST",
        body: JSON.stringify({
          player_id: playerId,
          time,
          ...Object.fromEntries(form),
        }),
      });
      onUpdate(updated);
      setManual(false);
    } catch (error) {
      setError(message(error));
    }
  }
  return (
    <>
      <div className="viewer-header">
        <div>
          <Link to="/history" className="text-link muted small">
            <ArrowLeft size={13} /> Replay library
          </Link>
          <h1>{replay.filename}</h1>
          <p>
            {data.metadata.players.length} players <span>·</span>{" "}
            {data.metadata.map ?? "Unknown arena"} <span>·</span>{" "}
            {formatTime(data.metadata.duration)} recorded
          </p>
        </div>
        <Link className="button subtle" to={`/replays/${replay.id}/report`}>
          <FileText size={16} /> Match report <ArrowUpRightIcon />
        </Link>
      </div>
      <ErrorMessage error={error} />
      {!playerId ? (
        <section className="panel player-picker">
          <p className="eyebrow">YOUR PERSPECTIVE</p>
          <h2>Who are you in this match?</h2>
          <p>Choose your player to focus the coaching review.</p>
          <div className="player-options">
            {data.metadata.players.map((p) => (
              <button
                className={`player-option team-${p.team}`}
                key={p.id}
                onClick={() => choosePlayer(p.id)}
              >
                <span className="team-dot" />
                <strong>{p.name}</strong>
                <span>{p.team === 0 ? "Blue team" : "Orange team"}</span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="coaching-layout">
          <div className="viewer-column">
            <div className="viewer-stage" ref={viewer}>
              <Arena
                data={data}
                time={time}
                playerId={playerId}
                camera={camera}
                finding={active}
                zoom={zoom}
              />
              <div className="stage-top">
                <span className="stage-label">
                  <span className="live-dot" />
                  {coach.phase === "review"
                    ? "COACHING MOMENT"
                    : "RECORDED REPLAY"}
                </span>
                <div className="scoreboard">
                  <span className="blue-text">{score[0] ?? "—"}</span>
                  <strong>
                    {frame.seconds_remaining === null
                      ? "—"
                      : `${frame.seconds_remaining < 0 ? "+" : ""}${formatTime(Math.abs(frame.seconds_remaining))}`}
                  </strong>
                  <span className="orange-text">{score[1] ?? "—"}</span>
                </div>
                <button
                  className="stage-button"
                  title="Fullscreen"
                  aria-label="Fullscreen replay"
                  onClick={() =>
                    viewer.current
                      ?.requestFullscreen()
                      .catch((error) => setError(message(error)))
                  }
                >
                  <Maximize size={17} />
                </button>
              </div>
              <div className="stage-bottom">
                <span>
                  <span className="team-dot" />
                  {player?.name}
                </span>
                <span>
                  {active
                    ? "Red: recorded · Green: proposed · Gold: ball"
                    : `${frame.state} · Native replay movement`}
                </span>
              </div>
              {coach.phase === "review" && (
                <div className="pause-indicator">
                  <Pause size={13} /> Paused for review
                </div>
              )}
            </div>
            <div className="playback-controls">
              <div className="timeline">
                <input
                  type="range"
                  min={0}
                  max={data.metadata.duration}
                  step={0.01}
                  value={time}
                  aria-label="Replay timeline"
                  onChange={(e) => {
                    setPlaying(false);
                    seek(Number(e.target.value));
                    setCoach({ ...coach, phase: "watching", activeId: null });
                  }}
                />
                <div className="timeline-markers">
                  {events.map((f) => (
                    <button
                      key={f.id}
                      className={`timeline-marker ${coach.reviewed.includes(f.id) ? "reviewed" : ""}`}
                      style={{
                        left: `${(f.time / data.metadata.duration) * 100}%`,
                      }}
                      title={`${formatTime(f.time)} · ${f.title}`}
                      aria-label={`Review ${f.title} at ${formatTime(f.time)}`}
                      onClick={() => review(f)}
                    />
                  ))}
                </div>
              </div>
              <div className="control-row">
                <div className="actions">
                  <button
                    className="icon-button"
                    aria-label="Rewind five seconds"
                    title="Rewind five seconds"
                    onClick={() => seek(time - 5)}
                  >
                    <SkipBack size={18} />
                  </button>
                  <button
                    className="play-button"
                    aria-label={playing ? "Pause replay" : "Play replay"}
                    onClick={togglePlay}
                  >
                    {playing ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                  <span className="time-readout">
                    {formatTime(time)}{" "}
                    <span>/ {formatTime(data.metadata.duration)}</span>
                  </span>
                </div>
                <div className="actions">
                  <label className="compact-select">
                    <span className="sr-only">Playback speed</span>
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                    >
                      {[0.25, 0.5, 1, 1.5, 2].map((value) => (
                        <option key={value} value={value}>
                          {value}×
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="icon-button"
                    title="Save review progress"
                    aria-label="Save review progress"
                    onClick={() => persist(playerId, time, coach.reviewed)}
                  >
                    {saved ? <Check size={16} /> : <Save size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="viewer-toolbar">
              <label className="replay-zoom">
                Camera zoom
                <input
                  aria-label="Camera zoom"
                  type="range"
                  min="0.6"
                  max="2.4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={camera === "free"}
                />
              </label>
              <button
                className="button subtle"
                onClick={() => {
                  setZoom(1);
                  setCamera("director");
                }}
              >
                Reset camera
              </button>
              {camera === "free" && (
                <p className="camera-hint">
                  Drag to orbit ? Right-drag to pan ? Scroll to zoom. Focus the
                  arena and use arrow keys to pan.
                </p>
              )}

              <button
                className="button subtle"
                disabled={
                  !events.some(
                    (e) => e.time > time && !coach.reviewed.includes(e.id),
                  )
                }
                onClick={() => {
                  const next = events.find(
                    (e) => e.time > time && !coach.reviewed.includes(e.id),
                  );
                  if (next) review(next);
                }}
              >
                Next coaching moment
              </button>
              <span className="camera-state" aria-live="polite">
                {camera === "director"
                  ? active
                    ? "Director / challenge view"
                    : "Director / following play"
                  : `Manual / ${camera}`}
              </span>
              <label>
                Camera{" "}
                <select
                  aria-label="Camera angle"
                  value={camera}
                  onChange={(e) => setCamera(e.target.value as CameraMode)}
                >
                  <option value="director">Follow the play</option>
                  <option value="free">Free orbit / inspect</option>
                  <option value="overhead">Tactical overhead</option>
                  <option value="perspective">Elevated perspective</option>
                  <option value="ball">Follow ball</option>
                  <option value="player">Focus player</option>
                  <option value="aerial">Aerial view</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoPause}
                  onChange={(e) => setAutoPause(e.target.checked)}
                />{" "}
                Auto-pause
              </label>
              <button
                className="text-link small"
                onClick={() => {
                  setPlaying(false);
                  setManual(true);
                }}
              >
                <Plus size={14} /> Add review note
              </button>
            </div>
            <section className="panel team-panel">
              <div className="team-panel-heading">
                <h2>On the pitch</h2>
                <label className="compact-select">
                  <span className="sr-only">Selected player</span>
                  <select
                    aria-label="Selected player"
                    value={playerId}
                    onChange={(e) => choosePlayer(e.target.value)}
                  >
                    {data.metadata.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="player-stats-grid">
                {data.metadata.players.map((p) => (
                  <div
                    key={p.id}
                    className={`player-stat team-${p.team} ${p.id === playerId ? "selected" : ""}`}
                  >
                    <span>
                      <span className="team-dot" />
                      {p.name}
                    </span>
                    <strong>
                      {frame.players[p.id]?.boost === null ||
                      !frame.players[p.id]
                        ? "—"
                        : Math.round(frame.players[p.id]!.boost!)}
                      <small> BOOST</small>
                    </strong>
                    <div className="boost-track">
                      <span
                        style={{ width: `${frame.players[p.id]?.boost ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <aside className="coach-panel panel">
            <div className="coach-panel-header">
              <span className="eyebrow">COACHING DIRECTOR</span>
              <span className="badge">BETA RULES</span>
            </div>
            {coach.phase === "framing" ? (
              <Loading text="Framing the coaching moment…" />
            ) : active ? (
              <div className="coaching-content">
                <div className="moment-meta">
                  <span>
                    <Clock3 size={13} />
                    {formatTime(active.time)}
                  </span>
                  <span className="badge orange">
                    {active.source === "manual"
                      ? "YOUR NOTE"
                      : `${active.severity} · heuristic`}
                  </span>
                </div>
                <h2>{active.title}</h2>
                <p className="coaching-explanation">{active.explanation}</p>
                {active.uncertainty && (
                  <p className="muted small">{active.uncertainty}</p>
                )}
                {active.coaching && (
                  <div className="coaching-guidance">
                    <span className="eyebrow">
                      YOUR REVIEW FOCUS / {active.coaching.presentation_level}
                    </span>
                    <p>{active.coaching.guidance}</p>
                    <small>
                      {active.coaching.rank?.rank ?? "Rank not set"} /
                      Self-reported at analysis /{" "}
                      {active.coaching.prior_category_findings} prior
                      observations for this player and playlist
                    </small>
                  </div>
                )}
                <div className="alternative-box">
                  <span className="eyebrow">PROPOSED ALTERNATIVE</span>
                  <p>{active.alternative}</p>
                  <small>
                    {active.alternative_basis ??
                      "This suggestion is not a simulated or guaranteed outcome."}
                  </small>
                </div>
                <details>
                  <summary>Observed evidence</summary>
                  <dl className="evidence-list">
                    {Object.entries(active.evidence).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key.replaceAll("_", " ")}</dt>
                        <dd>
                          {typeof value === "number"
                            ? Number(value.toFixed(1))
                            : value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
                <p className="muted small">
                  {active.reliability} · {active.detector_version}
                </p>
                <div className="review-actions">
                  <button className="button subtle" onClick={replayContext}>
                    <RotateCcw size={15} /> Replay context
                  </button>
                  <button className="button primary" onClick={proceed}>
                    Continue <ArrowRight size={15} />
                  </button>
                </div>
                <FindingRating
                  key={active.id}
                  replayId={replay.id}
                  finding={active}
                  initialRating={
                    replay.feedback?.find((f) => f.finding_id === active.id)
                      ?.rating
                  }
                />
                <button
                  className={`feedback-button ${noted.includes(active.id) ? "is-noted" : ""}`}
                  disabled={feedbackBusy}
                  onClick={feedback}
                >
                  <Flag size={13} />
                  {noted.includes(active.id)
                    ? "Marked inaccurate · undo"
                    : "This detection seems inaccurate"}
                </button>
              </div>
            ) : (
              <div className="coach-idle">
                <span className="coach-orb">
                  <CrosshairIcon />
                </span>
                <h2>Watch with intention.</h2>
                <p>
                  {events.length
                    ? "Playback will pause at each unreviewed moment. You can also jump to a moment below."
                    : "No moments flagged for this player. Review the replay or add a note of your own."}
                </p>
                <span className="badge">
                  {events.length} MOMENTS ·{" "}
                  {
                    coach.reviewed.filter((id) =>
                      events.some((f) => f.id === id),
                    ).length
                  }{" "}
                  REVIEWED
                </span>
              </div>
            )}
            <div className="moment-list">
              <div className="moment-list-header">
                <h3>Review timeline</h3>
                <span>{events.length.toString().padStart(2, "0")}</span>
              </div>
              {events.map((f) => (
                <button
                  className={`moment-row ${active?.id === f.id ? "active" : ""}`}
                  key={f.id}
                  onClick={() => review(f)}
                >
                  <span className="moment-status">
                    {coach.reviewed.includes(f.id) ? (
                      <Check size={13} />
                    ) : (
                      <span />
                    )}
                  </span>
                  <span>
                    <strong>{f.title}</strong>
                    <small>
                      {formatTime(f.time)} ·{" "}
                      {f.source === "manual"
                        ? "Manual note"
                        : f.category.replaceAll("_", " ")}
                    </small>
                  </span>
                  <ChevronRight size={13} />
                </button>
              ))}
              {!events.length && (
                <p className="muted small">
                  Flags will appear here when the rules find a qualifying
                  situation.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
      {playerId && (
        <ReviewWorkbench
          key={playerId}
          replay={replay}
          playerId={playerId}
          time={time}
          active={active}
          onUpdate={onUpdate}
          onOpen={(r) => {
            const f = events.find(
              (e) =>
                e.id === r.finding_id ||
                (e.source === "manual" &&
                  e.category === r.category &&
                  e.time === r.end),
            );
            if (f) review(f);
            else {
              setPlaying(false);
              seek(r.end);
            }
          }}
        />
      )}
      {manual && (
        <dialog
          ref={noteDialog}
          className="modal"
          aria-labelledby="note-title"
          onCancel={() => setManual(false)}
        >
          <button
            className="modal-close"
            aria-label="Close review note"
            onClick={() => setManual(false)}
          >
            <X size={20} />
          </button>
          <form onSubmit={addManual}>
            <p className="eyebrow">
              MANUALLY AUTHORED MOMENT · {formatTime(time)}
            </p>
            <h2 id="note-title">What deserves another look?</h2>
            <p>
              Your note will pause the replay for review. No alternative route
              is inferred from a written note.
            </p>
            <label>
              Title
              <input
                name="title"
                required
                maxLength={100}
                autoFocus
                placeholder="e.g. Revisit this challenge"
              />
            </label>
            <label>
              Observed situation
              <textarea name="explanation" required maxLength={1500} rows={3} />
            </label>
            <label>
              Proposed alternative
              <textarea name="alternative" required maxLength={1000} rows={3} />
            </label>
            <button className="button primary">
              Save review moment <Plus size={16} />
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
    >
      <path d="M4 12 12 4M4 4h8v8" />
    </svg>
  );
}
function CrosshairIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="7" />
      <path d="M12 1v6m0 10v6M1 12h6m10 0h6" />
    </svg>
  );
}
