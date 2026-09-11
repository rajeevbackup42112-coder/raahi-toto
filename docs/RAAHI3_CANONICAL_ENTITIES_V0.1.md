# Raahi 3 Canonical Entities v0.1

Status: Product-model baseline. No database schema is implied yet.

This document follows the Raahi 3 Rulebook and applies one simplification test repeatedly: **if something can safely be represented as state/history on another entity, do not create a separate domain entity for it.**

## 1. Accepted canonical entities

### 1. User
Represents one human identity authenticated by mobile OTP.

Why it exists:
- One person may be a passenger, driver, or admin.
- Identity should not be duplicated by market or role.

Important product facts:
- Any authenticated user may act as a passenger unless restricted.
- Driver capability comes from an associated Driver record.
- Admin capability comes from an Admin Assignment.

Not separate entities in V1:
- Passenger Profile: unnecessary unless we later discover passenger-specific state that has its own lifecycle.
- User Role: generic role rows are not required for passenger/driver behaviour; only scoped admin authority needs an explicit assignment entity.

### 2. Driver
Represents the user's driver-specific identity and operational eligibility.

Why it exists:
- Driver verification/suspension/history differs from ordinary user identity.
- One user should have at most one Driver identity.

Examples of remembered facts:
- driver status
- onboarding/verification state
- suspension state/reason
- operational preferences only if they later become necessary

### 3. Vehicle
Represents a physical vehicle belonging to or operated by a driver.

Why it exists:
- A driver may have multiple approved vehicles over time.
- Capacity/type/registration have their own identity and history.

Core concepts:
- vehicle category, e.g. E_RICKSHAW or CAR
- local display name may be ToTo / E-Rickshaw
- seating capacity
- approval/active state

Rule:
- One driver may have multiple vehicles, but only one active vehicle may participate in supply at a time.

### 4. Market
Represents one independently operated Raahi service area, e.g. Gomoh or Dhanbad.

Why it exists:
- Local admins configure rules by market.
- Pricing, payments, vehicle availability, service geography, and operating hours can differ by market.

Important rule:
- A ride request receives one origin Market at creation and keeps that ownership for its lifetime.

### 5. Zone
Optional subdivision inside a Market.

Why it exists:
- Small markets may use one default zone.
- Large markets can divide geography without creating different matching engines.

Examples:
- Station area
- Bank More
- Airport area

Rule:
- Zone affects geography/eligibility, not the fundamental ride lifecycle.

### 6. Pickup Point
A designated real-world boarding point with coordinates and a human-friendly label.

Why it exists:
- Stations, malls, airports, hospitals, etc. may have legal/practical pickup gates that differ from raw GPS.

Examples:
- Gomoh Station Main Exit
- ToTo Stand
- Mall Gate B

Rule:
- Pickup Point is optional; ordinary GPS/manual pins still remain valid when market policy allows them.

### 7. Driver Market Authorization
Relationship entity connecting Driver and Market.

Why it exists:
- A driver may be approved in multiple markets.
- Being physically present in a market does not automatically grant permission to serve it.

Possible lifecycle later:
- PENDING
- ACTIVE
- SUSPENDED
- EXPIRED

Rule:
- Matching requires both geographic eligibility and active market authorization.

### 8. Admin Assignment
Represents scoped administrative authority granted to a User.

Why it exists:
- Global and local admin permissions have independent lifecycle/history.
- Admin permissions should not be inferred from UI or duplicated user accounts.

V1 scopes:
- GLOBAL
- MARKET

Possible future scope:
- REGION

Rules:
- Local admin can manage only assigned market scope.
- Global admin can create/revoke local admin assignments and has platform-wide governance access.

### 9. Market Policy Version
Represents an immutable published configuration version for a Market.

Why it exists:
- Pricing/payment/matching behaviour changes over time.
- Active rides/requests must remain explainable after settings change.

Policy content may include:
- enabled vehicle types
- fare rules
- payment mode
- operating hours
- proximity tiers
- response/negotiation timeout rules
- cancellation/cooldown rules
- service-area restrictions
- commercial terms when applicable

Important distinction:
- Commercial certainty is snapshotted onto a request/ride.
- Operational matching settings may be re-read while a request is still waiting when the Rulebook allows it.

Implementation note:
- Whether policy categories later become separate DB tables is a database-design decision, not a product-entity decision yet.

### 10. Ride Request
Represents one passenger's active demand for transport.

Why it exists:
- It has its own identity, lifecycle, queue priority, journey details, fare resolution inputs, and history.

This entity also acts as the passenger-side queue item.

Core facts:
- passenger/user
- origin market
- pickup and destination
- requested vehicle category/capacity
- road distance when resolved
- pricing mode
- fixed fare or passenger offer
- policy snapshot references/resolved values
- priority_at
- request status

Key simplification:
- **No separate Passenger Queue Entry entity.**
- The Ride Request itself is what waits, engages, expires, or is cancelled.

### 11. Driver Availability
Represents one driver's current supply participation.

Why it exists:
- Online/offline, location freshness, active vehicle, queue priority, and engagement availability belong to one operational concept.

This entity also acts as the driver-side queue item.

Core facts:
- driver
- active vehicle
- current coordinates/current market resolution
- status
- priority_at
- location_last_seen_at
- entered_supply_at

Key simplification:
- **No separate Driver Queue Entry entity.**
- Driver Availability itself is the supply record used by matching.

Important rule:
- A driver may have at most one active Driver Availability record.

### 12. Engagement
Represents one temporary, exclusive Passenger Request ↔ Driver pairing.

Why it exists:
- Both parties must be locked away from other matches while a fare/acceptance decision is being resolved.
- Fixed-fare and negotiated rides can use the same concept.

Core facts:
- ride_request
- driver availability/driver
- status
- pricing mode
- passenger offer when relevant
- immutable driver counteroffer when relevant
- awaiting_party
- expires_at
- resolution reason
- created/resolved timestamps

Rules:
- At most one active Engagement per passenger request.
- At most one active Engagement per driver.
- Submitted counteroffers are immutable.
- A failed engagement may return both sides to waiting according to fault/priority rules.

Key simplification:
- **No separate Quote entity.** One-round negotiation belongs inside Engagement.
- **No separate Pair Cooldown entity initially.** Recent failed engagement history can determine temporary rematch exclusion.

### 13. Ride
Represents the agreed transport transaction after an Engagement succeeds.

Why it exists:
- Once both parties agree, journey execution has a different lifecycle from matching/negotiation.

Core facts:
- passenger
- driver
- vehicle
- market
- pickup/destination snapshot
- agreed fare
- pricing mode
- policy/commercial snapshots
- ride lifecycle state
- arrival/start/completion timestamps

Important simplification:
- **No separate Booking entity.** Successful Engagement creates one Ride.

### 14. Payment
Represents the passenger-side payment obligation/transaction for a Ride.

Why it exists:
- Payment has its own lifecycle and can succeed/fail/dispute independently of ride completion.

Modes supported by market policy:
- DIRECT_TO_DRIVER
- RAAHI

Important rule:
- Ride completion and payment state are separate state machines.

Examples:
- Direct payment can be completed ride + payment unconfirmed/disputed.
- Raahi payment can be pending/successful/failed while ride state remains independently canonical.

### 15. Driver Settlement
Represents money Raahi owes/pays to the driver when Raahi collects passenger payment.

Why it exists:
- Passenger collection and driver payout are different financial obligations with different failure/retry lifecycles.

V1 boundary:
- Required only when PAY_RAAHI becomes a real money flow.
- Can remain unused in direct-to-driver markets.

Rule:
- Settlement failure must never change a completed Ride back into an earlier ride state.

### 16. Audit Event
Immutable record of consequential system/admin/business events.

Why it exists:
- We need to reconstruct what happened without allowing admins to edit history.

Examples:
- REQUEST_CREATED
- DRIVER_BECAME_AVAILABLE
- ENGAGEMENT_CREATED
- DRIVER_PASSED
- ENGAGEMENT_EXPIRED
- RIDE_CONFIRMED
- RIDE_STARTED
- RIDE_COMPLETED
- POLICY_PUBLISHED
- ADMIN_EXCEPTION_USED
- PAYMENT_CONFIRMED

Rule:
- Audit/Event history explains decisions; it does not become the primary mutable state store for V1.

## 2. Explicitly NOT separate canonical entities in V1

### Passenger Queue Entry
Rejected.
Reason: Ride Request already has identity, priority, lifecycle and queue status.

### Driver Queue Entry
Rejected.
Reason: Driver Availability already represents supply participation and priority.

### Booking
Rejected.
Reason: Engagement agreement creates Ride directly.

### Quote
Rejected.
Reason: one-round structured negotiation lives inside Engagement.

### Cancellation
Rejected.
Reason: cancellation is a state transition with reason/actor plus audit history, not an independent business object yet.

### Pair Cooldown
Rejected for now.
Reason: can be derived from recent failed Engagement history; add only if performance/complexity proves it needs materialized state.

### Match Attempt
Rejected for now.
Reason: successful matching produces Engagement; failed attempts are implementation/logging concerns unless analytics later require durable identity.

### Route
Rejected.
Reason: route/distance data belongs to the Ride Request/Ride snapshot. We do not need a reusable route business object yet.

### Generic Location
Rejected.
Reason: coordinates and labels belong to Request/Availability/Pickup Point. A generic Location table would add abstraction without current business value.

### Notification
Rejected as a domain entity.
Reason: notification delivery is infrastructure. Canonical truth remains in server state.

### Region
Deferred.
Reason: Global → Market is sufficient for V1. Add Region when real multi-market operational hierarchy demands it.

### Incentive / Promotion / Loyalty
Deferred.
Reason: intentionally out of Raahi 3 V1 because they introduce fraud and accounting complexity.

### Rating / Review
Deferred.
Reason: not required for core matching. If introduced, prefer simple structured feedback before a complex reputation system.

## 3. Canonical relationships

- User 1 → 0..1 Driver
- User 1 → many Ride Requests
- User 1 → many Admin Assignments over time
- Driver 1 → many Vehicles
- Driver many ↔ many Markets through Driver Market Authorization
- Market 1 → many Zones
- Zone 1 → many Pickup Points
- Market 1 → many Market Policy Versions
- Ride Request belongs to exactly 1 User and 1 origin Market
- Ride Request → many Engagements sequentially, but at most 1 active
- Driver → at most 1 active Driver Availability
- Driver Availability → many Engagements sequentially, but at most 1 active
- Successful Engagement → at most 1 Ride
- Ride → 0..many Payment attempts/records, with one canonical passenger payment outcome
- Ride → 0..many Driver Settlement attempts/records when payment mode requires Raahi settlement
- Any consequential entity/action → many Audit Events

## 4. Matching view of the model

Passenger side:

`Ride Request (WAITING, priority_at)`

Driver side:

`Driver Availability (AVAILABLE, priority_at)`

Matcher:

`Market eligibility → Driver Market Authorization → vehicle/capacity compatibility → geographic/proximity pool → FIFO by priority_at → Engagement`

This means the architecture does **not** need four physical queue systems for:
- ToTo passengers
- Car passengers
- ToTo drivers
- Car drivers

They are filtered logical queues over two canonical operational entities:
- Ride Request
- Driver Availability

## 5. Why this model is simpler

The whole operational path can be represented as:

`User → Ride Request → Engagement → Ride → Payment`

and on the supply side:

`User → Driver → Vehicle → Driver Availability → Engagement → Ride`

with Market/Policy/Authorization deciding what is permitted.

This intentionally removes several concepts that commonly create duplication:
- passenger_queue table as a second copy of request state
- driver_queue table as a second copy of availability state
- booking between engagement and ride
- quote rows for a one-counter negotiation
- cancellation rows for every failure

## 6. Decisions still intentionally open

These are not entity blockers and should be decided when we define lifecycles/invariants:

1. Exact Ride Request statuses.
2. Exact Driver Availability statuses, especially ONLINE vs LOCATION_STALE vs AVAILABLE.
3. Exact Engagement statuses and timeout ownership.
4. Fixed-fare driver acceptance model: explicit Accept/Pass vs possible future auto-assignment.
5. Exact passenger/driver fault consequences and cooldown duration.
6. Whether a materially changed waiting request reuses the same Request identity with versioning or closes and creates a replacement Request.
7. Whether payment attempts are rows under one Payment intent or whether Payment itself is one attempt; resolve during financial model design.
8. Whether Driver Settlement is V1 production scope or deferred until Raahi collection is enabled in a live market.
9. Driver/vehicle credential entities for formal verification; add when onboarding requirements are frozen.
10. Whether market policy is implemented as one versioned bundle or typed policy-version tables.

## 7. Entity acceptance test

Before adding any future entity, ask:

> Does this thing have its own identity, lifecycle, history, permissions, or independent business meaning that cannot safely live on an existing entity?

If the answer is no, do not create it.

## 8. Next step

Do not design tables yet.

Next define independent state lifecycles for:
- Ride Request
- Driver Availability
- Engagement
- Ride
- Payment
- Driver Market Authorization
- Market

Then freeze invariants across those lifecycles before database design.