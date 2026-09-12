import { useCallback, useEffect, useRef, useState } from "react";
import { About } from "./components/About";
import { CallScreen } from "./components/CallScreen";
import { Deadlines } from "./components/Deadlines";
import { Lessons } from "./components/Lessons";
import { Practice } from "./components/Practice";
import { ReportCard } from "./components/ReportCard";
import { TopBar, type View } from "./components/TopBar";
import { DEMO_CUSTOMER } from "./lib/demoScript";
import { preloadSfx } from "./lib/sfx";
import { apply as applyA11y, registerLiveRegions } from "./lib/a11y";
import { LiveRegions } from "./components/Accessibility";
import { startSync } from "./lib/sync";
import type { AssistantState, Customer, Mode, Report, Scenario, Session } from "./lib/types";

interface ActiveCall {
  key: number;
  mode: Mode;
  customer: Customer;
  scenario?: Scenario;
}

const LIVE_DEFAULT: Customer = { name: "Sarah M.", product: "home loan", direction: "outbound" };

export default function App() {
  const [view, setView] = useState<View>("live");
  const [call, setCall] = useState<ActiveCall>({ key: 1, mode: "live", customer: LIVE_DEFAULT });
  const [result, setResult] = useState<{ report: Report; session: Session } | null>(null);
  const [assistant, setAssistant] = useState<AssistantState>("idle");

  const polite = useRef<HTMLParagraphElement>(null);
  const urgent = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    preloadSfx();
    startSync();
    applyA11y();
    registerLiveRegions(polite.current, urgent.current);
  }, []);

  const startLive = useCallback(() => {
    setResult(null);
    setCall((c) => ({ key: c.key + 1, mode: "live", customer: LIVE_DEFAULT }));
    setView("live");
  }, []);
  const startDemo = useCallback(() => {
    setResult(null);
    setCall((c) => ({ key: c.key + 1, mode: "demo", customer: DEMO_CUSTOMER }));
    setView("live");
  }, []);
  const startPractice = useCallback((s: Scenario) => {
    setResult(null);
    setCall((c) => ({
      key: c.key + 1,
      mode: "practice",
      scenario: s,
      customer: { name: `${s.name}`, product: s.product, direction: "inbound" },
    }));
    setView("live");
  }, []);
  const onEnd = useCallback((report: Report, session: Session) => {
    setResult({ report, session });
    setAssistant("idle");
    window.scrollTo({ top: 0 });
  }, []);

  const onView = (v: View) => {
    setView(v);
    if (v === "live" && result) {
      // going back to Live after a report means a fresh call
      startLive();
    }
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the call
      </a>
      <LiveRegions politeRef={polite} urgentRef={urgent} />
      <TopBar view={view} onView={onView} assistant={assistant} />
      <div className="view" id="main" key={`${view}-${result ? result.report.callId : call.key}`}>
      {view === "live" &&
        (result ? (
          <ReportCard report={result.report} session={result.session} onNew={startLive} onPractice={startPractice} />
        ) : (
          <CallScreen
            key={call.key}
            mode={call.mode}
            customer={call.customer}
            scenario={call.scenario}
            onEnd={onEnd}
            onDemo={call.mode === "live" ? startDemo : undefined}
            onAssistant={setAssistant}
          />
        ))}
      {view === "practice" && <Practice onStart={startPractice} />}
      {view === "deadlines" && <Deadlines />}
      {view === "lessons" && <Lessons />}
      {view === "about" && <About />}
      </div>
    </>
  );
}
