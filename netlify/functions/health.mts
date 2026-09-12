// GET /api/health — is the server side alive and configured? Never returns a key.
import { json } from "../lib/gemini.mts";

export default async function handler(): Promise<Response> {
  return json(200, {
    ok: true,
    gemini: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    time: new Date().toISOString(),
  });
}
