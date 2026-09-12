// Runs the edge function locally on plain Node — no Supabase token, no Docker.
//   node --env-file=.env dev/api-server.mjs      (then VITE_API_BASE=http://localhost:8787/api)
// Node 24 strips the TypeScript types on import; the Deno-only bits are no-ops in Node.

import http from "node:http";
import { handle } from "../supabase/functions/api/index.ts";

const port = Number(process.env.API_PORT ?? 8787);

http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const url = `http://localhost:${port}${req.url}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    });
    try {
      const out = await handle(request);
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(Buffer.from(await out.arrayBuffer()));
    } catch (e) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e?.message ?? e) }));
    }
  })
  .listen(port, () => console.log(`api on http://localhost:${port}/api  (gemini key ${process.env.GEMINI_API_KEY ? "set" : "MISSING"})`));
