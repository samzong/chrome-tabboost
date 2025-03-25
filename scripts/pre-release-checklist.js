/**
 * 发布前检查清单
 * 验证代码基础是否准备好发布
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const ROOT_DIR = path.join(__dirname, '..');

// 定义检查项
const checks = [
  {
    name: '版本号一致性检查',
    fn: () => {
      const pkg = require('../package.json');
      const manifest = require('../manifest.json');
      return pkg.version === manifest.version;
    },
    message: 'package.json 和 manifest.json 中的版本号必须一致'
  },
  {
    name: '测试用例检查',
    fn: () => {
      try {
        execSync('npm test', { stdio: 'ignore' });
        return true;
      } catch (error) {
        return false;
      }
    },
    message: '测试用例未通过，请修复测试错误'
  },
  {
    name: '构建检查',
    fn: () => {
      try {
        execSync('npm run build', { stdio: 'ignore' });
        return fs.existsSync(path.join(ROOT_DIR, 'dist'));
      } catch (error) {
        return false;
      }
    },
    message: '构建失败，请检查构建错误'
  },
  {
    name: '清单验证检查',
    fn: () => {
      try {
        // 这里使用我们已有的验证脚本
        execSync('node scripts/validate.js', { stdio: 'ignore' });
        return true;
      } catch (error) {
        return false;
      }
    },
    message: '清单验证失败，请检查 manifest.json 是否符合要求'
  },
  {
    name: 'Git 工作区检查',
    fn: () => {
      try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        return status.trim() === '';
      } catch (error) {
        // 如果不在 Git 仓库中，则跳过该检查
        return true;
      }
    },
    message: 'Git 工作区有未提交的更改，请先提交或暂存更改'
  },
  {
    name: '依赖项检查',
    fn: () => {
      try {
        // 检查是否有过期或有问题的依赖
        const output = execSync('npm outdated --json', { encoding: 'utf8' });
        const outdated = JSON.parse(output || '{}');
        // 如果没有过期依赖，返回 true
        return Object.keys(outdated).length === 0;
      } catch (error) {
        // npm outdated 在有过期包时会返回非零状态码
        return false;
      }
    },
    message: '有过期的依赖项，建议更新'
  },
  {
    name: '环境变量检查',
    fn: () => {
      // 检查是否有 .env 文件
      const envExists = fs.existsSync(path.join(ROOT_DIR, '.env'));
      // 需要的环境变量
      const requiredVars = ['EXTENSION_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN'];
      
      if (!envExists) {
        console.log(chalk.yellow('⚠️ 未找到 .env 文件，将无法执行发布操作'));
        return false;
      }
      
      // 检查是否所有必需的环境变量都已设置
      const envContent = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');
      const missingVars = requiredVars.filter(varName => !envContent.includes(`${varName}=`));
      
      if (missingVars.length > 0) {
        console.log(chalk.yellow(`⚠️ .env 文件中缺少以下环境变量: ${missingVars.join(', ')}`));
        return false;
      }
      
      return true;
    },
    message: '缺少必要的环境变量，请检查 .env 文件'
  }
];

/**
 * 运行检查清单
 */
async function runChecklist() {
  console.log(chalk.blue.bold('📋 执行发布前检查清单:'));
  console.log(chalk.blue('='
.repeat(50)));
  
  let allPassed = true;
  
  for (const check of checks) {
    process.stdout.write(chalk.blue(`🔍 检查: ${check.name}... `));
    
    try {
      const result = await check.fn();
      if (result) {
        console.log(chalk.green(`✅ 通过`));
      } else {
        console.log(chalk.red(`❌ 失败`));
        console.log(chalk.yellow(`   原因: ${check.message}`));
        allPassed = false;
      }
    } catch (err) {
      console.log(chalk.red(`❌ 错误`));
      console.log(chalk.yellow(`   错误: ${err.message}`));
      allPassed = false;
    }
  }
  
  console.log(chalk.blue('='
.repeat(50)));
  
  if (allPassed) {
    console.log(chalk.green.bold('✅ 所有检查项通过！可以发布。'));
    return true;
  } else {
    console.log(chalk.red.bold('❌ 有检查项未通过，请先解决上述问题再发布。'));
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runChecklist().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

module.exports = runChecklist; 