# Raahi 3 Location-First Model v0.1

**Status:** Product/UI baseline. No database implementation implied.

## 1. Product idea

Raahi is not a pan-India ride catalogue. It is a **local mobility operating layer**, launched one location at a time.

Mental model: **BookMyShow for local mobility**.

A passenger chooses a Raahi location such as **Gomoh** or **Dhanbad** and sees only the mobility products that are actually enabled there.

A location can have a different product mix, pricing, service boundary, payment model, matching settings and local admin from another location.

## 2. Core hierarchy

`Raahi Location → Enabled Mobility Products → Product Service Rules → Passenger Request → Matching`

Example:

### Gomoh
- Local Car: enabled
- Outstation Car: enabled
- ToTo: disabled

### Dhanbad
- ToTo: enabled
- Local Car: enabled
- Outstation Car: enabled

Passenger should never see a disabled product as a normal selectable option.

## 3. Important terminology

### Raahi Location
A named local operating market the user understands, for example **Gomoh**.

It is not necessarily an administrative city boundary.

### Location Centre
A recognizable anchor used initially to define the market, for example **Gomoh Railway Station**.

### Base Service Area
The broad geographic area Raahi considers part of the location for local services.

V1 can use a simple radius around the Location Centre, for example 10 km. This is configurable, not hardcoded product law.

### Mobility Product
A service enabled independently inside a location, for example:
- ToTo
- Local Car
- Outstation Car

Each product may apply its own origin/destination rules even though it belongs to the same Raahi Location.

## 4. Why location boundary and product boundary are different

The market boundary answers:

> Is this pickup part of the Gomoh operating market?

The product rule answers:

> Given that this request starts in Gomoh, is this particular journey valid for this product?

Example:
- Gomoh Base Service Area: 10 km around Gomoh Station
- ToTo: both pickup and destination must remain inside its local service area
- Local Car: pickup must be inside Gomoh; destination may be within a larger local radius
- Outstation Car: pickup must belong to Gomoh, destination may be outside Gomoh entirely

Therefore Raahi must **not** use one single distance rule for every mobility product.

## 5. Location onboarding flow

When Global Admin creates a new location, the setup journey should be:

`Create Location → Define Centre → Define Base Service Area → Choose Products → Configure Each Product → Assign Local Admin → Review → Launch`

### Step A — Create Location
Admin enters:
- display name, e.g. Gomoh
- state/district metadata where useful
- location status: Draft initially

### Step B — Define Centre
Admin chooses the local anchor, initially via map/pin/search.

Example: Gomoh Railway Station.

### Step C — Define Base Service Area
For V1:
- choose radius in kilometres
- preview the covered area on a map

Later, if real operating boundaries are irregular, Raahi may support drawn polygons without changing the product concept.

### Step D — Choose Mobility Products
Admin sees available Raahi mobility modules and enables only what Gomoh will actually offer.

Examples:
- ToTo: Off
- Local Car: On
- Outstation Car: On

### Step E — Configure Each Enabled Product
Each enabled product receives its own local policy.

Possible policy dimensions:
- valid pickup area
- valid destination rule
- fixed vs negotiated fare
- distance slabs
- vehicle/capacity requirements
- driver search radius tiers
- payment mode
- driver authorization
- operating hours later if needed

### Step F — Assign Local Admin
Global Admin assigns one or more local admins scoped to Gomoh.

### Step G — Review & Launch
Show a human-readable summary before activation.

Example:

> Gomoh launches with Local Car and Outstation Car. ToTo is unavailable. Gomoh local pickup area is 10 km around Gomoh Station. Passenger pays driver directly.

Only after explicit Launch does the location become passenger-visible.

## 6. Passenger entry experience

Passenger should be able to change Raahi Location similarly to changing city in BookMyShow.

Example top-level selector:

**Gomoh ▾**

Home then shows:

**What do you need from Gomoh?**

Only enabled products appear.

If Gomoh has Local Car and Outstation Car only, passenger sees exactly those two choices.

If passenger switches to Dhanbad, the home screen can immediately present a different catalogue such as ToTo, Local Car and Outstation Car.

## 7. Current-location behaviour

Physical GPS location and selected Raahi Location are different concepts.

A person can be physically outside Gomoh and still browse what Gomoh offers.

But when creating a local ride request, the request must satisfy the selected location/product's service rules.

Example:
- User in Kolkata may browse Gomoh offerings for a future family member.
- User physically near Gomoh may select Gomoh and request a local ride.
- If pickup is outside Gomoh's allowed pickup area, Raahi explains that this product cannot start there instead of silently assigning another market.

## 8. Market derivation change from the earlier prototype

Earlier prototype rule:

> pickup location automatically determines the market.

New preferred rule:

> **Passenger explicitly selects a Raahi Location for browsing; the system validates the pickup against that selected location when a request is created.**

This is better for a location-first marketplace because people can intentionally browse Gomoh or Dhanbad regardless of where their phone currently is.

The system may still suggest the nearest Raahi Location using GPS, but suggestion must not remove the user's ability to switch.

## 9. Matching remains unchanged after admission

Once a request passes location/product validation, the existing Raahi 3 matching model remains:

`Eligibility → Proximity Pool → FIFO → Exclusive Engagement → Fare Resolution → Ride → Payment`

The location-first layer therefore simplifies admission without replacing the matching engine.

## 10. Admin ownership

### Global Admin
May:
- create locations
- define initial boundaries
- enable product modules
- assign local admins
- inspect/override all locations
- launch/pause locations

### Local Admin
May only manage their assigned location and only the configurable product rules delegated to them.

Local Admin cannot:
- manually assign a passenger to a driver
- reorder FIFO
- change another location
- expose a product not enabled for their location unless Global Admin permits that capability

## 11. Location lifecycle

Keep location lifecycle simple:

`DRAFT → READY → ACTIVE → PAUSED → RETIRED`

- **DRAFT:** configuration incomplete; invisible to passengers
- **READY:** configuration valid but not yet launched
- **ACTIVE:** passenger-visible and accepting new requests
- **PAUSED:** visible/status-aware but no new requests
- **RETIRED:** no longer offered

Existing rides should not be destroyed merely because a location is paused.

## 12. Mobility-product lifecycle inside a location

Each product has its own enablement state:

`OFF → ON → PAUSED`

This allows, for example:
- Gomoh Local Car = ON
- Gomoh Outstation Car = ON
- Gomoh ToTo = OFF
- Dhanbad ToTo = ON

Turning a product OFF/PAUSED affects new requests only unless an explicit safety exception exists.

## 13. V1 simplification

For first launch, prefer:
- one Location Centre
- one configurable circular Base Service Area
- a small number of mobility products
- product-specific journey rules
- no polygon editor yet
- no automatic city-boundary GIS dependency

This is enough to learn whether the operating model works in Gomoh.

## 14. Product principle

> **Raahi does not ask, “What rides exist across India?” It asks, “What mobility actually works from this place?”**

That principle should guide the passenger UI, admin setup and expansion strategy.

## 15. Expansion rule

Adding Dhanbad, Bokaro or another market should mean **creating another configured Raahi Location**, not branching or rewriting the application.

The shared platform stays the same; local configuration changes.

This allows Raahi to expand one location at a time while preserving deep local control.