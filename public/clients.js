const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const listView = document.querySelector("#listView");
const detailView = document.querySelector("#detailView");
let clients = [];

function textCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value === "" ? "—" : String(value);
  return cell;
}

function statusBadge(value) {
  const badge = document.createElement("span");
  badge.className = `status status-${value.toLowerCase().replaceAll(" ", "-").replace("à", "a")}`;
  badge.textContent = value;
  return badge;
}

function renderRows() {
  const query = document.querySelector("#clientSearch").value.trim().toLocaleLowerCase("fr");
  const selectedStatus = document.querySelector("#statusFilter").value;
  const filtered = clients.filter((client) => {
    const matchesQuery = !query || Object.values(client).some((value) => String(value).toLocaleLowerCase("fr").includes(query));
    return matchesQuery && (!selectedStatus || client.statut === selectedStatus);
  });
  const body = document.querySelector("#clientRows");
  body.replaceChildren();
  for (const client of filtered) {
    const row = document.createElement("tr");
    row.dataset.clientId = client.id;
    [client.id, client.civilite, client.prenom, client.nom, date.format(new Date(`${client.dateNaissance}T12:00:00`)), client.email,
      client.telephone, client.entreprise, client.poste, client.adresse, client.complement, client.codePostal, client.ville,
      client.pays, client.formule].forEach((value) => row.append(textCell(value)));
    const statusCell = document.createElement("td"); statusCell.append(statusBadge(client.statut)); row.append(statusCell);
    [date.format(new Date(`${client.dateCreation}T12:00:00`)), client.derniereActivite, client.commandes, currency.format(client.chiffreAffaires),
      client.consentementMarketing ? "Oui" : "Non", client.note].forEach((value) => row.append(textCell(value)));
    const actionCell = document.createElement("td");
    const link = document.createElement("a");
    link.className = "open-client"; link.href = `/clients/${client.id}`; link.target = "_blank"; link.rel = "noopener";
    link.dataset.testid = `open-client-${client.id}`; link.textContent = "Ouvrir ↗";
    actionCell.append(link); row.append(actionCell); body.append(row);
  }
  document.querySelector("#visibleCount").textContent = `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`;
  document.querySelector("#emptyClients").classList.toggle("hidden", filtered.length > 0);
}

function renderList() {
  document.querySelector("#clientCount").textContent = clients.length;
  document.querySelector("#activeCount").textContent = clients.filter((client) => client.statut === "Actif").length;
  document.querySelector("#revenueTotal").textContent = currency.format(clients.reduce((sum, client) => sum + client.chiffreAffaires, 0));
  document.querySelector("#orderTotal").textContent = clients.reduce((sum, client) => sum + client.commandes, 0);
  document.querySelector("#clientSearch").addEventListener("input", renderRows);
  document.querySelector("#statusFilter").addEventListener("change", renderRows);
  document.querySelector("#openSampleTabs").addEventListener("click", () => {
    const selected = clients.slice(0, 3);
    let opened = 0;
    for (const client of selected) {
      const newTab = window.open(`/clients/${client.id}`, "_blank");
      if (newTab) { newTab.opener = null; opened += 1; }
    }
    document.querySelector("#tabActivity").innerHTML = `<span>ONGLETS</span><strong>${opened} fiche${opened > 1 ? "s" : ""} client ouverte${opened > 1 ? "s" : ""} dans de nouveaux onglets.</strong>`;
    document.body.dataset.openedClientTabs = String(opened);
  });
  renderRows();
}

function renderDetail(client) {
  document.title = `${client.prenom} ${client.nom} — Client Nova`;
  document.querySelector("#clientInitials").textContent = `${client.prenom[0]}${client.nom[0]}`;
  document.querySelector("#clientId").textContent = client.id;
  document.querySelector("#clientName").textContent = `${client.civilite} ${client.prenom} ${client.nom}`;
  document.querySelector("#clientCompany").textContent = `${client.poste} · ${client.entreprise}`;
  const status = document.querySelector("#clientStatus"); status.className = statusBadge(client.statut).className; status.textContent = client.statut;
  const currentIndex = clients.findIndex((item) => item.id === client.id);
  const nextClient = clients[(currentIndex + 1) % clients.length];
  document.querySelector("#openNextClient").href = `/clients/${nextClient.id}`;
  const fields = [
    ["Identifiant", client.id], ["Civilité", client.civilite], ["Prénom", client.prenom], ["Nom", client.nom],
    ["Date de naissance", date.format(new Date(`${client.dateNaissance}T12:00:00`))], ["E-mail", client.email], ["Téléphone", client.telephone],
    ["Entreprise", client.entreprise], ["Poste", client.poste], ["Adresse", client.adresse], ["Complément", client.complement || "—"],
    ["Code postal", client.codePostal], ["Ville", client.ville], ["Pays", client.pays], ["Formule", client.formule], ["Statut", client.statut],
    ["Date de création", date.format(new Date(`${client.dateCreation}T12:00:00`))], ["Dernière activité", client.derniereActivite],
    ["Commandes", client.commandes], ["Chiffre d’affaires", currency.format(client.chiffreAffaires)],
    ["Consentement marketing", client.consentementMarketing ? "Oui" : "Non"], ["Note", client.note]
  ];
  const root = document.querySelector("#clientDetails");
  for (const [label, value] of fields) {
    const item = document.createElement("div"); const term = document.createElement("dt"); const detail = document.createElement("dd");
    term.textContent = label; detail.textContent = String(value); item.append(term, detail); root.append(item);
  }
}

async function start() {
  const response = await fetch("/api/demo/clients");
  if (!response.ok) throw new Error("Impossible de charger les clients.");
  clients = await response.json();
  const clientId = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] || "");
  if (!clientId) { renderList(); return; }
  const client = clients.find((item) => item.id === clientId);
  listView.classList.add("hidden"); detailView.classList.remove("hidden");
  if (client) renderDetail(client);
  else detailView.innerHTML = '<div class="empty-detail"><h1>Client introuvable</h1><a href="/clients">Retour à la table</a></div>';
}

start().catch((error) => {
  document.body.innerHTML = `<main class="load-error"><h1>Erreur de chargement</h1><p>${error.message}</p></main>`;
});
