// GET /api/health — is the server side alive and configured? Never returns a key.
import { getEnv, json, preflight } from "../_shared/env.ts";

export async function handle(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  return json(req, 200, {
    ok: true,
    gemini: Boolean(getEnv("GEMINI_API_KEY")),
    model: getEnv("GEMINI_MODEL") ?? "gemini-2.5-flash",
    time: new Date().toISOString(),
  });
}
