# ADR-003: Use path-first multi-tenancy and defer wildcard subdomains

- Status: Accepted
- Date: 2026-07-07

## Context

Each community needs a branded URL while all tenants share the application and keep their data and permissions isolated. The first release must minimize DNS, certificate, hosting, and local-development complexity.

## Decision

Launch with `atride.in/guilds/{slug}`. Resolve the normalized route slug server-side, attach trusted tenant context, and require that context in tenant repositories. Unknown or inactive Guilds return a controlled 404/unavailable response.

Keep tenant resolution behind an application boundary so a future `*.atride.in` hostname adapter can produce the same tenant context without changing domain services or repositories.

## Consequences

- Phase 1 needs no wildcard DNS or tenant-specific TLS
- Guild slugs must be globally unique and protected from reserved-name abuse
- Cache, queue, storage, and database operations must carry tenant identity
- Subdomains and custom domains can be added through the domain-mapping model later

## Alternatives considered

- Manually add one DNS record per community: rejected as operationally slow
- Hostname-first tenancy: stronger independent community identity but deferred because it adds DNS, certificate, preview, and local-development complexity before product validation
- Separate deployment per community: rejected due to cost and upgrade complexity
