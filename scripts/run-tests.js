#!/usr/bin/env node

/**
 * 测试运行脚本 - 用于CI/CD环境
 * 
 * 该脚本执行以下操作:
 * 1. 运行Jest测试并生成覆盖率报告
 * 2. 验证测试覆盖率是否满足阈值
 * 3. 输出测试结果摘要
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试覆盖率阈值
const COVERAGE_THRESHOLD = {
  statements: 60,
  branches: 50,
  functions: 60,
  lines: 60
};

// 颜色函数
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}====== 运行 TabBoost 测试套件 ======${colors.reset}`);
console.log(`${colors.cyan}开始测试运行...${colors.reset}`);

try {
  // 运行测试
  console.log(`\n${colors.cyan}执行 Jest 测试${colors.reset}`);
  execSync('jest --ci --coverage', { stdio: 'inherit' });
  
  // 检查覆盖率报告
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  
  if (fs.existsSync(coveragePath)) {
    const coverageReport = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverageReport.total;
    
    console.log(`\n${colors.blue}====== 覆盖率报告 ======${colors.reset}`);
    console.log(`语句覆盖率: ${formatCoverage(total.statements.pct, COVERAGE_THRESHOLD.statements)}%`);
    console.log(`分支覆盖率: ${formatCoverage(total.branches.pct, COVERAGE_THRESHOLD.branches)}%`);
    console.log(`函数覆盖率: ${formatCoverage(total.functions.pct, COVERAGE_THRESHOLD.functions)}%`);
    console.log(`行覆盖率: ${formatCoverage(total.lines.pct, COVERAGE_THRESHOLD.lines)}%`);
    
    // 验证覆盖率阈值
    let thresholdsFailed = false;
    if (total.statements.pct < COVERAGE_THRESHOLD.statements) {
      console.log(`${colors.red}语句覆盖率未达到阈值 ${COVERAGE_THRESHOLD.statements}%${colors.reset}`);
      thresholdsFailed = true;
    }
    if (total.branches.pct < COVERAGE_THRESHOLD.branches) {
      console.log(`${colors.red}分支覆盖率未达到阈值 ${COVERAGE_THRESHOLD.branches}%${colors.reset}`);
      thresholdsFailed = true;
    }
    if (total.functions.pct < COVERAGE_THRESHOLD.functions) {
      console.log(`${colors.red}函数覆盖率未达到阈值 ${COVERAGE_THRESHOLD.functions}%${colors.reset}`);
      thresholdsFailed = true;
    }
    if (total.lines.pct < COVERAGE_THRESHOLD.lines) {
      console.log(`${colors.red}行覆盖率未达到阈值 ${COVERAGE_THRESHOLD.lines}%${colors.reset}`);
      thresholdsFailed = true;
    }
    
    if (thresholdsFailed) {
      console.log(`\n${colors.yellow}警告: 覆盖率阈值未达标，建议增加测试用例${colors.reset}`);
      // 在非CI环境中，可能只需要警告而不退出
      if (process.env.CI === 'true') {
        process.exit(1);
      }
    } else {
      console.log(`\n${colors.green}覆盖率满足阈值要求!${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}警告: 未找到覆盖率报告文件${colors.reset}`);
  }
  
  console.log(`\n${colors.green}测试成功完成!${colors.reset}`);
} catch (error) {
  console.error(`\n${colors.red}测试失败: ${error.message}${colors.reset}`);
  process.exit(1);
}

// 格式化覆盖率输出，添加颜色
function formatCoverage(value, threshold) {
  const colorCode = value >= threshold ? colors.green : colors.red;
  return `${colorCode}${value.toFixed(2)}${colors.reset}`;
} 