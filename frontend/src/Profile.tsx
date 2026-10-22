import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { api, message } from "./api";
import { rocketLeague } from "./game";
import type { Playlist } from "./game";
import { ErrorMessage, Loading, PageHeader } from "./ui";

export type Rank = {
  rank: string;
  division: number | null;
  mmr: number | null;
  playlist: Playlist;
  source: string;
  updated_at: number;
};
export type RocketProfile = {
  display_name: string;
  platform: string;
  onboarding_complete: boolean;
  ranks: Partial<Record<Playlist, Rank>>;
  history: Rank[];
};
export const tiers = [
  "Unranked",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Champion",
  "Grand Champion",
  "Supersonic Legend",
];
export function rankLabel(rank?: Rank) {
  return rank
    ? `${rank.rank}${rank.division ? ` · Div ${["I", "II", "III", "IV"][rank.division - 1]}` : ""}`
    : "Rank not set";
}
export function useRocketProfile() {
  const [profile, setProfile] = useState<RocketProfile | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<RocketProfile>("/rocket-league/profile")
      .then((p) => {
        if (live) setProfile(p);
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
    };
  }, []);
  return { profile, setProfile, error };
}

export function RankSelector({
  playlist,
  current,
  onSave,
}: {
  playlist: Playlist;
  current?: Rank;
  onSave: (rank: Rank) => void;
}) {
  const initialTier =
    tiers.find(
      (t) => current?.rank === t || current?.rank.startsWith(`${t} `),
    ) ?? "Unranked";
  const [tier, setTier] = useState(initialTier),
    [level, setLevel] = useState(
      current?.rank.slice(initialTier.length + 1) || "I",
    ),
    [division, setDivision] = useState(current?.division?.toString() ?? ""),
    [mmr, setMmr] = useState(current?.mmr?.toString() ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const special = tier === "Unranked" || tier === "Supersonic Legend";
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<Rank>(`/rocket-league/ranks/${playlist}`, {
        method: "PUT",
        body: JSON.stringify({
          rank: special ? tier : `${tier} ${level}`,
          division: special || !division ? null : Number(division),
          mmr: mmr ? Number(mmr) : null,
        }),
      });
      onSave(r);
      setSaved(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="rank-selector"
      onSubmit={save}
      onChange={() => setSaved(false)}
      aria-label={`${playlist} rank`}
    >
      <div className="rank-heading">
        <div>
          <span className="eyebrow">{playlist} / SELF-REPORTED</span>
          <h3>{special ? tier : `${tier} ${level}`}</h3>
        </div>
        <span className="rank-glyph" aria-hidden="true">
          ◇
        </span>
      </div>
      <fieldset>
        <legend>Rank tier</legend>
        <div className="rank-tiers">
          {tiers.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tier === t}
              onClick={() => {
                setTier(t);
                setSaved(false);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      {!special && (
        <fieldset>
          <legend>Rank level</legend>
          <div className="rank-levels">
            {["I", "II", "III"].map((l) => (
              <button
                type="button"
                key={l}
                aria-pressed={l === level}
                onClick={() => {
                  setLevel(l);
                  setSaved(false);
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="rank-inputs">
        {!special && (
          <label>
            Division (optional)
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option value="">Not specified</option>
              {["I", "II", "III", "IV"].map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          MMR (optional)
          <input
            type="number"
            min="0"
            max="5000"
            step="1"
            value={mmr}
            onChange={(e) => setMmr(e.target.value)}
            placeholder="Not specified"
          />
        </label>
      </div>
      <ErrorMessage error={error} />
      <button className="button subtle" disabled={busy}>
        {saved ? (
          <>
            <Check size={16} /> Saved {playlist} rank
          </>
        ) : (
          `Save ${playlist} rank`
        )}
      </button>
      <p className="small muted">
        {current
          ? `Last saved ${new Date(current.updated_at * 1000).toLocaleString()}. `
          : ""}
        Entered by you. No official verification.
      </p>
    </form>
  );
}

export default function ProfilePage({
  onboarding = false,
}: {
  onboarding?: boolean;
}) {
  const { profile, setProfile, error: loadError } = useRocketProfile();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(e.currentTarget);
    try {
      setProfile(
        await api<RocketProfile>("/rocket-league/profile", {
          method: "PUT",
          body: JSON.stringify({
            display_name: fields.get("rocket_name"),
            platform: fields.get("platform"),
            onboarding_complete: true,
          }),
        }),
      );
      setSaved(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function saveRank(rank: Rank) {
    setProfile((p) =>
      p
        ? {
            ...p,
            ranks: { ...p.ranks, [rank.playlist]: rank },
            history: [rank, ...p.history],
          }
        : p,
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="ROCKET LEAGUE PROFILE"
        title={
          onboarding
            ? "Make this your coaching space."
            : "Your ranks. Your context."
        }
        description="Optional, self-reported ranks shape explanations. They never change what the replay shows."
        action={
          onboarding ? (
            <Link to="/dashboard" className="button subtle">
              Skip for now <ChevronRight size={16} />
            </Link>
          ) : undefined
        }
      />
      <ErrorMessage error={loadError || error} />
      {!profile ? (
        !loadError && <Loading />
      ) : (
        <>
          {onboarding && (
            <div
              className="profile-onboarding-steps"
              aria-label="Profile setup steps"
            >
              <span>
                <strong>01</strong> Add player details
              </span>
              <span>
                <strong>02</strong> Choose your playlist ranks
              </span>
              <span>
                <strong>03</strong> Start coaching
              </span>
            </div>
          )}
          <form onSubmit={save} className="profile-basics panel">
            <label>
              Rocket League display username
              <input
                name="rocket_name"
                defaultValue={profile.display_name}
                maxLength={60}
                placeholder="Your in-game name"
              />
            </label>
            <label>
              Gaming platform (optional)
              <select name="platform" defaultValue={profile.platform}>
                <option value="">Not specified</option>
                {["PC", "PlayStation", "Xbox", "Switch"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              {saved
                ? "Player details saved"
                : onboarding
                  ? "Save player details"
                  : "Save profile"}
            </button>
          </form>
          <div className="rank-grid">
            {rocketLeague.playlists.map((p) => (
              <RankSelector
                key={p.id}
                playlist={p.id}
                current={profile.ranks[p.id]}
                onSave={saveRank}
              />
            ))}
          </div>
          {onboarding && (
            <section
              className="onboarding-finish panel"
              aria-label="Complete profile setup"
            >
              <div>
                <span className="eyebrow">READY WHEN YOU ARE</span>
                <h2>Every playlist. Your pace.</h2>
                <p>
                  Ranks are optional. Save any ranks you want the coach to
                  consider, then enter your workspace. You can change them
                  later.
                </p>
                {!saved && !profile.onboarding_complete && (
                  <p className="onboarding-hint">
                    Save your player details above to complete setup, or skip
                    for now.
                  </p>
                )}
              </div>
              {profile.onboarding_complete ? (
                <Link className="button primary" to="/dashboard">
                  Go to dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <Link className="button subtle" to="/dashboard">
                  Skip for now <ChevronRight size={16} />
                </Link>
              )}
            </section>
          )}
          {!onboarding && (
            <section className="panel rank-history">
              <div className="panel-header">
                <div>
                  <h2>Rank update history</h2>
                  <p>
                    Self-reported snapshots. Existing reports keep their
                    original context.
                  </p>
                </div>
              </div>
              {profile.history.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Updated</th>
                        <th>Playlist</th>
                        <th>Rank</th>
                        <th>MMR</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.history.map((r, i) => (
                        <tr key={i}>
                          <td>
                            {new Date(r.updated_at * 1000).toLocaleString()}
                          </td>
                          <td>{r.playlist}</td>
                          <td>{rankLabel(r)}</td>
                          <td>{r.mmr ?? "—"}</td>
                          <td>User-entered</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-copy">
                  No rank updates yet. You can upload and review matches without
                  setting a rank.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
