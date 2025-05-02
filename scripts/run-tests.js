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

/**
 * Formats the coverage percentage with color based on threshold.
 * @param {number} value - The coverage percentage.
 * @param {number} threshold - The minimum required percentage.
 * @returns {string} Formatted and colored percentage string.
 */
function formatCoverage(value, threshold) {
  const colorCode = value >= threshold ? colors.green : colors.red;
  return `${colorCode}${value.toFixed(2)}${colors.reset}`;
}

/**
 * Checks a specific coverage metric against its threshold.
 * @param {string} metricName - The name of the metric (e.g., "Statements").
 * @param {number} actualValue - The actual coverage percentage.
 * @param {number} threshold - The required coverage threshold.
 * @returns {boolean} True if the threshold is met, false otherwise.
 */
function checkCoverageThreshold(metricName, actualValue, threshold) {
  console.log(`${metricName} coverage: ${formatCoverage(actualValue, threshold)}% (Threshold: ${threshold}%)`);
  if (actualValue < threshold) {
    console.log(`${colors.red}${metricName} coverage below threshold ${threshold}%${colors.reset}`);
    return false;
  }
  return true;
}

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

    let allThresholdsMet = true;
    allThresholdsMet &= checkCoverageThreshold("Statements", total.statements.pct, COVERAGE_THRESHOLD.statements);
    allThresholdsMet &= checkCoverageThreshold("Branches", total.branches.pct, COVERAGE_THRESHOLD.branches);
    allThresholdsMet &= checkCoverageThreshold("Functions", total.functions.pct, COVERAGE_THRESHOLD.functions);
    allThresholdsMet &= checkCoverageThreshold("Lines", total.lines.pct, COVERAGE_THRESHOLD.lines);

    if (!allThresholdsMet) {
      console.log(`\n${colors.yellow}Warning: One or more coverage thresholds not met.${colors.reset}`);
      if (process.env.CI === 'true') {
        console.error(`${colors.red}Failing CI build due to low coverage.${colors.reset}`);
        process.exit(1);
      }
    } else {
      console.log(`\n${colors.green}All coverage thresholds met!${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}Warning: Coverage report file not found (${coveragePath})${colors.reset}`);
    // Optionally fail the build if coverage report is missing in CI
    if (process.env.CI === 'true') {
        console.error(`${colors.red}Failing CI build because coverage report is missing.${colors.reset}`);
        process.exit(1);
    }
  }
  
  console.log(`\n${colors.green}Test completed successfully!${colors.reset}`);
} catch (error) {
  console.error(`\n${colors.red}Test run failed: ${error.message}${colors.reset}`);
  process.exit(1);
} 