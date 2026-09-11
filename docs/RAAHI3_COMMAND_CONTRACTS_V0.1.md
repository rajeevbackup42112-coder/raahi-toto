# Raahi 3 Business Command Contracts v0.1

**Status:** Pre-SQL command/RPC blueprint.

The frontend should request business actions. It should not perform generic CRUD against Request, Availability, Engagement, Ride or Payment.

Names are descriptive and can change during implementation; ownership and transactional effects are the important part.

---

## 1. General command contract

Every state-changing command should:

1. identify/authenticate actor
2. authorize actor against target/scope
3. apply idempotency where retries are expected
4. lock/re-read canonical state when concurrency matters
5. validate preconditions
6. apply all related state transitions in one transaction where required
7. emit consequential Audit Event(s)
8. return canonical resulting state/IDs

The server, not UI, decides whether a command is legal.

---

# Passenger commands

## 2. `request_ride`

Actor: authenticated User / passenger.

Inputs conceptually:
- pickup coordinate or approved pickup point
- destination coordinate
- vehicle category
- required seat capacity when Car
- passenger offer only when route resolves to NEGOTIATED
- idempotency key
- trusted/server-produced route-distance result or route-resolution reference

Preconditions:
- passenger has no WAITING/ENGAGED request
- passenger has no nonterminal Ride in V1
- origin Market resolves and admits new work
- vehicle category enabled
- journey allowed by market/service geography
- applicable Market Policy Version resolves successfully
- route distance/fare rule is valid

System owns:
- origin market
- policy version
- pricing mode
- fixed fare when FIXED
- payment mode
- commercial snapshot
- initial priority

Transaction effects:
- create Ride Request WAITING
- set `priority_at = now()`
- snapshot commercial terms
- emit REQUEST_CREATED
- optionally invoke/queue matching after commit

Returns:
- request ID and canonical passenger projection

---

## 3. `change_waiting_request`

Actor: request owner.

Allowed only when Request is WAITING.

Inputs:
- changed pickup/destination/vehicle/capacity as permitted
- trusted route re-resolution when needed
- expected request revision/version

System classifies change as MINOR or MATERIAL.

MINOR:
- preserve priority when fare/eligibility competitive class is materially unchanged

MATERIAL:
- increment revision
- reset `priority_at = now()`
- re-resolve policy/fare eligibility as required by frozen commercial-change rules
- clear incompatible transient matching data

An ENGAGED request must resolve/cancel its Engagement before material edit.

---

## 4. `cancel_request`

Actor: request owner.

WAITING path:
- WAITING -> CANCELLED
- emit cancellation reason/actor

ENGAGED path:
- must resolve the ACTIVE Engagement as passenger-caused failure atomically
- request ends CANCELLED or returns per explicit chosen cancel semantics; for ordinary passenger cancellation, terminal CANCELLED is recommended
- driver recovery/priority handled in same transaction

FULFILLED/terminal requests cannot use this command.

---

## 5. `passenger_accept_counter`

Actor: request owner.

Preconditions:
- ACTIVE Engagement belongs to passenger's ENGAGED request
- pricing mode NEGOTIATED
- `awaiting_party = PASSENGER`
- immutable driver counter exists
- not expired/terminal

Transaction:
- Engagement -> SUCCEEDED at counter fare
- Request -> FULFILLED
- Driver Availability -> ON_RIDE
- create Ride CONFIRMED exactly once
- initialize canonical Payment
- emit events

---

## 6. `passenger_decline_counter`

Actor: request owner.

Preconditions same as Accept Counter.

Transaction:
- Engagement -> FAILED / PASSENGER_DECLINE
- Request -> WAITING with preserved priority for genuine negotiation disagreement
- Driver Availability -> AVAILABLE with preserved priority when disagreement is non-fault
- pair cooldown becomes effective from failed history
- emit events
- trigger rematching after commit

---

## 7. `passenger_cancel_ride`

Actor: ride passenger.

Allowed only in pre-trip states according to cancellation policy (`CONFIRMED`, `DRIVER_EN_ROUTE`, possibly `ARRIVED`).

Transaction:
- Ride -> CANCELLED
- apply passenger-caused priority/consequence policy
- return driver to AVAILABLE/OFFLINE according to online intent and policy
- Payment -> VOID/refund workflow as applicable
- emit audit/events

Not valid once Ride is IN_PROGRESS.

---

# Driver commands

## 8. `driver_go_online`

Actor: Driver's User.

Inputs:
- approved vehicle ID
- current location
- idempotency key optional

Preconditions:
- driver eligible/verified
- vehicle belongs to driver and is approved
- no active Engagement or nonterminal Ride

Effects:
- create/upsert current Driver Availability row
- `state = AVAILABLE`
- `online_intent = true`
- set active vehicle
- set/freshen current location
- set fresh `priority_at = now()` when genuinely joining supply
- emit DRIVER_BECAME_AVAILABLE
- trigger matching after commit

Repeated Online while already legitimately AVAILABLE must not create a new/older priority.

---

## 9. `driver_go_offline`

Actor: Driver's User.

If AVAILABLE:
- state -> OFFLINE
- `online_intent = false`
- clear queue priority as appropriate

If ENGAGED:
- cannot silently go OFFLINE; driver must Pass/Cancel through engagement semantics.

If ON_RIDE:
- set `online_intent = false`
- state remains ON_RIDE until Ride terminal
- effectively means **Go offline after this ride**.

---

## 10. `driver_update_location`

Actor: Driver's authenticated session/device.

High-frequency operational command, not a consequential audit event for every update.

Inputs:
- coordinates
- captured/client timestamp as metadata when useful

Checks:
- reject obviously stale/invalid updates
- server records `location_last_seen_at`
- update current point
- optionally update derived current-market projection

Location updates alter eligibility, not FIFO age by themselves.

---

## 11. `driver_accept_engagement`

Actor: engaged Driver.

Preconditions:
- Engagement ACTIVE
- awaiting DRIVER
- not expired
- driver/request still legally owned by Engagement

For FIXED:
- accepted amount = fixed Request fare

For NEGOTIATED before any counter:
- accepted amount = passenger offer

Transaction:
- Engagement -> SUCCEEDED
- Request -> FULFILLED
- Driver Availability -> ON_RIDE
- create Ride CONFIRMED
- create canonical Payment
- emit events

Idempotent under retry.

---

## 12. `driver_pass_engagement`

Actor: engaged Driver.

Preconditions:
- Engagement ACTIVE awaiting DRIVER

Transaction:
- Engagement -> FAILED / DRIVER_PASS
- passenger Request -> WAITING preserving passenger priority
- driver -> AVAILABLE/OFFLINE according to online intent and pass policy
- apply driver pass cooldown/priority consequence according to effective operational policy
- pair cooldown applies
- emit events
- rematch after commit

---

## 13. `driver_counter_engagement`

Actor: engaged Driver.

Preconditions:
- pricing mode NEGOTIATED
- Engagement ACTIVE awaiting DRIVER
- no existing driver counter
- amount within any policy guardrails

Effects:
- set immutable `driver_counter_minor`
- `awaiting_party = PASSENGER`
- set new `expires_at` according to passenger response timeout
- emit COUNTER_SUBMITTED

Does not change Engagement state from ACTIVE.

---

## 14. `driver_cancel_pretrip_ride`

Actor: Ride Driver.

Allowed only before IN_PROGRESS according to cancellation policy.

Transaction:
- Ride -> CANCELLED
- passenger can return to WAITING/recovery flow with preserved original request priority where policy says driver-caused cancellation should not punish passenger
- driver consequence/cooldown/reset applied
- Payment void/refund handling
- emit events

Implementation may reactivate the original Ride Request from FULFILLED back into a recovery-specific WAITING path only through this controlled command; if that creates lifecycle ambiguity, implementation may instead create a recovery request carrying preserved priority. This is flagged for detailed transaction design before SQL.

---

## 15. `mark_arrived`

Actor: Ride Driver.

Preconditions:
- Ride state DRIVER_EN_ROUTE (or allowed CONFIRMED shortcut if lifecycle implementation permits)
- current/last-trusted driver location within arrival tolerance, unless explicit authorized exception

Effects:
- Ride -> ARRIVED
- set `arrived_at`
- establish no-show grace deadline
- emit DRIVER_ARRIVED

---

## 16. `mark_passenger_no_show`

Actor: Ride Driver.

Preconditions:
- Ride ARRIVED
- grace period elapsed
- required location validity still satisfied or authorized exception

Effects:
- Ride -> NO_SHOW
- apply passenger consequence
- driver returns according to online intent with preserved/fair priority policy
- Payment cancellation/fee handling only if market policy explicitly supports it
- emit event

---

## 17. `start_ride`

Actor: Ride Driver.

Preconditions:
- Ride ARRIVED (or explicit narrowly defined policy path)
- not terminal

Effects:
- Ride -> IN_PROGRESS
- set `started_at`
- emit RIDE_STARTED

Duplicate start is harmless.

---

## 18. `complete_ride`

Actor: Ride Driver.

Preconditions:
- Ride IN_PROGRESS

Transaction:
- Ride -> COMPLETED
- set `completed_at`
- Driver Availability ON_RIDE -> AVAILABLE if `online_intent=true`, otherwise OFFLINE
- if AVAILABLE, assign post-completion fresh `priority_at` by default
- ensure Payment obligation remains/initializes exactly once
- create Settlement obligation if PAY_RAAHI and applicable
- emit RIDE_COMPLETED
- trigger matching if driver becomes AVAILABLE

Duplicate Complete must not duplicate financial effects.

---

## 19. `interrupt_ride`

Actor: Driver or authorized support path depending reason.

Preconditions:
- Ride IN_PROGRESS
- structured interruption reason

Effects:
- Ride -> INTERRUPTED
- financial/driver/passenger recovery follows explicit exception policy
- emit high-value audit event

---

# System/internal commands

## 20. `match_waiting_request`

Actor: SYSTEM only.

Inputs:
- request ID

Transaction logic:
1. lock/revalidate WAITING request
2. resolve current operational matching policy/tier
3. query compatible drivers by market authorization, vehicle/capacity, fresh location, proximity and pair exclusion
4. FIFO order by driver `priority_at` + deterministic tiebreaker
5. lock chosen Driver Availability
6. revalidate both
7. create ACTIVE Engagement
8. Request -> ENGAGED
9. Driver Availability -> ENGAGED
10. commit

If no driver qualifies, no business state corruption occurs.

---

## 21. `match_available_driver`

Optional optimization/system entry point when supply appears.

Selects oldest compatible passenger inside appropriate proximity pool and delegates to the same canonical engagement-creation logic.

Must not implement different matching semantics from `match_waiting_request`.

---

## 22. `expire_engagement`

Actor: SYSTEM reconciliation/cron.

Precondition:
- Engagement ACTIVE and `expires_at <= now()`

Conditional transaction:
- ACTIVE -> FAILED / DRIVER_TIMEOUT or PASSENGER_TIMEOUT based on awaiting party
- recover Request/Driver Availability according to fault rules
- apply cooldown/priority consequence
- emit events

If already resolved, no-op safely.

---

## 23. `expire_stale_request`

Actor: SYSTEM.

Precondition:
- WAITING request beyond policy lifespan / inactivity confirmation window

Effect:
- WAITING -> EXPIRED
- emit event

---

## 24. `reconcile_operational_state`

Actor: SYSTEM scheduled safety net.

Purpose:
- find expired ACTIVE Engagements
- find stale WAITING requests
- find impossible/recoverable transient mismatches that should have been resolved atomically

Reconciliation must use the same transition functions/invariants as normal commands; it must not patch rows arbitrarily.

---

# Payment commands

## 25. `confirm_direct_payment`

Actor: Driver for DIRECT_TO_DRIVER.

Preconditions:
- Payment belongs to Driver's Ride
- payment mode DIRECT_TO_DRIVER
- Payment PENDING or idempotently already CONFIRMED

Effect:
- Payment -> CONFIRMED
- timestamp/audit

Ride state unchanged.

---

## 26. `raise_payment_dispute`

Actor: authorized passenger/driver/support according to mode.

Effect:
- Payment -> DISPUTED under legal transition
- structured reason/evidence reference
- audit

Ride terminal state unchanged.

---

## 27. `process_payment_provider_event`

Actor: trusted server/payment webhook handler, never browser.

Inputs:
- provider event ID
- payment intent/provider reference
- verified provider payload/result

Requirements:
- provider event idempotency
- monotonic canonical outcome
- late PENDING/FAILED event cannot regress CONFIRMED improperly
- settlement initialization only once where applicable

---

# Admin commands

## 28. `publish_market_policy`

Actor: scoped Local Admin or Global Admin.

Inputs:
- expected current policy version
- complete new policy bundle
- optional effective timing

Checks:
- scope authorization
- optimistic version conflict
- strict policy schema validation
- nonoverlapping fare slabs
- safe global guardrails

Effects:
- create immutable new Market Policy Version
- make effective according to timing
- audit old/new version

Existing commercial snapshots do not mutate.

---

## 29. `set_market_state`

Actor: authorized admin.

Inputs:
- target state / pause mode
- reason

Effects:
- update Market lifecycle
- handle admission/matching consequences through explicit rules
- never casually terminate IN_PROGRESS rides
- audit

---

## 30. `set_driver_market_authorization`

Actor: admin scoped to Market or Global.

Inputs:
- driver
- market
- target legal authorization state
- reason

Effects:
- transition authorization
- if authorization becomes non-ACTIVE, driver immediately becomes ineligible for new work in that market
- active Ride treatment remains controlled/safe
- audit

---

## 31. `grant_admin_assignment` / `revoke_admin_assignment`

Actor: Global Admin in V1.

Effects:
- create/revoke scoped Admin Assignment
- audit

No account sharing is required for delegation.

---

## 32. `admin_exception`

Prefer typed exception commands over one unconstrained mutation endpoint.

Examples later may include:
- admin_cancel_ride
- admin_interrupt_ride
- admin_release_engagement
- admin_correct_payment_status
- admin_refund_payment

Every exception:
- requires authorized scope
- requires reason
- validates legal cross-entity outcome
- emits high-value audit

---

## 33. Query/projection contracts

Not every UI needs raw tables. Useful canonical projections may include:

### Passenger current journey
- active request / engagement / ride
- fare/payment summary
- driver public details after confirmation

### Driver home/current work
- online intent/state
- current active vehicle
- current engagement or ride
- payment confirmation task

### Admin market operations
- waiting demand count
- available supply count
- oldest/median wait
- active engagements/rides
- cancellation/pass rates
- payment exceptions

Projections can be views/functions but must not become writable state owners.

---

## 34. Important transaction-design issue discovered

A **driver-caused cancellation after a Ride has already been created** raises one subtle lifecycle question:

The original Ride Request is already FULFILLED, yet fairness says the innocent passenger should regain matching priority.

There are two implementation-safe designs:

### Option A — controlled Request recovery
Allow a specific system command to transition the fulfilled request back into WAITING after cancelling the pre-trip Ride, preserving old `priority_at`.

Pros: one request identity; easy passenger continuity.
Cons: weakens the otherwise clean rule that FULFILLED is terminal.

### Option B — recovery Request
Keep original Request FULFILLED and Ride CANCELLED. Create a new linked recovery Request carrying the passenger's preserved `priority_at` and original commercial snapshot where still valid.

Pros: terminal history remains immutable; clean event history.
Cons: introduces request lineage/replacement concept.

**Recommendation:** Option B. Keep terminal states truly terminal. A driver-caused pre-trip cancellation creates a controlled recovery Request linked to the previous request/ride with preserved priority. Ordinary passenger-created new requests still receive fresh priority.

This is a schema refinement, not a user-facing second booking.

---

## 35. Another implementation detail discovered: online intent

Driver Availability needs an orthogonal `online_intent` boolean.

Examples:
- AVAILABLE -> online_intent true
- ENGAGED -> true
- ON_RIDE + driver taps Go Offline -> state remains ON_RIDE, online_intent false
- on Ride completion: true -> AVAILABLE, false -> OFFLINE

This avoids an unnecessary `OFFLINE_AFTER_RIDE` state.

---

## 36. Next step

Update the logical schema for recovery-request lineage and online intent, then produce the database/transaction blueprint (constraints, indexes, function ownership and matching pseudocode) ready for implementation review.