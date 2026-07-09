# Suivi financier

Ce dossier documente le module backend de suivi financier expose par l API NestJS.

## Objectif

Le module couvre quatre besoins metier relies entre eux:

- tresorerie suivie a partir des encaissements et decaissements reels
- corrélation client, facture, paiement et marge estimée
- suivi budgetaire avec ecart prevision vs reel
- paiements fournisseurs relies aux bons de commande

## Fichiers

- FINANCIAL_TRACKING_API.md
  Contrats REST, filtres et exemples de payloads.
- FRONTEND_INTEGRATION.md
  Guide d integration frontend: ecrans, query keys, mapping UI et enchainements UX.

## Endpoints principaux

- GET /financial-tracking/overview
- GET /financial-tracking/categories
- POST /financial-tracking/categories
- GET /financial-tracking/budgets
- POST /financial-tracking/budgets
- GET /financial-tracking/ledger-entries
- POST /financial-tracking/ledger-entries
- GET /financial-tracking/clients/:clientId
- POST /purchase-orders/:id/record-payment

## Notes metier

- Un paiement client enregistre sur une facture cree automatiquement une ecriture de tresorerie INCOME categorisee CLIENT_COLLECTION.
- Un paiement fournisseur enregistre sur un bon de commande cree automatiquement une ecriture de tresorerie EXPENSE categorisee SUPPLIER_PAYMENT.
- Les budgets comparent le reel a partir des ecritures du journal financier, pas a partir des seuls engagements.
