// GET /api/health — is the server side alive and configured? Never returns a key.
import { DEFAULT_MODELS, keyCount } from "../_shared/gemini.ts";
import { getEnv, json, preflight } from "../_shared/env.ts";

export async function handle(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  const keys = keyCount();
  return json(req, 200, {
    ok: true,
    gemini: keys > 0,
    // How many keys are armed, so we can see the spare is really there before
    // a demo. The keys themselves never leave the server.
    keys,
    // The model actually used, not a guess: a hardcoded string here would have
    // kept saying "gemini-2.5-flash" long after the default changed.
    model: getEnv("GEMINI_MODEL") ?? DEFAULT_MODELS[0],
    time: new Date().toISOString(),
  });
}
