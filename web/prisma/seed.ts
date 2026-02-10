// =============================================================================
// 创作助手 SaaS - 数据库种子脚本
// 创建默认管理员和演示用户
// =============================================================================
// 运行: npx tsx prisma/seed.ts
// 或在 Docker 中: docker compose exec web npx tsx prisma/seed.ts
// =============================================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始创建种子数据...\n");

  // ---------- 管理员账户 ----------
  const adminEmail = process.env.ADMIN_EMAIL || "admin@creator.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      password: adminHash,
    },
    create: {
      email: adminEmail,
      name: "系统管理员",
      password: adminHash,
      role: "ADMIN",
      onboarded: true,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ 管理员账户已创建/更新:`);
  console.log(`   邮箱: ${adminEmail}`);
  console.log(`   密码: ${adminPassword}`);
  console.log(`   角色: ADMIN`);
  console.log(`   ID:   ${admin.id}\n`);

  // ---------- 演示用户 ----------
  const demoEmail = process.env.DEMO_EMAIL || "demo@creator.local";
  const demoPassword = process.env.DEMO_PASSWORD || "demo123456";
  const demoHash = await bcrypt.hash(demoPassword, 12);

  const demo = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      password: demoHash,
    },
    create: {
      email: demoEmail,
      name: "演示用户",
      password: demoHash,
      role: "USER",
      onboarded: true,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ 演示用户已创建/更新:`);
  console.log(`   邮箱: ${demoEmail}`);
  console.log(`   密码: ${demoPassword}`);
  console.log(`   角色: USER`);
  console.log(`   ID:   ${demo.id}\n`);

  // ---------- 演示用户偏好 ----------
  await prisma.userPreferences.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      timezone: "Asia/Shanghai",
      language: "zh-CN",
      notificationLevel: "important",
      defaultStyle: "专业严谨",
      defaultAudience: "技术开发者",
      defaultWordCount: 1500,
      defaultVideoDuration: 300,
      confirmBeforePublish: true,
    },
  });

  console.log(`✅ 演示用户偏好已设置\n`);

  // ---------- 演示用户平台连接（示例） ----------
  const demoPlatforms = ["bilibili", "douyin", "xiaohongshu"];
  for (const platform of demoPlatforms) {
    await prisma.platformConnection.upsert({
      where: {
        userId_platformKey: { userId: demo.id, platformKey: platform },
      },
      update: {},
      create: {
        userId: demo.id,
        platformKey: platform,
        status: "DISCONNECTED",
      },
    });
  }

  console.log(
    `✅ 演示平台连接已创建 (${demoPlatforms.join(", ")}) - 状态: DISCONNECTED\n`
  );

  // ---------- 演示内容 ----------
  const existingContent = await prisma.contentItem.count({
    where: { userId: demo.id },
  });

  if (existingContent === 0) {
    await prisma.contentItem.createMany({
      data: [
        {
          userId: demo.id,
          title: "【教程】5 分钟学会用 AI 写爆款标题",
          contentType: "TEXT",
          status: "PUBLISHED",
          body: "这是一篇关于如何使用 AI 工具生成吸引眼球标题的教程...",
          tags: ["AI", "教程", "标题"],
          platforms: ["bilibili", "xiaohongshu"],
        },
        {
          userId: demo.id,
          title: "2026 年自媒体人必备的 10 个 AI 工具",
          contentType: "VIDEO",
          status: "DRAFT",
          body: "视频脚本草稿：开场 → 10 个工具逐一介绍 → 总结推荐",
          tags: ["AI", "工具推荐", "自媒体"],
          platforms: ["bilibili", "douyin"],
        },
        {
          userId: demo.id,
          title: "小红书运营心得：如何 30 天涨粉 1 万",
          contentType: "TEXT",
          status: "REVIEWING",
          body: "分享我在小红书上的运营经验和涨粉技巧...",
          tags: ["小红书", "运营", "涨粉"],
          platforms: ["xiaohongshu"],
        },
      ],
    });

    console.log(`✅ 演示内容已创建 (3 篇)\n`);
  } else {
    console.log(`⏭️  演示内容已存在，跳过\n`);
  }

  console.log("──────────────────────────────────────");
  console.log("🎉 种子数据创建完成！");
  console.log("──────────────────────────────────────");
  console.log(`\n管理员登录: ${adminEmail} / ${adminPassword}`);
  console.log(`演示登录:   ${demoEmail} / ${demoPassword}`);
  console.log("──────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ 种子数据创建失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
