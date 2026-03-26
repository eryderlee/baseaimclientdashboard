module.exports = {
  apps: [
    {
      name: 'baseaim-dashboard',
      script: '/var/www/dashboard/start.sh',
      cwd: '/var/www/dashboard',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/baseaim-error.log',
      out_file: '/var/log/pm2/baseaim-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
