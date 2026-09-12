// Runs on Supabase Edge Functions (Deno) and, for the eval script, plain Node.
// Both expose the same tiny surface here so the engine code stays identical.

declare const Deno: { env: { get(k: string): string | undefined }; serve?: (h: (r: Request) => Promise<Response>) => void } | undefined;
declare const process: { env: Record<string, string | undefined> } | undefined;

export function getEnv(key: string): string | undefined {
  if (typeof Deno !== "undefined" && Deno?.env) return Deno.env.get(key);
  if (typeof process !== "undefined" && process?.env) return process.env[key];
  return undefined;
}

/** Register the handler with Deno.serve when running on the edge; a no-op in Node. */
export function serve(handler: (req: Request) => Promise<Response>): void {
  if (typeof Deno !== "undefined" && typeof Deno?.serve === "function") Deno.serve(handler);
}

// Browsers that may call these functions. GitHub Pages is production; the
// localhost ports are Vite's dev server.
const ALLOWED = [
  "https://aufanhakim1920-source.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const ok = ALLOWED.includes(origin) || /^https:\/\/[a-z0-9-]+\.github\.io$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin);
  return {
    "access-control-allow-origin": ok ? origin : ALLOWED[0],
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export function json(req: Request, status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(req) },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  return null;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("body must be JSON");
  }
}
