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

/**
 * 创建彩色渐变背景的banner图片
 * @param {string} fileName 文件名
 * @param {string} color1 渐变色1
 * @param {string} color2 渐变色2
 * @param {string} text 显示文字
 */
async function createBannerImage(fileName, color1, color2, text) {
  const width = 750;
  const height = 320;
  
  try {
    // 创建SVG渐变背景
    const svgImage = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
      <text x="50%" y="50%" font-family="Arial" font-size="48" fill="white" 
        text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
    `;
    
    const outputFile = path.join(outputDir, fileName);
    
    await sharp(Buffer.from(svgImage))
      .png()
      .toFile(outputFile);
    
    console.log(`创建成功: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`创建 ${fileName} 出错:`, error);
    return false;
  }
}

async function createAllBanners() {
  let success = true;
  
  // 创建两个不同的banner图片
  const banner1Success = await createBannerImage(
    'banner1.jpg', 
    '#4361ee', 
    '#3a0ca3', 
    '探索更多精彩内容'
  );
  
  const banner2Success = await createBannerImage(
    'banner2.jpg', 
    '#f72585', 
    '#7209b7', 
    '记录美好生活'
  );
  
  if (!banner1Success || !banner2Success) {
    success = false;
  }
  
  return success;
}

// 执行创建
createAllBanners().then(success => {
  if (success) {
    console.log('所有banner图片创建成功');
  } else {
    console.error('部分banner图片创建失败，请检查错误信息');
  }
}).catch(err => {
  console.error('创建banner图片过程中出错:', err);
}); 