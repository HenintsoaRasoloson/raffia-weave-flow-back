# Healthcare API Backend Example

```powershell
python backend-arch-pro-max-skill\scripts\search.py "healthcare patient records phi audit encryption access control compliance" --architecture -p "Healthcare API"
```

Expected architectural direction:

- Architecture: modular monolith or service-oriented backend with strict domain boundaries.
- API: REST resource API with explicit DTOs and problem details errors.
- Database: constraints for integrity, restore-tested backups, and field-level encryption for PHI.
- Cache: avoid caching PHI unless encrypted and explicitly justified.
- Async: background jobs for reports and exports with audit trail.
- Security: OIDC, ABAC or scoped RBAC, field-level encryption, PII-safe logging.
- Observability: security audit events and structured logs without PHI.
- Avoid: PHI in logs, direct ORM entity exposure, and broad admin access without audit.
