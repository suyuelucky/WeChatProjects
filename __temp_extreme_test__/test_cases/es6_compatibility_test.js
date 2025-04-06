/**
 * ES6兼容性极端测试
 * 测试目标：验证代码不含ES6特性，确保小程序兼容性
 */

// 模拟wx对象
if (typeof wx === 'undefined') {
  global.wx = {
    getStorageSync: function(key) { return null; },
    setStorageSync: function(key, data) {},
    getSystemInfo: function(options) {
      if (options && options.success) {
        options.success({
          SDKVersion: '2.10.0'
        });
      }
    }
  };
}

// 需要检查的文件路径
const targetFiles = [
  '../../utils/storageManager.js',
  '../../utils/offlineStorageSync.js',
  '../../utils/storageUtils.js',
  '../../utils/eventBus.js',
  '../../services/storageService.js'
];

// 检查文件内容中是否含有ES6特性
function checkForES6Features(fileContent) {
  // ES6 特性检测正则表达式
  const es6Features = [
    {
      name: '箭头函数',
      pattern: /\([^)]*\)\s*=>/g
    },
    {
      name: '解构赋值',
      pattern: /\{[^}]+\}\s*=\s*[^{;]+/g
    },
    {
      name: '扩展运算符',
      pattern: /\.\.\.[a-zA-Z0-9_$]+/g
    },
    {
      name: 'let或const关键字',
      pattern: /(let|const)\s+[a-zA-Z0-9_$]+/g
    },
    {
      name: '模板字符串',
      pattern: /`[^`]*`/g
    },
    {
      name: 'Promise语法',
      pattern: /new\s+Promise/g
    },
    {
      name: 'import语法',
      pattern: /import\s+.*from/g
    },
    {
      name: 'export语法',
      pattern: /export\s+(default|{|\*)/g
    },
    {
      name: 'class语法',
      pattern: /class\s+[A-Z][a-zA-Z0-9_$]*/g
    }
  ];

  const results = {
    hasES6Features: false,
    features: []
  };

  // 检查每种ES6特性
  es6Features.forEach(feature => {
    const matches = fileContent.match(feature.pattern);
    if (matches && matches.length > 0) {
      results.hasES6Features = true;
      results.features.push({
        name: feature.name,
        count: matches.length,
        examples: matches.slice(0, 3) // 最多显示3个例子
      });
    }
  });

  return results;
}

// 从文件中提取并检查注释
function checkComments(fileContent) {
  const commentRegex = /\/\/.*$|\/\*[\s\S]*?\*\//gm;
  const comments = fileContent.match(commentRegex) || [];
  
  return {
    count: comments.length,
    examples: comments.slice(0, 5) // 最多显示5个注释
  };
}

// 读取文件内容
function readFileContent(filePath) {
  try {
    // 在Node.js环境下使用fs模块
    const fs = require('fs');
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`无法读取文件 ${filePath}:`, error.message);
    return null;
  }
}

// 检查单个文件
function testFileCompatibility(filePath) {
  console.log(`\n检查文件: ${filePath}`);
  
  const content = readFileContent(filePath);
  if (!content) {
    return {
      file: filePath,
      success: false,
      error: '无法读取文件'
    };
  }
  
  // 检查ES6特性
  const es6Check = checkForES6Features(content);
  
  // 检查注释
  const commentCheck = checkComments(content);
  
  // 输出结果
  if (es6Check.hasES6Features) {
    console.log(`× 文件含有ES6特性:`);
    es6Check.features.forEach(feature => {
      console.log(`  - ${feature.name}: ${feature.count}处`);
      feature.examples.forEach(example => {
        console.log(`    例如: ${example}`);
      });
    });
  } else {
    console.log(`✓ 文件不含ES6特性`);
  }
  
  console.log(`✓ 文件包含${commentCheck.count}处注释`);
  
  return {
    file: filePath,
    success: !es6Check.hasES6Features,
    es6Features: es6Check.features,
    commentCount: commentCheck.count
  };
}

// 测试所有目标文件
function testAllFiles() {
  console.log('======================================================');
  console.log('             开始执行ES6兼容性极端测试                  ');
  console.log('======================================================');
  
  const results = [];
  
  targetFiles.forEach(file => {
    const result = testFileCompatibility(file);
    results.push(result);
  });
  
  // 汇总结果
  console.log('\n======================================================');
  console.log('                  测试结果汇总                        ');
  console.log('======================================================');
  
  let allPassed = true;
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✓ ${result.file}: 通过`);
    } else {
      console.log(`× ${result.file}: 失败 - ${result.es6Features.length}种ES6特性`);
      allPassed = false;
    }
  });
  
  console.log('\n总体结果:', allPassed ? '通过 ✓' : '失败 ×');
  
  return {
    allPassed,
    results
  };
}

// 运行测试
if (require.main === module) {
  testAllFiles();
} else {
  module.exports = {
    testAllFiles,
    testFileCompatibility
  };
} 