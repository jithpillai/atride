import { describe, expect, it } from "vitest";

import { normalizePostgresUrl } from "./postgres";

describe("normalizePostgresUrl", () => {
  it("makes Neon's certificate-verification intent explicit", () => {
    expect(
      normalizePostgresUrl("postgresql://user:password@example.com/atride?sslmode=require"),
    ).toContain("sslmode=verify-full");
  });

  it("leaves a local URL without SSL options unchanged", () => {
    const localUrl = "postgresql://atride:atride@localhost:5432/atride";
    expect(normalizePostgresUrl(localUrl)).toBe(localUrl);
  });
});
