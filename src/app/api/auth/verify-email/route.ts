import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const db = await getDb();
  const result = await db
    .collection("users")
    .findOneAndUpdate(
      { verificationToken: token },
      { $set: { emailVerified: true, verificationToken: null } },
    );

  if (!result)
    return new Response("Invalid or expired token", { status: 404 });

  const base = process.env.APP_URL || "http://localhost:3000";
  return Response.redirect(`${base}/login?verified=true`, 302);
}
