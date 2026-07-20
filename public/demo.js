const screens = [...document.querySelectorAll(".screen")];
const order = ["welcome", "profile", "plan", "summary", "success"];
const labels = ["Bienvenue", "Profil", "Formule", "Récapitulatif", "Terminé"];
const data = { firstName: "", email: "", plan: "" };

function showScreen(name, activity) {
  const index = order.indexOf(name);
  screens.forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === name));
  document.querySelector("#stepLabel").textContent = labels[index];
  document.querySelector("#stepCounter").textContent = `Étape ${index + 1} sur ${order.length}`;
  document.querySelector("#progressBar").style.width = `${((index + 1) / order.length) * 100}%`;
  document.querySelector("#activityText").textContent = activity;
  document.body.dataset.currentScreen = name;
}

document.querySelector('[data-testid="start-journey"]').addEventListener("click", () => showScreen("profile", "Le bouton « Commencer » a été activé."));
document.querySelector("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  data.firstName = document.querySelector("#firstName").value;
  data.email = document.querySelector("#email").value;
  showScreen("plan", `Profil de ${data.firstName} enregistré.`);
});
document.querySelector("#planForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = document.querySelector('input[name="plan"]:checked');
  if (!selected) return;
  data.plan = selected.value;
  document.querySelector("#summaryName").textContent = data.firstName;
  document.querySelector("#summaryEmail").textContent = data.email;
  document.querySelector("#summaryPlan").textContent = data.plan;
  showScreen("summary", `Formule « ${data.plan} » sélectionnée.`);
});
document.querySelector('[data-testid="confirm-journey"]').addEventListener("click", () => {
  document.querySelector("#successIdentity").textContent = `Bienvenue, ${data.firstName} · ${data.plan}`;
  showScreen("success", "La configuration Nova a été confirmée avec succès.");
});
document.querySelector("#resetDemo").addEventListener("click", () => {
  document.querySelector("#profileForm").reset(); document.querySelector("#planForm").reset();
  Object.assign(data, { firstName: "", email: "", plan: "" });
  showScreen("welcome", "Le parcours a été réinitialisé.");
});
showScreen("welcome", "En attente du démarrage du parcours.");
