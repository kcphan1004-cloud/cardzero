export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-10 py-6 border-b border-red-900/40">
        <div className="text-2xl font-bold text-red-500">CardZero</div>

        <div className="flex gap-6 text-sm text-gray-300">
          <a href="#">Home</a>
          <a href="#">News</a>
          <a href="#">Cards</a>
          <a href="#">Decks</a>
          <a href="#">Videos</a>
          <a href="#">About</a>
        </div>
      </nav>

      <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <p className="text-red-500 tracking-[0.4em] uppercase mb-4">
          CardZero TCG Platform
        </p>

        <h1 className="text-6xl font-bold">
          Every Card Matters
        </h1>

        <p className="mt-6 max-w-2xl text-gray-400 text-lg">
          卡零社 CardZero 是一个专注于 TCG 内容的华语平台，分享卡牌资讯、卡组分析、新卡翻译与影片内容。
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-xl bg-red-600 px-8 py-3 font-semibold hover:bg-red-700">
            最新资讯
          </button>

          <button className="rounded-xl border border-red-600 px-8 py-3 font-semibold text-red-500 hover:bg-red-600 hover:text-white">
            查看卡组
          </button>

          <button className="rounded-xl border border-red-600 px-8 py-3 font-semibold text-red-500 hover:bg-red-600 hover:text-white">
            查看T表
          </button>
        </div>
      </section>
    </main>
  );
}