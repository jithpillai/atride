# ADR-001: Use a TypeScript modular monolith

- Status: Accepted
- Date: 2026-07-07

## Context

@Ride needs public pages, tenant dashboards, bookings, payments, notifications, and ride operations. The initial team and traffic do not justify independently deployed domain services, but business rules still need clear boundaries.

## Decision

Use TypeScript across Next.js frontend/API code and a separate TypeScript background-worker process. Organize business capabilities as modules within one repository and one logical application. The web and worker may deploy separately while sharing domain code and data ownership.

## Consequences

- One language and type system across the product
- Simpler transactions, testing, and local development
- Independent web/worker scaling without microservice data fragmentation
- Module boundaries must be enforced through code review and tests
- A service can be extracted later when measured scale or ownership requires it

## Alternatives considered

- Separate frontend and Java/.NET/Python backend: unnecessary language and deployment overhead initially
- Microservices from the start: rejected due to operational and transactional complexity
- Next.js-only serverless jobs: rejected for long-running queue consumers and reliable scheduled work
