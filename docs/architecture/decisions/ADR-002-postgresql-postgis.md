# ADR-002: Use PostgreSQL and PostGIS as the primary database

- Status: Accepted
- Date: 2026-07-07

## Context

Users belong to several communities, roles have different scopes, rides have groups/routes/pricing/bookings/payments, and capacity must not be oversold. Discovery also needs proximity and location queries.

## Decision

Use PostgreSQL as the authoritative transactional database, PostGIS for geographic data, and Prisma for typed access and migrations. Use Redis only for ephemeral or recomputable state.

## Consequences

- Strong constraints and transactions for capacity and payment workflows
- Natural representation of memberships and scoped roles
- Geographic filtering through PostGIS
- Schema changes require reviewed migrations
- Connection pooling must match the deployment environment

## Alternatives considered

- MongoDB/Mongoose matching Zstore: workable but less natural for @Ride's relationships and transactional invariants
- Redis as primary live store: rejected because it is not the authoritative system of record
