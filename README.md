# Raahi ToTo UI Prototype V0.1

Zero-build UI prototype for validating the new Raahi ToTo/Car journey before backend work.

## Raahi 3 product source of truth

The canonical product-law baseline is:

- [`docs/RAAHI3_RULEBOOK_V0.1.md`](docs/RAAHI3_RULEBOOK_V0.1.md)

The rulebook captures the target Raahi 3 model: market policy, proximity-gated FIFO, one-passenger/one-driver exclusive engagement, fixed vs negotiated fares, admin boundaries, payment rules, failure handling, expansion rules, and core invariants. If the prototype and rulebook differ, treat the prototype as exploratory UI and the rulebook as the target product decision unless the rule is explicitly reopened.

## Included
- Passenger, Driver, and Global Admin prototype views
- Simulated mobile OTP login
- ToTo / Car selection with 4 / 5 / 6 / 7-seat car capacity
- Passenger and driver current locations are independent
- Market-specific ToTo fare policy controls
- Passenger proposed fare / driver response UI for negotiation experiments
- Five switchable hard-coded demo drivers, five passengers, three locations
- Market-level payment configuration
  - Gomoh default: passenger pays driver directly; driver confirms receipt
  - Dhanbad default: passenger pays Raahi; driver does not collect from passenger
- Global admin can configure local market behaviour
- Map placeholder for later provider integration

## Prototype architecture
No framework, package install, database, Supabase, paid API, or build step is required. The prototype is intentionally split into:

- `index.html`
- `styles-1.css`, `styles-2.css`, `styles-3.css`
- `app-1.js`, `app-2.js`, `app-3.js`, `app-4.js`

This keeps V0.1 cheap and fast while the user journey is still changing.

## Current design direction
The initial broadcast-quote UI remains useful for visual experimentation, but the Raahi 3 target defined in the rulebook is simpler:

**Request → Eligibility → Proximity Pool → FIFO → Exclusive Engagement → Fare Resolution → Ride → Payment**

## Run
Serve this directory with any static web server. There is no build command.

For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy
This folder can be served directly by a static host. For Cloudflare Pages, use no build command and serve the repository root.

## Reference
Interaction and visual patterns are inspired by the older `rajeevbackup42112-coder/raahimini` Raahi Next prototype, while deliberately excluding its Supabase/backend coupling at this validation stage.
