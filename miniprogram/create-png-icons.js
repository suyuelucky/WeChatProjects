const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, 'images/tabbar');

// 定义简单的图标形状数据
const icons = {
  home: {
    normal: { color: '#999999' },
    selected: { color: '#ff9500' }
  },
  discover: {
    normal: { color: '#999999' },
    selected: { color: '#ff9500' }
  },
  message: {
    normal: { color: '#999999' },
    selected: { color: '#ff9500' }
  },
  profile: {
    normal: { color: '#999999' },
    selected: { color: '#ff9500' }
  }
};

async function createPngIcon(name, type) {
  const color = icons[name][type].color;
  
  // 根据图标名称创建不同的SVG数据
  let svgData;
  
  if (name === 'home') {
    svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>`;
  } else if (name === 'discover') {
    svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
    </svg>`;
  } else if (name === 'message') {
    svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>`;
  } else if (name === 'profile') {
    svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>`;
  }
  
  // 生成文件名
  const fileName = type === 'normal' ? `${name}.png` : `${name}_selected.png`;
  const outputFile = path.join(iconsDir, fileName);
  
  try {
    // 使用sharp将SVG转换为PNG
    await sharp(Buffer.from(svgData))
      .png()
      .toFile(outputFile);
    
    console.log(`Created: ${fileName}`);
  } catch (error) {
    console.error(`Error creating ${fileName}:`, error);
  }
}

async function createAllIcons() {
  // 确保目录存在
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  // 创建所有图标
  for (const name of Object.keys(icons)) {
    await createPngIcon(name, 'normal');
    await createPngIcon(name, 'selected');
  }
}

createAllIcons().then(() => {
  console.log('All icons created successfully');
}).catch(err => {
  console.error('Error creating icons:', err);
}); 