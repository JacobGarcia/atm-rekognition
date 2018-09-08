module.exports = {
  apps: [
    {
      name: 'atm-rekognition',
      script: './server.js',
      ignore_watch: ['src', 'node_modules', 'dist'],
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
