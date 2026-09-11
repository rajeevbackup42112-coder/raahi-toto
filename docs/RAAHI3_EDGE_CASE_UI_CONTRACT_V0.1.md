# Raahi 3 Edge-Case UI Contract v0.1

**Status:** UI/interaction baseline only. No database implementation implied.

## 1. Purpose
Normal flows are not enough. The UI must remain understandable when a request, engagement, ride, payment, location, or market rule fails.

The governing principle is:

> Preserve canonical business truth, explain only what the actor needs to know, and give one clear next action.

## 2. Policy snapshot behavior
Once a Ride is confirmed, the Ride keeps the commercial terms agreed at confirmation.

If an admin later changes:
- payment mode
- fare policy
- commission/tax policy later

then the active Ride does not change.

The UI must display the Ride snapshot, not the market's newest settings.

Operational search settings may still affect a passenger who is only WAITING.

## 3. Passenger cancels while searching
Visible action: **Cancel request**.

Result:
- waiting/engagement ends
- engaged driver is released
- passenger returns to Home
- no ride exists
- prototype does not model cancellation fees

## 4. Passenger cancels after confirmation but before ride start
Visible action: **Cancel ride**.

Allowed while Ride is:
- DRIVER_EN_ROUTE
- ARRIVED

Not available once Ride is IN_PROGRESS.

Result:
- Ride becomes cancelled in the prototype
- driver is released back to availability according to driver online intent
- exact passenger penalty/fee remains policy work and is not simulated yet

The confirmation message must make clear that the driver may already be travelling toward pickup.

## 5. Driver passes during engagement
Visible action: **Pass**.

Result:
- driver and passenger are released
- passenger stays in matching
- passenger priority is preserved
- same driver is excluded from immediate rematch
- next eligible driver is tried

Ordinary Pass should not look like a system error to the passenger.

## 6. Driver cancels after confirmation but before ride start
Visible driver action: **Can't take this ride**.

Allowed while Ride is:
- DRIVER_EN_ROUTE
- ARRIVED

Result:
- current Ride is closed as driver-cancelled for prototype purposes
- passenger sees recovery rather than being sent Home
- cancelling driver is excluded from immediate recovery match
- passenger commercial terms and priority are preserved where still valid
- Raahi engages the next eligible driver

Passenger-facing message:
`Your driver can no longer take this ride. We're finding another driver.`

## 7. Driver offline behavior
### While AVAILABLE
Driver may go Offline immediately.

### While ENGAGED
Driver cannot simply go Offline. Driver must Accept/Counter/Pass the reserved request.

### While on an active Ride
Changing the Online toggle means **Go offline after this ride**. It must not cancel the current Ride.

## 8. Passenger no-show
Only relevant after Driver has marked ARRIVED.

Driver sees a secondary action such as **Passenger not here**.

The real system must enforce a configurable grace period before a no-show can be finalized.

For the hardcoded prototype, the confirmation screen may state that the demo grace period is considered complete.

Result:
- Ride becomes NO_SHOW
- driver is released
- passenger does not see a completed transport journey
- any no-show fee remains a future policy decision
- normal ride fare is not automatically collected as if the journey occurred

## 9. Driver no-show / driver never arrives
This should not be a passenger self-declared terminal outcome in normal V1 flow.

If the driver becomes unavailable/cancels before pickup, use Driver Cancellation Recovery.

Timeout/GPS logic later determines system-driven driver failure.

## 10. No driver found
Passenger sees:
- `No driver nearby right now`
- **Keep looking**
- **Cancel request**

Keep looking reruns matching under current operational policy.

It must not change the passenger's commercial terms merely because time passed.

## 11. Market paused
Soft pause:
- no new passenger request may enter
- active engagement/ride continues
- already-waiting behavior follows the market operational rule; prototype allows existing work to drain

Passenger Home clearly shows market paused and disables the Find Ride action.

## 12. Vehicle disabled
If Local Admin disables ToTo or Car:
- that option becomes unavailable for new requests
- existing Ride remains unchanged
- current active engagement may drain unless emergency policy later says otherwise

## 13. Driver authorization removed
If authorization is removed while driver is AVAILABLE:
- driver is excluded from new matches for that market

If removed during an active Ride:
- current Ride continues in normal non-emergency suspension
- no new market work is assigned afterward

## 14. GPS unavailable to passenger
`Use my live location` is optional.

If permission fails/unavailable:
- do not block the whole product
- keep manual pickup selection available
- show a concise location-permission message

## 15. Driver GPS stale
A stale/unusable driver location means the driver is not eligible for a new match.

The driver may remain conceptually Online, but UI should indicate that location is needed to receive requests.

Do not silently match using an old location indefinitely.

## 16. PAY_RAAHI after-ride payment failure
Product rule: Pay Raahi occurs only after Ride COMPLETED.

If payment attempt fails:
- Ride remains COMPLETED
- passenger sees `Payment unsuccessful`
- primary action becomes **Try payment again**
- driver settlement remains a separate financial concern
- failure must never send the passenger back into ride states

## 17. DIRECT_TO_DRIVER unresolved payment
After Ride COMPLETED:
- passenger is instructed to pay driver
- driver owns **Confirm payment received**
- passenger cannot self-confirm receipt on driver's behalf

If driver does not confirm, Ride still remains COMPLETED; payment can remain unresolved/disputed later.

## 18. OTP flow
V1 target login is OTP-only.

UI flow:
1. enter mobile number
2. **Send OTP**
3. enter OTP
4. **Verify & continue**

Prototype may use a fixed demo OTP but must still show the two-step interaction.

Invalid OTP:
- remain on OTP screen
- show concise error
- allow retry/resend

## 19. Duplicate taps / weak network
Buttons that represent business commands should visually enter a processing/disabled state in the real implementation.

Prototype need not emulate latency, but future backend commands must be idempotent.

The UI must never encourage repeated tapping as a recovery mechanism.

## 20. Unsupported destination
Before matching, if destination is not serviceable for chosen vehicle/market:
- disable Find Ride
- explain unsupported destination
- allow editing destination

Do not create a request and fail later in matching.

## 21. In-progress ride interruption
Normal Cancel Ride disappears once Ride is IN_PROGRESS.

A future **Report problem / Emergency** flow may handle breakdowns or safety issues.

Do not overload ordinary cancellation with in-progress interruption semantics in this prototype.

## 22. UI rule for edge cases
An edge-case screen should answer only:
1. What happened?
2. What happens to my ride/request/payment?
3. What can I do now?

Do not expose internal queue rows, policy versions, transaction retries, locks, or system job names.

## 23. Decisions intentionally still deferred
- exact passenger cancellation fee
- exact driver cancellation consequence/cooldown
- no-show fee
- grace-period duration
- search timeout duration
- real payment gateway retry limits
- emergency/interrupted-ride workflow

These values do not block the hardcoded UI journey.