import Link from "next/link";

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-red-500 hover:text-red-400">
          ← 返回首页
        </Link>

        <h1 className="mt-8 text-5xl font-black">赛事活动</h1>

        <p className="mt-6 text-gray-400">
          查看卡零社举办的比赛、交流赛和报名资讯。
        </p>
      </div>
    </main>
  );
}