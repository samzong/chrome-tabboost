#!/usr/bin/env node

/**
 * Test run script - for CI/CD environments
 * 
 * This script performs the following actions:
 * 1. Runs Jest tests and generates a coverage report
 * 2. Validates that the test coverage meets the threshold
 * 3. Outputs a summary of the test results
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COVERAGE_THRESHOLD = {
  statements: 60,
  branches: 50,
  functions: 60,
  lines: 60
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}====== Running TabBoost test suite ======${colors.reset}`);
console.log(`${colors.cyan}Starting test run...${colors.reset}`);

try {
  console.log(`\n${colors.cyan}Executing Jest tests${colors.reset}`);
  execSync('jest --ci --coverage', { stdio: 'inherit' });
  
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  
  if (fs.existsSync(coveragePath)) {
    const coverageReport = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverageReport.total;
    
    console.log(`\n${colors.blue}====== Coverage report ======${colors.reset}`);
    console.log(`Statements coverage: ${formatCoverage(total.statements.pct, COVERAGE_THRESHOLD.statements)}%`);
    console.log(`Branches coverage: ${formatCoverage(total.branches.pct, COVERAGE_THRESHOLD.branches)}%`);
    console.log(`Functions coverage: ${formatCoverage(total.functions.pct, COVERAGE_THRESHOLD.functions)}%`);
    console.log(`Lines coverage: ${formatCoverage(total.lines.pct, COVERAGE_THRESHOLD.lines)}%`);
    
    let thresholdsFailed = false;
    if (total.statements.pct < COVERAGE_THRESHOLD.statements) {
      console.log(`${colors.red}Statements coverage not met threshold ${COVERAGE_THRESHOLD.statements}%${colors.reset}`);
      thresholdsFailed = true;
    }
    if (total.branches.pct < COVERAGE_THRESHOLD.branches) {
      console.log(`${colors.red}Branches coverage not met threshold ${COVERAGE_THRESHOLD.branches}%${colors.reset}`);
      thresholdsFailed = true;
    }
    if (total.functions.pct < COVERAGE_THRESHOLD.functions) {
      console.log(`${colors.red}Functions coverage not met threshold ${COVERAGE_THRESHOLD.functions}%${colors.reset}`);
      thresholdsFailed = true;
    }
    if (total.lines.pct < COVERAGE_THRESHOLD.lines) {
      console.log(`${colors.red}Lines coverage not met threshold ${COVERAGE_THRESHOLD.lines}%${colors.reset}`);
      thresholdsFailed = true;
    }
    
    if (thresholdsFailed) {
      console.log(`\n${colors.yellow}Warning: Coverage threshold not met, consider adding more tests${colors.reset}`);
      if (process.env.CI === 'true') {
        process.exit(1);
      }
    } else {
      console.log(`\n${colors.green}Coverage threshold met!${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}Warning: Coverage report file not found${colors.reset}`);
  }
  
  console.log(`\n${colors.green}Test completed successfully!${colors.reset}`);
} catch (error) {
  console.error(`\n${colors.red}Test failed: ${error.message}${colors.reset}`);
  process.exit(1);
}

function formatCoverage(value, threshold) {
  const colorCode = value >= threshold ? colors.green : colors.red;
  return `${colorCode}${value.toFixed(2)}${colors.reset}`;
} 