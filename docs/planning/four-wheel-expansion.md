# Four-Wheel Trip Expansion Considerations

This document identifies the product, data, operational, and compliance work required before @Ride enables full car, SUV, Jeep, 4×4, overlanding, or cross-border expedition support.

It is not part of the initial bike-first MVP unless a roadmap phase explicitly adopts an item. The core model remains vehicle-neutral so this expansion does not require replacing identity, tenancy, booking, payment, or checkpoint foundations.

## 1. Product position

Recommended position:

> @Ride supports organized road-adventure communities. The initial experience is optimized for bikes, with four-wheel expedition support enabled after pilot validation.

The platform should not become a generic taxi, rental-car, or holiday-package marketplace. Four-wheel support remains focused on community-led convoys, road trips, off-road groups, and expeditions.

Potential categories:

- Car road trips
- SUV convoys
- Jeep clubs
- 4×4 expeditions
- Off-road adventures
- Overlanding trips
- Cross-border road expeditions
- Mixed-vehicle convoys

## 2. Rollout strategy

### Stage A: Vehicle-neutral foundation

Included from the beginning:

- Generic `Vehicle` record
- Explicit ride `vehicleType`
- `BIKE` as the ride-creation default
- Generic participant identity
- Extensible occupant roles
- Pricing unit field
- Vehicle-aware capacity foundation

The bike UI can expose only rider/pillion fields while the stored model remains explicit and generic.

### Stage B: Four-wheel pilot

Enable one verified car/4×4 community with a constrained feature set:

- One supported vehicle category per ride
- Participant-owned vehicles
- Driver and passenger roles
- Per-person or per-vehicle price
- Seating capacity
- Drive type and basic vehicle requirements
- Standard convoy groups and checkpoints

The pilot should use real organizers and at least one end-to-end test trip before broader marketplace release.

### Stage C: General four-wheel availability

Enable after pilot findings are incorporated:

- Car/SUV/Jeep filters and landing pages
- Co-driver support
- More detailed equipment and eligibility policies
- Per-seat booking
- Vehicle/team manifests
- Vehicle-aware room allocation
- Four-wheel-specific organizer templates

### Stage D: Advanced expeditions

- Organizer-provided vehicles
- Mixed participant-owned and organizer-provided fleets
- Mixed bike and four-wheel convoys
- Cross-border document workflows
- Complex permit and insurance requirements
- Recovery vehicle and support-team operations

## 3. Terminology

Internal data terms should remain neutral, while the UI adapts to the selected vehicle type.

| Neutral term | Bike UI | Four-wheel UI |
| --- | --- | --- |
| Participant | Rider/Pillion | Driver/Co-driver/Passenger |
| Vehicle | Bike/Motorcycle | Car/SUV/Jeep/4×4 |
| Group | Riding group | Convoy |
| Group leader | Captain | Convoy lead/Captain |
| Rear support | Sweep | Sweep vehicle |
| Ride | Ride | Trip/Expedition |
| Starting group | Start group | Convoy/start group |

`Ride` remains the @Ride umbrella term and public URL convention. Context-specific labels should not require different authorization or booking services.

## 4. Vehicle model

### 4.1 Base vehicle information

- Vehicle type/category
- Manufacturer and model
- Registration number
- Registration jurisdiction
- Manufacturing year
- Ownership type
- Fuel type
- Seating capacity
- Images

### 4.2 Capability information

- Drive type: 2WD, AWD, or 4WD
- Ground clearance
- Fuel range
- Transmission type
- Tow points
- Winch availability
- Recovery equipment
- Spare wheel count
- Communication equipment
- Roof/load configuration

Not all fields should be mandatory. Each expedition defines the minimum required subset.

### 4.3 Documents

Potential documents include:

- Registration certificate
- Insurance
- Pollution certificate
- Owner authorization when the driver is not the owner
- Driving licence
- International/cross-border permits
- Local entry permits

Before adding document uploads, define necessity, verification responsibility, encryption, access, expiry reminders, retention, and deletion. Free-form sensitive document collection should not be enabled casually.

## 5. Participant and occupant model

Four-wheel bookings may involve a team rather than one person and one vehicle.

Roles:

```text
DRIVER
CO_DRIVER
PASSENGER
CHILD_PASSENGER (only if product/legal policy supports it)
CREW
```

Questions to resolve:

- Can a driver participate without owning the vehicle?
- Can occupants join or leave at different points?
- Can one booking contain several vehicles?
- Can passengers book seats without knowing the driver?
- Is a verified driver mandatory before confirmation?
- How are emergency contacts represented for multiple occupants?
- Are minors permitted, and under what guardian workflow?

The MVP should avoid minors and organizer-provided seats until policies and operational responsibilities are explicit.

## 6. Booking units and pricing

Four-wheel trips may price by:

```text
PER_PERSON
PER_VEHICLE
PER_SEAT
PER_TEAM
PER_ROOM
```

Examples:

- Expedition fee per vehicle, occupants charged separately for accommodation
- Flat fee per vehicle including two occupants
- Per-seat fee in an organizer-provided SUV
- Room supplement independent of vehicle entry
- Support/recovery fee per vehicle

Required decisions:

- Which occupants are included in a per-vehicle price?
- How are extra occupants charged?
- Does vehicle capacity consume trip capacity, person capacity, or both?
- What happens when an occupant is replaced?
- Can a vehicle transfer its booking to another eligible vehicle?
- How do refunds apply to vehicle and occupant components?

Price and inclusion snapshots remain immutable after booking confirmation.

## 7. Capacity model

Four-wheel trips need at least two capacity dimensions:

- Maximum vehicles
- Maximum people

Additional limits may include:

- Maximum vehicles per starting convoy
- Maximum seats offered by organizers
- Room/bed capacity
- Vehicle-type quota
- Recovery/support ratio

A booking must atomically reserve every required capacity dimension. It must not confirm a vehicle while failing to reserve its occupants or accommodation.

## 8. Ride creation changes

When `vehicleType` is `CAR`, `SUV`, or `JEEP`, the ride-creation screen can reveal:

- Allowed type(s)
- Required drive type
- Minimum ground clearance
- Minimum fuel range
- Occupant limits
- Vehicle and person capacity
- Driver eligibility
- Required recovery equipment
- Required vehicle documents
- Per-vehicle/per-seat pricing
- Convoy-specific instructions

The form should use progressive disclosure. Bike organizers should not see four-wheel-only fields, and four-wheel organizers should not be forced through pillion or engine-capacity questions that do not apply.

## 9. Convoy operations

Four-wheel-specific operational needs may include:

- Vehicle/convoy number
- Lead vehicle
- Sweep/recovery vehicle
- Convoy spacing guidance
- Radio/channel assignment
- Vehicle occupancy manifest
- Fuel-range planning
- Breakdown/recovery status
- Tow or mechanical-support request
- Road closure/diversion handling
- Vehicle-level checkpoint counts

The existing group, captain, route, checkpoint, merge, delay, incident, and last-known-location features should be reused.

## 10. Accommodation and room allocation

Four-wheel groups may travel as couples, families, or vehicle teams. Requirements may include:

- Keep occupants from one vehicle together
- Couple/family rooms
- Driver-only or shared-driver rooms
- Child occupancy rules
- Vehicle-team room preference
- Room upgrades and supplements

Room inventory should not be mixed implicitly with ride capacity. It is a separate constrained resource tied to pricing/add-ons.

## 11. Organizer-provided vehicles

This model is significantly more complex than participant-owned vehicles.

Questions:

- Is @Ride facilitating seat booking or transportation?
- Who owns and operates the vehicle?
- Who verifies drivers, permits, insurance, and fitness?
- How are seats allocated?
- What happens after a vehicle breakdown?
- Who is responsible for replacement transport?
- Are pickup/drop-off points contractual itinerary items?

Organizer-provided vehicles should remain disabled until legal, insurance, operational, and refund responsibilities are reviewed.

## 12. Mixed-vehicle trips

Mixed bike and four-wheel convoys introduce:

- Different speeds and route suitability
- Separate group leaders and sweeps
- Different fuel ranges and stop schedules
- Different eligibility and equipment rules
- Separate capacities and pricing
- Shared versus separate checkpoints
- Support vehicles that are crew rather than bookable participants

The generic group model can support separate groups that merge at selected points. Mixed trips should still be treated as an advanced feature and tested with an experienced organizer.

## 13. Cross-border expeditions

Trips to Nepal or other countries can add:

- Passport/identity requirements
- Visas where applicable
- Temporary vehicle permits
- Customs or border documentation
- International driving requirements
- Cross-border vehicle insurance
- Currency and tax considerations
- Roaming/connectivity limitations
- Country-specific emergency contacts
- Document validity and expiry

The first version can present organizer-authored requirements and acknowledgements. Structured document verification should be added only after legal/operational review and a real use case.

## 14. Discovery and SEO

Four-wheel enablement adds filters and pages such as:

```text
/rides/4x4
/rides/suv-expeditions
/rides/overlanding
/destinations/himalayas
```

Only create indexable pages when they contain meaningful, original inventory and content. Vehicle filters should use canonical URLs deliberately to avoid generating large numbers of thin combinations.

Possible search terms should appear naturally, including car road trips, SUV convoys, 4×4 expeditions, Jeep clubs, off-road adventures, and overlanding communities.

## 15. Safety and privacy

- Vehicle documents and occupant manifests are private.
- Exact convoy location is restricted to confirmed participants and staff.
- Emergency and medical information remains person-scoped.
- Recovery/incident reports are access-controlled.
- Organizer instructions must not imply that @Ride guarantees route, vehicle, or driver safety.
- Required safety policies should be reviewed with experienced four-wheel organizers.

## 16. Analytics for the pilot

Measure:

- Community onboarding completion
- Ride-creation abandonment by field/step
- Vehicles and people per booking
- Pricing-unit usage
- Capacity errors or manual adjustments
- Document-support requests
- Payment and refund issues
- Checkpoint/update usage
- Organizer and participant satisfaction
- Features handled outside @Ride through spreadsheets or messaging

Pilot feedback should decide which advanced fields become permanent.

## 17. Enablement checklist

Before enabling a four-wheel vehicle type publicly:

- [ ] At least one verified pilot community is committed
- [ ] Participant and vehicle models support the selected scenario
- [ ] Driver/passenger roles and permissions are tested
- [ ] Per-person/per-vehicle pricing behavior is defined
- [ ] Vehicle and person capacity are transaction-safe
- [ ] Ride creation exposes only relevant fields
- [ ] Booking confirmation produces an accurate manifest
- [ ] Refund and occupant-change policies are defined
- [ ] Convoy captain/sweep workflow is field-tested
- [ ] Sensitive vehicle documents have an approved policy, or are not collected
- [ ] Discovery labels and SEO pages are ready
- [ ] Support and incident runbooks cover the new mode
- [ ] Cross-tenant and authorization tests include four-wheel fixtures

## 18. Explicitly out of the bike-first MVP

- Organizer-provided paid transport
- Marketplace seat pooling between strangers
- Minor/guardian booking workflows
- Cross-border document verification
- Mixed bike/four-wheel convoys
- Recovery-service guarantees
- Vehicle rental marketplace features
- Complex family/room allocation

These exclusions preserve launch focus while keeping the architecture extensible.
