export type Client = {
  id: string;
  civilite: "Mme" | "M.";
  prenom: string;
  nom: string;
  dateNaissance: string;
  email: string;
  telephone: string;
  entreprise: string;
  poste: string;
  adresse: string;
  complement: string;
  codePostal: string;
  ville: string;
  pays: string;
  formule: "Solo" | "Équipe" | "Entreprise";
  statut: "Actif" | "À relancer" | "Suspendu";
  dateCreation: string;
  derniereActivite: string;
  commandes: number;
  chiffreAffaires: number;
  consentementMarketing: boolean;
  note: string;
};

export const clients: Client[] = [
  {
    id: "NV-1001", civilite: "Mme", prenom: "Sophie", nom: "Martin", dateNaissance: "1988-04-12",
    email: "sophie.martin@example.test", telephone: "+33 6 12 34 56 78", entreprise: "Atelier Horizon", poste: "Directrice produit",
    adresse: "18 rue des Lilas", complement: "Bâtiment B", codePostal: "69003", ville: "Lyon", pays: "France",
    formule: "Entreprise", statut: "Actif", dateCreation: "2024-01-18", derniereActivite: "2026-07-22 14:35",
    commandes: 18, chiffreAffaires: 18420.5, consentementMarketing: true, note: "Souhaite centraliser les campagnes européennes."
  },
  {
    id: "NV-1002", civilite: "M.", prenom: "Karim", nom: "Benali", dateNaissance: "1991-11-03",
    email: "karim.benali@example.test", telephone: "+33 7 44 21 09 63", entreprise: "Pixel Forge", poste: "Responsable technique",
    adresse: "42 avenue Jean-Jaurès", complement: "3e étage", codePostal: "75019", ville: "Paris", pays: "France",
    formule: "Équipe", statut: "Actif", dateCreation: "2024-03-02", derniereActivite: "2026-07-23 09:12",
    commandes: 11, chiffreAffaires: 6830, consentementMarketing: false, note: "Compte utilisé par l’équipe QA et automatisation."
  },
  {
    id: "NV-1003", civilite: "Mme", prenom: "Elena", nom: "Rossi", dateNaissance: "1985-06-27",
    email: "elena.rossi@example.test", telephone: "+39 347 112 9081", entreprise: "Studio Verde", poste: "Fondatrice",
    adresse: "Via Torino 28", complement: "Scala A", codePostal: "20123", ville: "Milan", pays: "Italie",
    formule: "Entreprise", statut: "À relancer", dateCreation: "2024-04-14", derniereActivite: "2026-07-14 17:48",
    commandes: 7, chiffreAffaires: 9250.75, consentementMarketing: true, note: "Renouvellement annuel à confirmer avant septembre."
  },
  {
    id: "NV-1004", civilite: "M.", prenom: "Thomas", nom: "Leroy", dateNaissance: "1979-02-16",
    email: "thomas.leroy@example.test", telephone: "+33 6 98 54 22 17", entreprise: "Boreal Conseil", poste: "Consultant senior",
    adresse: "7 place du Capitole", complement: "Bureau 204", codePostal: "31000", ville: "Toulouse", pays: "France",
    formule: "Solo", statut: "Actif", dateCreation: "2024-07-09", derniereActivite: "2026-07-20 11:07",
    commandes: 5, chiffreAffaires: 1290, consentementMarketing: true, note: "Préfère être contacté par e-mail le matin."
  },
  {
    id: "NV-1005", civilite: "Mme", prenom: "Amina", nom: "Diallo", dateNaissance: "1994-09-08",
    email: "amina.diallo@example.test", telephone: "+32 470 66 18 04", entreprise: "Nexa Mobility", poste: "Cheffe de projet",
    adresse: "96 rue de la Loi", complement: "Boîte 12", codePostal: "1040", ville: "Bruxelles", pays: "Belgique",
    formule: "Équipe", statut: "Actif", dateCreation: "2024-09-23", derniereActivite: "2026-07-24 08:41",
    commandes: 14, chiffreAffaires: 7440.2, consentementMarketing: true, note: "Pilote le déploiement sur trois agences."
  },
  {
    id: "NV-1006", civilite: "M.", prenom: "Lucas", nom: "Meyer", dateNaissance: "1982-12-21",
    email: "lucas.meyer@example.test", telephone: "+41 79 553 42 16", entreprise: "Alpine Data", poste: "Data manager",
    adresse: "12 quai du Mont-Blanc", complement: "", codePostal: "1201", ville: "Genève", pays: "Suisse",
    formule: "Entreprise", statut: "Suspendu", dateCreation: "2024-10-30", derniereActivite: "2026-06-28 15:22",
    commandes: 9, chiffreAffaires: 12100, consentementMarketing: false, note: "Compte suspendu à la demande du service conformité."
  },
  {
    id: "NV-1007", civilite: "Mme", prenom: "Inès", nom: "Garcia", dateNaissance: "1990-05-19",
    email: "ines.garcia@example.test", telephone: "+34 611 204 875", entreprise: "Casa Norte", poste: "Responsable marketing",
    adresse: "Calle de Atocha 74", complement: "2º izquierda", codePostal: "28012", ville: "Madrid", pays: "Espagne",
    formule: "Équipe", statut: "Actif", dateCreation: "2025-01-12", derniereActivite: "2026-07-21 16:02",
    commandes: 8, chiffreAffaires: 4625.9, consentementMarketing: true, note: "Intéressée par les rapports multilingues."
  },
  {
    id: "NV-1008", civilite: "M.", prenom: "Hugo", nom: "Bernard", dateNaissance: "1996-08-30",
    email: "hugo.bernard@example.test", telephone: "+33 7 15 63 40 28", entreprise: "Freelance", poste: "Designer UX",
    adresse: "5 rue Sainte-Catherine", complement: "Appartement 16", codePostal: "33000", ville: "Bordeaux", pays: "France",
    formule: "Solo", statut: "À relancer", dateCreation: "2025-02-20", derniereActivite: "2026-07-02 10:55",
    commandes: 3, chiffreAffaires: 540, consentementMarketing: false, note: "Essai terminé, attend une offre pour indépendants."
  },
  {
    id: "NV-1009", civilite: "Mme", prenom: "Nora", nom: "Schmidt", dateNaissance: "1987-03-14",
    email: "nora.schmidt@example.test", telephone: "+49 151 8842 1097", entreprise: "Rhein Labs", poste: "Operations lead",
    adresse: "Friedrichstraße 91", complement: "Haus 2", codePostal: "10117", ville: "Berlin", pays: "Allemagne",
    formule: "Entreprise", statut: "Actif", dateCreation: "2025-04-05", derniereActivite: "2026-07-23 18:29",
    commandes: 16, chiffreAffaires: 21780, consentementMarketing: true, note: "Demande une facturation consolidée par trimestre."
  },
  {
    id: "NV-1010", civilite: "M.", prenom: "Arthur", nom: "Petit", dateNaissance: "1993-10-11",
    email: "arthur.petit@example.test", telephone: "+33 6 73 25 81 44", entreprise: "Océan Retail", poste: "Responsable e-commerce",
    adresse: "24 boulevard de la Prairie", complement: "Zone Atlantis", codePostal: "44800", ville: "Saint-Herblain", pays: "France",
    formule: "Équipe", statut: "Actif", dateCreation: "2025-06-17", derniereActivite: "2026-07-24 07:58",
    commandes: 10, chiffreAffaires: 5980.45, consentementMarketing: true, note: "Utilise les webhooks pour le suivi des commandes."
  }
];
