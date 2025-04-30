const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');
require('dotenv').config();

const BUILD_DIR = path.join(__dirname, '../dist');
const BUILDS_DIR = path.join(__dirname, '../builds');
const OUTPUT_FILE = path.join(BUILDS_DIR, `${pkg.name}-v${pkg.version}.zip`);

async function createZip() {
  try {
    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error('Build directory not found. Run npm run build first.');
    }

    if (!fs.existsSync(BUILDS_DIR)) {
      fs.mkdirSync(BUILDS_DIR, { recursive: true });
    }

    const zip = new AdmZip();
    
    const addDirectoryToZip = (directory) => {
      const files = fs.readdirSync(directory);
      
      files.forEach((file) => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          addDirectoryToZip(filePath);
        } else {
          const zipPath = path.relative(BUILD_DIR, filePath);
          zip.addLocalFile(filePath, path.dirname(zipPath));
        }
      });
    };

    const manifestPath = path.join(BUILD_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found in build directory');
    }
    zip.addLocalFile(manifestPath);

    addDirectoryToZip(BUILD_DIR);
    zip.writeZip(OUTPUT_FILE);

    const stats = fs.statSync(OUTPUT_FILE);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Created ${path.relative(process.cwd(), OUTPUT_FILE)} (${sizeMB}MB)`);

    if (stats.size > 500 * 1024 * 1024) {
      console.warn('⚠️ Warning: Zip file exceeds Chrome Web Store limit of 500MB');
    }

  } catch (err) {
    console.error('❌ Error creating zip:', err.message);
    process.exit(1);
  }
}

createZip(); 