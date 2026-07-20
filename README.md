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
