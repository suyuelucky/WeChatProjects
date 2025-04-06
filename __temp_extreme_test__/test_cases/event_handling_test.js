/**
 * 事件处理机制极端测试
 * 测试目标：验证eventBus在极端情况下的稳定性和正确性
 */

// 模拟wx对象
if (typeof wx === 'undefined') {
  global.wx = {
    getStorageSync: function(key) { return null; },
    setStorageSync: function(key, data) {},
    showToast: function(options) {},
    showModal: function(options) { 
      if (options && options.success) options.success({confirm: true});
    }
  };
}

// 设置一些测试常量
const TEST_EVENT = 'TEST_EVENT';
const STRESS_EVENT = 'STRESS_EVENT';
const ERROR_EVENT = 'ERROR_EVENT';
const TIMEOUT_EVENT = 'TIMEOUT_EVENT';
const CONCURRENT_EVENT = 'CONCURRENT_EVENT';
const PRIORITY_EVENT = 'PRIORITY_EVENT';

// 在开始测试前等待一段时间
function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

// 测试基本的事件订阅和触发
function testBasicEventHandling() {
  console.log('========== 开始测试基本事件处理 ==========');
  
  try {
    const eventBus = require('../../utils/eventBus');
    
    let receivedData = null;
    const testData = { message: 'Hello, Event!' };
    
    // 订阅事件
    eventBus.on(TEST_EVENT, function(data) {
      receivedData = data;
    });
    
    // 触发事件
    eventBus.emit(TEST_EVENT, testData);
    
    // 验证事件是否正确处理
    if (!receivedData || receivedData.message !== testData.message) {
      throw new Error('事件数据接收失败或数据不匹配');
    }
    
    // 移除事件监听
    eventBus.off(TEST_EVENT);
    
    // 重置接收数据
    receivedData = null;
    
    // 再次触发事件（此时不应有反应）
    eventBus.emit(TEST_EVENT, { message: 'This should not be received' });
    
    // 验证事件监听是否已被移除
    if (receivedData !== null) {
      throw new Error('事件监听器移除失败');
    }
    
    console.log('✓ 基本事件处理测试通过');
    return true;
  } catch (error) {
    console.error('× 基本事件处理测试失败:', error.message);
    return false;
  }
}

// 测试极端情况：高频率事件触发
function testStressEventHandling() {
  console.log('========== 开始测试高频率事件触发 ==========');
  
  try {
    const eventBus = require('../../utils/eventBus');
    
    let counter = 0;
    const expectedCount = 1000;
    
    // 订阅压力测试事件
    eventBus.on(STRESS_EVENT, function() {
      counter++;
    });
    
    // 高频率触发事件
    console.log(`正在触发 ${expectedCount} 次事件...`);
    for (let i = 0; i < expectedCount; i++) {
      eventBus.emit(STRESS_EVENT, { index: i });
    }
    
    // 验证所有事件是否都被处理
    if (counter !== expectedCount) {
      throw new Error(`事件处理计数不匹配: 期望 ${expectedCount}, 实际 ${counter}`);
    }
    
    // 清理
    eventBus.off(STRESS_EVENT);
    
    console.log('✓ 高频率事件触发测试通过');
    return true;
  } catch (error) {
    console.error('× 高频率事件触发测试失败:', error.message);
    return false;
  }
}

// 测试极端情况：处理函数抛出错误
function testErrorHandling() {
  console.log('========== 开始测试错误处理 ==========');
  
  try {
    const eventBus = require('../../utils/eventBus');
    
    let errorCaught = false;
    let normalHandlerExecuted = false;
    
    // 订阅错误测试事件 - 第一个处理函数会抛出错误
    eventBus.on(ERROR_EVENT, function() {
      throw new Error('这是一个预期的错误，用于测试');
    });
    
    // 同一事件的另一个处理函数应该仍然能执行
    eventBus.on(ERROR_EVENT, function() {
      normalHandlerExecuted = true;
    });
    
    // 添加全局错误处理器
    const originalErrorHandler = eventBus._globalErrorHandler;
    eventBus._globalErrorHandler = function(err) {
      errorCaught = true;
      if (originalErrorHandler) originalErrorHandler(err);
    };
    
    // 触发事件
    eventBus.emit(ERROR_EVENT);
    
    // 恢复原始错误处理器
    eventBus._globalErrorHandler = originalErrorHandler;
    
    // 验证错误是否被捕获
    if (!errorCaught) {
      throw new Error('事件处理错误未被捕获');
    }
    
    // 验证正常处理函数是否执行
    if (!normalHandlerExecuted) {
      throw new Error('一个处理函数抛出错误后，其他处理函数未能执行');
    }
    
    // 清理
    eventBus.off(ERROR_EVENT);
    
    console.log('✓ 错误处理测试通过');
    return true;
  } catch (error) {
    console.error('× 错误处理测试失败:', error.message);
    return false;
  }
}

// 测试极端情况：处理函数超时
async function testTimeoutHandling() {
  console.log('========== 开始测试超时处理 ==========');
  
  try {
    const eventBus = require('../../utils/eventBus');
    
    let timeoutDetected = false;
    let handlerFinished = false;
    
    // 设置超时处理器
    const originalTimeoutHandler = eventBus._timeoutHandler;
    eventBus._timeoutHandler = function(eventName) {
      timeoutDetected = true;
      if (originalTimeoutHandler) originalTimeoutHandler(eventName);
    };
    
    // 订阅超时测试事件 - 处理函数会执行很长时间
    eventBus.on(TIMEOUT_EVENT, function() {
      const endTime = Date.now() + 500; // 模拟耗时操作
      while (Date.now() < endTime) {
        // 占用CPU进行空循环
      }
      handlerFinished = true;
    }, { timeout: 100 }); // 设置100ms超时
    
    // 触发事件
    eventBus.emit(TIMEOUT_EVENT);
    
    // 等待足够长的时间以确保处理完成
    await sleep(600);
    
    // 恢复原始超时处理器
    eventBus._timeoutHandler = originalTimeoutHandler;
    
    // 验证超时是否被检测到
    if (!timeoutDetected) {
      throw new Error('处理函数超时未被检测到');
    }
    
    // 验证处理函数是否完成
    if (!handlerFinished) {
      throw new Error('超时的处理函数未能完成执行');
    }
    
    // 清理
    eventBus.off(TIMEOUT_EVENT);
    
    console.log('✓ 超时处理测试通过');
    return true;
  } catch (error) {
    console.error('× 超时处理测试失败:', error.message);
    return false;
  }
}

// 测试极端情况：并发事件
async function testConcurrentEvents() {
  console.log('========== 开始测试并发事件 ==========');
  
  try {
    const eventBus = require('../../utils/eventBus');
    
    let event1Count = 0;
    let event2Count = 0;
    let event3Count = 0;
    
    // 订阅3个不同的并发事件
    eventBus.on(CONCURRENT_EVENT + '1', function() {
      event1Count++;
      // 模拟一些处理时间
      const endTime = Date.now() + 50;
      while (Date.now() < endTime) {}
    });
    
    eventBus.on(CONCURRENT_EVENT + '2', function() {
      event2Count++;
      // 模拟一些处理时间
      const endTime = Date.now() + 30;
      while (Date.now() < endTime) {}
    });
    
    eventBus.on(CONCURRENT_EVENT + '3', function() {
      event3Count++;
      // 模拟一些处理时间
      const endTime = Date.now() + 10;
      while (Date.now() < endTime) {}
    });
    
    // 并发触发多个事件
    eventBus.emit(CONCURRENT_EVENT + '1');
    eventBus.emit(CONCURRENT_EVENT + '2');
    eventBus.emit(CONCURRENT_EVENT + '3');
    
    // 等待足够长的时间以确保所有处理完成
    await sleep(200);
    
    // 验证所有事件是否都被处理
    if (event1Count !== 1 || event2Count !== 1 || event3Count !== 1) {
      throw new Error(`并发事件处理不完整: 事件1=${event1Count}, 事件2=${event2Count}, 事件3=${event3Count}`);
    }
    
    // 清理
    eventBus.off(CONCURRENT_EVENT + '1');
    eventBus.off(CONCURRENT_EVENT + '2');
    eventBus.off(CONCURRENT_EVENT + '3');
    
    console.log('✓ 并发事件测试通过');
    return true;
  } catch (error) {
    console.error('× 并发事件测试失败:', error.message);
    return false;
  }
}

// 测试优先级处理
function testPriorityHandling() {
  console.log('========== 开始测试事件优先级 ==========');
  
  try {
    const eventBus = require('../../utils/eventBus');
    
    const executionOrder = [];
    
    // 添加不同优先级的处理函数
    eventBus.on(PRIORITY_EVENT, function() {
      executionOrder.push('normal');
    });
    
    eventBus.on(PRIORITY_EVENT, function() {
      executionOrder.push('high');
    }, { priority: 10 }); // 高优先级
    
    eventBus.on(PRIORITY_EVENT, function() {
      executionOrder.push('low');
    }, { priority: -10 }); // 低优先级
    
    // 触发事件
    eventBus.emit(PRIORITY_EVENT);
    
    // 验证执行顺序
    if (executionOrder[0] !== 'high' || 
        executionOrder[1] !== 'normal' || 
        executionOrder[2] !== 'low') {
      throw new Error(`优先级执行顺序错误: ${executionOrder.join(', ')}`);
    }
    
    // 清理
    eventBus.off(PRIORITY_EVENT);
    
    console.log('✓ 事件优先级测试通过');
    return true;
  } catch (error) {
    console.error('× 事件优先级测试失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  let results = {
    basicEventHandling: false,
    stressEventHandling: false,
    errorHandling: false,
    timeoutHandling: false,
    concurrentEvents: false,
    priorityHandling: false
  };
  
  console.log('======================================================');
  console.log('           开始执行事件处理极端测试                    ');
  console.log('======================================================');
  
  results.basicEventHandling = testBasicEventHandling();
  results.stressEventHandling = testStressEventHandling();
  results.errorHandling = testErrorHandling();
  results.timeoutHandling = await testTimeoutHandling();
  results.concurrentEvents = await testConcurrentEvents();
  results.priorityHandling = testPriorityHandling();
  
  console.log('======================================================');
  console.log('                  测试结果汇总                        ');
  console.log('======================================================');
  console.log('基本事件处理测试:', results.basicEventHandling ? '通过 ✓' : '失败 ×');
  console.log('高频率事件触发测试:', results.stressEventHandling ? '通过 ✓' : '失败 ×');
  console.log('错误处理测试:', results.errorHandling ? '通过 ✓' : '失败 ×');
  console.log('超时处理测试:', results.timeoutHandling ? '通过 ✓' : '失败 ×');
  console.log('并发事件测试:', results.concurrentEvents ? '通过 ✓' : '失败 ×');
  console.log('事件优先级测试:', results.priorityHandling ? '通过 ✓' : '失败 ×');
  
  return results;
}

// 运行测试
if (require.main === module) {
  runTests();
} else {
  module.exports = {
    runTests
  };
} 