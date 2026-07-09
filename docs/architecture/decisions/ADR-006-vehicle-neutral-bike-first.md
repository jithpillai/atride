# ADR-006: Use a vehicle-neutral core with a bike-first launch

- Status: Accepted
- Date: 2026-07-08

## Context

@Ride was conceived for motorcycle communities, but car, SUV, Jeep, 4×4, and overlanding groups share most community, booking, route, payment, and checkpoint workflows. A motorcycle-only schema would create avoidable migration work, while launching every four-wheel scenario immediately would dilute focus and expand the MVP.

## Decision

Model participants, vehicles, occupant roles, pricing units, and ride vehicle policies generically. The ride-creation form requires an explicit vehicle type and selects `BIKE` by default. The initial product and fixtures remain bike-first. Four-wheel modes are enabled progressively after the workflows and rollout gates in [four-wheel-expansion.md](../../planning/four-wheel-expansion.md) are validated.

## Consequences

- Rename motorcycle-only core entities to generic vehicle entities.
- Persist the default `BIKE` selection instead of relying on an implicit assumption.
- Use contextual UI terminology such as rider/pillion or driver/passenger.
- Model vehicle type, drive type, occupant role, pricing unit, and capacity independently.
- Keep advanced four-wheel, organizer-provided transport, mixed convoy, and cross-border behavior outside the bike-first MVP.
- Add four-wheel fixtures to authorization and transaction tests when those modes are enabled.

## Alternatives considered

- Motorcycle-only product and schema: rejected because the adjacent four-wheel use case is strong and shares most platform capabilities.
- Full multi-vehicle launch from day one: rejected because occupant, capacity, document, pricing, and convoy workflows need pilot validation.
- Separate product for four-wheel groups: rejected because it would duplicate tenant, booking, payment, route, and communication systems.
