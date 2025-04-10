/**
 * 数据管理框架集成测试
 * 
 * 创建时间: 2025年04月09日 11:35:22 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 导入被测试组件
var LocalStorageManager = require('../../sync/LocalStorageManager');
var ChangeTracker = require('../../sync/ChangeTracker');
var DiffGenerator = require('../../sync/DiffGenerator');

// 测试数据
var TEST_COLLECTION = 'test_collection';
var TEST_ITEM_ID = 'item_1';
var TEST_DATA_INITIAL = {
  name: '测试数据',
  count: 1,
  tags: ['标签1', '标签2'],
  metadata: {
    createdAt: '2025-04-09',
    status: 'active'
  }
};
var TEST_DATA_UPDATED = {
  name: '测试数据修改',
  count: 2,
  tags: ['标签1', '标签3'],
  metadata: {
    createdAt: '2025-04-09',
    status: 'updated',
    updatedAt: '2025-04-09'
  }
};

// 模拟wx.setStorageSync和wx.getStorageSync
var mockStorage = {};
global.wx = {
  setStorageSync: function(key, data) {
    mockStorage[key] = data;
    return true;
  },
  getStorageSync: function(key) {
    return mockStorage[key];
  },
  removeStorageSync: function(key) {
    delete mockStorage[key];
    return true;
  },
  clearStorage: function() {
    mockStorage = {};
  }
};

describe('数据管理框架集成测试', function() {
  var storageManager, changeTracker, diffGenerator;
  
  beforeEach(function() {
    // 重置存储
    mockStorage = {};
    
    // 初始化组件
    storageManager = new LocalStorageManager({
      prefix: 'test_'
    });
    
    diffGenerator = new DiffGenerator({
      detectArrayMove: true,
      includeStats: true
    });
    
    changeTracker = new ChangeTracker({
      namespace: 'test_changes',
      storageManager: storageManager,
      diffGenerator: diffGenerator,
      includeOriginalData: true
    });
  });
  
  test('三个组件应能协同工作完成完整的数据操作流程', function() {
    // 1. 存储初始数据
    var initialSaveResult = storageManager.set(
      TEST_COLLECTION + '_' + TEST_ITEM_ID, 
      TEST_DATA_INITIAL, 
      { version: 1 }
    );
    expect(initialSaveResult).toBe(true);
    
    // 2. 验证初始数据正确存储
    var savedData = storageManager.get(TEST_COLLECTION + '_' + TEST_ITEM_ID);
    expect(savedData).toEqual(TEST_DATA_INITIAL);
    
    // 3. 跟踪创建操作
    var createChangeResult = changeTracker.trackChange(
      TEST_COLLECTION,
      TEST_ITEM_ID,
      TEST_DATA_INITIAL,
      null,
      'create'
    );
    expect(createChangeResult).toBe(true);
    
    // 4. 验证创建变更已记录
    var changes = changeTracker.getChanges(TEST_COLLECTION);
    expect(changes).toHaveProperty(TEST_ITEM_ID);
    expect(changes[TEST_ITEM_ID].type).toBe('create');
    
    // 5. 更新数据
    var updateSaveResult = storageManager.set(
      TEST_COLLECTION + '_' + TEST_ITEM_ID, 
      TEST_DATA_UPDATED, 
      { version: 2 }
    );
    expect(updateSaveResult).toBe(true);
    
    // 6. 验证更新数据正确存储
    var updatedData = storageManager.get(TEST_COLLECTION + '_' + TEST_ITEM_ID);
    expect(updatedData).toEqual(TEST_DATA_UPDATED);
    
    // 7. 生成数据差异
    var diff = diffGenerator.generateDiff(TEST_DATA_INITIAL, TEST_DATA_UPDATED);
    expect(diff.changes).toBeTruthy();
    expect(Object.keys(diff.changes).length).toBeGreaterThan(0);
    
    // 8. 跟踪更新操作
    var updateChangeResult = changeTracker.trackChange(
      TEST_COLLECTION,
      TEST_ITEM_ID,
      TEST_DATA_UPDATED,
      TEST_DATA_INITIAL,
      'update'
    );
    expect(updateChangeResult).toBe(true);
    
    // 9. 验证更新变更已记录
    changes = changeTracker.getChanges(TEST_COLLECTION);
    expect(changes).toHaveProperty(TEST_ITEM_ID);
    expect(changes[TEST_ITEM_ID].type).toBe('update');
    expect(changes[TEST_ITEM_ID].diff).toBeTruthy();
    
    // 10. 验证能应用差异恢复数据
    var diffPatch = changes[TEST_ITEM_ID].diff;
    var reconstructedData = diffGenerator.applyDiff(TEST_DATA_INITIAL, diffPatch);
    expect(reconstructedData).toEqual(TEST_DATA_UPDATED);
    
    // 11. 删除数据
    var deleteResult = storageManager.remove(TEST_COLLECTION + '_' + TEST_ITEM_ID);
    expect(deleteResult).toBe(true);
    
    // 12. 跟踪删除操作
    var deleteChangeResult = changeTracker.trackChange(
      TEST_COLLECTION,
      TEST_ITEM_ID,
      null,
      TEST_DATA_UPDATED,
      'delete'
    );
    expect(deleteChangeResult).toBe(true);
    
    // 13. 验证删除变更已记录
    changes = changeTracker.getChanges(TEST_COLLECTION);
    expect(changes).toHaveProperty(TEST_ITEM_ID);
    expect(changes[TEST_ITEM_ID].type).toBe('delete');
  });
  
  test('版本控制功能应能正确工作', function() {
    // 1. 存储多个版本的数据
    storageManager.set(
      TEST_COLLECTION + '_' + TEST_ITEM_ID, 
      TEST_DATA_INITIAL, 
      { version: 1 }
    );
    
    // 等待一小段时间确保时间戳不同
    var wait = function(ms) {
      var start = Date.now();
      while(Date.now() - start < ms);
    };
    wait(10);
    
    storageManager.set(
      TEST_COLLECTION + '_' + TEST_ITEM_ID, 
      TEST_DATA_UPDATED, 
      { version: 2 }
    );
    
    // 2. 验证可以获取指定版本
    var v1Data = storageManager.getVersion(TEST_COLLECTION + '_' + TEST_ITEM_ID, 1);
    expect(v1Data).toEqual(TEST_DATA_INITIAL);
    
    var v2Data = storageManager.getVersion(TEST_COLLECTION + '_' + TEST_ITEM_ID, 2);
    expect(v2Data).toEqual(TEST_DATA_UPDATED);
  });
  
  test('批量操作和事务处理应能正确工作', function() {
    // 准备批量测试数据
    var batchData = {
      'item_1': { id: 'item_1', value: 'value1' },
      'item_2': { id: 'item_2', value: 'value2' },
      'item_3': { id: 'item_3', value: 'value3' }
    };
    
    // 1. 批量存储数据
    var batchSaveResult = storageManager.setBatch(TEST_COLLECTION, batchData);
    expect(batchSaveResult.success).toBe(true);
    expect(batchSaveResult.failed.length).toBe(0);
    
    // 2. 批量获取数据
    var retrievedBatch = storageManager.getBatch(TEST_COLLECTION, Object.keys(batchData));
    expect(Object.keys(retrievedBatch).length).toBe(3);
    expect(retrievedBatch['item_1']).toEqual(batchData['item_1']);
    
    // 3. 使用事务更新数据
    var transactionResult = storageManager.transaction(function(txn) {
      // 在事务中读取
      var item1 = txn.get(TEST_COLLECTION + '_item_1');
      
      // 在事务中更新
      item1.value = 'updated_value1';
      txn.set(TEST_COLLECTION + '_item_1', item1);
      
      // 添加新数据
      txn.set(TEST_COLLECTION + '_item_4', { id: 'item_4', value: 'value4' });
      
      // 删除数据
      txn.remove(TEST_COLLECTION + '_item_3');
      
      return true; // 提交事务
    });
    
    expect(transactionResult).toBe(true);
    
    // 4. 验证事务结果
    expect(storageManager.get(TEST_COLLECTION + '_item_1').value).toBe('updated_value1');
    expect(storageManager.get(TEST_COLLECTION + '_item_4')).toEqual({ id: 'item_4', value: 'value4' });
    expect(storageManager.get(TEST_COLLECTION + '_item_3')).toBeNull();
  });
  
  test('变更筛选和查询功能应能正确工作', function() {
    // 1. 记录一系列变更
    changeTracker.trackChange('collection1', 'id1', { value: 'new' }, null, 'create');
    wait(100); // 间隔时间
    changeTracker.trackChange('collection1', 'id2', { value: 'new' }, null, 'create');
    wait(100);
    
    var timestamp = Date.now();
    wait(100);
    
    changeTracker.trackChange('collection1', 'id1', { value: 'updated' }, { value: 'new' }, 'update');
    wait(100);
    changeTracker.trackChange('collection2', 'id1', { value: 'other' }, null, 'create');
    
    // 2. 测试按时间筛选
    var recentChanges = changeTracker.getChanges(null, null, { since: timestamp });
    expect(Object.keys(recentChanges).length).toBe(2); // collection1和collection2
    expect(recentChanges.collection1).toHaveProperty('id1');
    expect(recentChanges.collection2).toHaveProperty('id1');
    expect(recentChanges.collection1).not.toHaveProperty('id2'); // 太早的变更
    
    // 3. 测试按类型筛选
    var createChanges = changeTracker.getChanges(null, null, { types: ['create'] });
    expect(createChanges.collection1).toHaveProperty('id2');
    expect(createChanges.collection2).toHaveProperty('id1');
    expect(createChanges.collection1).not.toHaveProperty('id1'); // 最新的是update
    
    // 辅助函数：等待
    function wait(ms) {
      var start = Date.now();
      while(Date.now() - start < ms);
    }
  });
}); 