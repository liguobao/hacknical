module.exports = {
  apps: [{
    name: 'hacknical',
    script: 'dist/bin/app.js',
    env: {
      NODE_ENV: 'production'
    },
    merge_logs: true,
    out_file: '/var/log/ecmadao/hacknical/forever_log',
    error_file: '/var/log/ecmadao/hacknical/error_log',
    kill_timeout: 5000
  }]
}
