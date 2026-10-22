import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker";

test("health endpoint reports service is ready without exposing secrets", async () => {
  const response = await worker.fetch(new Request("https://example.test/health"), {
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_WEBHOOK_SECRET: "test-secret",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
    CRON_SECRET: "test-cron",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "35-health-clubs-interview-bot" });
});

test("unknown paths return 404", async () => {
  const response = await worker.fetch(new Request("https://example.test/nope"), {
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_WEBHOOK_SECRET: "test-secret",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
    CRON_SECRET: "test-cron",
  });
  assert.equal(response.status, 404);
});
