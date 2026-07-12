"use client";

import {
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type {
  SubmissionStatus,
} from "../types/submission";

export default function AdminSubmissionActions({
  id,
  initialStatus,
  initialNote,
}: {
  id: string;
  initialStatus: SubmissionStatus;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] =
    useState<SubmissionStatus>(
      initialStatus,
    );
  const [adminNote, setAdminNote] =
    useState(initialNote || "");
  const [working, setWorking] =
    useState(false);
  const [message, setMessage] =
    useState("");

  async function updateSubmission() {
    setWorking(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/submissions/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
            adminNote,
          }),
        },
      );

      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
            "更新失败。",
        );
      }

      setMessage("已储存。");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "更新失败。",
      );
    } finally {
      setWorking(false);
    }
  }

  async function deleteSubmission() {
    const confirmed = window.confirm(
      "确定永久删除这笔投稿和图片吗？此操作无法复原。",
    );

    if (!confirmed) {
      return;
    }

    setWorking(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/submissions/${id}`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
            "删除失败。",
        );
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "删除失败。",
      );
      setWorking(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4">
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as SubmissionStatus,
            )
          }
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-red-600"
        >
          <option value="pending">
            待审核
          </option>
          <option value="approved">
            审核通过
          </option>
          <option value="rejected">
            不通过
          </option>
        </select>

        <textarea
          value={adminNote}
          onChange={(event) =>
            setAdminNote(
              event.target.value,
            )
          }
          maxLength={2000}
          rows={3}
          placeholder="管理员备注（不会公开）"
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-600"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={updateSubmission}
          disabled={working}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
        >
          {working ? "处理中……" : "储存审核结果"}
        </button>

        <button
          type="button"
          onClick={deleteSubmission}
          disabled={working}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-400 transition hover:border-red-700 hover:text-red-400 disabled:opacity-50"
        >
          永久删除
        </button>

        {message && (
          <span className="text-sm text-zinc-400">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
