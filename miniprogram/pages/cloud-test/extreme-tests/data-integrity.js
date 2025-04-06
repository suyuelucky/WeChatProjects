/**
 * 云开发极端测试套件 - 数据完整性测试
 * 测试云函数、数据库和存储在极端情况下的数据完整性
 */

// 获取应用实例
const app = getApp();

// 测试配置
const config = {
  // 超长字符串测试长度（超过数据库文档大小限制）
  longStringLength: 1024 * 1024, // 1MB
  
  // 大量嵌套对象的深度
  objectNestingDepth: 30,
  
  // 大量字段的对象字段数
  largeObjectFieldCount: 200,
  
  // 特殊字符集（包含各种可能导致问题的字符）
  specialChars: '!@#$%^&*()_+{}[]|\\:;"\'<>,.?/~`™€£¥©®℗℠℅№℃℉°℗♠♣♥♦♪♫♯✓✔✕✖✗✘☐☑☒☓☕☭♲♽⚐⚑⚒⚔⚙⚛⚠⚡⚪⚫⚽⚾⛄⛅⛔⛪⛲⛵⛺⛽✈✉✍✎✏✒'
};

/**
 * 生成指定深度的嵌套对象
 * @param {Number} depth 嵌套深度
 * @returns {Object} 嵌套对象
 */
function generateNestedObject(depth) {
  if (depth <= 0) {
    return { 
      leaf: true, 
      value: `嵌套终点-${Date.now()}-${Math.random().toString(36).substring(2, 15)}` 
    };
  }
  
  return {
    level: depth,
    timestamp: Date.now(),
    random: Math.random(),
    nested: generateNestedObject(depth - 1)
  };
}

/**
 * 生成包含大量字段的对象
 * @param {Number} fieldCount 字段数量
 * @returns {Object} 包含大量字段的对象
 */
function generateLargeObject(fieldCount) {
  const result = {};
  
  for (let i = 0; i < fieldCount; i++) {
    result[`field_${i}`] = {
      index: i,
      value: `字段值-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now(),
      random: Math.random(),
      boolean: i % 2 === 0,
      nested: {
        a: i * 2,
        b: `嵌套值-${i}`,
        c: i % 3 === 0
      }
    };
  }
  
  return result;
}

/**
 * 生成超长字符串
 * @param {Number} length 字符串长度
 * @returns {String} 超长字符串
 */
function generateLongString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  
  // 添加一个标记头，方便验证
  result = `LONG_STRING_TEST_${Date.now()}_`;
  
  // 填充剩余长度
  for (let i = result.length; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

/**
 * 生成包含特殊字符的对象
 * @returns {Object} 包含特殊字符的对象
 */
function generateSpecialCharObject() {
  const result = {};
  
  // 字段名包含特殊字符
  const specialFieldNames = [
    'field.with.dots',
    'field$with$dollars',
    'field[with]brackets',
    'field-with-dashes',
    'field with spaces',
    '字段带中文',
    'field😀with😎emoji'
  ];
  
  // 为每个特殊字段名创建值
  specialFieldNames.forEach(fieldName => {
    result[fieldName] = `值-${fieldName}-${Date.now()}`;
  });
  
  // 特殊字符值
  result.specialCharValue = config.specialChars;
  
  // 正则表达式字符
  result.regexChars = '^$.*+?()[]{}|\\';
  
  // XML/HTML 特殊字符
  result.xmlChars = '<div class="test">This & that</div>';
  
  // JSON 特殊字符
  result.jsonChars = '{"key": "value", "nested": {"array": [1, 2, 3]}}';
  
  // SQL 注入测试
  result.sqlInjection = "'; DROP TABLE users; --";
  
  // NoSQL 注入测试
  result.noSqlInjection = '{ $ne: null }';
  
  // 零宽字符
  result.zeroWidth = 'Zero​Width​Character';
  
  return result;
}

/**
 * 测试超长字符串存储
 */
async function testLongStringStorage() {
  console.log('[极端测试] 开始超长字符串存储测试');
  
  try {
    // 生成超长字符串
    const longString = generateLongString(config.longStringLength);
    console.log(`[极端测试] 生成了长度为 ${longString.length} 的字符串`);
    
    // 尝试存储到数据库
    try {
      console.log('[极端测试] 尝试将超长字符串直接存储到数据库...');
      
      const result = await wx.cloud.callFunction({
        name: 'manageUser',
        data: {
          action: 'update',
          data: {
            extremeTest: true,
            longString: longString,
            testType: 'longString',
            timestamp: Date.now()
          }
        }
      });
      
      console.log('[极端测试] 超长字符串存储结果:', result.result);
      
      return {
        test: 'longString',
        success: result.result.success,
        result: result.result,
        stringLength: longString.length
      };
    } catch (err) {
      console.log('[极端测试] 超长字符串直接存储失败，尝试分块存储...');
      
      // 分块存储测试
      const chunks = [];
      const chunkSize = 100 * 1024; // 100KB chunks
      
      for (let i = 0; i < longString.length; i += chunkSize) {
        chunks.push(longString.substring(i, i + chunkSize));
      }
      
      console.log(`[极端测试] 将超长字符串分为 ${chunks.length} 块进行存储`);
      
      const result = await wx.cloud.callFunction({
        name: 'manageUser',
        data: {
          action: 'update',
          data: {
            extremeTest: true,
            longStringChunks: chunks,
            chunkCount: chunks.length,
            totalLength: longString.length,
            testType: 'longStringChunked',
            timestamp: Date.now()
          }
        }
      });
      
      console.log('[极端测试] 超长字符串分块存储结果:', result.result);
      
      return {
        test: 'longStringChunked',
        success: result.result.success,
        result: result.result,
        originalError: err.message || err.errMsg,
        chunks: chunks.length,
        stringLength: longString.length
      };
    }
  } catch (err) {
    console.error('[极端测试] 超长字符串测试失败:', err);
    return {
      test: 'longString',
      success: false,
      error: err.message || err.errMsg
    };
  }
}

/**
 * 测试深度嵌套对象存储
 */
async function testNestedObjectStorage() {
  console.log('[极端测试] 开始深度嵌套对象存储测试');
  
  try {
    // 生成深度嵌套对象
    const nestedObject = generateNestedObject(config.objectNestingDepth);
    console.log(`[极端测试] 生成了嵌套深度为 ${config.objectNestingDepth} 的对象`);
    
    // 尝试存储到数据库
    const result = await wx.cloud.callFunction({
      name: 'manageUser',
      data: {
        action: 'update',
        data: {
          extremeTest: true,
          nestedObject: nestedObject,
          nestingDepth: config.objectNestingDepth,
          testType: 'nestedObject',
          timestamp: Date.now()
        }
      }
    });
    
    console.log('[极端测试] 嵌套对象存储结果:', result.result);
    
    return {
      test: 'nestedObject',
      success: result.result.success,
      result: result.result,
      nestingDepth: config.objectNestingDepth
    };
  } catch (err) {
    console.error('[极端测试] 深度嵌套对象测试失败:', err);
    return {
      test: 'nestedObject',
      success: false,
      error: err.message || err.errMsg
    };
  }
}

/**
 * 测试大量字段对象存储
 */
async function testLargeObjectStorage() {
  console.log('[极端测试] 开始大量字段对象存储测试');
  
  try {
    // 生成大量字段的对象
    const largeObject = generateLargeObject(config.largeObjectFieldCount);
    console.log(`[极端测试] 生成了包含 ${config.largeObjectFieldCount} 个字段的对象`);
    
    // 尝试存储到数据库
    const result = await wx.cloud.callFunction({
      name: 'manageUser',
      data: {
        action: 'update',
        data: {
          extremeTest: true,
          largeObject: largeObject,
          fieldCount: config.largeObjectFieldCount,
          testType: 'largeObject',
          timestamp: Date.now()
        }
      }
    });
    
    console.log('[极端测试] 大量字段对象存储结果:', result.result);
    
    return {
      test: 'largeObject',
      success: result.result.success,
      result: result.result,
      fieldCount: config.largeObjectFieldCount
    };
  } catch (err) {
    console.error('[极端测试] 大量字段对象测试失败:', err);
    return {
      test: 'largeObject',
      success: false,
      error: err.message || err.errMsg
    };
  }
}

/**
 * 测试特殊字符处理
 */
async function testSpecialCharHandling() {
  console.log('[极端测试] 开始特殊字符处理测试');
  
  try {
    // 生成包含特殊字符的对象
    const specialCharObject = generateSpecialCharObject();
    console.log('[极端测试] 生成了包含特殊字符的对象');
    
    // 尝试存储到数据库
    const result = await wx.cloud.callFunction({
      name: 'manageUser',
      data: {
        action: 'update',
        data: {
          extremeTest: true,
          specialCharObject: specialCharObject,
          testType: 'specialChar',
          timestamp: Date.now()
        }
      }
    });
    
    console.log('[极端测试] 特殊字符对象存储结果:', result.result);
    
    // 读取回数据进行验证
    const readResult = await wx.cloud.callFunction({
      name: 'manageUser',
      data: {
        action: 'get'
      }
    });
    
    console.log('[极端测试] 特殊字符对象读取结果:', readResult.result);
    
    // 验证数据完整性
    let dataComplete = false;
    let verificationDetails = {};
    
    if (readResult.result.success && readResult.result.data) {
      const savedData = readResult.result.data.specialCharObject;
      
      if (savedData) {
        // 验证特殊字段名是否存在
        const expectedFields = Object.keys(specialCharObject);
        const actualFields = Object.keys(savedData);
        
        // 检查所有字段是否都被保存了
        const missingFields = expectedFields.filter(field => !actualFields.includes(field));
        
        // 验证字段值是否正确
        const valueChecks = {};
        actualFields.forEach(field => {
          valueChecks[field] = savedData[field] === specialCharObject[field];
        });
        
        dataComplete = missingFields.length === 0;
        verificationDetails = {
          expectedFieldCount: expectedFields.length,
          actualFieldCount: actualFields.length,
          missingFields,
          valueChecks
        };
      }
    }
    
    return {
      test: 'specialChar',
      success: result.result.success,
      result: result.result,
      verification: {
        dataComplete,
        details: verificationDetails
      }
    };
  } catch (err) {
    console.error('[极端测试] 特殊字符测试失败:', err);
    return {
      test: 'specialChar',
      success: false,
      error: err.message || err.errMsg
    };
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  try {
    console.log('[极端测试] 开始清理数据完整性测试数据');
    
    // 删除测试用户记录中的极端测试数据字段
    const result = await wx.cloud.callFunction({
      name: 'manageUser',
      data: {
        action: 'update',
        data: {
          extremeTest: null,
          longString: null,
          longStringChunks: null,
          nestedObject: null,
          largeObject: null,
          specialCharObject: null,
          testType: null,
          timestamp: Date.now()
        }
      }
    });
    
    console.log('[极端测试] 清理完成:', result.result);
    
    return {
      success: true,
      result: result.result
    };
  } catch (err) {
    console.error('[极端测试] 清理测试数据失败:', err);
    return {
      success: false,
      error: err.message || err.errMsg
    };
  }
}

/**
 * 运行所有数据完整性测试
 */
async function runAllTests() {
  console.log('[极端测试] 开始运行所有数据完整性测试...');
  const results = {};
  
  try {
    // 测试1: 特殊字符处理
    console.log('\n==== 测试1: 特殊字符处理 ====');
    results.specialChar = await testSpecialCharHandling();
    console.log('[测试1结果]', results.specialChar);
    
    // 测试2: 大量字段对象
    console.log('\n==== 测试2: 大量字段对象 ====');
    results.largeObject = await testLargeObjectStorage();
    console.log('[测试2结果]', results.largeObject);
    
    // 测试3: 深度嵌套对象
    console.log('\n==== 测试3: 深度嵌套对象 ====');
    results.nestedObject = await testNestedObjectStorage();
    console.log('[测试3结果]', results.nestedObject);
    
    // 测试4: 超长字符串
    console.log('\n==== 测试4: 超长字符串 ====');
    results.longString = await testLongStringStorage();
    console.log('[测试4结果]', results.longString);
    
    // 清理测试数据
    console.log('\n==== 清理测试数据 ====');
    results.cleanup = await cleanupTestData();
    console.log('[清理结果]', results.cleanup);
    
    // 汇总结果
    console.log('\n==== 测试完成 ====');
    const summary = {
      specialChar: {
        success: results.specialChar.success,
        dataComplete: results.specialChar.verification && results.specialChar.verification.dataComplete
      },
      largeObject: {
        success: results.largeObject.success,
        fieldCount: results.largeObject.fieldCount
      },
      nestedObject: {
        success: results.nestedObject.success,
        nestingDepth: results.nestedObject.nestingDepth
      },
      longString: {
        success: results.longString.success,
        length: results.longString.stringLength,
        chunks: results.longString.chunks
      }
    };
    
    console.log('数据完整性测试汇总:', summary);
    return {
      success: true,
      summary,
      detailedResults: results
    };
  } catch (err) {
    console.error('[极端测试] 测试过程中发生错误:', err);
    return {
      success: false,
      error: err.message,
      detailedResults: results
    };
  }
}

module.exports = {
  config,
  testLongStringStorage,
  testNestedObjectStorage,
  testLargeObjectStorage,
  testSpecialCharHandling,
  cleanupTestData,
  runAllTests
}; 