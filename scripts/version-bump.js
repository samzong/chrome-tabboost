/**
 * Automatic version Tag update script
 * Support patch, minor, major, prepatch, preminor, premajor, prerelease version update types
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { execSync } = require('child_process');
const chalk = require('chalk');

const CONFIG = {
  PACKAGE_PATH: path.join(__dirname, '../package.json'),
  MANIFEST_PATH: path.join(__dirname, '../manifest.json'),
  VERSION_TYPES: ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease']
};

/**
 * Update version Tag
 * @param {string} type - version update type (patch/minor/major)
 */
async function updateVersion(type) {
  try {
    if (!CONFIG.VERSION_TYPES.includes(type)) {
      console.error(chalk.red(`❌ Invalid version type: ${type}`));
      console.log(chalk.blue(`Valid version types: ${CONFIG.VERSION_TYPES.join(', ')}`));
      process.exit(1);
    }

    const packageData = JSON.parse(fs.readFileSync(CONFIG.PACKAGE_PATH, 'utf8'));
    const currentVersion = packageData.version;

    const newVersion = semver.inc(currentVersion, type);
    
    if (!newVersion) {
      throw new Error(`Cannot calculate ${type} version number based on ${currentVersion}`);
    }

    console.log(chalk.blue(`🔄 Update version: ${chalk.yellow(currentVersion)} → ${chalk.green(newVersion)}`));

    packageData.version = newVersion;
    fs.writeFileSync(CONFIG.PACKAGE_PATH, JSON.stringify(packageData, null, 2) + '\n', 'utf8');
    console.log(chalk.green(`✅ Updated package.json version number`));

    if (fs.existsSync(CONFIG.MANIFEST_PATH)) {
      const manifestData = JSON.parse(fs.readFileSync(CONFIG.MANIFEST_PATH, 'utf8'));
      manifestData.version = newVersion;
      fs.writeFileSync(CONFIG.MANIFEST_PATH, JSON.stringify(manifestData, null, 2) + '\n', 'utf8');
      console.log(chalk.green(`✅ Updated manifest.json version number`));
    }

    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
      
      execSync('npm run changelog', { stdio: 'inherit' });
      console.log(chalk.green(`✅ Generated changelog`));
      
      execSync(`git add package.json manifest.json CHANGELOG.md`, { stdio: 'ignore' });
      execSync(`git commit -m "chore(release): v${newVersion}"`, { stdio: 'ignore' });
      console.log(chalk.green(`✅ Committed version changes to Git`));
      
      execSync(`git tag -a v${newVersion} -m "release: v${newVersion}"`, { stdio: 'ignore' });
      console.log(chalk.green(`✅ Created tag v${newVersion}`));
      
      console.log(chalk.blue(`💡 Tag has been created, but not pushed. You can use the following commands to push:`));
      console.log(chalk.yellow(`  git push origin v${newVersion}`));
      console.log(chalk.yellow(`  git push`));
    } catch (error) {
      if (error.message.includes('not a git repository')) {
        console.log(chalk.yellow(`⚠️ Not in a Git repository, skipping Git operations`));
      } else {
        console.error(chalk.yellow(`⚠️ Git operation failed: ${error.message}`));
      }
    }

    console.log(chalk.green.bold(`🎉 Version update successful: v${newVersion}`));
  } catch (error) {
    console.error(chalk.red(`❌ Version update failed: ${error.message}`));
    process.exit(1);
  }
}

const versionType = process.argv[2];

if (!versionType) {
  console.error(chalk.red('❌ No version type specified'));
  process.exit(1);
}

updateVersion(versionType); 