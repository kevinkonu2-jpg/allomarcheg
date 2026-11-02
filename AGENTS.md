<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep reusable city eligibility and withdrawal validation in src/lib/marketplace.ts so browser behavior has focused rule tests.
- Initialize demo rows with the idempotent scripts/seed-demo.sql data script after schema migrations; never seed on page load.
- Resolve generated product image identifiers in src/lib/product-images.ts so database examples can use bundled visuals.
- Only an existing authenticated admin may grant another account the admin role through the database RPC; public signup creates clients only.
- Wallet mutations remain atomic database RPCs scoped to auth.uid(); reads are owner-only and pending orders never credit wallets, so unverified payments cannot generate revenue.
- Local checkout uses a validated checkout module and authenticated server function that creates a pending order with database-priced lines; future payment gateways must settle verified payments server-side.
- Keep the store context in store-context.ts and preserve its identity during hot updates so mounted providers and refreshed consumers cannot diverge.
- Keep the shared product catalog in ProductCatalog for home and /catalog; mount mobile navigation once in the root with safe-area clearance so every screen shares consistent navigation.
- Present financial histories as mobile lists and desktop tables, while retaining a single data source and unchanged financial permissions.
