# ADR-012: Use Cloudinary as the initial media provider

- Status: Accepted
- Date: 2026-07-10

## Context

Guild logos, community galleries, ride covers/galleries, route images, user avatars, and sensitive payment/evidence uploads would quickly consume transactional database storage. They also require resizing, cropping, optimized formats, CDN delivery, signed uploads, and different public/private access policies.

Neon PostgreSQL/PostGIS is the authoritative transactional database, not a binary object store. A basic bucket would provide storage but would require additional transformation and delivery work during the MVP.

## Decision

Use Cloudinary initially behind an application-owned `MediaProvider` interface. Browsers upload directly using short-lived parameters signed by an authorized @Ride server endpoint. Neon stores only provider identifiers and durable metadata/relationships.

Use public delivery for approved Guild and published-ride media. Use authenticated/private delivery and short-lived signed URLs for non-public avatars, payment proofs, incident/evidence media, and identity/vehicle documents. Never expose the Cloudinary API secret to clients or store expiring signed URLs as canonical database values.

## Consequences

- Neon capacity remains focused on relational and geographic data.
- Image resizing, optimized formats, CDN delivery, and access control ship faster.
- Tenant/purpose authorization, quotas, deletion, orphan cleanup, and audit remain application responsibilities.
- Provider IDs and metadata require backup/export planning.
- The adapter preserves a later migration path to Cloudflare R2, S3, or another object store if cost or scale justifies it.

## Alternatives considered

- Store images/Base64 in PostgreSQL: rejected because it wastes database capacity and complicates delivery/backups.
- Cloudflare R2 immediately: cost-effective, but requires more image transformation and delivery plumbing for the MVP.
- Vercel Blob: simple integration, but offers less image-management functionality and increases hosting-provider coupling.
