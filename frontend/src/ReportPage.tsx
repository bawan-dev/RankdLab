import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  FileJson,
  Flag,
  Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, message } from "./api";
import type { Finding, Metadata, Player } from "./types";
import { formatTime } from "./time";
import { ErrorMessage, Loading, PageHeader } from "./ui";

type Report = {
  replay_id: string;
  filename: string;
  metadata: Metadata;
  selected_player: Player;
  findings: Finding[];
  most_common_category: string | null;
  priorities: string[];
  active_seconds: number;
  engine_version: string;
  coverage?: { team_rules_supported: boolean; message: string };
  feedback: { finding_id: string; inaccurate: boolean }[];
};

export default function ReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<Report>(`/replays/${id}/report`)
      .then(setReport)
      .catch((error) => setError(message(error)));
  }, [id]);
  async function exportJson() {
    try {
      const data = await api<Report>(`/replays/${id}/report`);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `rankdlab-${id}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(message(error));
    }
  }
  if (!report)
    return error ? (
      <>
        <ErrorMessage error={error} />
        <Link to={`/replays/${id}`} className="button subtle">
          Open replay and select your player <ArrowUpRight size={16} />
        </Link>
      </>
    ) : (
      <Loading text="Loading your match report…" />
    );
  const automatic = report.findings.filter((f) => f.source === "rule");
  return (
    <>
      <Link to={`/replays/${id}`} className="text-link muted small no-print">
        <ArrowLeft size={13} /> Back to replay
      </Link>
      <PageHeader
        eyebrow="YOUR MATCH, IN PERSPECTIVE"
        title="Match coaching report"
        description={report.filename}
        action={
          <div className="actions no-print">
            <button className="button subtle" onClick={exportJson}>
              <FileJson size={16} /> Export JSON
            </button>
            <button className="button subtle" onClick={() => window.print()}>
              <Download size={16} /> Print / PDF
            </button>
          </div>
        }
      />
      <ErrorMessage error={error} />
      <section className="report-match panel">
        <div>
          <p className="eyebrow">SELECTED PLAYER</p>
          <h2>{report.selected_player.name}</h2>
          <p>
            {report.metadata.map} · {report.metadata.date ?? "Date unavailable"}
          </p>
        </div>
        <div className="report-score">
          <span className="blue-text">{report.metadata.score[0] ?? "—"}</span>
          <span>FINAL SCORE</span>
          <span className="orange-text">{report.metadata.score[1] ?? "—"}</span>
        </div>
        <span className="badge">
          {formatTime(report.metadata.duration)} RECORDED
        </span>
      </section>
      <div className="stat-grid report-stats">
        {["goals", "assists", "saves", "shots", "score"].map((stat) => (
          <div key={stat}>
            <span>{stat}</span>
            <strong>{report.selected_player.stats[stat] ?? "—"}</strong>
            <small>Recorded replay metadata</small>
          </div>
        ))}
      </div>
      <div className="two-columns report-summary">
        <section className="panel focus-card">
          <p className="eyebrow">IMPROVEMENT PRIORITIES</p>
          <h2>
            {report.most_common_category
              ? report.most_common_category.replaceAll("_", " ")
              : "Keep reviewing the context."}
          </h2>
          {report.priorities.map((priority, i) => (
            <p key={i}>
              <span className="priority-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              {priority}
            </p>
          ))}
        </section>
        <section className="panel focus-card">
          <p className="eyebrow">REVIEW COVERAGE</p>
          <h2>{automatic.length} potential issues</h2>
          <p>
            Across {(report.active_seconds / 60).toFixed(1)} active minutes.{" "}
            {report.active_seconds > 0
              ? ((automatic.length / report.active_seconds) * 300).toFixed(2)
              : "—"}{" "}
            flags per five active minutes.
          </p>
          <p className="muted small">
            {report.engine_version} · Experimental rules without calibrated
            probabilities. Raw counts include disputed findings; see their
            feedback labels below.
          </p>
          {report.coverage && (
            <p className="muted small">{report.coverage.message}</p>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Decision timeline</h2>
            <p>
              Observed evidence and proposed alternatives from your stored
              analysis.
            </p>
          </div>
          <span className="badge">{report.findings.length} MOMENTS</span>
        </div>
        <div className="report-findings">
          {report.findings.map((finding) => (
            <article key={finding.id}>
              <span className="report-timestamp">
                {formatTime(finding.time)}
              </span>
              <div>
                <div className="actions">
                  <h3>{finding.title}</h3>
                  <span className="badge">
                    {finding.source === "manual"
                      ? "MANUAL NOTE"
                      : finding.severity}
                  </span>
                  {report.feedback.some(
                    (f) => f.finding_id === finding.id && f.inaccurate,
                  ) && (
                    <span className="badge red">
                      <Flag size={10} /> DISPUTED
                    </span>
                  )}
                </div>
                <p>{finding.explanation}</p>
                <p className="proposed">
                  <strong>Proposed alternative:</strong> {finding.alternative}
                </p>
                <dl className="report-evidence">
                  {Object.entries(finding.evidence).map(([key, value]) => (
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
                <small className="muted">
                  {finding.detector_version} · {finding.reliability}
                </small>
              </div>
              <Link
                to={`/replays/${id}`}
                className="icon-button no-print"
                title="Open replay"
              >
                <Play size={16} />
              </Link>
            </article>
          ))}
          {!report.findings.length && (
            <div className="empty-state">
              <h2>No qualifying situations were flagged.</h2>
              <p>
                The current detector coverage is limited. This is not proof of
                mistake-free play.
              </p>
            </div>
          )}
        </div>
      </section>
      <p className="muted small report-disclaimer">
        RankdLab is an independent, unofficial project. Potential issues are
        heuristic interpretations of recorded facts, pending qualified coach
        evaluation. Suggested alternatives are not simulated and do not
        guarantee a better outcome.
      </p>
    </>
  );
}
