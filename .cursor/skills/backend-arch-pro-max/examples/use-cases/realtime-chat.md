# Real-Time Chat Backend Example

```powershell
python backend-arch-pro-max-skill\scripts\search.py "real time chat websocket message ordering queue tenant moderation" --architecture -p "Realtime Chat"
```

Expected architectural direction:

- Architecture: WebSocket gateway plus application services and message repository.
- API: WebSocket for bidirectional messaging and REST for history and admin actions.
- Database: message table indexed by conversation and created cursor.
- Cache: Redis for presence and short-lived connection metadata.
- Async: partitioned message ordering and notification fan-out queue.
- Security: authenticated socket connection, tenant or workspace boundary checks, rate limits.
- Observability: queue lag, connection counts, message send latency, and error tracking.
- Avoid: storing connection state only in process memory when horizontally scaled.
