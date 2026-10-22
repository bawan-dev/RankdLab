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
import { Component, useRef, useState } from "react";
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
import type { Replay, User } from "./types";
import { ArenaDiagram, ErrorMessage, Loading, Logo, PageHeader } from "./ui";
import ReplayPage from "./ReplayPage";
import ReportPage from "./ReportPage";
import Landing from "./Landing";
import ProfilePage from "./Profile";
import { Dashboard, CoachPage, ImprovementPage } from "./CoachPage";
import { rocketLeague } from "./game";
import { useSearchParams } from "react-router-dom";

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
  if (user)
    return <Navigate to={register ? "/onboarding" : "/dashboard"} replace />;
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
            ...rocketLeague.playlists.map((p) => ({
              to: `/coach/${p.id}`,
              label: `${p.id} ${p.name}`,
              icon: BarChart3,
            })),
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

function UploadPage() {
  const [search] = useSearchParams();
  const playlist = search.get("playlist");
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
      const replay = await api<Replay>(
        `/replays${playlist ? `?playlist=${encodeURIComponent(playlist)}` : ""}`,
        { method: "POST", body },
      );
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
        description={
          playlist
            ? `Upload for ${playlist}. We will check the replay team format before coaching.`
            : "Start with the match. We’ll help you take a closer look."
        }
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
            <Route path="/coach/:playlist" element={<CoachPage />} />
            <Route path="/history" element={<Dashboard history />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analytics" element={<ImprovementPage />} />
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
