import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const device = process.env.DEVICE_ID ?? "nodemcu-terrace-1";

  await db.collection("motor_logs").insertOne({
    device,
    email: session.email,
    timestamp: new Date(),
  });

  return Response.json({ ok: true });
}

export async function GET() {
  const db = await getDb();
  const device = process.env.DEVICE_ID ?? "nodemcu-terrace-1";

  const logs = await db
    .collection("motor_logs")
    .find({ device })
    .sort({ timestamp: -1 })
    .limit(20)
    .toArray();

  return Response.json({ lastOff: logs[0] ?? null, logs });
}
