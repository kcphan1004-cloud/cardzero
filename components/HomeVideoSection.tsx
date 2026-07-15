import Link from "next/link";
import {
  fallbackLatestVideos,
  popularVideos,
  type FeaturedVideo,
} from "../data/featured-videos";

const CHANNEL_ID = "UCKltNAdALCvjKWZf24rrNIQ";
const FEED_URL =
  `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

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

function parseLatestVideos(xml: string): FeaturedVideo[] {
  const entries =
    xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  const videos: FeaturedVideo[] = [];

  for (const entry of entries) {
    const id =
      entry.match(
        /<yt:videoId>([^<]+)<\/yt:videoId>/,
      )?.[1]?.trim() ?? "";

    const title = decodeXml(
      entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ??
        "",
    );

    if (!id || !title) {
      continue;
    }

    videos.push({
      id,
      title,
      category: "最新影片",
      badge: "NEW",
    });

    if (videos.length >= 2) {
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

    const videos = parseLatestVideos(
      await response.text(),
    );

    return videos.length > 0
      ? videos
      : fallbackLatestVideos.slice(0, 2);
  } catch (error) {
    console.error(
      "首页读取 YouTube 最新影片失败：",
      error,
    );

    return fallbackLatestVideos.slice(0, 2);
  }
}

function VideoCard({
  video,
  tone,
}: {
  video: FeaturedVideo;
  tone: "latest" | "popular";
}) {
  const badgeClass =
    tone === "latest"
      ? "border-red-500/35 bg-red-500/10 text-red-300"
      : "border-amber-500/35 bg-amber-500/10 text-amber-200";

  return (
    <Link
      href="/video"
      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition duration-200 hover:-translate-y-1 hover:border-red-500/50"
      aria-label={`前往影片专区观看：${video.title}`}
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        <img
          src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          alt={video.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035] group-hover:opacity-80"
        />

        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-red-600/95 text-base shadow-lg transition group-hover:scale-110 group-hover:bg-red-500">
          ▶
        </span>

        <span
          className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[9px] font-black ${badgeClass}`}
        >
          {tone === "latest" ? "最新" : "热门"}
        </span>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-zinc-100">
          {video.title}
        </h3>

        <p className="mt-2 text-[10px] font-semibold text-zinc-600">
          前往卡零社影片专区观看 →
        </p>
      </div>
    </Link>
  );
}

export default async function HomeVideoSection() {
  const latestVideos = await getLatestVideos();
  const selectedPopularVideos = popularVideos.slice(0, 2);

  return (
    <section className="border-t border-white/10 bg-[#070707]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.24em] text-red-400">
              CARDZERO VIDEO
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              卡零社影片
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              最新影片与热门精选，点击后进入影片专区观看。
            </p>
          </div>

          <Link
            href="/video"
            className="inline-flex items-center rounded-lg border border-red-500/40 bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500"
          >
            查看全部影片
            <span aria-hidden="true" className="ml-1.5">
              →
            </span>
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {latestVideos.map((video) => (
            <VideoCard
              key={`latest-${video.id}`}
              video={video}
              tone="latest"
            />
          ))}

          {selectedPopularVideos.map((video) => (
            <VideoCard
              key={`popular-${video.id}`}
              video={video}
              tone="popular"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
