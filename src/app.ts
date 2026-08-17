import express from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { clients } from "./clients.js";

export const app = express();
const mainAppUrl = (process.env.MAIN_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const appPort = Number(process.env.PORT ?? 3200);
const demoUrl = `http://127.0.0.1:${appPort}/demo`;

type RoutingHit = {
  at: string;
  endpoint: "source" | "proxy" | "fetch" | "target";
  requestId: string;
  url: string;
};

type RoutingRule = {
  ifContains: string;
  replace: string;
  by: string;
  isActive: boolean;
};

const routingHits: RoutingHit[] = [];

function recordRoutingHit(endpoint: RoutingHit["endpoint"], request: express.Request): void {
  routingHits.push({
    at: new Date().toISOString(),
    endpoint,
    requestId: String(request.query.probe ?? ""),
    url: request.originalUrl,
  });
  if (routingHits.length > 100) routingHits.splice(0, routingHits.length - 100);
}

async function readResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) return undefined;
  return contentType.includes("application/json") ? response.json() : response.text();
}

app.use(express.json());
app.use(express.static(path.resolve("public")));
app.get("/demo", (_req, res) => res.sendFile(path.resolve("public", "demo.html")));
app.get(["/clients", "/clients/:clientId"], (_req, res) => res.sendFile(path.resolve("public", "clients.html")));
app.get("/api/demo/clients", (_req, res) => res.json(clients));
app.get("/api/demo/clients/:clientId", (req, res) => {
  const client = clients.find((item) => item.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client introuvable" });
  res.json(client);
});

app.get("/routing/source", (req, res) => {
  recordRoutingHit("source", req);
  res.json({ ok: false, endpoint: "source", message: "La requête n'a pas été routée vers le proxy." });
});

app.get("/routing/target", (req, res) => {
  recordRoutingHit("target", req);
  res.json({ ok: true, endpoint: "target", message: "Routage appliqué : la cible de test a répondu." });
});

app.get("/routing/proxy", async (req, res, next) => {
  try {
    recordRoutingHit("proxy", req);
    if (req.query.document === "1") {
      const probe = String(req.query.probe ?? "");
      const fetchUrl = `https://routing.playwright-agent.test/routing/fetch-proxy?probe=${encodeURIComponent(probe)}`;
      res.type("html").send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Test HTTPS vers HTTP</title></head>
<body><main><h1>Document HTTPS routé vers le proxy HTTP</h1><p id="fetch-status">Fetch en cours…</p></main>
<script>fetch(${JSON.stringify(fetchUrl)}).then((response) => response.json()).then((result) => {
  document.querySelector('#fetch-status').textContent = result.message;
}).catch((error) => { document.querySelector('#fetch-status').textContent = error.message; });</script></body></html>`);
      return;
    }
    const targetUrl = new URL("/routing/target", demoUrl);
    targetUrl.search = new URL(req.originalUrl, demoUrl).search;
    const upstream = await fetch(targetUrl);
    const body = await readResponse(upstream);
    res.set("X-Playwright-Agent-Proxy", "applied");
    res.status(upstream.status).json({
      ...(typeof body === "object" && body !== null ? body : { targetBody: body }),
      proxied: true,
      proxyEndpoint: "/routing/proxy",
    });
  } catch (error) { next(error); }
});

app.get("/routing/fetch-proxy", async (req, res, next) => {
  try {
    recordRoutingHit("fetch", req);
    const targetUrl = new URL("/routing/target", demoUrl);
    targetUrl.search = new URL(req.originalUrl, demoUrl).search;
    const upstream = await fetch(targetUrl);
    const body = await readResponse(upstream);
    res.set("X-Playwright-Agent-Proxy", "fetch-applied");
    res.status(upstream.status).json({
      ...(typeof body === "object" && body !== null ? body : { targetBody: body }),
      proxied: true,
      proxyEndpoint: "/routing/fetch-proxy",
      message: "Fetch HTTPS routé vers HTTP : la cible a répondu.",
    });
  } catch (error) { next(error); }
});

async function forward(response: express.Response, target: string, init?: RequestInit): Promise<void> {
  const upstream = await fetch(`${mainAppUrl}${target}`, init);
  const contentType = upstream.headers.get("content-type") ?? "";
  const body = upstream.status === 204 ? undefined : contentType.includes("application/json") ? await upstream.json() : await upstream.text();
  if (body === undefined) response.sendStatus(upstream.status); else response.status(upstream.status).send(body);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", mainAppUrl }));
app.get("/api/routing/status", (_req, res) => res.json({ hits: routingHits.slice(-20) }));
app.post("/api/routing/test", async (_req, res, next) => {
  const requestId = randomUUID();
  const virtualOrigin = "https://routing.playwright-agent.test";
  const sourceUrl = `${virtualOrigin}/routing/proxy?probe=${encodeURIComponent(requestId)}&document=1`;
  let savedRules: RoutingRule[] | undefined;
  try {
    const rulesResponse = await fetch(`${mainAppUrl}/api/rules`);
    if (!rulesResponse.ok) throw new Error(String(await readResponse(rulesResponse)));
    savedRules = await rulesResponse.json() as RoutingRule[];
    const probeRule: RoutingRule = {
      ifContains: `${virtualOrigin}/routing/`,
      replace: virtualOrigin,
      by: `http://127.0.0.1:${appPort}`,
      isActive: true,
    };
    const testRules = [probeRule, ...savedRules.filter((rule) => rule.ifContains !== probeRule.ifContains)];
    const updateResponse = await fetch(`${mainAppUrl}/api/rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testRules),
    });
    if (!updateResponse.ok) throw new Error(String(await readResponse(updateResponse)));

    const launchResponse = await fetch(`${mainAppUrl}/api/browser/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: sourceUrl }),
    });
    const launchBody = await readResponse(launchResponse);
    if (!launchResponse.ok) throw new Error(typeof launchBody === "string" ? launchBody : JSON.stringify(launchBody));

    let hits = routingHits.filter((hit) => hit.requestId === requestId);
    for (let attempt = 0; attempt < 40 && !hits.some((hit) => hit.endpoint === "target"); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      hits = routingHits.filter((hit) => hit.requestId === requestId);
    }
    const endpoints = new Set(hits.map((hit) => hit.endpoint));
    const ok = endpoints.has("proxy") && endpoints.has("fetch") && endpoints.has("target") && !endpoints.has("source");
    res.json({
      ok,
      message: ok
        ? "Routage validé : le document et son fetch HTTPS ont été servis par le proxy HTTP."
        : "Échec du routage HTTPS → HTTP : le passage du document et du fetch par le proxy n'a pas été observé.",
      requestId,
      sourceUrl,
      expectedPath: ["HTTPS virtuelle (interceptée)", "proxy HTTP", "fetch HTTPS intercepté", "cible HTTP"],
      hits,
      browser: launchBody,
    });
  } catch (error) { next(error); }
  finally {
    if (savedRules) {
      await fetch(`${mainAppUrl}/api/rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedRules),
      }).catch(() => undefined);
    }
  }
});
app.get("/api/main/status", async (_req, res, next) => {
  try {
    const [health, config, browser] = await Promise.all([
      fetch(`${mainAppUrl}/health`), fetch(`${mainAppUrl}/api/config/status`), fetch(`${mainAppUrl}/api/browser`)
    ]);
    res.json({ connected: health.ok, config: await config.json(), browser: await browser.json(), mainAppUrl });
  } catch (error) { next(error); }
});
app.get("/api/sequences", async (_req, res, next) => { try { await forward(res, "/api/sequences"); } catch (e) { next(e); } });
app.get("/api/sequences/:name/prompts", async (req, res, next) => { try { await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/prompts`); } catch (e) { next(e); } });
app.get("/api/sequences/:name/status", async (req, res, next) => { try { res.set("Cache-Control", "no-store"); await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/status`); } catch (e) { next(e); } });
app.get("/api/sequences/:name/execution", async (req, res, next) => { try { await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/execution`); } catch (e) { next(e); } });
app.get("/api/sequences/:name/generations", async (req, res, next) => { try { await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/generations`); } catch (e) { next(e); } });
app.get("/api/sequences/:name/artifacts", async (req, res, next) => { try { await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/artifacts`); } catch (e) { next(e); } });
app.get("/api/sequences/:name/artifacts/:file", async (req, res, next) => { try { await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/artifacts/${encodeURIComponent(req.params.file)}`); } catch (e) { next(e); } });
app.post("/api/sequences/:name/test-generation", async (req, res, next) => {
  try {
    const browserResponse = await fetch(`${mainAppUrl}/api/browser`); const browser = await browserResponse.json() as { isOpen?: boolean; wsEndpoint?: string };
    if (!(browser.isOpen ?? Boolean(browser.wsEndpoint))) {
      const launch = await fetch(`${mainAppUrl}/api/browser/launch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: demoUrl }) });
      if (!launch.ok) return void res.status(launch.status).send(await launch.text());
    }
    await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  } catch (error) { next(error); }
});
app.post("/api/sequences/:name/test-generation/stop", async (req, res, next) => {
  try { await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/generate/stop`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch (error) { next(error); }
});
app.post("/api/demo/launch", async (_req, res, next) => {
  try { await forward(res, "/api/browser/launch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: demoUrl }) }); } catch (error) { next(error); }
});
app.post("/api/demo/close", async (_req, res, next) => {
  try { await forward(res, "/api/browser/close", { method: "POST" }); } catch (error) { next(error); }
});
app.post("/api/sequences/:name/test-execution", async (req, res, next) => {
  try {
    const browserResponse = await fetch(`${mainAppUrl}/api/browser`);
    if (!browserResponse.ok) return void res.status(browserResponse.status).send(await browserResponse.text());
    const browser = await browserResponse.json() as { isOpen?: boolean; wsEndpoint?: string };
    const wasOpen = browser.isOpen ?? Boolean(browser.wsEndpoint);
    const argumentsResponse = await fetch(`${mainAppUrl}/api/sequences/${encodeURIComponent(req.params.name)}/execution-arguments`);
    if (!argumentsResponse.ok) return void res.status(argumentsResponse.status).send(await argumentsResponse.text());
    const argumentState = await argumentsResponse.json() as { initial?: Record<string, unknown> };
    const executionResponse = await fetch(`${mainAppUrl}/api/sequences/${encodeURIComponent(req.params.name)}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arguments: req.body?.arguments ?? argumentState.initial ?? {}, startUrl: demoUrl }),
    });
    const contentType = executionResponse.headers.get("content-type") ?? "";
    const executionBody = contentType.includes("application/json") ? await executionResponse.json() : await executionResponse.text();
    if (!executionResponse.ok) return void res.status(executionResponse.status).send(executionBody);
    const result = executionBody as { reusedBrowser?: boolean; browserAction?: string; wsEndpoint?: string };
    res.status(executionResponse.status).json({ reusedBrowser: result.reusedBrowser ?? wasOpen, browserAction: result.browserAction ?? (wasOpen ? "reused" : "launched"), wsEndpoint: result.wsEndpoint, execution: executionBody });
  } catch (error) { next(error); }
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(502).json({ error: `Application principale inaccessible : ${error.message}` });
});
