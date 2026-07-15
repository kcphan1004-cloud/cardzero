import type { Metadata } from "next";
import FeaturedVideoGrid from "../../components/FeaturedVideoGrid";
import {
  fallbackLatestVideos,
  popularVideos,
  type FeaturedVideo,
} from "../../data/featured-videos";

const CHANNEL_ID = "UCKltNAdALCvjKWZf24rrNIQ";
const CHANNEL_URL =
  "https://www.youtube.com/@CardZero_%E5%8D%A1%E9%9B%B6%E7%A4%BE";
const FEED_URL =
  `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export const metadata: Metadata = {
  title: "影片专区｜卡零社 CardZero",
  description:
    "卡零社最新影片与热门 Union Arena 对战、卡组及赛事影片。",
};

export const revalidate = 3600;

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function formatPublishedDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

function parseLatestVideos(xml: string): FeaturedVideo[] {
  const entries =
    xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  const videos: FeaturedVideo[] = [];

  for (const entry of entries) {
    const idMatch = entry.match(
      /<yt:videoId>([^<]+)<\/yt:videoId>/,
    );
    const titleMatch = entry.match(
      /<title>([\s\S]*?)<\/title>/,
    );
    const publishedMatch = entry.match(
      /<published>([^<]+)<\/published>/,
    );

    const id = idMatch?.[1]?.trim() ?? "";
    const title = decodeXml(
      titleMatch?.[1] ?? "",
    );
    const published =
      publishedMatch?.[1]?.trim() ?? "";

    if (!id || !title) {
      continue;
    }

    videos.push({
      id,
      title,
      category: "最新影片",
      badge: formatPublishedDate(published),
    });

    if (videos.length >= 4) {
      break;
    }
  }

  return videos;
}

async function getLatestVideos(): Promise<FeaturedVideo[]> {
  try {
    const response = await fetch(FEED_URL, {
      next: {
        revalidate: 3600,
      },
      headers: {
        "User-Agent": "CardZero Website/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `YouTube feed HTTP ${response.status}`,
      );
    }

    const xml = await response.text();
    const videos = parseLatestVideos(xml);

    if (videos.length > 0) {
      return videos;
    }

    return fallbackLatestVideos;
  } catch (error) {
    console.error(
      "读取 YouTube 最新影片失败，使用备用资料：",
      error,
    );

    return fallbackLatestVideos;
  }
}

export default async function VideoPage() {
  const latestVideos = await getLatestVideos();

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(185,28,28,0.2),_transparent_44%)]">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.28em] text-red-400">
            CARDZERO VIDEO
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                卡零社影片专区
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                分为最新影片与热门影片。点击缩略图后，
                可直接在卡零社网页内观看。
              </p>
            </div>

            <a
              href={CHANNEL_URL}
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

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-9 sm:px-6 lg:px-8">
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-red-400">
                LATEST VIDEOS
              </p>

              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                最新影片
              </h2>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                自动读取卡零社 YouTube 频道最近上传的影片，
                每小时检查更新。
              </p>
            </div>

            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-300">
              最新 {latestVideos.length} 支
            </span>
          </div>

          <FeaturedVideoGrid videos={latestVideos} />
        </section>

        <section className="border-t border-white/10 pt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-amber-400">
                POPULAR VIDEOS
              </p>

              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                热门影片
              </h2>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                精选频道中观看表现较好的影片。
              </p>
            </div>

            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-200">
              热门精选
            </span>
          </div>

          <FeaturedVideoGrid videos={popularVideos} />
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-xs leading-6 text-zinc-500">
          播放器只会在用户点击影片后载入，
          避免多个 YouTube 播放器同时拖慢页面。
        </div>
      </div>
    </main>
  );
}
