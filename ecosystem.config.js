module.exports = {
  apps: [{
    name: 'njadwal',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/njadwal',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production', PORT: 3000 },
  }],
}
