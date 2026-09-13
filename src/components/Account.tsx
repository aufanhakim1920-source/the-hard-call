// The account chip in the top bar and the panel it opens.
// Guest first; an account is offered as the way to keep your work on other
// devices — never as a gate.

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useExit } from "../lib/motion";
import { play } from "../lib/sfx";
import { useStore } from "../lib/store";
import { counts, onSync, type SyncState } from "../lib/sync";

export function AccountChip() {
  const auth = useAuth();
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>("off");
  useEffect(() => onSync(setSync), []);
  // The panel opened with motion and closed by disappearing. `open` still
  // flips on the click — only the node stays behind long enough to leave.
  const panel = useExit(open);

  const label =
    auth.status === "loading"
      ? "…"
      : auth.status === "account"
        ? (auth.email ?? "account")
        : auth.status === "guest"
          ? "Guest"
          : "Saved here only";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || pw.length < 6) {
      setMsg("Email, and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const err = mode === "create" ? await auth.createAccount(email.trim(), pw) : await auth.signIn(email.trim(), pw);
    setBusy(false);
    if (err) {
      setMsg(err);
      return;
    }
    play("handled");
    setPw("");
    setMsg(mode === "create" ? "Check your email to confirm the address. Until then you are still a guest here." : null);
  };

  const have = counts(store);
  const dot = sync === "saving" ? "saving…" : sync === "saved" ? "saved" : sync === "error" ? "not saved" : "";

  return (
    <div className="acct">
      <button className={"btn ghost sm acct-chip" + (open ? " on" : "")} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <i className={"acct-dot " + auth.status} />
        <span className="acct-label">{label}</span>
        {dot && <span className="acct-sync">{dot}</span>}
      </button>
      {panel.mounted && (
        <div className={"acct-panel" + (panel.leaving ? " is-leaving" : "")} role="dialog" aria-label="Account" inert={panel.leaving}>
          {auth.status === "account" ? (
            <>
              <div className="label">Signed in</div>
              <div className="acct-email">{auth.email}</div>
              <p className="small muted">Your reports, deadlines, lessons and practice customers follow you to any device.</p>
              <button
                className="btn sm"
                onClick={() => {
                  void auth.signOut();
                  setOpen(false);
                  play("tap");
                }}
              >
                Sign out
              </button>
              <p className="small muted" style={{ marginTop: 8 }}>
                You come back as a guest with a fresh profile. Nothing on your account is deleted.
              </p>
            </>
          ) : (
            <>
              <div className="label">{auth.status === "guest" ? "Guest" : "Saved here only"}</div>
              <p className="small muted" style={{ margin: "4px 0 10px" }}>
                {auth.status === "guest"
                  ? "Your work is saved to the database under a guest profile. Add an email to keep it on other devices."
                  : auth.enabled
                    ? "Your work is saved in this browser and nowhere else. Create an account and it follows you to any device — and your teammates' reports stay separate from yours."
                    : "No database on this build; everything stays in this browser."}
                {have ? ` So far: ${have}.` : ""}
              </p>
              {auth.pendingEmail && <p className="small" style={{ color: "var(--gold-2)" }}>Confirmation sent to {auth.pendingEmail}. Open the link to finish.</p>}
              <div className="acct-tabs">
                <button className={"tab" + (mode === "create" ? " on" : "")} onClick={() => setMode("create")}>
                  Create account
                </button>
                <button className={"tab" + (mode === "signin" ? " on" : "")} onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </div>
              <form onSubmit={submit} className="acct-form">
                {/* Named, not just placeheld — a placeholder is gone the moment
                    anyone types, and these two are the only fields in the app
                    where getting the wrong box is a sign-in failure. */}
                <input
                  className="field"
                  type="email"
                  autoComplete="email"
                  aria-label="Work email"
                  placeholder="you@bank.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="field"
                  type="password"
                  autoComplete={mode === "create" ? "new-password" : "current-password"}
                  aria-label={mode === "create" ? "New password, at least 6 characters" : "Password"}
                  placeholder="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
                <button className="btn gold" type="submit" disabled={busy || !auth.enabled}>
                  {busy ? "…" : mode === "create" ? "Create account" : "Sign in"}
                </button>
              </form>
              {mode === "signin" && auth.status === "guest" && have && (
                <p className="small warn" style={{ marginTop: 8 }}>
                  Signing in to a different account leaves this guest's {have} behind.
                </p>
              )}
              {/* Mounted from the start rather than created already holding its
                  text — a status region that appears full is the one a screen
                  reader misses. Empty, a <p> makes no line box and costs no
                  height. */}
              <p className="small" role="status" style={{ marginTop: (msg ?? auth.error) ? 8 : 0 }}>
                {msg ?? auth.error}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
