---
name: content-adapt
description: "将原始内容适配为各平台特定的格式、字数和风格"
user-invocable: false
metadata: {"openclaw":{"always":true}}
---

# 平台内容适配

## 用途
将 AI 工具生成的原始内容改写/调整为各发布平台要求的格式。
由 content-pipeline 或发布流程调用，通常不直接被用户调用。

## 输入
- `content`: 原始内容文本
- `content_type`: 内容类型 (text | video_script)
- `target_platforms`: 目标平台列表 (如 ["weixin-mp", "xiaohongshu"])

## 适配逻辑

### 读取平台限制
从 `workspace/config/platforms.yaml` 中读取各平台的 limits 配置。

### 各平台适配规则

#### 微信公众号 (weixin-mp)
- 保留完整长文
- 标题 ≤ 64 字，要正式但有吸引力
- 正文 ≤ 20000 字
- 添加引导关注的结尾
- 建议配图位置
- 格式：Markdown → 富文本

#### 小红书 (xiaohongshu)
- 精简为 ≤ 1000 字
- 标题 ≤ 20 字，口语化、有网感
- 分段短小，多用 emoji
- 生成 5-10 个相关标签 (#话题#)
- 风格：轻松、种草、分享型

#### B站 (bilibili)
- 视频描述 ≤ 2000 字
- 标题 ≤ 80 字，信息量大
- 生成 3-12 个标签
- 添加投币/关注引导

#### 抖音 (douyin)
- 视频描述 ≤ 4000 字
- 标题 ≤ 55 字
- 生成 3-5 个热门标签
- 风格：短平快，抓眼球

#### YouTube
- 描述 ≤ 5000 字
- 标题 ≤ 100 字，英文或中英双语
- 生成关键词标签
- 添加 timestamps（如果有章节）
- 添加 subscribe 引导

#### 微信视频号 (weixin-channels)
- 描述 ≤ 1000 字
- 标题 ≤ 30 字
- 简洁直接

### 使用 LLM Task 进行适配
对每个目标平台，使用 Qwen（通过 llm_task）执行适配：

```
请将以下内容适配为 <平台名> 的发布格式：

平台要求：
- 标题字数限制：<title_max>
- 正文字数限制：<content_max>
- 标签数量限制：<tags_max>
- 风格要求：<风格描述>

原始内容：
<content>

请输出：
1. 标题
2. 正文（适配后）
3. 标签列表
4. 封面图建议（如适用）
```

## 输出
保存到 `workspace/content/adapted/YYYY-MM-DD-<platform>-<slug>.md`：

```markdown
# <平台名> 适配版本

## 元数据
- 来源: <原始草稿路径>
- 平台: <平台名>
- 适配时间: <时间戳>

## 标题
<标题>

## 正文
<适配后的正文>

## 标签
<标签1>, <标签2>, ...

## 封面建议
<封面图描述>
```
