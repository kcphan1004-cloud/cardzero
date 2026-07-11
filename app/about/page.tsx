import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-red-500 hover:text-red-400">
          ← 返回首页
        </Link>

        <h1 className="mt-8 text-5xl font-black">关于卡零社</h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          卡零社 CardZero 是一个专注于 TCG 内容的华语平台，
          分享卡牌资讯、卡组分析、赛事活动与影片内容。
        </p>
      </div>
    </main>
  );
}