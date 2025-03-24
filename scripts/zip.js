const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');
require('dotenv').config();

// Constants
const BUILD_DIR = path.join(__dirname, '../dist');
const BUILDS_DIR = path.join(__dirname, '../builds');
const OUTPUT_FILE = path.join(BUILDS_DIR, `${pkg.name}-v${pkg.version}.zip`);

async function createZip() {
  try {
    // Validate build directory
    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error('Build directory not found. Run npm run build first.');
    }

    // Create builds directory if it doesn't exist
    if (!fs.existsSync(BUILDS_DIR)) {
      fs.mkdirSync(BUILDS_DIR, { recursive: true });
    }

    // Create a new zip file
    const zip = new AdmZip();
    
    // Add all files from build directory
    const addDirectoryToZip = (directory) => {
      const files = fs.readdirSync(directory);
      
      files.forEach((file) => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          addDirectoryToZip(filePath);
        } else {
          // Add file to zip, preserving directory structure
          const zipPath = path.relative(BUILD_DIR, filePath);
          zip.addLocalFile(filePath, path.dirname(zipPath));
        }
      });
    };

    // Add manifest.json first (required by Chrome Web Store)
    const manifestPath = path.join(BUILD_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found in build directory');
    }
    zip.addLocalFile(manifestPath);

    // Add all other files
    addDirectoryToZip(BUILD_DIR);

    // Write the zip file
    zip.writeZip(OUTPUT_FILE);

    const stats = fs.statSync(OUTPUT_FILE);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Created ${path.relative(process.cwd(), OUTPUT_FILE)} (${sizeMB}MB)`);

    // Validate zip size for Chrome Web Store (max 500MB)
    if (stats.size > 500 * 1024 * 1024) {
      console.warn('⚠️ Warning: Zip file exceeds Chrome Web Store limit of 500MB');
    }

  } catch (err) {
    console.error('❌ Error creating zip:', err.message);
    process.exit(1);
  }
}

createZip(); 