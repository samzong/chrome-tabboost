const ChromeExtension = require('crx');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const crx = new ChromeExtension({
  privateKey: fs.readFileSync(path.join(__dirname, '../key.pem')),
});

const buildDir = path.join(__dirname, '../dist');
const outputFile = path.join(__dirname, `../chrome-tabboost-v${pkg.version}.crx`);

async function packageExtension() {
  try {
    const crxBuffer = await crx.load(buildDir).then(crx => crx.pack());

    fs.writeFileSync(outputFile, crxBuffer);
    
    console.log(`Created ${outputFile}`);
  } catch (err) {
    console.error('Error packaging extension:', err);
    if (err.message.includes('privateKey')) {
      console.log('\nTo generate a private key, run:');
      console.log('openssl genrsa -out key.pem 2048');
    }
    process.exit(1);
  }
}

packageExtension(); 