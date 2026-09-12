// One edge function, four routes. /functions/v1/api/<route>
import { handle as flags } from "./flags.ts";
import { handle as report } from "./report.ts";
import { handle as scenario } from "./scenario.ts";
import { handle as health } from "./health.ts";
import { json, preflight, serve } from "../_shared/env.ts";

const ROUTES: Record<string, (req: Request) => Promise<Response>> = { flags, report, scenario, health };

export async function handle(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  const fn = ROUTES[route];
  if (!fn) return json(req, 404, { error: `no route ${route}` });
  return fn(req);
}

serve(handle);
