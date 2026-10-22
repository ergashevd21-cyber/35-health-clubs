import telegramHandler from "./api/telegram";
import remindersHandler from "./api/cron/reminders";

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CRON_SECRET: string;
  HR_TELEGRAM_IDS?: string;
}

type LegacyHandler = (req: any, res: any) => Promise<unknown>;

async function invoke(handler: LegacyHandler, request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : undefined;
  const req = { method: request.method, headers, body, query: Object.fromEntries(url.searchParams) };
  let statusCode = 200;
  let responseBody: unknown = { ok: true };
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { responseBody = value; return this; },
    setHeader() { return this; },
    end(value?: unknown) { if (value !== undefined) responseBody = value; return this; },
  };
  // Existing handlers read process.env. Workers Builds sets nodejs_compat_populate_process_env,
  // so secrets configured as Worker environment variables are available there.
  await handler(req, res);
  return Response.json(responseBody, { status: statusCode });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "35-health-clubs-interview-bot" });
    }
    if (url.pathname === "/api/telegram") {
      return invoke(telegramHandler as unknown as LegacyHandler, request, env);
    }
    if (url.pathname === "/api/cron/reminders") {
      return invoke(remindersHandler as unknown as LegacyHandler, request, env);
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  },

  async scheduled(_event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const request = new Request("https://worker.internal/api/cron/reminders", {
      method: "GET",
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const response = await invoke(remindersHandler as unknown as LegacyHandler, request, env);
    if (!response.ok) {
      console.error("Scheduled reminder run failed", response.status, await response.text());
      throw new Error(`Reminder job returned HTTP ${response.status}`);
    }
    console.log("Scheduled reminder run completed");
  },
};
