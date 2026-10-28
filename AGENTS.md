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
- Wallet mutations remain atomic database RPCs scoped to auth.uid(); checkout remains explicitly simulated until a payment provider is requested.
