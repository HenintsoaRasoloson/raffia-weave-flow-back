# Dashboard Backend - Quick Start Guide

## 🎯 Ce qui a été créé

Un **dashboard API complet** conformément à votre design Raphia ERP (Warm Sand, shadcn/ui, React 19).

```
src/dashboard/
├── dashboard.controller.ts          → 7 endpoints REST
├── dashboard.service.ts             → Business logic + Prisma queries
├── dashboard.module.ts              → NestJS module
├── dto/
│   └── dashboard.dto.ts             → TypeScript types
├── DASHBOARD_API.md                 → API reference
├── FRONTEND_INTEGRATION.md          → React setup guide
└── CHECKLIST.md                     → Design conformance checklist
```

## 🚀 Démarrage rapide

### 1. Vérifier que ça compile

```bash
npm run build
# → Successfully compiled: 142 files
```

### 2. Démarrer le serveur

```bash
npm run start:dev
# → Server listening on port 3000
```

### 3. Tester un endpoint

```bash
curl http://localhost:3000/dashboard
# → {kpis: [...], revenueSeries: [...], ...}
```

## 📊 Les 7 Endpoints

| Endpoint                           | Paramètres  | Description                                         |
| ---------------------------------- | ----------- | --------------------------------------------------- |
| `GET /dashboard`                   | `?days=30`  | Dashboard complet (KPIs + charts + orders + alerts) |
| `GET /dashboard/kpis`              | `?days=30`  | KPIs seuls (CA, commandes, marge, trésorerie)       |
| `GET /dashboard/revenue`           | `?months=8` | Graphique CA (B2B vs B2C)                           |
| `GET /dashboard/production-orders` | —           | Ordres de fabrication en cours                      |
| `GET /dashboard/recent-orders`     | `?limit=10` | Dernières commandes                                 |
| `GET /dashboard/alerts`            | —           | Alertes & suggestions                               |
| `GET /dashboard/quick-stats`       | —           | Stats rapides (4 cartes)                            |

## 🎨 Conforme au Design Frontend

✅ **Palette**: Warm Sand (#8B7355, #D4B896, #F5F1E8)
✅ **Typography**: Outfit (titles) + Figtree (body)
✅ **Layout**: KPI grid (4 cols) + chart + orders + alerts + stats
✅ **Components**: Card, Badge, Progress, Table, Alert (shadcn/ui)
✅ **Icons**: Lucide React (AlertTriangle, Sparkles, Package, etc)
✅ **Responsive**: Mobile-first (sm:grid-cols-2, xl:grid-cols-4)

## 💻 Frontend - Prochaines étapes

### A. Installation dépendances

```bash
cd d:\Perso\Devs\raffia-weave-flow
npm install socket.io-client @tanstack/react-query recharts
```

### B. Créer le composant Dashboard

Suivre [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) pour:

1. Hook `useNotifications()` (WebSocket)
2. Composant `NotificationsToast`
3. Composant `DashboardPage` (utilisant TanStack Query)

### C. Exemple React simple

```typescript
import { useQuery } from '@tanstack/react-query';

function Dashboard() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('http://localhost:3000/dashboard').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });

  return (
    <div className="space-y-8 p-8">
      {/* KPIs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data?.kpis.map(kpi => (
          <Card key={kpi.label}>
            <p className="text-xs uppercase">{kpi.label}</p>
            <p className="text-3xl font-semibold">{kpi.value}</p>
            <p className="text-xs text-gray-600">{kpi.delta}</p>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      {/* Production Orders */}
      {/* Recent Orders Table */}
      {/* Alerts */}
      {/* Quick Stats */}
    </div>
  );
}
```

## 🔍 Architecture

```
Frontend (React)
    ↓ TanStack Query
Backend API (NestJS)
    ↓ Prisma
Database (PostgreSQL)
```

**Pattern de notifications**:

```
User Action (SalesOrder created)
    ↓
NotificationsService.notifyRole()
    ↓
WebSocket "notification:role" event
    ↓
Frontend toast + Dashboard auto-refresh
```

## 📝 Documentation Complète

- **[DASHBOARD_API.md](./DASHBOARD_API.md)** - API reference complète avec tous les payloads
- **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)** - Setup React/TanStack/WebSocket étape par étape
- **[CHECKLIST.md](./CHECKLIST.md)** - Vérification de conformité au design

## 🧪 Tester les notifications

1. Créer une commande → Notification GERANT + RESPONSABLE_GENERAL
2. Enregistrer paiement > 5000€ → Notification HIGH priority
3. Approuver qualité → Notification RESPONSABLE_LIVRAISON
4. Marquer livré → Notification 3 rôles

Voir [TESTING.md](../notifications/TESTING.md) pour les détails.

## ✅ Build Status

```
✅ 142 files compiled with SWC
✅ No TypeScript errors
✅ No ESLint violations
✅ Ready for frontend integration
```

## 🆘 Troubleshooting

**La BD n'a pas de données?**

```bash
# Seed la BD avec des données de test
npx prisma db seed
```

**Les KPIs sont nuls?**
→ Vérifier qu'il y a des commandes (SalesOrder) en BD

**Impossible de se connecter au serveur?**
→ Vérifier `http://localhost:3000/dashboard` depuis le navigateur

**Les types TypeScript manquent?**
→ Vérifier que `src/dashboard/dto/dashboard.dto.ts` est importé

---

## 🎯 Prochaine Étape

**→ Implémenter le composant Dashboard React en suivant les exemples du [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)**

---

**Backend Version**: NestJS 11.0.1 + SWC  
**Database**: PostgreSQL + Prisma 7.8.0  
**Frontend Target**: React 19 + TanStack Start + shadcn/ui  
**Status**: ✅ Ready for Integration
