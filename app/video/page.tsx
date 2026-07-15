import type { Metadata } from "next";
import FeaturedVideoGrid from "../../components/FeaturedVideoGrid";
import { featuredVideos } from "../../data/featured-videos";

export const metadata: Metadata = {
  title: "热门影片｜卡零社 CardZero",
  description:
    "卡零社 CardZero 热门 Union Arena 对战、卡组与赛事影片。",
};

export default function VideoPage() {
  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(185,28,28,0.2),_transparent_44%)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.28em] text-red-400">
            CARDZERO VIDEO
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                卡零社热门影片
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                精选频道中观看表现较好的 Union Arena 对战影片。
                点击缩略图即可直接在网页播放。
              </p>
            </div>

            <a
              href="https://www.youtube.com/@CardZero_%E5%8D%A1%E9%9B%B6%E7%A4%BE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center rounded-xl border border-red-500/60 bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500"
            >
              前往 YouTube 频道
              <span aria-hidden="true" className="ml-2">
                ↗
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-red-400">
              POPULAR PICKS
            </p>
            <h2 className="mt-1 text-2xl font-black">
              热门精选
            </h2>
          </div>

          <p className="hidden text-xs text-zinc-500 sm:block">
            播放器只会在点击后载入
          </p>
        </div>

        <FeaturedVideoGrid videos={featuredVideos} />

        <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-xs leading-6 text-zinc-500">
          影片使用 YouTube 官方隐私增强播放器。播放量会持续变化，
          本页以卡零社公开频道中表现较好的影片作为精选内容。
        </div>
      </section>
    </main>
  );
}
