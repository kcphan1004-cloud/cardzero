import Link from "next/link";

import AdminSubmissionActions from "../../../components/AdminSubmissionActions";
import { requireAdminPage } from "../../../lib/admin-auth";
import { createSupabaseAdmin } from "../../../lib/supabase-admin";
import type {
  DeckSubmission,
  SubmissionStatus,
} from "../../../types/submission";

export const dynamic = "force-dynamic";

const statusLabels: Record<
  SubmissionStatus,
  string
> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "不通过",
};

const statusStyles: Record<
  SubmissionStatus,
  string
> = {
  pending:
    "border-amber-800 bg-amber-950/30 text-amber-300",
  approved:
    "border-emerald-800 bg-emerald-950/30 text-emerald-300",
  rejected:
    "border-red-800 bg-red-950/30 text-red-300",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
  }>;
}) {
  await requireAdminPage();

  const queryParams = await searchParams;
  const filterStatus =
    queryParams.status &&
    ["pending", "approved", "rejected"].includes(
      queryParams.status,
    )
      ? (queryParams.status as SubmissionStatus)
      : "all";

  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("deck_submissions")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (filterStatus !== "all") {
    query = query.eq(
      "status",
      filterStatus,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("读取投稿后台失败：", error);
  }

  const submissions =
    (data || []) as DeckSubmission[];

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 rounded-3xl border border-red-950 bg-zinc-950 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-black tracking-[0.24em] text-red-500">
              CARDZERO ADMIN
            </p>

            <h1 className="mt-2 text-3xl font-black">
              投稿审核
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              共 {submissions.length} 笔资料
            </p>
          </div>

          <form
            action="/api/admin/logout"
            method="post"
          >
            <button
              type="submit"
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-700 hover:text-white"
            >
              登出后台
            </button>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["all", "全部"],
            ["pending", "待审核"],
            ["approved", "已通过"],
            ["rejected", "不通过"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={
                value === "all"
                  ? "/admin/submissions"
                  : `/admin/submissions?status=${value}`
              }
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                filterStatus === value
                  ? "border-red-700 bg-red-950/50 text-red-300"
                  : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {submissions.map(
            (submission) => (
              <article
                key={submission.id}
                className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
              >
                <div className="grid lg:grid-cols-[380px_1fr]">
                  <div className="bg-black p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        submission.image_url
                      }
                      alt={
                        submission.deck_name
                      }
                      className="max-h-[520px] w-full rounded-xl object-contain"
                    />
                  </div>

                  <div className="p-5 sm:p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          statusStyles[
                            submission.status
                          ]
                        }`}
                      >
                        {
                          statusLabels[
                            submission.status
                          ]
                        }
                      </span>

                      <span className="text-xs text-zinc-600">
                        {formatDate(
                          submission.created_at,
                        )}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black">
                      {
                        submission.deck_name
                      }
                    </h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      {submission.series} ·{" "}
                      {submission.color} ·{" "}
                      {
                        submission.deck_type
                      }
                    </p>

                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-zinc-600">
                          投稿者
                        </dt>
                        <dd className="mt-1 text-zinc-300">
                          {
                            submission.author_name
                          }
                        </dd>
                      </div>

                      <div>
                        <dt className="text-zinc-600">
                          联络方式
                        </dt>
                        <dd className="mt-1 break-all text-zinc-300">
                          {submission.contact ||
                            "未提供"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <section className="rounded-xl border border-zinc-800 bg-black p-4">
                        <h3 className="font-bold text-red-500">
                          牌组介绍
                        </h3>
                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">
                          {
                            submission.description
                          }
                        </p>
                      </section>

                      <section className="rounded-xl border border-zinc-800 bg-black p-4">
                        <h3 className="font-bold text-red-500">
                          操作思路
                        </h3>
                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">
                          {
                            submission.strategy
                          }
                        </p>
                      </section>
                    </div>

                    {(submission.deck_link ||
                      submission.deck_code) && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                        {submission.deck_link && (
                          <a
                            href={
                              submission.deck_link
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-red-400 hover:text-red-300"
                          >
                            打开牌表链接 ↗
                          </a>
                        )}

                        {submission.deck_code && (
                          <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-zinc-500">
                            {
                              submission.deck_code
                            }
                          </pre>
                        )}
                      </div>
                    )}

                    <AdminSubmissionActions
                      id={submission.id}
                      initialStatus={
                        submission.status
                      }
                      initialNote={
                        submission.admin_note
                      }
                    />
                  </div>
                </div>
              </article>
            ),
          )}

          {submissions.length === 0 && (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-20 text-center text-zinc-500">
              此分类目前没有投稿。
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
