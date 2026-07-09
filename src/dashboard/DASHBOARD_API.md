# Dashboard API - Documentation

## Vue d'ensemble

L'API Dashboard fournit tous les KPIs, graphiques, alertes et données pour alimenter le tableau de bord frontend. Conforme au visuel Raphia ERP (design Warm Sand + shadcn/ui).

## Endpoints

### GET `/dashboard`

**Retourne le dashboard complet avec tous les éléments.**

Paramètres de requête:

- `days` (optionnel): Nombre de jours à couvrir pour les KPIs (défaut: 30, max: 365)

Réponse (200 OK):

```json
{
  "kpis": [
    {
      "label": "Chiffre d'affaires",
      "value": "€184.3k",
      "delta": "+12.4%",
      "trend": "up",
      "hint": "vs période précédente"
    },
    ...
  ],
  "revenueSeries": [
    {
      "month": "Jan",
      "b2b": 45000,
      "b2c": 28000
    },
    ...
  ],
  "productionOrders": [
    {
      "id": "OF-2026-0014",
      "product": "Cabas Madagascar",
      "qty": 150,
      "status": "En cours",
      "progress": 65,
      "start": "2 sep",
      "end": "10 sep"
    },
    ...
  ],
  "recentOrders": [
    {
      "id": "CMD-2410-0187",
      "client": "Galeries Lafayette",
      "type": "B2B",
      "date": "18/09/2026",
      "total": "€8 420",
      "status": "Expédiée"
    },
    ...
  ],
  "alerts": [
    {
      "id": "behind-1",
      "type": "warning",
      "icon": "AlertTriangle",
      "title": "Production derrière planning",
      "message": "OF-014 dépasse la date prévue",
      "actionUrl": "/production"
    },
    ...
  ],
  "quickStats": [
    {
      "to": "/catalogue",
      "icon": "Package",
      "label": "Catalogue produits",
      "hint": "248 références"
    },
    ...
  ]
}
```

---

### GET `/dashboard/kpis`

**KPIs seuls: CA, commandes en cours, marge, trésorerie.**

Paramètres:

- `days` (optionnel): Période d'analyse (défaut: 30)

Réponse (200 OK):

```json
[
  {
    "label": "Chiffre d'affaires",
    "value": "€184.3k",
    "delta": "+12.4%",
    "trend": "up",
    "hint": "vs période précédente"
  },
  ...
]
```

---

### GET `/dashboard/revenue`

**Graphique: Chiffre d'affaires B2B vs B2C par mois (8 mois par défaut).**

Paramètres:

- `months` (optionnel): Nombre de mois à afficher (défaut: 8, max: 24)

Réponse (200 OK):

```json
[
  {
    "month": "Jan",
    "b2b": 45200,
    "b2c": 28500
  },
  {
    "month": "Fév",
    "b2b": 52100,
    "b2c": 31800
  },
  ...
]
```

---

### GET `/dashboard/production-orders`

**Ordres de fabrication en cours (4 premiers).**

Réponse (200 OK):

```json
[
  {
    "id": "OF-2026-0014",
    "product": "Cabas Madagascar",
    "qty": 150,
    "status": "En cours",
    "progress": 65,
    "start": "2 sep",
    "end": "10 sep"
  },
  ...
]
```

Statuts possibles: `Planifié`, `Préparation`, `En cours`, `Terminé`

---

### GET `/dashboard/recent-orders`

**Dernières commandes de vente.**

Paramètres:

- `limit` (optionnel): Nombre de commandes (défaut: 10, max: 100)

Réponse (200 OK):

```json
[
  {
    "id": "CMD-2410-0187",
    "client": "Galeries Lafayette",
    "type": "B2B",
    "date": "18/09/2026",
    "total": "€8 420",
    "status": "Expédiée"
  },
  ...
]
```

---

### GET `/dashboard/alerts`

**Alertes & suggestions: ruptures de stock, production derrière planning, suggestions IA.**

Réponse (200 OK):

```json
[
  {
    "id": "behind-1",
    "type": "warning",
    "icon": "AlertTriangle",
    "title": "Production derrière planning",
    "message": "OF-014 dépasse la date prévue"
  },
  {
    "id": "ai-1",
    "type": "info",
    "icon": "Sparkles",
    "title": "Suggestion IA",
    "message": "Réassortir le Cabas Vahiné Indigo — rupture probable sous 12 jours."
  },
  {
    "id": "success-1",
    "type": "success",
    "icon": "TrendingUp",
    "title": "Rythme actuel",
    "message": "+14% vs. cible mensuelle"
  }
]
```

Types d'alerte: `warning`, `info`, `success`
Icônes: `AlertTriangle`, `Sparkles`, `TrendingUp` (Lucide React)

---

### GET `/dashboard/quick-stats`

**Statistiques rapides pour les 4 cartes d'accès rapide.**

Réponse (200 OK):

```json
[
  {
    "to": "/catalogue",
    "icon": "Package",
    "label": "Catalogue produits",
    "hint": "248 références"
  },
  {
    "to": "/livraisons",
    "icon": "Truck",
    "label": "Livraisons à planifier",
    "hint": "6 en attente"
  },
  {
    "to": "/facturation",
    "icon": "FileText",
    "label": "Factures à émettre",
    "hint": "12 documents"
  },
  {
    "to": "/catalogues-partages",
    "icon": "Link2",
    "label": "Liens catalogue actifs",
    "hint": "9 partages"
  }
]
```

---

## Exemples d'utilisation (Frontend)

### React Query avec TanStack React Router

```typescript
import { useQuery } from '@tanstack/react-query';

function Dashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/dashboard');
      return res.json();
    },
  });

  return (
    <div>
      {/* KPIs Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard?.kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
            <p className="mt-3 font-display text-3xl font-semibold">{kpi.value}</p>
            <p className={`mt-1 text-xs ${kpi.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
              {kpi.delta} {kpi.hint}
            </p>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Chiffre d'affaires</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={dashboard?.revenueSeries} />
        </CardContent>
      </Card>

      {/* Production Orders */}
      {dashboard?.productionOrders.map((order) => (
        <Card key={order.id} className="mt-3">
          <div className="p-4">
            <h3>{order.product}</h3>
            <Progress value={order.progress} />
          </div>
        </Card>
      ))}

      {/* Alerts */}
      {dashboard?.alerts.map((alert) => (
        <Alert key={alert.id} className={`mt-3 border-${alert.type}`}>
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

## Performance & Caching

- **GET /dashboard**: ~500ms (agrège 6 requêtes en parallèle)
- **GET /dashboard/kpis**: ~150ms
- **GET /dashboard/revenue**: ~200ms
- **GET /dashboard/alerts**: ~100ms

Recommandé: Cache 5 minutes côté frontend via TanStack Query `staleTime`.

---

## Notes d'implémentation

1. **Données réelles de la BD**: Toutes les données proviennent de requêtes Prisma sur les tables réelles (SalesOrder, ProductionOrder, Component, etc.)
2. **Conformité visuelle**: Structure exactement conforme au design frontend (Raphia ERP)
3. **Notifications intégrées**: Alertes liées au système de notifications WebSocket existant
4. **Pagination**: Endpoints supportent `limit` et `days` pour flexibilité
5. **Erreurs**: Retourne HTTP 500 + erreur détaillée si problème BD

---

## Intégration avec le système de notifications

Lors de modifications des données principales (commandes, ordres de production, stock), le système envoie automatiquement des notifications aux rôles concernés. Le dashboard récupère ensuite ces changements de manière asynchrone.

```typescript
// Exemple: Création d'une commande
POST /sales-orders
→ NotificationsService.notifyRoles(['GERANT', 'RESPONSABLE_GENERAL'])
→ WebSocket ":notification:role" event
→ Dashboard /dashboard/recent-orders reflète l'update (via refetch ou SSE)
```

---

**Dernière mise à jour**: 2026-07-09  
**Conforme à**: Raphia ERP v2.0 Design System
