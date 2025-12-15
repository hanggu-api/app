module.exports = {
  apps: [
    {
      name: 'conserta-api',
      script: 'src/server.ts',
      node_args: '-r ts-node/register/transpile-only',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        API_PREFIX: '/api'
      }
    },
    {
      name: 'conserta-api-dev',
      script: 'src/server.ts',
      node_args: '-r ts-node/register/transpile-only',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'development',
        PORT: 4001,
        API_PREFIX: '/api'
      }
    }
  ]
}