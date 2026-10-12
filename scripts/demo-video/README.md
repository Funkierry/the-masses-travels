# 演示视频录制

逐帧录制网站演示（虚拟时钟 + 脚本化指针 + DevTools 截图），用 Chrome 的 WebCodecs 编码 H.264 / AAC，自写 MP4 封装。

1. `npm run build`
2. `node scripts/demo-video/serve.mjs`（在 127.0.0.1:8642 提供 dist/）
3. 另开终端：`node scripts/demo-video/record.mjs preview` 先出 960×540 预览；确认后 `node scripts/demo-video/record.mjs 4k`

需要本机安装 Google Chrome。4K 60 帧约 90 分钟，输出到项目根目录 `众生行记-演示-4K60.mp4`。分镜在 `record.mjs` 中，章节卡与标注样式在 `demo.js`。
