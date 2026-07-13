# ADR-015: Review-before-apply AI ride authoring

- Status: Accepted
- Date: 2026-07-13

## Context

Ride Managers often begin with an informal WhatsApp announcement. Re-entering origins, itinerary, accommodation, meals, activities, inclusions, and exclusions is slow, but generated content can invent operational facts or carry participant/payment information into an external provider.

## Decision

@Ride provides an optional server-side Gemini adapter using structured JSON output. It treats Ride Studio fields as authoritative, filters common participant rows and identifiers from optional source text, instructs the model not to invent facts, and returns missing facts explicitly. Results appear in an editable review panel; the organizer chooses what to apply, and the normal ride save remains a separate action.

The integration stores model/status/token metadata for rate limits and auditability, not prompt or response content. It has per-user and per-ride daily limits and a deployment feature flag. Provider credentials remain server-only. A copy-prompt and copy/open-Gemini fallback remains available without an API call, but external output must be manually returned and reviewed.

The application, rather than the model, guarantees itinerary date coverage. It derives every inclusive calendar date between the ride start and end, requires Gemini to enrich each day from confirmed ride facts, and deterministically restores any date the model omits. Restored days are marked for organizer confirmation instead of being silently invented.

## Consequences

- AI cannot silently publish or mutate a ride.
- Cost is bounded and the feature can be disabled without blocking Ride Studio.
- Filtering reduces accidental disclosure, but organizers are still warned to remove sensitive content before pasting.
- Generated operational facts require human confirmation; deterministic validation and canonical database records remain authoritative.

## Alternatives considered

- External copy/paste only: kept as a fallback, but too much repetitive work as the main flow.
- Automatic save/publish: rejected because invented operational facts could create safety and commercial risk.
