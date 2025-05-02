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
 * Executes a Git command and logs the action.
 * @param {string} command - The Git command to execute.
 * @param {string} description - A description of the Git action for logging.
 * @throws {Error} If the command fails.
 */
function runGitCommand(command, description) {
  try {
    execSync(command, { stdio: 'ignore' });
    console.log(chalk.green(`✅ ${description}`));
  } catch (error) {
    console.error(chalk.red(`❌ Failed to ${description.toLowerCase()}: ${error.message}`));
    throw error; // Re-throw to be caught by the main try-catch block
  }
}

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
      // Check if inside a Git repository before attempting Git operations
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

      // Run changelog generation (assuming it modifies files)
      execSync('npm run changelog', { stdio: 'inherit' });
      console.log(chalk.green(`✅ Generated changelog`));

      // Stage changed files
      runGitCommand(`git add package.json manifest.json CHANGELOG.md`, "Staged version changes");

      // Commit the changes
      runGitCommand(`git commit -m "chore(release): v${newVersion}"`, `Committed version v${newVersion}`);

      // Create a Git tag
      runGitCommand(`git tag -a v${newVersion} -m "release: v${newVersion}"`, `Created tag v${newVersion}`);

      console.log(chalk.blue(`💡 Tag has been created, but not pushed. You can use the following commands to push:`));
      console.log(chalk.yellow(`  git push origin v${newVersion}`));
      console.log(chalk.yellow(`  git push`));

    } catch (error) {
      // Handle specific error for not being in a git repo, otherwise log generic git error
      if (error.message.includes('not a git repository')) {
        console.log(chalk.yellow(`⚠️ Not in a Git repository, skipping Git operations`));
      } else {
        // Errors from runGitCommand are already logged, so just indicate the overall failure
        console.error(chalk.red(`❌ A Git operation failed. Please check the logs above.`));
        // Depending on policy, you might want to exit here or let the script continue
        // process.exit(1);
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