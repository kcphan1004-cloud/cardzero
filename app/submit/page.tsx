import fs from "node:fs";
import path from "node:path";
import DeckSubmissionForm from "../../components/DeckSubmissionForm";

export const metadata = {
  title: "牌组投稿｜卡零社 CardZero",
  description:
    "投稿你的 Union Arena 牌组、赛事成绩与卡组心得。",
};

function getSeriesOptions() {
  try {
    const directory = path.join(
      process.cwd(),
      "data",
      "card-series-generated",
    );

    return fs
      .readdirSync(directory)
      .filter(
        (fileName) =>
          fileName.endsWith(".ts") &&
          !["index.ts", "types.ts"].includes(
            fileName,
          ),
      )
      .map((fileName) =>
        fileName.replace(/\.ts$/, ""),
      );
  } catch {
    return [];
  }
}

export default function SubmitPage() {
  const seriesOptions = getSeriesOptions();

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(185,28,28,0.22),_transparent_48%)]">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.28em] text-red-400">
            DECK SUBMISSION
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl lg:text-5xl">
            牌组投稿专区
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
            分享你的牌组、赛事成绩与构筑思路。
            投稿成功后会直接显示在卡零社牌组分享区。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              "填写投稿资料",
              "上传牌组图片",
              "立即公开展示",
            ].map((text, index) => (
              <div
                key={text}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <p className="text-xs font-bold text-red-400">
                  0{index + 1}
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-200">
                  {text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-6 text-amber-100/75">
            投稿内容会立即公开，请勿上传违法、侵权、冒充他人或含有私人资料的内容。
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-9 sm:px-6 lg:px-8">
        <DeckSubmissionForm
          seriesOptions={seriesOptions}
        />
      </section>
    </main>
  );
}
