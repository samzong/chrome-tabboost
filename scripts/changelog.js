const fs = require('fs');
const { execFileSync } = require('child_process');
const { parseVersion } = require('./versioning');

function releaseNotes(changelog, version) {
  parseVersion(version);
  const heading = `## [${version}]`;
  const lines = changelog.split('\n');
  const start = lines.findIndex(line => line.startsWith(`${heading} (`));
  if (start === -1) throw new Error(`Missing changelog entry for ${version}`);
  let end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  if (end === -1) end = lines.length;
  const notes = lines.slice(start + 1, end).join('\n').trim();
  if (!/^\* \S/m.test(notes)) throw new Error(`Empty changelog entry for ${version}`);
  return notes + '\n';
}

if (require.main === module) {
  try {
    const version = require('../package.json').version;
    parseVersion(version);
    if (process.argv[2] === 'notes') {
      process.stdout.write(releaseNotes(fs.readFileSync('CHANGELOG.md', 'utf8'), version));
    } else {
      const entry = execFileSync('git-cliff', ['--config', 'cliff.toml', '--unreleased', '--tag-pattern', '^v(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$', '--tag', `v${version}`], { encoding: 'utf8' });
      releaseNotes(entry, version);
      const previous = fs.readFileSync('CHANGELOG.md', 'utf8');
      if (previous.startsWith(`## [${version}] (`)) throw new Error(`Changelog entry already exists for ${version}`);
      fs.writeFileSync('CHANGELOG.md', entry.trim() + '\n\n' + previous);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { releaseNotes };
