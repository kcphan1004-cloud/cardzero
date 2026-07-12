import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  verifyAdminPassword,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(
    formData.get("password") || "",
  );

  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.redirect(
      new URL("/admin/login?error=1", request.url),
      303,
    );
  }

  const response = NextResponse.redirect(
    new URL("/admin/submissions", request.url),
    303,
  );

  response.cookies.set(
    ADMIN_COOKIE_NAME,
    createAdminSessionToken(),
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE,
    },
  );

  return response;
}
