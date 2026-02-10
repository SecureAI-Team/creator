# NotebookLM 操作模板：视频概览

## 用途
将 ChatGPT 生成的视频脚本/文本通过 NotebookLM Studio 的视频概览功能转为视频。

## RPA 操作要点

1. 打开 NotebookLM Studio
2. 创建新 notebook 或打开已有 notebook
3. 将文本内容粘贴为 source
4. 进入 Studio 面板
5. 选择「视频概览」(Video Overview) 功能
6. 等待生成完成
7. 下载生成的视频文件

## 注意事项
- 视频生成可能需要数分钟，使用异步轮询策略
- 生成完成的标志：出现「Download」按钮或视频预览播放器
- 如果文本过长，可能需要分段处理
