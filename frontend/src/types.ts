export type Vec3 = { x: number; y: number; z: number };
export type Rotation = Vec3 & { w: number };
export type Actor = {
  position: Vec3;
  rotation: Rotation;
  velocity: Vec3 | null;
  boost: number | null;
};
export type Frame = {
  time: number;
  source_time: number;
  seconds_remaining: number | null;
  state: string;
  ball: Actor | null;
  players: Record<string, Actor | null>;
};
export type Player = {
  id: string;
  name: string;
  team: number;
  stats: Record<string, number | null>;
};
export type Goal = { time: number; team: number; score: (number | null)[] };
export type Metadata = {
  title: string;
  map: string | null;
  date: string | null;
  duration: number;
  frame_count: number;
  source_time_offset: number;
  players: Player[];
  score: (number | null)[];
  initial_score?: (number | null)[];
  goals: Goal[];
};
export type Finding = {
  id: string;
  replay_id: string;
  player_id: string;
  time: number;
  category: string;
  title: string;
  severity: string;
  reliability: string;
  explanation: string;
  alternative: string;
  evidence: Record<string, number | string>;
  target: Vec3;
  detector_version: string;
  source: "rule" | "manual";
};
export type Replay = {
  id: string;
  filename: string;
  status: "queued" | "processing" | "ready" | "failed" | "deleting";
  error: string | null;
  created_at: number;
  metadata: Partial<Metadata>;
  findings: Finding[];
  selected_player: string | null;
  session_time: number;
  reviewed_ids: string[];
  engine_version: string;
  feedback?: { finding_id: string; inaccurate: boolean; note: string }[];
};
export type ReplayData = {
  schema_version: number;
  parser_version: string;
  metadata: Metadata;
  frames: Frame[];
};
export type User = {
  id: string;
  email: string;
  display_name: string;
  coaching_goal: string;
};
export type Analytics = {
  matches: number;
  minutes: number;
  findings: number;
  categories: { category: string; count: number; per_5_minutes: number }[];
  recent_rate: number | null;
  previous_rate: number | null;
  engine_versions: string[];
};
