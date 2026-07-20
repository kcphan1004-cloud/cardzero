import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function DeckDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("deck_submissions")
    .select(`
      id, slug, author_name, submitter_name, deck_name, series,
      color, deck_type, description, notes, event_name, result,
      image_url, published_at, created_at
    `)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error) console.error("读取牌组详情失败：", error);
  if (!data) notFound();

  const author = data.author_name || data.submitter_name || "CardZero 玩家";
  const description = data.description || data.notes || "";

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/deck" className="text-sm font-bold text-zinc-500 hover:text-white">
          ← 返回牌组分享
        </Link>

        <article className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div className="bg-black p-4 sm:p-6">
            <img src={data.image_url} alt={data.deck_name} className="mx-auto max-h-[720px] w-auto max-w-full rounded-2xl object-contain" />
          </div>

          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {data.color ? <span className="rounded-full border border-red-900 bg-red-950/40 px-3 py-1.5 text-red-300">{data.color}</span> : null}
              {data.deck_type ? <span className="rounded-full border border-zinc-700 bg-black px-3 py-1.5 text-zinc-400">{data.deck_type}</span> : null}
              {data.result ? <span className="rounded-full border border-amber-800 bg-amber-950/30 px-3 py-1.5 text-amber-300">{data.result}</span> : null}
            </div>

            <h1 className="mt-5 text-3xl font-black sm:text-5xl">{data.deck_name}</h1>
            <p className="mt-3 text-lg font-bold text-zinc-500">{data.series}</p>

            <div className="mt-6 grid gap-4 rounded-2xl border border-zinc-800 bg-black/40 p-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-zinc-600">投稿者</p>
                <p className="mt-2 font-bold text-white">{author}</p>
              </div>
              {data.event_name ? (
                <div>
                  <p className="text-xs font-bold text-zinc-600">赛事</p>
                  <p className="mt-2 font-bold text-white">{data.event_name}</p>
                </div>
              ) : null}
            </div>

            {description ? (
              <section className="mt-7 rounded-2xl border border-red-950 bg-red-950/10 p-5 sm:p-6">
                <h2 className="text-sm font-black tracking-[0.18em] text-red-400">牌组说明</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-zinc-300">{description}</p>
              </section>
            ) : null}
          </div>
        </article>
      </div>
    </main>
  );
}
