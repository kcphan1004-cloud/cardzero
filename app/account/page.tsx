"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "../../components/AuthProvider";

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) return <main className="grid min-h-screen place-items-center bg-black text-zinc-400">正在读取账号……</main>;

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-4 text-white">
        <section className="text-center">
          <h1 className="text-3xl font-black">尚未登录</h1>
          <Link href="/login" className="mt-5 inline-flex rounded-xl bg-red-700 px-5 py-3 font-black">前往登录</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white">
      <section className="mx-auto max-w-2xl rounded-3xl border border-red-950 bg-zinc-950 p-7 sm:p-10">
        <p className="text-xs font-black tracking-[0.25em] text-red-500">PLAYER ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-black">账号设置</h1>
        <div className="mt-7 rounded-2xl border border-zinc-800 bg-black p-5">
          <p className="text-xs text-zinc-500">登录邮箱</p>
          <p className="mt-2 break-all font-bold">{user.email}</p>
          <p className="mt-4 text-xs text-emerald-400">● 邮箱已验证，云端卡组同步已启用</p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/deck-builder" className="rounded-xl bg-red-700 px-5 py-3 text-center text-sm font-black hover:bg-red-600">打开我的卡组</Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/");
              router.refresh();
            }}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-black text-zinc-300 hover:border-red-700 hover:text-white"
          >
            登出账号
          </button>
        </div>
      </section>
    </main>
  );
}
