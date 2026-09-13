import { useState } from "react";
import { fmtWhen } from "../lib/dates";
import { useFlip, useRowExit } from "../lib/motion";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import type { LessonKind } from "../lib/types";
import { Select } from "./Select";
import "./lessons.css";

const KIND_LABEL: Record<LessonKind, string> = {
  "not-a-sign": "Not a sign",
  "missed-sign": "Missed sign",
  wording: "Wording",
};

const KIND_OPTIONS = [
  { value: "missed-sign", label: "It should flag…" },
  { value: "not-a-sign", label: "It should not flag…" },
  { value: "wording", label: "Word it like…" },
];

export function Lessons() {
  const store = useStore();
  const [kind, setKind] = useState<LessonKind>("missed-sign");
  const [text, setText] = useState("");
  // Adding a lesson is the whole learning loop, and it used to pop a row into
  // existence. The new row rises in; a removed one leaves and the rest close
  // the gap behind it.
  const list = useFlip<HTMLDivElement>(store.lessons.map((l) => l.id).join());
  const exit = useRowExit();
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    actions.addLesson({ kind, text: text.trim() });
    setText("");
    play("handled");
  };
  return (
    <div className="page narrow" ref={list}>
      <h1>Lessons</h1>
      <p className="lede">
        What a manager has corrected. Every lesson is sent to the engine with every call from then on, so the team's judgement becomes the AI's.
      </p>
      <form className="form-row" onSubmit={add}>
        <Select value={kind} onChange={(v) => setKind(v as LessonKind)} options={KIND_OPTIONS} label="What kind of lesson" />
        {/* A placeholder is not a name: it is gone the moment anyone types, and
            the picker beside it already carries its name explicitly. */}
        <input
          className="field"
          aria-label="What the engine should learn"
          placeholder='e.g. "a customer asking to move the due date by a week is a hardship request"'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn gold" type="submit">
          Add lesson
        </button>
      </form>
      {store.lessons.length === 0 && (
        <div className="empty" data-flip="empty">
          <b>No lessons yet.</b>
          Correct a sign on any report card and it lands here.
        </div>
      )}
      {store.lessons.map((l) => (
        <div className={"lesson" + (exit.leaving === l.id ? " is-leaving-row" : "")} key={l.id} data-flip={l.id}>
          <span className="k">{KIND_LABEL[l.kind]}</span>
          <div>
            <div className="lt">{l.text}</div>
            {l.evidence && <div className="ev">“{l.evidence}”</div>}
            {/* The count leads. It is the only proof on this screen that a
                correction actually reaches the engine; it used to be the tail
                of a sentence that opened with the date it was typed. */}
            <div className="used">
              <b>
                used on {l.usedOn} call{l.usedOn === 1 ? "" : "s"}
              </b>{" "}
              · added {fmtWhen(l.t)}
            </div>
          </div>
          <button
            className="btn ghost sm"
            aria-label={`Remove lesson: ${l.text}`}
            onClick={() => {
              play("tap");
              exit.remove(l.id, () => actions.removeLesson(l.id));
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
