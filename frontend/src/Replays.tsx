import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileVideo } from "lucide-react";
import { api, message } from "./api";
import type { Replay } from "./types";
import { formatTime } from "./time";
export function useReplays() {
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

export function ReplayList({ items }: { items: Replay[] }) {
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
