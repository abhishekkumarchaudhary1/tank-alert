import { getDb } from "@/lib/db";
import { checkPwd, genOTP, hashPwd } from "@/lib/auth";
import { sendOTP } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  if (!email || !password)
    return Response.json(
      { error: "Email and password required" },
      { status: 400 },
    );

  const db = await getDb();
  const user = await db.collection("users").findOne({ email });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });
  if (!user.emailVerified)
    return Response.json(
      { error: "Email not verified. Check your inbox." },
      { status: 403 },
    );

  const ok = await checkPwd(password, user.passwordHash);
  if (!ok)
    return Response.json({ error: "Wrong password" }, { status: 401 });

  const otp = genOTP();
  await db.collection("otps").deleteMany({ email });
  await db.collection("otps").insertOne({
    email,
    otpHash: await hashPwd(otp),
    expiresAt: new Date(Date.now() + 5 * 60_000),
  });

  await sendOTP(email, otp);

  return Response.json({ ok: true });
}
