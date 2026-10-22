import { ArrowUpRight, Crosshair, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-icon">
        <Crosshair size={22} strokeWidth={2.5} />
      </span>
      <span>
        rankd<span className="logo-light">lab</span>
        <sup> / </sup>
      </span>
    </Link>
  );
}
export function Loading({
  text = "Loading your workspace…",
}: {
  text?: string;
}) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{text}</span>
    </div>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <div className="error-message" role="alert">
      {error}
    </div>
  ) : null;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Crosshair size={34} />
      <h2>{title}</h2>
      <p>{children}</p>
      <Link to="/upload" className="button primary">
        Upload a replay <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function ArenaDiagram() {
  return (
    <svg
      className="arena-diagram"
      viewBox="0 0 640 460"
      role="img"
      aria-label="Original illustration of a tactical coaching arena"
    >
      <defs>
        <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#17334b" />
          <stop offset=".5" stopColor="#172433" />
          <stop offset="1" stopColor="#49382d" />
        </linearGradient>
        <radialGradient id="halo">
          <stop stopColor="#7189ff" stopOpacity=".15" />
          <stop offset="1" stopColor="#7189ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="320" cy="240" rx="320" ry="215" fill="url(#halo)" />
      <g transform="translate(320,230) rotate(-28) skewX(18) scale(1,.72)">
        <rect
          x="-185"
          y="-240"
          width="370"
          height="480"
          rx="45"
          fill="#060c15"
          stroke="#334863"
          strokeWidth="14"
          transform="translate(0,16)"
        />
        <rect
          x="-185"
          y="-240"
          width="370"
          height="480"
          rx="45"
          fill="url(#field)"
          stroke="#4d6580"
          strokeWidth="2"
        />
        {[-180, -120, -60, 0, 60, 120, 180].map((y) => (
          <path key={y} d={`M-180 ${y}H180`} stroke="#76879b" opacity=".13" />
        ))}
        <path
          d="M-185 0H185M-100-240V-160H100V-240M-100 240V160H100V240"
          stroke="#9ab3ce"
          strokeWidth="2"
          fill="none"
          opacity=".5"
        />
        <circle
          r="48"
          stroke="#9ab3ce"
          strokeWidth="2"
          fill="none"
          opacity=".5"
        />
        <path
          d="M-40-240V-263H40V-240"
          stroke="#519fff"
          strokeWidth="5"
          fill="none"
        />
        <path
          d="M-40 240V263H40V240"
          stroke="#ffa05f"
          strokeWidth="5"
          fill="none"
        />
        <path
          d="M-78 65Q-95 20-35-40"
          stroke="#ff7286"
          strokeWidth="3"
          fill="none"
          strokeDasharray="7 5"
        />
        <path
          d="M-78 65Q-25 85 15 130"
          stroke="#92dfad"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="-78"
          cy="65"
          r="20"
          fill="none"
          stroke="#d5eab4"
          opacity=".7"
        />
        <rect x="-86" y="55" width="16" height="23" rx="4" fill="#5ba5ff" />
        <rect x="-45" y="-65" width="16" height="23" rx="4" fill="#5ba5ff" />
        <rect x="70" y="-20" width="16" height="23" rx="4" fill="#ffad71" />
        <rect x="20" y="-150" width="16" height="23" rx="4" fill="#ffad71" />
        <circle cx="-20" cy="-20" r="9" fill="#edf4ec" />
      </g>
    </svg>
  );
}
