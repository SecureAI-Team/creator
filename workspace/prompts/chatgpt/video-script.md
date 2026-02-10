# ChatGPT 提示词模板：视频脚本

## 用途
用于通过 ChatGPT Deep Thinking 生成视频脚本，后续可输入 NotebookLM 等工具生成视频。

## 模板

```
请你作为一位资深的视频内容创作者，帮我写一份关于「{topic}」的视频脚本。

要求：
- 时长：{duration} 分钟
- 风格：{style}
- 结构：
  1. 开场钩子（前 15 秒抓住注意力）
  2. 问题/背景引入
  3. 核心内容（3-5 个关键点）
  4. 总结与行动号召
- 语言要口语化，适合朗读/配音
- 每个段落标注预估时长

{additional_requirements}
```

## 变量说明
- `{topic}`: 视频主题
- `{duration}`: 目标时长分钟数（默认 5）
- `{style}`: 风格（默认 "轻松专业"）
- `{additional_requirements}`: 额外要求
