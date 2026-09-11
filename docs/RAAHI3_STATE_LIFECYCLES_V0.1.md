# Raahi 3 State Lifecycles v0.1

**Status:** Canonical lifecycle baseline before database design.

This document defines independent lifecycles. It deliberately avoids one giant cross-product status model.

## 1. Lifecycle design laws

1. Always ask **status of what?**
2. Keep independent concerns in independent lifecycles.
3. Use a small state set plus reasons/attributes instead of a state for every circumstance.
4. Terminal states do not reopen through normal business commands.
5. Admin correction is an explicit exception command, never direct state editing.
6. Duplicate, late and out-of-order commands must be safe.

---

## 2. Ride Request lifecycle

Canonical states:

`WAITING -> ENGAGED -> FULFILLED`

Failure/exit paths:

`WAITING -> CANCELLED`
`WAITING -> EXPIRED`
`ENGAGED -> WAITING`
`ENGAGED -> CANCELLED`
`ENGAGED -> EXPIRED`

### WAITING
Passenger demand is active and eligible for matching when all policy/market conditions are satisfied.

Carries stable `priority_at`.

### ENGAGED
Exactly one active Engagement currently owns the request. The request is removed from available demand while that Engagement is active.

### FULFILLED
A successful Engagement created a Ride. Terminal.

### CANCELLED
Passenger/system/admin explicitly ended the request before a Ride was created. Terminal.

### EXPIRED
Request aged out or was automatically closed after inactivity / market rules. Terminal.

### Important rule
A failed Engagement does **not** create a new request by default. The same request returns `ENGAGED -> WAITING` unless a material journey change requires a new competitive priority.

### Material edits
V0.1 recommendation: retain the same Ride Request identity, increment a request revision/version, reset `priority_at`, re-evaluate fare/eligibility, and audit the prior values. This avoids unnecessary replacement-request chains while preserving fairness and history.

---

## 3. Driver Availability lifecycle

Canonical states:

`OFFLINE -> AVAILABLE -> ENGAGED -> ON_RIDE -> AVAILABLE`

Other paths:

`AVAILABLE -> OFFLINE`
`ENGAGED -> AVAILABLE`
`ENGAGED -> OFFLINE` only after the Engagement is legally resolved
`ON_RIDE -> OFFLINE` after the Ride ends if the driver no longer wishes to remain online

### OFFLINE
Driver is not participating in supply.

### AVAILABLE
Driver intends to receive work and has a queue `priority_at`.

**AVAILABLE does not automatically mean matchable.** Eligibility also requires fresh location, active vehicle, active market authorization, compatible market/vehicle rules, and no cooldown/exclusion.

### ENGAGED
One active Engagement temporarily owns the driver. Driver cannot be matched elsewhere.

### ON_RIDE
Driver has a Ride that has not reached a terminal Ride state.

### Orthogonal facts, not Availability states
- GPS/location freshness
- current coordinates
- market authorization
- active vehicle approval
- cooldown eligibility
- app/websocket connection health

A driver can remain AVAILABLE while temporarily ineligible because location is stale; their underlying FIFO priority need not be destroyed by a short network interruption.

---

## 4. Engagement lifecycle

Keep this intentionally minimal:

`ACTIVE -> SUCCEEDED`
`ACTIVE -> FAILED`

Both SUCCEEDED and FAILED are terminal.

### ACTIVE
One passenger request and one driver are exclusively paired.

Mutable decision facts while ACTIVE:
- `awaiting_party = DRIVER | PASSENGER`
- `expires_at`
- passenger offer when negotiation is allowed
- immutable driver counter once submitted

### SUCCEEDED
Fare/acceptance has resolved positively and exactly one Ride is created.

### FAILED
The pairing ended without a Ride.

Failure detail belongs in `resolution_reason`, not in separate states. Examples:
- DRIVER_PASS
- DRIVER_TIMEOUT
- PASSENGER_DECLINE
- PASSENGER_TIMEOUT
- DRIVER_CANCEL
- PASSENGER_CANCEL
- SYSTEM_CANCEL
- MARKET_PAUSE

### Why this is simpler
We do not need states such as `WAITING_FOR_DRIVER`, `COUNTER_SENT`, `COUNTER_REJECTED`, `TIMED_OUT_DRIVER`, etc. `awaiting_party`, the immutable fare fields, expiry and resolution reason explain those cases.

### Failed Engagement recovery
On FAILED, each side transitions independently according to fault rules:
- innocent participant normally preserves `priority_at`
- participant causing voluntary failure normally loses/reset priority or receives cooldown according to policy
- genuine negotiation disagreement may preserve both priorities
- pair receives temporary rematch exclusion derived from recent Engagement history

---

## 5. Ride lifecycle

Canonical states:

`CONFIRMED -> DRIVER_EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED`

Exceptional terminal states:
- `CANCELLED`
- `NO_SHOW`
- `INTERRUPTED`

### CONFIRMED
Successful Engagement has created the Ride. Fare, market ownership and commercial snapshots are frozen.

### DRIVER_EN_ROUTE
Driver is proceeding to pickup.

### ARRIVED
Driver is geographically near pickup or a bounded operational exception has been accepted.

### IN_PROGRESS
Passenger journey has started. Normal pre-trip cancellation no longer applies.

### COMPLETED
Physical journey ended normally. Terminal.

### CANCELLED
Ride ended before journey start under a cancellation rule. Terminal.

### NO_SHOW
Ride ended before journey start because one party failed to appear under the applicable grace/proximity rules. Terminal.

### INTERRUPTED
Journey started but could not complete normally, e.g. breakdown or exceptional safety/operational event. Terminal for normal commands.

### Core rule
A terminal Ride never moves backward through normal commands. Support correction must be an audited exception action.

---

## 6. Payment lifecycle

Payment is independent of Ride.

Canonical payment-intent states:

`PENDING -> CONFIRMED`
`PENDING -> DISPUTED`
`PENDING -> VOID`
`CONFIRMED -> DISPUTED`
`CONFIRMED -> REFUNDED` when platform-controlled refund is applicable

### PENDING
Payment obligation exists but canonical confirmation has not been established.

### CONFIRMED
Payment is canonically considered received according to the payment mode.

For DIRECT_TO_DRIVER this may mean driver confirmation.
For PAY_RAAHI this means platform/provider confirmation.

### DISPUTED
Parties/provider evidence conflicts or a post-confirmation dispute is raised.

### VOID
Payment obligation was cancelled before settlement, for example because a payable Ride never proceeded.

### REFUNDED
Platform-controlled refund completed. Primarily relevant to PAY_RAAHI.

### Attempt failures
A failed gateway attempt should not necessarily make the canonical Payment terminal. Payment attempts can later be modeled separately; canonical Payment may remain PENDING while another attempt is allowed.

### Monotonicity
A provider callback must never regress `CONFIRMED` back to `PENDING` merely because an older event arrives late.

---

## 7. Driver Settlement lifecycle

Only required when Raahi collects money.

Recommended lifecycle:

`PENDING -> PROCESSING -> SETTLED`
`PENDING/PROCESSING -> FAILED`
`FAILED -> PROCESSING` on retry

Settlement failure never changes Ride state and never changes a passenger Payment from CONFIRMED.

---

## 8. Driver Market Authorization lifecycle

Canonical states:

`PENDING -> ACTIVE`
`PENDING -> REJECTED`
`ACTIVE -> SUSPENDED`
`SUSPENDED -> ACTIVE`
`ACTIVE/SUSPENDED -> EXPIRED`
`ACTIVE/SUSPENDED -> REVOKED`

### Matchability rule
Only ACTIVE authorization can satisfy market authorization eligibility.

REJECTED, EXPIRED and REVOKED are terminal for that authorization record; a future approval may create a new authorization history record if implementation chooses.

---

## 9. Market lifecycle

Canonical states:

`DRAFT -> PILOT -> ACTIVE -> PAUSED -> ACTIVE`

Retirement:

`DRAFT/PILOT/ACTIVE/PAUSED -> RETIRED`

### DRAFT
Configuration incomplete; no ordinary passenger admission.

### PILOT
Restricted live operation for selected users/drivers or controlled rollout.

### ACTIVE
Normal request admission allowed subject to operating policy.

### PAUSED
New work is restricted according to pause mode. Existing work is handled by transaction stage.

### RETIRED
No new operations. Historical data remains. Terminal.

### Pause mode is not a Market state
`SOFT` versus `EMERGENCY` is a pause attribute/policy:
- SOFT: stop new admissions; allow waiting/engaged/confirmed work to drain according to policy
- EMERGENCY: may release waiting/unconfirmed work while normally allowing already in-progress rides to end safely

---

## 10. Vehicle operational eligibility

Vehicle approval is kept separate from Ride/Availability lifecycle.

Minimum V1 concept:
- APPROVED
- INACTIVE / NOT_APPROVED

If formal document lifecycle becomes necessary later, vehicle/credential verification can gain its own model without changing matching semantics.

---

## 11. Cross-lifecycle transitions

### Passenger requests a ride
System validates market/policy/journey -> creates Ride Request WAITING.

### Matcher succeeds
Ride Request WAITING -> ENGAGED
Driver Availability AVAILABLE -> ENGAGED
Engagement created ACTIVE

These changes must be atomic from the system's perspective.

### Engagement fails
Engagement ACTIVE -> FAILED
Ride Request ENGAGED -> WAITING/CANCELLED/EXPIRED as rules require
Driver Availability ENGAGED -> AVAILABLE/OFFLINE as rules require
Priority consequences are applied independently to each participant.

### Engagement succeeds
Engagement ACTIVE -> SUCCEEDED
Ride Request ENGAGED -> FULFILLED
Driver Availability ENGAGED -> ON_RIDE
Ride created CONFIRMED

Exactly one Ride may result.

### Ride completes
Ride -> COMPLETED
Driver Availability ON_RIDE -> AVAILABLE if driver still intends to be online and remains operationally eligible; otherwise OFFLINE.
Payment continues independently until its own canonical outcome.

---

## 12. State machine boundaries

Do not create a single combined status such as:
`PASSENGER_WAITING_DRIVER_COUNTER_PAYMENT_PENDING`.

Canonical truth is the combination of independent entities:
- Request state
- Driver Availability state
- Engagement state
- Ride state
- Payment state

This keeps each transition understandable and testable.

---

## 13. Frozen lifecycle conclusions

1. Request itself is the passenger queue item.
2. Driver Availability itself is the driver queue item.
3. GPS freshness is eligibility, not queue status.
4. Engagement needs only ACTIVE / SUCCEEDED / FAILED plus structured reason/awaiting-party facts.
5. Successful Engagement creates Ride directly; no Booking state/entity.
6. Payment lifecycle is independent of Ride lifecycle.
7. Commercial policy snapshot freezes when Request is admitted.
8. Matching flexibility may continue for WAITING requests without mutating commercial certainty.
9. Terminal operational states do not reopen via normal commands.
10. Material request edits keep the Request identity in v0.1, but reset competitive priority and increment revision.

## 14. Next step

Freeze cross-entity invariants, command ownership and permissions before any schema/table design.