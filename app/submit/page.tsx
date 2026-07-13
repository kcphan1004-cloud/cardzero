"use client";

type SubmissionFormProps = {
  seriesOptions: string[];
};

export default function SubmissionForm({
  seriesOptions,
}: SubmissionFormProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white">
      <h2 className="text-xl font-black">
        投稿表单测试
      </h2>

      <p className="mt-3 text-zinc-400">
        已读取 {seriesOptions.length} 个作品系列
      </p>
    </section>
  );
}