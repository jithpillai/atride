# Mobile Delivery Strategy

@Ride will complete and validate the web application before creating a separate native mobile client.

Planned sequence:

```text
Responsive web application
        -> Installable PWA
        -> Optional packaged web wrapper
        -> Native Android app if operational value justifies it
        -> iOS deferred until demand justifies release
```

## 1. Why web first

The responsive web application is the fastest way to validate:

- Guild onboarding and hosted sites
- Discovery and private Guild access
- Registration and OTP
- Ride creation
- Bookings and payments
- Announcements and notifications
- Captain/checkpoint workflows
- Permissions and tenant isolation

Building native applications before these workflows stabilize would duplicate product iteration across clients.

## 2. PWA phase

After the web feature set and launch hardening are complete, add installable Progressive Web App capabilities.

### Scope

- Web app manifest and install experience
- App icons, splash/theme metadata, and standalone display
- Deep links to Guilds, rides, announcements, and bookings
- Cached application shell and safe read-only offline content
- Offline queue for selected idempotent captain actions where browser support is adequate
- Web push where supported and justified
- Update/version notification
- Network state and retry UX
- Secure logout and cache clearing

### Limitations

The PWA must not promise fully reliable background location across mobile browsers. Foreground check-ins and explicit current-location updates remain supported; native background tracking is deferred.

Sensitive participant/payment data is not broadly cached offline. Offline data has explicit scope, encryption/OS-storage considerations, and expiry.

## 3. Packaged web wrapper

After PWA validation, @Ride may publish a thin Android wrapper using a technology selected during implementation, such as a Trusted Web Activity or Capacitor-based shell.

Purpose:

- Play Store presence
- Home-screen installation and deep linking
- Reuse of the completed responsive web UI
- Early push/share/camera integration where safe
- Validate mobile demand before funding a native client

The wrapper is not presented as a fully native offline/tracking application. Authentication, booking, payment, and tenant behavior continue to use the web application and shared backend.

Wrapper choice requires a short technical spike covering:

- Login/session behavior
- Payment redirects
- Deep links
- Push notifications
- File/camera uploads
- Update process
- Play Store policy compliance
- Accessibility and back-navigation behavior

## 4. Native Android decision gate

A native Android application proceeds only after the web/PWA product is complete and at least one of these needs is validated through real usage:

- Reliable captain background location
- Strong offline checkpoint queueing
- Native push reliability required for operations
- Camera/document/check-in workflows exceed PWA capability
- Sustained mobile usage and organizer demand
- Wrapper limitations materially harm ride operations

If those needs are not demonstrated, the PWA/wrapper remains the supported mobile experience.

## 5. Proposed native technology

If approved, use React Native with Expo unless a technical spike proves a native Android-specific approach is necessary.

Reasons:

- TypeScript matches the web/backend stack.
- React concepts are familiar to the team.
- Android can ship first while preserving an iOS path.
- Location, notifications, secure storage, camera, and deep links are supported.
- Native modules remain possible when required.

Share across clients:

- API contracts
- Zod schemas and generated types
- Permission definitions
- Domain enums
- Design tokens
- Validation/formatting utilities

Do not force web React components to become native UI components. Each client uses platform-appropriate navigation and interaction.

## 6. Mobile-ready backend requirements

The web implementation prepares for mobile through:

- Versioned JSON APIs
- No direct mobile access to PostgreSQL or Redis
- Mobile access/refresh token flow with rotation and revocation
- Secure device-session records
- Idempotency keys for retries
- Incremental/paginated sync endpoints
- Device and push-token registration
- Signed direct media uploads
- Deep-link-safe identifiers
- Tenant and role checks identical to web
- Audit records that identify client/device category where appropriate

## 7. Initial native Android scope

### Participant experience

- OTP login
- My upcoming/live rides
- Ride details, itinerary, starting group, and vehicle
- Booking/payment status
- Official announcements and acknowledgements
- Push notifications
- Guild Hall and Ride Passport
- Optional protected WhatsApp link

### Captain/crew experience

- Assigned participant manifest
- Start/complete group
- Checkpoint check-in
- Group count
- Delay/incident/announcement updates
- Photo uploads
- Last-known authorized crew location
- Offline action queue

Heavy platform administration remains web-first.

## 8. Offline operations

Selected mobile commands use a local queue:

```text
User action
  -> create client idempotency key
  -> persist encrypted/local pending command
  -> submit immediately when online
  -> retry with same key after connectivity returns
  -> show Pending / Synced / Failed state
```

The backend revalidates authorization and ride state when receiving delayed actions. Offline capture never bypasses current server policy.

Conflicting or obsolete actions require explicit resolution rather than silent overwrite.

## 9. Background location

Background location is restricted to authorized crew during an active ride and requires an explicit user action.

Flow:

1. Captain selects `Start sharing ride location`.
2. App provides a prominent disclosure of collection, viewers, purpose, and duration.
3. User grants required foreground/background permission.
4. Android runs an appropriate visible foreground location service.
5. Persistent notification indicates sharing is active.
6. Updates use battery-conscious time/distance thresholds.
7. Sharing stops automatically at group/ride completion and can be stopped manually.
8. Server retention/visibility expires according to policy.

Do not request background location from ordinary participants. Foreground or one-time location is used where sufficient.

Android/Expo constraints include:

- Background permission and service configuration
- Platform/vendor behavior after an app is terminated
- Play Store declaration and review
- Prominent disclosure and privacy policy
- Demonstration of core functionality
- Testing across several manufacturers and power-management modes

## 10. Security

- Tokens stored in OS-backed secure storage
- No long-lived secrets in application bundles
- Device/session revocation
- Certificate/network hardening evaluated before release
- Sensitive offline data minimized and expired
- Screenshot/export restrictions considered for highly sensitive screens only where justified
- Logs redact identity, OTP, payment, and location data
- Rooted/compromised device behavior considered without making unsupported security guarantees

## 11. Android release dependencies

Required only when the wrapper/native phases begin:

- Google Play Console developer account
- Android package/application ID, proposed `in.atride.app`
- Signing key managed by secure build/release infrastructure
- Play App Signing configuration
- Firebase project or selected push provider
- Restricted Google Maps Android key
- App links/deep-link domain verification
- Public privacy-policy and support URLs
- Internal/closed testing groups
- Real devices from several manufacturers
- Background-location declaration and review materials when introduced

These accounts do not block the web phases.

## 12. iOS

iOS is not an initial commitment. React Native/Expo preserves a path to iOS, but release requires separate Apple Developer, notification, signing, permission, testing, and App Store work.

An iOS phase is created only after Android/PWA usage and user demand justify it.

## 13. Acceptance gates

### PWA complete

- Installable on supported Android browsers
- Deep links open the correct tenant/ride
- Safe offline shell/read behavior works
- Updates and logout clear stale sensitive state
- Network retry states are understandable

### Wrapper complete

- Store-distributed build passes login, payment, deep link, upload, and notification testing
- Back navigation and external browser transitions behave correctly
- Wrapper adds measurable value over direct PWA installation

### Native Android approved

- Operational need is proven by web/PWA usage
- API contracts are stable
- Offline conflict rules are defined
- Location purpose and retention policy are approved
- Play policy requirements are understood and budgeted
- Field pilot Guild and devices are available

## 14. References

- React Native: <https://reactnative.dev/docs/getting-started>
- Expo Location: <https://docs.expo.dev/versions/latest/sdk/location/>
- Google Play background location: <https://support.google.com/googleplay/android-developer/answer/9799150>
- Android foreground services: <https://developer.android.com/develop/background-work/services/fgs>
