import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  createSupabaseAdmin,
  SUBMISSION_BUCKET,
} from "../../../lib/supabase-admin";
import {
  firstZodError,
  submissionSchema,
} from "../../../lib/submission-validation";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    { status },
  );
}

function createSlug(deckName: string) {
  const readable = deckName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff\u3040-\u30ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  const suffix = randomUUID().slice(0, 8);

  return `${readable || "deck"}-${suffix}`;
}

async function verifyTurnstile(
  token: string,
  remoteIp?: string,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // 本地开发可以暂时不设；正式站建议两个都设定。
  if (!secret && !siteKey) {
    return true;
  }

  if (!secret || !siteKey || !token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return false;
  }

  const result = (await response.json()) as {
    success?: boolean;
  };

  return result.success === true;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("无法读取投稿资料。");
  }

  const parsed = submissionSchema.safeParse({
    authorName: formData.get("authorName"),
    contact: formData.get("contact"),
    deckName: formData.get("deckName"),
    series: formData.get("series"),
    color: formData.get("color"),
    deckType: formData.get("deckType"),
    deckCode: formData.get("deckCode"),
    deckLink: formData.get("deckLink"),
    description: formData.get("description"),
    strategy: formData.get("strategy"),
    consent: formData.get("consent"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    return jsonError(firstZodError(parsed.error));
  }

  const remoteIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const turnstileToken = String(
    formData.get("cf-turnstile-response") || "",
  );

  const turnstileValid = await verifyTurnstile(
    turnstileToken,
    remoteIp,
  );

  if (!turnstileValid) {
    return jsonError(
      "人机验证失败，请重新验证后再投稿。",
      403,
    );
  }

  const image = formData.get("image");

  if (!(image instanceof File) || image.size === 0) {
    return jsonError("请上传牌表截图。");
  }

  const extension = ALLOWED_IMAGE_TYPES.get(image.type);

  if (!extension) {
    return jsonError(
      "图片只支持 JPG、PNG 或 WebP。",
    );
  }

  if (image.size > MAX_IMAGE_SIZE) {
    return jsonError("图片大小不能超过 5MB。");
  }

  const submissionId = randomUUID();
  const imagePath = `submissions/${submissionId}.${extension}`;
  const supabase = createSupabaseAdmin();

  const imageBuffer = Buffer.from(
    await image.arrayBuffer(),
  );

  const { error: uploadError } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .upload(imagePath, imageBuffer, {
      contentType: image.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("投稿图片上传失败：", uploadError);

    return jsonError(
      "图片上传失败，请稍后重试。",
      500,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from(SUBMISSION_BUCKET)
    .getPublicUrl(imagePath);

  const input = parsed.data;

  const { error: insertError } = await supabase
    .from("deck_submissions")
    .insert({
      id: submissionId,
      slug: createSlug(input.deckName),
      author_name: input.authorName,
      contact: input.contact ?? null,
      deck_name: input.deckName,
      series: input.series,
      color: input.color,
      deck_type: input.deckType,
      deck_code: input.deckCode ?? null,
      deck_link: input.deckLink ?? null,
      description: input.description,
      strategy: input.strategy,
      image_url: publicUrl,
      image_path: imagePath,
      status: "pending",
    });

  if (insertError) {
    console.error("投稿写入数据库失败：", insertError);

    await supabase.storage
      .from(SUBMISSION_BUCKET)
      .remove([imagePath]);

    return jsonError(
      "投稿储存失败，请稍后重试。",
      500,
    );
  }

  return NextResponse.json({
    ok: true,
    submissionId,
  });
}
