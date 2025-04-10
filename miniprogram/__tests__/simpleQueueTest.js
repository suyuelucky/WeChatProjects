/**
 * RequestQueue简单测试
 * 创建日期: 2025-04-08 18:53:08
 * 创建者: Claude 3.7 Sonnet
 * 
 * 本测试文件用于验证RequestQueue组件的核心功能
 */

'use strict';

// 导入被测组件
var RequestQueue = require('../services/RequestQueue');

// 模拟wx.request
global.wx = {
  request: function(options) {
    setTimeout(function() {
      if (options.success) {
        options.success({
          data: { success: true, message: 'OK' },
          statusCode: 200,
          header: { 'Content-Type': 'application/json' }
        });
      }
    }, 10);
    
    return {
      abort: function() {
        if (options.fail) {
          options.fail({ errMsg: 'request:fail abort' });
        }
      }
    };
  }
};

// 测试辅助函数
function log(message) {
  console.log(message);
}

function printQueueStatus(queue) {
  log('Queue status: activeCount=' + queue._activeCount + 
      ', queueLength=' + queue._queue.length);
}

// 模拟回调
function createCallback(name) {
  return function(err, res) {
    if (err) {
      log(name + ' failed: ' + JSON.stringify(err));
    } else {
      log(name + ' success: ' + JSON.stringify(res));
    }
  };
}

// 执行测试
function runTests() {
  log('---------- 开始测试 RequestQueue 组件 ----------');
  
  // 创建请求队列实例
  var queue = new RequestQueue({
    maxConcurrent: 2,  // 最大并发数为2
    retryLimit: 1,     // 最大重试次数为1
    retryDelay: 50     // 重试延迟为50ms
  });
  
  log('1. RequestQueue 实例创建成功');
  printQueueStatus(queue);
  
  // 测试1: 添加请求到队列
  log('\n2. 测试添加请求到队列');
  var req1 = queue.enqueue(
    { url: 'https://api.example.com/test1' },
    createCallback('Request 1')
  );
  var req2 = queue.enqueue(
    { url: 'https://api.example.com/test2' },
    createCallback('Request 2')
  );
  var req3 = queue.enqueue(
    { url: 'https://api.example.com/test3' },
    createCallback('Request 3')
  );
  
  printQueueStatus(queue);
  log('请求1 ID: ' + req1.requestId);
  log('请求2 ID: ' + req2.requestId);
  log('请求3 ID: ' + req3.requestId);
  
  // 测试2: 暂停/恢复队列
  log('\n3. 测试队列暂停和恢复');
  queue.pause();
  log('队列已暂停');
  printQueueStatus(queue);
  
  var req4 = queue.enqueue(
    { url: 'https://api.example.com/test4' },
    createCallback('Request 4')
  );
  
  log('暂停后添加了请求4');
  printQueueStatus(queue);
  
  setTimeout(function() {
    log('恢复队列');
    queue.resume();
    printQueueStatus(queue);
  }, 100);
  
  // 测试3: 取消请求
  setTimeout(function() {
    log('\n4. 测试取消请求');
    var req5 = queue.enqueue(
      { url: 'https://api.example.com/test5' },
      createCallback('Request 5')
    );
    
    log('添加了请求5');
    printQueueStatus(queue);
    
    var cancelled = queue.cancelRequest(req5.requestId);
    log('取消请求5: ' + (cancelled ? '成功' : '失败'));
    printQueueStatus(queue);
  }, 200);
  
  // 测试4: 优先级队列
  setTimeout(function() {
    log('\n5. 测试请求优先级');
    queue.pause();
    
    var reqLow = queue.enqueue(
      { url: 'https://api.example.com/low', priority: 1 },
      createCallback('Low Priority')
    );
    
    var reqHigh = queue.enqueue(
      { url: 'https://api.example.com/high', priority: 10 },
      createCallback('High Priority')
    );
    
    var reqMedium = queue.enqueue(
      { url: 'https://api.example.com/medium', priority: 5 },
      createCallback('Medium Priority')
    );
    
    log('添加了3个不同优先级的请求');
    log('队列中的请求顺序 (应该是高、中、低优先级):');
    var priorities = queue._queue.map(function(item) {
      return item.priority + ' (' + item.config.url + ')';
    });
    log(priorities.join(' > '));
    
    queue.resume();
  }, 300);
  
  // 测试5: 获取队列统计信息
  setTimeout(function() {
    log('\n6. 测试获取队列统计信息');
    var stats = queue.getStats();
    log('队列统计信息:');
    log(JSON.stringify(stats, null, 2));
    
    log('\n---------- RequestQueue 组件测试完成 ----------');
  }, 500);
}

// 开始运行测试
runTests(); 