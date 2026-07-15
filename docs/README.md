# Documentation

Toute la documentation projet est centralisee dans ce dossier.

## Structure

- flows/ — **parcours de création Front/Back** (source de vérité intégration UI)
  - README.md — index + conventions
  - chaine-metier.md — enchaînement bout-en-bout
  - referentiels.md, produits.md, clients.md, fournisseurs.md, composants-bom.md
  - commandes-vente.md, ordres-production.md, commandes-achat.md
  - factures.md, livraisons.md, partage-catalogue.md
  - suivi-financier.md, utilisateurs.md
- architecture/
  - DASHBOARD_IMPLEMENTATION.md
  - GED_MINIO_STRUCTURE.md
- dashboard/
  - README.md
  - DASHBOARD_API.md
  - FRONTEND_INTEGRATION.md
  - CHECKLIST.md
- financial-tracking/
  - README.md
  - FINANCIAL_TRACKING_API.md
  - FRONTEND_INTEGRATION.md
- notifications/
  - README.md
  - USAGE.md
  - TESTING.md
  - CLIENT.example.md
  - INTEGRATION.guide.md
  - DATABASE.optional.md
  - NOTIFICATIONS_SUMMARY.md
  - NOTIFICATIONS_CHECKLIST.md

## Convention

- Garder la doc technique et les guides fonctionnels dans docs/
- Eviter de laisser des fichiers .md fonctionnels a la racine, sauf README.md
- Quand une fonctionnalite est ajoutee, documenter dans le sous-dossier correspondant
- Les flows de creation UI sont dans docs/flows/ (format PO + brief API pour alignement front)
