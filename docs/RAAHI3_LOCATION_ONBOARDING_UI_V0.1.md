# Raahi 3 Location Onboarding & Passenger Location UI v0.1

**Status:** UI/interaction contract. No database/API implementation implied.

## 1. Goal

Make Raahi feel like a local mobility catalogue:

**Choose location → see what that location offers → choose service → create ride request.**

The UI should make expansion to new towns feel like configuration, not a new application.

---

## 2. Recommended passenger product catalogue

Avoid overlapping top-level labels such as `Car`, `Local Ride`, and `Outstation` at the same level.

For V1, use concrete products:

- **ToTo** — local ToTo journey
- **Local Car** — local car journey
- **Outstation Car** — car journey leaving the local area

A location can independently enable or hide each product.

Example:

### Gomoh
- ToTo: Off
- Local Car: On
- Outstation Car: On

Passenger sees only:

`Local Car`  `Outstation Car`

### Dhanbad
- ToTo: On
- Local Car: On
- Outstation Car: On

Passenger sees all three.

---

## 3. Passenger screen P0 — Location entry

### Header
`Raahi`

### Main question
**Where do you want to travel from?**

### Content
Location cards/search, initially:
- Gomoh
- Dhanbad

Each card may show a short service summary:

**Gomoh**
`Local Car • Outstation Car`

**Dhanbad**
`ToTo • Local Car • Outstation Car`

### Actions
- Select location
- Use my current location to suggest a Raahi location
- Search/change location

### Business meaning
Selecting Gomoh means:

> Browse the mobility products operated under the Gomoh Raahi market.

It does **not** mean the passenger's phone must currently be inside Gomoh.

---

## 4. Passenger screen P1 — Location home

Header example:

**Gomoh ▾**

Headline:

**Where do you want to go from Gomoh?**

Show only enabled product cards.

### Product card: Local Car
Possible copy:

**Local Car**
`For rides around Gomoh`

Button/card action:
`Book local car`

### Product card: Outstation Car

**Outstation Car**
`For Dhanbad, Bokaro, Ranchi and beyond`

Button/card action:
`Book outstation car`

### Product card: ToTo
Only appears if enabled.

**ToTo**
`Affordable local rides`

Button/card action:
`Book ToTo`

### Important rule
Do not show a disabled product as a normal greyed-out passenger option unless we deliberately want an `Coming soon` marketing surface later.

V1 preference: **hide disabled products completely**.

---

## 5. Passenger screen P2 — Product-specific journey form

Once a product is selected, only fields relevant to that product should appear.

### ToTo
- Pickup
- Destination
- distance/fare rule
- request action

### Local Car
- Pickup
- Destination
- passenger/capacity need if required
- local fare/negotiation rule
- request action

### Outstation Car
- Pickup
- Destination
- one-way/round-trip later if enabled
- car/capacity requirement
- fare request/negotiation

Do not force all product types through one giant form if the fields are different.

---

## 6. Location validation

Selected Raahi Location remains visible while the passenger enters pickup/destination.

Example:

`Gomoh ▾`

If passenger enters a pickup outside the allowed Gomoh pickup area, show a clear admission message before matching:

> **This pickup is outside the Gomoh service area.**
> Choose another Raahi location or move the pickup inside Gomoh's service area.

Actions:
- `Change Raahi location`
- `Edit pickup`

Do not silently switch markets after the passenger intentionally selected Gomoh.

---

## 7. Location switching

Tapping `Gomoh ▾` opens the location selector.

Changing location should:
- clear any unsubmitted product form
- load the new location's enabled products
- load that location's local policies

It must not modify an already active ride.

If an active ride exists, location switching can remain a browsing preference but must not mutate the active ride's market or terms.

---

# ADMIN ONBOARDING

## 8. Admin screen A0 — Locations

Global Admin home should lead with **Locations**, not individual rides.

Example list:

### Gomoh
`Draft / Active / Paused`
`2 products enabled`
`Local admin: assigned`

### Dhanbad
`Active`
`3 products enabled`

Primary action:

**+ Add Raahi location**

---

## 9. Admin screen A1 — Create location

Fields:
- Location name
- Location centre
- Initial service radius

For Gomoh demo:
- Name: Gomoh
- Centre: Gomoh Railway Station
- Radius: configurable demo value

Primary action:

**Continue to services**

Meaning:

> Save the draft identity/geography and move to product selection.

Location is still not live.

---

## 10. Admin screen A2 — Choose services

Headline:

**What should Raahi offer in Gomoh?**

Cards/toggles:

### ToTo
`Local ToTo rides`
`Off / On`

### Local Car
`Car rides starting inside Gomoh's local operating area`
`Off / On`

### Outstation Car
`Car rides starting in Gomoh and travelling outside the local area`
`Off / On`

Continue button is available when at least one product is enabled.

---

## 11. Admin screen A3 — Configure ToTo

Only shown when ToTo is enabled.

Configurable:
- allowed pickup area
- destination rule
- fare mode/slabs
- payment mode
- driver search radii
- driver authorization later in operations

Human-readable summary always visible.

Example:

> ToTo requests may start within Gomoh's configured local area. Up to 3 km ₹50, up to 5 km ₹100, beyond 5 km negotiation. Passenger pays driver directly.

---

## 12. Admin screen A4 — Configure Local Car

Configurable:
- pickup area
- maximum local destination area/radius
- capacity options
- fixed/negotiated pricing
- payment mode
- driver search radii

Summary example:

> Local Car requests must start in Gomoh and remain within the configured local-car destination range. Fare is negotiated with one driver at a time.

---

## 13. Admin screen A5 — Configure Outstation Car

Configurable:
- allowed pickup area
- destination: outside local boundary permitted
- car capacity
- negotiated/fixed rules later
- payment mode
- driver authorization

Summary example:

> Outstation Car requests must start from the Gomoh pickup area. Destination may be outside Gomoh. Fare is negotiated with one driver at a time.

---

## 14. Admin screen A6 — Assign local admin

Global Admin can assign a local admin to Gomoh.

Local admin receives scope only for Gomoh.

Actions later available to the local admin depend on delegated permissions but never include manual FIFO reorder or arbitrary passenger-driver assignment.

---

## 15. Admin screen A7 — Launch review

Before launch, show one plain-language page.

Example:

# Gomoh launch summary

**Service area**
Around Gomoh Railway Station

**Products**
- Local Car — On
- Outstation Car — On
- ToTo — Off

**Payments**
- Local Car — Direct to driver
- Outstation Car — Direct to driver

**Local Admin**
Gomoh Admin

Primary action:

**Launch Gomoh**

Secondary action:

**Back to edit**

---

## 16. Existing market operations after launch

Once Gomoh is active, Local Admin home should not look like the onboarding wizard.

It should show:
- location health
- enabled products
- supply/demand summaries
- product-policy editor
- driver authorization
- pause/resume controls

Global Admin may reopen the onboarding-style configuration when adding a new product later.

---

## 17. What does not change

Once a valid product request enters matching, the previously frozen Raahi 3 logic remains unchanged:

**Eligibility → Proximity → FIFO → Exclusive Engagement → Fare Resolution → Ride → Payment**

The location-first UX is an admission/catalogue layer above that engine.

---

## 18. V1 design law

> **The passenger should discover what Gomoh offers, not configure Gomoh. The admin configures the complexity once; passengers experience only the valid choices.**
