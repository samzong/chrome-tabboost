/**
 * Pre-release checklist
 * Verify code base is ready for release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const ROOT_DIR = path.join(__dirname, '..');

// Define a type for the check items for better clarity and maintenance
/**
 * @typedef {object} CheckItem
 * @property {string} name - The name of the check to be displayed.
 * @property {() => Promise<boolean> | boolean} fn - The function to execute for the check. Should return true if passed, false otherwise. Can be async.
 * @property {string} description - A detailed description of what the check does.
 * @property {string} failureMessage - The message to display if the check fails.
 */

/** @type {CheckItem[]} */
const checks = [
  {
    name: 'Version Consistency',
    fn: () => {
      const pkg = require(path.join(ROOT_DIR, 'package.json'));
      // Ensure manifest path is correct, assuming it's in the root
      const manifestPath = path.join(ROOT_DIR, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
          console.warn(chalk.yellow('\n    ⚠️ manifest.json not found in root, skipping version check.'));
          return true; // Or false if manifest is mandatory
      }
      const manifest = require(manifestPath);
      return pkg.version === manifest.version;
    },
    description: 'Checks if the version in package.json matches the version in manifest.json.',
    failureMessage: 'package.json and manifest.json versions are inconsistent. Please align them.'
  },
  {
    name: 'Unit Tests Pass',
    fn: () => {
      try {
        // Use --silent or capture/ignore stdout if verbose output is not needed
        execSync('npm test -- --silent', { stdio: 'pipe', cwd: ROOT_DIR });
        return true;
      } catch (error) {
        // Log the error details for easier debugging
        console.error(`\n    ${chalk.red('Test execution error:')} ${error.stderr || error.stdout || error.message}`);
        return false;
      }
    },
    description: 'Ensures all unit tests pass successfully using `npm test`.',
    failureMessage: 'One or more unit tests failed. Please fix the failing tests.'
  },
  {
    name: 'Successful Build',
    fn: () => {
      try {
        // Use --silent or capture/ignore stdout
        execSync('npm run build --silent', { stdio: 'pipe', cwd: ROOT_DIR });
        // Check for expected output directory, adjust path if needed
        return fs.existsSync(path.join(ROOT_DIR, 'dist')); // Assuming build output is in 'dist'
      } catch (error) {
        console.error(`\n    ${chalk.red('Build execution error:')} ${error.stderr || error.stdout || error.message}`);
        return false;
      }
    },
    description: 'Verifies that the project builds successfully using `npm run build` and the output directory exists.',
    failureMessage: 'Project build failed or the output directory is missing. Check build logs.'
  },
  {
    name: 'Manifest Validation',
    fn: () => {
      try {
        // Execute the validation script
        execSync('node scripts/validate.js', { stdio: 'pipe', cwd: ROOT_DIR });
        return true;
      } catch (error) {
        console.error(`\n    ${chalk.red('Manifest validation error:')} ${error.stderr || error.stdout || error.message}`);
        return false;
      }
    },
    description: 'Runs the `scripts/validate.js` script to ensure the manifest.json is valid.',
    failureMessage: 'Manifest validation failed. Run `node scripts/validate.js` for details.'
  },
  {
    name: 'Clean Git Workspace',
    fn: () => {
      try {
        const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: ROOT_DIR });
        return status.trim() === '';
      } catch (error) {
        // If git command fails (e.g., not a git repo), consider it passed or handle appropriately
        console.warn(`\n    ${chalk.yellow('Git status check warning:')} ${error.message}`);
        return true; // Assuming non-git environment is okay for checklist
      }
    },
    description: 'Checks if the Git working directory is clean (no uncommitted changes).',
    failureMessage: 'Git workspace has uncommitted changes. Please commit or stash them.'
  },
  {
    name: 'No Outdated Dependencies',
    fn: () => {
      try {
        // Capture JSON output, handle potential errors if npm outdated fails
        const output = execSync('npm outdated --json', { encoding: 'utf8', cwd: ROOT_DIR });
        const outdated = JSON.parse(output || '{}');
        if (Object.keys(outdated).length > 0) {
          console.warn(`\n    ${chalk.yellow('Outdated dependencies found:')}`);
          console.warn(JSON.stringify(outdated, null, 2));
          return false;
        }
        return true;
      } catch (error) {
        // Handle cases where npm outdated fails or returns non-JSON output
         if (error.stdout && error.stdout.trim() === '') {
            // npm outdated might exit with error code 1 even if no outdated deps, just warnings
            return true;
        }        
        console.error(`\n    ${chalk.red('Dependency check error:')} ${error.message}`);
        return false; // Consider failing the check if npm outdated itself fails
      }
    },
    description: 'Checks for outdated npm dependencies using `npm outdated`.',
    failureMessage: 'Outdated dependencies found. Run `npm outdated` and update them.'
  },
  {
    name: 'Required Environment Variables',
    fn: () => {
      const envPath = path.join(ROOT_DIR, '.env');
      const requiredVars = ['EXTENSION_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN']; // Example variables

      if (!fs.existsSync(envPath)) {
        console.warn(`\n    ${chalk.yellow('.env file not found. This is required for release operations.')}`);
        return false;
      }

      // Consider using dotenv package for more robust env loading
      require('dotenv').config({ path: envPath });
      const missingVars = requiredVars.filter(varName => !process.env[varName]);

      if (missingVars.length > 0) {
        console.warn(`\n    ${chalk.yellow('.env file or environment is missing required variables: ' + missingVars.join(', '))}`);
        return false;
      }

      return true;
    },
    description: 'Ensures all required environment variables for publishing are set (e.g., in .env file).',
    failureMessage: 'One or more required environment variables are missing. Check your .env file or environment setup.'
  }
];

// Helper function for consistent separators
function printSeparator() {
  console.log(chalk.blue('-'.repeat(60)));
}

/**
 * Run checklist
 */
async function runChecklist() {
  console.log(chalk.blue.bold('📋 Running pre-release checklist:'));
  printSeparator();

  let allPassed = true;

  for (const check of checks) {
    process.stdout.write(chalk.cyan(`🔍 Checking: ${check.name}... `));

    try {
      // Await potentially async check functions
      const result = await Promise.resolve(check.fn());
      if (result) {
        console.log(chalk.green('✅ Passed'));
      } else {
        console.log(chalk.red('❌ Failed'));
        console.log(chalk.yellow(`    Reason: ${check.failureMessage}`));
        // Optionally log the description as well for more context
        // console.log(chalk.grey(`            (${check.description})`));
        allPassed = false;
      }
    } catch (err) {
      console.log(chalk.red('❌ Error during check'));
      console.log(chalk.red(`    Error: ${err.message}`));
      // Log description for context on where the error occurred
      console.log(chalk.grey(`            (Check: ${check.description})`));
      allPassed = false;
    }
  }

  printSeparator();

  if (allPassed) {
    console.log(chalk.green.bold('✅ All checks passed! Ready to release.'));
    return true;
  } else {
    console.log(chalk.red.bold('❌ Some checks failed. Please review the messages above and fix the issues before releasing.'));
    return false;
  }
}

if (require.main === module) {
  runChecklist().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

module.exports = runChecklist; 