import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";

const auth = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: string, session: unknown) => void),
  resolveRole: undefined as undefined | ((value: unknown) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: {
    getUser: async () => ({ data: { user: null } }),
    onAuthStateChange: (listener: typeof auth.listener) => { auth.listener = listener; return { data: { subscription: { unsubscribe() {} } } }; },
  },
  from: () => ({ select: () => ({ eq: () => new Promise((resolve) => { auth.resolveRole = resolve; }) }) }),
  rpc: () => new Promise((resolve) => { auth.resolveRole = resolve; }),
} }));

describe("Admin identity isolation", () => {
  it("ignores an old admin role response after sign out", async () => {
    let store: ReturnType<typeof useStore> | undefined;
    function Probe() { store = useStore(); return null; }
    const view = render(<StoreProvider><Probe /></StoreProvider>);
    await waitFor(() => expect(auth.listener).toBeDefined());
    await act(async () => { auth.listener?.("SIGNED_IN", { user: { id: "admin-account" } }); });
    await waitFor(() => expect(auth.resolveRole).toBeDefined());
    await act(async () => { auth.listener?.("SIGNED_OUT", null); });
    await act(async () => { auth.resolveRole?.({ data: [{ role: "admin" }] }); });
    expect(store?.user).toBeNull();
    expect(store?.isAdmin).toBe(false);
    view.unmount();
  });
});