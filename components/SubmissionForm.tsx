"use client";

import Script from "next/script";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    turnstile?: {
      reset: () => void;
    };
  }
}

const inputClassName =
  "mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-600";

const labelClassName =
  "text-sm font-bold text-zinc-200";

export default function SubmissionForm() {
  const router = useRouter();
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] =
    useState("");

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(
      file ? URL.createObjectURL(file) : "",
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(
        "/api/submissions",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        submissionId?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
            "投稿失败，请稍后重试。",
        );
      }

      router.push(
        `/submit/success?id=${encodeURIComponent(
          result.submissionId || "",
        )}`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "投稿失败，请稍后重试。",
      );

      window.turnstile?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7 md:grid-cols-2">
          <div>
            <label
              className={labelClassName}
              htmlFor="authorName"
            >
              投稿者名称
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <input
              id="authorName"
              name="authorName"
              required
              minLength={2}
              maxLength={40}
              className={inputClassName}
              placeholder="你的昵称或社群名称"
            />
          </div>

          <div>
            <label
              className={labelClassName}
              htmlFor="contact"
            >
              联络方式
            </label>

            <input
              id="contact"
              name="contact"
              maxLength={120}
              className={inputClassName}
              placeholder="Email／Discord／Facebook（不会公开）"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <p className="text-xs font-black tracking-[0.22em] text-red-500">
            DECK INFORMATION
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            牌组资料
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                className={labelClassName}
                htmlFor="deckName"
              >
                牌组名称
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="deckName"
                name="deckName"
                required
                minLength={2}
                maxLength={80}
                className={inputClassName}
                placeholder="例如：红色艾莉丝快攻"
              />
            </div>

            <div>
              <label
                className={labelClassName}
                htmlFor="series"
              >
                作品系列
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="series"
                name="series"
                required
                maxLength={80}
                className={inputClassName}
                placeholder="例如：无职转生"
              />
            </div>

            <div>
              <label
                className={labelClassName}
                htmlFor="color"
              >
                主要颜色
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="color"
                name="color"
                required
                defaultValue=""
                className={inputClassName}
              >
                <option value="" disabled>
                  请选择颜色
                </option>
                <option value="红色">红色</option>
                <option value="蓝色">蓝色</option>
                <option value="绿色">绿色</option>
                <option value="黄色">黄色</option>
                <option value="紫色">紫色</option>
                <option value="混色">混色</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div>
              <label
                className={labelClassName}
                htmlFor="deckType"
              >
                牌组类型
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="deckType"
                name="deckType"
                required
                defaultValue=""
                className={inputClassName}
              >
                <option value="" disabled>
                  请选择类型
                </option>
                <option value="快攻">快攻</option>
                <option value="中速">中速</option>
                <option value="控制">控制</option>
                <option value="组合技">组合技</option>
                <option value="娱乐">娱乐</option>
                <option value="比赛">比赛</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div>
            <label
              className={labelClassName}
              htmlFor="image"
            >
              牌表截图
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <p className="mt-1 text-xs leading-6 text-zinc-500">
              支持 JPG、PNG、WebP，最大 5MB。
            </p>

            <input
              id="image"
              name="image"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="mt-3 block w-full rounded-xl border border-dashed border-zinc-700 bg-black p-4 text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-red-700 file:px-4 file:py-2 file:font-bold file:text-white hover:border-red-700"
            />

            {previewUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="牌表截图预览"
                  className="max-h-[560px] w-full object-contain"
                />
              </div>
            )}
          </div>

          <div className="mt-6">
            <label
              className={labelClassName}
              htmlFor="deckLink"
            >
              牌表链接
            </label>

            <input
              id="deckLink"
              name="deckLink"
              type="url"
              maxLength={500}
              className={inputClassName}
              placeholder="https://..."
            />
          </div>

          <div className="mt-6">
            <label
              className={labelClassName}
              htmlFor="deckCode"
            >
              牌组代码／完整牌表文字
            </label>

            <textarea
              id="deckCode"
              name="deckCode"
              rows={6}
              maxLength={4000}
              className={inputClassName}
              placeholder="可贴上牌组代码、卡号与数量。"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div>
            <label
              className={labelClassName}
              htmlFor="description"
            >
              牌组介绍
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={3000}
              rows={6}
              className={inputClassName}
              placeholder="介绍牌组核心、特色、适合的玩家与对局方向。"
            />
          </div>

          <div className="mt-6">
            <label
              className={labelClassName}
              htmlFor="strategy"
            >
              操作思路
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <textarea
              id="strategy"
              name="strategy"
              required
              minLength={20}
              maxLength={5000}
              rows={8}
              className={inputClassName}
              placeholder="说明起手选择、前中后期打法、关键连动与注意事项。"
            />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-px w-px overflow-hidden"
        >
          <label htmlFor="website">
            Website
          </label>
          <input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="rounded-2xl border border-red-950 bg-red-950/10 p-5 sm:p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              value="true"
              required
              className="mt-1 h-4 w-4 accent-red-600"
            />

            <span className="text-sm leading-7 text-zinc-300">
              我确认投稿内容与图片可供卡零社审核，并同意审核通过后公开展示。卡零社可进行排版、错字与格式调整。
            </span>
          </label>

          {turnstileSiteKey && (
            <div
              className="cf-turnstile mt-5"
              data-sitekey={turnstileSiteKey}
              data-theme="dark"
            />
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-red-700 px-6 py-4 text-base font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "正在提交，请稍候……"
            : "提交牌组审核"}
        </button>
      </form>
    </>
  );
}
