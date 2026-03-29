import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const users = await db
    .collection("users")
    .find({}, { projection: { passwordHash: 0, verificationToken: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return Response.json({ users });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const email = body?.email;
  const approve = body?.approve;
  if (!email)
    return Response.json({ error: "Email required" }, { status: 400 });

  const db = await getDb();
  await db
    .collection("users")
    .updateOne({ email }, { $set: { approvedByAdmin: Boolean(approve) } });

  return Response.json({ ok: true });
}
