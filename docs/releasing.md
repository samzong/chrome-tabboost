# Releases

TabBoost uses the L1 release tier. `package.json` is the version source.
Tags use `vX.Y.Z` or `vX.Y.Z-(alpha|beta|rc).N`, without leading zeros.
`manifest.json` stores the exact SemVer string in `version_name`.

Chrome compares up to four integers, with missing integers equal to zero.
Each integer must be between 0 and 65535. See the [Chrome version rules](https://developer.chrome.com/docs/extensions/reference/manifest/version).
TabBoost always writes four integers as `X.Y.Z.BUILD`:

| Release stage | BUILD | Sequence bounds |
| --- | --- | --- |
| alpha.N | N | 1 through 20000 |
| beta.N | 20000 + N | 1 through 20000 |
| rc.N | 40000 + N | 1 through 20000 |
| Final | 65535 | No sequence |

The first three integers also have a maximum of 65535.
The scripts reject overflow before writing files.
If a stage needs more than 20000 candidates, choose a new target version before preparing another candidate.
The final version sorts above every candidate for the same target version.
Historical tags retain their original files and versions.

## Prepare a release

1. Run `npm ci`.
2. Choose one preparation path:
   - Final: run `npm run version:patch`, `version:minor`, or `version:major`.
   - Candidate: run `node scripts/version-bump.js prepatch rc`, or use `preminor`, `premajor`, or `prerelease` with a stage.
3. Run `npm run version:check`, `npm test`, and `npm run validate`.
4. Run `npm run zip`. With a signing key in `key.pem`, run `npm run package`.
5. Review the version files and the new `CHANGELOG.md` entry. Run `npm run release:notes` to read the release body.
6. Commit the release files through the delivery workflow.
7. After separate publication authorization, create and push the matching release tag.

The version script prepares files. It does not commit, create tags, or push.
It updates `package-lock.json` and both manifest version fields from `package.json`.
It uses the pinned `git-cliff` dependency and `cliff.toml` to prepend the new changelog entry.
Each entry includes changes since the previous final release, so unchanged candidates can advance through stages and promote to final.
Release notes use that tracked entry and fail if the entry is absent or empty.
Do not use `npm version`, which does not update the Chrome mapping.

The release workflow accepts a pushed tag or an existing tag through its manual input.
Its first gate compares the tag, package version, manifest version name, and mapped Chrome version before dependencies, tests, or builds.
The workflow also requires the checkout to match the tag commit.
It attaches the CRX and ZIP from `builds/` to the GitHub Release.
Candidates use `--prerelease --latest=false`.
A retry does not replace an existing release.

Chrome Web Store publication is separate from GitHub Release publication.
For a candidate, `npm run publish:test` requires the trusted-testers target and skips the public publication prompt.
No publication command belongs to the alignment verification procedure.
