require('dotenv').config()
const { execSync } = require('child_process')
execSync('node_modules/.bin/electron-builder --mac dmg', {
  stdio: 'inherit',
  env: process.env,
})
