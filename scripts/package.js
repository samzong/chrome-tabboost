const ChromeExtension = require("crx");
const path = require("path");
const fs = require("fs-extra");
const pkg = require("../package.json");

const crx = new ChromeExtension({
  privateKey: fs.readFileSync(path.join(__dirname, "../key.pem")),
});

// Directory where the unpacked extension build is stored
const BUILD_DIR = path.join(__dirname, "../build");
// Directory where the packaged .zip files are stored
const BUILDS_DIR = path.join(__dirname, "../builds");
// Default output filename for the packaged extension
const OUTPUT_FILE = path.join(BUILDS_DIR, `${pkg.name}-v${pkg.version}.crx`);

// Ensure the builds directory exists
fs.ensureDirSync(BUILDS_DIR);

async function packageExtension() {
  try {
    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error("Build directory not found. Run npm run build first.");
    }

    if (!fs.existsSync(BUILDS_DIR)) {
      fs.mkdirSync(BUILDS_DIR, { recursive: true });
    }

    const crxBuffer = await crx.load(BUILD_DIR).then((crx) => crx.pack());

    fs.writeFileSync(OUTPUT_FILE, crxBuffer);

    console.log(`Created ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Error packaging extension:", err);
    if (err.message.includes("privateKey")) {
      console.log("\nTo generate a private key, run:");
      console.log("openssl genrsa -out key.pem 2048");
    }
    process.exit(1);
  }
}

packageExtension();
