import { loadEnvFile } from "node:process";
import { defineConfig } from "prisma/config";

try {
  loadEnvFile(".env.local");
} catch {
  try {
    loadEnvFile(".env");
  } catch {
    // CI and production provide environment variables directly.
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use Neon's direct endpoint; the application uses the pooled URL.
    // The local fallback lets dependency installation generate the client before
    // a developer creates their private environment file.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://atride:atride@localhost:5432/atride",
  },
});
