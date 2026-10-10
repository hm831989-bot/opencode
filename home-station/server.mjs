import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(here, "app");
const HOST = process.env.HOME_STATION_HOST || "127.0.0.1";
const PORT = Number(process.env.HOME_STATION_PORT || 8787);
const OPENCODE_URL = (process.env.OPENCODE_URL || "http://127.0.0.1:4096").replace(/\/+$/, "");
const TOKEN = process.env.HOME_STATION_TOKEN || "";
const remoteBind = !["127.0.0.1", "localhost", "::1"].includes(HOST);

if (remoteBind && !TOKEN) {
  console.error("Refusing non-loopback bind without HOME_STATION_TOKEN. Use loopback or set a long random token.");
  process.exit(1);
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function authorized(req) {
  if (!TOKEN) return !remoteBind;
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(body);
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const full = path.resolve(appDir, "." + requested);
  if (!full.startsWith(path.resolve(appDir) + path.sep) && full !== path.resolve(appDir, "index.html")) return null;
  return full;
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url || "/", "http://" + (req.headers.host || "localhost")); }
  catch { return send(res, 400, JSON.stringify({ error: "Bad URL" })); }

  if (url.pathname === "/api/health") {
    return send(res, 200, JSON.stringify({
      ok: true,
      service: "home-agent-station",
      opencodeUrl: OPENCODE_URL,
      protected: Boolean(TOKEN),
      remoteBind,
    }));
  }

  if (url.pathname.startsWith("/api/opencode/")) {
    if (!authorized(req)) return send(res, 401, JSON.stringify({ error: "Unauthorized. Enter the Home Station access token in the app." }));
    const targetPath = url.pathname.slice("/api/opencode".length) + url.search;
    let body;
    try {
      if (!["GET", "HEAD"].includes(req.method || "GET")) {
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 2 * 1024 * 1024) return send(res, 413, JSON.stringify({ error: "Request body too large" }));
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      const upstream = await fetch(OPENCODE_URL + targetPath, {
        method: req.method,
        headers: {
          ...(req.headers["content-type"] ? { "content-type": req.headers["content-type"] } : {}),
          ...(req.headers.accept ? { accept: req.headers.accept } : {}),
        },
        body: body?.length ? body : undefined,
        signal: AbortSignal.timeout(120_000),
      });
      res.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      if (!upstream.body) return res.end();
      for await (const chunk of upstream.body) res.write(chunk);
      return res.end();
    } catch (error) {
      return send(res, 502, JSON.stringify({ error: "Cannot reach OpenCode. Is the OpenCode server running?", detail: String(error?.message || error) }));
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, JSON.stringify({ error: "Method not allowed" }));
  let full;
  try { full = safeStaticPath(url.pathname); } catch { return send(res, 400, "Bad path", "text/plain; charset=utf-8"); }
  if (!full) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  try {
    const data = await fs.promises.readFile(full);
    res.writeHead(200, {
      "content-type": mime[path.extname(full)] || "application/octet-stream",
      "cache-control": full.endsWith("service-worker.js") ? "no-cache" : "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    });
    return res.end(data);
  } catch {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
});

server.listen(PORT, HOST, () => {
  console.log("Home Agent Station GUI: http://" + HOST + ":" + PORT);
  console.log("OpenCode API upstream: " + OPENCODE_URL);
  if (remoteBind) console.log("Remote bind enabled. Keep this behind a trusted private network/VPN and protect the token.");
});