# Raahi 3 Invariants & Ownership v0.1

**Status:** Product/business integrity baseline before API and schema design.

## 1. Ownership law

Raahi follows:

> **Human expresses intent -> System applies rules -> System executes -> Admin handles policy and controlled exceptions.**

Humans do not directly mutate canonical operational state.

---

## 2. Actor ownership

### Passenger owns intent to
- request a ride
- choose pickup/destination/vehicle requirement
- provide an offer when negotiation is allowed
- accept/decline a driver counter when permitted
- cancel when lifecycle rules permit
- confirm/raise payment issues when payment mode requires passenger action

Passenger does **not** own
- driver selection
- FIFO position calculation
- market assignment
- fare-mode determination
- fixed-fare amount calculation
- proximity expansion
- policy version selection

### Driver owns intent to
- choose approved active vehicle while offline
- go online/offline when lifecycle permits
- accept/pass a fixed or offered fare request
- send one counter when negotiation is allowed
- mark operational milestones such as Arrived/Start/Complete when preconditions hold
- confirm direct payment receipt when applicable

Driver does **not** own
- choosing which passenger appears next
- editing queue priority
- changing fixed fare
- serving unauthorized markets
- declaring arrival/no-show without geographic/time preconditions

### Local Admin owns
- market-scoped policy configuration within guardrails
- market status/pause actions within authority
- driver-market authorization within assigned scope
- controlled operational exceptions explicitly exposed by the platform

Local Admin does **not** own
- routine passenger-driver pairing
- FIFO reordering
- VIP passenger priority
- preferred-driver assignment
- direct mutation of operational rows
- changing another market

### Global Admin owns
- market lifecycle/governance
- local admin assignment/revocation
- platform guardrails
- cross-market visibility and controlled exceptions
- emergency governance actions

### System owns
- canonical market resolution
- policy selection/version snapshot
- distance/fare-mode resolution
- eligibility
- proximity candidate pool
- FIFO winner
- exclusive engagement creation
- timeout processing
- atomic lifecycle transitions
- idempotency and concurrency protection
- audit emission

---

## 3. Identity invariants

1. One mobile-authenticated User represents one canonical human account.
2. A User has at most one Driver identity.
3. A Driver may own/use many Vehicles over time.
4. A Driver has at most one active Driver Availability participation.
5. Admin authority comes only from active scoped Admin Assignment(s), not UI role labels.

---

## 4. Ride Request invariants

1. A passenger/user may have at most one active Ride Request in WAITING or ENGAGED state at a time in V1.
2. Each Ride Request belongs to exactly one origin Market.
3. Origin Market is immutable after request admission.
4. Request commercial snapshot is immutable after admission except through an explicit material-change re-evaluation before engagement.
5. A WAITING request has exactly one `priority_at` used for FIFO fairness.
6. A material request change resets competitive priority and increments request revision.
7. A request cannot be materially edited while an active Engagement owns it; resolve/cancel the engagement first.
8. FULFILLED, CANCELLED and EXPIRED are terminal under normal commands.
9. A FULFILLED request maps to at most one Ride.

---

## 5. Driver Availability invariants

1. One Driver has at most one active Driver Availability record/participation.
2. AVAILABLE means supply intent, not guaranteed matchability.
3. A driver is matchable only when all eligibility predicates pass at commit time, including fresh location, active vehicle, active market authorization, market/vehicle compatibility and no active exclusion.
4. A Driver Availability has one active Vehicle; it cannot change while AVAILABLE, ENGAGED or ON_RIDE without first leaving active supply according to lifecycle rules.
5. Driver FIFO priority is represented by one stable `priority_at` while the driver remains legitimately in supply.
6. Brief location/connectivity loss may make the driver temporarily ineligible without automatically resetting priority.
7. Rejoining after voluntary OFFLINE creates fresh priority.
8. A driver cannot be OFFLINE and simultaneously own an active Engagement or Ride through ordinary transitions.

---

## 6. Matching invariants

1. Matching order is: origin Market -> authorization -> vehicle/capacity compatibility -> geographic/proximity pool -> FIFO -> exclusive Engagement.
2. Compatibility is binary before FIFO. An incompatible older driver never blocks a compatible newer driver.
3. Geography defines the candidate pool; FIFO chooses the winner within the current tier.
4. Matching must revalidate passenger and driver immediately before committing an Engagement.
5. Passenger and driver must both be in matchable canonical states when the Engagement commits.
6. One matching transaction either creates the complete exclusive pairing or creates nothing; no half-match state is allowed.
7. If concurrent matchers compete for the same passenger/driver, at most one can commit.
8. Matching never directly changes commercial terms already snapshotted to the request.
9. Failed match searches are not business state transitions by themselves.

---

## 7. Engagement invariants

1. A Ride Request has at most one ACTIVE Engagement.
2. A Driver has at most one ACTIVE Engagement.
3. An ACTIVE Engagement refers to exactly one request and one driver.
4. Both sides are removed from available matching while Engagement is ACTIVE.
5. Fixed-fare Engagements cannot accept a driver counteroffer.
6. Negotiated Engagements permit at most one submitted driver counter in V1.
7. Once submitted, a counteroffer is immutable.
8. `awaiting_party` identifies who must act next; there is never more than one awaiting party.
9. ACTIVE transitions exactly once to SUCCEEDED or FAILED.
10. SUCCEEDED/FAILED are terminal.
11. A SUCCEEDED Engagement creates at most one Ride.
12. A FAILED Engagement creates no Ride.
13. Duplicate Accept/Pass/Counter/Decline/timeout commands cannot create duplicate consequences.
14. Pair-rematch exclusion must prevent immediate repetition after qualifying failed engagements.

---

## 8. FIFO/fairness invariants

1. The innocent party should not lose queue priority because of the other party's failure.
2. Genuine negotiation disagreement may preserve both parties' priority.
3. Voluntary cancellation/pass/no-show consequences apply to the actor responsible according to policy.
4. Incompatibility or geographic ineligibility never resets queue priority.
5. Proximity expansion does not rewrite FIFO priority.
6. Driver movement changes eligibility, not historical queue age.
7. A passenger cannot preserve old priority across a material request change.
8. Going offline and rejoining cannot be used to gain an older driver priority.

---

## 9. Ride invariants

1. A Ride is created only from a SUCCEEDED Engagement.
2. A Ride has exactly one passenger/request, one driver and one vehicle snapshot.
3. Agreed fare, pricing mode, origin market and commercial policy snapshot are immutable once Ride is created.
4. Driver vehicle cannot change during a Ride.
5. ARRIVED requires proximity/grace validation or an explicit audited exception.
6. NO_SHOW cannot be declared before required arrival/grace conditions.
7. IN_PROGRESS blocks ordinary pre-trip cancellation semantics.
8. COMPLETED/CANCELLED/NO_SHOW/INTERRUPTED are terminal under normal commands.
9. A terminal Ride never automatically reopens because Payment/Settlement changes.
10. One Driver cannot own more than one nonterminal Ride at once.
11. One passenger request cannot result in more than one nonterminal Ride.

---

## 10. Fare and policy invariants

1. Fare mode is exactly FIXED or NEGOTIATED.
2. Fixed fare is derived from the applicable immutable commercial policy snapshot and journey basis.
3. Neither passenger nor driver can modify a FIXED fare through negotiation.
4. Negotiation result is explicit and auditable.
5. Boundary rules such as `<=3 km` must be deterministic; no overlapping ambiguous slabs may publish.
6. Policy versions are immutable after publication.
7. Existing admitted requests do not silently adopt newer commercial policy versions.
8. Operational policies may affect still-WAITING matching only where commercial certainty is unchanged.
9. Policy changes cannot mutate a Ride already created.
10. Every consequential transaction must be explainable by the policy version/effective values it used.

---

## 11. Payment invariants

1. Payment lifecycle is independent of Ride lifecycle.
2. One Ride has one canonical passenger payment obligation/outcome, even if multiple payment attempts occur.
3. Payment mode is snapshotted from the transaction's market policy.
4. Duplicate payment initiation/provider callbacks must be idempotent.
5. A late/older callback cannot regress CONFIRMED payment to PENDING.
6. Direct-payment dispute does not roll a COMPLETED Ride backward.
7. PAY_RAAHI driver settlement is separate from passenger Payment.
8. Settlement failure cannot change passenger Payment or Ride completion state.
9. Refund, if supported, is an explicit financial transition, not deletion/reversal of history.

---

## 12. Market/authorization invariants

1. Each pickup resolves deterministically to exactly one origin Market before request admission.
2. Being physically inside a Market does not imply Driver Market Authorization.
3. Matching requires ACTIVE authorization for the origin Market.
4. Local Admin may act only inside active assignment scope.
5. RETIRED Market admits no new ordinary requests.
6. PAUSED Market behavior follows explicit pause mode; active in-progress rides are not casually destroyed by configuration change.
7. Market configuration changes are versioned and audited.

---

## 13. Admin and exception invariants

1. UI hiding is never the authorization boundary; backend/data layer enforces scope.
2. Admin cannot directly reorder FIFO.
3. Admin cannot directly edit canonical operational tables/rows in production workflow.
4. Every exception command requires explicit authorization, validates the same core invariants, records reason/actor and emits audit history.
5. Routine matching remains system-owned even when admins are online.
6. Suspending a driver prevents new work; treatment of an already in-progress Ride follows safety/exception policy rather than destructive row edits.
7. Concurrent policy edits require version checks so one admin cannot silently overwrite another's newer publication.

---

## 14. Concurrency/idempotency invariants

Every externally callable Raahi command should be safe when received:
- twice
- late
- out of order

Required effects:
1. duplicate request creation with same idempotency intent cannot create two active requests
2. duplicate Accept cannot create two Rides
3. duplicate Complete cannot duplicate Payment/Settlement effects
4. duplicate timeout cannot close an Engagement twice
5. stale client commands cannot overwrite newer server state
6. transactional preconditions are rechecked at commit time
7. canonical server/database state wins over cached UI state

---

## 15. Audit invariants

1. Consequential admin/system/business transitions emit immutable audit/event history.
2. Audit history records actor, action, target, timestamp and material reason/context.
3. Policy publications preserve old/new version traceability.
4. Exception commands are always auditable.
5. Audit/event history explains canonical state but is not itself the sole mutable state mechanism in V1.

---

## 16. Permissions summary

### Passenger
Can act on own active request/engagement/payment within lifecycle rules.
Cannot select arbitrary driver or modify system-owned priority/policy.

### Driver
Can act on own availability/engagement/ride/payment-confirmation within lifecycle rules.
Cannot choose arbitrary passenger or modify fixed fare/FIFO.

### Local Admin
Can publish/configure assigned Market policies and use authorized exceptions.
Cannot operate another Market or routinely dispatch/reorder.

### Global Admin
Can manage markets/admin assignments/guardrails and controlled global exceptions.

### System
Sole owner of matching, automatic timeouts, policy application, canonical transitions and derived eligibility.

---

## 17. Architecture consequence

The eventual API/database should expose **business commands**, not generic CRUD for operational entities.

Examples of intent-level commands (names not frozen yet):
- request_ride
- change_waiting_request
- cancel_request
- go_online
- go_offline
- driver_accept
- driver_pass
- driver_counter
- passenger_accept_counter
- passenger_decline_counter
- mark_arrived
- start_ride
- complete_ride
- confirm_direct_payment
- publish_market_policy
- authorize_driver_for_market
- admin_cancel_ride

Each command must enforce the invariants above atomically.

## 18. Next step

Build a Given/When/Then acceptance catalogue covering happy path, rejection path, concurrency, admin policy changes, geography, FIFO, payments and exceptions before database design.