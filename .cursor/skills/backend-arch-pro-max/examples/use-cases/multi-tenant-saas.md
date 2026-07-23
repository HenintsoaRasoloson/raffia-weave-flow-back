# Multi-Tenant SaaS Backend Example

```powershell
python backend-arch-pro-max-skill\scripts\search.py "multi tenant saas auth billing postgres redis queue audit log" --architecture -p "Multi Tenant SaaS"
```

Expected architectural direction:

- Architecture: service layer plus repository pattern with tenant boundary enforcement.
- API: REST resource API for CRUD plus cursor pagination for large tenant-scoped lists.
- Database: PostgreSQL with `tenant_id` scoped repositories and row-level security where possible.
- Cache: Redis session store and cache-aside for read-heavy tenant settings.
- Async: background jobs and transactional outbox for billing events and notifications.
- Security: OAuth2/OIDC, short-lived JWT, RBAC with scoped tenant permissions.
- Observability: structured logs with correlation ID, audit log for admin and billing actions.
- Avoid: cross-tenant data leaks, N+1 queries, hardcoded secrets, and missing transactions.
