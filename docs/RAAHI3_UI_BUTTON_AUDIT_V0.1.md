# Raahi 3 UI Button Audit v0.1

**Purpose:** Every active control must map to one clear business intent. Demo-only controls are explicitly marked.

## Passenger controls

| Control | Meaning | Current prototype effect |
|---|---|---|
| Use my live location | Passenger asks Raahi to use current pickup | Simulates Gomoh Station pickup |
| ToTo | Request ToTo category | Selects ToTo if enabled by market |
| Car | Request Car category | Selects Car if enabled by market |
| 4/5/6/7 seats | Required Car capacity | Filters incompatible cars |
| Fare − / + | Change passenger offer | Only available for negotiated fare |
| Find a ToTo for ₹X | Accept fixed journey terms and enter matching | Starts exclusive matching |
| Find a ToTo/Car at ₹X | Submit passenger offer and enter matching | Starts exclusive matching |
| Cancel & edit | Stop current waiting/engagement and edit journey | Returns to Home |
| Cancel request | Withdraw current waiting/engagement request | Returns to Home |
| Keep looking | Continue waiting after candidate pool is exhausted | Prototype simulates another search cycle |
| Accept ₹Y counter | Agree to engaged driver's one counter | Creates confirmed ride |
| Decline & keep looking | Decline counter without bargaining again | Releases pair and engages next eligible driver |
| Pay ₹X to Raahi | Pay platform after completed ride | Prototype marks Raahi payment paid |
| Book another ride | Start a new journey after completed ride | Clears completed demo ride |

Passenger does **not** have a `Choose driver` button.

## Driver controls

| Control | Meaning | Current prototype effect |
|---|---|---|
| Online toggle | Enter/leave available supply | Toggles online when not locked by engagement/ride |
| Demo driver selector | Developer-only: inspect one of 5 driver phones | Switches displayed demo driver |
| Driver location selector | Developer-only stand-in for live GPS | Changes demo driver location |
| Accept ₹X | Commit to this passenger at shown fare | Creates confirmed ride |
| Pass | Decline this engagement | Releases driver/passenger and matches next candidate |
| Counter once | Choose one counteroffer instead of accepting | Opens counter amount control |
| Counter − / + | Adjust the one driver counter | Changes draft counter only |
| Send ₹Y counter | Submit immutable one-round counter | Passenger receives Accept/Decline decision |
| I've arrived | Driver declares arrival at pickup | Ride becomes ARRIVED |
| Start ride | Passenger is onboard; journey begins | Ride becomes IN_PROGRESS |
| Complete ride | Destination reached | Ride becomes COMPLETED |
| Confirm payment received | Driver attests direct payment was actually received | Marks direct payment confirmed |

Driver cannot counter a fixed fare.

## Local Admin controls

| Control | Meaning |
|---|---|
| Pause new requests | Soft-pause new demand in this market |
| Resume market | Reopen market to new demand |
| ToTo enabled/disabled | Allow/block new ToTo requests |
| Car enabled/disabled | Allow/block new Car requests |
| Fare threshold/fare inputs | Draft local ToTo fixed-fare policy |
| Passenger pays driver | Set market payment mode to direct |
| Passenger pays Raahi | Set market payment mode to platform collection |
| Proximity inputs | Configure First → Expand → Maximum search radii |
| Authorize driver | Permit driver to serve this market |
| Suspend driver | Remove driver from new matching in this market |
| Publish market changes | Represent explicit policy publication step |

Local Admin has no manual assignment or FIFO reorder control.

## Global Admin controls

| Control | Meaning |
|---|---|
| Prototype admin selector | Developer-only role simulation |
| Open market | Global Admin chooses which market to inspect/configure |
| All market-policy controls | Global override/super access through same editor |
| Create local admin | Begin a market-scoped admin assignment workflow |

## Authentication controls

Current prototype:
- Continue with OTP -> simulated direct login
- Logout -> returns to simulated login

**Gap:** OTP entry/verification screen still needs to be modeled before auth UI is frozen.

## Disabled / intentionally non-functional navigation

- Home: disabled visual nav item in prototype
- Trips later: disabled until trip-history UX is designed

No active product button is intentionally dead.

## Important controls intentionally not added yet

These require edge-flow decisions before appearing:
- passenger cancel after ride confirmation
- driver cancel confirmed ride
- passenger no-show
- emergency/support action
- payment failure/retry
- dispute/report issue

They should not be added as vague generic buttons. Each needs its own exact rule first.

## Audit law
If a future button cannot be described as a single business command with preconditions and outcome, do not add it.