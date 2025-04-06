/**
 * 微信小程序本地存储极限容量测试工具
 * 
 * 用于测试本地存储在极限条件下的性能和稳定性
 * 包含容量极限测试、性能测试、并发测试和容错测试
 */

// 导入依赖
const storageUtils = require('../../miniprogram/utils/storageUtils');
const storageManager = require('../../miniprogram/utils/storageManager');

// 测试配置
const TEST_CONFIG = {
  // 存储大小配置（单位：字节）
  SIZE: {
    KB: 1024,
    MB: 1024 * 1024,
    MAX_STORAGE: 10 * 1024 * 1024, // 微信小程序存储上限10MB
    NEAR_LIMIT: 9.9 * 1024 * 1024,  // 接近上限
    OVER_LIMIT: 10.1 * 1024 * 1024, // 超过上限
  },
  // 键名前缀
  KEY_PREFIX: {
    CAPACITY_TEST: 'test_capacity_',
    PERF_TEST: 'test_perf_',
    CONCURRENT_TEST: 'test_concur_',
    RECOVERY_TEST: 'test_recovery_',
  },
  // 测试数据类型
  DATA_TYPE: {
    STRING: 'string',
    JSON: 'json', 
    BASE64: 'base64',
    NESTED: 'nested',
  },
  // 测试超时（毫秒）
  TIMEOUT: {
    NORMAL: 5000,
    EXTENDED: 30000,
  }
};

/**
 * 生成指定大小的测试数据
 * @param {number} size 数据大小（字节）
 * @param {string} type 数据类型：string, json, base64, nested
 * @returns {any} 生成的测试数据
 */
function generateTestData(size, type = TEST_CONFIG.DATA_TYPE.STRING) {
  // 基础字符集
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  switch (type) {
    case TEST_CONFIG.DATA_TYPE.STRING:
      // 生成纯文本字符串
      let result = '';
      const charsLength = chars.length;
      for (let i = 0; i < size; i++) {
        result += chars.charAt(Math.floor(Math.random() * charsLength));
      }
      return result;
      
    case TEST_CONFIG.DATA_TYPE.JSON:
      // 生成JSON对象
      const itemCount = Math.floor(size / 100); // 估算项目数量
      const obj = {};
      for (let i = 0; i < itemCount; i++) {
        const key = `field_${i}`;
        obj[key] = generateTestData(Math.min(90, size / itemCount), TEST_CONFIG.DATA_TYPE.STRING);
      }
      return obj;
      
    case TEST_CONFIG.DATA_TYPE.BASE64:
      // 生成Base64数据
      const rawData = generateTestData(Math.floor(size * 0.75), TEST_CONFIG.DATA_TYPE.STRING);
      return btoa(rawData); // 转为Base64会增加约1/3体积
      
    case TEST_CONFIG.DATA_TYPE.NESTED:
      // 生成嵌套对象
      const depth = 5; // 嵌套深度
      const itemsPerLevel = Math.floor(Math.pow(size, 1/depth));
      
      function generateNestedObj(currentDepth, maxDepth, itemsPerLevel, itemSize) {
        if (currentDepth >= maxDepth) {
          return generateTestData(itemSize, TEST_CONFIG.DATA_TYPE.STRING);
        }
        
        const obj = {};
        const childItemSize = itemSize / itemsPerLevel;
        
        for (let i = 0; i < itemsPerLevel; i++) {
          if (currentDepth === maxDepth - 1) {
            obj[`key_${i}`] = generateTestData(childItemSize, TEST_CONFIG.DATA_TYPE.STRING);
          } else {
            obj[`level_${currentDepth}_item_${i}`] = generateNestedObj(
              currentDepth + 1, 
              maxDepth, 
              Math.max(2, Math.floor(itemsPerLevel / 3)), 
              childItemSize
            );
          }
        }
        return obj;
      }
      
      return generateNestedObj(0, depth, itemsPerLevel, size);
      
    default:
      throw new Error(`不支持的数据类型: ${type}`);
  }
}

/**
 * 计算数据实际大小
 * @param {any} data 要计算大小的数据
 * @returns {number} 数据大小（字节）
 */
function calculateDataSize(data) {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size;
}

/**
 * 容量测试 - 验证存储极限
 * 
 * 测试存储接近和超过10MB限制时的行为
 */
async function testStorageCapacityLimit() {
  console.log('======== 开始存储容量极限测试 ========');
  
  try {
    // 清理存储，确保测试环境干净
    await storageUtils.clearStorage();
    console.log('已清理存储空间');
    
    // 1. 接近限制测试（9.9MB）
    console.log(`测试接近存储上限 (${TEST_CONFIG.SIZE.NEAR_LIMIT / TEST_CONFIG.SIZE.MB}MB)...`);
    const nearLimitData = generateTestData(TEST_CONFIG.SIZE.NEAR_LIMIT);
    const nearLimitKey = `${TEST_CONFIG.KEY_PREFIX.CAPACITY_TEST}near_limit`;
    
    console.time('接近上限存储耗时');
    try {
      await storageUtils.setStorage(nearLimitKey, nearLimitData);
      console.timeEnd('接近上限存储耗时');
      console.log('✅ 接近上限测试成功');
      
      // 检查实际占用空间
      const storageInfo = await storageUtils.getStorageInfo();
      console.log(`当前存储使用情况: ${storageInfo.currentSize / TEST_CONFIG.SIZE.MB}MB / ${storageInfo.limitSize / TEST_CONFIG.SIZE.MB}MB`);
    } catch (error) {
      console.timeEnd('接近上限存储耗时');
      console.error('❌ 接近上限测试失败:', error);
    }
    
    // 清理存储，为下一个测试做准备
    await storageUtils.clearStorage();
    
    // 2. 超出限制测试（10.1MB）
    console.log(`测试超出存储上限 (${TEST_CONFIG.SIZE.OVER_LIMIT / TEST_CONFIG.SIZE.MB}MB)...`);
    const overLimitData = generateTestData(TEST_CONFIG.SIZE.OVER_LIMIT);
    const overLimitKey = `${TEST_CONFIG.KEY_PREFIX.CAPACITY_TEST}over_limit`;
    
    console.time('超出上限存储耗时');
    try {
      await storageUtils.setStorage(overLimitKey, overLimitData);
      console.timeEnd('超出上限存储耗时');
      console.log('⚠️ 超出上限测试未抛出预期错误');
    } catch (error) {
      console.timeEnd('超出上限存储耗时');
      console.log('✅ 超出上限测试正确抛出错误:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 容量极限测试失败:', error);
  } finally {
    // 清理测试数据
    await storageUtils.clearStorage();
    console.log('======== 存储容量极限测试完成 ========');
  }
}

/**
 * 性能测试 - 不同数据量的读写性能
 * 
 * 测试不同数据量下的存取性能
 */
async function testStoragePerformance() {
  console.log('======== 开始存储性能测试 ========');
  
  // 测试不同大小的数据
  const testSizes = [
    100 * TEST_CONFIG.SIZE.KB,  // 100KB
    1 * TEST_CONFIG.SIZE.MB,    // 1MB
    5 * TEST_CONFIG.SIZE.MB,    // 5MB
    9 * TEST_CONFIG.SIZE.MB     // 9MB
  ];
  
  try {
    // 清理存储
    await storageUtils.clearStorage();
    
    // 遍历测试不同大小
    for (const size of testSizes) {
      const sizeLabel = size >= TEST_CONFIG.SIZE.MB ? 
        `${size / TEST_CONFIG.SIZE.MB}MB` : 
        `${size / TEST_CONFIG.SIZE.KB}KB`;
      
      console.log(`\n测试 ${sizeLabel} 数据的读写性能...`);
      const testData = generateTestData(size);
      const testKey = `${TEST_CONFIG.KEY_PREFIX.PERF_TEST}${sizeLabel}`;
      
      // 测试写入性能
      console.time(`${sizeLabel} 写入耗时`);
      try {
        await storageUtils.setStorage(testKey, testData);
        console.timeEnd(`${sizeLabel} 写入耗时`);
      } catch (error) {
        console.timeEnd(`${sizeLabel} 写入耗时`);
        console.error(`❌ ${sizeLabel} 写入失败:`, error);
        continue; // 如果写入失败，跳过读取测试
      }
      
      // 测试读取性能
      console.time(`${sizeLabel} 读取耗时`);
      try {
        await storageUtils.getStorage(testKey);
        console.timeEnd(`${sizeLabel} 读取耗时`);
      } catch (error) {
        console.timeEnd(`${sizeLabel} 读取耗时`);
        console.error(`❌ ${sizeLabel} 读取失败:`, error);
      }
      
      // 清理当前测试数据
      await storageUtils.removeStorage(testKey);
    }
    
    // 测试不同类型数据的性能（均使用1MB大小）
    const dataTypes = [
      TEST_CONFIG.DATA_TYPE.STRING,
      TEST_CONFIG.DATA_TYPE.JSON,
      TEST_CONFIG.DATA_TYPE.BASE64,
      TEST_CONFIG.DATA_TYPE.NESTED
    ];
    
    console.log('\n测试不同数据类型的性能...');
    for (const type of dataTypes) {
      console.log(`\n测试 ${type} 类型数据...`);
      const testData = generateTestData(1 * TEST_CONFIG.SIZE.MB, type);
      const testKey = `${TEST_CONFIG.KEY_PREFIX.PERF_TEST}${type}`;
      
      // 检查实际大小
      const actualSize = calculateDataSize(testData);
      console.log(`${type} 类型数据实际占用: ${(actualSize / TEST_CONFIG.SIZE.MB).toFixed(2)}MB`);
      
      // 测试写入性能
      console.time(`${type} 写入耗时`);
      try {
        await storageUtils.setStorage(testKey, testData);
        console.timeEnd(`${type} 写入耗时`);
      } catch (error) {
        console.timeEnd(`${type} 写入耗时`);
        console.error(`❌ ${type} 写入失败:`, error);
        continue;
      }
      
      // 测试读取性能
      console.time(`${type} 读取耗时`);
      try {
        await storageUtils.getStorage(testKey);
        console.timeEnd(`${type} 读取耗时`);
      } catch (error) {
        console.timeEnd(`${type} 读取耗时`);
        console.error(`❌ ${type} 读取失败:`, error);
      }
      
      // 清理当前测试数据
      await storageUtils.removeStorage(testKey);
    }
    
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
  } finally {
    // 清理所有测试数据
    await storageUtils.clearStorage();
    console.log('======== 存储性能测试完成 ========');
  }
}

/**
 * 并发测试 - 多个存储操作并发执行
 * 
 * 测试多个并发存储操作的稳定性和正确性
 */
async function testConcurrentStorage() {
  console.log('======== 开始并发存储测试 ========');
  
  try {
    // 清理存储
    await storageUtils.clearStorage();
    
    // 1. 测试同时写入多个不同键
    const concurrentCount = 100; // 并发数量
    const keys = [];
    const promises = [];
    
    console.log(`测试 ${concurrentCount} 个并发写入...`);
    console.time('并发写入总耗时');
    
    for (let i = 0; i < concurrentCount; i++) {
      const key = `${TEST_CONFIG.KEY_PREFIX.CONCURRENT_TEST}key_${i}`;
      keys.push(key);
      const data = generateTestData(10 * TEST_CONFIG.SIZE.KB); // 每个10KB
      promises.push(storageUtils.setStorage(key, data));
    }
    
    try {
      await Promise.all(promises);
      console.timeEnd('并发写入总耗时');
      console.log('✅ 并发写入测试成功');
      
      // 验证所有数据是否正确写入
      let readSuccessCount = 0;
      for (const key of keys) {
        try {
          await storageUtils.getStorage(key);
          readSuccessCount++;
        } catch (error) {
          console.error(`读取键 ${key} 失败:`, error);
        }
      }
      
      console.log(`验证结果: ${readSuccessCount}/${concurrentCount} 个键成功写入和读取`);
    } catch (error) {
      console.timeEnd('并发写入总耗时');
      console.error('❌ 并发写入测试失败:', error);
    }
    
    // 清理测试数据
    await storageUtils.clearStorage();
    
    // 2. 测试对同一键的并发写入
    console.log('\n测试对同一键的并发写入...');
    const sameKey = `${TEST_CONFIG.KEY_PREFIX.CONCURRENT_TEST}same_key`;
    const concurrentSameKeyPromises = [];
    const expectedFinalValue = `final_value_${concurrentCount - 1}`;
    
    for (let i = 0; i < concurrentCount; i++) {
      const value = `final_value_${i}`;
      concurrentSameKeyPromises.push(storageUtils.setStorage(sameKey, value));
    }
    
    try {
      await Promise.all(concurrentSameKeyPromises);
      console.log('所有并发写入完成');
      
      // 验证最终值
      const finalValue = await storageUtils.getStorage(sameKey);
      if (finalValue === expectedFinalValue) {
        console.log('✅ 最终值符合预期');
      } else {
        console.log(`⚠️ 预期最终值为 ${expectedFinalValue}，实际为 ${finalValue}`);
      }
    } catch (error) {
      console.error('❌ 同键并发写入测试失败:', error);
    }
    
    // 3. 测试高频读写混合操作
    console.log('\n测试高频读写混合操作...');
    const mixedKey = `${TEST_CONFIG.KEY_PREFIX.CONCURRENT_TEST}mixed_key`;
    await storageUtils.setStorage(mixedKey, 'initial_value');
    
    // 创建交替的读写操作
    const mixedPromises = [];
    for (let i = 0; i < 50; i++) {
      // 添加写操作
      mixedPromises.push(storageUtils.setStorage(mixedKey, `value_${i}`));
      // 添加读操作
      mixedPromises.push(storageUtils.getStorage(mixedKey));
    }
    
    try {
      await Promise.all(mixedPromises);
      console.log('✅ 高频读写混合测试完成');
    } catch (error) {
      console.error('❌ 高频读写混合测试失败:', error);
    }
    
  } catch (error) {
    console.error('❌ 并发测试失败:', error);
  } finally {
    // 清理所有测试数据
    await storageUtils.clearStorage();
    console.log('======== 并发存储测试完成 ========');
  }
}

/**
 * 容错测试 - 模拟极限条件和错误场景
 * 
 * 测试系统在极端情况下的容错能力
 */
async function testStorageRecovery() {
  console.log('======== 开始存储容错性测试 ========');
  
  try {
    // 清理存储
    await storageUtils.clearStorage();
    
    // 1. 测试反复填满清空存储
    console.log('\n测试反复填满清空存储...');
    const repeatCount = 5; // 实际测试建议增加到30-50次
    
    for (let i = 0; i < repeatCount; i++) {
      console.log(`第 ${i + 1}/${repeatCount} 次填满清空测试`);
      
      // 填满存储
      const fillKey = `${TEST_CONFIG.KEY_PREFIX.RECOVERY_TEST}fill_${i}`;
      const fillData = generateTestData(TEST_CONFIG.SIZE.NEAR_LIMIT);
      
      try {
        console.time(`第 ${i + 1} 次填满耗时`);
        await storageUtils.setStorage(fillKey, fillData);
        console.timeEnd(`第 ${i + 1} 次填满耗时`);
        
        // 清空存储
        console.time(`第 ${i + 1} 次清空耗时`);
        await storageUtils.clearStorage();
        console.timeEnd(`第 ${i + 1} 次清空耗时`);
      } catch (error) {
        console.error(`❌ 第 ${i + 1} 次填满清空测试失败:`, error);
        // 强制清理，确保下一次测试可以进行
        await storageUtils.clearStorage();
      }
    }
    
    // 2. 测试大量碎片数据
    console.log('\n测试大量碎片数据...');
    const fragmentCount = 1000; // 实际测试可以考虑增加到5000
    const fragmentPromises = [];
    const fragmentKeys = [];
    
    // 创建大量随机大小的数据
    for (let i = 0; i < fragmentCount; i++) {
      const key = `${TEST_CONFIG.KEY_PREFIX.RECOVERY_TEST}frag_${i}`;
      fragmentKeys.push(key);
      // 随机大小从1KB到50KB
      const size = Math.floor(Math.random() * 49 * TEST_CONFIG.SIZE.KB) + TEST_CONFIG.SIZE.KB;
      const data = generateTestData(size);
      fragmentPromises.push(storageUtils.setStorage(key, data));
    }
    
    try {
      console.time('碎片数据写入耗时');
      await Promise.all(fragmentPromises);
      console.timeEnd('碎片数据写入耗时');
      console.log(`✅ ${fragmentCount} 个碎片数据写入成功`);
      
      // 测试随机访问性能
      const testReadCount = 100;
      const randomReadPromises = [];
      
      for (let i = 0; i < testReadCount; i++) {
        const randomIndex = Math.floor(Math.random() * fragmentCount);
        const key = fragmentKeys[randomIndex];
        randomReadPromises.push(storageUtils.getStorage(key));
      }
      
      console.time('随机读取碎片数据耗时');
      await Promise.all(randomReadPromises);
      console.timeEnd('随机读取碎片数据耗时');
      
    } catch (error) {
      console.error('❌ 碎片数据测试失败:', error);
    }
    
    // 3. 模拟数据损坏场景
    console.log('\n测试数据损坏恢复...');
    
    // 由于无法直接在小程序中破坏存储数据，这里模拟一个损坏的场景
    // 实际测试中可能需要开发特殊工具来模拟存储损坏
    
    const corruptKey = `${TEST_CONFIG.KEY_PREFIX.RECOVERY_TEST}corrupt`;
    const validData = { id: 1, name: 'test', data: generateTestData(1000) };
    
    // 先正常存储一个对象
    await storageUtils.setStorage(corruptKey, validData);
    console.log('已存储有效数据用于损坏测试');
    
    // 模拟应用处理损坏数据的情况
    try {
      // 这里我们假设数据已损坏，读取时会得到不完整或异常数据
      // 在实际测试中，可能需要使用特殊工具直接修改存储内容来模拟
      console.log('尝试处理假设已损坏的数据');
      
      // 模拟恢复逻辑
      try {
        const data = await storageUtils.getStorage(corruptKey);
        // 检查数据完整性（实际应用中可能有数据校验机制）
        if (!data || typeof data !== 'object' || !data.id || !data.name) {
          throw new Error('数据不完整或已损坏');
        }
        console.log('✅ 数据完整性检查通过');
      } catch (error) {
        console.log('检测到数据损坏，尝试恢复...');
        // 恢复策略（实际应用中可能有备份或默认值）
        const defaultData = { id: 0, name: 'recovered', data: 'default' };
        await storageUtils.setStorage(corruptKey, defaultData);
        console.log('✅ 已使用默认值恢复数据');
      }
    } catch (error) {
      console.error('❌ 数据损坏恢复测试失败:', error);
    }
    
  } catch (error) {
    console.error('❌ 容错性测试失败:', error);
  } finally {
    // 清理所有测试数据
    await storageUtils.clearStorage();
    console.log('======== 存储容错性测试完成 ========');
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('=========== 开始存储极限容量综合测试 ===========');
  
  try {
    await testStorageCapacityLimit();
    await testStoragePerformance();
    await testConcurrentStorage();
    await testStorageRecovery();
    
    console.log('✅ 所有测试完成');
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    // 确保清理所有测试数据
    await storageUtils.clearStorage();
    console.log('=========== 存储极限容量综合测试结束 ===========');
  }
}

/**
 * 导出测试函数供外部调用
 */
module.exports = {
  runAllTests,
  testStorageCapacityLimit,
  testStoragePerformance,
  testConcurrentStorage,
  testStorageRecovery,
  utils: {
    generateTestData,
    calculateDataSize
  }
}; 