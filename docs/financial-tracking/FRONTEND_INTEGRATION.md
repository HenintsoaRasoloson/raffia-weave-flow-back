# Frontend Integration - Suivi financier

## Vue d ensemble

Le frontend peut traiter le module comme un espace dedie avec cinq surfaces UI:

- page overview financier
- page journal de tresorerie
- page budgets et ecarts
- onglet finance sur fiche client
- modal de paiement fournisseur sur fiche achat

## Query keys conseillees

```ts
['financial-tracking', 'overview', filters][
  ('financial-tracking', 'categories')
][('financial-tracking', 'budgets', filters)][
  ('financial-tracking', 'ledger-entries', filters)
][('financial-tracking', 'client', clientId, filters)][
  ('purchase-order', purchaseOrderId)
];
```

## Ecran 1 - Overview financier

### Endpoint

- GET /financial-tracking/overview

### Widgets recommends

- cartes KPI: trackedBalance, periodInflows, periodOutflows, projectedBalance
- bloc CA: invoicedTtc, collectedAmount, outstandingAmount, overdueAmount
- bloc marge: estimatedMarginAmount, estimatedMarginRate
- bloc budgets: totalBudgetedExpenses vs totalActualExpenses
- tableau alertes: alerts
- donut ou histogramme: categoryBreakdown

### Filtrage minimal

- periode
- horizonDays
- client optionnel si vue centree sur un compte client

## Ecran 2 - Journal de tresorerie

### Endpoints

- GET /financial-tracking/ledger-entries
- POST /financial-tracking/ledger-entries
- GET /financial-tracking/categories

### UX conseillee

- tableau avec date, label, type, categorie, montant, liens vers client/fournisseur/document
- filtres: type, categorie, client, fournisseur, periode, recherche texte
- bouton Ajouter une ecriture ouvrant un drawer ou une modal

### Formulaire creation

- entryDate
- label
- entryType
- amount
- currency
- ledgerCategoryId
- notes
- liens optionnels: clientId, supplierId, invoiceId, purchaseOrderId, salesOrderId

## Ecran 3 - Budgets et ecarts

### Endpoints

- GET /financial-tracking/budgets
- POST /financial-tracking/budgets
- GET /financial-tracking/categories

### UX conseillee

- tableau budgets avec colonnes: label, categorie, periode, budget, reel, ecart, taux ecart
- badges couleur:
  - rouge si variance > 0 pour un budget de depense
  - vert si variance <= 0 pour un budget de depense
  - vert si variance >= 0 pour un budget de revenu
- filtres par categorie, client, fournisseur, periode

### Point important

Le backend renvoie deja actualAmount et variance. Le frontend n a pas a recalculer ces valeurs.

## Ecran 4 - Onglet finance sur fiche client

### Endpoint

- GET /financial-tracking/clients/:clientId

### Contenu recommande

- resume: invoicedTtc, collectedAmount, outstandingAmount, overdueAmount
- liste recentInvoices
- liste recentPayments
- mini journal financier client a partir de ledgerEntries
- badge risque si overdueInvoicesCount > 0

### Navigation transverse

- clic facture vers detail facture
- clic ecriture vers journal financier filtre sur cette ecriture ou ce client

## Ecran 5 - Paiement fournisseur

### Endpoint

- POST /purchase-orders/:id/record-payment

### Placement UX conseille

- bouton Enregistrer un paiement sur la fiche achat
- visible meme si le bon est deja recu, tant qu il reste un montant a regler

### Formulaire minimal

```json
{
  "amount": 2500,
  "paymentMethod": "BANK_TRANSFER",
  "paidAt": "2026-07-10T10:00:00.000Z",
  "notes": "Virement SG 2026-07-10"
}
```

### Effet frontend attendu

- invalider ['purchase-order', purchaseOrderId]
- invalider ['financial-tracking', 'overview', ...]
- invalider ['financial-tracking', 'ledger-entries', ...]
- afficher un toast confirmant le decaissement enregistre

## Exemple d API client TypeScript

```ts
const API_URL = import.meta.env.VITE_API_URL;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const financialTrackingApi = {
  getOverview: (params: URLSearchParams) =>
    api(`/financial-tracking/overview?${params.toString()}`),
  getCategories: () => api('/financial-tracking/categories'),
  getBudgets: (params: URLSearchParams) =>
    api(`/financial-tracking/budgets?${params.toString()}`),
  createBudget: (body: unknown) =>
    api('/financial-tracking/budgets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getLedgerEntries: (params: URLSearchParams) =>
    api(`/financial-tracking/ledger-entries?${params.toString()}`),
  createLedgerEntry: (body: unknown) =>
    api('/financial-tracking/ledger-entries', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getClientSummary: (clientId: string, params: URLSearchParams) =>
    api(`/financial-tracking/clients/${clientId}?${params.toString()}`),
  recordPurchasePayment: (purchaseOrderId: string, body: unknown) =>
    api(`/purchase-orders/${purchaseOrderId}/record-payment`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
```

## Invalidations TanStack Query conseillees

```ts
await mutation.mutateAsync(payload);

queryClient.invalidateQueries({ queryKey: ['financial-tracking'] });
queryClient.invalidateQueries({
  queryKey: ['purchase-order', purchaseOrderId],
});
queryClient.invalidateQueries({ queryKey: ['client', clientId] });
```

## Ordre d integration recommande

1. brancher GET /financial-tracking/categories
2. brancher GET /financial-tracking/overview
3. brancher GET et POST /financial-tracking/ledger-entries
4. brancher GET et POST /financial-tracking/budgets
5. brancher GET /financial-tracking/clients/:clientId
6. brancher POST /purchase-orders/:id/record-payment
