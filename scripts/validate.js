const fs = require('fs');
const path = require('path');
const buildDir = path.join(__dirname, '../build');
const manifestPath = path.join(buildDir, 'manifest.json');
const WEB_EXT_IGNORED_ERROR_CODES = new Set([
  'MANIFEST_FIELD_UNSUPPORTED',
  'EXTENSION_ID_REQUIRED',
  'ADDON_ID_REQUIRED',
]);

let cachedWebExt;

async function loadWebExt() {
  if (!cachedWebExt) {
    try {
      const imported = await import('web-ext');
      cachedWebExt = imported.default || imported;
    } catch (err) {
      throw new Error(`Unable to load web-ext module: ${err.message || err}`);
    }
  }

  return cachedWebExt;
}

async function validateExtension() {
  try {
    if (!fs.existsSync(buildDir)) {
      throw new Error('Build directory not found. Run npm run build first.');
    }

    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found in build directory');
    }

    const manifest = require(manifestPath);
    const pkg = require('../package.json');

    if (manifest.version !== pkg.version) {
      throw new Error(`Version mismatch: manifest.json (${manifest.version}) != package.json (${pkg.version})`);
    }

    const requiredFields = ['name', 'version', 'manifest_version'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(`Missing required field in manifest.json: ${field}`);
      }
    }

    enforceBundleBudgets();

    const maxSize = 5 * 1024 * 1024; // 5MB
    const files = getAllFiles(buildDir);
    for (const file of files) {
      const stats = fs.statSync(file);
      if (stats.size > maxSize) {
        throw new Error(`File too large (>5MB): ${path.relative(buildDir, file)}`);
      }
    }

    console.log('Running web-ext validation...');
    await runWebExtLint();

    validatePermissions(manifest);
    validateContentSecurity(manifest);

    console.log('✅ Extension validation passed');
    return true;
  } catch (err) {
    console.error('❌ Validation failed:', err.message);
    process.exit(1);
  }
}

function validatePermissions(manifest) {
  const dangerousPermissions = ['<all_urls>', '*://*/*'];
  const permissions = manifest.permissions || [];
  const hostPermissions = manifest.host_permissions || [];

  const foundDangerous = [...permissions, ...hostPermissions].find(p => 
    dangerousPermissions.includes(p)
  );

  if (foundDangerous) {
    console.warn('⚠️ Warning: Using broad permissions may affect Chrome Web Store review');
  }
}

function validateContentSecurity(manifest) {
  const csp = manifest.content_security_policy?.extension_pages || 
              manifest.content_security_policy;

  if (!csp) {
    console.warn('⚠️ Warning: No Content Security Policy defined');
  } else if (csp.includes("'unsafe-eval'") || csp.includes("'unsafe-inline'")) {
    console.warn('⚠️ Warning: Using unsafe CSP directives may affect security');
  }
}

function enforceBundleBudgets() {
  const budgets = {
    "background.js": 130 * 1024, // 130 KB
    "contentScript.js": 80 * 1024, // 80 KB
    "popup.js": 60 * 1024, // 60 KB
    "options.js": 70 * 1024, // 70 KB
    "vendors.js": 180 * 1024, // 180 KB
    "common.js": 120 * 1024, // 120 KB
  };

  const formattedResults = [];

  Object.entries(budgets).forEach(([bundle, budget]) => {
    const bundlePath = path.join(buildDir, bundle);
    if (!fs.existsSync(bundlePath)) {
      return;
    }

    const size = fs.statSync(bundlePath).size;
    formattedResults.push(`${bundle}: ${formatBytes(size)} / ${formatBytes(budget)}`);

    if (size > budget) {
      throw new Error(
        `Bundle size exceeded for ${bundle}: ${formatBytes(size)} (limit ${formatBytes(budget)})`
      );
    }
  });

  if (formattedResults.length > 0) {
    console.log("Bundle size check passed:\n  " + formattedResults.join("\n  "));
  } else {
    console.warn("⚠️ Unable to locate expected bundle files for size check. Make sure npm run build was executed.");
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(1)} ${units[index]}`;
}

/**
 * Recursively gets all file paths within a directory.
 * @param {string} dir - The directory path to scan.
 * @returns {string[]} An array of full file paths.
 * @throws {Error} If the directory cannot be read or a file/subdir cannot be accessed.
 */
function getAllFiles(dir) {
  const files = [];
  let items;
  try {
    items = fs.readdirSync(dir);
  } catch (readError) {
    console.error(`❌ Error reading directory ${dir}: ${readError.message}`);
    throw readError; // Re-throw to halt the validation if a directory is unreadable
  }

  for (const item of items) {
    const fullPath = path.join(dir, item);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // Recursively get files from subdirectory
        // Use try-catch here as well to handle errors from deeper levels
        try {
          files.push(...getAllFiles(fullPath));
        } catch (subDirError) {
          // Log the error from the subdirectory and continue if possible, or re-throw
          console.error(`❌ Error processing subdirectory ${fullPath}: ${subDirError.message}`);
          // Decide whether to continue or halt; re-throwing halts.
          // throw subDirError;
        }
      } else {
        files.push(fullPath);
      }
    } catch (statError) {
      // Log error if unable to get stats for an item (e.g., permission denied)
      console.warn(`⚠️ Warning: Could not stat item ${fullPath}: ${statError.message}`);
      // Decide whether to skip this item or halt validation
    }
  }

  return files;
}

validateExtension();

async function runWebExtLint() {
  const webExt = await loadWebExt();
  try {
    const result = await webExt.cmd.lint(
      { sourceDir: buildDir, selfHosted: true },
      { shouldExitProgram: false }
    );

    const actionableErrors = [];
    const ignoredErrors = [];

    for (const message of result.errors || []) {
      if (WEB_EXT_IGNORED_ERROR_CODES.has(message.code)) {
        ignoredErrors.push(message);
        continue;
      }
      actionableErrors.push(message);
    }

    if (ignoredErrors.length > 0) {
      const codes = [...new Set(ignoredErrors.map(msg => msg.code))].join(', ');
      console.warn(`⚠️ Ignoring Firefox-only web-ext errors: ${codes}`);
    }

    if (actionableErrors.length > 0) {
      const formatted = actionableErrors
        .map(formatLintMessage)
        .join('\n  ');
      throw new Error(`web-ext validation failed:\n  ${formatted}`);
    }

    if (result.warnings && result.warnings.length > 0) {
      const sampleWarnings = result.warnings.slice(0, 5).map(formatLintMessage);
      console.warn(
        `⚠️ web-ext reported ${result.warnings.length} warning(s).` +
        (sampleWarnings.length ? `\n  ${sampleWarnings.join('\n  ')}` : '')
      );
    }
  } catch (error) {
    throw new Error(`web-ext lint execution failed: ${error.message || error}`);
  }
}

function formatLintMessage(message) {
  const location = message.file
    ? `${message.file}${message.line ? `:${message.line}` : ''}`
    : '';
  return `${message.code}: ${message.message}${location ? ` (${location})` : ''}`;
}
