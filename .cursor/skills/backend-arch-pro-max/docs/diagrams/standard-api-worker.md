# Backend Architecture Pattern: API + Worker + Redis
 
```mermaid
graph LR
    subgraph Client Layer
        A[Mobile/Web]
    end
 
    subgraph API Layer
        B[API Gateway / Load Balancer]
        C[API Service - Node/Go/FastAPI]
    end
 
    subgraph Cache & State
        D[(Redis - Cache/Session)]
    end
 
    subgraph Persistence Layer
        E[(PostgreSQL - Primary DB)]
    end
 
    subgraph Async Layer
        F[Message Queue - Redis/RabbitMQ]
        G[Worker Service]
    end
 
    A --> B
    B --> C
    C --> D
    C --> E
    C --> F
    F --> G
    G --> E
    G --> D
```
 
### Key Patterns Applied:
- **Cache-Aside Pattern**: API checks Redis before querying Postgres.
- **Transactional Outbox**: Worker handles slow side-effects (emails, image processing) asynchronously.
- **Resource-Based API**: Structured REST/GraphQL endpoints.
- **Stateless Auth**: JWT validation with Redis-backed revocation list.
