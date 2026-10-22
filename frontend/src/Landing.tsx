import {
  ArrowRight,
  ArrowUpRight,
  CirclePlay,
  Focus,
  Route,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "./auth";
import { ArenaDiagram, Logo } from "./ui";
import { rocketLeague } from "./game";

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing editorial-landing">
      <nav className="landing-nav" aria-label="Public navigation">
        <Logo />
        <a href="#how-it-works" className="landing-explore">
          The review process
        </a>
        <Link className="button subtle" to={user ? "/dashboard" : "/login"}>
          {user ? "Open workspace" : "Sign in"}
          <ArrowUpRight size={16} />
        </Link>
      </nav>
      <main className="landing-main">
        <section className="editorial-hero">
          <div className="hero-intro">
            <p className="eyebrow">ROCKET LEAGUE / REPLAY COACHING</p>
            <h1>
              A better view.
              <br />
              <span>A clearer next move.</span>
            </h1>
            <div className="hero-bottom">
              <p>
                Step outside the match. See the space you missed, question the
                decision, and take one useful idea into your next game.
              </p>
              <Link
                className="button primary large"
                to={user ? "/upload" : "/register"}
              >
                Start your review <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="tactical-preview">
            <div className="preview-label">
              <span>
                <Focus size={15} /> THE TACTICAL VIEW
              </span>
              <span>01 / PERSPECTIVE</span>
            </div>
            <ArenaDiagram />
            <div className="preview-caption">
              <div>
                <CirclePlay size={23} />
                <strong>Your match. Another angle.</strong>
              </div>
              <p>Recorded movement · Guided review · Your judgement</p>
            </div>
            <span className="illustration-label">
              ILLUSTRATION · NOT A LIVE REPLAY
            </span>
          </div>
        </section>
        <section className="landing-modes">
          <div>
            <p className="eyebrow">ONE GAME. THREE PERSPECTIVES.</p>
            <h2>Built around the way you play.</h2>
          </div>
          <div className="mode-grid">
            {rocketLeague.playlists.map((p) => (
              <Link
                to={user ? `/coach/${p.id}` : "/register"}
                className="mode-card"
                key={p.id}
              >
                <span className="mode-number">{p.id}</span>
                <h3>{p.name}</h3>
                <p>{p.detail}</p>
                <ArrowUpRight size={19} />
              </Link>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="review-process">
          <div>
            <p className="eyebrow">THE REVIEW PROCESS</p>
            <h2>
              Turn a replay into
              <br />a deliberate practice.
            </h2>
            <p>
              Keep the evidence close.
              <br />
              Keep your next objective simple.
            </p>
          </div>
          <div>
            {[
              {
                icon: Upload,
                title: "Bring the match",
                text: "Upload a real .replay file and select your player. Your match is reconstructed from recorded positions.",
              },
              {
                icon: Focus,
                title: "Find the decision",
                text: "Explore the 3D arena. Review experimental positioning flags or mark your own moments with context.",
              },
              {
                icon: Route,
                title: "Build your next session",
                text: "Save a review, track patterns by playlist and choose a practical focus for your next match.",
              },
            ].map((s, i) => (
              <article key={s.title}>
                <span className="process-index">0{i + 1}</span>
                <s.icon size={22} />
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-cta">
          <div>
            <p className="eyebrow">YOUR NEXT MATCH STARTS WITH A SECOND LOOK</p>
            <h2>Play. Review. Return with purpose.</h2>
            <p>
              Experimental coaching, grounded in replay evidence. No promises
              about your next rank.
            </p>
          </div>
          <Link
            className="button primary"
            to={user ? "/dashboard" : "/register"}
          >
            Open your workspace <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <p>
          Independent and unofficial. Not affiliated with Psyonix or Epic Games.
        </p>
        <span>REPLAY / REFLECT / REPEAT</span>
      </footer>
    </div>
  );
}
