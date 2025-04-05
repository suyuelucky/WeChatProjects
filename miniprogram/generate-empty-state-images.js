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
 * 创建空状态图片
 * @param {string} fileName 文件名
 * @param {string} icon 图标文本
 * @param {string} color 颜色
 */
async function createEmptyStateImage(fileName, icon, color) {
  const width = 200;
  const height = 200;
  
  try {
    // 创建SVG空状态图片
    const svgImage = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="none" />
      <text x="50%" y="45%" font-family="Arial" font-size="72" fill="${color}" 
        text-anchor="middle" dominant-baseline="middle">${icon}</text>
      <text x="50%" y="75%" font-family="Arial" font-size="18" fill="${color}" 
        text-anchor="middle" dominant-baseline="middle">暂无数据</text>
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

async function createAllEmptyStateImages() {
  let success = true;
  
  // 创建空状态图片
  const emptyDiarySuccess = await createEmptyStateImage(
    'empty-diary.png', 
    '📝', 
    '#8A8A8A'
  );
  
  const emptyLedgerSuccess = await createEmptyStateImage(
    'empty-ledger.png', 
    '💰', 
    '#8A8A8A'
  );
  
  const emptyDiscoverSuccess = await createEmptyStateImage(
    'empty-discover.png', 
    '🔍', 
    '#8A8A8A'
  );
  
  if (!emptyDiarySuccess || !emptyLedgerSuccess || !emptyDiscoverSuccess) {
    success = false;
  }
  
  return success;
}

// 执行创建
createAllEmptyStateImages().then(success => {
  if (success) {
    console.log('所有空状态图片创建成功');
  } else {
    console.error('部分空状态图片创建失败，请检查错误信息');
  }
}).catch(err => {
  console.error('创建空状态图片过程中出错:', err);
}); 