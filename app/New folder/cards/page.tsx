import Link from "next/link";

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-red-500 hover:text-red-400">
          ← 返回首页
        </Link>

        <h1 className="mt-8 text-5xl font-black">卡牌资料</h1>

        <p className="mt-6 text-gray-400">
          浏览卡牌效果、中文翻译、系列和稀有度资料。
        </p>
      </div>
    </main>
  );
}