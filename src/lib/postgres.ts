export function normalizePostgresUrl(connectionString: string) {
  const url = new URL(connectionString);

  // pg 8 currently treats `require` as full certificate verification but will
  // change that behavior in pg 9. Make the secure intent explicit now.
  if (url.searchParams.get("sslmode") === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}
