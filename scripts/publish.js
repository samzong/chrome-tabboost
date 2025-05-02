const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const semver = require('semver');
const chalk = require('chalk');
require('dotenv').config();

// Explicitly define paths
const ROOT_DIR = path.join(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const MANIFEST_JSON_PATH = path.join(ROOT_DIR, 'manifest.json');
const BUILDS_DIR = path.join(ROOT_DIR, 'builds');

// Validate required environment variables immediately
const REQUIRED_ENV_VARS = ['EXTENSION_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN'];
const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(chalk.red(`❌ Missing required environment variables: ${missingVars.join(', ')}`));
  console.log(chalk.yellow('   Please check your .env file or environment setup.'));
  process.exit(1);
}

// Destructure validated environment variables
const {
  EXTENSION_ID,
  CLIENT_ID,
  CLIENT_SECRET,
  REFRESH_TOKEN,
} = process.env;

async function checkVersions() {
  const pkg = require(PACKAGE_JSON_PATH);
  if (!fs.existsSync(MANIFEST_JSON_PATH)) {
    console.warn(chalk.yellow('⚠️ manifest.json not found in root. Skipping version check against manifest.'));
  } else {
    const manifest = require(MANIFEST_JSON_PATH);
    if (pkg.version !== manifest.version) {
      throw new Error(`Version mismatch: package.json (${pkg.version}) != manifest.json (${manifest.version})`);
    }
  }

  try {
    console.log(chalk.blue(`🔍 Checking Chrome Web Store version for extension ID: ${EXTENSION_ID}`));
    const response = await fetch(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`);
    const data = await response.text();
    const match = data.match(/\"version\":\s*\"([^\"]+)\"/);
    if (match) {
      const storeVersion = match[1];
      if (!semver.gt(pkg.version, storeVersion)) {
        throw new Error(`New version (${pkg.version}) must be greater than current store version (${storeVersion})`);
      }
      console.log(chalk.green(`✅ Version check passed: ${storeVersion} -> ${pkg.version}`));
    }
  } catch (error) {
    console.warn('⚠️ Could not verify Chrome Web Store version:', error.message);
  }
}

async function publish() {
  try {
    await checkVersions();

    console.log(chalk.blue('🔍 Validating extension...'));
    await execAsync('npm run validate', { cwd: ROOT_DIR });

    console.log(chalk.blue('📦 Creating zip file...'));
    await execAsync('npm run zip', { cwd: ROOT_DIR });

    console.log(chalk.blue('🚀 Uploading to Chrome Web Store...'));
    const pkg = require(PACKAGE_JSON_PATH);
    const zipFileName = `${pkg.name}-v${pkg.version}.zip`;
    const zipPath = path.join(BUILDS_DIR, zipFileName);

    if (!fs.existsSync(zipPath)) {
      throw new Error(`Zip file not found at expected path: ${zipPath}`);
    }

    const webstoreUploadCmd = `webstore upload --source "${zipPath}" --extension-id ${EXTENSION_ID} --client-id ${CLIENT_ID} --client-secret ${CLIENT_SECRET} --refresh-token ${REFRESH_TOKEN}`;
    console.log(chalk.cyan(`   Executing: ${webstoreUploadCmd.replace(CLIENT_SECRET, '***').replace(REFRESH_TOKEN, '***')}`));
    await execAsync(webstoreUploadCmd);

    console.log(chalk.blue('🧪 Publishing to trusted testers...'));
    const webstorePublishTestersCmd = `webstore publish --extension-id ${EXTENSION_ID} --client-id ${CLIENT_ID} --client-secret ${CLIENT_SECRET} --refresh-token ${REFRESH_TOKEN} --trusted-testers`;
    console.log(chalk.cyan(`   Executing: ${webstorePublishTestersCmd.replace(CLIENT_SECRET, '***').replace(REFRESH_TOKEN, '***')}`));
    await execAsync(webstorePublishTestersCmd);

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`🌎 Do you want to publish version ${pkg.version} to public? (yes/no) `, async (answer) => {
      readline.close();
      if (answer.toLowerCase() === 'yes') {
        console.log(chalk.blue('📢 Publishing to public...'));
        const webstorePublishPublicCmd = `webstore publish --extension-id ${EXTENSION_ID} --client-id ${CLIENT_ID} --client-secret ${CLIENT_SECRET} --refresh-token ${REFRESH_TOKEN}`;
        console.log(chalk.cyan(`   Executing: ${webstorePublishPublicCmd.replace(CLIENT_SECRET, '***').replace(REFRESH_TOKEN, '***')}`));
        await execAsync(webstorePublishPublicCmd);
        console.log(chalk.green(`✅ Published version ${pkg.version} to Chrome Web Store successfully!`));
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

publish(); 