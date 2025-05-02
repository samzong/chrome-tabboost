const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const pkg = require("../package.json");
require("dotenv").config();

const BUILD_DIR = path.join(__dirname, "../build");
const BUILDS_DIR = path.join(__dirname, "../builds");
const OUTPUT_FILE = path.join(BUILDS_DIR, `${pkg.name}-v${pkg.version}.zip`);

async function createZip() {
  try {
    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error("Build directory not found. Run npm run build first.");
    }

    if (!fs.existsSync(BUILDS_DIR)) {
      fs.mkdirSync(BUILDS_DIR, { recursive: true });
    }

    const zip = new AdmZip();

    /**
     * Recursively adds a directory and its contents to the zip archive.
     * @param {AdmZip} zipInstance - The AdmZip instance.
     * @param {string} directoryPath - The path to the directory to add.
     * @param {string} baseDirectory - The base directory to calculate relative paths from.
     */
    const addDirectoryToZip = (zipInstance, directoryPath, baseDirectory) => {
      try {
        const files = fs.readdirSync(directoryPath);

        files.forEach((file) => {
          const filePath = path.join(directoryPath, file);
          try {
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
              // Recursively add subdirectory
              addDirectoryToZip(zipInstance, filePath, baseDirectory);
            } else {
              // Add file, calculating the path within the zip relative to the baseDirectory
              const zipPath = path.relative(baseDirectory, filePath);
              // Ensure the directory structure is maintained in the zip
              zipInstance.addLocalFile(filePath, path.dirname(zipPath));
            }
          } catch (statError) {
            console.warn(`⚠️ Warning: Could not stat file ${filePath}: ${statError.message}`);
            // Optionally skip the file or handle differently
          }
        });
      } catch (readError) {
         console.error(`❌ Error reading directory ${directoryPath}: ${readError.message}`);
         // Rethrow or handle as appropriate for your application's needs
         throw readError;
      }
    };

    const manifestPath = path.join(BUILD_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error("manifest.json not found in build directory");
    }
    // Add manifest file first, placing it at the root of the zip
    zip.addLocalFile(manifestPath, '');

    // Add the rest of the build directory contents
    addDirectoryToZip(zip, BUILD_DIR, BUILD_DIR);

    zip.writeZip(OUTPUT_FILE);

    const stats = fs.statSync(OUTPUT_FILE);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Created ${path.relative(process.cwd(), OUTPUT_FILE)} (${sizeMB}MB)`);

    if (stats.size > 500 * 1024 * 1024) {
      console.warn("⚠️ Warning: Zip file exceeds Chrome Web Store limit of 500MB");
    }
  } catch (err) {
    console.error("❌ Error creating zip:", err.message);
    process.exit(1);
  }
}

createZip();
