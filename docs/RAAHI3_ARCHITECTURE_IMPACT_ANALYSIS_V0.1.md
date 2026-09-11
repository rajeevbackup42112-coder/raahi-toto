# Raahi 3 Architecture Impact Analysis v0.1

**Status:** Pre-schema architecture baseline. No production database changes yet.

This document asks what capabilities the backend must have in order to enforce the already-frozen Rulebook, Entities, Lifecycles, Invariants and Acceptance Scenarios.

---

## 1. Required architectural capabilities

Raahi 3 requires a backend that can reliably provide:

1. **ACID multi-row transactions** for matching and lifecycle transitions.
2. **Row-level locking / concurrency control** so two matchers cannot allocate one driver or passenger twice.
3. **Partial/conditional uniqueness constraints** for one active request, one active engagement, one active driver availability, one active ride, etc.
4. **Geospatial indexing/querying** for market polygons, zones, pickup points and proximity candidate pools.
5. **Deterministic FIFO ordering** within the currently eligible proximity pool.
6. **Server-owned business commands** rather than direct client CRUD on operational tables.
7. **Row-level authorization** for passenger, driver and market-scoped admin access.
8. **Policy versioning and immutable snapshots** for fare/payment/commercial certainty.
9. **Scheduled/reconciliation processing** for engagement/request expiries and self-healing.
10. **Idempotency support** for mobile retries, payment callbacks and duplicate commands.
11. **Audit history** for consequential transitions/admin exceptions.
12. **Realtime notification/invalidation** as an experience enhancement, without making realtime the source of truth.
13. **Payment webhook handling** later for PAY_RAAHI.
14. **Low operational overhead and low initial cost.**

---

## 2. What the architecture must NOT rely on

Raahi must not rely on:
- UI state as canonical truth
- websocket connection as queue membership
- client-calculated FIFO
- client-calculated authorization
- direct table UPDATEs for core transitions
- multiple independent matching services racing without database enforcement
- notification delivery as proof that an Engagement exists
- admin manual dispatch as normal operation

---

## 3. Recommended platform shape

### Frontend / hosting
Keep the current Cloudflare Git-connected Worker/static-assets deployment as the web delivery layer.

Its job is primarily:
- serve the UI
- authenticate user session through backend auth integration
- call command/query APIs
- render/refetch canonical projections

The Cloudflare Worker does **not** need to become the transactional matching database.

### Canonical backend
Use a **PostgreSQL transactional core**.

Recommended managed implementation for Raahi 3: **Supabase Postgres**, because the required capabilities align naturally with:
- full PostgreSQL transactions and constraints
- PostGIS for spatial indexing
- Auth for OTP/session identity
- RLS for row-level data access
- Realtime for invalidation/refetch
- database functions for atomic commands
- Cron/pg_cron for expiry reconciliation

The product model remains PostgreSQL-centric rather than Supabase-specific, so the domain design is portable if infrastructure changes later.

---

## 4. Why not make Cloudflare Worker/D1 the canonical transaction engine

Cloudflare is excellent for delivery/edge compute, but Raahi's hardest requirements are relational concurrency and geospatial matching invariants.

A Postgres core provides a simpler direct expression of:
- `FOR UPDATE SKIP LOCKED` style queue contention handling
- partial unique indexes
- transactional matching
- exclusion/uniqueness enforcement
- spatial GIST indexes / PostGIS geography
- policy/version relational integrity

Using Cloudflare as frontend/edge and Postgres as canonical state therefore keeps each platform doing what it is best suited for.

---

## 5. Three logical backend layers

### Layer A — Policy
Owns what a Market permits:
- market lifecycle
- service geography
- vehicle enablement
- fare/payment policy versions
- proximity/timeout/cooldown rules
- admin scope
- driver authorization

### Layer B — Matching
Owns who meets whom:
- WAITING Ride Requests
- AVAILABLE Driver Availability
- current location/authorization/compatibility
- proximity tier
- FIFO priority
- pair exclusion
- atomic Engagement creation

### Layer C — Transaction
Owns what happens after pairing:
- Engagement decision
- Ride execution
- Payment
- Settlement
- exceptions/audit

No layer should duplicate another layer's canonical state.

---

## 6. Command/query separation

### Commands
State-changing behavior should enter through named business commands.

Examples:
- request_ride
- change_waiting_request
- cancel_request
- driver_go_online
- driver_go_offline
- driver_accept_engagement
- driver_pass_engagement
- driver_counter_engagement
- passenger_accept_counter
- passenger_decline_counter
- mark_driver_arrived
- start_ride
- complete_ride
- confirm_direct_payment
- publish_market_policy
- set_driver_market_authorization
- apply_admin_exception

A command:
1. authenticates actor
2. checks authorization/scope
3. locks/rechecks canonical rows where needed
4. validates lifecycle preconditions
5. performs all related state changes atomically
6. emits audit event(s)
7. returns resulting canonical IDs/state

### Queries / projections
Read APIs can expose passenger home state, driver current work, queue/wait information, admin dashboard metrics, etc.

Clients may refetch projections freely; projections do not own business state.

---

## 7. Schema exposure/security shape

Recommended logical separation:

### `app` / canonical tables
Core product state. RLS enabled where exposed; ideally not freely writable from browser clients.

### `api` command/query surface
Small explicitly granted RPC/function surface exposed to authenticated clients.

### `internal` private schema
System-only matching/reconciliation/helpers, not exposed directly to ordinary client roles.

Security requirements:
- revoke broad default function execution where privileged functions exist
- authorize by server identity (`auth.uid()` / trusted app metadata where relevant), never user-editable metadata
- market-scoped admin checks happen in backend commands
- service-role/secret credentials never enter frontend code
- direct browser mutations of core operational tables are prohibited even when RLS would technically allow them

---

## 8. Matching transaction shape

The critical matcher transaction should conceptually be:

1. select/revalidate one WAITING request
2. determine effective operational matching policy
3. determine active proximity tier
4. query compatible AVAILABLE drivers with:
   - fresh location
   - active vehicle
   - active origin-market authorization
   - capacity/type compatibility
   - no pair exclusion
5. restrict to current proximity pool
6. order candidates by `priority_at`, then deterministic tiebreaker
7. lock candidate request + chosen driver availability
8. revalidate both after locks
9. create ACTIVE Engagement
10. transition request WAITING -> ENGAGED
11. transition driver AVAILABLE -> ENGAGED
12. commit

Concurrent matchers that lose a lock/race must skip/retry rather than create conflicting state.

---

## 9. Matching trigger strategy

Avoid a permanently complicated external matching service for V1.

Matching can be invoked when meaningful state changes occur, for example:
- new request admitted
- driver becomes AVAILABLE
- engagement fails and participants return
- ride completes and driver returns
- request proximity tier expands
- location/authorization change makes supply newly eligible

A reconciliation job should also periodically discover WAITING work that may need retry/expansion.

This provides event-driven responsiveness plus self-healing.

---

## 10. Location architecture

Use canonical geographic points/polygons in Postgres/PostGIS:
- Market service area polygon/multipolygon
- optional Zone polygons
- Pickup Point geography point
- Request pickup/destination geography points
- Driver current geography point

Spatial index requirements:
- market/zone containment lookup
- nearby driver filtering
- distance ordering/filtering at scale

### Road-route distance
Road distance is different from straight-line geospatial distance.

Raahi should store:
- raw pickup/destination coordinates
- route/distance provider result used for commercial fare decision
- distance snapshot and source timestamp/provider metadata as appropriate

PostGIS proximity is useful for candidate pickup distance filtering, while a map/routing provider can later provide road-route distance/ETA where required.

---

## 11. Realtime architecture

Realtime is **notification/invalidation**, not canonical state management.

Pattern:
1. server transaction commits canonical state
2. realtime/client notification indicates relevant state changed
3. client refetches its canonical projection

If realtime is disconnected, reconnect/refetch restores state.

This prevents websocket races from becoming business races.

---

## 12. Timeout/reconciliation architecture

Every temporary business lock should have canonical expiry data, e.g. Engagement `expires_at`.

Scheduled reconciliation must be safe to run repeatedly:
- find expired ACTIVE Engagements
- attempt conditional transition ACTIVE -> FAILED
- restore request/driver state according to fault policy
- emit audit
- no-op if another command already resolved the Engagement

Likewise stale old WAITING requests can expire after policy-defined lifespan.

---

## 13. Idempotency architecture

Commands vulnerable to retry should accept/stash idempotency identity or derive a stable operation key.

Critical cases:
- request_ride
- payment initiation
- payment webhook events
- Accept/Pass/Counter/Decline
- start/complete ride
- admin exception

Database uniqueness + state preconditions are the final protection even if an idempotency cache/key lookup is missed.

---

## 14. Policy architecture

Market Policy Version should be immutable once published.

At request admission:
- resolve active/effective commercial policy version
- snapshot commercial result values required to explain the transaction

While WAITING:
- operational matching configuration may be re-read if rulebook permits and does not alter frozen commercial terms

At Engagement/Ride creation:
- freeze any remaining transaction-critical operational/commercial values needed for certainty/audit.

Avoid dozens of market-specific code branches.

---

## 15. Admin architecture

Local Admin UI should be primarily:
- configuration/policy publication
- driver authorization
- operational health metrics
- controlled exception commands

It should not expose generic row editors for Request/Availability/Engagement/Ride.

All admin actions are scope-checked and audited server-side.

---

## 16. Payment architecture

### DIRECT_TO_DRIVER
Raahi stores payment obligation/status and driver confirmation/dispute history.
No platform settlement required.

### PAY_RAAHI
A secure server-side endpoint/Edge Function/Worker can create payment intents and receive provider webhooks.
Webhook processing calls transactional backend commands using provider event IDs for idempotency.
Driver Settlement remains a separate lifecycle.

Payment integration must not be implemented in browser-only code.

---

## 17. Minimal infrastructure for first production-capable Raahi 3

1. Cloudflare Worker/static assets — frontend delivery
2. Supabase Auth — OTP/session identity
3. Supabase Postgres — canonical data + transactions
4. PostGIS — proximity/geofence data
5. RLS + explicit RPC command surface — authorization and mutations
6. Realtime — optional invalidation/refetch
7. Cron/pg_cron — reconciliation/timeouts
8. Mapping/routing provider — only when real road-distance/map functionality is introduced
9. Payment provider — only for markets actually using PAY_RAAHI

This intentionally avoids microservices, Kafka/event buses, Redis queues and Kubernetes in V1.

---

## 18. Scalability model

The same semantic matcher should support one or many markets.

Scale primarily by:
- indexed `market_id` filtering
- spatial indexes
- narrow transactional queries
- `SKIP LOCKED`/row-lock contention handling where appropriate
- bounded matching batches
- market-scoped workers/jobs if volume later requires isolation

Do not create a different matcher per city.

---

## 19. Architecture decisions that are now effectively forced by the product laws

- relational transactional database rather than client-owned state
- geospatial database capability
- command-based mutation surface
- immutable/versioned policies
- server-enforced authorization
- database-level uniqueness/concurrency protection
- independent payment lifecycle
- reconciliation for temporary states
- auditability

---

## 20. Decisions not yet required

The following can wait until implementation planning:
- exact map/routing provider
- exact payment gateway
- exact SMS/OTP provider behind auth
- whether all command RPCs are direct Postgres RPC or some are wrapped by Edge Functions
- typed policy tables versus versioned policy bundle storage
- exact analytics stack
- whether payment attempts deserve a dedicated table immediately

## 21. Next step

Design the **logical relational schema** and transaction boundaries needed to enforce this architecture, still without applying migrations or provisioning production infrastructure.