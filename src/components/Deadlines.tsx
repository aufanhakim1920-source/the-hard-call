import { daysUntil, fmtDate, fmtDaysLeft } from "../lib/dates";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";

export function Deadlines() {
  const store = useStore();
  const rows = [...store.deadlines].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date));
  return (
    <div className="page narrow">
      <h1>Deadlines</h1>
      <p className="lede">Every legal sign starts a clock the bank is on. They land here with the date, so nothing goes unanswered.</p>
      {rows.length === 0 && (
        <div className="empty">
          <b>No clocks running.</b>
          Catch a hardship request or a complaint on a call and its reply date appears here.
        </div>
      )}
      {rows.map((d) => {
        const n = daysUntil(d.date);
        return (
          <div className={"deadline-row" + (d.done ? " done" : "")} key={d.id}>
            <span className="d">{fmtDate(d.date)}</span>
            <span className={"left" + (n < 0 ? " over" : n <= 7 ? " soon" : "")}>{d.done ? "done" : fmtDaysLeft(d.date)}</span>
            <span className="what">
              <b>
                {d.label}: {d.title}
              </b>
              <span>{d.customer}</span>
            </span>
            <button
              className="btn sm"
              onClick={() => {
                actions.toggleDeadline(d.id);
                play(d.done ? "tap" : "handled");
              }}
            >
              {d.done ? "Reopen" : "Mark replied"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
