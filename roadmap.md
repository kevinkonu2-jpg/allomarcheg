# Checkout correction
- [x] Purge identified demo transactions and restore genuine financial balances; preserve existing user-entered pending orders.
- [x] Implement validated delivery, provider, account phone and explicit simulated confirmation steps; support pending-order retry.
- [x] Isolate simulated totals from real withdrawable revenue and balances.
- [x] Verify rules and complete mobile checkout, cancellation and retry flows.

# Security isolation
- [x] Fail safely when public connection settings are unavailable, without exposing secrets.
- [x] Gate admin navigation and route with database roles; prevent stale privileges after account changes.
- [x] Confirm all six simulated payments read back as paid without crediting real wallets.
- [x] Verify customer isolation and authenticated mobile checkout.
