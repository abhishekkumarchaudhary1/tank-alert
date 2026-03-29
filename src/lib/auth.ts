import { SignJWT, jwtVerify } from "jose";
import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE = "tank-alert-session";

export const hashPwd = (pwd: string) => hash(pwd, 12);
export const checkPwd = (pwd: string, hashed: string) => compare(pwd, hashed);

export async function createSession(p: {
  email: string;
  role: string;
  userId: string;
}) {
  const token = await new SignJWT(p)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as { email: string; role: string; userId: string };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function genToken() {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 48 }, () =>
    c[Math.floor(Math.random() * c.length)],
  ).join("");
}

export function genTempPassword() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () =>
    c[Math.floor(Math.random() * c.length)],
  ).join("");
}
