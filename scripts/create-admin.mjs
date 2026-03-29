import { MongoClient } from "mongodb";
import { hash } from "bcryptjs";
import { createTransport } from "nodemailer";
import { readFileSync } from "fs";

/* simple .env.local parser */
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const MONGODB_URI = env.MONGODB_URI;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const TEMP_PASSWORD = env.TEMP_ADMIN_PASSWORD;
const GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;
const APP_URL = env.APP_URL || "http://localhost:3000";

if (!MONGODB_URI || !ADMIN_EMAIL || !TEMP_PASSWORD || !GMAIL_APP_PASSWORD) {
  console.error(
    "Missing required env vars in .env.local: MONGODB_URI, ADMIN_EMAIL, TEMP_ADMIN_PASSWORD, GMAIL_APP_PASSWORD",
  );
  process.exit(1);
}

async function main() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db("tank-alert");

  await db.collection("users").deleteOne({ email: ADMIN_EMAIL });

  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++)
    token += chars[Math.floor(Math.random() * chars.length)];

  await db.collection("users").insertOne({
    email: ADMIN_EMAIL,
    passwordHash: await hash(TEMP_PASSWORD, 12),
    role: "super_admin",
    emailVerified: false,
    approvedByAdmin: true,
    verificationToken: token,
    createdAt: new Date(),
  });

  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;

  const transporter = createTransport({
    service: "gmail",
    auth: { user: ADMIN_EMAIL, pass: GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"Tank Alert" <${ADMIN_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: "Tank Alert — Admin Verification",
    html: `
      <h2>Admin Account Created</h2>
      <p>Click to verify your email:</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;border-radius:8px;text-decoration:none;">Verify Email</a></p>
      <p>Your password: <code style="background:#f4f4f5;padding:4px 8px;border-radius:4px;">${TEMP_PASSWORD}</code></p>
    `,
  });

  console.log("✓ Admin created:", ADMIN_EMAIL);
  console.log("✓ Verification email sent. Check your inbox.");
  console.log("✓ Password:", TEMP_PASSWORD);

  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
