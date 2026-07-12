import { redirect } from "next/navigation";

import { isAdminSession } from "../../../lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  if (await isAdminSession()) {
    redirect("/admin/submissions");
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-16 text-white">
      <div className="w-full max-w-md rounded-3xl border border-red-950 bg-zinc-950 p-7 sm:p-9">
        <p className="text-xs font-black tracking-[0.24em] text-red-500">
          CARDZERO ADMIN
        </p>

        <h1 className="mt-3 text-3xl font-black">
          投稿审核后台
        </h1>

        <p className="mt-3 text-sm leading-7 text-zinc-500">
          仅供卡零社管理员使用。
        </p>

        <form
          action="/api/admin/login"
          method="post"
          className="mt-7"
        >
          <label
            htmlFor="password"
            className="text-sm font-bold text-zinc-300"
          >
            管理员密码
          </label>

          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-red-600"
          />

          {error && (
            <p className="mt-3 rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              密码不正确。
            </p>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-red-700 px-5 py-3 font-black transition hover:bg-red-600"
          >
            登录后台
          </button>
        </form>
      </div>
    </main>
  );
}
