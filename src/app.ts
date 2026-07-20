import express from "express";
import path from "node:path";

export const app = express();
const mainAppUrl = (process.env.MAIN_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const appPort = Number(process.env.PORT ?? 3200);
const demoUrl = `http://127.0.0.1:${appPort}/demo`;

app.use(express.json());
app.use(express.static(path.resolve("public")));
app.get("/demo", (_req, res) => res.sendFile(path.resolve("public", "demo.html")));

async function forward(response: express.Response, target: string, init?: RequestInit): Promise<void> {
  const upstream = await fetch(`${mainAppUrl}${target}`, init);
  const contentType = upstream.headers.get("content-type") ?? "";
  const body = upstream.status === 204 ? undefined : contentType.includes("application/json") ? await upstream.json() : await upstream.text();
  if (body === undefined) response.sendStatus(upstream.status); else response.status(upstream.status).send(body);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", mainAppUrl }));
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
app.get("/api/sequences/:name/status", async (req, res, next) => { try { await forward(res, `/api/sequences/${encodeURIComponent(req.params.name)}/status`); } catch (e) { next(e); } });
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
    const isOpen = browser.isOpen ?? Boolean(browser.wsEndpoint);
    if (!isOpen || !browser.wsEndpoint) return void res.status(409).json({ error: "Aucun Chrome Playwright ouvert. Utilisez d'abord « Ouvrir la démo ». L'exécution ne lance jamais un nouveau navigateur." });
    const wsEndpoint = browser.wsEndpoint;
    const executionResponse = await fetch(`${mainAppUrl}/api/sequences/${encodeURIComponent(req.params.name)}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const contentType = executionResponse.headers.get("content-type") ?? "";
    const executionBody = contentType.includes("application/json") ? await executionResponse.json() : await executionResponse.text();
    if (!executionResponse.ok) return void res.status(executionResponse.status).send(executionBody);
    res.status(executionResponse.status).json({ reusedBrowser: true, browserAction: "reused", wsEndpoint, execution: executionBody });
  } catch (error) { next(error); }
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(502).json({ error: `Application principale inaccessible : ${error.message}` });
});
