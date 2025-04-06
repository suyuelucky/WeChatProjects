#!/usr/bin/env node

/**
 * 转换ES模块语法为CommonJS语法
 * 
 * 用法: node convert-files.js ../miniprogram
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.argv[2] || '../miniprogram';

// 查找所有.cjs文件
function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      findFiles(fullPath, files);
    } else if (entry.name.endsWith('.cjs')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 转换文件内容
function convertFile(filePath) {
  console.log(`处理文件: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否包含ES模块语法
  const hasExportDefault = content.includes('export default');
  const hasExportConst = content.includes('export const');
  const hasImport = content.includes('import ');
  
  if (!hasExportDefault && !hasExportConst && !hasImport) {
    console.log(`  跳过: 没有检测到ES模块语法`);
    return;
  }
  
  // 替换import语句
  if (hasImport) {
    const importRegex = /import\s+(\w+|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g;
    content = content.replace(importRegex, (match, importName, modulePath) => {
      // 如果是命名导入 {x, y}
      if (importName.startsWith('{')) {
        const names = importName.replace(/[{}]/g, '').split(',').map(s => s.trim());
        return `const ${names.join(', ')} = require('${modulePath}');`;
      } 
      // 默认导入
      else {
        return `const ${importName} = require('${modulePath}');`;
      }
    });
  }
  
  // 替换export default语句
  if (hasExportDefault) {
    content = content.replace(/export\s+default\s+(\w+);?/g, 'module.exports = $1;');
  }
  
  // 替换命名导出
  if (hasExportConst) {
    // 先收集所有的命名导出
    const exportedNames = [];
    const exportConstRegex = /export\s+const\s+(\w+)\s*=/g;
    let match;
    
    while ((match = exportConstRegex.exec(content)) !== null) {
      exportedNames.push(match[1]);
    }
    
    // 替换单个命名导出
    content = content.replace(/export\s+const\s+/g, 'const ');
    
    // 添加模块导出对象
    if (exportedNames.length > 0 && !hasExportDefault) {
      if (exportedNames.length === 1) {
        content += `\nmodule.exports = { ${exportedNames[0]} };\n`;
      } else {
        content += '\nmodule.exports = {\n  ' + 
          exportedNames.join(',\n  ') + 
          '\n};\n';
      }
    }
  }
  
  // 写回文件
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  已转换: ES模块 -> CommonJS`);
}

// 主函数
function main() {
  const files = findFiles(rootDir);
  console.log(`发现 ${files.length} 个 .cjs 文件`);
  
  // 遍历并转换文件
  for (const filePath of files) {
    convertFile(filePath);
  }
  
  console.log('转换完成!');
}

// 执行
main(); 