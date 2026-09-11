# Raahi 3 Passenger UI Contract v0.1

**Status:** UI/interaction baseline. No database/API implementation implied.

## 1. Passenger north star
The passenger should only need to answer:

**Where am I? → Where am I going? → ToTo or Car? → Is the fare acceptable? → Find my ride.**

The passenger must not manage driver competition, FIFO, market assignment, or matching logic.

## 2. Passenger-visible flow

`HOME → SEARCHING / ENGAGED → (COUNTER DECISION when needed) → CONFIRMED → DRIVER EN ROUTE → ARRIVED → IN RIDE → COMPLETED / PAYMENT`

The passenger never sees a list of competing drivers.

## 3. Home / Request screen

### Must show
- Pickup/current location
- Destination
- Derived operating market (informational, not selectable)
- Ride type: ToTo / Car
- Car capacity when Car selected
- Route distance estimate
- Fare mode/result
- Payment method summary
- One primary action

### Pickup
Passenger may:
- select a known/demo location
- use live location

System derives the market from pickup. Passenger does **not** choose the market manually.

### Destination
Must differ from pickup and be serviceable for chosen vehicle.

### ToTo fare
Market policy resolves either:
- `FIXED`: display fixed fare; no +/- controls
- `NEGOTIATED`: display passenger offer with +/- controls

### Car fare
V1 prototype remains negotiated unless market policy later says otherwise.

### Primary button labels
Fixed ToTo: **Find a ToTo for ₹X**
Negotiated ToTo: **Find a ToTo at ₹X**
Negotiated Car: **Find a car at ₹X**

The button means: passenger accepts the shown journey terms and enters matching.

## 4. Searching / Exclusive engagement screen

### Product rule
Raahi engages at most one driver with the passenger at a time.

### Must NOT show
- multiple driver cards
- competing quotes
- "Choose driver"
- driver leaderboard/ranking

### Before a driver is engaged
Show:
- `Finding a nearby ToTo/Car…`
- route
- fare/fare mode
- simple search progress language
- Cancel request

Do not expose FIFO internals unless useful later.

### Once one driver is engaged
Show one driver only:
- first name / display identity
- vehicle
- approximate pickup distance
- fare being considered
- status: `Reviewing your request`

For fixed fare, passenger has no action while driver decides.
For negotiated fare, passenger has no action while driver decides the passenger offer.

## 5. Fixed-fare driver outcome

Driver choices:
- Accept ₹X
- Pass

If Accept:
- passenger immediately moves to Confirmed

If Pass/timeout:
- passenger stays in matching
- original passenger priority is preserved
- failed driver is temporarily excluded from immediate rematch
- passenger UI returns to `Finding next nearby driver…`

No failure dialog is necessary for an ordinary pass.

## 6. Negotiated-fare driver outcome

Driver choices:
- Accept passenger offer
- Counter once
- Pass

### Driver accepts
Passenger immediately moves to Confirmed at the passenger offer.

### Driver counters
Passenger sees one decision screen/card:
- Driver counter ₹Y
- original passenger offer ₹X
- **Accept ₹Y**
- **Decline & keep looking**

No second passenger counter is allowed in V1.

### Passenger accepts
Move to Confirmed at ₹Y.

### Passenger declines
- engagement ends
- passenger retains priority because disagreement is not misconduct
- pair cooldown applies
- Raahi finds the next eligible driver

## 7. Confirmed screen

Must show:
- driver name/photo placeholder
- vehicle details
- pickup and destination
- agreed fare
- fare type: Fixed / Negotiated
- payment mode
- driver progress

Possible actions:
- Contact driver
- Cancel ride (subject to cancellation rules)

Do not show `Book another ride` while current ride is active. V1 allows one active passenger journey.

## 8. Driver progress screens

Passenger status follows driver lifecycle:

### DRIVER_EN_ROUTE
`Ravi is on the way`
Show approximate pickup distance/ETA placeholder.

### ARRIVED
`Your driver has arrived`
Primary passenger instruction is to meet the driver at pickup.

### IN_PROGRESS
`Ride in progress`
Show destination, agreed fare and payment method.
No normal Cancel Ride action.

### COMPLETED
`You have arrived`
Move to payment/receipt experience.

## 9. Payment UI

Two market-configured modes:

### DIRECT_TO_DRIVER
Passenger sees:
- `Pay ₹X to Ravi directly`
- payment method guidance/QR placeholder later if needed
- status while driver has not confirmed receipt

Driver owns `Confirm payment received`.
Passenger must not be able to mark the driver's receipt as confirmed.

### PAY_RAAHI
Passenger sees the Raahi payment action only **after the Ride is COMPLETED**.

Product rule:
- matching and ride execution do not wait for passenger payment to Raahi
- after completion, passenger pays the agreed ₹X to Raahi
- payment failure/retry does not move the completed Ride back to an earlier ride state
- driver settlement remains a separate financial lifecycle

## 10. Cancellation / recovery UI

### Passenger cancels while WAITING
Request closes. No driver consequence.

### Passenger cancels during engagement
Engagement closes; driver is released. Passenger-caused cancellation may reset priority.

### Driver passes / times out during engagement
Passenger should normally see only `Finding next nearby driver…`, not an error.

### Driver cancels after confirmation but before ride starts
Passenger sees:
`Your driver can no longer take this ride. We’re finding another driver.`

Raahi creates/reuses a recovery request conceptually with preserved passenger priority and commercial terms where still valid.

### No driver found
Do not spin forever. After configured search duration show:
- `No driver nearby right now`
- **Keep looking**
- **Cancel request**

## 11. Error/availability states

### GPS unavailable
Allow manual pickup selection.

### Destination unsupported
Block admission before matching and explain why.

### Market paused/closed
Do not create a request. Show reopening/status message.

### Selected vehicle unavailable in market
Disable/hide that vehicle option with explanation.

### Same pickup/destination
Disable primary action.

## 12. Things the passenger should never need to understand
- FIFO position mechanics
- driver queue timestamps
- candidate radius algorithm
- market authorization
- pair cooldown
- policy version numbers
- internal engagement IDs
- whether another driver was skipped as incompatible

## 13. Prototype-specific behavior

The UI-only prototype will hardcode:
- 5 passengers
- 5 drivers
- demo locations/distances
- market fare/payment policies
- deterministic driver matching

Driver responses are simulated by switching to Driver view and pressing Accept / Counter / Pass.
Passenger view then reflects the same single engagement.

## 14. Interaction contract rule
Every clickable control must map to one clear business intent. If a button cannot be described in one sentence as a business command, it should not exist.

## 15. Passenger flow decisions intentionally deferred
- real phone/contact mechanism
- exact cancellation fees/penalties
- exact wait-time/search-radius language
- push/SMS notification design

These do not block the hardcoded flow prototype.