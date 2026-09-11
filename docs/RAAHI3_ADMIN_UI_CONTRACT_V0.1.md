# Raahi 3 Admin UI Contract v0.1

**Status:** UI/interaction baseline. No backend/API implementation implied.

## 1. Admin north star

Local Admin should answer:

**Is my market healthy? → What rules should apply? → Which drivers may operate? → Is there an exception I must handle?**

Global Admin should answer:

**Which markets/admins exist? → Are local rules within guardrails? → Where does platform-level intervention matter?**

Admin must not become a manual dispatcher.

## 2. Admin roles

### Local Admin
Scoped to exactly the assigned market(s). V1 prototype demonstrates one market at a time.

Can manage:
- enabled vehicle types
- ToTo fare slabs / negotiation threshold
- payment collection mode
- proximity/search policy
- market operating state
- driver market authorization
- operational exceptions later

Cannot:
- reorder passenger or driver FIFO
- manually pair passenger with driver as normal operation
- alter another market
- silently edit historical ride terms

### Global Admin
Can:
- see all markets
- open/configure any market
- create/revoke local admin assignments
- apply platform guardrails
- use audited exceptional controls

## 3. Local Admin home/dashboard

Must prioritize operational health rather than raw tables.

Show compact metrics such as:
- passengers waiting
- drivers available
- active rides
- median/oldest wait
- driver pass/rejection signal
- payment exceptions

Prototype uses hardcoded values.

Primary sections:
- Market status
- Vehicle availability
- Fare policy
- Payment policy
- Matching/proximity policy
- Driver authorization

## 4. Market status

Local Admin sees current market state.

Normal actions:
- **Pause new requests** (Soft Pause)
- **Resume market**

Soft Pause means:
- no new passenger requests
- existing engagements/rides continue

Emergency pause is a higher-risk Global/Admin exception and should not be a casual toggle in the primary settings surface.

## 5. Vehicle availability

Per market:
- ToTo enabled/disabled
- Car enabled/disabled

Disabling a vehicle type affects new requests only.
Existing engagements/rides drain normally.

UI should make this explicit before save.

## 6. ToTo fare policy

Local Admin configures ordered non-overlapping slabs.

Prototype baseline:
- `0–3 km → ₹50 FIXED`
- `>3–5 km → ₹100 FIXED`
- `>5 km → NEGOTIATED`

Controls:
- first threshold
- first flat fare
- second threshold
- second flat fare

Negotiation above the final fixed threshold is automatic in V1.

Validation:
- thresholds must increase
- fares must be positive
- slabs cannot overlap

UI displays a plain-language preview before/after change.

## 7. Payment policy

Exactly one active market payment mode:
- **Passenger pays driver**
- **Passenger pays Raahi**

Plain-language consequences must be shown.

Direct:
- driver confirms receipt after ride

Raahi:
- passenger pays platform
- driver does not collect passenger fare
- settlement is separate

Changes affect new requests only.

## 8. Proximity / matching policy

Admin configures the reasonable search pool, not individual driver priority.

Per vehicle category, prototype can expose:
- First search radius
- Expand to radius
- Maximum radius

Example ToTo:
`3 km → 5 km → 8 km`

The UI must explain:
> Raahi applies FIFO among compatible drivers inside the current radius.

Admin must not see or edit a driver's `priority_at`.

## 9. Driver authorization

Local Admin can see drivers relevant to the market with simple states:
- Authorized
- Pending
- Suspended / Not authorized

Actions:
- **Authorize**
- **Suspend from this market**
- **Restore authorization**

Market authorization is independent from the driver's platform identity.
A driver can be authorized in multiple markets.

Suspension affects new work; an in-progress ride normally drains safely.

## 10. Policy change interaction

Prototype can update hardcoded rules immediately, but final product must use publish semantics.

User-facing interaction should conceptually be:
1. Edit settings
2. See effective rule preview
3. **Publish changes**
4. New requests use the new policy

Existing requests/rides keep their frozen commercial terms.

Do not silently mutate active rides when admin edits a fare.

## 11. Global Admin market view

Show market cards/list:
- Gomoh
- Dhanbad
- future markets

For each:
- Active/Paused
- enabled vehicles
- payment mode
- available drivers / waiting passengers summary
- Local Admin assignment

Global Admin may open any market and use the same policy editor as Local Admin.

## 12. Global Admin local-admin management

Actions:
- **Create local admin**
- assign market
- revoke assignment

Prototype may simulate this with hardcoded names.

The role assignment must be market-scoped; do not create separate login systems per city.

## 13. Things Admin should not see as normal controls
- `Move driver to top`
- `Assign Ravi to Priya`
- `Edit ride row`
- `Change passenger priority`
- `Force payment success`
- direct database-table editing

Exceptional corrections, when later designed, must be explicit audited commands.

## 14. Admin guardrails

Configuration UI should protect against obvious mistakes:
- overlapping fare slabs
- second radius smaller than first
- maximum radius smaller than expansion radius
- impossible/negative fares
- disabling every vehicle type unintentionally

Large material fare changes should receive stronger confirmation later.

## 15. Prototype scope for this slice

Hardcode:
- Gomoh and Dhanbad
- 5 drivers
- fare policy per market
- payment mode per market
- ToTo/Car enablement
- ToTo/Car proximity tiers
- market Active/Paused state
- driver market authorization toggles

No real admin identity, database, audit persistence, or payments are added yet.

## 16. Interaction contract rule

Every Admin button must either:
- change a clearly named policy,
- change an authorization,
- change market operating state,
- or invoke an explicitly named exception.

If it merely edits implementation data, it should not exist in the product UI.