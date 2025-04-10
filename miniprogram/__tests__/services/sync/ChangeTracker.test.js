/**
 * ChangeTracker组件单元测试
 * 
 * 创建时间: 2025年4月9日 10:48:35 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 导入被测试模块和依赖
const ChangeTracker = require('../../../services/sync/ChangeTracker');
const LocalStorageManager = require('../../../services/sync/LocalStorageManager');
const DiffGenerator = require('../../../services/sync/DiffGenerator');

// 模拟依赖模块
jest.mock('../../../services/sync/LocalStorageManager');
jest.mock('../../../services/sync/DiffGenerator');

describe('ChangeTracker', () => {
  let changeTracker;
  let mockLocalStorageManager;
  let mockDiffGenerator;
  
  // 测试数据
  const testData = {
    user1: { id: 'user1', name: 'User 1', email: 'user1@example.com' },
    user2: { id: 'user2', name: 'User 2', email: 'user2@example.com' }
  };
  
  // 在每个测试前设置模拟和创建实例
  beforeEach(() => {
    // 创建模拟实现
    mockLocalStorageManager = new LocalStorageManager();
    mockDiffGenerator = new DiffGenerator();
    
    // 模拟LocalStorageManager方法
    mockLocalStorageManager.get = jest.fn().mockImplementation((key, defaultValue) => {
      if (key === 'changes') {
        return {};
      }
      return defaultValue || null;
    });
    
    mockLocalStorageManager.set = jest.fn();
    mockLocalStorageManager.remove = jest.fn();
    mockLocalStorageManager.keys = jest.fn().mockReturnValue([]);
    
    // 模拟DiffGenerator方法
    mockDiffGenerator.generateDiff = jest.fn().mockImplementation((oldData, newData) => {
      return {
        type: 'object',
        changes: {
          // 简化的差异对象
          name: { 
            oldValue: oldData?.name, 
            newValue: newData?.name 
          }
        }
      };
    });
    
    // 创建被测试实例
    changeTracker = new ChangeTracker({
      storageManager: mockLocalStorageManager,
      diffGenerator: mockDiffGenerator,
      namespace: 'test'
    });
  });
  
  // 基本功能测试
  describe('基本功能', () => {
    test('初始化应创建有效实例', () => {
      expect(changeTracker).toBeDefined();
      expect(typeof changeTracker.trackChange).toBe('function');
      expect(typeof changeTracker.getChanges).toBe('function');
      expect(typeof changeTracker.clearChanges).toBe('function');
    });
    
    test('初始化应设置默认选项', () => {
      // 创建没有选项的实例
      const defaultTracker = new ChangeTracker();
      
      // 验证默认值
      expect(defaultTracker.options.maxChanges).toBe(1000);
      expect(defaultTracker.options.namespace).toBe('changes');
      expect(defaultTracker.options.includeTimestamp).toBe(true);
    });
  });
  
  // 变更跟踪测试
  describe('变更跟踪', () => {
    test('跟踪数据创建', () => {
      // 跟踪新数据创建
      const result = changeTracker.trackChange('users', 'user1', testData.user1, null, 'create');
      
      // 验证变更被存储
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        expect.stringContaining('changes'),
        expect.objectContaining({
          users: expect.objectContaining({
            user1: expect.objectContaining({
              type: 'create',
              data: testData.user1
            })
          })
        }),
        expect.anything()
      );
      
      // 验证返回值
      expect(result).toBeTruthy();
    });
    
    test('跟踪数据更新', () => {
      // 模拟旧数据
      const oldData = { id: 'user1', name: 'Old Name', email: 'user1@example.com' };
      const newData = { id: 'user1', name: 'New Name', email: 'user1@example.com' };
      
      // 跟踪数据更新
      const result = changeTracker.trackChange('users', 'user1', newData, oldData, 'update');
      
      // 验证差异生成器被调用
      expect(mockDiffGenerator.generateDiff).toHaveBeenCalledWith(oldData, newData, expect.anything());
      
      // 验证变更被存储
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        expect.stringContaining('changes'),
        expect.objectContaining({
          users: expect.objectContaining({
            user1: expect.objectContaining({
              type: 'update',
              data: newData,
              diff: expect.anything()
            })
          })
        }),
        expect.anything()
      );
      
      // 验证返回值
      expect(result).toBeTruthy();
    });
    
    test('跟踪数据删除', () => {
      // 跟踪数据删除
      const result = changeTracker.trackChange('users', 'user1', null, testData.user1, 'delete');
      
      // 验证变更被存储
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        expect.stringContaining('changes'),
        expect.objectContaining({
          users: expect.objectContaining({
            user1: expect.objectContaining({
              type: 'delete',
              originalData: testData.user1
            })
          })
        }),
        expect.anything()
      );
      
      // 验证返回值
      expect(result).toBeTruthy();
    });
    
    test('无实际变更时不记录', () => {
      // 模拟DiffGenerator返回空差异
      mockDiffGenerator.generateDiff.mockReturnValueOnce({
        type: 'object',
        changes: {}
      });
      
      // 尝试跟踪没有实际变化的更新
      const result = changeTracker.trackChange(
        'users', 
        'user1', 
        testData.user1, 
        testData.user1, 
        'update'
      );
      
      // 验证没有存储变更
      expect(mockLocalStorageManager.set).not.toHaveBeenCalled();
      
      // 验证返回false
      expect(result).toBeFalsy();
    });
  });
  
  // 变更查询测试
  describe('变更查询', () => {
    beforeEach(() => {
      // 模拟存在变更数据
      mockLocalStorageManager.get.mockImplementation((key) => {
        if (key === 'test_changes') {
          return {
            users: {
              user1: {
                type: 'update',
                timestamp: Date.now() - 1000,
                data: testData.user1,
                diff: { name: { oldValue: 'Old Name', newValue: 'User 1' } }
              },
              user2: {
                type: 'create',
                timestamp: Date.now(),
                data: testData.user2
              }
            },
            posts: {
              post1: {
                type: 'delete',
                timestamp: Date.now() - 2000,
                originalData: { id: 'post1', title: 'Post 1' }
              }
            }
          };
        }
        return null;
      });
    });
    
    test('获取所有变更', () => {
      // 获取所有变更
      const changes = changeTracker.getChanges();
      
      // 验证返回所有集合的变更
      expect(changes).toHaveProperty('users');
      expect(changes).toHaveProperty('posts');
      expect(Object.keys(changes.users)).toHaveLength(2);
      expect(Object.keys(changes.posts)).toHaveLength(1);
    });
    
    test('获取特定集合的变更', () => {
      // 获取特定集合的变更
      const changes = changeTracker.getChanges('users');
      
      // 验证只返回指定集合的变更
      expect(changes).toHaveProperty('user1');
      expect(changes).toHaveProperty('user2');
      expect(Object.keys(changes)).toHaveLength(2);
    });
    
    test('获取特定ID的变更', () => {
      // 获取特定ID的变更
      const change = changeTracker.getChanges('users', 'user1');
      
      // 验证返回特定ID的变更
      expect(change).toHaveProperty('type', 'update');
      expect(change).toHaveProperty('data');
      expect(change).toHaveProperty('diff');
    });
    
    test('按时间段筛选变更', () => {
      const now = Date.now();
      
      // 获取最近500毫秒内的变更
      const recentChanges = changeTracker.getChanges(null, null, {
        since: now - 500
      });
      
      // 验证只返回最近的变更
      expect(recentChanges).toHaveProperty('users');
      expect(recentChanges.users).toHaveProperty('user2');
      expect(recentChanges.users).not.toHaveProperty('user1');
      expect(recentChanges).not.toHaveProperty('posts');
    });
    
    test('按变更类型筛选', () => {
      // 获取只包含创建操作的变更
      const createChanges = changeTracker.getChanges(null, null, {
        types: ['create']
      });
      
      // 验证只返回创建类型的变更
      expect(createChanges).toHaveProperty('users');
      expect(createChanges.users).toHaveProperty('user2');
      expect(createChanges.users).not.toHaveProperty('user1');
      expect(createChanges).not.toHaveProperty('posts');
    });
  });
  
  // 变更管理测试
  describe('变更管理', () => {
    test('清除所有变更', () => {
      // 清除所有变更
      changeTracker.clearChanges();
      
      // 验证存储被重置
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        expect.stringContaining('changes'),
        {},
        expect.anything()
      );
    });
    
    test('清除特定集合的变更', () => {
      // 模拟存在变更数据
      mockLocalStorageManager.get.mockReturnValueOnce({
        users: { user1: {}, user2: {} },
        posts: { post1: {} }
      });
      
      // 清除特定集合的变更
      changeTracker.clearChanges('users');
      
      // 验证只清除了指定集合
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        expect.stringContaining('changes'),
        { posts: { post1: {} } },
        expect.anything()
      );
    });
    
    test('清除特定ID的变更', () => {
      // 模拟存在变更数据
      mockLocalStorageManager.get.mockReturnValueOnce({
        users: { user1: {}, user2: {} },
        posts: { post1: {} }
      });
      
      // 清除特定ID的变更
      changeTracker.clearChanges('users', 'user1');
      
      // 验证只清除了指定ID
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        expect.stringContaining('changes'),
        {
          users: { user2: {} },
          posts: { post1: {} }
        },
        expect.anything()
      );
    });
    
    test('变更数量超出限制时自动清理', () => {
      // 创建一个最大变更数为2的跟踪器
      const limitedTracker = new ChangeTracker({
        storageManager: mockLocalStorageManager,
        diffGenerator: mockDiffGenerator,
        maxChanges: 2
      });
      
      // 模拟已经有2个变更
      mockLocalStorageManager.get.mockReturnValueOnce({
        users: {
          user1: {
            timestamp: Date.now() - 1000,
            type: 'create'
          },
          user2: {
            timestamp: Date.now(),
            type: 'create'
          }
        }
      });
      
      // 添加新的变更，应该触发自动清理
      limitedTracker.trackChange('users', 'user3', { id: 'user3' }, null, 'create');
      
      // 验证最旧的变更被清除
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({
          users: expect.objectContaining({
            user1: expect.anything()
          })
        }),
        expect.anything()
      );
    });
  });
  
  // 与其他组件集成测试
  describe('集成测试', () => {
    test('生成变更批次', () => {
      // 模拟存在变更数据
      mockLocalStorageManager.get.mockReturnValueOnce({
        users: {
          user1: {
            type: 'update',
            timestamp: Date.now(),
            data: testData.user1,
            diff: { name: { oldValue: 'Old Name', newValue: 'User 1' } }
          },
          user2: {
            type: 'create',
            timestamp: Date.now(),
            data: testData.user2
          }
        },
        posts: {
          post1: {
            type: 'delete',
            timestamp: Date.now(),
            originalData: { id: 'post1', title: 'Post 1' }
          }
        }
      });
      
      // 生成变更批次
      const batch = changeTracker.generateChangeBatch();
      
      // 验证批次格式
      expect(batch).toHaveProperty('changes');
      expect(batch).toHaveProperty('timestamp');
      expect(batch).toHaveProperty('collections');
      expect(batch.collections).toContain('users');
      expect(batch.collections).toContain('posts');
      
      // 验证变更内容
      expect(batch.changes).toHaveProperty('users');
      expect(batch.changes).toHaveProperty('posts');
      expect(batch.changes.users).toHaveProperty('user1');
      expect(batch.changes.users).toHaveProperty('user2');
      expect(batch.changes.posts).toHaveProperty('post1');
    });
    
    test('应用变更批次', () => {
      // 模拟变更批次
      const batch = {
        changes: {
          users: {
            user1: {
              type: 'update',
              data: testData.user1,
              diff: { name: { oldValue: 'Old Name', newValue: 'User 1' } }
            }
          }
        },
        timestamp: Date.now(),
        collections: ['users']
      };
      
      // 模拟数据存储服务
      const mockDataService = {
        set: jest.fn(),
        remove: jest.fn()
      };
      
      // 应用变更批次
      changeTracker.applyChangeBatch(batch, mockDataService);
      
      // 验证数据操作
      expect(mockDataService.set).toHaveBeenCalledWith(
        'users',
        'user1',
        testData.user1
      );
    });
  });
  
  // 性能测试
  describe('性能测试', () => {
    test('大量变更处理性能', () => {
      // 准备大量变更数据
      const largeChanges = {};
      const changeCount = 500;
      
      for (let i = 0; i < changeCount; i++) {
        largeChanges[`user${i}`] = {
          type: i % 3 === 0 ? 'create' : (i % 3 === 1 ? 'update' : 'delete'),
          timestamp: Date.now() - i * 10,
          data: i % 3 !== 2 ? { id: `user${i}`, name: `User ${i}` } : undefined,
          originalData: i % 3 === 2 ? { id: `user${i}`, name: `User ${i}` } : undefined,
          diff: i % 3 === 1 ? { name: { oldValue: `Old ${i}`, newValue: `User ${i}` } } : undefined
        };
      }
      
      // 模拟存储中有大量变更
      mockLocalStorageManager.get.mockReturnValueOnce({
        users: largeChanges
      });
      
      // 测量生成批次的性能
      const startTime = Date.now();
      const batch = changeTracker.generateChangeBatch();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      console.log(`处理${changeCount}个变更耗时: ${duration}ms`);
      
      // 验证性能在可接受范围内
      expect(duration).toBeLessThan(100); // 100ms以内
      
      // 验证结果正确性
      expect(Object.keys(batch.changes.users)).toHaveLength(changeCount);
    });
  });
}); 