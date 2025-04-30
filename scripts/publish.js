const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const semver = require('semver');
require('dotenv').config();

const {
  EXTENSION_ID,
  CLIENT_ID,
  CLIENT_SECRET,
  REFRESH_TOKEN,
  AUTO_BUMP_VERSION
} = process.env;

const REQUIRED_ENV_VARS = ['EXTENSION_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN'];

async function checkVersions() {
  const pkg = require('../package.json');
  const manifestPath = path.join(__dirname, '../manifest.json');
  const manifest = require(manifestPath);

  if (pkg.version !== manifest.version) {
    throw new Error(`Version mismatch: package.json (${pkg.version}) != manifest.json (${manifest.version})`);
  }

  try {
    const response = await fetch(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`);
    const data = await response.text();
    const match = data.match(/\"version\":\s*\"([^\"]+)\"/);
    if (match) {
      const storeVersion = match[1];
      if (!semver.gt(pkg.version, storeVersion)) {
        throw new Error(`New version (${pkg.version}) must be greater than current store version (${storeVersion})`);
      }
      console.log(`✅ Version check passed: ${storeVersion} -> ${pkg.version}`);
    }
  } catch (error) {
    console.warn('⚠️ Could not verify Chrome Web Store version:', error.message);
  }
}

async function publish() {
  try {
    const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}\nPlease check your .env file`);
    }

    await checkVersions();

    console.log('🔍 Validating extension...');
    await execAsync('npm run validate');

    console.log('📦 Creating zip file...');
    await execAsync('npm run zip');

    console.log('🚀 Uploading to Chrome Web Store...');
    const pkg = require('../package.json');
    const zipPath = path.join(__dirname, '../builds', `chrome-tabboost-v${pkg.version}.zip`);
    
    await execAsync(`webstore upload --source ${zipPath} --extension-id ${EXTENSION_ID} --client-id ${CLIENT_ID} --client-secret ${CLIENT_SECRET} --refresh-token ${REFRESH_TOKEN}`);

    console.log('🧪 Publishing to trusted testers...');
    await execAsync(`webstore publish --extension-id ${EXTENSION_ID} --client-id ${CLIENT_ID} --client-secret ${CLIENT_SECRET} --refresh-token ${REFRESH_TOKEN} --trusted-testers`);

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`🌎 Do you want to publish version ${pkg.version} to public? (yes/no) `, async (answer) => {
      readline.close();
      if (answer.toLowerCase() === 'yes') {
        console.log('📢 Publishing to public...');
        await execAsync(`webstore publish --extension-id ${EXTENSION_ID} --client-id ${CLIENT_ID} --client-secret ${CLIENT_SECRET} --refresh-token ${REFRESH_TOKEN}`);
        console.log(`✅ Published version ${pkg.version} to Chrome Web Store successfully!`);
      } else {
        console.log('⏭️ Skipping public release. Extension is available to trusted testers.');
      }
    });

  } catch (error) {
    console.error('❌ Publishing failed:', error.message);
    if (error.stdout) console.error('Output:', error.stdout);
    if (error.stderr) console.error('Error:', error.stderr);
    process.exit(1);
  }
}

async function bumpVersion(type) {
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    
    const packageJson = require(packagePath);
    const manifestJson = require(manifestPath);
    
    const newVersion = semver.inc(packageJson.version, type);
    console.log(`📈 Bumping version from ${packageJson.version} to ${newVersion}`);
    
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    
    manifestJson.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2) + '\n');
    
    try {
      await execAsync('git rev-parse --git-dir');
      await execAsync(`git commit -am "chore: bump version to ${newVersion}"`);
      console.log('✅ Version bump committed to git');
    } catch (error) {
      console.log('⚠️ Not a git repository or git error, skipping commit');
    }
  } catch (error) {
    throw new Error(`Failed to bump version: ${error.message}`);
  }
}

publish(); 