/**
 * 博客模块修复集成脚本
 * 创建时间：2025年04月11日 00:12:43
 * 创建者：Claude助手
 * 
 * 本脚本用于自动集成博客模块的五个修复模块
 * 使用方法: 
 * 1. 将本脚本放置在项目根目录下
 * 2. 在终端中执行: node 博客模块修复集成脚本.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 创建命令行交互界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 项目路径配置
const CONFIG = {
  // 源修复模块路径（相对于脚本位置）
  sourcePath: './AI开发计划',
  
  // 目标代码路径（相对于脚本位置）
  targetPath: './miniprogram',
  
  // 需要创建的工具文件
  utilFiles: [
    {
      name: 'blog-routes.js',
      sourceModule: '博客模块修复5-URL路径格式.js',
      targetDir: 'utils'
    },
    {
      name: 'blog-performance.js',
      sourceModule: '博客模块修复2-性能优化冲突.js',
      targetDir: 'utils'
    },
    {
      name: 'navBarUtils.js',
      sourceModule: '博客模块修复3-导航栏样式问题.js',
      targetDir: 'utils'
    }
  ],
  
  // 需要修改的页面文件
  pageFiles: [
    {
      path: 'pages/blog/index/index.js',
      modifications: [
        { module: '博客模块修复1-图片索引问题.js', functionName: 'onImageError' },
        { module: '博客模块修复4-重复导航函数.js', functionName: 'navigateToBlogDetail' },
        { module: '博客模块修复4-重复导航函数.js', functionName: 'onTapBlogItem' },
        { module: '博客模块修复4-重复导航函数.js', functionName: 'goDetail' }
      ]
    },
    {
      path: 'pages/blog/index/index.wxml',
      template: true,
      module: '博客模块修复1-图片索引问题.js',
      section: 'WXML修改部分'
    },
    {
      path: 'pages/blog/index/index.wxss',
      style: true,
      module: '博客模块修复3-导航栏样式问题.js',
      section: 'WXSS修改部分'
    }
  ]
};

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 打印带颜色的消息
 * @param {string} message 消息内容
 * @param {string} color 颜色代码
 */
function colorLog(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * 检查文件或目录是否存在
 * @param {string} filePath 文件路径
 * @returns {boolean} 是否存在
 */
function checkExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 从修复模块中提取代码部分
 * @param {string} moduleContent 模块内容
 * @param {string} sectionName 区域名称
 * @returns {string} 提取的代码
 */
function extractCodeSection(moduleContent, sectionName) {
  const sectionPattern = new RegExp(`// =+\\s*${sectionName}\\s*=+\\s*([\\s\\S]*?)(?:// =+|$)`, 'i');
  const match = moduleContent.match(sectionPattern);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

/**
 * 从修复模块中提取函数定义
 * @param {string} moduleContent 模块内容
 * @param {string} functionName 函数名
 * @returns {string} 函数定义代码
 */
function extractFunction(moduleContent, functionName) {
  // 匹配函数定义 - 支持多种定义方式
  const patterns = [
    // 常规函数定义: function name() {}
    new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`, 'g'),
    
    // 箭头函数: const name = () => {}
    new RegExp(`const\\s+${functionName}\\s*=\\s*(?:function\\s*)?\\([^)]*\\)\\s*(?:=>)?\\s*\\{[\\s\\S]*?\\n\\}`, 'g'),
    
    // 对象方法: name: function() {}
    new RegExp(`${functionName}\\s*:\\s*function\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\s*\\}`, 'g')
  ];
  
  for (const pattern of patterns) {
    const match = moduleContent.match(pattern);
    if (match && match[0]) {
      return match[0];
    }
  }
  
  return null;
}

/**
 * 从修复模块中提取WXML模板
 * @param {string} moduleContent 模块内容
 * @returns {string} WXML模板代码
 */
function extractWxmlTemplate(moduleContent) {
  // 查找修复后的WXML模板
  const wxmlPattern = /修复后(?:的)?(?:代码|WXML)：\s*\n\s*\*\s*\n([\s\S]*?)(?:\s*\*\s*\/|\n\s*\/\*\*)/;
  const match = moduleContent.match(wxmlPattern);
  
  if (match && match[1]) {
    // 移除注释标记并整理格式
    return match[1]
      .replace(/^\s*\*\s*/gm, '')  // 移除行首的 * 
      .replace(/^\s*\<\!\-\-.*?\-\-\>\s*$/gm, '')  // 移除HTML注释行
      .trim();
  }
  
  return null;
}

/**
 * 从修复模块中提取WXSS样式
 * @param {string} moduleContent 模块内容
 * @returns {string} WXSS样式代码
 */
function extractWxssStyle(moduleContent) {
  // 查找修复后的WXSS样式
  const wxssPattern = /修复后(?:的)?(?:导航栏)?WXSS：\s*\n\s*\*\s*\n([\s\S]*?)(?:\s*\*\s*\/|\n\s*\/\*\*)/;
  const match = moduleContent.match(wxssPattern);
  
  if (match && match[1]) {
    // 移除注释标记并整理格式
    return match[1]
      .replace(/^\s*\*\s*/gm, '')  // 移除行首的 * 
      .replace(/^\s*\/\*.*?\*\/\s*$/gm, '')  // 移除CSS注释行
      .trim();
  }
  
  return null;
}

/**
 * 创建工具文件
 * @param {Object} fileConfig 文件配置
 * @returns {Promise<boolean>} 是否成功
 */
async function createUtilFile(fileConfig) {
  try {
    const sourceFile = path.join(CONFIG.sourcePath, fileConfig.sourceModule);
    const targetDir = path.join(CONFIG.targetPath, fileConfig.targetDir);
    const targetFile = path.join(targetDir, fileConfig.name);
    
    // 检查源文件
    if (!checkExists(sourceFile)) {
      colorLog(`源文件不存在: ${sourceFile}`, colors.red);
      return false;
    }
    
    // 确保目标目录存在
    if (!checkExists(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 读取源模块内容
    const moduleContent = fs.readFileSync(sourceFile, 'utf8');
    
    // 提取所需代码
    // 这里我们假设工具文件就是整个模块内容，但移除头部注释
    // 实际情况可能需要更复杂的处理
    let utilCode = moduleContent;
    
    // 移除头部注释和历史代码部分
    utilCode = utilCode.replace(/\/\*\*[\s\S]*?\*\/\s*\n\s*\/\*\*[\s\S]*?\*\/\s*\n/, '');
    
    // 添加新的头部注释
    const headerComment = `/**
 * ${path.basename(fileConfig.name, '.js')}
 * 创建时间：${new Date().toLocaleString('zh-CN', { 
   year: 'numeric', 
   month: '2-digit', 
   day: '2-digit',
   hour: '2-digit',
   minute: '2-digit',
   second: '2-digit',
   hour12: false
 }).replace(/\//g, '-')}
 * 自动生成自: ${fileConfig.sourceModule}
 */\n\n`;
    
    // 写入目标文件
    fs.writeFileSync(targetFile, headerComment + utilCode);
    
    colorLog(`✅ 已创建工具文件: ${targetFile}`, colors.green);
    return true;
  } catch (error) {
    colorLog(`创建工具文件失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 修改页面JS文件
 * @param {Object} fileConfig 文件配置
 * @returns {Promise<boolean>} 是否成功
 */
async function modifyPageJsFile(fileConfig) {
  try {
    const targetFile = path.join(CONFIG.targetPath, fileConfig.path);
    
    // 检查目标文件
    if (!checkExists(targetFile)) {
      colorLog(`目标文件不存在: ${targetFile}`, colors.red);
      return false;
    }
    
    // 读取目标文件内容
    let pageContent = fs.readFileSync(targetFile, 'utf8');
    
    // 处理每个需要修改的函数
    for (const mod of fileConfig.modifications) {
      const sourceFile = path.join(CONFIG.sourcePath, mod.module);
      
      // 检查源文件
      if (!checkExists(sourceFile)) {
        colorLog(`源文件不存在: ${sourceFile}`, colors.yellow);
        continue;
      }
      
      // 读取源模块内容
      const moduleContent = fs.readFileSync(sourceFile, 'utf8');
      
      // 提取函数定义
      const functionCode = extractFunction(moduleContent, mod.functionName);
      
      if (!functionCode) {
        colorLog(`在模块 ${mod.module} 中未找到函数 ${mod.functionName}`, colors.yellow);
        continue;
      }
      
      // 检查函数是否已经存在
      const functionPattern = new RegExp(`(function\\s+${mod.functionName}|${mod.functionName}\\s*:|const\\s+${mod.functionName}\\s*=)`, 'g');
      
      if (pageContent.match(functionPattern)) {
        // 询问用户是否替换
        const answer = await new Promise(resolve => {
          rl.question(`函数 ${mod.functionName} 已存在，是否替换？(y/n): `, resolve);
        });
        
        if (answer.toLowerCase() !== 'y') {
          colorLog(`跳过替换函数 ${mod.functionName}`, colors.yellow);
          continue;
        }
        
        // 替换函数
        const replaceFunctionPattern = new RegExp(`(function\\s+${mod.functionName}|${mod.functionName}\\s*:|const\\s+${mod.functionName}\\s*=)[\\s\\S]*?\\n\\s*\\}`, 'g');
        pageContent = pageContent.replace(replaceFunctionPattern, functionCode);
      } else {
        // 在文件末尾添加函数
        // 找到文件结尾的大括号
        const pageEndPattern = /\}\s*\);\s*$/;
        
        if (pageContent.match(pageEndPattern)) {
          pageContent = pageContent.replace(pageEndPattern, `  // 添加于 ${new Date().toLocaleString('zh-CN')}\n  ${functionCode},\n});`);
        } else {
          // 如果没有找到结尾模式，则简单地附加
          pageContent += `\n\n// 添加于 ${new Date().toLocaleString('zh-CN')}\n${functionCode}\n`;
        }
      }
      
      colorLog(`✅ 已添加/替换函数 ${mod.functionName}`, colors.green);
    }
    
    // 添加导入语句
    if (!pageContent.includes('import BlogRoutes')) {
      const importStatement = `import BlogRoutes from '../../../utils/blog-routes';\nconst { BlogNavigator, BlogUrlBuilder, BlogParamParser } = BlogRoutes;\n\n`;
      pageContent = importStatement + pageContent;
      colorLog(`✅ 已添加 BlogRoutes 导入`, colors.green);
    }
    
    // 写入修改后的内容
    fs.writeFileSync(targetFile, pageContent);
    
    colorLog(`✅ 已修改页面JS文件: ${targetFile}`, colors.green);
    return true;
  } catch (error) {
    colorLog(`修改页面JS文件失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 修改WXML模板文件
 * @param {Object} fileConfig 文件配置
 * @returns {Promise<boolean>} 是否成功
 */
async function modifyWxmlFile(fileConfig) {
  try {
    const targetFile = path.join(CONFIG.targetPath, fileConfig.path);
    const sourceFile = path.join(CONFIG.sourcePath, fileConfig.module);
    
    // 检查文件
    if (!checkExists(targetFile)) {
      colorLog(`目标文件不存在: ${targetFile}`, colors.red);
      return false;
    }
    
    if (!checkExists(sourceFile)) {
      colorLog(`源文件不存在: ${sourceFile}`, colors.red);
      return false;
    }
    
    // 读取文件内容
    const moduleContent = fs.readFileSync(sourceFile, 'utf8');
    const wxmlContent = fs.readFileSync(targetFile, 'utf8');
    
    // 提取WXML模板
    const template = extractWxmlTemplate(moduleContent);
    
    if (!template) {
      colorLog(`在模块 ${fileConfig.module} 中未找到WXML模板`, colors.yellow);
      return false;
    }
    
    // 询问用户是否替换
    const answer = await new Promise(resolve => {
      rl.question(`是否替换 ${targetFile} 中的WXML模板？(y/n): `, resolve);
    });
    
    if (answer.toLowerCase() !== 'y') {
      colorLog(`跳过替换WXML模板`, colors.yellow);
      return false;
    }
    
    // 替换整个文件内容
    fs.writeFileSync(targetFile, template);
    
    colorLog(`✅ 已修改WXML文件: ${targetFile}`, colors.green);
    return true;
  } catch (error) {
    colorLog(`修改WXML文件失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 修改WXSS样式文件
 * @param {Object} fileConfig 文件配置
 * @returns {Promise<boolean>} 是否成功
 */
async function modifyWxssFile(fileConfig) {
  try {
    const targetFile = path.join(CONFIG.targetPath, fileConfig.path);
    const sourceFile = path.join(CONFIG.sourcePath, fileConfig.module);
    
    // 检查文件
    if (!checkExists(targetFile)) {
      colorLog(`目标文件不存在: ${targetFile}`, colors.red);
      return false;
    }
    
    if (!checkExists(sourceFile)) {
      colorLog(`源文件不存在: ${sourceFile}`, colors.red);
      return false;
    }
    
    // 读取文件内容
    const moduleContent = fs.readFileSync(sourceFile, 'utf8');
    const wxssContent = fs.readFileSync(targetFile, 'utf8');
    
    // 提取WXSS样式
    const style = extractWxssStyle(moduleContent);
    
    if (!style) {
      colorLog(`在模块 ${fileConfig.module} 中未找到WXSS样式`, colors.yellow);
      return false;
    }
    
    // 询问用户是添加还是替换
    const answer = await new Promise(resolve => {
      rl.question(`是否添加样式到 ${targetFile}？(add/replace/n): `, resolve);
    });
    
    if (answer.toLowerCase() === 'n') {
      colorLog(`跳过修改WXSS样式`, colors.yellow);
      return false;
    }
    
    if (answer.toLowerCase() === 'replace') {
      // 替换整个文件内容
      fs.writeFileSync(targetFile, style);
    } else {
      // 添加到文件末尾
      const updatedContent = wxssContent + '\n\n/* 添加于 ' + new Date().toLocaleString('zh-CN') + ' */\n' + style;
      fs.writeFileSync(targetFile, updatedContent);
    }
    
    colorLog(`✅ 已修改WXSS文件: ${targetFile}`, colors.green);
    return true;
  } catch (error) {
    colorLog(`修改WXSS文件失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    colorLog('===== 博客模块修复集成脚本 =====', colors.cyan + colors.bright);
    colorLog('该脚本将帮助你自动集成博客模块的五个修复模块', colors.cyan);
    
    // 检查项目路径
    if (!checkExists(CONFIG.sourcePath)) {
      colorLog(`源修复模块路径不存在: ${CONFIG.sourcePath}`, colors.red);
      process.exit(1);
    }
    
    if (!checkExists(CONFIG.targetPath)) {
      colorLog(`目标代码路径不存在: ${CONFIG.targetPath}`, colors.red);
      process.exit(1);
    }
    
    // 询问用户是否开始
    const startAnswer = await new Promise(resolve => {
      rl.question('是否开始集成？(y/n): ', resolve);
    });
    
    if (startAnswer.toLowerCase() !== 'y') {
      colorLog('集成已取消', colors.yellow);
      process.exit(0);
    }
    
    // 1. 创建工具文件
    colorLog('\n[1/3] 创建工具文件...', colors.blue);
    for (const fileConfig of CONFIG.utilFiles) {
      await createUtilFile(fileConfig);
    }
    
    // 2. 修改页面JS文件
    colorLog('\n[2/3] 修改页面JS文件...', colors.blue);
    for (const fileConfig of CONFIG.pageFiles) {
      if (!fileConfig.template && !fileConfig.style) {
        await modifyPageJsFile(fileConfig);
      }
    }
    
    // 3. 修改WXML和WXSS文件
    colorLog('\n[3/3] 修改WXML和WXSS文件...', colors.blue);
    for (const fileConfig of CONFIG.pageFiles) {
      if (fileConfig.template) {
        await modifyWxmlFile(fileConfig);
      } else if (fileConfig.style) {
        await modifyWxssFile(fileConfig);
      }
    }
    
    colorLog('\n✨ 集成完成！', colors.green + colors.bright);
    colorLog('请检查修改后的文件，并进行测试验证。', colors.green);
    
    // 提示下一步操作
    colorLog('\n建议的后续步骤:', colors.magenta);
    colorLog('1. 检查所有修改的文件，确保代码格式正确', colors.magenta);
    colorLog('2. 按照「博客模块综合修复方案.md」中的测试与验证部分进行测试', colors.magenta);
    colorLog('3. 如有必要，手动调整部分代码以更好地适应项目需求', colors.magenta);
    
    rl.close();
  } catch (error) {
    colorLog(`脚本执行出错: ${error.message}`, colors.red);
    rl.close();
    process.exit(1);
  }
}

// 运行主函数
main(); 