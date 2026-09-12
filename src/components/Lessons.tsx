import { useState } from "react";
import { fmtWhen } from "../lib/dates";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import type { LessonKind } from "../lib/types";

const KIND_LABEL: Record<LessonKind, string> = {
  "not-a-sign": "Not a sign",
  "missed-sign": "Missed sign",
  wording: "Wording",
};

export function Lessons() {
  const store = useStore();
  const [kind, setKind] = useState<LessonKind>("missed-sign");
  const [text, setText] = useState("");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    actions.addLesson({ kind, text: text.trim() });
    setText("");
    play("handled");
  };
  return (
    <div className="page narrow">
      <h1>Lessons</h1>
      <p className="lede">
        What a manager has corrected. Every lesson is sent to the engine with every call from then on, so the team's judgement becomes the AI's.
      </p>
      <form className="form-row" onSubmit={add}>
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value as LessonKind)}>
          <option value="missed-sign">It should flag…</option>
          <option value="not-a-sign">It should not flag…</option>
          <option value="wording">Word it like…</option>
        </select>
        <input className="field" placeholder='e.g. "a customer asking to move the due date by a week is a hardship request"' value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn gold" type="submit">
          Add lesson
        </button>
      </form>
      {store.lessons.length === 0 && (
        <div className="empty">
          <b>No lessons yet.</b>
          Correct a sign on any report card and it lands here.
        </div>
      )}
      {store.lessons.map((l) => (
        <div className="lesson" key={l.id}>
          <span className="k">{KIND_LABEL[l.kind]}</span>
          <div>
            <div>{l.text}</div>
            {l.evidence && <div className="ev">“{l.evidence}”</div>}
            <div className="used">
              added {fmtWhen(l.t)} · used on {l.usedOn} call{l.usedOn === 1 ? "" : "s"} since
            </div>
          </div>
          <button
            className="btn ghost sm"
            onClick={() => {
              actions.removeLesson(l.id);
              play("tap");
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
