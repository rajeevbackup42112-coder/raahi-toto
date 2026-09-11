# Raahi 3 Database & Transaction Blueprint v0.1

**Status:** Implementation-ready design review baseline. No migrations applied yet.

This document turns the logical schema into concrete database protections and transaction ownership without committing production SQL.

---

## 1. Technology baseline

Recommended canonical backend:
- PostgreSQL
- PostGIS for geography
- Supabase as managed Postgres/Auth/RLS/Realtime/Cron platform
- Cloudflare Worker/static assets remains frontend delivery

The domain remains PostgreSQL-centric rather than tightly coupled to a specific UI framework.

---

## 2. Core schemas

### `app`
Canonical tables. Ordinary browser clients do not receive generic mutation rights.

### `api`
Explicit business RPC/query functions callable only by appropriately authenticated roles.

### `internal`
Matcher, reconciliation, policy validation, authorization helpers and other system functions not exposed to ordinary clients.

### Security defaults
- RLS on every exposed table
- no service-role/secret key in frontend
- revoke broad `PUBLIC EXECUTE` where privileged functions exist
- privileged functions perform explicit actor/scope validation
- local admin authority is read from canonical Admin Assignment data, not user-editable metadata

---

## 3. Critical table refinements

### Ride Request recovery lineage
Add optional columns to `ride_requests`:
- `parent_request_id` nullable self-FK
- `recovery_of_ride_id` nullable FK to rides
- `recovery_reason` nullable

Use only for system-created recovery demand after an innocent passenger loses a pre-trip Ride because of driver/system failure.

Rules:
- original Request stays FULFILLED
- cancelled Ride stays CANCELLED
- recovery Request is a new WAITING request
- recovery Request may inherit original `priority_at`
- journey + original request-level commercial terms are copied when unchanged/valid
- negotiated recovery copies passenger's original offer, not the cancelled driver's negotiated counter/agreed amount
- recovery lineage is auditable

### Driver online intent
Add to `driver_availability`:
- `online_intent boolean not null`

Semantics:
- OFFLINE => false
- AVAILABLE/ENGAGED normally => true
- ON_RIDE may be true or false
- false while ON_RIDE means Go Offline After Ride

No `OFFLINE_AFTER_RIDE` state is needed.

---

## 4. Minimum partial/unique protections

Conceptually enforce:

### User/driver
- `drivers.user_id` UNIQUE

### Passenger demand
- partial UNIQUE on `ride_requests(passenger_user_id)` where state in (`WAITING`,`ENGAGED`)

### Engagement
- partial UNIQUE on `engagements(ride_request_id)` where state=`ACTIVE`
- partial UNIQUE on `engagements(driver_id)` where state=`ACTIVE`

### Ride
- `rides.engagement_id` UNIQUE
- `rides.ride_request_id` UNIQUE
- partial UNIQUE on `rides(driver_id)` where state nonterminal
- partial UNIQUE on `rides(passenger_user_id)` where state nonterminal

### Payment
- `payments.ride_id` UNIQUE

### Driver availability
- one row per driver (driver_id PK/UNIQUE)

### Policy
- `(market_id, version_no)` UNIQUE

### Idempotency
- `(actor_key, command_type, idempotency_key)` UNIQUE

These constraints are the final backstop even when application logic races.

---

## 5. Required indexes

### Demand queue
`ride_requests(origin_market_id, state, vehicle_category, priority_at, id)`

### Supply queue
`driver_availability(state, priority_at, driver_id)`

### Geography
GIST:
- `markets.service_area`
- `zones.area`
- `pickup_points.location`
- `ride_requests.pickup_location`
- `driver_availability.current_location`

### Authorizations
`driver_market_authorizations(market_id, state, driver_id)`

### Engagement expiry
`engagements(state, expires_at)`

### Pair exclusion lookup
- `engagements(driver_id, created_at desc)`
- request lookup by `ride_request_id -> passenger_user_id`
- rides `(driver_id, passenger_user_id, created_at desc)` for recent pre-trip cancellation exclusion

### Current ride lookup
- passenger + nonterminal state
- driver + nonterminal state

### Admin/reporting
`rides(origin_market_id, state, created_at)`
`audit_events(market_id, created_at)`

---

## 6. Matcher query principle

Never select a global FIFO driver first and then test distance.

Correct shape:
1. request determines Market, vehicle/capacity and active proximity tier
2. filter to authorized + compatible + fresh + AVAILABLE drivers inside the tier
3. exclude recent invalid pairings/cancelled pairings under cooldown policy
4. order remaining candidates by `priority_at asc, driver_id asc`
5. attempt row lock (`FOR UPDATE ... SKIP LOCKED` style)
6. revalidate after lock
7. create Engagement atomically

The deterministic secondary key prevents ambiguous ties.

---

## 7. Transaction: create request

Conceptual transaction:

1. identify `auth.uid()` passenger
2. lock/check passenger journey uniqueness
3. reject if active request or nonterminal Ride exists
4. resolve/verify origin Market
5. resolve effective Market Policy Version
6. validate vehicle/journey eligibility
7. use trusted server route result
8. resolve FIXED vs NEGOTIATED and fare/offer rules
9. insert WAITING Ride Request with `priority_at=now()` and commercial snapshot
10. insert Audit Event
11. commit
12. trigger matching asynchronously/after commit

The route/distance result must not be a client-trusted arbitrary number.

---

## 8. Transaction: match request

Pseudo-flow:

```text
BEGIN
  lock WAITING request
  if not WAITING -> return/no-op

  determine operational matching policy/tier
  query candidates:
    availability = AVAILABLE
    online_intent = true
    location fresh
    active vehicle compatible
    ACTIVE authorization for origin market
    inside active proximity tier
    pair not excluded
  order by priority_at, driver_id
  lock first candidate SKIP LOCKED
  revalidate request + driver

  insert Engagement ACTIVE
  update request -> ENGAGED
  update driver availability -> ENGAGED
  insert audit events
COMMIT
```

If no candidate is available, commit no state change except optional low-value telemetry; request remains WAITING.

---

## 9. Transaction: engagement succeeds

Shared internal function should be used by:
- driver accepts fixed fare
- driver accepts negotiated passenger offer
- passenger accepts driver counter

Pseudo-flow:

```text
BEGIN
  lock ACTIVE engagement
  lock request
  lock driver availability
  validate actor + awaiting party + expiry
  resolve agreed amount

  Engagement -> SUCCEEDED
  Request -> FULFILLED
  Driver Availability -> ON_RIDE

  insert Ride CONFIRMED (unique engagement/request)
  insert Payment PENDING exactly once
  insert audit events
COMMIT
```

Duplicate command returns the already-created canonical Ride when safe rather than inserting another.

---

## 10. Transaction: engagement fails

One shared internal resolver accepts structured `resolution_reason` and responsible party.

Pseudo-flow:

```text
BEGIN
  conditional lock ACTIVE engagement
  if already terminal -> no-op/result

  Engagement -> FAILED
  Request ENGAGED -> WAITING/CANCELLED/EXPIRED as reason requires
  Driver ENGAGED -> AVAILABLE/OFFLINE as reason requires

  preserve/reset priority independently for passenger and driver
  apply cooldown eligibility timestamps/derived rules if materialized later
  audit
COMMIT
```

After commit, trigger matching for whichever side returned to queue.

---

## 11. Pair exclusion

V1 does not require a dedicated table.

A pair is temporarily excluded when recent history within policy cooldown includes qualifying events such as:
- FAILED negotiation Engagement between same passenger and driver
- driver pass/decline/timeout where immediate repeat would be pointless
- pre-trip Ride cancellation between same passenger/driver

Pair exclusion is an eligibility predicate, not queue state.

If lookup becomes costly at scale, add a materialized helper later without changing product semantics.

---

## 12. Transaction: driver-caused pre-trip ride cancellation

This is the recovery-request path.

```text
BEGIN
  lock nonterminal pre-trip Ride
  lock Driver Availability
  verify driver-caused cancellation is legal

  Ride -> CANCELLED
  original Request remains FULFILLED

  create recovery Ride Request:
    parent_request_id = original request
    recovery_of_ride_id = cancelled ride
    passenger = same
    journey = same snapshot/request values
    commercial request terms copied appropriately
    priority_at = original preserved priority
    state = WAITING

  Driver Availability -> AVAILABLE/OFFLINE
  apply driver consequence/reset/cooldown
  void/refund Payment as applicable
  audit all transitions
COMMIT
```

Then rematch recovery request.

This preserves passenger fairness without reopening terminal history.

---

## 13. Transaction: passenger-caused pre-trip ride cancellation

```text
BEGIN
  lock Ride + Driver Availability + Payment
  validate passenger ownership and pre-trip state
  Ride -> CANCELLED
  no recovery request by default
  Driver -> AVAILABLE/OFFLINE preserving fair driver priority
  Payment -> VOID/refund workflow as applicable
  audit
COMMIT
```

Passenger's later ordinary request gets fresh priority.

---

## 14. Transaction: ride completion

```text
BEGIN
  lock IN_PROGRESS Ride
  lock Driver Availability
  lock/create canonical Payment as needed

  Ride -> COMPLETED
  if online_intent=true and driver otherwise operationally eligible:
      Driver Availability -> AVAILABLE
      priority_at = now()  # fresh after completed work by default
  else:
      Driver Availability -> OFFLINE

  ensure settlement obligation once if PAY_RAAHI
  audit
COMMIT
```

After commit, if driver AVAILABLE, invoke matching.

---

## 15. Request material update transaction

Only WAITING Request can be materially edited.

```text
BEGIN
  lock request
  verify owner + WAITING
  resolve route/market/fare implications
  increment revision_no
  reset priority_at=now() for MATERIAL change
  update journey/commercial snapshot legally
  audit before/after material values
COMMIT
```

If pickup moves into a different origin Market, recommended behavior is to treat that as a material re-admission: resolve new market and reset commercial policy/priority while retaining same request identity only if implementation can preserve clean audit semantics. Otherwise create a replacement request. This rare boundary case can remain an internal implementation decision.

---

## 16. Location update path

Driver GPS updates are high frequency.

Requirements:
- authenticated driver ownership
- server received timestamp
- current point update
- reject implausibly old/out-of-order updates where needed
- do not audit every heartbeat
- do not reset priority merely due to movement

A separate telemetry/history system can be added later if fraud/safety evidence requires it.

---

## 17. Timeout reconciliation

Recommended database/Cron function runs frequently enough for configured UX.

For each ACTIVE engagement with `expires_at <= now()`:
- lock SKIP LOCKED
- call the same internal fail-engagement resolver
- no-op if already terminal

For stale requests:
- conditionally expire according to request lifetime policy

Reconciliation should be safe after outages; `expires_at` is canonical.

---

## 18. Policy publishing

`market_policy_versions.policy` is immutable after PUBLISHED.

Publish function:
1. authorize admin scope
2. compare expected current version
3. validate JSON schema/version
4. validate semantic rules (fare slabs nonoverlap, enabled modes, positive timeouts/radii, etc.)
5. enforce global guardrails
6. insert new immutable version
7. activate/schedule as permitted
8. audit publication

Existing request commercial snapshots never mutate.

---

## 19. RLS/permission direction

### Passenger reads
Can read own relevant User/Request/Engagement/Ride/Payment projection.

### Driver reads
Can read own Driver/Vehicle/Availability and only the passenger/request data necessary for their ACTIVE Engagement/Ride.

### Local Admin reads
Market-scoped operational/admin projections, not unrestricted cross-market data.

### Writes
Prefer RPC command execution. Do not grant client roles generic UPDATE/INSERT/DELETE on core operational tables simply because RLS could theoretically constrain them.

### Privileged DB functions
When SECURITY DEFINER is genuinely necessary:
- keep in controlled schema
- revoke default PUBLIC execute
- grant only intended role(s)
- explicitly validate `auth.uid()` and admin scope
- use fixed safe search path

---

## 20. Realtime subscriptions

Subscribe only to data/projections needed to know that state changed.

Client behavior:
- receive change signal
- refetch canonical current-journey projection

Never implement:
- client-side queue mutation based solely on realtime events
- client-side final state arbitration

---

## 21. Audit strategy

High-value audit events include:
- request created/materially changed/cancelled/recovered
- driver joined/left supply (not GPS heartbeat)
- engagement created/resolved
- counter submitted
- ride lifecycle milestones
- payment outcome changes
- policy publications
- authorization/suspension changes
- admin exceptions

Each event stores enough correlation to reconstruct transaction history.

---

## 22. Rollout strategy

Do not build all optional systems at once.

### Slice 1 — canonical market + identities
User, Driver, Vehicle, Market, Authorization, Admin Assignment, Policy.

### Slice 2 — queue + matcher
Ride Request, Driver Availability, PostGIS proximity, FIFO, Engagement.

### Slice 3 — ride execution
Ride lifecycle and cancellation/recovery.

### Slice 4 — direct payment
Payment obligation + driver confirmation/dispute.

### Slice 5 — PAY_RAAHI
Real payment attempts/webhooks + Driver Settlement only when a live market needs it.

This keeps the first backend coherent while avoiding unused financial complexity.

---

## 23. What is now ready for implementation

The design is sufficiently specified to draft:
- enums/types
- canonical table DDL
- keys/check constraints
- partial unique indexes
- PostGIS indexes
- RLS/grants baseline
- internal command functions
- matcher/reconciliation functions
- pgTAP/Given-When-Then database tests

No unresolved product contradiction blocks schema implementation.

## 24. Infrastructure decision before applying SQL

Before creating real backend objects, choose whether Raahi 3 will:

1. use a **new dedicated Supabase project** (recommended for clean isolation), or
2. reuse an existing Raahi Supabase project/database.

A dedicated project provides the safest clean-slate separation from legacy Raahi schemas and duplicate RPCs.