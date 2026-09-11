# Raahi 3 Rulebook v0.1

**Status:** Product-law baseline  
**Purpose:** Freeze the business rules and invariants that Raahi 3 should obey before entity design, database design, APIs, or implementation.  
**Scope:** Passenger, driver, local admin, global admin, pricing, matching, FIFO, geography, engagement, ride, payment, failure handling, and multi-market expansion.

---

## 1. Product North Star

Raahi 3 is a **local ride-matching engine governed by market-specific policies**.

The core transaction should remain the same in every location:

**Request → Eligibility → Proximity Pool → FIFO → Exclusive Engagement → Fare Resolution → Ride → Payment**

Location-specific complexity should live mainly in configuration and policy, not in separate code paths.

### Foundational design law

> A location may change configuration, geography, pricing and eligibility, but it should not change the fundamental ride lifecycle.

### Simplicity law

Whenever a new requirement appears, first ask:

> Can this be expressed as configuration, eligibility, geography, priority, timeout, or a state transition instead of creating a new workflow?

Only create a new subsystem when those mechanisms are genuinely insufficient.

---

## 2. Canonical User Journey

The default passenger journey is:

1. Passenger selects pickup.
2. Passenger selects destination.
3. Passenger selects vehicle type: ToTo or Car.
4. For Car, passenger selects required capacity when needed.
5. Raahi determines the origin market.
6. Raahi calculates journey distance/routing data.
7. Market policy determines fare mode: **FIXED** or **NEGOTIATED**.
8. Passenger joins the appropriate demand queue.
9. Raahi finds one compatible driver using proximity-gated FIFO.
10. Passenger and driver enter one exclusive engagement.
11. Fare is resolved.
12. Ride is confirmed.
13. Driver travels to pickup.
14. Ride starts.
15. Ride completes.
16. Payment is completed or recorded according to the market payment policy.

The default driver journey is:

1. Driver signs in.
2. Driver selects an approved active vehicle.
3. Driver goes Online.
4. Current location makes the driver eligible for nearby requests in authorised markets.
5. Driver receives at most one active engagement.
6. Driver Accepts, Counters when negotiation is allowed, or Passes.
7. On agreement, driver performs the ride.
8. After completion, driver can automatically return to available supply if still Online and eligible.

---

## 3. Product Hierarchy

Raahi should conceptually support:

**Raahi → Region → Market → Zone → Pickup Point**

Not every deployment needs every layer.

### Region
Administrative grouping such as Jharkhand. Primarily useful later for reporting, defaults, and regional permissions.

### Market
The primary operating/business unit, such as Gomoh or Dhanbad.

A market can define:

- enabled vehicle types
- service geography
- fare policy
- payment policy
- operating hours
- proximity/search policy
- local admins
- commercial rules
- driver requirements

### Zone
Optional smaller geographic area inside a market. Useful when one market becomes too large for one undifferentiated matching pool.

### Pickup Point
A designated real-world boarding location, especially useful at railway stations, airports, malls, hospitals, schools, and bus stands.

### Market ownership rule

The **origin/pickup market owns the request** and its commercial policy for the full transaction.

Crossing into another market during the ride does not switch the request to another market's policy.

---

## 4. Vehicle Model

Raahi 3 initially supports:

- **ToTo**
- **Car**

Vehicle category and display name should be separate concepts so that the same internal category may be called ToTo, E-rickshaw, Auto, etc. in different markets.

For Cars, passenger-required capacity must be part of compatibility.

A driver may have multiple approved vehicles, but:

> A driver has only one active vehicle while Online.

A driver may not change the active vehicle while queued, engaged, or on a ride.

---

## 5. Queue Model

Raahi should conceptually behave as if it has four logical FIFOs:

- Passenger → ToTo
- Driver → ToTo
- Passenger → Car
- Driver → Car

These do **not** need to be four separate physical systems.

A common passenger queue and common driver queue can use attributes such as:

- market
- vehicle type
- zone/location
- capacity requirement/capability
- joined time
- priority time
- status

### Queue status

The core queue lifecycle is:

**WAITING → ENGAGED → CONFIRMED**

or, after a failed engagement:

**WAITING → ENGAGED → WAITING**

### Stable priority

FIFO priority should be represented by a stable concept such as `priority_at`.

If an engagement fails without fault by the participant, that participant can return to WAITING while preserving original priority.

If the participant materially changes the request or deliberately causes cancellation, their priority can reset according to policy.

---

## 6. Matching Principle

The canonical matching order is:

**Market → Vehicle Compatibility → Geographic Eligibility → Proximity Tier → FIFO → Exclusive Engagement**

### Core matching law

> Geography determines the reasonable candidate pool. FIFO determines the winner inside that pool.

Raahi must use neither pure global FIFO nor pure nearest-driver matching.

### Example

If one driver is 7 km away and another is 1 km away, only the 1 km driver may be in the first proximity tier.

If two drivers are both inside the same 3 km tier, the driver with the older queue priority wins even if one is 300 m away and the other is 1 km away.

### Compatibility always precedes FIFO

A 4-seat car is not eligible for a passenger requiring 6 seats.

Skipping an incompatible driver does not remove or reset that driver's FIFO position.

---

## 7. Proximity Policy

Each market and vehicle type may configure proximity tiers.

Example:

- Tier 1: within 3 km
- Tier 2: within 5 km after a delay
- Tier 3: within 8 km after another delay

The exact values are market policy, not hardcoded product rules.

### Search expansion

If no eligible driver exists in the first tier, Raahi can expand outward automatically.

Older passenger requests should be allowed broader search over time so that they do not starve indefinitely.

### Current position matters

Driver eligibility uses the driver's **current usable location at matching time**, not the place where they originally joined the pool.

The driver may keep their FIFO priority while moving, but may enter or leave a particular passenger's candidate pool as geography changes.

### Future flexibility

The architecture should permit proximity to be defined later by ETA instead of distance in markets where road time is more meaningful.

V1 can use road-route distance.

---

## 8. Driver Market Authorisation

A driver has:

- one Raahi identity
- one home market if useful operationally
- zero or more authorised markets
- one current location
- one active vehicle
- at most one active queue position
- at most one active engagement

Being physically present in a market does not automatically authorise a driver to operate there.

If a driver completes a ride in another market and is authorised there, they may become eligible for that market's nearby demand.

If not authorised, they remain unavailable for new matching there.

---

## 9. Passenger Market Determination

The passenger should not need to understand market boundaries.

Raahi resolves the pickup coordinate or designated pickup point to one canonical market.

If market polygons overlap, the platform must still resolve the pickup deterministically to exactly one owning market.

The resolved origin market is frozen on request creation.

---

## 10. Fare Modes

Raahi 3 has only two core fare modes:

- **FIXED**
- **NEGOTIATED**

The market fare policy decides which mode applies.

### Example ToTo policy

- distance ≤3 km → ₹50 FIXED
- distance >3 km and ≤5 km → ₹100 FIXED
- distance >5 km → NEGOTIATED

Boundaries must always be explicit.

### Fixed means fixed

When a fare is FIXED:

- passenger cannot offer less
- driver cannot counter
- driver may Accept or Pass
- traffic changes do not reopen negotiation
- normal route variation does not reopen negotiation

### Negotiation

Negotiation should be deliberately bounded:

**Passenger Offer → Driver Accept / Counter / Pass → Passenger Accept / Decline**

No endless bargaining loop is required for V1.

A submitted counteroffer is immutable.

### Negotiation failure

If agreement is not reached:

- engagement closes
- eligible participants return to queue according to fault/priority rules
- the same passenger-driver pair receives a temporary rematch cooldown

---

## 11. Pair Cooldown

A failed passenger-driver pair should not immediately rematch.

Example:

Priya offers ₹180. Ravi counters ₹220. Priya declines.

Without a pair cooldown, FIFO could pair Priya and Ravi again immediately.

Raahi therefore records a temporary pair exclusion, for example 5 minutes.

During the cooldown:

- Priya can match another eligible driver
- Ravi can match another eligible passenger

The pair cooldown is temporary and should not permanently blacklist either person.

---

## 12. Exclusive Engagement

The moment passenger and driver are matched, they enter one **exclusive engagement**.

Both leave the available FIFO while the engagement is active.

### Cardinal invariant

> A passenger can have at most one active engagement, and a driver can have at most one active engagement.

This should ultimately be enforced at the database level.

### Engagement purposes

The engagement owns:

- passenger
- driver
- request
- fare mode
- passenger offer if applicable
- driver counter if applicable
- awaiting party
- expiry time
- status

### Engagement timeout

Temporary engagements must self-heal.

An active engagement can carry:

- `awaiting_party = DRIVER` or `PASSENGER`
- `expires_at`

When the timeout expires, the engagement moves to EXPIRED once.

No separate state machine is needed for every timeout type.

---

## 13. Fairness and Fault Rules

The general fairness principle is:

> The participant who did nothing wrong should not lose their place because of the other party's failure.

Examples:

### Driver cancels after accepting

- passenger preserves queue priority
- driver receives fresh/lower priority or cooldown according to policy

### Passenger cancels after accepting

- driver preserves queue priority
- passenger's next request receives fresh priority

### Genuine negotiation disagreement

- neither party is considered at fault
- both may preserve queue priority
- pair cooldown prevents immediate rematch

### System/network failure

- do not punish either party automatically
- restore canonical state based on server truth

### No-show

No-show consequence belongs to the absent party.

---

## 14. Pass and Rejection Behaviour

Drivers must be allowed to Pass. Raahi should not force a driver to accept work.

However, a driver should not be able to remain permanently at the front of FIFO while passing every undesirable ride.

Repeated voluntary Passes may cause:

- short cooldown
- reduced immediate priority
- "Still available?" confirmation
- temporary removal from supply if the driver appears inactive

The exact policy may be market-configurable.

### Market signal versus individual abuse

High rejection across many drivers may indicate a bad fare policy rather than bad drivers.

Admin analytics must distinguish widespread market rejection from isolated individual behaviour.

---

## 15. Passenger Declines

Passenger may decline a matched driver or counteroffer.

Repeated passenger-caused declines should not allow indefinite reservation of FIFO priority.

After repeated declines, Raahi may:

- reset priority
- ask whether the passenger is still searching
- pause/expire the request

Exact thresholds can remain configurable later.

---

## 16. Material Request Changes

Not every passenger edit should be treated the same.

### Minor correction

Examples:

- move pickup pin 100–200 m
- select another gate of the same station

May preserve FIFO priority if fare/eligibility is materially unchanged.

### Material change

Examples:

- ToTo → Car
- 4-seat → 7-seat requirement
- 2 km destination → 9 km destination
- change that switches fare mode
- large pickup relocation

A material change should generally reset queue priority because it changes the competitive class of the request.

This prevents queue gaming.

---

## 17. Ride Lifecycle

The standard ride lifecycle should remain short:

**CONFIRMED → DRIVER_EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED**

Exceptional terminal outcomes include:

- CANCELLED
- NO_SHOW
- INTERRUPTED

### Ride start

Once IN_PROGRESS, normal pre-trip cancellation should no longer apply.

### Ride completion

Completed should be terminal for the normal lifecycle.

Admin/support correction, if ever needed, must be an explicit exception command with audit, not direct state editing.

---

## 18. Arrival and No-show

Driver should only be able to meaningfully claim ARRIVED when geographically near the pickup, subject to a reasonable tolerance.

After ARRIVED:

- start a configurable passenger grace period
- if passenger is absent after the grace period, driver can mark no-show

No-show must not be claimable while the driver is still far away.

GPS failure should permit bounded operational exceptions so legitimate rides are not stranded because of one missing location update.

---

## 19. Driver Online State and Location Health

Driver Online/Offline and GPS health are different concepts.

A driver may be:

- ONLINE + location fresh → eligible
- ONLINE + location stale → temporarily ineligible
- OFFLINE → unavailable

A stale location must not produce a new match.

Short network interruptions should not necessarily destroy FIFO priority.

Longer inactivity can eventually require fresh re-entry according to policy.

---

## 20. Payment Modes

Each market can configure one of two payment modes:

- **DIRECT_TO_DRIVER**
- **PAY_RAAHI**

The payment mode is snapshotted onto the request/ride.

### Direct to Driver

Passenger pays the driver.

Driver may confirm payment received.

A payment dispute must not leave a physically completed ride stuck forever in IN_PROGRESS.

Ride completion and payment resolution are separate concerns.

### Pay Raahi

Passenger pays Raahi **after the Ride is COMPLETED**.

The Ride must not wait for prepayment, and payment failure after completion must not move the Ride back to an earlier lifecycle state.

Raahi handles driver settlement separately.

Passenger payment and driver settlement are separate financial records/concepts.

### Payment principle

> Ride lifecycle and payment lifecycle must not be the same state machine.

---

## 21. Commercial Policy Snapshotting

Commercial certainty must freeze when the request is admitted.

Snapshot at least the applicable concepts such as:

- origin market
- fare policy version
- payment mode/policy version
- distance/routing basis
- fare mode
- agreed/fixed fare
- tax/commission rules when applicable

If admin changes pricing later, existing requests should not silently mutate.

### Example

11:59 passenger enters under ₹100 policy.

12:02 admin changes fare to ₹110.

11:59 passenger remains ₹100.

12:04 new passenger gets ₹110.

---

## 22. Commercial Policy Versus Operational Policy

Policies fall into two broad classes.

### Commercial policies

Examples:

- fare
- payment mode
- tax
- commission

These should be snapshotted to active requests/transactions.

### Operational policies

Examples:

- search radius
- search expansion delay
- matching timeout

Operational policies may often change for still-waiting requests if doing so does not change the passenger's agreed commercial terms.

### Design law

> Commercial certainty freezes; matching flexibility continues until engagement.

---

## 23. Policy Versioning

Admins should publish immutable policy versions rather than editing historical policy in place.

Conceptually:

- Gomoh Fare Policy v1
- Gomoh Fare Policy v2
- Gomoh Fare Policy v3

The market points to its active version.

Each request stores the version it used.

Policy changes may optionally support future `effective_from` and `effective_until` scheduling.

---

## 24. Local Admin Role

Local Admin is primarily a **policy manager**, not a dispatcher.

Local Admin can configure their permitted market scope, including:

- fare slabs/modes
- payment mode
- enabled vehicle types
- operating hours
- service geography
- designated pickup points
- proximity tiers
- negotiation timeout
- driver eligibility/authorisation
- temporary market pause
- applicable commercial settings

Local Admin should **not** routinely:

- manually reorder FIFO
- manually pair passengers and drivers
- directly edit core operational tables
- create preferred-driver priority
- create VIP passenger priority

### Admin design principle

> Admin configures the machine; the engine operates the rides.

---

## 25. Global Admin Role

Global Admin owns platform governance rather than routine dispatch.

Global Admin can:

- create markets
- create/disable local admins
- view all markets
- establish global guardrails/defaults
- manage exceptional suspensions
- review audit history
- govern market lifecycle
- intervene through controlled exception commands

Future Regional Admin scope may be added if growth justifies it, but should not be required for V1.

---

## 26. Admin Guardrails

Local flexibility must exist inside safe platform limits.

Examples of values that may need guardrails:

- absurdly large fare increases
- impossible fare slab overlap
- 50 km first search radius
- 2-second response timeout
- disabled payment rules that would break settlement

The UI should reject logically invalid configuration and warn on extreme but technically valid changes.

Global policy may define permissible ranges that local admins cannot exceed without higher approval.

---

## 27. Admin Concurrency

Two admins editing the same market must not silently overwrite one another.

Configuration uses version checks.

If another admin publishes a newer version before the current editor saves, Raahi should ask the second admin to refresh/review rather than overwriting blindly.

---

## 28. Market Pause and Lifecycle

Market lifecycle may support:

- DRAFT
- PILOT
- ACTIVE
- PAUSED
- RETIRED

Operational pause should distinguish:

### Soft Pause

- no new requests admitted
- waiting/engaged/confirmed work may drain according to policy
- in-progress rides continue

### Emergency Pause

- no new requests
- waiting/unconfirmed work may be released/cancelled safely
- in-progress rides normally continue unless a genuine safety intervention is required

### Closing hours principle

Operating hours control admission of new work, not the ability to finish a valid ride already underway.

---

## 29. Expansion Rules

Adding a new market should be primarily configuration, not code.

A new market should normally require:

- market identity
- geographic boundary
- enabled vehicles
- fare policy
- payment policy
- proximity policy
- operating hours
- local admin assignment
- driver eligibility requirements

The core matcher should remain the same.

### No city-specific matchers

Avoid functions conceptually equivalent to:

- `gomoh_matcher`
- `dhanbad_matcher`
- `bokaro_matcher`

Use one matching model driven by market policy.

---

## 30. Market Defaults and Inheritance

At scale, policy may support inheritance:

**Global defaults → Regional defaults → Market overrides**

Local admins should see the effective value and its source.

Example:

- Global response timeout: 20 sec
- Jharkhand ToTo max radius: 5 km
- Gomoh override: 3 km

Gomoh effectively uses 3 km.

Policy inheritance is an expansion optimisation, not required for the first prototype.

---

## 31. Designated Pickup Points

Markets may define pickup points for places where raw GPS is operationally poor.

Examples:

- Gomoh Station Main Gate
- ToTo Stand
- Airport Pickup Zone B
- Mall Gate 2

Passenger selection may resolve to the approved pickup point while matching continues to use coordinates underneath.

This should be configuration, not separate product logic per station/airport/mall.

---

## 32. Vehicle Service Geography

Not every vehicle type may be legal or practical everywhere.

A market can restrict vehicle categories from certain zones/roads/destinations.

Raahi should hide/reject incompatible vehicle choices before engagement rather than letting a passenger book something the driver cannot legally serve.

---

## 33. Cross-market Trips

A market may configure whether destinations outside its service boundary are allowed.

A driver may legally drop a passenger outside Raahi's active operating area without that destination becoming a new market.

After completion outside authorised markets, the driver simply remains unavailable until entering an authorised service area again.

---

## 34. Driver Onboarding and Market Eligibility

Driver lifecycle can remain conceptually small:

**APPLIED → VERIFIED/ACTIVE → SUSPENDED**

Vehicle approval can independently be:

**PENDING → APPROVED → INACTIVE**

Market-specific requirements may differ.

A driver can be globally active but not authorised in a particular market if that market requires additional documentation.

Expiring market-specific credentials should remove only the relevant market authorisation when possible, rather than suspending the driver's entire Raahi identity.

---

## 35. Ratings and Complaints

V1 should avoid a complicated reputation algorithm.

A lightweight post-ride signal is sufficient initially:

- Ride okay? 👍 / 👎
- If 👎, choose a structured reason

Potential reasons:

- driver behaviour
- fare issue
- vehicle issue
- pickup issue
- passenger behaviour
- other

Eligibility should generally remain binary: authorised or not authorised.

Ratings should not normally reorder FIFO.

---

## 36. Privacy and Contact Details

Before ride confirmation, drivers should see only the minimum information needed to decide:

- passenger display identity
- pickup
- destination
- vehicle requirement
- fare/fare mode

Passenger contact details should normally be revealed only after confirmation when operationally necessary.

Local admins should receive purpose-based operational access, not unrestricted historical tracking of passenger movement.

---

## 37. Cash Leakage and Monetisation

Direct-to-driver markets make transaction-level commission collection harder.

Avoid manual daily cash reconciliation if possible.

Potential future monetisation models include:

- driver subscription
- prepaid driver wallet
- zero commission initially
- platform collection in PAY_RAAHI markets

Matching logic must not be contaminated by monetisation mechanics.

---

## 38. No Surge Pricing in V1

Raahi 3 V1 should not require opaque dynamic surge pricing.

If demand patterns justify higher fares at certain times, admins may publish predictable scheduled fare policies, for example evening or festival pricing.

Dynamic surge can be considered later only if real evidence justifies the added complexity.

---

## 39. No Incentive Engine in V1

Driver incentives such as "complete 10 rides and earn ₹300" create immediate fraud and accounting complexity.

Do not introduce incentive machinery until marketplace data demonstrates a clear need.

---

## 40. No Rich Driver Preference Engine in V1

Do not initially support filters such as:

- only long trips
- only certain destinations
- only above a minimum fare
- only toward home

Driver can be Online/Offline and can Pass an individual engagement.

Observe real rejection patterns first before adding more constraints.

---

## 41. No Rich Passenger Preference Engine in V1

Keep core compatibility focused on:

- vehicle type
- capacity
- geography

Do not add many optional preferences until there is demonstrated demand, because every preference fragments supply and complicates FIFO.

---

## 42. No Seat-pooling in Raahi 3 V1

Raahi 3's ToTo/Car marketplace should initially treat the passenger request as a whole-vehicle transaction.

Do not reintroduce the old pooled-seat model into the same matcher unless intentionally designed as a separate future product mode.

---

## 43. No Scheduled Rides in Initial Core

Use **Ride Now** first unless demand clearly proves advance booking is essential.

Scheduled rides introduce reservation inventory, reminders, driver commitment, rescheduling, late arrival, and no-show complexity.

They should earn their way into the product later.

---

## 44. System Truth

Server/database state is canonical.

Realtime, push notifications, browser state, and mobile UI are only projections of canonical state.

A missed notification must not undo a valid engagement.

A stale screen must not be able to override a newer server state.

---

## 45. Command Safety

Every consequential Raahi command should be safe when received:

- twice
- late
- out of order

This includes:

- request ride
- cancel
- accept
- counter
- pass
- arrive
- start ride
- complete ride
- payment callback
- timeout worker
- admin exception

Use idempotency and guarded state transitions.

---

## 46. Atomic Matching

Matching cannot rely on UI checks alone.

Conceptually the server must:

1. choose a waiting request
2. identify compatible drivers in the active proximity tier
3. choose the oldest eligible driver
4. lock/revalidate passenger and driver
5. create engagement
6. mark both engaged
7. commit atomically

If state changes during that process, abort and retry rather than patching a half-created assignment.

---

## 47. Canonical Invariants

These invariants should eventually be enforced at the database level wherever practical:

1. One passenger has at most one active request.
2. One passenger has at most one active engagement.
3. One driver has at most one active driver-queue position.
4. One driver has at most one active engagement.
5. One driver has at most one active vehicle while Online.
6. One engagement belongs to exactly one passenger and one driver.
7. One successful engagement creates at most one ride.
8. One ride has one canonical lifecycle state.
9. Fixed fare cannot be countered.
10. Submitted offers/counters are immutable.
11. Completed/cancelled/expired states do not move backward through normal commands.
12. Material request change cannot silently retain an unfair old priority.
13. A suspended or ineligible driver cannot receive a new engagement.
14. A market policy change cannot silently rewrite a historical transaction.
15. Admin cannot directly bypass matching invariants through normal operations.

---

## 48. System and Network Failure Rules

Raahi should assume failures are normal.

### Matching worker crash before commit

No partial match should exist.

### Engagement exists but notification fails

Engagement remains valid; clients discover it by reconnect/refetch.

### Timeout job runs twice

Second execution is a no-op.

### Realtime disconnect

Queue and ride state remain in the database.

### Mass reconnect

Clients read existing state rather than recreating requests.

### Maps unavailable

Do not invent distance. If required routing data cannot be obtained safely, prevent admission of new distance-dependent requests or use an explicitly defined safe fallback.

### Payment callback duplicates/out-of-order events

Payment processing must be idempotent and monotonic. SUCCESS must not regress to PENDING.

---

## 49. Controlled Admin/Support Exceptions

Rare operational problems will require intervention.

Admins/support should use explicit commands such as:

- cancel ride
- release engagement
- suspend driver
- refund payment
- correct payment status
- close interrupted ride

Every exception command must:

- validate invariants
- require a reason where appropriate
- record the actor
- create an audit event

Never solve exceptions by exposing arbitrary database row editing.

---

## 50. Auditability

Consequential policy changes should record:

- who changed it
- market/scope
- old value
- new value
- timestamp
- effective time
- policy version

Operational transitions should also be reconstructable through an event/audit trail.

Examples:

- PASSENGER_JOINED_QUEUE
- DRIVER_JOINED_QUEUE
- ENGAGEMENT_CREATED
- DRIVER_PASSED
- COUNTER_SENT
- ENGAGEMENT_EXPIRED
- RIDE_CONFIRMED
- DRIVER_ARRIVED
- RIDE_STARTED
- RIDE_COMPLETED
- PAYMENT_CONFIRMED
- ADMIN_EXCEPTION

The event history should make support disputes explainable without guessing.

---

## 51. Admin Dashboard Philosophy

Local Admin should see operational health rather than raw database complexity.

High-value metrics include:

- passengers waiting
- drivers available
- median passenger wait
- median driver wait
- trips today
- engagement success rate
- driver pass rate
- driver cancellation rate
- passenger cancellation rate
- payment exceptions
- fixed-fare acceptance rate
- average pickup distance

Admin should use these metrics to adjust market policy or recruit supply, not manually micromanage individual matches.

---

## 52. Anti-gaming Principles

### Queue toggling

Going Offline then Online creates fresh queue priority.

### Repeated passes

May cause cooldown or temporary unavailability.

### Passenger cancellation/re-entry

New request gets fresh priority where cancellation was passenger-caused.

### Fake no-show

Requires geographic arrival and grace period.

### Queue priority manipulation by admin

Normal admin controls should not expose it.

### Preferred drivers / VIP passengers

Not part of normal matching.

### Driver-specific fares

Not part of market policy. Fare rules apply by market/journey/vehicle policy, not favouritism toward individuals.

---

## 53. Marketplace Economics Principle

Do not change matching rules to solve problems that actually belong elsewhere.

- bad fares → fix pricing policy
- driver shortage → recruit supply
- passenger shortage → grow demand
- cash leakage → fix payment/commercial model
- fraud → targeted controls/audit
- geographic inefficiency → proximity policy
- concurrency bugs → database invariants

### Core law

> Never change matching rules to solve a pricing, supply, payment, or behaviour problem unless the matching rule itself is genuinely wrong.

---

## 54. Expansion Governance Principle

Every new market will claim to be special.

Before adding market-specific product code, ask:

> Can this be handled by existing policy, eligibility, geography, pricing, permissions, or pickup-point configuration?

If yes, configure it.

If no, determine whether the request is genuinely a platform-level feature before changing the core product.

This protects Raahi from becoming dozens of subtly different applications.

---

## 55. Current V0.1 Decisions to Treat as Frozen Unless Reopened

1. ToTo and Car share the same core journey.
2. Matching is one-to-one and exclusive.
3. No broadcast-to-many-driver bidding in the target Raahi 3 model.
4. Proximity gates eligibility before FIFO.
5. FIFO decides fairness inside the eligible proximity pool.
6. Failed neutral negotiation can restore original priority.
7. Fault-causing participant may lose priority/cool down.
8. Failed pairs receive temporary rematch cooldown.
9. Pricing modes are only FIXED or NEGOTIATED.
10. Fixed fare cannot be bargained.
11. Negotiation is bounded to one passenger offer and at most one driver counter in V1.
12. Origin market owns the request.
13. Current GPS determines geographic eligibility.
14. Driver must also be authorised for the market.
15. Commercial policy is snapshotted.
16. Local Admin manages policy, not manual dispatch.
17. Global Admin manages governance and exceptions.
18. One user identity can operate across markets.
19. One driver cannot appear as available supply in multiple places simultaneously.
20. Ride state and payment state are separate.
21. System/database state is canonical.
22. All commands should be idempotent/guarded.
23. Admin exceptions must preserve invariants and auditability.
24. Adding a market should primarily be configuration.
25. No scheduled rides, seat pooling, surge pricing, complex incentives, or rich preference engine in the initial core unless explicitly reopened.

---

## 56. Decisions Still Open for Later Resolution

These are intentionally **not frozen yet** and should be decided before implementation where necessary:

1. Exact proximity-tier distances and expansion delays by market/vehicle.
2. Exact driver response timeout.
3. Exact negotiation response timeout.
4. Exact pair cooldown duration.
5. Exact consequences for repeated driver Passes.
6. Exact passenger decline/cancellation priority rules after multiple occurrences.
7. Maximum lifetime of an unmatched passenger request.
8. Whether drivers auto-rejoin supply after ride completion by default.
9. Exact arrival GPS tolerance and passenger grace period.
10. Whether fixed-fare driver action is Accept/Pass only or includes explicit timeout penalties.
11. Exact minimum/maximum passenger offer rules for negotiable rides.
12. Whether cross-market destination travel is permitted by default or opt-in by market.
13. Initial policy for drivers finishing outside authorised markets.
14. Exact handling of toll/parking charges.
15. Whether local admins can schedule future fare policies in V1 or later.
16. Exact global guardrails for local fare/radius/timeout settings.
17. Whether market geography uses simple zones initially or full polygons/geofences from day one.
18. Whether Road Distance is sufficient for all pilot markets or whether ETA is needed in any pilot.
19. Monetisation model for DIRECT_TO_DRIVER markets.
20. Driver/passenger complaint escalation thresholds.

---

## 57. Design Test for Every Future Feature

Before approving any new Raahi 3 feature, answer these questions:

1. What user problem does it solve?
2. Can existing market configuration solve it?
3. Does it alter eligibility?
4. Does it alter FIFO fairness?
5. Does it alter proximity logic?
6. Does it introduce a new lifecycle state?
7. Does it create a new exception path?
8. Does it create a new admin operation?
9. Can it be represented as a policy version?
10. Can it create race conditions or double assignment?
11. Does it preserve the one-passenger/one-driver engagement invariant?
12. Can it be safely retried?
13. What happens when the phone is offline?
14. What happens when an admin changes policy mid-transaction?
15. Would adding this feature force city-specific code?

If the feature makes the engine substantially harder to explain, challenge the design before implementation.

---

## 58. The Raahi 3 One-Sentence Matcher

The matching system should remain explainable to drivers and passengers:

> **Raahi first finds people and vehicles that can reasonably serve each other nearby, then gives priority to whoever has been waiting longest inside that eligible pool.**

If the production algorithm can no longer be explained approximately this simply, the product should re-examine whether unnecessary complexity has entered matching.

---

## 59. Final Architecture Boundary Before Technical Design

Raahi 3 should be viewed as three major product layers:

### Layer 1 — Policy

Defines what a market allows:

- geography
- vehicles
- fare
- payment
- operating hours
- search policy
- administrative limits

### Layer 2 — Matching

Determines who should meet whom:

**eligibility → proximity → FIFO → exclusive engagement**

### Layer 3 — Transaction

Handles what happens after they meet:

**fare resolution → confirmation → ride → payment**

Local Admin primarily manages Layer 1.

The Raahi engine owns Layer 2.

Passenger and Driver interact primarily with Layer 3.

This separation is a core Raahi 3 simplification target.

---

## 60. What Comes Next

Do **not** jump directly to implementation from this document.

The next design phase should convert this rulebook, in order, into:

1. canonical entities
2. entity relationships
3. lifecycle/state diagrams
4. invariants and uniqueness constraints
5. affected-component map
6. Given/When/Then scenarios
7. architecture decisions
8. database tables and RPC/command boundaries
9. only then implementation

Any technical design that contradicts this rulebook must either be changed or explicitly reopen the relevant product rule first.
