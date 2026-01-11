module.exports = {
  apps: [
    {
      name: "conserta-api",
      script: "./dist/src/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      merge_logs: true,
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 60000,
      env: {
        NODE_ENV: "production",
        PORT: 4011,
        API_PREFIX: "/api",
        FIREBASE_STORAGE_BUCKET: "cardapyia-service-2025.appspot.com",
        TRUST_PROXY: "2",
      },
    },
  ],
};
