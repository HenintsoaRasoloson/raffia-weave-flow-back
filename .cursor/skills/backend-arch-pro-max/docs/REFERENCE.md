# Backend Arch Pro Max Reference

This skill mirrors the UI/UX Pro Max pattern for backend work:

- `SKILL.md` is the agent-facing workflow.
- `README.md` is the public-facing usage and distribution document.
- `scripts/search.py` is the BM25 reasoning/search engine.
- `src/backend-arch-pro-max/data/*.csv` is the searchable rule database.
- `skill.json` is package metadata.
- `templates/platforms/source.json` is the single source for platform metadata.
- `templates/platforms/*.json` are generated installer metadata templates for supported agent platforms.
- `examples/use-cases/*.md` contains representative backend architecture prompts and expected directions.

## Data Files

- `api_patterns.csv`: API contracts, pagination, versioning, and error envelopes.
- `database_patterns.csv`: service/repository layering, indexes, transactions, tenancy, CQRS, and sharding.
- `caching_strategies.csv`: Redis/cache-aside/write-through/invalidation/session/locking patterns.
- `resilience_patterns.csv`: timeout, retry, circuit breaker, bulkhead, saga, and graceful degradation.
- `security_patterns.csv`: OAuth2/OIDC, JWT, RBAC, ABAC, Argon2id, rate limits, validation, secrets, webhooks.
- `async_patterns.csv`: queues, transactional outbox, Kafka, RabbitMQ, idempotency, webhook inbox, DLQ.
- `observability_patterns.csv`: structured logs, tracing, RED metrics, SLOs, audit logs, health checks.
- `anti_patterns.csv`: critical backend failure modes.
- `stacks.csv`: framework-specific guidance.

## Extension Rules

Add new rows instead of adding long prose to `SKILL.md`. Keep rows concrete:

```csv
id,category,name,description,when_to_use,trade_offs,implementation_notes,keywords,references
```

For anti-patterns:

```csv
id,severity,name,bad_example,why_bad,good_example,keywords,references
```

Prefer backend-architecture facts that change slowly: protocols, consistency patterns, security defaults, and implementation boundaries. Avoid framework trivia that is likely to go stale quickly unless it belongs in `stacks.csv`.

Run the data validator after editing CSV files:

```powershell
python src/backend-arch-pro-max/data/_sync_all.py
```

Run platform template generation after editing `templates/platforms/source.json`:

```powershell
python scripts/generate_platform_templates.py
```

Use check mode in CI and pre-release validation:

```powershell
python scripts/generate_platform_templates.py --check
```
