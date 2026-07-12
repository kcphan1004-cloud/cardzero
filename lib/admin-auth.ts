import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE_NAME = "cardzero_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function requireEnvironmentValue(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`缺少环境变量 ${name}。`);
  }

  return value;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signPayload(payload: string) {
  const secret = requireEnvironmentValue(
    "ADMIN_SESSION_SECRET",
  );

  return createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function verifyAdminPassword(password: string) {
  const expectedHash = requireEnvironmentValue(
    "ADMIN_PASSWORD_SHA256",
  ).toLowerCase();

  const actualHash = createHash("sha256")
    .update(password, "utf8")
    .digest("hex");

  return safeCompare(actualHash, expectedHash);
}

export function createAdminSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + ADMIN_COOKIE_MAX_AGE * 1000,
    }),
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payload);

  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };

    return (
      typeof parsed.exp === "number" &&
      parsed.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export async function isAdminSession() {
  const cookieStore = await cookies();

  return verifyAdminSessionToken(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value,
  );
}

export async function requireAdminPage() {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }
}
