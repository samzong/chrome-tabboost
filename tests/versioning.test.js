const { parseVersion, assertVersionParity, compareChromeVersions } = require('../scripts/versioning');
const { releaseNotes } = require('../scripts/changelog');

const manifestFor = version => ({ version_name: version, version: parseVersion(version).chromeVersion });

describe('Chrome release identity and update order', () => {
  test.each([
    ['1.2.3-alpha.1', '1.2.3.1'],
    ['1.2.3-alpha.20000', '1.2.3.20000'],
    ['1.2.3-beta.1', '1.2.3.20001'],
    ['1.2.3-beta.20000', '1.2.3.40000'],
    ['1.2.3-rc.1', '1.2.3.40001'],
    ['1.2.3-rc.20000', '1.2.3.60000'],
    ['1.2.3', '1.2.3.65535'],
    ['0.0.0-alpha.1', '0.0.0.1'],
    ['65535.65535.65535', '65535.65535.65535.65535'],
  ])('%s maps to %s', (version, expected) => {
    expect(parseVersion(version).chromeVersion).toBe(expected);
    expect(assertVersionParity({ version }, manifestFor(version), `v${version}`).version).toBe(version);
  });

  test('every stage sorts before the next stage and the final release', () => {
    const versions = ['alpha.1', 'alpha.2', 'alpha.20000', 'beta.1', 'beta.20000', 'rc.1', 'rc.10', 'rc.20000']
      .map(stage => parseVersion(`1.2.3-${stage}`).chromeVersion);
    versions.push(parseVersion('1.2.3').chromeVersion, parseVersion('1.2.4-alpha.1').chromeVersion);
    for (let index = 1; index < versions.length; index += 1) {
      expect(compareChromeVersions(versions[index - 1], versions[index])).toBe(-1);
    }
    expect(compareChromeVersions('1.2.3', '1.2.3.0')).toBe(0);
    expect(compareChromeVersions('1.2.3.65535', '1.2.3.60000')).toBe(1);
  });

  test.each([
    '01.2.0', '1.02.0', '1.2.00', '1.2.3-fix.1', '1.2.3-alpha.0', '1.2.3-rc.01',
    '1.2.3-beta.20001', '1.2.3-alpha.20001', '1.2.3-rc.20001', '1.2.3-rc.9007199254740993',
    '65536.0.0', '0.65536.0', '0.0.65536', '1.2.3+build', 'v1.2.3', '1.2.3\n',
  ])('rejects unsupported release identity %s', version => {
    expect(() => parseVersion(version)).toThrow();
  });

  test.each(['1.2.3.65536', '65536', '1.2.3.01', '0.0.0.0', '1.2.3.4.5', '-1.2', '1.2.3-rc.1'])
  ('rejects invalid Chrome version %s', version => {
    expect(() => compareChromeVersions(version, '1')).toThrow();
  });

  test.each([
    [{ version_name: '1.2.4', version: '1.2.3.65535' }, 'v1.2.3'],
    [{ version_name: '1.2.3', version: '1.2.3' }, 'v1.2.3'],
    [{ version_name: '1.2.3', version: '1.2.3.65535' }, 'v01.2.3'],
    [{ version_name: '1.2.3', version: '1.2.3.65535' }, 'v1.2.3-fix.1'],
    [{ version_name: '1.2.3', version: '1.2.3.65535' }, 'v1.2.4'],
  ])('rejects mismatched release metadata', (manifest, tag) => {
    expect(() => assertVersionParity({ version: '1.2.3' }, manifest, tag)).toThrow();
  });
});

describe('tracked release notes', () => {
  test('uses only the requested changelog entry', () => {
    const changelog = '## [1.2.3] (2026-11-25)\n\n### Fixes\n\n* Fix tab preview.\n\n## [1.2.2] (2026-11-24)\n\n* Old fix.\n';
    expect(releaseNotes(changelog, '1.2.3')).toBe('### Fixes\n\n* Fix tab preview.\n');
  });
  test.each(['', '## [1.2.3] (2026-11-25)\n\n### Fixes\n'])('rejects missing or empty release notes', changelog => {
    expect(() => releaseNotes(changelog, '1.2.3')).toThrow();
  });
});
