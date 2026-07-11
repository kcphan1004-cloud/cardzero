import Link from "next/link";
import Hero from "../Components/Hero";

const news = [
  { tag: "新闻", title: "UNION ARENA TCG 最新扩展包情报公开！", date: "2026-07-09" },
  { tag: "赛事", title: "卡零社杯 Vol.1 赛事报名即将开放", date: "2026-07-09" },
  { tag: "公告", title: "卡零社官网正式上线", date: "2026-07-09" },
];

const events = [
  { month: "JUL", day: "20", title: "卡零社交流赛", players: "16人", location: "CardZero Arena" },
  { month: "AUG", day: "03", title: "Union Arena 新手赛", players: "32人", location: "CardZero Arena" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-red-900/40 bg-black/80 px-8 py-5 backdrop-blur">
        <div className="text-3xl font-black text-red-500">卡零社</div>

        <div className="hidden gap-8 text-sm font-semibold text-gray-300 md:flex">
          <Link href="/">首页</Link>
          <Link href="/about">关于我们</Link>
          <Link href="/news">新闻资讯</Link>
          <Link href="/cards">卡牌资料</Link>
          <Link href="/events">赛事活动</Link>
          <Link href="/videos">视频专区</Link>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center overflow-hidden px-8 pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(220,38,38,0.35),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_35%,rgba(185,28,28,0.25))]" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-5 tracking-[0.45em] text-red-400">
              UNION ARENA TCG
            </p>

            <h1 className="text-6xl font-black leading-tight md:text-8xl">
              卡零社
              <span className="block text-red-500">Card Zero</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">
              集结、对战、超越。卡零社是专注于 TCG 内容的华语平台，
              分享卡牌资料、赛事活动、卡组分析与视频内容。
            </p>

            <div className="mt-10 flex gap-4">
              <Link
                href="/cards"
                className="rounded-xl bg-red-600 px-8 py-4 font-bold hover:bg-red-700"
              >
                卡牌资料
              </Link>

              <Link
                href="/videos"
                className="rounded-xl border border-red-500 px-8 py-4 font-bold text-red-400 hover:bg-red-600 hover:text-white"
              >
                视频专区
              </Link>
            </div>
          </div>

          <div className="relative h-[420px]">
            <div className="absolute right-0 top-10 h-80 w-56 rotate-12 rounded-3xl border border-red-400 bg-red-900/70 shadow-[0_0_50px_rgba(220,38,38,0.7)]" />
            <div className="absolute right-28 top-20 h-80 w-56 rotate-3 rounded-3xl border border-red-400 bg-red-800/70 shadow-[0_0_40px_rgba(220,38,38,0.6)]" />
            <div className="absolute right-56 top-28 h-80 w-56 -rotate-6 rounded-3xl border border-red-400 bg-red-950/80 shadow-[0_0_35px_rgba(220,38,38,0.5)]" />
          </div>
        </div>
      </section>

      <section className="border-y border-red-900/40 bg-zinc-950 px-8 py-14">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
          {["卡牌资料", "赛事活动", "视频专区", "社群交流"].map((item) => (
            <div key={item} className="rounded-2xl border border-red-900/50 bg-black p-8 text-center">
              <div className="text-4xl text-red-500">◇</div>
              <h3 className="mt-4 text-xl font-bold">{item}</h3>
              <p className="mt-3 text-sm text-gray-400">
                探索 CardZero TCG 内容与玩家资讯。
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 py-20">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-4xl font-black">最新资讯</h2>
          <Link href="/news" className="text-red-400">查看更多 →</Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {news.map((item) => (
            <div key={item.title} className="rounded-2xl border border-red-900/60 bg-zinc-950 p-6">
              <span className="bg-red-600 px-3 py-1 text-xs font-bold">{item.tag}</span>
              <h3 className="mt-6 text-xl font-bold">{item.title}</h3>
              <p className="mt-4 text-sm text-gray-500">{item.date}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-4xl font-black">近期赛事</h2>
          <Link href="/events" className="text-red-400">查看更多 →</Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {events.map((event) => (
            <div key={event.title} className="flex items-center gap-8 rounded-2xl border border-red-900/60 bg-zinc-950 p-8">
              <div>
                <p className="text-red-500 font-black">{event.month}</p>
                <p className="text-5xl font-black">{event.day}</p>
              </div>

              <div>
                <h3 className="text-2xl font-bold">{event.title}</h3>
                <p className="mt-3 text-gray-400">{event.players} · {event.location}</p>
                <button className="mt-5 rounded-lg bg-red-600 px-5 py-2 font-bold">
                  立即报名
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-red-900/40 bg-black px-8 py-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row">
          <div>
            <h2 className="text-4xl font-black text-red-500">卡零社</h2>
            <p className="mt-3 text-gray-400">Card Zero · Every Card Matters</p>
          </div>

          <div className="grid gap-3 text-gray-400">
            <Link href="/">首页</Link>
            <Link href="/news">新闻资讯</Link>
            <Link href="/cards">卡牌资料</Link>
            <Link href="/videos">视频专区</Link>
          </div>
        </div>
      </footer>
    <main className="min-h-screen bg-black text-white">
  <Hero />

  {/* 原本的其他首页内容 */}
</main>
  );
}