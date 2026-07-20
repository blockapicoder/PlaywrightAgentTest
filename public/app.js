const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const api = async (url, options = {}) => {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const type = response.headers.get("content-type") || "";
  const body = response.status === 204 ? null : type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(body?.error || body || response.statusText);
  return body;
};

const state = {
  current: "", sequences: [], artifacts: [], generations: [], prompts: [],
  selectedFile: "", fileContent: "", browserOpen: null,
  generation: { state: "idle", events: [] }, execution: { state: "idle", logs: [] }, connected: false, configValid: false, browserReuseNote: ""
};

function toast(message, type = "success") {
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.textContent = message;
  $("#toasts").append(element);
  setTimeout(() => element.remove(), 3400);
}

function fail(error) { console.error(error); toast(error.message || "Erreur", "error"); }

function activateTab(name) {
  $$('[data-tab]').forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== name));
}

function updateButtons() {
  const ready = state.connected && state.configValid && Boolean(state.current);
  const running = state.execution.state === "running" || state.generation.state === "running";
  $("#launchDemo").disabled = !ready || running;
  $("#runGeneration").disabled = !ready || running;
  $("#runExecution").disabled = !ready || running || !state.browserOpen;
}

async function checkMain() {
  try {
    const status = await api("/api/main/status");
    state.connected = Boolean(status.connected);
    state.configValid = Boolean(status.config?.isValid);
    const browserOpen = status.browser?.isOpen ?? Boolean(status.browser?.wsEndpoint);
    if (state.browserOpen === true && !browserOpen) toast("Chrome a été fermé", "warning");
    state.browserOpen = browserOpen;
    $("#connection").classList.toggle("online", state.connected);
    $("#connection span").textContent = state.connected ? "Application connectée" : "Application hors ligne";
    $("#mainUrl").textContent = status.mainAppUrl;
    $("#browserStatus").textContent = browserOpen ? "Ouvert" : "Fermé";
    $("#topBrowserText").textContent = browserOpen ? "Chrome ouvert : OUI" : "Chrome ouvert : NON";
    $("#topBrowserIndicator").classList.toggle("open", browserOpen);
    $("#topBrowserIndicator").classList.toggle("closed", !browserOpen);
    if (!browserOpen) state.browserReuseNote = "";
    $("#browserDetail").textContent = browserOpen ? state.browserReuseNote || "Session Playwright active · prête à être réutilisée" : "Aucun navigateur actif";
    $("#chromeCard").classList.toggle("online", browserOpen);
    $("#chromeCard").classList.toggle("offline", !browserOpen);
    $("#launchDemo").textContent = browserOpen ? "↻ Nouveau Chrome" : "◉ Ouvrir la démo";
    updateButtons();
    return state.connected && state.configValid;
  } catch {
    state.connected = false;
    state.browserOpen = false;
    state.browserReuseNote = "";
    $("#connection").classList.remove("online");
    $("#connection span").textContent = "Application hors ligne";
    $("#browserStatus").textContent = "Fermé";
    $("#topBrowserText").textContent = "Chrome ouvert : NON";
    $("#topBrowserIndicator").classList.remove("open");
    $("#topBrowserIndicator").classList.add("closed");
    $("#browserDetail").textContent = "Application principale indisponible";
    $("#chromeCard").classList.remove("online");
    $("#chromeCard").classList.add("offline");
    updateButtons();
    return false;
  }
}

async function loadSequences() {
  if (!await checkMain()) return;
  state.sequences = await api("/api/sequences");
  const root = $("#sequences");
  root.replaceChildren();
  state.sequences.forEach((name) => {
    const button = document.createElement("button");
    button.className = `sequence${name === state.current ? " active" : ""}`;
    button.textContent = name;
    button.onclick = () => selectSequence(name);
    root.append(button);
  });
}

async function selectSequence(name) {
  state.current = name;
  state.selectedFile = "";
  $("#title").textContent = name;
  $("#subtitle").textContent = "Suivez les clics, saisies et changements d’écran exécutés dans Chrome.";
  $("#empty").classList.add("hidden");
  $("#workspace").classList.remove("hidden");
  $$(".sequence").forEach((button) => button.classList.toggle("active", button.textContent === name));
  activateTab("execution");
  updateButtons();
  await refreshAll();
}

async function refreshAll() {
  if (!state.current) return;
  await loadPrompts();
  await Promise.all([loadArtifacts(), loadGenerations(), loadStatus(), loadExecution(), checkMain()]);
}

async function loadArtifacts() {
  state.artifacts = await api(`/api/sequences/${encodeURIComponent(state.current)}/artifacts`);
  $("#artifactCount").textContent = state.artifacts.length;
  const root = $("#artifactList");
  root.replaceChildren();
  if (!state.artifacts.length) { root.textContent = "Aucun fichier généré."; return; }
  state.artifacts.forEach((file) => {
    const button = document.createElement("button");
    button.className = `artifact${file.name === state.selectedFile ? " active" : ""}`;
    const icon = document.createElement("span");
    icon.textContent = file.name.endsWith(".ts") ? "TS" : file.name.endsWith(".json") ? "{}" : file.name.endsWith(".log") ? "LOG" : "¶";
    const info = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = file.name;
    const size = document.createElement("small"); size.textContent = `${file.size} octets · ${new Date(file.updatedAt).toLocaleString()}`;
    info.append(title, size); button.append(icon, info); button.onclick = () => openArtifact(file.name); root.append(button);
  });
}

async function openArtifact(file) {
  const data = await api(`/api/sequences/${encodeURIComponent(state.current)}/artifacts/${encodeURIComponent(file)}`);
  state.selectedFile = file; state.fileContent = data.content;
  $("#viewerName").textContent = file; $("#fileContent").textContent = data.content; $("#copyFile").disabled = false;
  await loadArtifacts();
}

async function loadGenerations() {
  state.generations = await api(`/api/sequences/${encodeURIComponent(state.current)}/generations`);
  const root = $("#generationList"); root.replaceChildren();
  if (!state.generations.length) { root.textContent = "Aucune génération enregistrée."; return; }
  state.generations.forEach((generation) => {
    const card = document.createElement("article"); card.className = "generation-card";
    const dot = document.createElement("i"); dot.className = `state-dot ${generation.status}`;
    const info = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = generation.status === "finished" ? "Génération terminée" : generation.status === "running" ? "Génération en cours" : "Génération en erreur";
    const detail = document.createElement("small"); detail.textContent = `Démarrée le ${new Date(generation.startedAt).toLocaleString()}${generation.currentStep !== undefined ? ` · étape ${generation.currentStep + 1}` : ""}`;
    info.append(title, detail); const id = document.createElement("code"); id.textContent = generation.id.slice(0, 8); card.append(dot, info, id); root.append(card);
  });
}

async function loadPrompts() {
  state.prompts = await api(`/api/sequences/${encodeURIComponent(state.current)}/prompts`);
  $("#promptCount").textContent = state.prompts.length;
  const root = $("#promptList"); root.replaceChildren();
  state.prompts.forEach((prompt) => { const item = document.createElement("li"); item.textContent = prompt; root.append(item); });
  renderExecutionSteps();
}

async function loadStatus() {
  const status = await api(`/api/sequences/${encodeURIComponent(state.current)}/status`);
  state.generation = status;
  const labels = { idle: "Prête", running: "En cours", finished: "Terminée", error: "Erreur" };
  $("#generationStatus").textContent = labels[status.state] || status.state;
  $("#generationStep").textContent = status.message || (status.state === "idle" ? "Aucune génération en cours" : "Suivi automatique actif");
  const completed = status.completedSteps ?? 0;
  const total = status.totalSteps ?? state.prompts.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  $("#generationLivePercent").textContent = `${percentage} %`;
  $("#generationLiveBar").style.width = `${percentage}%`;
  $("#generationLiveText").textContent = status.message || (status.state === "running" ? "Génération en cours" : status.state === "finished" ? "Génération terminée" : "En attente de la génération");
  $("#generationStateDot").className = status.state;

  const stepsRoot = $("#generationSteps"); stepsRoot.replaceChildren();
  state.prompts.forEach((prompt, index) => {
    const done = index < completed;
    const active = status.state === "running" && index === completed;
    const failed = status.state === "error" && index === completed;
    const stepState = done ? "done" : active ? "active" : failed ? "error" : "pending";
    const item = document.createElement("li"); item.className = `execution-step ${stepState}`;
    item.innerHTML = `<span class="step-index">${done ? "✓" : failed ? "!" : index + 1}</span><div><strong>etape${index}.ts</strong><p></p></div><span class="step-state">${done ? "TERMINÉE" : active ? "EN COURS" : failed ? "ERREUR" : "EN ATTENTE"}</span>`;
    item.querySelector("p").textContent = prompt;
    stepsRoot.append(item);
  });
  if (!state.prompts.length) stepsRoot.innerHTML = '<li class="empty-step">Aucune étape définie.</li>';

  const eventsRoot = $("#generationApiEvents"); eventsRoot.replaceChildren();
  const events = status.events || [];
  if (!events.length) eventsRoot.innerHTML = '<p class="empty-log">Les résultats de /api/step apparaîtront ici.</p>';
  else events.slice(-60).forEach((entry) => {
    const line = document.createElement("p"); line.className = "log-line info api-log-line";
    const time = document.createElement("time"); time.textContent = new Date(entry.at).toLocaleTimeString();
    const message = document.createElement("span");
    const method = document.createElement("code"); method.textContent = `POST ${entry.endpoint}`;
    const result = document.createElement("strong"); result.textContent = `${entry.httpStatus} OK`;
    const detail = document.createElement("em"); detail.textContent = entry.message;
    message.append(method, result, detail); line.append(time, message); eventsRoot.append(line);
  });
  eventsRoot.scrollTop = eventsRoot.scrollHeight;
  updateButtons();
}

function renderExecutionSteps() {
  const root = $("#executionSteps"); root.replaceChildren();
  if (!state.prompts.length) { root.innerHTML = '<li class="empty-step">Aucune étape définie.</li>'; return; }
  const current = state.execution.currentStep;
  state.prompts.forEach((prompt, index) => {
    const item = document.createElement("li");
    let stepState = "pending";
    if (state.execution.state === "finished" || (["running", "error"].includes(state.execution.state) && current !== undefined && index < current)) stepState = "done";
    else if (state.execution.state === "running" && index === current) stepState = "active";
    else if (state.execution.state === "error" && index === current) stepState = "error";
    item.className = `execution-step ${stepState}`;
    item.innerHTML = `<span class="step-index">${stepState === "done" ? "✓" : stepState === "error" ? "!" : index + 1}</span><div><strong>Étape ${index + 1}</strong><p></p></div><span class="step-state">${stepState === "active" ? "EN COURS" : stepState === "done" ? "TERMINÉE" : stepState === "error" ? "ERREUR" : "EN ATTENTE"}</span>`;
    item.querySelector("p").textContent = prompt;
    root.append(item);
  });
}

async function loadExecution() {
  state.execution = await api(`/api/sequences/${encodeURIComponent(state.current)}/execution`);
  const labels = { idle: "Prête", running: "En cours", finished: "Terminée", error: "Erreur" };
  $("#executionStatus").textContent = labels[state.execution.state] || state.execution.state;
  $("#executionStep").textContent = state.execution.currentStep !== undefined ? `Étape ${state.execution.currentStep + 1} sur ${state.prompts.length}` : state.execution.message || "Aucune exécution en cours";
  $("#executionText").textContent = state.execution.message || (state.execution.state === "running" ? "Exécution Playwright en cours" : state.execution.state === "finished" ? "Toutes les étapes sont terminées" : state.execution.state === "error" ? "L’exécution a échoué" : "En attente d’une exécution");
  $("#executionStateDot").className = state.execution.state;
  const executionTotal = state.prompts.length;
  const executionCompleted = state.execution.state === "finished" ? executionTotal : state.execution.currentStep ?? 0;
  const executionPercentage = executionTotal ? Math.round((executionCompleted / executionTotal) * 100) : 0;
  $("#executionPercent").textContent = `${executionPercentage} %`;
  $("#executionProgressBar").style.width = `${executionPercentage}%`;
  const root = $("#executionLog"); root.replaceChildren();
  if (!state.execution.logs?.length) root.innerHTML = '<p class="empty-log">Les événements de l’exécution apparaîtront ici.</p>';
  else state.execution.logs.slice(-60).forEach((entry) => {
    const line = document.createElement("p"); line.className = `log-line ${entry.stream}`;
    const time = document.createElement("time"); time.textContent = new Date(entry.at).toLocaleTimeString();
    const message = document.createElement("span"); message.textContent = entry.message;
    line.append(time, message); root.append(line);
  });
  root.scrollTop = root.scrollHeight;
  renderExecutionSteps(); updateButtons();
}

$("#launchDemo").onclick = async () => {
  const button = $("#launchDemo"); button.disabled = true; button.textContent = "Ouverture…";
  try { await api("/api/demo/launch", { method: "POST", body: "{}" }); toast("Chrome ouvert sur l’application de démonstration"); await checkMain(); }
  catch (error) { fail(error); } finally { updateButtons(); }
};

$("#runGeneration").onclick = async () => {
  const button = $("#runGeneration"); button.disabled = true; button.textContent = "Génération…"; activateTab("generation-live");
  try { await api(`/api/sequences/${encodeURIComponent(state.current)}/test-generation`, { method: "POST", body: "{}" }); toast("Génération démarrée — suivi des appels API actif"); await refreshAll(); }
  catch (error) { fail(error); } finally { button.textContent = "✦ Générer"; updateButtons(); }
};

$("#runExecution").onclick = async () => {
  const button = $("#runExecution"); button.disabled = true; button.textContent = "Démarrage…"; activateTab("execution");
  try {
    const result = await api(`/api/sequences/${encodeURIComponent(state.current)}/test-execution`, { method: "POST", body: "{}" });
    state.browserReuseNote = result.reusedBrowser ? "Même session Chrome réutilisée" : "Nouvelle session Chrome lancée";
    toast(result.reusedBrowser ? "Exécution démarrée dans le Chrome déjà ouvert" : "Chrome lancé puis exécution démarrée");
    await loadExecution(); await checkMain();
  }
  catch (error) { fail(error); } finally { button.textContent = "▶ Exécuter les étapes"; updateButtons(); }
};

$("#refreshSequences").onclick = () => loadSequences().catch(fail);
$("#refreshArtifacts").onclick = () => loadArtifacts().catch(fail);
$("#refreshGenerations").onclick = () => loadGenerations().catch(fail);
$("#clearConsole").onclick = () => { $("#executionLog").innerHTML = '<p class="empty-log">Affichage effacé. Les nouveaux événements apparaîtront ici.</p>'; };
$("#copyFile").onclick = async () => { await navigator.clipboard.writeText(state.fileContent); toast("Contenu copié"); };
$$('[data-tab]').forEach((button) => button.onclick = () => activateTab(button.dataset.tab));

loadSequences().catch(fail);
setInterval(() => state.current ? refreshAll().catch(() => {}) : checkMain().catch(() => {}), 1200);
