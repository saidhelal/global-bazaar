/**
 * PM2 process definition for the API server on EC2.
 *
 * Usage on the host (from the repository root):
 *   pm2 start ecosystem.config.cjs      # first launch
 *   pm2 reload ecosystem.config.cjs     # zero-downtime redeploy
 *   pm2 save && pm2 startup             # survive reboots
 *
 * The web artifact is static — it is served by Nginx from
 * artifacts/orbit-market/dist/public and is not a PM2 process.
 */
module.exports = {
  apps: [
    {
      name: "global-bazaar-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: __dirname,

      // Environment comes from the host's .env (never committed). The flag is
      // "if-exists" so a host using real environment variables still boots.
      node_args: "--enable-source-maps --env-file-if-exists=.env",

      // Stateless JWT auth means the process can be scaled horizontally.
      // Start at 1; raise PM2_INSTANCES (e.g. "max") once the instance is
      // sized for it, and switch exec_mode to "cluster" at the same time.
      instances: Number(process.env.PM2_INSTANCES || 1),
      exec_mode: "fork",

      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "512M",

      // Must exceed the 10s forced-exit timer in src/index.ts so PM2 lets the
      // graceful shutdown finish instead of SIGKILLing in-flight requests.
      kill_timeout: 12000,

      env: {
        NODE_ENV: "production",
      },

      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
