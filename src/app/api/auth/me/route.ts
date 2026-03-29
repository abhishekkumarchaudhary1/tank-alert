import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Not authenticated" }, { status: 401 });

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.email });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  return Response.json({
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    approved: user.approvedByAdmin,
  });
}
