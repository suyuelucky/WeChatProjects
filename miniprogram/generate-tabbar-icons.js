import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, 'static/images');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 定义图标名称和颜色
const icons = {
  diary: {
    normal: { color: '#999999' },
    active: { color: '#000000' }
  },
  ledger: {
    normal: { color: '#999999' },
    active: { color: '#000000' }
  },
  discover: {
    normal: { color: '#999999' },
    active: { color: '#000000' }
  },
  profile: {
    normal: { color: '#999999' },
    active: { color: '#000000' }
  }
};

// SVG图标数据
const svgIcons = {
  diary: `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" 
    fill="none" stroke="{{color}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>`,
  ledger: `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" 
    fill="none" stroke="{{color}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="7" x2="20" y2="7"></line>
    <line x1="9" y1="12" x2="20" y2="12"></line>
    <line x1="9" y1="17" x2="20" y2="17"></line>
    <line x1="5" y1="7" x2="5" y2="7"></line>
    <line x1="5" y1="12" x2="5" y2="12"></line>
    <line x1="5" y1="17" x2="5" y2="17"></line>
  </svg>`,
  discover: `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" 
    fill="none" stroke="{{color}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
  </svg>`,
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" 
    fill="none" stroke="{{color}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>`
};

/**
 * 创建PNG图标
 * @param {string} name - 图标名称
 * @param {string} type - 图标类型 (normal 或 active)
 */
async function createPngIcon(name, type) {
  const color = icons[name][type].color;
  const svgData = svgIcons[name].replace('{{color}}', color);
  
  // 生成文件名
  const fileName = type === 'normal' ? `${name}.png` : `${name}-active.png`;
  const outputFile = path.join(outputDir, fileName);
  
  try {
    // 使用sharp将SVG转换为PNG
    await sharp(Buffer.from(svgData))
      .png()
      .toFile(outputFile);
    
    console.log(`创建成功: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`创建 ${fileName} 出错:`, error);
    return false;
  }
}

/**
 * 创建所有图标
 */
async function createAllIcons() {
  let success = true;
  
  for (const name of Object.keys(icons)) {
    const normalSuccess = await createPngIcon(name, 'normal');
    const activeSuccess = await createPngIcon(name, 'active');
    
    if (!normalSuccess || !activeSuccess) {
      success = false;
    }
  }
  
  return success;
}

// 执行创建
createAllIcons().then(success => {
  if (success) {
    console.log('所有图标创建成功');
  } else {
    console.error('部分图标创建失败，请检查错误信息');
  }
}).catch(err => {
  console.error('创建图标过程中出错:', err);
}); 