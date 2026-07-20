import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const BUCKET_NAME = "deck-submissions";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const supportedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function cleanText(
  value: FormDataEntryValue | null,
  maxLength: number,
) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}


function createSlug(deckName: string) {
  const base = deckName
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${base || "deck"}-${crypto.randomBytes(4).toString("hex")}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    if (cleanText(formData.get("website"), 200)) {
      return NextResponse.json(
        { ok: true, message: "投稿成功。" },
        { status: 200 },
      );
    }

    const deckName = cleanText(
      formData.get("deckName"),
      80,
    );
    const series = cleanText(
      formData.get("series"),
      100,
    );
    const submitterName = cleanText(
      formData.get("submitterName"),
      50,
    );
    const contact = cleanText(
      formData.get("contact"),
      120,
    );
    const eventName = cleanText(
      formData.get("eventName"),
      100,
    );
    const result = cleanText(
      formData.get("result"),
      80,
    );
    const notes = cleanText(
      formData.get("notes"),
      1500,
    );

    const color = cleanText(
      formData.get("color"),
      20,
    );

    const deckType = cleanText(
      formData.get("deckType"),
      50,
    );
    const consent = cleanText(
      formData.get("consent"),
      10,
    );
    const image = formData.get("deckImage");

    if (
      !deckName ||
      !series ||
      !submitterName ||
      consent !== "yes"
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "请填写所有必填资料。",
        },
        { status: 400 },
      );
    }

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "请选择牌组图片。",
        },
        { status: 400 },
      );
    }

    const extension = supportedTypes[image.type];

    if (!extension) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "图片格式不受支持，请使用 JPG、PNG 或 WebP。",
        },
        { status: 400 },
      );
    }

    if (image.size <= 0 || image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          message: "图片大小必须小于 8MB。",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const dateFolder = new Date()
      .toISOString()
      .slice(0, 10);
    const objectPath =
      `${dateFolder}/${crypto.randomUUID()}.${extension}`;

    const imageBuffer = Buffer.from(
      await image.arrayBuffer(),
    );

    const uploadResult = await supabase.storage
      .from(BUCKET_NAME)
      .upload(objectPath, imageBuffer, {
        contentType: image.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const imageUrl = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(objectPath).data.publicUrl;

    const now = new Date().toISOString();
    const slug = createSlug(deckName);

    const insertResult = await supabase
      .from("deck_submissions")
      .insert({
        slug,
        deck_name: deckName,
        series,
        color: color || null,
        deck_type: deckType || null,
        author_name: submitterName,
        submitter_name: submitterName,
        contact: contact || null,
        event_name: eventName || null,
        result: result || null,
        description: notes || null,
        notes: notes || null,
        image_path: objectPath,
        image_url: imageUrl,
        status: "approved",
        reviewed_at: now,
        published_at: now,
      })
      .select("id")
      .single();

    if (insertResult.error) {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([objectPath]);
      throw insertResult.error;
    }

    return NextResponse.json({
      ok: true,
      id: insertResult.data.id,
      slug,
      message:
        "投稿成功！牌组已经公开显示在牌组分享区。",
    });
  } catch (error) {
    console.error("牌组投稿失败：", error);

    return NextResponse.json(
      {
        ok: false,
        message: "投稿暂时失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
