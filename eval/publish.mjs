import fs from "node:fs";

// Publication is an explicit operation, separate from running an experiment.
// This cannot authenticate a model response: never use --publish with mocks.
export function publishResults({ publish, blind, total, results, paths }) {
  if (!publish) return "Preview only; no artifacts changed. Use --publish only for a real full-model run.";
  if (blind) return "Blind speaker experiments cannot replace the standard published score.";
  if (!total || results.n !== total || results.cases.length !== total) return "Partial or empty run; no artifacts changed.";
  if (results.errors || results.cases.some((c) => !c.ok)) return "API errors in this run; no artifacts changed.";
  const text = JSON.stringify(results, null, 2) + "\n";
  for (const file of paths) fs.writeFileSync(file, text);
  return "Published full evaluation artifacts.";
}
