import { SEEDS, levelAsk, levelLabel, voiceFor } from "../lib/scenarios";
import { useFlip, useRowExit } from "../lib/motion";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import { AGENT_ID } from "../lib/practice";
import type { Scenario } from "../lib/types";
// The only stylesheet this agent owns; the two classes it needs live there.
import "./report-visuals.css";

export function Practice({ onStart }: { onStart: (s: Scenario) => void }) {
  const store = useStore();
  const all: Scenario[] = [...SEEDS, ...store.scenarios.filter((s) => s.approved)];
  // Best score per scenario comes from the reports, so seeds get it too.
  // Only a VERIFIED score counts. The report card withholds a score whenever any
  // verdict is unverified, so taking r.score regardless meant Practice showed a
  // best score the card itself refuses to print, and gated the next level on it.
  const best = (id: string) =>
    store.reports.filter((r) => r.scenarioId === id && !r.scoreUnverified).reduce((m, r) => Math.max(m, r.score), 0);
  const plays = (id: string) => store.reports.filter((r) => r.scenarioId === id).length;
  const sorted = [...all].sort((a, b) => a.level - b.level || b.createdAt - a.createdAt);
  const next = sorted.find((s) => best(s.id) < 70);
  // A customer built from a real call is approved into this list, and used to
  // appear in it with nothing moving.
  const list = useFlip<HTMLDivElement>(sorted.map((s) => s.id).join());
  const exit = useRowExit();

  return (
    <div className="page">
      <h1>Practice</h1>
      <p className="lede">
        A customer with a real voice, who hides the real problem until you ask well. The same signs fire, and the same report card grades you.
        {!AGENT_ID && " (The practice voice is not configured on this build yet.)"}
      </p>
      <div className="scen-grid" ref={list}>
        {sorted.map((s) => {
          const b = best(s.id);
          const p = plays(s.id);
          return (
            <div
              className={"scen" + (next?.id === s.id ? " next" : "") + (exit.leaving === s.id ? " is-leaving-row" : "")}
              key={s.id}
              data-flip={s.id}
            >
              <div className="lvl" aria-label={levelLabel(s.level)}>
                <span className="bars">
                  {[1, 2, 3].map((n) => (
                    <i key={n} className={n <= s.level ? "on" : ""} />
                  ))}
                </span>
                <span className="small muted">{levelLabel(s.level).split(" · ")[1]}</span>
                {next?.id === s.id && <span className="badge">up next</span>}
                {s.source === "generated" && <span className="badge">from your call</span>}
              </div>
              <div className="who">
                <h3>
                  {s.name}, {s.age}
                </h3>
                <div className="small muted">
                  {s.job} · {s.product}
                </div>
                <div className="small muted voice-note">
                  voice: {voiceFor(s).name} · {voiceFor(s).note}
                </div>
              </div>
              {/* One cell, not two. .scen is a four-column grid and a fifth
                  child pushed the footer into an implicit column, squeezing the
                  situation text to one word per line. */}
              <div className="why">
                <div className="sit">{s.whyThisOne}</div>
                {/* The level said "hides it" — which describes the CUSTOMER and
                    leaves the worker with no idea what to do differently. This
                    is the same rule, said to the person who has to act on it. */}
                <div className="ask-of-you">{levelAsk(s.level)}</div>
                {/* The card said "from your call", which is exactly the half
                    that worries a privacy-minded reader. Say the other half
                    here, where the invented person is. */}
                {s.source === "generated" && (
                  <p className="rv-made-up">
                    <strong>Invented.</strong> Built from one of your calls with a new name and job and every number changed, and approved by a
                    person before it appeared here. The real call was never stored.
                  </p>
                )}
              </div>
              <div className="foot">
                <span className="stats2">{p ? `${p} ${p === 1 ? "go" : "goes"} · best ${b}` : "not tried yet"}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  {s.source === "generated" && (
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        play("tap");
                        exit.remove(s.id, () => actions.removeScenario(s.id));
                      }}
                    >
                      Remove
                    </button>
                  )}
                  <button
                    className="btn gold sm"
                    onClick={() => {
                      play("tap");
                      onStart(s);
                    }}
                  >
                    Start
                  </button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <h2>How it gets harder</h2>
      <p className="muted" style={{ maxWidth: 640 }}>
        Score 70 or more and the next level lights up. Every real call can become a new practice customer from its report card — names and numbers changed, and a
        person approves it first.
      </p>
    </div>
  );
}
