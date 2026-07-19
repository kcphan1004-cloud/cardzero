"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Card } from "../data/card-series-generated";
import { useAuth } from "./AuthProvider";

type DeckOptionMap = Record<
  string,
  string[]
>;

type Props = {
  seriesOptions: string[];
  deckOptionsBySeries: DeckOptionMap;
  cardsBySeries: Record<
    string,
    Card[]
  >;
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

const CUSTOM_SERIES_VALUE =
  "__custom_series__";

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase(
      "zh-Hans-CN",
    );
}

const MUSHOKU_SERIES =
  "无职转生";

const mushokuFeaturedDecks = [
  "洛琪希",
  "鲁迪乌斯",
  "艾莉丝",
  "希露菲",
  "保罗",
];

function normalizeImagePath(
  imagePath: string,
) {
  let value = String(
    imagePath ?? "",
  )
    .trim()
    .replace(/\\/g, "/");

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (
    value.startsWith("public/")
  ) {
    value = value.slice(
      "public".length,
    );
  }

  if (!value.startsWith("/")) {
    value = `/${value}`;
  }

  return value;
}

function getRepresentativeCard(
  cards: Card[],
  deckName: string,
) {
  const normalizedDeckName =
    normalize(deckName);

  const candidates = cards.filter(
    (card) => {
      const names = [
        card.nameZh,
        card.name,
      ]
        .map(normalize)
        .filter(Boolean);

      return names.some(
        (name) =>
          name ===
            normalizedDeckName ||
          name.includes(
            normalizedDeckName,
          ) ||
          normalizedDeckName.includes(
            name,
          ),
      );
    },
  );

  const rarityRank: Record<
    string,
    number
  > = {
    SR: 7,
    R: 6,
    U: 5,
    C: 4,
    AP: 3,
    L: 2,
  };

  return [...candidates].sort(
    (a, b) =>
      (rarityRank[b.rarity] ?? 0) -
        (rarityRank[a.rarity] ?? 0) ||
      String(a.number).localeCompare(
        String(b.number),
        undefined,
        {
          numeric: true,
        },
      ),
  )[0];
}

function buildMushokuImageOptions(
  cards: Card[],
) {
  return mushokuFeaturedDecks
    .map((deckName) => {
      const card =
        getRepresentativeCard(
          cards,
          deckName,
        );

      if (!card) {
        return null;
      }

      return {
        deckName,
        card,
        image:
          normalizeImagePath(
            card.image,
          ),
      };
    })
    .filter(
      (
        value,
      ): value is {
        deckName: string;
        card: Card;
        image: string;
      } => Boolean(value),
    );
}

export default function DeckSubmissionForm({
  seriesOptions,
  deckOptionsBySeries,
  cardsBySeries,
}: Props) {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [state, setState] =
    useState<SubmitState>({
      type: "idle",
      message: "",
    });

  const [
    seriesSearch,
    setSeriesSearch,
  ] = useState("");

  const [
    selectedSeries,
    setSelectedSeries,
  ] = useState("");

  const [
    customSeriesName,
    setCustomSeriesName,
  ] = useState("");

  const [
    deckSearch,
    setDeckSearch,
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
    submitterName,
    setSubmitterName,
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

  /*
   * seriesOptions 已由服务器根据卡牌编号
   * 按新到旧排列，这里保留原有顺序。
   */
  const sortedSeries = useMemo(
    () => [...seriesOptions],
    [seriesOptions],
  );

  const filteredSeries = useMemo(
    () => {
      const keyword =
        normalize(seriesSearch);

      if (!keyword) {
        return sortedSeries;
      }

      return sortedSeries.filter(
        (series) =>
          normalize(series).includes(
            keyword,
          ),
      );
    },
    [seriesSearch, sortedSeries],
  );

  const usingCustomSeries =
    selectedSeries ===
    CUSTOM_SERIES_VALUE;

  const resolvedSeries =
    usingCustomSeries
      ? customSeriesName.trim()
      : selectedSeries.trim();

  const availableDecks =
    useMemo(() => {
      if (!resolvedSeries) {
        return [];
      }

      return [
        ...new Set(
          (
            deckOptionsBySeries[
              resolvedSeries
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
      resolvedSeries,
      deckOptionsBySeries,
    ]);

  const mushokuImageOptions =
    useMemo(
      () =>
        buildMushokuImageOptions(
          cardsBySeries[
            MUSHOKU_SERIES
          ] ?? [],
        ),
      [cardsBySeries],
    );

  const useMushokuImagePicker =
    resolvedSeries ===
    MUSHOKU_SERIES;

  const filteredDecks = useMemo(
    () => {
      const keyword =
        normalize(deckSearch);

      if (!keyword) {
        return availableDecks;
      }

      return availableDecks.filter(
        (deckName) =>
          normalize(deckName).includes(
            keyword,
          ),
      );
    },
    [availableDecks, deckSearch],
  );

  const usingCustomDeck =
    selectedDeck ===
    CUSTOM_DECK_VALUE;

  const resolvedDeckName =
    usingCustomDeck
      ? customDeckName.trim()
      : selectedDeck.trim();

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const displayName =
      String(
        user.user_metadata
          ?.display_name ?? "",
      ).trim();

    const emailName =
      user.email
        ?.split("@")[0]
        ?.trim() ?? "";

    setSubmitterName(
      (current) =>
        current ||
        displayName ||
        emailName,
    );
  }, [authLoading, user]);

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
    setCustomSeriesName("");
    setDeckSearch("");
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
      !resolvedSeries ||
      !resolvedDeckName ||
      !submitterName.trim()
    ) {
      setState({
        type: "error",
        message:
          "请填写作品系列、牌组与投稿者名称。",
      });

      return;
    }

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    formData.set(
      "series",
      resolvedSeries,
    );

    formData.set(
      "deckName",
      resolvedDeckName,
    );

    formData.set(
      "submitterName",
      submitterName.trim(),
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
      setSeriesSearch("");
      setSelectedSeries("");
      setCustomSeriesName("");
      setDeckSearch("");
      setSelectedDeck("");
      setCustomDeckName("");
      setSelectedFile(null);

      /*
       * 登录玩家投稿成功后保留玩家名称，
       * 方便连续投稿；访客则清空。
       */
      if (!user) {
        setSubmitterName("");
      }

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

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-red-500";

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
        name="series"
        value={resolvedSeries}
        readOnly
      />

      <input
        type="hidden"
        name="deckName"
        value={resolvedDeckName}
        readOnly
      />

      <section className="rounded-2xl border border-red-900/40 bg-red-950/10 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-red-400">
              DECK SELECTION
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              系列来自卡牌资料库；可先搜索，再从清单选择。
            </p>
          </div>

          <span className="text-xs font-bold text-zinc-600">
            共 {sortedSeries.length} 个系列 · 新到旧
          </span>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-zinc-200">
                搜索作品系列
              </span>

              <input
                type="search"
                value={seriesSearch}
                onChange={(event) =>
                  setSeriesSearch(
                    event.target.value,
                  )
                }
                placeholder="输入作品名称，例如：无职转生"
                className={inputClass}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-zinc-200">
                1. 作品系列 *
              </span>

              <select
                required
                value={selectedSeries}
                onChange={(event) =>
                  handleSeriesChange(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option
                  value=""
                  disabled
                >
                  请选择作品系列
                </option>

                {filteredSeries.map(
                  (series) => (
                    <option
                      key={series}
                      value={series}
                    >
                      {series}
                    </option>
                  ),
                )}

                <option
                  value={
                    CUSTOM_SERIES_VALUE
                  }
                >
                  其他／新增作品系列
                </option>
              </select>
            </label>

            {seriesSearch &&
            filteredSeries.length ===
              0 ? (
              <p className="text-xs leading-5 text-amber-400">
                没有找到相关系列，可选择「其他／新增作品系列」。
              </p>
            ) : null}

            {usingCustomSeries ? (
              <label className="block space-y-2">
                <span className="text-sm font-bold text-zinc-200">
                  新作品系列名称 *
                </span>

                <input
                  type="text"
                  required
                  value={customSeriesName}
                  onChange={(event) => {
                    setCustomSeriesName(
                      event.target.value,
                    );
                    setSelectedDeck("");
                    setCustomDeckName("");
                  }}
                  maxLength={100}
                  placeholder="请输入完整作品名称"
                  className={inputClass}
                />
              </label>
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-zinc-200">
                搜索牌组
              </span>

              <input
                type="search"
                value={deckSearch}
                disabled={
                  !resolvedSeries ||
                  useMushokuImagePicker
                }
                onChange={(event) =>
                  setDeckSearch(
                    event.target.value,
                  )
                }
                placeholder={
                  useMushokuImagePicker
                    ? "无职转生使用卡图选择"
                    : resolvedSeries
                      ? "输入牌组名称"
                      : "请先选择作品系列"
                }
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-45`}
              />
            </label>

            <div className="space-y-3">
              <span className="block text-sm font-bold text-zinc-200">
                2. 对应牌组 *
              </span>

              {useMushokuImagePicker ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {mushokuImageOptions.map(
                      ({
                        deckName,
                        card,
                        image,
                      }) => {
                        const active =
                          selectedDeck ===
                          deckName;

                        return (
                          <button
                            key={deckName}
                            type="button"
                            onClick={() => {
                              setSelectedDeck(
                                deckName,
                              );
                              setCustomDeckName(
                                "",
                              );
                            }}
                            className={`group overflow-hidden rounded-2xl border text-left transition ${
                              active
                                ? "border-red-500 bg-red-950/25 ring-2 ring-red-500/30"
                                : "border-white/10 bg-black hover:border-red-700"
                            }`}
                          >
                            <div className="relative aspect-[5/7] overflow-hidden bg-zinc-950">
                              {image ? (
                                <Image
                                  src={image}
                                  alt={
                                    card.nameZh ||
                                    card.name
                                  }
                                  fill
                                  sizes="(max-width: 640px) 45vw, 180px"
                                  className="object-contain transition duration-300 group-hover:scale-[1.025]"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-xs text-zinc-600">
                                  暂无卡图
                                </div>
                              )}

                              {active ? (
                                <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-sm font-black text-white shadow-lg">
                                  ✓
                                </span>
                              ) : null}
                            </div>

                            <div className="px-3 py-3">
                              <p className="truncate text-sm font-black text-white">
                                {deckName}
                              </p>

                              <p className="mt-1 truncate text-[10px] text-zinc-600">
                                {card.number}
                              </p>
                            </div>
                          </button>
                        );
                      },
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDeck(
                          CUSTOM_DECK_VALUE,
                        )
                      }
                      className={`flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center transition ${
                        usingCustomDeck
                          ? "border-red-500 bg-red-950/25 text-white"
                          : "border-white/15 bg-black text-zinc-500 hover:border-red-700 hover:text-white"
                      }`}
                    >
                      <span className="text-3xl font-light">
                        ＋
                      </span>

                      <span className="mt-3 text-sm font-black">
                        自定义牌组
                      </span>
                    </button>
                  </div>

                  <input
                    type="hidden"
                    required
                    value={
                      selectedDeck
                    }
                    readOnly
                  />

                  <p className="text-xs leading-5 text-zinc-600">
                    这是无职转生系列的卡图选择示范。点击代表卡图即可选择牌组。
                  </p>
                </>
              ) : (
                <>
                  <select
                    required
                    value={selectedDeck}
                    disabled={!resolvedSeries}
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
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    <option
                      value=""
                      disabled
                    >
                      {resolvedSeries
                        ? "请选择对应牌组"
                        : "请先选择作品系列"}
                    </option>

                    {filteredDecks.map(
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

                  {resolvedSeries &&
                  availableDecks.length ===
                    0 ? (
                    <p className="text-xs leading-5 text-zinc-600">
                      这个作品暂时没有现有牌组选项，请选择「其他／新增牌组」。
                    </p>
                  ) : null}

                  {deckSearch &&
                  filteredDecks.length ===
                    0 &&
                  availableDecks.length >
                    0 ? (
                    <p className="text-xs leading-5 text-amber-400">
                      没有找到相关牌组，可选择「其他／新增牌组」。
                    </p>
                  ) : null}
                </>
              )}
            </div>

            {usingCustomDeck ? (
              <label className="block space-y-2">
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
                  placeholder="例如：洛琪希迷宫"
                  className={inputClass}
                />

                <p className="text-xs leading-5 text-zinc-600">
                  成功投稿后，这个牌组会自动成为该作品下的现有选项。
                </p>
              </label>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="flex items-center justify-between gap-3 text-sm font-bold text-zinc-200">
            <span>投稿者名称 *</span>

            {user ? (
              <span className="text-[11px] font-bold text-emerald-400">
                已连接玩家账号
              </span>
            ) : null}
          </span>

          <input
            name="submitterName"
            required
            value={submitterName}
            onChange={(event) =>
              setSubmitterName(
                event.target.value,
              )
            }
            maxLength={50}
            placeholder="公开显示的名称"
            className={inputClass}
          />

          <p className="text-xs leading-5 text-zinc-600">
            {user
              ? "已自动带入账号玩家名称，你仍可在本次投稿中修改。"
              : "访客也可以投稿，请填写公开显示的名称。"}
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-zinc-200">
            联络方式
          </span>

          <input
            name="contact"
            maxLength={120}
            placeholder="Facebook、Discord 或电邮；不会公开"
            className={inputClass}
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
            className={inputClass}
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
            className={inputClass}
          />
        </label>
      </section>

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

          {/* eslint-disable-next-line @next/next/no-img-element */}
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
          !resolvedSeries ||
          !resolvedDeckName ||
          !submitterName.trim()
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
