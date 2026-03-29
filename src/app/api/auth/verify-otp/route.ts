import { getDb } from "@/lib/db";
import { checkPwd, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const otp = body?.otp?.trim();
  if (!email || !otp)
    return Response.json(
      { error: "Email and OTP required" },
      { status: 400 },
    );

  const db = await getDb();
  const doc = await db
    .collection("otps")
    .findOne({ email, expiresAt: { $gt: new Date() } });
  if (!doc)
    return Response.json(
      { error: "OTP expired or not found" },
      { status: 401 },
    );

  const ok = await checkPwd(otp, doc.otpHash);
  if (!ok)
    return Response.json({ error: "Invalid OTP" }, { status: 401 });

  await db.collection("otps").deleteMany({ email });

  const user = await db.collection("users").findOne({ email });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  await createSession({
    email: user.email,
    role: user.role,
    userId: user._id.toString(),
  });

  return Response.json({
    ok: true,
    role: user.role,
    approved: user.approvedByAdmin,
  });
}
