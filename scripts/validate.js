const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const buildDir = path.join(__dirname, '../dist');
const manifestPath = path.join(buildDir, 'manifest.json');

async function validateExtension() {
  try {
    // Check if build directory exists
    if (!fs.existsSync(buildDir)) {
      throw new Error('Build directory not found. Run npm run build first.');
    }

    // Check manifest.json
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found in build directory');
    }

    const manifest = require(manifestPath);
    const pkg = require('../package.json');

    // Validate manifest version matches package.json
    if (manifest.version !== pkg.version) {
      throw new Error(`Version mismatch: manifest.json (${manifest.version}) != package.json (${pkg.version})`);
    }

    // Validate required fields
    const requiredFields = ['name', 'version', 'manifest_version'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(`Missing required field in manifest.json: ${field}`);
      }
    }

    // Validate file sizes
    const maxSize = 5 * 1024 * 1024; // 5MB
    const files = getAllFiles(buildDir);
    for (const file of files) {
      const stats = fs.statSync(file);
      if (stats.size > maxSize) {
        throw new Error(`File too large (>5MB): ${path.relative(buildDir, file)}`);
      }
    }

    // Use web-ext to lint the extension
    console.log('Running web-ext validation...');
    try {
      await execAsync(`npx web-ext lint --source-dir ${buildDir}`);
    } catch (error) {
      if (error.stderr && !error.stderr.includes('Your extension is valid')) {
        throw new Error(`web-ext validation failed: ${error.stderr}`);
      }
    }

    // Additional checks for common issues
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
  // Check for overly broad permissions
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
  // Check CSP settings
  const csp = manifest.content_security_policy?.extension_pages || 
              manifest.content_security_policy;

  if (!csp) {
    console.warn('⚠️ Warning: No Content Security Policy defined');
  } else if (csp.includes("'unsafe-eval'") || csp.includes("'unsafe-inline'")) {
    console.warn('⚠️ Warning: Using unsafe CSP directives may affect security');
  }
}

function getAllFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

validateExtension(); 