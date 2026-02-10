// =============================================================================
// PM2 生态系统配置 — OpenClaw Gateway
// =============================================================================
// 如果你更喜欢 PM2 而不是 systemd，使用此配置：
//   npm install -g pm2
//   cd ~/creator
//   pm2 start scripts/ecosystem.config.js
//   pm2 save
//   pm2 startup            # 开机自启
//
// 常用命令：
//   pm2 status             # 查看状态
//   pm2 restart openclaw   # 重启
//   pm2 logs openclaw      # 查看日志
//   pm2 monit              # 实时监控
// =============================================================================

module.exports = {
  apps: [
    {
      name: "openclaw",
      script: "openclaw",
      args: "start",
      cwd: "/home/<YOUR_USER>/creator",  // 替换为你的项目路径

      // 环境变量（也可通过 ~/.env.creator 加载）
      env: {
        NODE_ENV: "production",
      },

      // 自动重启
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,           // 重启间隔 5 秒
      exp_backoff_restart_delay: 100, // 指数退避

      // 内存限制（超过则自动重启）
      max_memory_restart: "4G",

      // 日志
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/<YOUR_USER>/creator/logs/openclaw-error.log",
      out_file: "/home/<YOUR_USER>/creator/logs/openclaw-out.log",
      merge_logs: true,
      log_type: "json",

      // 监控文件变化自动重启（开发时有用，生产可关闭）
      watch: false,
      ignore_watch: [
        "node_modules",
        "logs",
        "workspace/content",
        "workspace/data",
        "workspace/auth",
      ],
    },
  ],
};
