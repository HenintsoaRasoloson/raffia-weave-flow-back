---
name: backend-arch-pro-max
description: "Backend architecture intelligence for coding agents. Use when designing, building, reviewing, or refactoring APIs, backend services, database schemas, authentication systems, queues, caching layers, integrations, multi-tenant SaaS backends, REST/GraphQL/gRPC/tRPC endpoints, service layers, repositories, transactions, resilience, observability, security, and production data integrity. Trigger phrases include: buatkan API, backend service, database design, REST endpoint, auth system, API architecture, microservice, monolith, queue, Redis, PostgreSQL, JWT, OAuth2, RBAC, rate limit, N+1, caching, event-driven, saga, idempotency, observability, scalability, service layer, repository pattern, and backend review."
---

# Backend Arch Pro Max

Backend architecture guidance for coding agents. Use it to turn a backend request into a concrete architecture, implementation plan, code review checklist, or refactor strategy with production-grade defaults.

## Core Workflow

1. Analyze the user request and extract:
   - Use case, domain, and business-critical operations.
   - Scale target: prototype, startup MVP, growth, enterprise, regulated, or high-throughput.
   - Data model shape: CRUD, relational, analytical, search-heavy, multi-tenant, event-driven, or real-time.
   - Consistency needs: ACID transaction, eventual consistency, idempotency, audit trail, or compliance.
   - Current stack, if present. Prefer existing repo patterns over introducing new frameworks.

2. Run the architecture search:

```bash
python backend-arch-pro-max-skill/scripts/search.py "<request>" --architecture -p "<Project Name>"
```

Use the output as the architecture baseline. If the skill is installed inside an assistant-specific skills directory, adjust the path to the local `scripts/search.py`.

To persist the recommendation as an architecture source of truth:

```bash
python backend-arch-pro-max-skill/scripts/search.py "<request>" --architecture --persist -p "<Project Name>" --service "<Service Name>"
```

This creates `architecture/<project>/MASTER.md` plus an optional `architecture/<project>/services/<service>.md` override file.

3. Add focused searches when needed:

```bash
python backend-arch-pro-max-skill/scripts/search.py compare "RabbitMQ vs Kafka"
python backend-arch-pro-max-skill/scripts/search.py "cursor pagination REST" --domain api
python backend-arch-pro-max-skill/scripts/search.py "multi tenant postgres row level security" --domain database
python backend-arch-pro-max-skill/scripts/search.py "idempotent payment webhook" --domain async
python backend-arch-pro-max-skill/scripts/search.py "jwt refresh token rbac" --domain security
python backend-arch-pro-max-skill/scripts/search.py "nestjs service repository transaction" --stack nestjs
python backend-arch-pro-max-skill/scripts/search.py --stale
```

4. Implement with hard boundaries:
   - Controller or handler: HTTP parsing, auth context, validation, response mapping only.
   - Service layer: business rules, authorization checks, transaction orchestration, idempotency.
   - Repository or data access layer: database queries, indexes, locking, pagination, persistence mapping.
   - Worker or queue consumer: long-running or retryable operations such as email, PDFs, media, webhooks, and third-party calls.

5. Before delivery, run the anti-pattern pass:

```bash
python backend-arch-pro-max-skill/scripts/search.py "<request>" --domain anti-patterns -n 5
```

Fix any matching critical or high-severity issue before presenting the result.

## Domain Reference

| Domain | Use For |
| --- | --- |
| `api` | REST, GraphQL, gRPC, tRPC, pagination, versioning, request/response contracts |
| `database` | Indexes, transactions, schema design, tenancy, N+1, CQRS, sharding |
| `caching` | Redis, cache-aside, write-through, invalidation, TTL, distributed locks |
| `resilience` | Retries, circuit breakers, timeouts, bulkheads, sagas, graceful degradation |
| `security` | Auth, RBAC/ABAC, password hashing, JWT, OAuth2/OIDC, rate limiting, secrets |
| `async` | Queues, Kafka/RabbitMQ/SQS, outbox, DLQ, idempotency, webhooks, background jobs |
| `observability` | Logs, metrics, tracing, SLOs, correlation IDs, audit logs |
| `anti-patterns` | Backend failure modes and forbidden implementation choices |

## Stack Reference

Available stack searches: `node-express`, `nestjs`, `nextjs-api`, `laravel`, `django`, `fastapi`, `spring-boot`, `go`, `dotnet`.

Use stack guidance only after checking the actual repository. If the repo already has clear conventions, align with them first.

## Output Format

When planning or reviewing architecture, include this compact block:

```text
+--------------------------------------------------+
| TARGET: <project/use case>                       |
+--------------------------------------------------+
| ARCHITECTURE: <pattern and rationale>            |
| API:          <contract style and pagination>    |
| DB:           <storage, transaction, indexes>    |
| CACHE:        <strategy, TTL, invalidation>      |
| ASYNC:        <queue/events/idempotency>         |
| SECURITY:     <auth, authorization, rate limit> |
| OBSERVABILITY:<logs, metrics, traces, audits>   |
| AVOID:        <specific anti-patterns>           |
| CHECKLIST:    [ ] validation at boundary         |
|               [ ] transaction around multi-write |
|               [ ] no secrets in source/client    |
|               [ ] no N+1 or unbounded query      |
|               [ ] errors sanitized and logged    |
+--------------------------------------------------+
```

## Default Rules

- Prefer a modular monolith for MVPs unless the user already has independent scaling, deployment, or ownership boundaries.
- Use microservices only when service ownership, deployment cadence, fault isolation, or throughput requirements justify the operational cost.
- Use cursor pagination for large or frequently changing lists. Use offset pagination only for small stable admin lists.
- Require request validation at the boundary and domain validation in the service layer.
- Wrap multi-table writes in database transactions. Use optimistic locking or explicit row locks for concurrent business operations.
- Use idempotency keys for payment, webhook, import, retry, and externally-triggered write operations.
- Push slow, retryable, or externally dependent work to a queue: email, notifications, PDF generation, media processing, webhooks, imports, exports, third-party syncs.
- Hash passwords with Argon2id or bcrypt. Never use MD5, SHA1, SHA256, or reversible encryption for passwords.
- Keep secrets out of source, client bundles, Dockerfiles, examples with real values, and logs.
- Log internal errors with correlation IDs, but return sanitized user-facing errors.
- Instrument service boundaries with structured logs, latency metrics, error rates, and traces for critical paths.

## Critical Anti-Patterns

Block delivery or request changes when any of these appear:

- N+1 queries from data fetching inside loops.
- Business logic in controllers, route handlers, serializers, or UI components.
- Unbounded `SELECT *`, list endpoints without limits, or loading entire tables into memory.
- Plain-text passwords or weak hashing.
- JWT secrets, database credentials, API keys, or webhook secrets hardcoded in source.
- Stack traces or internal exception messages exposed to end users.
- Synchronous processing for slow external calls, emails, PDFs, media processing, or notification fan-out.
- Missing transaction for multi-table writes that must succeed or fail together.
- Retry loops without timeout, backoff, max attempts, and idempotency.
- Cache invalidation omitted for mutable data.

## Delivery Checklist

- [ ] The chosen architecture is justified by scale, team, consistency, and operational constraints.
- [ ] Controllers/handlers, services, repositories, and workers have separate responsibilities.
- [ ] Inputs are validated and outputs avoid leaking internals.
- [ ] Critical writes are transactional and concurrency-aware.
- [ ] List queries are paginated and indexed.
- [ ] Slow or retryable work is asynchronous.
- [ ] AuthN, AuthZ, rate limits, and secret handling are covered.
- [ ] Logs, metrics, tracing, and audit requirements are explicit.
- [ ] Anti-pattern search has been checked against the implementation.
