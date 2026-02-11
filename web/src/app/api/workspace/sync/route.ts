import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWorkspaceDir } from "@/lib/workspace";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import archiver from "archiver";
import extract from "extract-zip";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

/**
 * Workspace Sync API
 *
 * GET  /api/workspace/sync - Download current user's workspace as zip
 * POST /api/workspace/sync - Upload workspace zip (replace/extract)
 */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const wsDir = getUserWorkspaceDir(session.user.id);
    if (!existsSync(wsDir)) {
      return NextResponse.json(
        { error: "工作区不存在，请先完成初始化" },
        { status: 404 }
      );
    }

    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    archive.on("data", (chunk) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
      archive.directory(wsDir, false);
      archive.finalize();
    });

    const body = Buffer.concat(chunks);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="workspace-${session.user.id}.zip"`,
      },
    });
  } catch (err) {
    console.error("[Workspace Sync] GET Error:", err);
    return NextResponse.json(
      { error: "下载工作区失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "请上传 zip 文件" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "请上传 .zip 格式的工作区文件" },
        { status: 400 }
      );
    }

    const wsDir = getUserWorkspaceDir(session.user.id);
    mkdirSync(wsDir, { recursive: true });

    const tmpDir = mkdtempSync(join(tmpdir(), "creator-sync-"));
    const zipPath = join(tmpDir, "upload.zip");

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(zipPath, buffer);
      await extract(zipPath, { dir: wsDir });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true, message: "工作区已同步" });
  } catch (err) {
    console.error("[Workspace Sync] POST Error:", err);
    return NextResponse.json(
      { error: "上传工作区失败" },
      { status: 500 }
    );
  }
}
