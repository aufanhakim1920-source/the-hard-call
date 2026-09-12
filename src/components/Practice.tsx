import { SEEDS, levelLabel, voiceFor } from "../lib/scenarios";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import { AGENT_ID } from "../lib/practice";
import type { Scenario } from "../lib/types";

export function Practice({ onStart }: { onStart: (s: Scenario) => void }) {
  const store = useStore();
  const all: Scenario[] = [...SEEDS, ...store.scenarios.filter((s) => s.approved)];
  // Best score per scenario comes from the reports, so seeds get it too.
  const best = (id: string) => store.reports.filter((r) => r.scenarioId === id).reduce((m, r) => Math.max(m, r.score), 0);
  const plays = (id: string) => store.reports.filter((r) => r.scenarioId === id).length;
  const sorted = [...all].sort((a, b) => a.level - b.level || b.createdAt - a.createdAt);
  const next = sorted.find((s) => best(s.id) < 70);

  return (
    <div className="page">
      <h1>Practice</h1>
      <p className="lede">
        A customer with a real voice, who hides the real problem until you ask well. The same signs fire, and the same report card grades you.
        {!AGENT_ID && " (The practice voice is not configured on this build yet.)"}
      </p>
      <div className="scen-grid">
        {sorted.map((s) => {
          const b = best(s.id);
          const p = plays(s.id);
          return (
            <div className={"scen" + (next?.id === s.id ? " next" : "")} key={s.id}>
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
              <div className="sit">{s.whyThisOne}</div>
              <div className="foot">
                <span className="stats2">{p ? `${p} ${p === 1 ? "go" : "goes"} · best ${b}` : "not tried yet"}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  {s.source === "generated" && (
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        actions.removeScenario(s.id);
                        play("tap");
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
