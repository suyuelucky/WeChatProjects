/**
 * 冲突解决器测试用例
 * 
 * 创建时间: 2025-04-08 22:01:15
 * 创建者: Claude-3.7-Sonnet
 * 文档分类: 单元测试
 */

'use strict';

// 引入冲突解决器
var ConflictResolver = require('../ConflictResolver');

// 测试数据
var testData = {
  // 基准数据
  baseData: {
    'record1': {
      id: 'record1',
      value: {
        name: '张三',
        age: 30,
        address: '北京市'
      },
      version: '1.0',
      timestamp: 1649408000000
    }
  },
  
  // 本地变更数据
  localChanges: [
    {
      id: 'record1',
      value: {
        name: '张三',
        age: 31,  // 变更了年龄
        address: '北京市'
      },
      version: '1.0',
      timestamp: 1649408100000
    },
    {
      id: 'record2',
      value: {
        name: '李四',
        age: 25,
        address: '上海市'
      },
      version: '1.0',
      timestamp: 1649408200000
    }
  ],
  
  // 服务器变更数据
  serverChanges: [
    {
      id: 'record1',
      value: {
        name: '张三',
        age: 30,
        address: '深圳市'  // 变更了地址
      },
      version: '1.0',
      timestamp: 1649408050000
    },
    {
      id: 'record3',
      value: {
        name: '王五',
        age: 28,
        address: '广州市'
      },
      version: '1.0',
      timestamp: 1649408250000
    }
  ],
  
  // 结构冲突数据
  structureConflict: {
    local: {
      id: 'record4',
      value: {
        items: ['苹果', '香蕉', '橙子']
      },
      metadata: {
        schemaVersion: '1.0'
      },
      version: '1.0',
      timestamp: 1649408300000
    },
    server: {
      id: 'record4',
      value: {
        items: {  // 数组变成了对象
          fruit1: '苹果',
          fruit2: '香蕉',
          fruit3: '橙子'
        }
      },
      metadata: {
        schemaVersion: '2.0'  // 版本不同
      },
      version: '1.0',
      timestamp: 1649408350000
    }
  }
};

/**
 * 断言工具，简化测试代码
 */
var assert = {
  equal: function(actual, expected, message) {
    if (actual !== expected) {
      console.error('断言失败:', message || '');
      console.error('  期望值:', expected);
      console.error('  实际值:', actual);
      throw new Error(message || '断言失败');
    }
  },
  
  deepEqual: function(actual, expected, message) {
    var actualJson = JSON.stringify(actual);
    var expectedJson = JSON.stringify(expected);
    
    if (actualJson !== expectedJson) {
      console.error('断言失败:', message || '');
      console.error('  期望值:', expectedJson);
      console.error('  实际值:', actualJson);
      throw new Error(message || '断言失败');
    }
  }
};

/**
 * 运行所有测试用例
 */
function runTests() {
  console.log('开始测试冲突解决器...');
  
  // 初始化测试
  testInit()
    .then(function() {
      // 冲突检测测试
      return testHasConflict();
    })
    .then(function() {
      // 批量冲突检测测试
      return testDetectBatchConflicts();
    })
    .then(function() {
      // 单个冲突解决测试
      return testResolveConflict();
    })
    .then(function() {
      // 批量冲突解决测试
      return testBatchResolveConflicts();
    })
    .then(function() {
      // 版本兼容性冲突测试
      return testVersionConflict();
    })
    .then(function() {
      console.log('所有测试通过!');
    })
    .catch(function(error) {
      console.error('测试失败:', error);
    })
    .finally(function() {
      // 清理测试资源
      return ConflictResolver.destroy();
    });
}

/**
 * 测试初始化功能
 */
function testInit() {
  console.log('测试初始化...');
  
  var config = {
    defaultStrategy: 'client-wins',
    pathStrategies: {
      'records/record1': 'smart-merge',
      'records/': 'server-wins'
    }
  };
  
  return ConflictResolver.init(config)
    .then(function() {
      // 检查配置是否正确应用
      assert.equal(
        ConflictResolver._config.defaultStrategy,
        'client-wins',
        '默认策略应该被正确设置'
      );
      
      assert.deepEqual(
        ConflictResolver._config.pathStrategies,
        config.pathStrategies,
        '路径策略应该被正确设置'
      );
      
      console.log('  - 初始化测试通过');
    });
}

/**
 * 测试冲突检测功能
 */
function testHasConflict() {
  console.log('测试冲突检测...');
  
  // 测试场景1: 无冲突
  var localData1 = {
    id: 'record5',
    value: { name: '赵六', age: 40 },
    version: '1.0'
  };
  
  var serverData1 = {
    id: 'record5',
    value: { name: '赵六', age: 40 },
    version: '1.0'
  };
  
  // 测试场景2: 有冲突
  var localData2 = testData.localChanges[0];
  var serverData2 = testData.serverChanges[0];
  
  return ConflictResolver.hasConflict(localData1, serverData1, null)
    .then(function(hasConflict) {
      assert.equal(hasConflict, false, '相同数据应该没有冲突');
      
      return ConflictResolver.hasConflict(localData2, serverData2, null);
    })
    .then(function(hasConflict) {
      assert.equal(hasConflict, true, '不同数据应该有冲突');
      
      console.log('  - 冲突检测测试通过');
    });
}

/**
 * 测试批量冲突检测
 */
function testDetectBatchConflicts() {
  console.log('测试批量冲突检测...');
  
  var localChanges = testData.localChanges;
  var serverChanges = testData.serverChanges;
  var baseData = testData.baseData;
  
  return ConflictResolver.detectBatchConflicts(localChanges, serverChanges, baseData)
    .then(function(result) {
      // 检查非冲突本地变更
      assert.equal(
        result.nonConflicting.local.length,
        1,
        '应该有1个非冲突本地变更'
      );
      
      // 检查非冲突服务器变更
      assert.equal(
        result.nonConflicting.server.length,
        1,
        '应该有1个非冲突服务器变更'
      );
      
      // 检查冲突
      assert.equal(
        result.conflicts.length,
        1,
        '应该有1个冲突'
      );
      
      // 检查冲突详情
      assert.equal(
        result.conflicts[0].id,
        'record1',
        '冲突ID应该是record1'
      );
      
      console.log('  - 批量冲突检测测试通过');
    });
}

/**
 * 测试单个冲突解决
 */
function testResolveConflict() {
  console.log('测试单个冲突解决...');
  
  // 创建要解析的冲突对象
  var conflict = {
    id: 'record1',
    type: 'update',
    path: 'records/record1',
    timestamp: Date.now(),
    clientData: testData.localChanges[0],
    serverData: testData.serverChanges[0],
    baseData: testData.baseData.record1
  };
  
  // 创建结构冲突
  var structureConflict = {
    id: 'record4',
    type: 'structure',
    path: 'records/record4',
    timestamp: Date.now(),
    clientData: testData.structureConflict.local,
    serverData: testData.structureConflict.server,
    baseData: null
  };
  
  // 测试标准冲突解决
  return ConflictResolver.resolveConflict(conflict)
    .then(function(result) {
      // 由于record1配置了smart-merge策略，所以应该尝试智能合并
      assert.equal(
        result.resolution.strategy,
        'smart-merge',
        '解决策略应该是smart-merge'
      );
      
      // 测试结构冲突解决
      return ConflictResolver.resolveConflict(structureConflict);
    })
    .then(function(result) {
      // 结构冲突应该需要手动解决
      assert.equal(
        result.needsManualResolution,
        true,
        '结构冲突应该需要手动解决'
      );
      
      console.log('  - 单个冲突解决测试通过');
    });
}

/**
 * 测试批量冲突解决
 */
function testBatchResolveConflicts() {
  console.log('测试批量冲突解决...');
  
  // 创建一批冲突
  var conflicts = [
    {
      id: 'record1',
      type: 'update',
      path: 'records/record1',
      timestamp: Date.now(),
      clientData: testData.localChanges[0],
      serverData: testData.serverChanges[0],
      baseData: testData.baseData.record1
    },
    {
      id: 'record4',
      type: 'update',
      path: 'records/record4',
      timestamp: Date.now(),
      clientData: {
        id: 'record4',
        value: { name: '冯七', age: 45 },
        version: '1.0'
      },
      serverData: {
        id: 'record4',
        value: { name: '冯七', age: 48 },
        version: '1.0'
      }
    }
  ];
  
  return ConflictResolver.batchResolveConflicts(conflicts)
    .then(function(results) {
      assert.equal(
        results.length,
        2,
        '应该解决2个冲突'
      );
      
      console.log('  - 批量冲突解决测试通过');
    });
}

/**
 * 测试版本兼容性冲突
 */
function testVersionConflict() {
  console.log('测试版本兼容性冲突...');
  
  var localData = testData.structureConflict.local;
  var serverData = testData.structureConflict.server;
  
  return ConflictResolver.detectConflictWithVersioning(localData, serverData)
    .then(function(hasConflict) {
      assert.equal(
        hasConflict,
        true,
        '版本不同应该检测到冲突'
      );
      
      // 创建版本冲突
      var versionConflict = {
        id: 'record4',
        type: 'version',
        path: 'records/record4',
        timestamp: Date.now(),
        clientData: localData,
        serverData: serverData
      };
      
      // 测试版本冲突解决
      return ConflictResolver.resolveVersionConflict(versionConflict);
    })
    .then(function(result) {
      assert.equal(
        result.resolution.strategy,
        'version-aware',
        '解决策略应该是version-aware'
      );
      
      // 服务器版本更高，应该使用服务器数据
      assert.deepEqual(
        result.value,
        testData.structureConflict.server.value,
        '应该使用服务器数据'
      );
      
      console.log('  - 版本兼容性冲突测试通过');
    });
}

// 运行所有测试
runTests(); 