# Raahi 3 Driver UI Contract v0.1

**Status:** UI/interaction baseline. No backend/API implementation implied.

## 1. Driver north star
The driver should only need to answer:

**Am I available? → Which approved vehicle am I using? → Do I accept this one request? → Have I arrived? → Has the ride started? → Has it completed?**

The driver must not manage passenger queues, market assignment logic, or other drivers.

## 2. Driver-visible flow

`OFFLINE → AVAILABLE → ENGAGED → EN ROUTE → ARRIVED → IN RIDE → COMPLETED → AVAILABLE/OFFLINE`

Payment confirmation may remain visible after ride completion without blocking driver availability.

## 3. Offline screen

Must show:
- driver identity
- active/approved vehicle
- current location
- Go Online action

Rules:
- active vehicle may be changed only while Offline
- driver cannot go Online without an eligible approved vehicle and usable location

Prototype may hardcode these conditions.

## 4. Available screen

Show:
- `You’re online`
- current vehicle
- current location
- simple `Waiting for a nearby request` state
- Go Offline action

Do not show passenger queue counts or FIFO mechanics by default.

## 5. Exclusive engagement

Only the driver currently paired with the passenger sees the request.

Other online drivers remain on the Available screen.

Request card must show:
- pickup
- destination
- vehicle/capacity
- approximate pickup distance
- passenger display identity
- fare/fare mode
- response deadline indicator

## 6. Fixed-fare request

Buttons:
- **Accept ₹X**
- **Pass**

No Counter action exists.

Accept means the driver commits to serve the ride at the fixed fare.
Pass releases the engagement and keeps the driver available subject to queue/cooldown policy.

## 7. Negotiated request

Buttons:
- **Accept ₹X**
- **Counter once**
- **Pass**

Counter mode allows the driver to set one amount and press:
- **Send ₹Y counter**

After sending a counter:
- amount is immutable
- driver waits for passenger Accept/Decline
- no second counter round

## 8. After acceptance

Once fare is agreed:
- engagement becomes a confirmed ride
- driver is automatically considered **en route**
- no separate `Start navigation` business state is required

Driver screen shows:
- passenger
- pickup
- destination
- agreed fare
- payment mode
- **I’ve arrived** primary action

## 9. Arrived

Driver presses **I’ve arrived** only when at/near pickup.

Prototype simulates proximity; real implementation must validate reasonable pickup proximity.

After Arrived show:
- passenger pickup instruction
- **Start ride** primary action
- future no-show/grace-period action can be added during edge-flow design

## 10. Start ride

Driver presses **Start ride** when passenger is onboard and journey begins.

Transition:
`ARRIVED → IN_PROGRESS`

Once In Progress:
- normal pre-trip cancellation controls disappear
- primary action becomes **Complete ride**

## 11. Complete ride

Driver presses **Complete ride** at destination.

Transition:
`IN_PROGRESS → COMPLETED`

Completion must be independent of payment confirmation.

If driver intends to remain online, completion returns driver to Available supply.

## 12. Direct-to-driver payment

After ride completion:
- driver sees `Passenger pays you directly`
- amount is shown
- **Confirm payment received** is available

This button means only: driver attests they received the agreed fare.

Payment confirmation does not change the Ride back into another lifecycle state.

## 13. Pay-Raahi market

Driver sees:
- `Passenger pays Raahi`
- `Do not collect from passenger`

No payment-received button is shown to the driver.
Driver settlement is separate and not part of V1 ride interaction UI yet.

## 14. Going Offline

While Available:
- driver may go Offline immediately

While Engaged:
- ordinary Offline toggle should be disabled/hidden
- driver must Pass/resolve the engagement first

While on a confirmed/in-progress ride:
- ordinary Offline action should not terminate the ride
- `online after ride` can be represented later as intent if needed

## 15. Driver cancellation

Confirmed-driver cancellation is an edge flow, not a normal primary action.
When added it must:
- ask for confirmation/reason
- release passenger into recovery matching with preserved priority when driver caused the failure
- apply driver consequence according to policy

Do not place a casual one-tap Cancel beside normal ride actions.

## 16. No-show

No-show is deferred to edge-flow design.
When added it requires:
- driver genuinely Arrived
- grace period elapsed
- explicit `Passenger didn’t arrive` action

No-show cannot be used from far away.

## 17. Things the driver should never need to understand
- passenger FIFO timestamps
- candidate ranking calculations
- which other drivers were skipped
- policy version IDs
- pair cooldown internals
- payment settlement internals
- global/local admin hierarchy

## 18. Prototype interaction rule
Switching the demo driver dropdown represents looking at another driver’s phone. Only the engaged driver may see and act on the active request.

## 19. Next UI slice
After this contract is clickable and synchronized with Passenger view, define Local Admin interactions.