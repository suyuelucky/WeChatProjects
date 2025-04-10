/**
 * 路径格式测试文件
 * 创建时间：2025年04月10日 22:20:15
 * 创建者：Claude助手
 * 修改时间：2025年05月12日 19:35:08 修正路径验证规则
 * 修改时间：2025年04月10日 23:16:00 修复模块导出语法为CommonJS规范
 */

// 测试不同路径格式的有效性
const testPaths = {
  // 正确格式
  correctPaths: [
    '/pages/blog/index/index',
    '/pages/blog/detail/index?id=1',
    '/pages/blog/publish/index',
    '../detail/index'
  ],
  
  // 错误格式（在小程序中可能导致问题）
  incorrectPaths: [
    '/miniprogram/pages/blog/index/index', // 错误：包含miniprogram
    'miniprogram/pages/blog/detail/index', // 错误：包含miniprogram
    './pages/blog/publish/index'           // 错误：相对路径不正确
  ]
};

/**
 * 验证页面路径的有效性
 * 这个函数在实际项目中可以用来测试路径格式是否符合小程序规范
 */
function validatePath(path) {
  // 检查是否包含"miniprogram"
  if (path.includes('miniprogram')) {
    console.error(`路径格式错误: ${path} - 不应包含"miniprogram"`);
    return false;
  }
  
  // 检查相对路径格式
  if (path.startsWith('./pages/')) {
    console.error(`路径格式错误: ${path} - 相对路径格式不正确`);
    return false;
  }
  
  console.log(`路径格式正确: ${path}`);
  return true;
}

// 使用CommonJS规范导出函数
function runPathTests() {
  console.log('=== 开始测试路径格式 ===');
  
  console.log('\n测试正确的路径:');
  testPaths.correctPaths.forEach(validatePath);
  
  console.log('\n测试错误的路径:');
  testPaths.incorrectPaths.forEach(validatePath);
  
  console.log('\n=== 路径测试完成 ===');
}

// 使用CommonJS规范导出
module.exports = {
  testPaths,
  validatePath,
  runPathTests
}; 