"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type DeckOptionMap = Record<
  string,
  string[]
>;

type Props = {
  seriesOptions: string[];
  deckOptionsBySeries: DeckOptionMap;
};

type SubmitState =
  | {
      type: "idle";
      message: "";
    }
  | {
      type: "loading";
      message: string;
    }
  | {
      type: "success";
      message: string;
    }
  | {
      type: "error";
      message: string;
    };

const CUSTOM_DECK_VALUE =
  "__custom_deck__";

export default function DeckSubmissionForm({
  seriesOptions,
  deckOptionsBySeries,
}: Props) {
  const [state, setState] =
    useState<SubmitState>({
      type: "idle",
      message: "",
    });

  const [
    selectedSeries,
    setSelectedSeries,
  ] = useState("");

  const [
    selectedDeck,
    setSelectedDeck,
  ] = useState("");

  const [
    customDeckName,
    setCustomDeckName,
  ] = useState("");

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null,
  );

  const sortedSeries = useMemo(
    () =>
      [...seriesOptions].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "zh-Hans-CN",
          ),
      ),
    [seriesOptions],
  );

  const availableDecks =
    useMemo(() => {
      if (!selectedSeries) {
        return [];
      }

      return [
        ...new Set(
          (
            deckOptionsBySeries[
              selectedSeries
            ] ?? []
          )
            .map((deckName) =>
              deckName.trim(),
            )
            .filter(Boolean),
        ),
      ].sort((a, b) =>
        a.localeCompare(
          b,
          "zh-Hans-CN",
        ),
      );
    }, [
      selectedSeries,
      deckOptionsBySeries,
    ]);

  const usingCustomDeck =
    selectedDeck ===
    CUSTOM_DECK_VALUE;

  const resolvedDeckName =
    usingCustomDeck
      ? customDeckName.trim()
      : selectedDeck.trim();

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const nextUrl =
      URL.createObjectURL(
        selectedFile,
      );

    setPreviewUrl(nextUrl);

    return () =>
      URL.revokeObjectURL(
        nextUrl,
      );
  }, [selectedFile]);

  function handleSeriesChange(
    nextSeries: string,
  ) {
    setSelectedSeries(nextSeries);
    setSelectedDeck("");
    setCustomDeckName("");
    setState({
      type: "idle",
      message: "",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedSeries ||
      !resolvedDeckName
    ) {
      setState({
        type: "error",
        message:
          "请先选择作品系列与牌组。",
      });

      return;
    }

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    /*
     * visible 牌组选单使用 React 控制，
     * 这里把最终牌组名称写入原本 API
     * 使用的 deckName 字段。
     */
    formData.set(
      "deckName",
      resolvedDeckName,
    );

    setState({
      type: "loading",
      message:
        "正在提交，请稍候……",
    });

    try {
      const response = await fetch(
        "/api/submissions",
        {
          method: "POST",
          body: formData,
        },
      );

      const result =
        (await response.json()) as {
          ok?: boolean;
          message?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.message ||
            "投稿失败，请稍后再试。",
        );
      }

      form.reset();
      setSelectedSeries("");
      setSelectedDeck("");
      setCustomDeckName("");
      setSelectedFile(null);

      setState({
        type: "success",
        message:
          result.message ||
          "投稿成功，牌组已经公开显示。",
      });
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "投稿失败，请稍后再试。",
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 shadow-2xl shadow-black/30 sm:p-7"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <input
        type="hidden"
        name="deckName"
        value={resolvedDeckName}
        readOnly
      />

      <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-4 sm:p-5">
        <p className="text-xs font-black tracking-[0.22em] text-red-400">
          DECK SELECTION
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          请先选择作品系列，牌组选单才会显示该作品的相关牌组。
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-zinc-200">
              1. 作品系列 *
            </span>

            <select
              name="series"
              required
              value={selectedSeries}
              onChange={(event) =>
                handleSeriesChange(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-red-500"
            >
              <option
                value=""
                disabled
              >
                请选择作品系列
              </option>

              {sortedSeries.map(
                (series) => (
                  <option
                    key={series}
                    value={series}
                  >
                    {series}
                  </option>
                ),
              )}

              <option value="其他">
                其他／未找到
              </option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-zinc-200">
              2. 对应牌组 *
            </span>

            <select
              required
              value={selectedDeck}
              disabled={
                !selectedSeries
              }
              onChange={(event) => {
                setSelectedDeck(
                  event.target.value,
                );

                if (
                  event.target.value !==
                  CUSTOM_DECK_VALUE
                ) {
                  setCustomDeckName(
                    "",
                  );
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <option
                value=""
                disabled
              >
                {selectedSeries
                  ? "请选择对应牌组"
                  : "请先选择作品系列"}
              </option>

              {availableDecks.map(
                (deckName) => (
                  <option
                    key={deckName}
                    value={deckName}
                  >
                    {deckName}
                  </option>
                ),
              )}

              <option
                value={
                  CUSTOM_DECK_VALUE
                }
              >
                其他／新增牌组
              </option>
            </select>

            {selectedSeries &&
            availableDecks.length ===
              0 ? (
              <p className="text-xs leading-5 text-zinc-600">
                这个作品暂时没有现有牌组选项，请选择“其他／新增牌组”。
              </p>
            ) : null}
          </label>
        </div>

        {usingCustomDeck ? (
          <label className="mt-5 block space-y-2">
            <span className="text-sm font-bold text-zinc-200">
              新牌组名称 *
            </span>

            <input
              type="text"
              required
              value={customDeckName}
              onChange={(event) =>
                setCustomDeckName(
                  event.target.value,
                )
              }
              maxLength={80}
              placeholder="例如：黑色彗星"
              className="w-full rounded-xl border border-red-900/60 bg-black px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-red-500"
            />

            <p className="text-xs leading-5 text-zinc-600">
              成功投稿后，这个牌组会自动成为该作品下的现有牌组选项。
            </p>
          </label>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-bold text-zinc-200">
            投稿者名称 *
          </span>

          <input
            name="submitterName"
            required
            maxLength={50}
            placeholder="公开显示的名称"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-zinc-200">
            联络方式
          </span>

          <input
            name="contact"
            maxLength={120}
            placeholder="Facebook、Discord 或电邮；不会公开"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-zinc-200">
            赛事名称
          </span>

          <input
            name="eventName"
            maxLength={100}
            placeholder="例如：Malaysia S1 GAO"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-zinc-200">
            比赛成绩
          </span>

          <input
            name="result"
            maxLength={80}
            placeholder="例如：冠军、Top 8、4-1"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-red-500"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-zinc-200">
          牌组图片 *
        </span>

        <input
          type="file"
          name="deckImage"
          required
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            setSelectedFile(
              event.target.files?.[0] ??
                null,
            )
          }
          className="block w-full rounded-xl border border-dashed border-white/15 bg-black px-4 py-4 text-xs text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-red-500"
        />

        <p className="text-xs leading-5 text-zinc-600">
          支持 JPG、PNG、WebP，最大 8MB。
        </p>
      </label>

      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black p-3">
          <p className="mb-3 text-xs font-bold text-zinc-500">
            图片预览
          </p>

          <img
            src={previewUrl}
            alt="牌组图片预览"
            className="mx-auto max-h-[460px] w-auto max-w-full rounded-xl object-contain"
          />
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-bold text-zinc-200">
          补充说明
        </span>

        <textarea
          name="notes"
          rows={5}
          maxLength={1500}
          placeholder="卡组思路、比赛环境或关键选择。"
          className="w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-700 focus:border-red-500"
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <input
          type="checkbox"
          name="consent"
          value="yes"
          required
          className="mt-1 h-4 w-4 accent-red-600"
        />

        <span className="text-xs leading-6 text-zinc-400">
          我确认投稿内容会在提交后直接公开，并同意卡零社展示及整理投稿内容；联络方式不会公开。
        </span>
      </label>

      {state.message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.type ===
            "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : state.type ===
                  "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-white/10 bg-white/5 text-zinc-300"
          }`}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          state.type ===
            "loading" ||
          !selectedSeries ||
          !resolvedDeckName
        }
        className="flex min-h-14 w-full items-center justify-center rounded-xl bg-red-600 px-6 text-base font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.type ===
        "loading"
          ? "正在提交……"
          : "提交并公开牌组"}
      </button>
    </form>
  );
}
