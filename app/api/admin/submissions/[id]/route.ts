import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminSession } from "../../../../../lib/admin-auth";
import {
  createSupabaseAdmin,
  SUBMISSION_BUCKET,
} from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

const updateSchema = z.object({
  status: z.enum([
    "pending",
    "approved",
    "rejected",
  ]),
  adminNote: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .default(""),
});

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      message: "管理员登录已失效。",
    },
    {
      status: 401,
    },
  );
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  if (!(await isAdminSession())) {
    return unauthorized();
  }

  const { id } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "请求格式不正确。",
      },
      {
        status: 400,
      },
    );
  }

  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message:
          parsed.error.issues[0]?.message ||
          "审核资料格式不正确。",
      },
      {
        status: 400,
      },
    );
  }

  const supabase = createSupabaseAdmin();
  const status = parsed.data.status;

  const { data, error } = await supabase
    .from("deck_submissions")
    .update({
      status,
      admin_note:
        parsed.data.adminNote || null,
      published_at:
        status === "approved"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("更新投稿失败：", error);

    return NextResponse.json(
      {
        ok: false,
        message: "更新投稿失败。",
      },
      {
        status: 500,
      },
    );
  }

  revalidatePath("/deck");
  revalidatePath(`/deck/${data.slug}`);
  revalidatePath("/admin/submissions");

  return NextResponse.json({
    ok: true,
  });
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  if (!(await isAdminSession())) {
    return unauthorized();
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdmin();

  const { data, error: readError } =
    await supabase
      .from("deck_submissions")
      .select("image_path, slug")
      .eq("id", id)
      .maybeSingle();

  if (readError || !data) {
    return NextResponse.json(
      {
        ok: false,
        message: "找不到该投稿。",
      },
      {
        status: 404,
      },
    );
  }

  if (data.image_path) {
    const { error: storageError } =
      await supabase.storage
        .from(SUBMISSION_BUCKET)
        .remove([data.image_path]);

    if (storageError) {
      console.error(
        "删除投稿图片失败：",
        storageError,
      );
    }
  }

  const { error: deleteError } =
    await supabase
      .from("deck_submissions")
      .delete()
      .eq("id", id);

  if (deleteError) {
    console.error("删除投稿失败：", deleteError);

    return NextResponse.json(
      {
        ok: false,
        message: "删除投稿失败。",
      },
      {
        status: 500,
      },
    );
  }

  revalidatePath("/deck");
  revalidatePath(`/deck/${data.slug}`);
  revalidatePath("/admin/submissions");

  return NextResponse.json({
    ok: true,
  });
}
