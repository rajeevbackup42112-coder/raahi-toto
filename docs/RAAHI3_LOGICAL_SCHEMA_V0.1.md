# Raahi 3 Logical Relational Schema v0.1

**Status:** Logical schema baseline. This is not migration SQL yet.

The design prioritizes enforceable invariants, minimal duplication and transactional matching.

---

## 1. Schema organization

Recommended logical namespaces:

- `app` — canonical product tables
- `api` — explicitly granted command/query functions
- `internal` — matcher/reconciliation/system-only functions and helpers

If Supabase Data API exposure is used, exposed tables/functions must be explicitly secured with RLS/grants. Browser clients do not receive generic write access to operational tables.

---

## 2. `users`

Represents application profile data for the authenticated identity.

Key:
- `id` UUID, same identity as auth provider user ID

Likely columns:
- `display_name`
- `account_status`
- `created_at`
- `updated_at`

Do not duplicate authentication secrets/OTP data.

Relationships:
- 0..1 Driver
- many Ride Requests
- many Admin Assignments over time

---

## 3. `drivers`

Key:
- `id` UUID

Foreign key:
- `user_id` -> users, UNIQUE

Columns:
- `status` / verification state
- suspension metadata if currently suspended
- `created_at`, `updated_at`

Invariant:
- one User -> at most one Driver.

---

## 4. `vehicles`

Key:
- `id` UUID

Foreign key:
- `driver_id` -> drivers

Columns:
- `category` (`E_RICKSHAW`, `CAR` initially)
- `display_label` optional/local presentation aid
- `seat_capacity`
- `registration_identifier` when required
- `approval_status`
- `is_active_record`
- timestamps

Indexes:
- `(driver_id, approval_status)`

Do not store active-supply status here; Driver Availability owns active vehicle selection.

---

## 5. `markets`

Key:
- `id` UUID

Columns:
- `code` UNIQUE
- `name`
- lifecycle `state` (`DRAFT`, `PILOT`, `ACTIVE`, `PAUSED`, `RETIRED`)
- `pause_mode` nullable (`SOFT`, `EMERGENCY`)
- `service_area` PostGIS geography/geometry MultiPolygon
- timezone (India default initially)
- timestamps

Indexes:
- GIST spatial index on `service_area`
- lifecycle/state index where useful

Rule:
- request origin market is resolved once and frozen on Ride Request.

---

## 6. `zones`

Key:
- `id` UUID

Foreign key:
- `market_id` -> markets

Columns:
- `name`
- `area` Polygon/MultiPolygon
- `status`
- timestamps

Indexes:
- GIST `area`
- `(market_id, status)`

Small markets can use zero zones or one default zone.

---

## 7. `pickup_points`

Key:
- `id` UUID

Foreign keys:
- `market_id` -> markets
- `zone_id` -> zones nullable

Columns:
- `name`
- `location` geography(Point)
- `status`
- optional semantic type such as STATION_GATE / STAND / MALL_GATE
- timestamps

Indexes:
- GIST `location`
- `(market_id, status)`

---

## 8. `driver_market_authorizations`

Key:
- `id` UUID

Foreign keys:
- `driver_id` -> drivers
- `market_id` -> markets

Columns:
- `state` (`PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED`, `EXPIRED`, `REVOKED`)
- `valid_from`, `valid_until` nullable
- status reason/metadata where appropriate
- timestamps

Constraints/indexes:
- prevent duplicate simultaneously ACTIVE authorization for same `(driver_id, market_id)`
- index `(market_id, state, driver_id)`
- index `(driver_id, state)`

---

## 9. `admin_assignments`

Key:
- `id` UUID

Foreign keys:
- `user_id` -> users
- `market_id` -> markets nullable for GLOBAL

Columns:
- `scope_type` (`GLOBAL`, `MARKET`)
- `state` (`ACTIVE`, `REVOKED` initially)
- `granted_by`
- timestamps

Constraint examples:
- MARKET scope requires `market_id`
- GLOBAL scope requires `market_id` null
- avoid duplicate active assignment for same scope/user

Authorization is checked server-side from active assignments.

---

## 10. `market_policy_versions`

Key:
- `id` UUID

Foreign keys:
- `market_id` -> markets
- `published_by` -> users/admin identity

Columns:
- `version_no`
- `state` (`DRAFT`, `PUBLISHED`, `SUPERSEDED` if useful for presentation; published content remains immutable)
- `schema_version`
- `policy` JSONB immutable configuration bundle
- `effective_from`
- `effective_until` nullable
- `published_at`
- `created_at`

Unique:
- `(market_id, version_no)`

Indexes:
- `(market_id, effective_from desc)`

### Why one versioned bundle in V1
One immutable JSONB bundle keeps a market publication atomic: fare rules, payment mode, vehicle enablement, proximity tiers and timeout/cooldown values can be published as one coherent version.

A publish command must validate the bundle strictly before publication, including fare-slab boundaries and required fields.

Typed child policy tables can be introduced later only if querying/constraints justify the extra complexity.

### Important
Transaction-critical resolved values are also snapshotted onto Ride Request/Ride so historical behavior does not depend on reinterpreting old JSON with future application code.

---

## 11. `ride_requests`

Key:
- `id` UUID

Foreign keys:
- `passenger_user_id` -> users
- `origin_market_id` -> markets
- `pickup_point_id` nullable -> pickup_points
- `policy_version_id` -> market_policy_versions

Core journey columns:
- `pickup_location` geography(Point)
- `pickup_label`
- `destination_location` geography(Point)
- `destination_label`
- `vehicle_category`
- `required_seat_capacity` nullable

Commercial snapshot columns:
- `route_distance_meters`
- `route_provider` / route reference metadata nullable
- `pricing_mode` (`FIXED`, `NEGOTIATED`)
- `fixed_fare_minor` nullable
- `passenger_offer_minor` nullable
- `currency` default INR
- `payment_mode`
- `commercial_snapshot` JSONB for resolved policy terms needed historically

Queue/lifecycle columns:
- `state` (`WAITING`, `ENGAGED`, `FULFILLED`, `CANCELLED`, `EXPIRED`)
- `priority_at`
- `revision_no`
- `expires_at` nullable
- timestamps
- `version` integer for optimistic concurrency where useful

Critical constraints:
- pricing fields consistent with pricing mode
- capacity required only where relevant
- terminal state rules enforced through commands

Critical unique index:
- at most one active Ride Request per passenger where state in (`WAITING`, `ENGAGED`)

Critical indexes:
- `(origin_market_id, state, vehicle_category, priority_at)`
- GIST `pickup_location`
- passenger active-request lookup
- `(policy_version_id)`

---

## 12. `driver_availability`

Recommended simplification: **one current row per Driver**, rather than accumulating queue-row history.

Key/foreign key:
- `driver_id` -> drivers, PRIMARY KEY or UNIQUE one-to-one

Foreign key:
- `active_vehicle_id` -> vehicles nullable/offline according to design

Columns:
- `state` (`OFFLINE`, `AVAILABLE`, `ENGAGED`, `ON_RIDE`)
- `current_location` geography(Point) nullable
- `location_last_seen_at`
- `priority_at` nullable when not participating
- `online_since_at` nullable
- `current_market_id` nullable derived/cached for projection only
- `version`
- timestamps

Critical invariants:
- selected vehicle belongs to driver and is approved
- only AVAILABLE can be matched
- fresh location is required at matcher commit time

Indexes:
- GIST `current_location`
- `(state, priority_at)`
- `(active_vehicle_id)`
- optional `(current_market_id, state, priority_at)` as optimization, never as sole geography truth

History comes from Audit Events rather than queue-row duplication.

---

## 13. `engagements`

Key:
- `id` UUID

Foreign keys:
- `ride_request_id` -> ride_requests
- `driver_id` -> drivers
- `vehicle_id` -> vehicles snapshot/reference

Columns:
- `state` (`ACTIVE`, `SUCCEEDED`, `FAILED`)
- `pricing_mode`
- `passenger_offer_minor` nullable
- `driver_counter_minor` nullable and immutable once non-null
- `awaiting_party` nullable on terminal states (`DRIVER`, `PASSENGER`)
- `expires_at`
- `resolution_reason` nullable until terminal
- `resolved_at`
- timestamps
- `version`

Critical partial unique indexes:
- one ACTIVE Engagement per `ride_request_id`
- one ACTIVE Engagement per `driver_id`

Other indexes:
- `(driver_id, created_at desc)`
- `(ride_request_id, created_at desc)`
- `(state, expires_at)` for reconciliation

Pair cooldown V1 can be derived by checking recent FAILED engagements joined to request passenger identity and driver, with suitable indexes. Materialize later only if needed.

---

## 14. `rides`

Key:
- `id` UUID

Foreign keys:
- `engagement_id` -> engagements, UNIQUE
- `ride_request_id` -> ride_requests, UNIQUE
- `passenger_user_id` -> users
- `driver_id` -> drivers
- `vehicle_id` -> vehicles
- `origin_market_id` -> markets
- `policy_version_id` -> market_policy_versions

Snapshot columns:
- pickup/destination point + label snapshots
- `pricing_mode`
- `agreed_fare_minor`
- `currency`
- `payment_mode`
- `commercial_snapshot`

Lifecycle:
- `state` (`CONFIRMED`, `DRIVER_EN_ROUTE`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `INTERRUPTED`)
- `confirmed_at`
- `driver_en_route_at`
- `arrived_at`
- `started_at`
- `completed_at`
- terminal reason metadata
- `version`
- timestamps

Critical constraints/indexes:
- one Ride per successful Engagement/request
- partial unique: one nonterminal Ride per `driver_id`
- recommended partial unique: one nonterminal Ride per `passenger_user_id` in V1, so one person cannot simultaneously hold multiple personal ride journeys
- indexes for driver/passenger current ride lookup
- `(origin_market_id, state, created_at)` for admin operations

---

## 15. `payments`

Recommended canonical model: **one Payment intent/outcome row per Ride**.

Key:
- `id` UUID

Foreign key:
- `ride_id` -> rides, UNIQUE

Columns:
- `mode` (`DIRECT_TO_DRIVER`, `PAY_RAAHI`)
- `state` (`PENDING`, `CONFIRMED`, `DISPUTED`, `VOID`, `REFUNDED`)
- `amount_minor`
- `currency`
- `provider` nullable
- `provider_payment_id` nullable
- confirmation/dispute/refund timestamps
- `version`
- timestamps

Gateway attempts/events can be separated later when PAY_RAAHI is implemented.

Indexes:
- `(state, created_at)` for payment exceptions
- provider ID unique where populated

---

## 16. Optional future `payment_attempts`

Introduce when real PAY_RAAHI retry semantics are implemented.

Would contain:
- payment_id
- provider attempt/reference
- state
- provider event timestamps
- failure reason

This avoids overloading canonical Payment with every transport/provider attempt.

Not required for direct-payment-only launch.

---

## 17. `driver_settlements`

Required only for real PAY_RAAHI collection.

Key:
- `id` UUID

Foreign keys:
- `ride_id` -> rides, normally one canonical settlement obligation per ride
- `driver_id` -> drivers

Columns:
- amount/currency
- `state` (`PENDING`, `PROCESSING`, `SETTLED`, `FAILED`)
- provider/reference metadata
- retry/error metadata
- timestamps

Settlement attempts may later be normalized if needed.

---

## 18. `audit_events`

Key:
- monotonic big integer or UUID, depending implementation preference

Columns:
- `event_type`
- `actor_type` (`USER`, `ADMIN`, `SYSTEM`, `PROVIDER`)
- `actor_user_id` nullable
- `market_id` nullable
- `entity_type`
- `entity_id`
- `request_id` / `ride_id` optional correlation columns where useful
- `reason_code` nullable
- `payload` JSONB for structured contextual facts
- `created_at`

Indexes:
- `(entity_type, entity_id, created_at)`
- `(ride_id, created_at)`
- `(market_id, created_at)`
- `(event_type, created_at)`

Do not write every GPS heartbeat into audit; audit is consequential business history, not telemetry storage.

---

## 19. `command_idempotency`

Infrastructure integrity table, not a domain entity.

Purpose:
- protect retriable client/provider commands

Possible columns:
- `actor_key`
- `command_type`
- `idempotency_key`
- result entity/reference
- request hash
- status
- created/expires timestamps

Unique:
- `(actor_key, command_type, idempotency_key)`

The database state machine/unique constraints remain final protection even without an idempotency hit.

---

## 20. Pair cooldown without a table

For V1, determine whether Driver D can rematch Passenger P by querying recent FAILED Engagements for the pair within the policy cooldown window.

Needed index path:
- Engagement driver + recent timestamp
- Ride Request passenger identity through `ride_request_id`

If scale makes this expensive, introduce a materialized `pair_exclusions` helper later without changing domain semantics.

---

## 21. Key cross-table transactional constraints

### Match transaction
Must atomically:
- lock/revalidate WAITING request
- lock/revalidate AVAILABLE driver
- create ACTIVE engagement
- update request -> ENGAGED
- update driver availability -> ENGAGED

### Engagement success
Must atomically:
- transition ACTIVE -> SUCCEEDED
- request -> FULFILLED
- driver availability -> ON_RIDE
- create exactly one Ride
- create/initialize Payment obligation when appropriate
- emit audit

### Engagement failure
Must atomically:
- ACTIVE -> FAILED
- request -> WAITING/CANCELLED/EXPIRED
- driver -> AVAILABLE/OFFLINE
- apply priority/fault consequences
- emit audit

### Ride completion
Must atomically:
- ride -> COMPLETED
- driver availability -> AVAILABLE/OFFLINE according to online intent/policy
- create/update downstream payment/settlement obligations only once
- emit audit

---

## 22. Additional invariant discovered during schema design

V1 should treat one passenger as having **one active journey at a time**, not merely one WAITING/ENGAGED request.

Therefore request admission should also reject/redirect if the passenger already owns a nonterminal Ride (`CONFIRMED`, `DRIVER_EN_ROUTE`, `ARRIVED`, `IN_PROGRESS`).

Reason:
- V1 models the logged-in passenger as the actual rider
- allowing a FULFILLED request to immediately create another request while the first Ride is active would violate the simple personal journey model
- booking rides for other people can be introduced later as an explicit feature rather than accidental behavior

---

## 23. Data deliberately not stored as independent tables in V1

- Passenger queue rows
- Driver queue history rows
- Quote rows
- Booking rows
- Cancellation rows
- Pair cooldown rows
- Match-attempt rows
- Notification rows
- Driver GPS history stream
- generic Location table

Add them only if a demonstrated requirement gives them independent identity/history value.

---

## 24. Minimum database-level protections

The eventual SQL implementation should use database constraints/indexes/functions to enforce at least:
- one active passenger request
- one active passenger ride
- one active driver engagement
- one active request engagement
- one active driver ride
- one Ride per request/engagement
- one canonical Payment per Ride
- active vehicle belongs to driver and is approved (validated in commands/triggers where cross-table CHECK cannot express it)
- immutable published policy content
- immutable terminal state under ordinary commands

---

## 25. Next step

Define the command/RPC contracts and exact transaction boundaries from this schema. Then produce the first SQL/architecture blueprint for review before creating any Supabase project objects.