import { afterEach, describe, expect, it, vi } from "vitest";

import { getEmailProvider } from "./provider";

afterEach(() => vi.unstubAllEnvs());

describe("email provider routing", () => {
  it("keeps reserved test identities local even when SES is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_PROVIDER", "ses");

    expect(getEmailProvider("platform.admin@atride.test").name).toBe("mock");
  });

  it("uses SES for real addresses when configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_PROVIDER", "ses");

    expect(getEmailProvider("rider@example.com").name).toBe("ses");
  });
});
