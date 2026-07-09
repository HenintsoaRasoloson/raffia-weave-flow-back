# Financial Tracking API

## Vue d ensemble

Le module de suivi financier centralise:

- tresorerie suivie
- encaissements clients
- decaissements fournisseurs
- budgets et ecarts
- synthese financiere par client

Tous les endpoints ci-dessous sont proteges par JWT. Les operations de creation utilisent en plus le role admin.

## 1. GET /financial-tracking/overview

Retourne la vue consolidee pour un dashboard financier.

### Query params

- dateFrom: ISO datetime optionnel. Par defaut, maintenant - 30 jours.
- dateTo: ISO datetime optionnel. Par defaut, maintenant.
- clientId: optionnel pour une vue filtree par client.
- horizonDays: projection de tension de tresorerie. Defaut 30.

### Reponse type

```json
{
  "period": {
    "from": "2026-06-09T00:00:00.000Z",
    "to": "2026-07-09T23:59:59.999Z",
    "horizonDays": 30,
    "clientId": null
  },
  "treasury": {
    "trackedBalance": 14850,
    "periodInflows": 9200,
    "periodOutflows": 4800,
    "upcomingReceivables": 5200,
    "purchaseCommitments": 3100,
    "projectedBalance": 16950
  },
  "revenue": {
    "invoicedHt": 12000,
    "invoicedTtc": 14400,
    "collectedAmount": 9200,
    "outstandingAmount": 5200,
    "overdueAmount": 1800,
    "overdueInvoicesCount": 2
  },
  "costs": {
    "operatingExpenses": 4800,
    "purchaseCommitments": 3100,
    "estimatedProductionCost": 4100
  },
  "budgets": {
    "totalBudgetedExpenses": 7000,
    "totalActualExpenses": 4800,
    "totalBudgetedIncome": 15000,
    "totalActualIncome": 9200,
    "items": [
      {
        "id": "cly...",
        "label": "Budget logistique juillet",
        "direction": "EXPENSE",
        "budgetAmount": 2500,
        "actualAmount": 1800,
        "variance": -700,
        "varianceRate": -28,
        "ledgerCategory": {
          "id": "cly...",
          "code": "LOGISTICS",
          "name": "Logistique"
        },
        "periodStart": "2026-07-01T00:00:00.000Z",
        "periodEnd": "2026-07-31T23:59:59.999Z"
      }
    ]
  },
  "margins": {
    "estimatedRevenueHt": 12000,
    "estimatedMarginAmount": 7900,
    "estimatedMarginRate": 65.83
  },
  "categoryBreakdown": [
    {
      "id": "cly...",
      "code": "CLIENT_COLLECTION",
      "name": "Encaissement client",
      "entryType": "INCOME",
      "amount": 9200
    }
  ],
  "overdueInvoices": [],
  "upcomingPurchaseOrders": [],
  "alerts": []
}
```

## 2. GET /financial-tracking/categories

Retourne les categories structurees de suivi financier.

### Reponse type

```json
[
  {
    "id": "cly...",
    "code": "CLIENT_COLLECTION",
    "name": "Encaissement client",
    "entryType": "INCOME",
    "description": "Encaissements reels des factures clients",
    "isSystem": true,
    "active": true
  },
  {
    "id": "cly...",
    "code": "PAYROLL",
    "name": "Salaires",
    "entryType": "EXPENSE",
    "description": "Salaires, primes et charges de personnel",
    "isSystem": true,
    "active": true
  }
]
```

## 3. POST /financial-tracking/categories

Permet d ajouter une categorie custom pour le journal financier et les budgets.

### Body

```json
{
  "code": "MARKETING",
  "name": "Marketing",
  "entryType": "EXPENSE",
  "description": "Campagnes, shootings, influence",
  "active": true
}
```

## 4. GET /financial-tracking/budgets

Liste les budgets et retourne directement le reel compare pour chaque budget.

### Query params

- dateFrom, dateTo: filtre de chevauchement de periode
- ledgerCategoryId: filtre categorie
- clientId: filtre client
- supplierId: filtre fournisseur

### Reponse type

```json
{
  "items": [
    {
      "id": "cly...",
      "label": "Budget logistique juillet",
      "direction": "EXPENSE",
      "amount": 2500,
      "currency": "EUR",
      "periodStart": "2026-07-01T00:00:00.000Z",
      "periodEnd": "2026-07-31T23:59:59.999Z",
      "ledgerCategoryId": "cly...",
      "ledgerCategory": {
        "id": "cly...",
        "code": "LOGISTICS",
        "name": "Logistique",
        "entryType": "EXPENSE"
      },
      "actualAmount": 1800,
      "variance": -700,
      "varianceRate": -28
    }
  ],
  "totalBudgeted": 2500,
  "totalActual": 1800,
  "totalVariance": -700
}
```

## 5. POST /financial-tracking/budgets

### Body

```json
{
  "label": "Budget salaires juillet",
  "direction": "EXPENSE",
  "amount": 6000,
  "currency": "EUR",
  "periodStart": "2026-07-01T00:00:00.000Z",
  "periodEnd": "2026-07-31T23:59:59.999Z",
  "ledgerCategoryId": "category-payroll-id",
  "notes": "Atelier + administratif"
}
```

## 6. GET /financial-tracking/ledger-entries

Journal de tresorerie pagine.

### Query params

- page, pageSize
- q: recherche texte sur label et note
- type: INCOME | EXPENSE | TRANSFER
- clientId
- supplierId
- ledgerCategoryId
- dateFrom, dateTo

### Reponse type

```json
{
  "items": [
    {
      "id": "cly...",
      "entryDate": "2026-07-09T08:30:00.000Z",
      "label": "Paiement fournisseur ACH/000221",
      "entryType": "EXPENSE",
      "amount": 2500,
      "currency": "EUR",
      "ledgerCategory": {
        "id": "cly...",
        "code": "SUPPLIER_PAYMENT",
        "name": "Paiement fournisseur",
        "entryType": "EXPENSE"
      },
      "supplier": {
        "id": "cly...",
        "name": "Raphia Export Mada"
      },
      "purchaseOrder": {
        "id": "cly...",
        "orderNumber": "ACH/000221"
      },
      "notes": "Virement SG"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

## 7. POST /financial-tracking/ledger-entries

Creation manuelle d une ecriture, par exemple salaire, taxe, frais logistiques ou transfert.

### Body

```json
{
  "entryDate": "2026-07-09T08:30:00.000Z",
  "label": "Salaire atelier juin 2026",
  "entryType": "EXPENSE",
  "amount": 3200,
  "currency": "EUR",
  "ledgerCategoryId": "category-payroll-id",
  "notes": "Paiement mensuel"
}
```

## 8. GET /financial-tracking/clients/:clientId

Fiche financiere d un client.

### Reponse type

```json
{
  "client": {
    "id": "cly...",
    "name": "Galeries Lafayette",
    "type": "B2B",
    "status": "ACTIVE"
  },
  "finance": {
    "invoicedTtc": 14400,
    "collectedAmount": 9200,
    "outstandingAmount": 5200,
    "overdueAmount": 1800,
    "overdueInvoicesCount": 2,
    "trackedBalance": 9200,
    "estimatedMarginAmount": 7900,
    "estimatedMarginRate": 65.83
  },
  "recentInvoices": [],
  "recentPayments": [],
  "ledgerEntries": []
}
```

## 9. POST /purchase-orders/:id/record-payment

Enregistre un paiement fournisseur reel et alimente automatiquement le journal de tresorerie.

### Body

```json
{
  "amount": 2500,
  "paymentMethod": "BANK_TRANSFER",
  "paidAt": "2026-07-10T10:00:00.000Z",
  "notes": "Virement SG 2026-07-10"
}
```

### Effets serveur

- creation d un PurchaseOrderPayment
- increment de purchaseOrder.paidAmount
- mise a jour de purchaseOrder.paidAt si le total achat est integralement regle
- creation d une LedgerEntry category SUPPLIER_PAYMENT

## Regles de calcul importantes

- La tresorerie suivie est calculee a partir des LedgerEntry, pas a partir des statuts de documents.
- Les engagements fournisseurs restent visibles dans upcomingPurchaseOrders, mais ils ne deviennent un decaissement reel qu au POST /purchase-orders/:id/record-payment.
- Les budgets utilisent les LedgerEntry reelles et peuvent etre cibles par categorie, client ou fournisseur.
