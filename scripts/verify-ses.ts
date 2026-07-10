import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // Hosted or CI environments provide variables directly.
}

async function main() {
  const { SesHttpEmailProvider } = await import("../src/server/email/ses-http-provider");
  const recipient = process.argv[2] ?? "success@simulator.amazonses.com";
  const result = await new SesHttpEmailProvider().sendOtp({
    to: recipient,
    code: "482193",
    expiresInMinutes: 10,
  });

  console.log(`SES accepted the smoke-test message${result.messageId ? ` (${result.messageId})` : ""}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SES verification failed.");
  process.exitCode = 1;
});
