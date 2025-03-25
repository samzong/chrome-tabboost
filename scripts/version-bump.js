/**
 * 自动版本号更新脚本
 * 支持 patch、minor、major 三种版本更新类型
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { execSync } = require('child_process');
const chalk = require('chalk');

// 配置参数
const CONFIG = {
  PACKAGE_PATH: path.join(__dirname, '../package.json'),
  MANIFEST_PATH: path.join(__dirname, '../manifest.json'),
  VERSION_TYPES: ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease']
};

/**
 * 更新版本号
 * @param {string} type - 版本更新类型 (patch/minor/major)
 */
async function updateVersion(type) {
  try {
    // 验证版本类型
    if (!CONFIG.VERSION_TYPES.includes(type)) {
      console.error(chalk.red(`❌ 无效的版本类型: ${type}`));
      console.log(chalk.blue(`有效的版本类型: ${CONFIG.VERSION_TYPES.join(', ')}`));
      process.exit(1);
    }

    // 读取 package.json
    const packageData = JSON.parse(fs.readFileSync(CONFIG.PACKAGE_PATH, 'utf8'));
    const currentVersion = packageData.version;

    // 计算新版本号
    const newVersion = semver.inc(currentVersion, type);
    
    if (!newVersion) {
      throw new Error(`无法基于 ${currentVersion} 计算 ${type} 版本号`);
    }

    console.log(chalk.blue(`🔄 更新版本: ${chalk.yellow(currentVersion)} → ${chalk.green(newVersion)}`));

    // 更新 package.json
    packageData.version = newVersion;
    fs.writeFileSync(CONFIG.PACKAGE_PATH, JSON.stringify(packageData, null, 2) + '\n', 'utf8');
    console.log(chalk.green(`✅ 已更新 package.json 版本号`));

    // 更新 manifest.json (如果存在)
    if (fs.existsSync(CONFIG.MANIFEST_PATH)) {
      const manifestData = JSON.parse(fs.readFileSync(CONFIG.MANIFEST_PATH, 'utf8'));
      manifestData.version = newVersion;
      fs.writeFileSync(CONFIG.MANIFEST_PATH, JSON.stringify(manifestData, null, 2) + '\n', 'utf8');
      console.log(chalk.green(`✅ 已更新 manifest.json 版本号`));
    }

    // 提交变更到 Git (如果在 Git 仓库中)
    try {
      // 检查是否在 Git 仓库中
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
      
      // 生成变更日志
      execSync('npm run changelog', { stdio: 'inherit' });
      console.log(chalk.green(`✅ 已生成变更日志`));
      
      // 提交变更
      execSync(`git add package.json manifest.json CHANGELOG.md`, { stdio: 'ignore' });
      execSync(`git commit -m "chore(release): v${newVersion}"`, { stdio: 'ignore' });
      console.log(chalk.green(`✅ 已提交版本变更到 Git`));
      
      // 创建标签
      execSync(`git tag -a v${newVersion} -m "release: v${newVersion}"`, { stdio: 'ignore' });
      console.log(chalk.green(`✅ 已创建标签 v${newVersion}`));
      
      console.log(chalk.blue(`💡 标签已创建，但尚未推送。可以使用以下命令推送:`));
      console.log(chalk.yellow(`  git push origin v${newVersion}`));
      console.log(chalk.yellow(`  git push`));
    } catch (error) {
      // 不在 Git 仓库中或 Git 错误，跳过
      if (error.message.includes('not a git repository')) {
        console.log(chalk.yellow(`⚠️ 未在 Git 仓库中，跳过 Git 操作`));
      } else {
        console.error(chalk.yellow(`⚠️ Git 操作失败: ${error.message}`));
      }
    }

    console.log(chalk.green.bold(`🎉 版本更新成功: v${newVersion}`));
  } catch (error) {
    console.error(chalk.red(`❌ 版本更新失败: ${error.message}`));
    process.exit(1);
  }
}

// 从命令行参数获取版本类型
const versionType = process.argv[2];

if (!versionType) {
  console.error(chalk.red('❌ 未指定版本类型'));
  console.log(chalk.blue(`用法: node ${path.basename(__filename)} [version-type]`));
  console.log(chalk.blue(`有效的版本类型: ${CONFIG.VERSION_TYPES.join(', ')}`));
  process.exit(1);
}

// 执行版本更新
updateVersion(versionType); 