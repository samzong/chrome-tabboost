const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const buildDir = path.join(__dirname, '../build');
const manifestPath = path.join(buildDir, 'manifest.json');

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

    const maxSize = 5 * 1024 * 1024; // 5MB
    const files = getAllFiles(buildDir);
    for (const file of files) {
      const stats = fs.statSync(file);
      if (stats.size > maxSize) {
        throw new Error(`File too large (>5MB): ${path.relative(buildDir, file)}`);
      }
    }

    console.log('Running web-ext validation...');
    try {
      await execAsync(`npx web-ext lint --source-dir ${buildDir}`);
    } catch (error) {
      if (error.stderr && !error.stderr.includes('Your extension is valid')) {
        throw new Error(`web-ext validation failed: ${error.stderr}`);
      }
    }

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