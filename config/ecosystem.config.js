module.exports = {
  apps: [
    {
      name: 'atm-rekognition',
      script: './server.js',
      watch: ['src', 'router','server'],
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
