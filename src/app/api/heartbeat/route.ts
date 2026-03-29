import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const device = process.env.DEVICE_ID ?? "nodemcu-terrace-1";
  const hb = await db.collection("heartbeats").findOne({ device });

  return Response.json({
    ok: true,
    device,
    lastSeen: hb?.timestamp ? new Date(hb.timestamp).toISOString() : null,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { device?: string };
  const device = String(
    body.device ?? process.env.DEVICE_ID ?? "nodemcu-terrace-1",
  );
  const timestamp = new Date();

  const db = await getDb();
  await db
    .collection("heartbeats")
    .updateOne({ device }, { $set: { device, timestamp } }, { upsert: true });

  return Response.json({
    ok: true,
    device,
    timestamp: timestamp.toISOString(),
  });
}
