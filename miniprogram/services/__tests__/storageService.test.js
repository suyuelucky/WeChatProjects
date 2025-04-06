const StorageService = require('../storageService');
const EventBus = require('../../utils/eventBus');

// 模拟依赖
jest.mock('../../utils/eventBus', () => ({
  emit: jest.fn()
}));

// 模拟wx API
global.wx = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  getStorageInfo: jest.fn()
};

describe('StorageService', () => {
  let mockContainer;
  
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    
    // 创建模拟容器
    mockContainer = {};
    
    // 初始化服务
    StorageService.init(mockContainer);
    
    // 默认存储数据
    const mockStorageData = {
      'test_collection': {
        'test_id': { id: 'test_id', value: 'test_value' }
      }
    };
    
    // 模拟wx.getStorageSync的实现
    wx.getStorageSync.mockImplementation((key) => {
      return mockStorageData[key];
    });
  });
  
  describe('init', () => {
    it('应该初始化服务并返回实例', () => {
      const result = StorageService.init(mockContainer);
      
      expect(result).toBe(StorageService);
      expect(StorageService.container).toBe(mockContainer);
    });
  });
  
  describe('saveItem', () => {
    it('应该保存数据项并触发事件', async () => {
      const collection = 'test_collection';
      const id = 'test_id';
      const data = { id, name: 'Test Item' };
      
      const result = await StorageService.saveItem(collection, id, data);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(wx.setStorageSync).toHaveBeenCalledWith(collection, expect.objectContaining({
        [id]: data
      }));
      expect(EventBus.emit).toHaveBeenCalledWith('storage:item:saved', {
        collection,
        id,
        data
      });
      expect(result).toBe(data);
    });
    
    it('应该处理新集合的情况', async () => {
      const collection = 'new_collection';
      const id = 'test_id';
      const data = { id, name: 'Test Item' };
      
      // 模拟新集合返回null
      wx.getStorageSync.mockReturnValueOnce(null);
      
      const result = await StorageService.saveItem(collection, id, data);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(wx.setStorageSync).toHaveBeenCalledWith(collection, {
        [id]: data
      });
      expect(result).toBe(data);
    });
    
    it('应该处理错误情况', async () => {
      const collection = 'test_collection';
      const id = 'test_id';
      const data = { id, name: 'Test Item' };
      
      // 模拟出错
      wx.getStorageSync.mockImplementationOnce(() => {
        throw new Error('模拟存储错误');
      });
      
      await expect(StorageService.saveItem(collection, id, data)).rejects.toThrow();
    });
  });
  
  describe('getItem', () => {
    it('应该获取数据项', async () => {
      const collection = 'test_collection';
      const id = 'test_id';
      const mockItem = { id, value: 'test_value' };
      
      const result = await StorageService.getItem(collection, id);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(result).toEqual(mockItem);
    });
    
    it('应该处理不存在的数据项', async () => {
      const collection = 'test_collection';
      const id = 'non_existent_id';
      
      const result = await StorageService.getItem(collection, id);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(result).toBeNull();
    });
    
    it('应该处理错误情况', async () => {
      const collection = 'test_collection';
      const id = 'test_id';
      
      // 模拟出错
      wx.getStorageSync.mockImplementationOnce(() => {
        throw new Error('模拟存储错误');
      });
      
      await expect(StorageService.getItem(collection, id)).rejects.toThrow();
    });
  });
  
  describe('getCollection', () => {
    it('应该获取集合中的所有数据', async () => {
      const collection = 'test_collection';
      const mockItems = [{ id: 'test_id', value: 'test_value' }];
      
      const result = await StorageService.getCollection(collection);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(result).toEqual(mockItems);
    });
    
    it('应该处理空集合', async () => {
      const collection = 'empty_collection';
      
      // 模拟空集合
      wx.getStorageSync.mockReturnValueOnce({});
      
      const result = await StorageService.getCollection(collection);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(result).toEqual([]);
    });
    
    it('应该处理不存在的集合', async () => {
      const collection = 'non_existent_collection';
      
      // 模拟不存在的集合
      wx.getStorageSync.mockReturnValueOnce(null);
      
      const result = await StorageService.getCollection(collection);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(result).toEqual([]);
    });
    
    it('应该处理错误情况', async () => {
      const collection = 'test_collection';
      
      // 模拟出错
      wx.getStorageSync.mockImplementationOnce(() => {
        throw new Error('模拟存储错误');
      });
      
      await expect(StorageService.getCollection(collection)).rejects.toThrow();
    });
  });
  
  describe('removeItem', () => {
    it('应该删除数据项并触发事件', async () => {
      const collection = 'test_collection';
      const id = 'test_id';
      
      const result = await StorageService.removeItem(collection, id);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      expect(wx.setStorageSync).toHaveBeenCalled();
      expect(EventBus.emit).toHaveBeenCalledWith('storage:item:removed', {
        collection,
        id
      });
      expect(result).toBe(true);
    });
    
    it('应该处理不存在的数据项', async () => {
      const collection = 'test_collection';
      const id = 'non_existent_id';
      
      const result = await StorageService.removeItem(collection, id);
      
      expect(wx.getStorageSync).toHaveBeenCalledWith(collection);
      // 对于不存在的项也应返回成功
      expect(result).toBe(true);
    });
    
    it('应该处理错误情况', async () => {
      const collection = 'test_collection';
      const id = 'test_id';
      
      // 模拟出错
      wx.getStorageSync.mockImplementationOnce(() => {
        throw new Error('模拟存储错误');
      });
      
      await expect(StorageService.removeItem(collection, id)).rejects.toThrow();
    });
  });
  
  describe('clearCollection', () => {
    it('应该清空集合并触发事件', async () => {
      const collection = 'test_collection';
      
      const result = await StorageService.clearCollection(collection);
      
      expect(wx.removeStorageSync).toHaveBeenCalledWith(collection);
      expect(EventBus.emit).toHaveBeenCalledWith('storage:collection:cleared', {
        collection
      });
      expect(result).toBe(true);
    });
    
    it('应该处理错误情况', async () => {
      const collection = 'test_collection';
      
      // 模拟出错
      wx.removeStorageSync.mockImplementationOnce(() => {
        throw new Error('模拟存储错误');
      });
      
      await expect(StorageService.clearCollection(collection)).rejects.toThrow();
    });
  });
  
  describe('getStorageInfo', () => {
    it('应该获取存储使用情况', async () => {
      const mockStorageInfo = {
        currentSize: 1024,
        limitSize: 10240,
        keys: ['test_collection']
      };
      
      wx.getStorageInfo.mockImplementationOnce(({ success }) => {
        success(mockStorageInfo);
      });
      
      const result = await StorageService.getStorageInfo();
      
      expect(wx.getStorageInfo).toHaveBeenCalled();
      expect(result).toEqual(mockStorageInfo);
    });
    
    it('应该处理错误情况', async () => {
      wx.getStorageInfo.mockImplementationOnce(({ fail }) => {
        fail(new Error('模拟存储信息错误'));
      });
      
      await expect(StorageService.getStorageInfo()).rejects.toThrow();
    });
  });
}); 