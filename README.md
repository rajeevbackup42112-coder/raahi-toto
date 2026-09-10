# Raahi ToTo UI Prototype V0.1

Zero-build UI prototype for validating the new Raahi ToTo/Car quotation journey before backend work.

## Included
- Passenger, Driver, and Global Admin prototype views
- Simulated mobile OTP login
- ToTo / Car selection with 4 / 5 / 6 / 7-seat car capacity
- Passenger and driver current locations are independent
- Passenger proposes a fare
- Eligible drivers can accept or send a counterquote
- Passenger sees responses and chooses a driver
- Five switchable hard-coded demo drivers, five passengers, three locations
- Market-level payment configuration
  - Gomoh default: passenger pays driver directly; driver confirms receipt
  - Dhanbad default: passenger pays Raahi; driver does not collect from passenger
- Global admin can view local-admin model and configure each market's payment collection mode
- Map placeholder for later provider integration

## Prototype architecture
No framework, package install, database, Supabase, paid API, or build step is required. The prototype is intentionally split into:

- `index.html`
- `styles-1.css`, `styles-2.css`, `styles-3.css`
- `app-1.js`, `app-2.js`, `app-3.js`, `app-4.js`

This keeps V0.1 cheap and fast while the user journey is still changing.

## Validation status
Cloud-browser E2E checks pass for both primary paths:

1. ToTo: passenger offer → Ravi accepts → passenger selects Ravi → Gomoh direct payment → driver confirms receipt.
2. Car: passenger selects 6-seat car → Deepak counterquotes → passenger selects Deepak → Dhanbad payment to Raahi → driver is told not to collect the fare.

The OTP simulation and independent driver-location selection were also exercised.

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
