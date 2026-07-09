# ADR-003: Use hostname-based multi-tenancy and wildcard subdomains

- Status: Accepted
- Date: 2026-07-07

## Context

Each community needs a branded URL that becomes available without a manual DNS change. All tenants share the application while their data and permissions remain isolated.

## Decision

Route `*.atride.in` to one application. Resolve the normalized request hostname through `CommunityDomain`, attach trusted tenant context server-side, and require that context in tenant repositories. Unknown or inactive tenants return a controlled 404/unavailable response.

## Consequences

- New subdomains activate through database state
- Wildcard DNS and wildcard/automated TLS are infrastructure requirements
- Cache, queue, storage, and database operations must carry tenant identity
- Reserved subdomains and impersonation controls are required
- Custom domains can be added through the same domain-mapping model later

## Alternatives considered

- Manually add one DNS record per community: rejected as operationally slow
- Path-only tenancy such as `atride.in/c/{club}`: simpler DNS but weaker independent community identity
- Separate deployment per community: rejected due to cost and upgrade complexity
