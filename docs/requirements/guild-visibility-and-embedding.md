# Guild Visibility, Marketplace Participation, and Embedding

This document defines @Ride's two complementary products:

```text
Guild OS
Hosted Guild website + ride operations + bookings + member management

Optional Marketplace
Discovery + featured rides + verified community reviews + participant acquisition
```

Marketplace exposure is optional. A Guild receives the complete operating product even when it chooses not to appear in @Ride discovery.

## 1. Product strategy

The initial reason for a Guild to adopt @Ride is not marketplace audience. It is a ready-made operating platform:

- Branded `{guild}.atride.in` website
- Ride creation and publication
- Multiple origins and ride staff
- Capacity and waitlists
- Registration and bookings
- Community-owned Razorpay
- Offline payment verification
- Participant manifests
- Announcements and notifications
- Optional WhatsApp link
- Checkpoints and progress
- Awards and verified activity history
- Reports and audit history

When @Ride's audience grows, a Guild can optionally list selected Guild/ride content in the marketplace.

## 2. Independent visibility controls

Directory visibility, Guild Hall access, ride access, and indexing are separate settings. Avoid a single `isPrivate` flag.

### 2.1 Directory visibility

```text
LISTED
UNLISTED
```

- `LISTED`: eligible for the root marketplace, location directories, recommendations, trending, and featured placements.
- `UNLISTED`: absent from cross-Guild marketplace discovery.

### 2.2 Guild Hall access

```text
PUBLIC
VERIFIED_USERS
GUILD_MEMBERS
INVITE_ONLY
```

- `PUBLIC`: direct URL can be viewed without login, excluding all member-private sections.
- `VERIFIED_USERS`: requires a verified @Ride session.
- `GUILD_MEMBERS`: requires an accepted membership or qualifying confirmed booking.
- `INVITE_ONLY`: requires an invitation or equivalent access grant.

### 2.3 Ride visibility

Each ride independently supports:

```text
PUBLIC
VERIFIED_USERS
GUILD_MEMBERS
INVITE_ONLY
```

A private Guild may publish a public recruitment ride. A listed Guild may run a private expedition.

### 2.4 Search indexing

```text
INDEXABLE
NOINDEX
```

Indexing is available only where access is public. An unlisted Guild may choose a shareable public website that is either indexable or `noindex`.

Member-only and invite-only content is never indexed.

## 3. Recommended configurations

### Public marketplace Guild

```text
Directory: LISTED
Guild Hall: PUBLIC
Indexing: INDEXABLE
Selected rides: PUBLIC
```

### Unlisted public hosted website

```text
Directory: UNLISTED
Guild Hall: PUBLIC
Indexing: INDEXABLE or NOINDEX
Rides: configured individually
```

The Guild shares `royalravanas.atride.in` directly without appearing in @Ride discovery.

### Private existing Guild

```text
Directory: UNLISTED
Guild Hall: GUILD_MEMBERS
Indexing: NOINDEX
Rides: GUILD_MEMBERS or INVITE_ONLY
```

### Selectively discoverable Guild

```text
Directory: LISTED
Guild Hall: VERIFIED_USERS
Normal rides: GUILD_MEMBERS
Recruitment rides: PUBLIC
```

## 4. Marketplace and tenant boundary

A Guild subdomain never advertises competing Guilds.

```text
royalravanas.atride.in -> Royal Ravanas content only
atride.in              -> optional cross-Guild marketplace
```

An unlisted Guild and its private rides are excluded from:

- Guild directory
- Trending and upcoming marketplace sections
- City/destination marketplace results
- Cross-Guild recommendations
- Featured/promoted inventory unless explicitly opted in
- Public marketplace sitemaps

A Guild cannot prevent a user from independently visiting the root marketplace, but @Ride must not use the Guild's private member/ride data to market competitors.

## 5. Personal data boundary

Visibility of a Guild Hall does not imply visibility of individual people.

- Public Guild Hall: public Guild content only.
- Verified unrelated user: no member directory or newcomer tiles.
- Guild member: consented member sections according to Guild policy.
- Ride staff: operational data for assigned rides only.

Ride Passport, newcomer, and award privacy is defined in [guild-hall-and-reputation.md](guild-hall-and-reputation.md).

## 6. Community review visibility

Verified community reviews follow the Guild's access mode:

- Listed/public Guild: aggregate may be public when enabled.
- Verified-users Guild: aggregate/reviews require login.
- Members-only Guild: visible only to authorized Guild viewers.
- Unlisted Guild: never appears as a marketplace rating.

Once a Guild opts into marketplace review display, it cannot hide only negative reviews. Moderation remains neutral and policy-based.

## 7. Embedding strategy

Embedding is intended to let a Guild reuse selected @Ride content on its existing static website.

### 7.1 Supported public widgets

- Upcoming rides
- Featured ride
- Ride calendar
- Guild summary
- `View ride` or `Book now` button

Example:

```html
<iframe
  src="https://royalravanas.atride.in/embed/upcoming-rides"
  title="Royal Ravanas upcoming rides">
</iframe>
```

The widget may also be offered as a small JavaScript/web-component integration later.

### 7.2 What must not run inside the public iframe

- Login or account recovery
- Authenticated member sections
- Booking checkout
- Payment forms
- Participant manifests
- Ride Passport/member profiles
- Captain/community/platform administration
- Precise live location
- Sensitive uploads

Clicking `View ride`, `Sign in`, or `Book now` opens the appropriate Guild Hall page as a top-level navigation/new tab.

### 7.3 Security

- Guild configures an explicit embed-origin allowlist.
- Widget responses set CSP `frame-ancestors` to approved origins.
- Widgets contain only public or explicitly embeddable data.
- Embed tokens identify configuration; they are not user authorization.
- No third-party authenticated session is required inside the widget.
- Rate limits and origin validation protect widget endpoints.
- Widgets do not leak private Guild inventory through predictable IDs.

Full cross-site application embedding is avoided because browser privacy restrictions can block or partition iframe cookies/storage, and because authentication, payment redirects, uploads, and navigation are less reliable in third-party contexts.

## 8. Branding and white-label levels

### Hosted Guild subdomain

```text
royalravanas.atride.in
```

Guild branding within the @Ride platform frame.

### Embedded widget

Public read-only Guild content inside an existing website. This is co-branded embedding, not complete white-label hosting.

### Custom domain (later)

```text
rides.royalravanas.com
```

True custom-domain delivery uses domain verification, automated TLS, canonical/redirect rules, and the same tenant mapping. It offers first-party authentication and avoids iframe session limitations.

Brand-removal or `Powered by @Ride` policy is a commercial plan decision, not a tenant-isolation decision.

## 9. Canonical and SEO rules

- One canonical public URL per Guild/ride page.
- Widget endpoints are not treated as competing canonical pages.
- Private and non-public embed endpoints use `noindex` as appropriate.
- Custom-domain launch includes redirect/canonical migration rules.
- Unlisted/indexable Guilds can gain direct SEO without entering the root marketplace.
- Marketplace location pages contain only opted-in listed content.

## 10. Conceptual model

```text
CommunityVisibilitySettings
- communityId
- directoryVisibility
- guildHallAccess
- searchIndexing
- reviewVisibility
- defaultRideVisibility
- updatedBy
- updatedAt

EmbedConfiguration
- id
- communityId
- widgetType
- theme
- allowedOrigins
- contentVisibility
- active
- createdBy
- updatedAt
```

Ride visibility remains stored on each ride rather than inherited irreversibly from the Guild default.

## 11. Acceptance criteria

- An unlisted Guild never appears in root marketplace queries or sitemaps.
- A public unlisted Guild remains reachable by direct URL.
- A private Guild requires the correct relationship or invitation.
- A Guild subdomain never shows another Guild's schedule or promotion.
- Anonymous users receive no member-level data regardless of Guild Hall mode.
- Public widgets contain only explicitly embeddable data.
- Unapproved websites cannot frame a protected widget.
- Login, booking, payment, and administration leave the iframe/top-level navigate.
- Custom domains can later reuse the same tenant mapping without duplicating business data.

## 12. Reference considerations

- Browser storage restrictions for third-party embeds: <https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API>
- Controlling allowed iframe parents with CSP: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors>
- Google canonical guidance: <https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls>
