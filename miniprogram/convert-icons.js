const fs = require('fs');
const path = require('path');
const svg2png = require('svg2png');

const svgDir = path.join(__dirname, 'images/tabbar');
const icons = ['home', 'home_selected', 'discover', 'discover_selected', 'message', 'message_selected', 'profile', 'profile_selected'];

async function convertSvgToPng() {
  for (const icon of icons) {
    const svgPath = path.join(svgDir, `${icon}.svg`);
    const pngPath = path.join(svgDir, `${icon}.png`);
    
    try {
      const svgBuffer = fs.readFileSync(svgPath);
      const pngBuffer = await svg2png(svgBuffer, { width: 81, height: 81 });
      fs.writeFileSync(pngPath, pngBuffer);
      console.log(`Converted ${icon}.svg to ${icon}.png`);
    } catch (error) {
      console.error(`Error converting ${icon}.svg: ${error.message}`);
    }
  }
}

convertSvgToPng().then(() => {
  console.log('All conversions completed');
}).catch(err => {
  console.error('Conversion error:', err);
}); 