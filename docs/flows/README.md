# Flows de création — guide Front

Documentation des parcours de création alignés sur le contrat NestJS.  
Objectif : même logique métier front / back (zéro dérive de types, d’ordres d’appels et d’enums).

## Convention de chaque fiche

1. **Analyse produit** — valeur métier  
2. **User stories** — format standard  
3. **Critères d’acceptation** — Gherkin  
4. **Flow API** — ordre des endpoints + diagramme  
5. **Types / enums** — source de vérité Prisma / DTO  
6. **Brief UI/UX** — écrans, états vides, erreurs  
7. **Brief API** — champs, garde-fous, prérequis  
8. **MVP vs Post-MVP**

Auth globale : `Authorization: Bearer <accessToken>` (`JwtAuthGuard`).  
Écritures (POST/PATCH/PUT/DELETE) : en plus `AdminGuard` (`role === GERANT` **ou** `isAdmin === true`).

## Index des flows

| Fichier | Domaine | Endpoint racine |
|---------|---------|-----------------|
| [referentiels.md](./referentiels.md) | Catégories, couleurs | `/categories`, `/colors` |
| [produits.md](./produits.md) | Produits, variantes, images, fiche technique | `/products` |
| [clients.md](./clients.md) | Clients, cartes fiscales, prix B2B | `/clients` |
| [fournisseurs.md](./fournisseurs.md) | Fournisseurs | `/suppliers` |
| [composants-bom.md](./composants-bom.md) | Composants & nomenclature | `/components`, `/bom-items` |
| [commandes-vente.md](./commandes-vente.md) | Commandes clients + BAT | `/sales-orders` |
| [ordres-production.md](./ordres-production.md) | Ordres de fabrication | `/production-orders` |
| [commandes-achat.md](./commandes-achat.md) | Achats fournisseurs | `/purchase-orders` |
| [factures.md](./factures.md) | Factures & documents | `/invoices` |
| [livraisons.md](./livraisons.md) | Livraisons | `/deliveries` |
| [partage-catalogue.md](./partage-catalogue.md) | Liens catalogue partagés | `/catalog-shares` |
| [suivi-financier.md](./suivi-financier.md) | Catégories ledger, écritures, budgets | `/financial-tracking` |
| [utilisateurs.md](./utilisateurs.md) | Utilisateurs internes | `/users` |
| [chaine-metier.md](./chaine-metier.md) | Enchaînement bout-en-bout | vue transverse |

## Chaîne métier résumé

```
Référentiels (catégorie, couleur, fournisseur, client)
  → Produit (+ variantes / BOM / images)
  → Commande de vente
  → Ordre de production
  → Livraison
  → Facture
  → Suivi financier (écriture / paiement)
```

Les achats et le stock composants alimentent la production ; le partage catalogue est indépendant (produits `COMPANY` uniquement).
