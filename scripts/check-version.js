const fs = require('fs');
const { assertVersionParity } = require('./versioning');

try {
  const pkg = require('../package.json');
  const manifest = require('../manifest.json');
  const tag = process.argv[2];
  const parsed = assertVersionParity(pkg, manifest, tag);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      `version=${parsed.version}\nis_prerelease=${Boolean(parsed.stage)}\n`);
  }
  console.log(`Version parity passed: ${pkg.version} -> ${parsed.chromeVersion}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
