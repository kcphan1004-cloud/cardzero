import SubmissionForm from "../../components/SubmissionForm";

export const metadata = {
  title: "牌组投稿｜卡零社 CardZero",
  description:
    "向卡零社投稿你的 UNION ARENA 牌组与操作心得。",
};

export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-red-950 bg-zinc-950 px-6 py-9 sm:px-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-950/40 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black tracking-[0.28em] text-red-500">
              CARDZERO COMMUNITY
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-5xl">
              牌组投稿专区
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              分享你的牌组构筑、实战思路与心得。投稿会先进入审核，审核通过后才会显示在牌组分享页面。
            </p>
          </div>
        </div>

        <div className="mt-7">
          <SubmissionForm />
        </div>
      </div>
    </main>
  );
}
