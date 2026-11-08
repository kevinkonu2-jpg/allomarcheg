import { describe, expect, it } from "vitest";
import { validPublicConnection } from "@/lib/connection-config";

describe("Public connection configuration", () => {
  it("rejects missing values and private service keys", () => {
    expect(validPublicConnection(undefined, "public-key")).toBe(false);
    expect(validPublicConnection("https://example.test", undefined)).toBe(false);
    expect(validPublicConnection("https://example.test", "sb_secret_forbidden")).toBe(false);
    expect(validPublicConnection("https://example.test", "sb_publishable_public")).toBe(true);
  });
});