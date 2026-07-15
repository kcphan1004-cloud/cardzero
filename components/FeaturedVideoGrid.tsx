"use client";

import { useState } from "react";
import type { FeaturedVideo } from "../data/featured-videos";

type Props = {
  videos: FeaturedVideo[];
};

export default function FeaturedVideoGrid({ videos }: Props) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(
    null,
  );

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {videos.map((video, index) => {
        const isActive = activeVideoId === video.id;

        return (
          <article
            key={video.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-xl shadow-black/20 transition hover:border-red-500/50"
          >
            <div className="aspect-video bg-black">
              {isActive ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
                  title={video.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveVideoId(video.id)}
                  className="group relative h-full w-full overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
                  aria-label={`播放：${video.title}`}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                    alt={video.title}
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025] group-hover:opacity-80"
                  />

                  <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-red-600/95 text-xl shadow-xl transition group-hover:scale-110 group-hover:bg-red-500">
                    ▶
                  </span>

                  <span className="absolute bottom-3 left-3 rounded-md bg-black/75 px-2 py-1 text-[10px] font-bold text-white">
                    点击播放
                  </span>
                </button>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300">
                  {video.category}
                </span>

                {video.badge ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-400">
                    {video.badge}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 line-clamp-2 min-h-12 text-base font-black leading-6 text-zinc-100 sm:text-lg">
                {video.title}
              </h3>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-zinc-600">
                  CardZero 卡零社
                </span>

                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-red-400 transition hover:text-red-300"
                >
                  YouTube 观看 ↗
                </a>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
