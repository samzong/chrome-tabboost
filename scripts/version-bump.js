const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { execFileSync } = require('child_process');
const { parseVersion } = require('./versioning');

try {
  const [type, stage = 'alpha'] = process.argv.slice(2);
  const types = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];
  if (!types.includes(type) || !['alpha', 'beta', 'rc'].includes(stage)) {
    throw new Error('Use patch, minor, major, prepatch, preminor, premajor, or prerelease, followed by alpha, beta, or rc');
  }
  const root = path.join(__dirname, '..');
  const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const pkg = read('package.json');
  parseVersion(pkg.version);
  const version = semver.inc(pkg.version, type, stage, '1');
  const parsed = parseVersion(version);
  if (!semver.gt(version, pkg.version)) {
    throw new Error(`New version ${version} must sort above ${pkg.version}`);
  }
  const manifest = read('manifest.json');
  const lock = read('package-lock.json');
  pkg.version = version;
  manifest.version_name = version;
  manifest.version = parsed.chromeVersion;
  lock.version = version;
  lock.packages[''].version = version;
  for (const [name, data] of Object.entries({ 'package.json': pkg, 'manifest.json': manifest, 'package-lock.json': lock })) {
    fs.writeFileSync(path.join(root, name), JSON.stringify(data, null, 2) + '\n');
  }
  execFileSync('npm', ['run', 'changelog'], { cwd: root, stdio: 'inherit' });
  console.log(`Prepared v${version}. Review and commit the release files before creating the tag.`);
} catch (error) {
  console.error(`Version update failed: ${error.message}`);
  process.exitCode = 1;
}
