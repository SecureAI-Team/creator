import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

function getMediaTypeFromMime(mimeType: string): "IMAGE" | "VIDEO" | "AUDIO" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "IMAGE"; // fallback for unknown
}

/**
 * POST /api/media/upload
 * Upload a media file. Accepts multipart/form-data with file, optional folder, optional tags (comma-separated).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "file is required" },
      { status: 400 }
    );
  }

  const folder = (formData.get("folder") as string)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string)?.trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const mimeType = file.type || "application/octet-stream";
  const mediaType = getMediaTypeFromMime(mimeType);
  const originalFilename = path.basename(file.name || "unnamed");
  const uuid = randomUUID();
  const relativeUrl = `/uploads/${userId}/${uuid}-${originalFilename}`;

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    userId
  );
  const filePath = path.join(uploadDir, `${uuid}-${originalFilename}`);

  try {
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
  } catch (err) {
    console.error("[media/upload] Write error:", err);
    return NextResponse.json(
      { error: "Failed to save file" },
      { status: 500 }
    );
  }

  try {
    const mediaItem = await prisma.mediaItem.create({
      data: {
        userId,
        filename: originalFilename,
        url: relativeUrl,
        type: mediaType,
        size: file.size,
        tags,
        folder,
      },
    });

    return NextResponse.json(mediaItem, { status: 201 });
  } catch (err) {
    console.error("[media/upload] DB error:", err);
    return NextResponse.json(
      { error: "Failed to create media record" },
      { status: 500 }
    );
  }
}
