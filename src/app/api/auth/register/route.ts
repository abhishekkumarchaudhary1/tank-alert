import { getDb } from "@/lib/db";
import { hashPwd, genToken, genTempPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  if (!email)
    return Response.json({ error: "Email is required" }, { status: 400 });

  const db = await getDb();
  const exists = await db.collection("users").findOne({ email });
  if (exists)
    return Response.json(
      { error: "Email already registered" },
      { status: 409 },
    );

  const tempPassword = genTempPassword();
  const token = genToken();

  await db.collection("users").insertOne({
    email,
    passwordHash: await hashPwd(tempPassword),
    role: "user",
    emailVerified: false,
    approvedByAdmin: false,
    verificationToken: token,
    createdAt: new Date(),
  });

  await sendVerificationEmail(email, token, tempPassword);

  return Response.json({ ok: true });
}
