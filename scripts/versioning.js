const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(alpha|beta|rc)\.([1-9][0-9]*))?$/;
const STAGE_OFFSETS = { alpha: 0, beta: 20000, rc: 40000 };

function parseVersion(version) {
  const match = typeof version === 'string' && VERSION_PATTERN.exec(version);
  if (!match || match[0] !== version) {
    throw new Error(`Invalid release version: ${version}`);
  }
  const core = match.slice(1, 4).map(Number);
  if (core.some(part => part > 65535)) {
    throw new Error('Chrome version components must be between 0 and 65535');
  }
  const stage = match[4];
  const sequence = Number(match[5]);
  if (stage && (!Number.isSafeInteger(sequence) || sequence > 20000)) {
    throw new Error('Prerelease sequence must be between 1 and 20000');
  }
  return {
    version,
    stage,
    chromeVersion: [...core, stage ? STAGE_OFFSETS[stage] + sequence : 65535].join('.'),
  };
}

function assertVersionParity(pkg, manifest, tag) {
  const parsed = parseVersion(pkg.version);
  if (tag !== undefined && tag !== `v${parsed.version}`) {
    throw new Error(`Release tag ${tag} does not match package.json version ${pkg.version}`);
  }
  if (manifest.version_name !== parsed.version || manifest.version !== parsed.chromeVersion) {
    throw new Error(`Manifest must use version_name ${parsed.version} and version ${parsed.chromeVersion}`);
  }
  return parsed;
}

function compareChromeVersions(left, right) {
  const parse = value => {
    if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*)){0,3}$/.test(value) || value.endsWith('\n')) {
      throw new Error(`Invalid Chrome version: ${value}`);
    }
    const parts = value.split('.').map(Number);
    if (parts.some(part => part > 65535) || parts.every(part => part === 0)) {
      throw new Error(`Invalid Chrome version: ${value}`);
    }
    return Array.from({ length: 4 }, (_, index) => parts[index] || 0);
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 4; index += 1) {
    if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  }
  return 0;
}

module.exports = { parseVersion, assertVersionParity, compareChromeVersions };
