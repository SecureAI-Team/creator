---
name: tool-tongyi-wanxiang
description: "通过 Browser RPA 操作通义万相进行图片生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 通义万相 RPA Skill

## 概述
通过浏览器自动化操作通义万相 (https://tongyi.aliyun.com/wanxiang/)，完成图片生成任务。
阿里出品，中文理解能力强，有免费额度，适合国内创作者。

## 前置条件
- Browser Profile `tongyi-wanxiang` 已创建且已登录（阿里云账号）
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 图片描述（中文友好）
- `style`: 风格（写实、插画、3D、水彩、油画等）
- `size`: 尺寸（1:1, 16:9, 9:16, 3:4 等）
- `count`: 生成数量（1-4）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=tongyi-wanxiang`，导航到 `https://tongyi.aliyun.com/wanxiang/`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "登录" 文本。
未登录 → 中断，通知 `/login tongyi-wanxiang`。

### 3. 选择生成模式
选择「文生图」模式。

### 4. 填入提示词
在提示词输入区域填入描述文本。

### 5. 设置参数
- 选择风格（写实照片/插画/3D/水彩等）
- 选择尺寸（根据目标平台封面要求）
- 设置生成数量

### 6. 发起生成
点击「生成」按钮。

### 7. 等待生成完成
轮询策略：
- 每 8 秒执行一次 `browser snapshot`
- 完成标志：图片结果出现在页面中
- 超时：90 秒
- **进度反馈**：每 20 秒通知进度

### 8. 选择并下载
- 从生成结果中选择最佳图片
- 点击下载按钮
- 保存到 `workspace/content/media/images/`

### 9. 返回结果
返回生成的图片路径。

## 优势
- 中文理解能力好，描述直观
- 有每日免费额度（新用户 20 次）
- 与阿里云生态集成

## 异常处理
- 未登录 → 中断，提示 /login tongyi-wanxiang
- 额度不足 → 通知创作者
- 生成失败 → 重试一次
- 内容审核 → 通知创作者修改描述
