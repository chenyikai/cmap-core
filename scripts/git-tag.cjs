const { execSync } = require('child_process')
const { version } = require('../package.json')

const tag = `v${version}`

try {
  execSync(`git tag ${tag}`, { stdio: 'inherit' })
  execSync('git push --tags', { stdio: 'inherit' })
  console.log(`Tagged ${tag} and pushed.`)
} catch (e) {
  console.error(`git tag failed: ${e.message}`)
  process.exit(1)
}
