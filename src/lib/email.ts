import nodemailer from "nodemailer";

function transport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const from = () => `"Tank Alert" <${process.env.ADMIN_EMAIL}>`;

export async function sendVerificationEmail(
  to: string,
  token: string,
  tempPassword: string,
) {
  const base = process.env.APP_URL || "http://localhost:3000";
  const link = `${base}/api/auth/verify-email?token=${token}`;

  await transport().sendMail({
    from: from(),
    to,
    subject: "Tank Alert — Verify your email",
    html: `
      <h2>Welcome to Tank Alert</h2>
      <p>Click to verify your email:</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;border-radius:8px;text-decoration:none;">Verify Email</a></p>
      <p>Your temporary password: <code style="background:#f4f4f5;padding:4px 8px;border-radius:4px;font-size:16px;">${tempPassword}</code></p>
      <p>Use this password with your email to sign in after verification.</p>
    `,
  });
}

export async function sendOTP(to: string, otp: string) {
  await transport().sendMail({
    from: from(),
    to,
    subject: "Tank Alert — Login OTP",
    html: `
      <h2>Your OTP</h2>
      <p style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#18181b;">${otp}</p>
      <p>Expires in 5 minutes.</p>
    `,
  });
}
