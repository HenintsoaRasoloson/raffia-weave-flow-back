# Dashboard Frontend Integration Guide

## Vue d'ensemble

Le backend Dashboard expose 7 endpoints REST qui alimentent le tableau de bord frontend. Le frontend utilise:

- **TanStack Start + React 19** pour la structure
- **shadcn/ui** pour les composants
- **Tailwind CSS + oklch** pour le styling
- **Recharts** pour les graphiques
- **TanStack Query** pour la gestion des données

## Architecture

```
Frontend (raffia-weave-flow)
        ↓
   TanStack Router
        ↓
Dashboard Route (/index.tsx)
        ↓
   TanStack Query
        ↓
Backend API (raffia-weave-flow-back)
        ↓
GET /dashboard endpoints
        ↓
Prisma ← PostgreSQL
```

## Installation Frontend

### 1. Installer socket.io-client

```bash
cd d:\Perso\Devs\raffia-weave-flow
npm install socket.io-client
```

### 2. Créer un hook pour les notifications

Créer `src/lib/hooks/useNotifications.ts`:

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@tanstack/start'; // Ou votre système d'auth

interface Notification {
  type: string;
  title?: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high';
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth(); // Récupérer le token JWT

  useEffect(() => {
    if (!user?.token) return;

    // Connecter au serveur WebSocket
    const socket: Socket = io('http://localhost:3000/notifications', {
      auth: {
        token: user.token,
      },
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connecté');
      setConnected(true);

      // Envoyer le token JWT pour authentification
      socket.emit('authenticate', { token: user.token });
    });

    socket.on('notification:role', (notification: Notification) => {
      console.log('📢 Notification reçue:', notification);
      setNotifications((prev) => [notification, ...prev].slice(0, 5));
    });

    socket.on('notification:global', (notification: Notification) => {
      console.log('🌐 Notification globale:', notification);
      setNotifications((prev) => [notification, ...prev].slice(0, 5));
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket déconnecté');
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.token]);

  return { notifications, connected };
}
```

### 3. Créer un composant Notifications Toast

Créer `src/components/NotificationsToast.tsx`:

```typescript
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';

const iconMap = {
  AlertTriangle,
  Sparkles,
  TrendingUp,
};

export function NotificationsToast() {
  const { notifications } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notif, idx) => {
        const Icon = iconMap[notif.type as keyof typeof iconMap] || AlertTriangle;
        const bgColor =
          notif.priority === 'high'
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200';

        return (
          <Alert key={idx} className={bgColor}>
            <Icon className="h-4 w-4" />
            <AlertTitle>{notif.title}</AlertTitle>
            <AlertDescription>{notif.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
```

### 4. Intégrer dans le Layout

Dans `src/routes/__root.tsx`:

```typescript
import { NotificationsToast } from '@/components/NotificationsToast';

export const Route = createRootRoute({
  component: () => (
    <>
      <SidebarProvider>
        <Sidebar />
        <main className="flex-1">
          <Outlet />
        </main>
      </SidebarProvider>
      <NotificationsToast /> {/* ← Ajouter ici */}
    </>
  ),
});
```

### 5. Créer la page Dashboard

Créer `src/routes/index.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/PageHeader';

interface DashboardData {
  kpis: Array<{ label: string; value: string; delta: string; trend: string; hint: string }>;
  revenueSeries: Array<{ month: string; b2b: number; b2c: number }>;
  productionOrders: Array<{ id: string; product: string; qty: number; status: string; progress: number; start: string; end: string }>;
  recentOrders: Array<{ id: string; client: string; type: string; date: string; total: string; status: string }>;
  alerts: Array<{ id: string; type: string; title: string; message: string }>;
  quickStats: Array<{ to: string; icon: string; label: string; hint: string }>;
}

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <div>Chargement...</div>;
  if (!dashboard) return <div>Erreur de chargement</div>;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <PageHeader
        title="Tableau de bord"
        description="Pilotez votre production et vos ventes en temps réel"
      />

      {/* KPIs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.kpis.map((kpi) => (
          <Card key={kpi.label} className="border-warm-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase">{kpi.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold">{kpi.value}</p>
              <p className={`mt-1 text-xs ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.delta} {kpi.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Chiffre d'affaires</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboard.revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Legend />
              <Bar dataKey="b2b" fill="#8B7355" name="B2B" /> {/* Warm Sand */}
              <Bar dataKey="b2c" fill="#D4B896" name="B2C" /> {/* Light Warm Sand */}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Production Orders */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Ordres de fabrication en cours</h3>
        <div className="grid gap-4">
          {dashboard.productionOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{order.product}</CardTitle>
                  <Badge variant="outline">{order.status}</Badge>
                </div>
                <CardDescription>{order.qty} unités</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={order.progress} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {order.start} - {order.end}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières commandes</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left">Référence</th>
                <th className="text-left">Client</th>
                <th className="text-left">Type</th>
                <th className="text-left">Date</th>
                <th className="text-right">Total</th>
                <th className="text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentOrders.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="font-mono text-xs font-semibold">{order.id}</td>
                  <td>{order.client}</td>
                  <td><Badge variant="secondary">{order.type}</Badge></td>
                  <td>{order.date}</td>
                  <td className="text-right font-semibold">{order.total}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Alerts */}
      {dashboard.alerts.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold">Alertes & Suggestions</h3>
          <div className="space-y-2">
            {dashboard.alerts.map((alert) => (
              <Alert key={alert.id} className={`border-${alert.type === 'warning' ? 'red' : 'blue'}-200`}>
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.quickStats.map((stat) => (
          <a
            key={stat.to}
            href={stat.to}
            className="rounded-lg border border-warm-200 p-4 transition-colors hover:bg-warm-50"
          >
            <p className="font-semibold">{stat.label}</p>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

## Testing

### Tester l'API en local

1. Démarrer le serveur backend:

```bash
cd d:\Perso\Devs\raffia-weave-flow-back
npm run start:dev
```

2. Tester un endpoint avec curl:

```bash
# Test simple
curl http://localhost:3000/dashboard

# Avec paramètres
curl "http://localhost:3000/dashboard?days=60"
curl "http://localhost:3000/dashboard/revenue?months=12"
```

3. Importer dans Postman:
   - **Method**: GET
   - **URL**: `http://localhost:3000/dashboard`
   - **Headers**: `Authorization: Bearer <votre_jwt_token>`

### Déclencheurs de notifications

Pour tester le système de notifications:

```bash
# 1. Créer une commande (déclenche notification GERANT + RESPONSABLE_GENERAL)
curl -X POST http://localhost:3000/sales-orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "...",
    "clientType": "B2B",
    "items": [{"productId": "...", "quantity": 100}],
    "totalTtc": 5000
  }'

# 2. Enregistrer un paiement (déclenche notifications)
curl -X PATCH http://localhost:3000/invoices/<id>/record-payment \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 6000, "paymentMethod": "VIREMENT"}'

# 3. Approuver la qualité (déclenche notifications à RESPONSABLE_LIVRAISON)
curl -X PATCH http://localhost:3000/production-orders/<id>/approve-quality \
  -H "Authorization: Bearer <token>"

# 4. Marquer comme livré (déclenche notifications)
curl -X PATCH http://localhost:3000/deliveries/<id>/mark-delivered \
  -H "Authorization: Bearer <token>"
```

## Performance & Optimisation

- **Cache côté frontend**: TanStack Query avec `staleTime: 5min`
- **Cache côté serveur**: Ajouter Redis pour les KPIs stables
- **Pagination**: `limit` pour les ordres, `days` pour les KPIs
- **Prefetch**: Prefetch /dashboard lors du login

## Troubleshooting

| Problème                         | Solution                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| WebSocket ne se connecte pas     | Vérifier que le token JWT est valide, vérifier CORS        |
| Notifications ne s'affichent pas | Vérifier que la route correspond au rôle de l'utilisateur  |
| Données dashboard vides          | Vérifier qu'il y a des commandes/ordres en BD (seed la BD) |
| Performance lente                | Augmenter `staleTime` dans Query options                   |

---

**Dernière mise à jour**: 2026-07-09  
**Stack Frontend**: React 19 + TanStack Start + shadcn/ui  
**Stack Backend**: NestJS + Prisma + PostgreSQL
