# PlaywrightAgent Generation Test Studio

Application web de test pour déclencher et inspecter les générations de l'application PlaywrightAgent.

## Démarrage

L'application principale doit fonctionner sur le port 3000.

```powershell
cd C:\Users\david\Documents\GitHub\PlaywrightAgentTest
npm run dev
```

Ouvrir ensuite `http://localhost:3200`.

Le bouton **Tester la génération** lance Chrome si nécessaire, puis déclenche la génération de la séquence sélectionnée. Les scripts et l'historique sont consultables dans l'interface.

## Application factice

- `http://localhost:3200/demo` contient le parcours Nova existant et un lien **Clients** qui ouvre un nouvel onglet.
- `http://localhost:3200/clients` affiche dix clients et l'intégralité de leurs données dans une table filtrable.
- Chaque action **Ouvrir** affiche la fiche du client dans un nouvel onglet.
- Le bouton **Ouvrir 3 fiches** crée trois onglets clients en une seule action pour tester la sélection et la réutilisation de plusieurs pages Playwright.
