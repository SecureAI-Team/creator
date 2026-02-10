---
name: publish-weixin-channels
description: "通过 Browser RPA 将视频发布到微信视频号"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 微信视频号发布 RPA Skill

## 概述
通过浏览器自动化操作视频号助手平台 (https://channels.weixin.qq.com/platform)，完成视频发布。

## 前置条件
- Browser Profile `weixin-channels` 已创建且已登录
- 已有适配后的内容和视频文件

## 输入
- `title`: 标题（≤30 字）
- `description`: 视频描述（≤1000 字）
- `video_path`: 视频文件路径

## RPA 操作步骤

### 1. Preflight 检查
profile=weixin-channels，导航到视频号助手，检查登录态。
未登录 → 中断，提示 /login weixin-channels。

### 2. 进入发表页面
找到「发表动态」或「上传视频」入口。

### 3. 上传视频
上传视频文件，等待处理完成。

### 4. 填写标题和描述
- 填入标题（≤30 字）
- 填入描述

### 5. 预览确认
截图 → 发送给创作者确认。

### 6. 发布
创作者确认后发布。

### 7. 验证 + 记录
检查结果，截图，写入发布日志。

## 异常处理
- 需要扫码验证 → 通知创作者
- 视频处理失败 → 截图通知
