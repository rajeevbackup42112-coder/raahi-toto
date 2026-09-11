# Raahi 3 Acceptance Scenarios v0.1

**Status:** Pre-architecture behavioral test baseline.

Each scenario tests one product law. Exact timeout/radius/cooldown values remain policy data unless explicitly frozen.

---

## A. Request admission and market ownership

### A1 — valid request admitted
**Given** Gomoh is ACTIVE, ToTo is enabled, pickup and destination are valid, and the passenger has no active request  
**When** the passenger requests a ToTo  
**Then** exactly one Ride Request is created in WAITING with Gomoh as immutable origin Market.

### A2 — duplicate tap does not duplicate demand
**Given** a passenger already has an active request created with the same idempotency intent  
**When** the client submits Request Ride again  
**Then** the existing request is returned and no second active request is created.

### A3 — one active passenger request
**Given** Priya already has a WAITING or ENGAGED Ride Request  
**When** she attempts to create another ride request  
**Then** the system does not create a second active request.

### A4 — market determined from pickup
**Given** pickup resolves to Gomoh and destination lies in Dhanbad  
**When** the request is admitted  
**Then** Gomoh owns the request and Gomoh commercial policy is snapshotted.

### A5 — market boundary deterministic
**Given** a pickup lies in an overlapping/boundary area  
**When** market resolution runs  
**Then** exactly one canonical origin Market is selected before admission.

### A6 — inactive market rejects new request
**Given** origin Market is RETIRED or not open for ordinary admissions  
**When** passenger requests a ride  
**Then** no WAITING request is admitted.

---

## B. Fare policy

### B1 — exact lower slab boundary
**Given** ToTo fare policy is `<=3 km = ₹50 FIXED`  
**When** resolved road distance is exactly 3.0 km  
**Then** pricing mode is FIXED and fare is ₹50.

### B2 — just above slab boundary
**Given** `>3 km and <=5 km = ₹100 FIXED`  
**When** distance is 3.01 km  
**Then** fare is ₹100 FIXED.

### B3 — exact upper fixed boundary
**Given** the same policy  
**When** distance is exactly 5.0 km  
**Then** fare is ₹100 FIXED.

### B4 — negotiation threshold
**Given** `>5 km = NEGOTIATED`  
**When** distance is 5.01 km  
**Then** request pricing mode is NEGOTIATED.

### B5 — fixed fare cannot be edited by passenger
**Given** request fare is FIXED ₹50  
**When** passenger attempts to submit ₹40  
**Then** the command is rejected/ignored and canonical fare remains ₹50.

### B6 — fixed fare cannot be countered by driver
**Given** an ACTIVE fixed-fare Engagement at ₹50  
**When** driver attempts a counteroffer  
**Then** the system rejects the counter command.

### B7 — policy changes do not mutate admitted request
**Given** Priya entered WAITING under Fare Policy v1 at ₹50  
**When** admin publishes v2 at ₹60  
**Then** Priya remains ₹50 and a new request after publication uses ₹60.

### B8 — invalid overlapping slabs cannot publish
**Given** proposed fare rules overlap ambiguously  
**When** admin attempts publication  
**Then** policy publication fails before becoming active.

---

## C. Driver supply and authorization

### C1 — driver goes online
**Given** Ravi is verified, has an approved active vehicle and no active availability  
**When** Ravi goes Online  
**Then** one Driver Availability becomes AVAILABLE with fresh `priority_at`.

### C2 — duplicate online does not duplicate queue position
**Given** Ravi already has active Driver Availability  
**When** go-online is submitted again  
**Then** no second availability/priority entry is created.

### C3 — driver cannot change vehicle while available
**Given** Ravi is AVAILABLE with Vehicle A  
**When** he attempts to activate Vehicle B  
**Then** change is rejected until he leaves active supply.

### C4 — current location does not grant authorization
**Given** Ravi is physically in Dhanbad but has only Gomoh ACTIVE authorization  
**When** a Dhanbad request is matched  
**Then** Ravi is ineligible.

### C5 — authorized roaming works
**Given** Ravi is ACTIVE-authorized for Gomoh and Dhanbad and currently eligible in Dhanbad  
**When** Dhanbad demand is matched  
**Then** Ravi may participate normally.

### C6 — stale GPS blocks new match
**Given** Ravi is AVAILABLE but `location_last_seen_at` is beyond freshness threshold  
**When** matcher evaluates him  
**Then** he is excluded without necessarily resetting FIFO priority.

### C7 — voluntary offline resets future priority
**Given** Ravi voluntarily goes OFFLINE  
**When** he later goes ONLINE again  
**Then** he receives a new `priority_at`.

---

## D. Compatibility and proximity-gated FIFO

### D1 — incompatible capacity skipped
**Given** passenger requires 6 seats, older driver has 4-seat car, newer driver has 7-seat car  
**When** matching runs  
**Then** 4-seat driver is skipped without losing priority and 7-seat driver can match.

### D2 — proximity tier before FIFO
**Given** Ravi joined earlier but is outside Tier 1 and Pankaj joined later inside Tier 1  
**When** passenger matching runs at Tier 1  
**Then** Pankaj is eligible and Ravi is not.

### D3 — FIFO within same proximity tier
**Given** Ravi and Pankaj are both compatible inside Tier 1 and Ravi has older `priority_at`  
**When** one passenger is matched  
**Then** Ravi wins even if Pankaj is geographically closer inside the same tier.

### D4 — driver movement changes eligibility, not age
**Given** Ravi has older driver priority and moves from outside to inside a request's active tier  
**When** matching reruns  
**Then** his original priority participates; movement did not reset it.

### D5 — tier expansion does not rewrite passenger priority
**Given** Priya waits with no Tier 1 supply  
**When** system expands to Tier 2  
**Then** Priya keeps original `priority_at`.

### D6 — oldest compatible passenger gets driver
**Given** one driver becomes available and two compatible passengers are inside the same proximity tier  
**When** matching runs  
**Then** older passenger request wins.

### D7 — newer nearby passenger does not starve older eligible passenger
**Given** Amit waited 10 minutes at 2 km and Sana just requested at 100 m, both in same tier  
**When** one driver is allocated  
**Then** Amit wins by FIFO.

---

## E. Atomic exclusive engagement

### E1 — one driver cannot engage two passengers
**Given** two matcher workers simultaneously see Ravi as AVAILABLE  
**When** both attempt to engage him with different passengers  
**Then** at most one Engagement commits.

### E2 — one passenger cannot engage two drivers
**Given** two candidate drivers are evaluated concurrently for Priya  
**When** both workers attempt commitment  
**Then** at most one ACTIVE Engagement owns Priya's request.

### E3 — matcher revalidates before commit
**Given** Ravi was eligible when selected but goes OFFLINE before commit  
**When** matcher attempts Engagement creation  
**Then** transaction fails/retries and no invalid Engagement is created.

### E4 — cancellation race is deterministic
**Given** Priya is WAITING and matcher concurrently attempts Engagement while Priya cancels  
**When** transactions race  
**Then** only a legal committed sequence results: either request is CANCELLED before matching or becomes ENGAGED before cancellation follows engagement rules; passenger/driver never see contradictory canonical states.

### E5 — failed matching leaves no half state
**Given** matching transaction crashes before commit  
**When** recovery occurs  
**Then** either complete Engagement exists or both sides remain in prior canonical state.

---

## F. Fixed-fare engagement

### F1 — fixed driver accepts
**Given** ACTIVE Engagement for FIXED ₹50 awaiting DRIVER  
**When** driver accepts  
**Then** Engagement becomes SUCCEEDED and exactly one Ride is created with ₹50.

### F2 — fixed driver passes
**Given** ACTIVE fixed-fare Engagement  
**When** driver passes  
**Then** Engagement becomes FAILED; no Ride is created; passenger recovery/priority follows fault rules.

### F3 — duplicate accept is harmless
**Given** driver Accept succeeded  
**When** same Accept command is received again  
**Then** same resulting Ride is returned/no second Ride is created.

### F4 — stale accept after timeout rejected
**Given** Engagement already FAILED due to timeout  
**When** driver's delayed Accept arrives  
**Then** it cannot revive the Engagement or create a Ride.

---

## G. Negotiated engagement

### G1 — driver accepts passenger offer
**Given** NEGOTIATED Engagement awaiting DRIVER with passenger offer ₹180  
**When** driver accepts  
**Then** Engagement SUCCEEDS at ₹180 and one Ride is created.

### G2 — driver sends one counter
**Given** NEGOTIATED Engagement awaiting DRIVER  
**When** driver counters ₹220  
**Then** immutable counter ₹220 is stored and `awaiting_party` becomes PASSENGER.

### G3 — second counter rejected
**Given** driver counter ₹220 already exists  
**When** driver attempts to change it to ₹230  
**Then** command is rejected; canonical counter remains ₹220.

### G4 — passenger accepts counter
**Given** counter ₹220 awaits passenger  
**When** passenger accepts  
**Then** Engagement SUCCEEDS and Ride fare is ₹220.

### G5 — passenger declines counter
**Given** counter ₹220 awaits passenger  
**When** passenger declines  
**Then** Engagement FAILS, no Ride is created, and both sides recover according to disagreement policy.

### G6 — pair cooldown prevents immediate loop
**Given** Priya/Ravi Engagement just FAILED after legitimate negotiation disagreement  
**When** matching reruns immediately  
**Then** Priya and Ravi are temporarily excluded from each other while each may match another participant.

### G7 — timeout vs accept race
**Given** counter is about to expire and passenger Accept arrives concurrently with timeout  
**When** both transactions race  
**Then** exactly one legal terminal result commits: SUCCEEDED or FAILED, never both.

---

## H. Priority consequences

### H1 — driver-caused cancellation preserves passenger priority
**Given** Engagement/Ride before start fails because driver cancels  
**When** passenger returns to demand matching  
**Then** passenger preserves original competitive priority unless their request itself changed materially.

### H2 — passenger-caused cancellation preserves driver priority
**Given** pre-trip cancellation is caused by passenger  
**When** driver returns to supply  
**Then** driver preserves appropriate existing priority according to policy.

### H3 — negotiation disagreement preserves both
**Given** neither side violated rules and passenger declines driver's valid counter  
**When** Engagement FAILS  
**Then** both may preserve priority and pair cooldown prevents immediate rematch.

### H4 — material passenger change resets priority
**Given** passenger changes request from ToTo to Car or 2 km destination to 9 km  
**When** system accepts the material edit  
**Then** request revision increments and `priority_at` resets.

### H5 — minor pickup correction may preserve priority
**Given** passenger moves pickup a small policy-allowed distance without changing fare/eligibility class  
**When** correction is accepted while WAITING  
**Then** original priority may be preserved.

---

## I. Ride execution

### I1 — successful engagement creates confirmed ride
**Given** Engagement becomes SUCCEEDED  
**When** transition commits  
**Then** request becomes FULFILLED, driver becomes ON_RIDE and one Ride exists in CONFIRMED.

### I2 — arrival requires proximity
**Given** driver is far outside allowed arrival tolerance  
**When** driver marks Arrived  
**Then** normal command is rejected.

### I3 — arrived driver starts grace period
**Given** driver validly reaches ARRIVED  
**When** arrival commits  
**Then** passenger no-show grace timing begins according to policy.

### I4 — no-show cannot be marked early
**Given** grace period has not elapsed  
**When** driver attempts Passenger No-show  
**Then** command is rejected.

### I5 — normal start after arrival
**Given** Ride is ARRIVED and start preconditions hold  
**When** driver starts ride  
**Then** state becomes IN_PROGRESS once.

### I6 — normal cancellation blocked after start
**Given** Ride is IN_PROGRESS  
**When** passenger attempts normal pre-trip cancellation  
**Then** it is rejected; interruption/support path is required instead.

### I7 — completion is terminal
**Given** Ride is IN_PROGRESS  
**When** driver completes ride  
**Then** Ride becomes COMPLETED exactly once.

### I8 — duplicate completion is harmless
**Given** Ride already COMPLETED  
**When** second Complete command arrives  
**Then** no duplicate financial/settlement effects occur.

### I9 — breakdown after start
**Given** Ride is IN_PROGRESS and vehicle cannot continue  
**When** authorized interruption command is used  
**Then** Ride becomes INTERRUPTED without pretending journey completed normally.

---

## J. Driver return to supply

### J1 — online driver returns after completion
**Given** driver intends to stay online, Ride completes and driver remains operationally eligible  
**When** completion commits  
**Then** Driver Availability returns to AVAILABLE with post-ride priority determined by policy (default fresh queue priority after completed work).

### J2 — driver chooses offline after ride
**Given** driver no longer wants work after Ride  
**When** Ride reaches terminal state  
**Then** Driver Availability becomes OFFLINE.

### J3 — driver ends in unauthorized market
**Given** driver completes ride physically in a market where they are not ACTIVE-authorized  
**When** ride completes  
**Then** they are not matchable for new demand there.

---

## K. Payment independence

### K1 — direct payment does not block ride completion
**Given** Ride physically completes under DIRECT_TO_DRIVER and driver has not yet confirmed cash/UPI receipt  
**When** Ride completes  
**Then** Ride becomes COMPLETED while Payment may remain PENDING.

### K2 — direct payment confirmation
**Given** DIRECT_TO_DRIVER Payment is PENDING  
**When** driver confirms receipt  
**Then** Payment becomes CONFIRMED without altering Ride state.

### K3 — direct payment dispute
**Given** Ride is COMPLETED and parties disagree about direct payment  
**When** dispute is recorded  
**Then** Payment becomes DISPUTED while Ride remains COMPLETED.

### K4 — Raahi payment callback idempotency
**Given** provider sends the same successful callback twice  
**When** both are processed  
**Then** one canonical Payment becomes/stays CONFIRMED and no duplicate Ride/Settlement is created.

### K5 — late pending callback cannot regress success
**Given** Payment is CONFIRMED  
**When** an older PENDING callback arrives later  
**Then** canonical state remains CONFIRMED.

### K6 — failed payment attempt may retry
**Given** PAY_RAAHI Payment remains PENDING and one gateway attempt fails  
**When** policy permits retry  
**Then** canonical Payment does not require destructive rollback; another attempt may be made.

### K7 — settlement failure independent
**Given** passenger Payment is CONFIRMED and Ride COMPLETED  
**When** driver settlement fails  
**Then** Ride and passenger Payment remain unchanged while Settlement follows retry/failure lifecycle.

---

## L. Policy/admin behavior

### L1 — local admin cannot edit another market
**Given** admin assignment is Gomoh-only  
**When** admin attempts to publish Dhanbad policy  
**Then** backend denies the action regardless of UI visibility.

### L2 — admin cannot reorder FIFO
**Given** local admin wants Ravi to receive next passenger  
**When** they attempt ordinary operational action  
**Then** no supported routine command allows direct FIFO reordering/manual matching.

### L3 — concurrent policy edit detected
**Given** two admins opened Policy v5  
**When** first publishes v6 and second later attempts save based on stale v5  
**Then** second save is rejected for version conflict/review.

### L4 — policy publication audited
**Given** authorized admin publishes new fare policy  
**When** publication succeeds  
**Then** immutable new policy version becomes active/effective and audit history identifies actor and change.

### L5 — soft pause protects active work
**Given** Market is ACTIVE with waiting/engaged/in-progress work  
**When** admin applies SOFT PAUSE  
**Then** new admission stops while existing work follows defined drain policy; IN_PROGRESS rides are not destroyed.

### L6 — emergency pause handles unconfirmed work safely
**Given** dangerous operating condition  
**When** authorized EMERGENCY PAUSE occurs  
**Then** waiting/unconfirmed work may be released according to policy while already in-progress rides are handled through safety rules.

### L7 — driver suspension blocks new work
**Given** driver is suspended by authorized admin  
**When** matcher next evaluates driver  
**Then** driver cannot receive new Engagements.

### L8 — suspension during active ride does not corrupt ride
**Given** driver is on IN_PROGRESS Ride  
**When** admin suspends driver for future work  
**Then** suspension prevents subsequent matching while current Ride follows explicit safety/exception policy rather than being silently deleted.

---

## M. Connectivity/recovery

### M1 — websocket loss is not state loss
**Given** passenger/driver loses realtime connection  
**When** connection returns  
**Then** client refetches canonical server state rather than creating duplicate queue/engagement state.

### M2 — notification failure does not undo Engagement
**Given** Engagement committed but push notification failed  
**When** client later reconnects  
**Then** ACTIVE Engagement is discovered from server state.

### M3 — timeout worker outage self-heals
**Given** an Engagement expires while timeout worker is temporarily down  
**When** reconciliation later runs  
**Then** `expires_at` allows Engagement to be safely FAILED exactly once and participants recover.

### M4 — stale UI action cannot overwrite newer state
**Given** old screen still shows ACTIVE Engagement that server already FAILED  
**When** user taps Accept  
**Then** server rejects stale transition and client refreshes.

---

## N. Expansion and geography

### N1 — same account across markets
**Given** passenger uses Raahi in Gomoh and later Dhanbad  
**When** they request a ride in Dhanbad  
**Then** same User identity is used and request receives Dhanbad origin Market.

### N2 — driver has multiple market authorizations
**Given** one Driver is ACTIVE-authorized for Gomoh and Dhanbad  
**When** current location changes between markets  
**Then** eligibility changes without duplicating Driver identity.

### N3 — market-specific vehicle availability
**Given** a Market has Car enabled but ToTo disabled  
**When** passenger requests there  
**Then** ToTo cannot be admitted/matched while Car may proceed.

### N4 — designated pickup point
**Given** station policy requires Main Exit pickup  
**When** passenger selects station  
**Then** request pickup resolves to designated Pickup Point coordinates/label before matching.

### N5 — unsupported destination rejected before queue
**Given** market policy prohibits the selected destination/vehicle combination  
**When** passenger submits request  
**Then** no WAITING request enters the matching pool.

---

## O. Audit and support exceptions

### O1 — admin exception requires reason
**Given** authorized support/admin uses an exception command  
**When** command is submitted without required reason  
**Then** it is rejected.

### O2 — exception preserves invariants
**Given** admin cancels a stuck Ride through supported exception  
**When** command runs  
**Then** related request/availability/payment handling is performed consistently and no direct row-edit contradiction is introduced.

### O3 — historical transaction remains explainable
**Given** policy changed many times after a Ride  
**When** support investigates that Ride  
**Then** origin market, policy snapshot, fare resolution, state transitions and responsible actors can be reconstructed.

---

## P. High-risk regression suite

The minimum launch regression set must always include:
1. fixed ToTo happy path
2. negotiated ToTo happy path
3. compatible Car capacity matching
4. driver pass -> passenger rematch
5. passenger decline counter -> pair cooldown/rematch
6. passenger cancellation vs matching race
7. two matchers competing for one driver
8. stale GPS exclusion
9. policy change while passenger waits
10. duplicate request/accept/complete commands
11. direct payment unresolved after completed ride
12. PAY_RAAHI duplicate/out-of-order callbacks
13. local-admin cross-market denial
14. driver suspension during queue and during active ride
15. reconnect/refetch after client/network loss

---

## Q. Remaining value-level decisions (not architecture blockers yet)

The scenarios intentionally leave these as policy/configurable values rather than hardcoded product laws:
- proximity tier distances and expansion delays
- driver response timeout
- passenger counter-response timeout
- pair cooldown duration
- no-show grace period
- GPS freshness threshold
- repeated-pass thresholds/cooldowns
- repeated passenger-decline threshold
- exact post-completed-ride driver priority treatment if a market wants a different policy

The architecture must allow these values to vary by policy without changing lifecycle semantics.

## R. Next step

Perform architecture/database impact analysis against the Rulebook, Entities, Lifecycles, Invariants and Acceptance Scenarios. Identify the minimum transactional architecture capable of enforcing them before choosing tables.