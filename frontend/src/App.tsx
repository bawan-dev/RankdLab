import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  FileVideo,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Component, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { api, message } from "./api";
import { AuthProvider, useAuth } from "./auth";
import type { Analytics, Replay, User } from "./types";
import {
  ArenaDiagram,
  EmptyState,
  ErrorMessage,
  Loading,
  Logo,
  PageHeader,
} from "./ui";
import { formatTime } from "./time";
import ReplayPage from "./ReplayPage";
import ReportPage from "./ReportPage";
import Landing from "./Landing";
import ProfilePage from "./Profile";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty-state">
        <h1>The workspace hit an error.</h1>
        <p>Your saved replays are still on the server.</p>
        <a className="button primary" href="/dashboard">
          Reload workspace
        </a>
      </div>
    ) : (
      this.props.children
    );
  }
}

function AuthPage({ register = false }: { register?: boolean }) {
  const { user, setUser } = useAuth();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  if (user) return <Navigate to={register ? "/onboarding" : "/dashboard"} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const result = await api<User>(
        register ? "/auth/register" : "/auth/login",
        { method: "POST", body: JSON.stringify(Object.fromEntries(fields)) },
      );
      setUser(result);
      navigate(register ? "/onboarding" : "/dashboard");
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-art">
        <Logo />
        <div>
          <p className="eyebrow">YOUR NEXT LEVEL STARTS WITH A SECOND LOOK.</p>
          <h1>
            Find the space
            <br />
            to improve.
          </h1>
          <ArenaDiagram />
        </div>
        <p className="muted small">
          An independent Rocket League replay coaching project.
        </p>
      </div>
      <div className="auth-content">
        <Link to="/" className="text-link">
          ← Back to RankdLab
        </Link>
        <form onSubmit={submit} className="auth-form">
          <p className="eyebrow">YOUR COACHING WORKSPACE</p>
          <h1>{register ? "Make room for progress." : "Welcome back."}</h1>
          <p>
            {register
              ? "Create an account to save your replays and reviews."
              : "Pick up where your last review left off."}
          </p>
          <ErrorMessage error={error} />
          {register && (
            <label>
              Display name
              <input
                name="display_name"
                autoComplete="nickname"
                required
                maxLength={60}
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={12}
              maxLength={128}
              placeholder="At least 12 characters"
            />
          </label>
          <button className="button primary large" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
          <p className="small">
            {register ? "Already have an account?" : "New to RankdLab?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          {!register && (
            <p className="muted small">
              Password recovery is not available in this development preview.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Workspace() {
  const { user, loading, setUser } = useAuth(),
    navigate = useNavigate();
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/");
    } catch (error) {
      setError(message(error));
    }
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        className="mobile-menu button subtle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Logo />
        <div className="workspace-label">
          ROCKET LEAGUE <span>COACHING</span>
        </div>
        <nav aria-label="Main navigation">
          {[
            { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { to: "/upload", label: "Upload replay", icon: Upload },
            { to: "/history", label: "Replay library", icon: FileVideo },
            { to: "/analytics", label: "Improvement history", icon: BarChart3 },
            { to: "/settings", label: "Settings", icon: SettingsIcon },
          ].map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
              <item.icon size={18} />
              {item.label}
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" /> EXPERIMENTAL COACHING
          <p>
            Evidence first.
            <br />
            Always room for your judgement.
          </p>
        </div>
        <div className="sidebar-profile">
          <span className="avatar">
            {user.display_name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{user.display_name}</strong>
            <small>Personal workspace</small>
          </div>
          <button title="Sign out" aria-label="Sign out" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace-body">
        <div className="topbar">
          <span>
            WORKSPACE <ChevronRight size={12} />{" "}
            <strong>Replay coaching</strong>
          </span>
          <span className="status-indicator">
            <span className="live-dot" /> DEVELOPMENT PREVIEW
          </span>
        </div>
        <ErrorMessage error={error} />
        <main className="page" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>RankdLab · Play with intention.</span>
          <span>
            Unofficial project · Experimental rules, not validated coaching.
          </span>
        </footer>
      </div>
    </div>
  );
}

function useReplays() {
  const [items, setItems] = useState<Replay[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<Replay[]>("/replays")
      .then((data) => {
        if (live) setItems(data);
      })
      .catch((error) => {
        if (live) setError(message(error));
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, []);
  return { items, setItems, busy, error };
}

function ReplayList({ items }: { items: Replay[] }) {
  return (
    <div className="replay-list">
      {items.map((replay) => (
        <Link
          key={replay.id}
          to={`/replays/${replay.id}`}
          className="replay-row"
        >
          <span className={`replay-icon ${replay.status}`}>
            <FileVideo size={21} />
          </span>
          <div className="replay-name">
            <strong>{replay.filename}</strong>
            <span>
              {replay.metadata.players?.length
                ? `${replay.metadata.players.length} players · ${formatTime(replay.metadata.duration ?? 0)}`
                : "Metadata available after processing"}{" "}
              · {new Date(replay.created_at * 1000).toLocaleDateString()}
            </span>
          </div>
          <span
            className={`badge ${replay.status === "ready" ? "green" : replay.status === "failed" ? "red" : ""}`}
          >
            {replay.status === "ready" ? "Ready to review" : replay.status}
          </span>
          <span className="replay-count">
            {replay.status === "ready"
              ? `${replay.findings.filter((f) => f.player_id === replay.selected_player && f.source === "rule").length} flags`
              : "—"}
          </span>
          <ArrowUpRight size={18} />
        </Link>
      ))}
    </div>
  );
}

function Dashboard({ history = false }: { history?: boolean }) {
  const { user } = useAuth(),
    { items, busy, error } = useReplays();
  const ready = items.filter((r) => r.status === "ready");
  const selected = ready.filter((r) => r.selected_player);
  const count = selected.reduce(
    (sum, r) =>
      sum +
      r.findings.filter(
        (f) => f.player_id === r.selected_player && f.source === "rule",
      ).length,
    0,
  );
  return (
    <>
      <PageHeader
        eyebrow={history ? "YOUR MATCH ARCHIVE" : "THE BIGGER PICTURE"}
        title={history ? "Replay library" : `Your game. A fresh perspective.`}
        description={
          history
            ? "Every uploaded match, with your review ready when you are."
            : `Welcome${user ? `, ${user.display_name}` : ""}. Make the next session a little more intentional.`
        }
        action={
          <Link className="button primary" to="/upload">
            <Upload size={16} /> Upload replay
          </Link>
        }
      />
      <ErrorMessage error={error} />
      {!history && (
        <>
          <section className="dashboard-banner">
            <div>
              <p className="eyebrow">THE NEXT PLAY STARTS HERE</p>
              <h2>
                Progress begins with
                <br />a second look.
              </h2>
              <p>Bring a match. Find a moment. Understand the decision.</p>
              <Link to="/upload" className="text-link">
                Start a replay review <ArrowRight size={16} />
              </Link>
            </div>
            <ArenaDiagram />
            <span className="banner-stamp">REVIEW / REFLECT / REPEAT</span>
          </section>
          <div className="stat-grid">
            <div>
              <span>Replays ready</span>
              <strong>{ready.length.toString().padStart(2, "0")}</strong>
              <small>Recorded matches in your library</small>
            </div>
            <div>
              <span>Review time available</span>
              <strong>
                {formatTime(
                  ready.reduce((sum, r) => sum + (r.metadata.duration ?? 0), 0),
                )}
              </strong>
              <small>Total recorded replay duration</small>
            </div>
            <div>
              <span>Potential issues</span>
              <strong>{count.toString().padStart(2, "0")}</strong>
              <small>Across {selected.length} selected-player matches</small>
            </div>
          </div>
        </>
      )}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{history ? "All replays" : "Your recent replays"}</h2>
            <p>Real matches. Saved reviews. A place to come back to.</p>
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
          <EmptyState title="Your next insight starts with a replay.">
            Upload your first match to reconstruct the play and begin your
            review.
          </EmptyState>
        )}
      </section>
      {!history && (
        <div className="two-columns">
          <article className="panel focus-card">
            <p className="eyebrow">YOUR CURRENT FOCUS</p>
            <h2>
              {user?.coaching_goal || "Give your next session a purpose."}
            </h2>
            <p>
              {user?.coaching_goal
                ? "Bring this intention into your next replay review."
                : "Set one clear coaching goal and keep it in view as you review."}
            </p>
            <Link to="/settings" className="text-link">
              {user?.coaching_goal ? "Edit your goal" : "Set a coaching goal"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="panel focus-card">
            <p className="eyebrow">A NOTE ON COACHING</p>
            <h2>Evidence, with perspective.</h2>
            <p>
              Flags are generated by experimental geometry rules. Read the
              evidence, consider the context, and flag detections you disagree
              with.
            </p>
            <span className="badge">NO TRAINED ML MODEL</span>
          </article>
        </div>
      )}
    </>
  );
}

function UploadPage() {
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    navigate = useNavigate();
  function choose(candidate?: File) {
    setError("");
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".replay"))
      return setError("Choose a Rocket League .replay file.");
    if (candidate.size < 64)
      return setError("This file is empty or too short to contain a replay.");
    if (candidate.size > 20 * 1024 ** 2)
      return setError("The replay must be 20 MB or smaller.");
    setFile(candidate);
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file, file.name);
    try {
      const replay = await api<Replay>("/replays", { method: "POST", body });
      navigate(`/replays/${replay.id}`);
    } catch (error) {
      setError(message(error));
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="BRING YOUR GAME"
        title="Every replay has a story."
        description="Start with the match. We’ll help you take a closer look."
      />
      <div className="upload-layout">
        <form className="panel upload-panel" onSubmit={upload}>
          <div className="panel-header">
            <div>
              <h2>Upload a replay</h2>
              <p>Standard Soccar · up to 20 MB · up to 30 minutes</p>
            </div>
            <span className="badge">.REPLAY</span>
          </div>
          <ErrorMessage error={error} />
          <div
            className={`dropzone ${drag ? "drag-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) choose(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-orb">
              <Upload size={29} />
            </span>
            <h3>{file ? file.name : "Drop your match here"}</h3>
            <p>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload`
                : "or choose a .replay file from your computer"}
            </p>
            <input
              ref={input}
              type="file"
              accept=".replay"
              aria-label="Choose replay file"
              disabled={busy}
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <button
              type="button"
              className="button subtle"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {file ? "Choose another file" : "Browse files"}{" "}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="upload-footer">
            <span>
              <ShieldCheck size={16} /> Saved to your account
            </span>
            <button className="button primary" disabled={!file || busy}>
              {busy ? "Uploading…" : "Upload & process"}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <aside className="upload-guide">
          <p className="eyebrow">WHAT HAPPENS NEXT</p>
          {[
            {
              n: "01",
              t: "Reconstruct the match",
              d: "Read recorded positions, player identities, boost, and match timing.",
            },
            {
              n: "02",
              t: "Choose your perspective",
              d: "Select your player and review the match in a simplified 3D arena.",
            },
            {
              n: "03",
              t: "Explore the evidence",
              d: "Experimental rules highlight potential issues, with context and proposed alternatives.",
            },
          ].map((item) => (
            <div className="guide-step" key={item.n}>
              <span>{item.n}</span>
              <div>
                <h3>{item.t}</h3>
                <p>{item.d}</p>
              </div>
            </div>
          ))}
          <div className="help-box">
            <FileVideo size={19} />
            <h3>Finding your replays</h3>
            <p>On Windows, check:</p>
            <code>Documents\My Games\Rocket League\TAGame\Demos</code>
            <p>
              Save a replay from Rocket League after a match. Renaming another
              file won’t make it a replay.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<Analytics>("/analytics")
      .then(setData)
      .catch((error) => setError(message(error)));
  }, []);
  return (
    <>
      <PageHeader
        eyebrow="PATTERNS OVER TIME"
        title="A little more intentional."
        description="Track potential issues across your selected-player matches."
      />
      <ErrorMessage error={error} />
      {!data && !error ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="stat-grid">
              <div>
                <span>Analysed matches</span>
                <strong>{data.matches}</strong>
                <small>Ready replays with a selected player</small>
              </div>
              <div>
                <span>Active gameplay</span>
                <strong>
                  {data.minutes.toFixed(1)}
                  <em> min</em>
                </strong>
                <small>Countdown and post-goal time excluded</small>
              </div>
              <div>
                <span>Flags / 5 active minutes</span>
                <strong>
                  {data.minutes
                    ? ((data.findings / data.minutes) * 5).toFixed(1)
                    : "—"}
                </strong>
                <small>Experimental rules; frequency is not skill</small>
              </div>
            </div>
            {data.matches ? (
              <section className="panel analytics-panel">
                <div className="panel-header">
                  <div>
                    <h2>Where the flags appear</h2>
                    <p>
                      Frequency per five active minutes, grouped by category.
                    </p>
                  </div>
                  <BarChart3 size={20} />
                </div>
                {data.categories.length ? (
                  data.categories.map((category) => (
                    <div className="category-bar" key={category.category}>
                      <div>
                        <strong>
                          {category.category.replaceAll("_", " ")}
                        </strong>
                        <span>
                          {category.per_5_minutes.toFixed(2)} / 5 min ·{" "}
                          {category.count} flags
                        </span>
                      </div>
                      <div className="bar-track">
                        <span
                          style={{
                            width: `${(category.count / Math.max(...data.categories.map((c) => c.count), 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Check size={28} />
                    <h2>No rule detections in these matches.</h2>
                    <p>
                      This does not establish that every decision was correct.
                    </p>
                  </div>
                )}
                <div className="comparison-grid">
                  <div>
                    <span>Recent matches (up to 5)</span>
                    <strong>{data.recent_rate?.toFixed(2) ?? "—"}</strong>
                    <small>flags / 5 active minutes</small>
                  </div>
                  <div>
                    <span>Previous matches (up to 5)</span>
                    <strong>{data.previous_rate?.toFixed(2) ?? "—"}</strong>
                    <small>flags / 5 active minutes</small>
                  </div>
                </div>
                <p className="muted small">
                  Engine versions: {data.engine_versions.join(", ")}. Rates
                  normalize time, not tactical opportunities. Match context and
                  detector changes can affect comparisons. Inaccurate flags
                  remain in the raw count and are recorded separately in
                  reports.
                </p>
              </section>
            ) : (
              <EmptyState title="Patterns need a little history.">
                Upload a match and select your player to start tracking.
              </EmptyState>
            )}
          </>
        )
      )}
    </>
  );
}

function SettingsPage() {
  const { user, setUser } = useAuth(),
    navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [goal, setGoal] = useState(user?.coaching_goal ?? ""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setUser(
        await api<User>("/profile", {
          method: "PUT",
          body: JSON.stringify({
            coaching_goal: goal,
            display_name: displayName,
          }),
        }),
      );
      setSaved(true);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount() {
    setBusy(true);
    setError("");
    try {
      await api("/profile", { method: "DELETE" });
      setUser(null);
      navigate("/");
    } catch (error) {
      setError(message(error));
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Player settings"
        description="Your account, your focus, your data."
      />
      <ErrorMessage error={error} />
      <Link to="/profile/rocket-league" className="profile-entry panel">
        <div>
          <h2>Rocket League ranks & profile</h2>
          <p>
            Manage your three playlist ranks and review your update history.
          </p>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <p className="eyebrow">ACCOUNT</p>
          <h2>{user?.display_name}</h2>
          <p>{user?.email}</p>
          <span className="badge green">
            <ShieldCheck size={12} /> Private account workspace
          </span>
        </section>
        <form className="panel settings-panel" onSubmit={save}>
          <p className="eyebrow">YOUR NEXT SESSION</p>
          <h2>Your profile and focus.</h2>
          <label>
            Display username
            <input
              value={displayName}
              required
              maxLength={60}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <p>Give your next review a focus you can act on.</p>
          <label>
            Coaching goal
            <textarea
              maxLength={500}
              value={goal}
              onChange={(event) => {
                setGoal(event.target.value);
                setSaved(false);
              }}
              placeholder="e.g. Leave space for my teammate when defending."
              rows={4}
            />
          </label>
          <button className="button primary" disabled={busy}>
            {saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              "Save goal"
            )}
          </button>
        </form>
        <section className="panel settings-panel danger-panel">
          <p className="eyebrow">YOUR DATA</p>
          <h2>Delete your account</h2>
          <p>
            Permanently remove your account, replays, reports, feedback, and
            review labels. This cannot be undone.
          </p>
          {deleting ? (
            <div className="actions">
              <button
                className="button danger"
                disabled={busy}
                onClick={deleteAccount}
              >
                Confirm permanent deletion
              </button>
              <button
                className="button subtle"
                disabled={busy}
                onClick={() => setDeleting(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button className="button danger" onClick={() => setDeleting(true)}>
              Delete account & data
            </button>
          )}
        </section>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route element={<Workspace />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<Dashboard history />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/onboarding" element={<ProfilePage onboarding />} />
            <Route path="/profile/rocket-league" element={<ProfilePage />} />
            <Route path="/replays/:id" element={<ReplayPage />} />
            <Route path="/replays/:id/report" element={<ReportPage />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Page not found</h1>
                <Link to="/" className="button primary">
                  Back to RankdLab
                </Link>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
