export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.25),transparent_35%)]" />

      <nav className="relative z-10 flex items-center justify-between px-10 py-6 border-b border-red-900/40 bg-black/70 backdrop-blur">
        <div className="text-2xl font-black text-red-500 tracking-wide">
          CardZero
        </div>

        <div className="hidden md:flex gap-8 text-sm text-gray-300">
          <a href="#">Home</a>
          <a href="#">News</a>
          <a href="#">Cards</a>
          <a href="#">Decks</a>
          <a href="#">Videos</a>
          <a href="#">About</a>
        </div>
      </nav>

      <section className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center text-center px-6">
        <div className="mb-6 rounded-full border border-red-500/40 bg-red-950/40 px-5 py-2 text-sm text-red-300">
          华语 TCG 内容平台
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight">
          Dennis是
          <span className="block text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.7)]">
            大老板
          </span>
        </h1>

        <p className="mt-8 max-w-2xl text-lg text-gray-300 leading-8">
          卡零社 CardZero 专注于卡牌资讯、卡组分析、新卡翻译、赛事环境与影片内容，
          打造属于华语玩家的 TCG 交流平台。
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button className="rounded-xl bg-red-600 px-9 py-4 font-bold hover:bg-red-700 transition shadow-[0_0_25px_rgba(220,38,38,0.5)]">
            查看最新资讯
          </button>

          <button className="rounded-xl border border-red-500 px-9 py-4 font-bold text-red-400 hover:bg-red-600 hover:text-white transition">
            进入卡组资料库
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          <div className="rounded-2xl border border-red-900/50 bg-zinc-950/80 p-6">
            <h3 className="text-xl font-bold text-red-400">新卡翻译</h3>
            <p className="mt-3 text-gray-400">快速整理最新公开卡牌效果与中文说明。</p>
          </div>

          <div className="rounded-2xl border border-red-900/50 bg-zinc-950/80 p-6">
            <h3 className="text-xl font-bold text-red-400">卡组分析</h3>
            <p className="mt-3 text-gray-400">分享主流卡组构筑、打法与环境判断。</p>
          </div>

          <div className="rounded-2xl border border-red-900/50 bg-zinc-950/80 p-6">
            <h3 className="text-xl font-bold text-red-400">影片内容</h3>
            <p className="mt-3 text-gray-400">整合 YouTube、Shorts 与频道最新节目。</p>
          </div>
        </div>
      </section>
    </main>
  );
}