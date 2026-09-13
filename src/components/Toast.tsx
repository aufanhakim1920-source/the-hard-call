// A toast that leaves.
//
// `{toast && <div className="toast">…</div>}` takes the node away on the frame
// the state clears, so the message animated in and then blinked out of
// existence. This holds the last words on screen while the exit plays. The
// state is never delayed — only the node waits.
//
// Drop-in: replace `{toast && <div className="toast">{toast}</div>}` with
// `<Toast text={toast} />`.

import { useState } from "react";
import { useExit } from "../lib/motion";

export function Toast({ text }: { text: string | null }) {
  // Remember the words for the leaving frames. Adjusted during render rather
  // than in an effect, so there is never a frame showing the wrong message.
  const [seen, setSeen] = useState(text);
  const [words, setWords] = useState(text ?? "");
  if (text !== seen) {
    setSeen(text);
    if (text) setWords(text);
  }

  const { mounted, leaving } = useExit(text !== null);
  if (!mounted) return null;
  return <div className={"toast" + (leaving ? " is-leaving" : "")}>{text ?? words}</div>;
}
