# ADR-010: Complete web, then PWA/wrapper, then optional Android

- Status: Accepted
- Date: 2026-07-09

## Context

Discovery, Guild administration, ride creation, booking, payment, and most participant functions work on a responsive web application. Native development before these workflows stabilize would duplicate product iteration. Android can later add value for offline captain operations, push reliability, camera/device integration, and controlled background location.

## Decision

Complete and launch web Phases 0–9 first. Then deliver an installable PWA and evaluate an Android packaged web wrapper. Start a separate React Native/Expo Android application only after PWA/wrapper usage proves a native operational need. Defer iOS until demand justifies its own release phase.

Prepare the backend from the start with versioned APIs, idempotency, mobile-ready authorization, deep links, and sync-friendly contracts without building the mobile client early.

## Consequences

- One validated product flow precedes additional clients.
- PWA/wrapper cannot promise fully reliable background tracking.
- Android is an explicit decision gate, not an automatic roadmap commitment.
- Native mobile authentication needs revocable device sessions and secure storage.
- Offline commands require idempotency and conflict handling.
- Background location is limited to consenting authorized crew and requires Play policy/disclosure work.

## Alternatives considered

- Native Android in parallel with initial web: rejected due to duplicated iteration and maintenance.
- PWA only forever: retained as a viable outcome if native value is not demonstrated.
- Separate Kotlin Android application immediately: deferred; React Native/Expo preserves TypeScript reuse and an iOS path unless a spike proves otherwise.
