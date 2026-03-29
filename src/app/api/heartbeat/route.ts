export const runtime = "nodejs";

type Heartbeat = { device: string; timestamp: string };

const KEY = "__tank_heartbeats__";

function store(): Map<string, Heartbeat> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g[KEY]) g[KEY] = new Map<string, Heartbeat>();
  return g[KEY] as Map<string, Heartbeat>;
}

export async function GET() {
  const device = process.env.DEVICE_ID ?? "nodemcu-terrace-1";
  const hb = store().get(device);

  return Response.json({
    ok: true,
    device,
    lastSeen: hb?.timestamp ?? null,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { device?: string };
  const device = String(body.device ?? process.env.DEVICE_ID ?? "nodemcu-terrace-1");
  const timestamp = new Date().toISOString();

  store().set(device, { device, timestamp });
  return Response.json({ ok: true, device, timestamp });
}
