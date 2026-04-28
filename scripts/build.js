require('dotenv').config()
const { execSync } = require('child_process')
const extraArgs = process.argv.slice(2).join(' ')
execSync(`node_modules/.bin/electron-builder --mac dmg ${extraArgs}`, {
  stdio: 'inherit',
  env: process.env,
})
