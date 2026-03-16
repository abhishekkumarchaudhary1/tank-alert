export const runtime = "nodejs";

type Heartbeat = {
  device: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
};

const STORE_KEY = "__tank_alert_heartbeats__";

function getStore(): Map<string, Heartbeat> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, Heartbeat>();
  return g[STORE_KEY] as Map<string, Heartbeat>;
}

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

function safeIsoTimestamp(input: unknown): string {
  // Accepts:
  // - ISO strings (e.g. 2026-03-16T12:34:56Z)
  // - epoch ms/seconds (number or numeric string)
  // - anything else falls back to server time
  if (typeof input === "number" && Number.isFinite(input)) {
    // Heuristic: seconds vs ms
    const ms = input < 1e12 ? input * 1000 : input;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  if (typeof input === "string") {
    const s = input.trim();
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) {
        const ms = n < 1e12 ? n * 1000 : n;
        const d = new Date(ms);
        // If this is something like ESP `millis()` (small number), it becomes a 1970 date.
        // In that case, just use server time.
        if (Number.isNaN(d.getTime()) || ms < 1_500_000_000_000) return new Date().toISOString();
        return d.toISOString();
      }
    }

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  return new Date().toISOString();
}

export async function GET() {
  const store = getStore();
  const device = process.env.DEVICE_ID ?? "nodemcu-terrace-1";
  const hb = store.get(device) ?? null;

  return Response.json({
    ok: true,
    device,
    lastSeen: hb?.timestamp ?? null,
    meta: hb
      ? { ip: hb.ip, userAgent: hb.userAgent }
      : null,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<{
    device: string;
    event: string;
    timestamp: unknown;
  }>;

  const device = (body.device ?? process.env.DEVICE_ID ?? "nodemcu-terrace-1").toString();
  const timestamp = safeIsoTimestamp(body.timestamp);

  const hb: Heartbeat = {
    device,
    timestamp,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  };

  const store = getStore();
  store.set(device, hb);

  return Response.json({ ok: true, received: hb });
}

