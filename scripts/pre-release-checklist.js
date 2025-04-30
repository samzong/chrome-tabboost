/**
 * Pre-release checklist
 * Verify code base is ready for release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const ROOT_DIR = path.join(__dirname, '..');

const checks = [
  {
    name: 'Version consistency check',
    fn: () => {
      const pkg = require('../package.json');
      const manifest = require('../manifest.json');
      return pkg.version === manifest.version;
    },
    message: 'package.json and manifest.json version must be consistent'
  },
  {
    name: 'Test case check',
    fn: () => {
      try {
        execSync('npm test', { stdio: 'ignore' });
        return true;
      } catch (error) {
        return false;
      }
    },
    message: 'Test cases failed, please fix the test errors'
  },
  {
    name: 'Build check',
    fn: () => {
      try {
        execSync('npm run build', { stdio: 'ignore' });
        return fs.existsSync(path.join(ROOT_DIR, 'dist'));
      } catch (error) {
        return false;
      }
    },
    message: 'Build failed, please check the build errors'
  },
  {
    name: 'Manifest validation check',
    fn: () => {
      try {
        execSync('node scripts/validate.js', { stdio: 'ignore' });
        return true;
      } catch (error) {
        return false;
      }
    },
    message: 'Manifest validation failed, please check manifest.json is valid'
  },
  {
    name: 'Git workspace check',
    fn: () => {
      try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        return status.trim() === '';
      } catch (error) {
        return true;
      }
    },
    message: 'Git workspace has uncommitted changes, please commit or stash changes'
  },
  {
    name: 'Dependency check',
    fn: () => {
      try {
        const output = execSync('npm outdated --json', { encoding: 'utf8' });
        const outdated = JSON.parse(output || '{}');
        return Object.keys(outdated).length === 0;
      } catch (error) {
        return false;
      }
    },
    message: 'There are expired dependencies, please update'
  },
  {
    name: 'Environment variable check',
    fn: () => {
      const envExists = fs.existsSync(path.join(ROOT_DIR, '.env'));
      const requiredVars = ['EXTENSION_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN'];
      
      if (!envExists) {
        console.log(chalk.yellow('⚠️ .env file not found, cannot execute release operation'));
        return false;
      }
      
      const envContent = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');
      const missingVars = requiredVars.filter(varName => !envContent.includes(`${varName}=`));
      
      if (missingVars.length > 0) {
        console.log(chalk.yellow(`⚠️ .env file is missing the following environment variables: ${missingVars.join(', ')}`));
        return false;
      }
      
      return true;
    },
    message: 'Missing required environment variables, please check .env file'
  }
];

/**
 * Run checklist
 */
async function runChecklist() {
  console.log(chalk.blue.bold('📋 Running pre-release checklist:'));
  console.log(chalk.blue('='
.repeat(50)));
  
  let allPassed = true;
  
  for (const check of checks) {
    process.stdout.write(chalk.blue(`🔍 Checking: ${check.name}... `));
    
    try {
      const result = await check.fn();
      if (result) {
        console.log(chalk.green(`✅ Passed`));
      } else {
        console.log(chalk.red(`❌ Failed`));
        console.log(chalk.yellow(`    Reason: ${check.message}`));
        allPassed = false;
      }
    } catch (err) {
      console.log(chalk.red(`❌ Error`));
      console.log(chalk.yellow(`    Error: ${err.message}`));
      allPassed = false;
    }
  }
  
  console.log(chalk.blue('='
.repeat(50)));
  
  if (allPassed) {
    console.log(chalk.green.bold('✅ All checks passed! Ready to release.'));
    return true;
  } else {
    console.log(chalk.red.bold('❌ Some checks failed, please fix the issues before releasing.'));
    return false;
  }
}

if (require.main === module) {
  runChecklist().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

module.exports = runChecklist; 