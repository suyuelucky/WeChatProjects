/**
 * 数据管理框架与核心同步框架集成测试
 * 
 * 创建时间: 2025年04月09日 11:05:47 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 导入数据管理框架组件
var LocalStorageManager = require('../../sync/LocalStorageManager');
var ChangeTracker = require('../../sync/ChangeTracker');
var DiffGenerator = require('../../sync/DiffGenerator');

// 导入核心同步框架组件
var SyncManager = require('../../SyncManager');
var SyncAdapter = require('../../SyncAdapter');
var SyncService = require('../../syncService');
var SyncScheduler = require('../../SyncScheduler');

// 导入依赖
var EventBus = require('../../../utils/eventBus');

// 模拟依赖容器
var mockContainer = {
  components: {},
  register: function(name, component) {
    this.components[name] = component;
    return component;
  },
  resolve: function(name) {
    return this.components[name];
  }
};

// 模拟网络服务
var mockNetworkService = {
  isConnected: true,
  request: function(options) {
    var promise = {
      then: function(callback) {
        if (mockNetworkService.isConnected) {
          callback({
            statusCode: 200,
            data: options.mockResponse || { success: true }
          });
        }
        return promise;
      },
      catch: function(callback) {
        if (!mockNetworkService.isConnected) {
          callback(new Error('网络连接失败'));
        }
        return promise;
      }
    };
    return promise;
  },
  setConnected: function(connected) {
    this.isConnected = connected;
    EventBus.emit('network:status:changed', { connected: connected });
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
  },
  getStorageInfo: function() {
    return {
      keys: Object.keys(mockStorage),
      currentSize: JSON.stringify(mockStorage).length,
      limitSize: 10 * 1024 * 1024
    };
  }
};

// 测试数据
var TEST_COLLECTION = 'test_products';
var TEST_ITEMS = {
  'product_1': {
    id: 'product_1',
    name: '测试产品1',
    price: 100,
    inventory: 50,
    category: '电子',
    lastUpdated: Date.now()
  },
  'product_2': {
    id: 'product_2',
    name: '测试产品2',
    price: 200,
    inventory: 30,
    category: '家居',
    lastUpdated: Date.now()
  },
  'product_3': {
    id: 'product_3',
    name: '测试产品3',
    price: 150,
    inventory: 20,
    category: '电子',
    lastUpdated: Date.now()
  }
};

describe('数据管理框架与核心同步框架集成测试', function() {
  var storageManager, changeTracker, diffGenerator;
  var syncManager, syncService;
  
  beforeEach(function() {
    // 重置存储和容器
    mockStorage = {};
    mockContainer.components = {};
    
    // 注册网络服务
    mockContainer.register('networkService', mockNetworkService);
    
    // 初始化数据管理框架组件
    storageManager = new LocalStorageManager({
      prefix: 'test_sync_'
    });
    
    diffGenerator = new DiffGenerator({
      detectArrayMove: true,
      includeStats: true
    });
    
    changeTracker = new ChangeTracker({
      namespace: 'test_sync_changes',
      storageManager: storageManager,
      diffGenerator: diffGenerator
    });
    
    // 注册数据管理框架组件
    mockContainer.register('localStorageManager', storageManager);
    mockContainer.register('changeTracker', changeTracker);
    mockContainer.register('diffGenerator', diffGenerator);
    
    // 准备同步管理器配置
    var syncConfig = {
      appId: 'test_app',
      autoStart: false,
      collections: [TEST_COLLECTION],
      localAdapter: {
        storage: storageManager
      },
      cloudAdapter: {
        baseUrl: 'https://api.example.com/sync'
      }
    };
    
    // 初始化同步管理器
    syncManager = SyncManager.init({
      container: mockContainer,
      config: syncConfig
    });
    
    // 获取同步服务
    syncService = mockContainer.resolve('syncService');
  });
  
  test('同步管理器应能正确检测和使用数据管理框架组件', function() {
    // 验证组件注册
    expect(mockContainer.resolve('localStorageManager')).toBe(storageManager);
    expect(mockContainer.resolve('changeTracker')).toBe(changeTracker);
    expect(mockContainer.resolve('diffGenerator')).toBe(diffGenerator);
    
    // 验证同步管理器初始化
    expect(syncManager).toBeTruthy();
    expect(syncManager.syncService).toBeTruthy();
    
    // 验证本地适配器使用了存储管理器
    var localAdapter = mockContainer.resolve('localAdapter');
    expect(localAdapter).toBeTruthy();
    expect(localAdapter.config.storage).toBe(storageManager);
  });
  
  test('本地适配器应能通过数据管理框架组件存取数据', function() {
    // 获取本地适配器
    var localAdapter = mockContainer.resolve('localAdapter');
    
    // 模拟本地存储数据
    storageManager.setBatch(TEST_COLLECTION, TEST_ITEMS);
    
    // 通过适配器查询数据
    var listResult = localAdapter.list(TEST_COLLECTION);
    expect(listResult.success).toBe(true);
    expect(Object.keys(listResult.data).length).toBe(3);
    
    // 通过适配器获取单条数据
    var getResult = localAdapter.get(TEST_COLLECTION, 'product_1');
    expect(getResult.success).toBe(true);
    expect(getResult.data.name).toBe('测试产品1');
    
    // 通过适配器更新数据
    var updatedProduct = Object.assign({}, TEST_ITEMS.product_1, { price: 120 });
    var updateResult = localAdapter.update(TEST_COLLECTION, 'product_1', updatedProduct);
    expect(updateResult.success).toBe(true);
    
    // 验证更新是否通过存储管理器保存
    var savedProduct = storageManager.get(TEST_COLLECTION + '_product_1');
    expect(savedProduct.price).toBe(120);
  });
  
  test('差异同步应使用ChangeTracker和DiffGenerator功能', function() {
    // 获取本地适配器
    var localAdapter = mockContainer.resolve('localAdapter');
    
    // 模拟本地存储数据
    storageManager.setBatch(TEST_COLLECTION, TEST_ITEMS);
    
    // 模拟本地数据变更
    var updatedItems = {
      'product_1': Object.assign({}, TEST_ITEMS.product_1, { 
        price: 120, 
        inventory: 45,
        lastUpdated: Date.now()
      }),
      'product_4': {
        id: 'product_4',
        name: '新产品',
        price: 300,
        inventory: 10,
        category: '家居',
        lastUpdated: Date.now()
      }
    };
    
    // 更新和创建数据
    Object.keys(updatedItems).forEach(function(id) {
      var oldData = TEST_ITEMS[id];
      var newData = updatedItems[id];
      
      // 保存数据
      storageManager.set(TEST_COLLECTION + '_' + id, newData);
      
      // 跟踪变更
      changeTracker.trackChange(
        TEST_COLLECTION,
        id,
        newData,
        oldData,
        oldData ? 'update' : 'create'
      );
    });
    
    // 删除一个产品
    storageManager.remove(TEST_COLLECTION + '_product_2');
    changeTracker.trackChange(
      TEST_COLLECTION,
      'product_2',
      null,
      TEST_ITEMS.product_2,
      'delete'
    );
    
    // 获取变更
    var changes = changeTracker.getChanges();
    expect(changes).toHaveProperty(TEST_COLLECTION);
    expect(Object.keys(changes[TEST_COLLECTION]).length).toBe(3); // 1更新，1创建，1删除
    
    // 模拟差异同步功能
    var syncData = syncService.prepareDiffSync(TEST_COLLECTION);
    
    // 验证差异同步数据包含变更信息
    expect(syncData).toHaveProperty('changes');
    expect(syncData.changes).toHaveProperty(TEST_COLLECTION);
    expect(Object.keys(syncData.changes[TEST_COLLECTION]).length).toBe(3);
    
    // 验证包含创建、更新和删除操作
    var collectionChanges = syncData.changes[TEST_COLLECTION];
    expect(collectionChanges['product_1'].type).toBe('update');
    expect(collectionChanges['product_4'].type).toBe('create');
    expect(collectionChanges['product_2'].type).toBe('delete');
    
    // 验证更新操作包含差异信息
    expect(collectionChanges['product_1']).toHaveProperty('diff');
    
    // 验证可以通过差异恢复数据
    var original = TEST_ITEMS.product_1;
    var diff = collectionChanges['product_1'].diff;
    var reconstructed = diffGenerator.applyDiff(original, diff);
    expect(reconstructed.price).toBe(120);
    expect(reconstructed.inventory).toBe(45);
  });

  test('同步过程中应正确处理冲突', function() {
    // 获取本地适配器
    var localAdapter = mockContainer.resolve('localAdapter');
    
    // 模拟本地存储数据
    storageManager.setBatch(TEST_COLLECTION, TEST_ITEMS);
    
    // 模拟本地和服务器数据冲突
    var localUpdated = Object.assign({}, TEST_ITEMS.product_1, { 
      price: 120,
      lastUpdated: Date.now() - 1000 // 本地更新较早
    });
    
    var serverUpdated = Object.assign({}, TEST_ITEMS.product_1, {
      price: 150,
      lastUpdated: Date.now() // 服务器更新较新
    });
    
    // 更新本地数据
    storageManager.set(TEST_COLLECTION + '_product_1', localUpdated);
    changeTracker.trackChange(
      TEST_COLLECTION,
      'product_1',
      localUpdated,
      TEST_ITEMS.product_1,
      'update'
    );
    
    // 模拟从服务器获取的更新数据
    var mockServerResponse = {
      collection: TEST_COLLECTION,
      changes: {
        'product_1': {
          type: 'update',
          data: serverUpdated
        }
      }
    };
    
    // 模拟合并冲突
    var merged = syncService.resolveConflict(
      TEST_COLLECTION,
      'product_1',
      localUpdated,
      serverUpdated,
      'server-wins' // 冲突解决策略
    );
    
    // 验证冲突解决结果
    expect(merged.price).toBe(150); // 应采用服务器价格
    
    // 模拟使用不同的冲突解决策略
    merged = syncService.resolveConflict(
      TEST_COLLECTION,
      'product_1',
      localUpdated,
      serverUpdated,
      'client-wins' // 冲突解决策略
    );
    
    // 验证冲突解决结果
    expect(merged.price).toBe(120); // 应采用本地价格
  });
}); 