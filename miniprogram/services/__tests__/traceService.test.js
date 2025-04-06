const TraceService = require('../traceService');
const EventBus = require('../../utils/eventBus');

// 模拟依赖
jest.mock('../../utils/eventBus', () => ({
  on: jest.fn(),
  emit: jest.fn()
}));

describe('TraceService', () => {
  let mockContainer;
  let mockStorageService;
  let mockSyncService;
  
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    
    // 创建模拟存储服务
    mockStorageService = {
      saveItem: jest.fn().mockResolvedValue({}),
      getItem: jest.fn().mockResolvedValue(null),
      getCollection: jest.fn().mockResolvedValue([]),
      removeItem: jest.fn().mockResolvedValue(true)
    };
    
    // 创建模拟同步服务
    mockSyncService = {
      addToSyncQueue: jest.fn().mockResolvedValue({})
    };
    
    // 创建模拟容器
    mockContainer = {
      get: jest.fn((serviceName) => {
        if (serviceName === 'storageService') return mockStorageService;
        if (serviceName === 'syncService') return mockSyncService;
        return null;
      })
    };
    
    // 初始化服务
    TraceService.init(mockContainer);
  });
  
  describe('init', () => {
    it('应该初始化服务并返回实例', () => {
      const result = TraceService.init(mockContainer);
      
      expect(result).toBe(TraceService);
      expect(TraceService.container).toBe(mockContainer);
      expect(EventBus.on).toHaveBeenCalledWith('trace:data:updated', expect.any(Function));
    });
  });
  
  describe('getTraceTypes', () => {
    it('应该返回留痕类型列表', () => {
      const types = TraceService.getTraceTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types[0]).toHaveProperty('id');
      expect(types[0]).toHaveProperty('name');
      expect(types[0]).toHaveProperty('icon');
      expect(types[0]).toHaveProperty('description');
    });
  });
  
  describe('createTrace', () => {
    it('应该创建新的留痕记录', async () => {
      // 模拟saveTrace方法
      const mockTrace = { id: 'test_id', type: 'article' };
      TraceService.saveTrace = jest.fn().mockResolvedValue(mockTrace);
      
      const result = await TraceService.createTrace('article');
      
      expect(TraceService.saveTrace).toHaveBeenCalled();
      expect(result).toBe(mockTrace);
    });
  });
  
  describe('saveTrace', () => {
    it('应该保存留痕记录并触发事件', async () => {
      const mockTrace = { id: 'test_id', type: 'article' };
      
      mockStorageService.saveItem.mockResolvedValue(mockTrace);
      
      const result = await TraceService.saveTrace(mockTrace);
      
      expect(mockStorageService.saveItem).toHaveBeenCalledWith('traces', mockTrace.id, expect.objectContaining({
        id: mockTrace.id
      }));
      
      expect(EventBus.emit).toHaveBeenCalledWith('trace:data:updated', expect.objectContaining({
        id: mockTrace.id
      }));
      
      expect(result).toEqual(expect.objectContaining({
        id: mockTrace.id
      }));
    });
  });
  
  describe('getTraceById', () => {
    it('应该根据ID获取留痕记录', async () => {
      const mockTrace = { id: 'test_id', type: 'article' };
      
      mockStorageService.getItem.mockResolvedValue(mockTrace);
      
      const result = await TraceService.getTraceById('test_id');
      
      expect(mockStorageService.getItem).toHaveBeenCalledWith('traces', 'test_id');
      expect(result).toBe(mockTrace);
    });
  });
  
  describe('getAllTraces', () => {
    it('应该获取所有留痕记录', async () => {
      const mockTraces = [
        { id: 'test_id1', type: 'article', updatedAt: '2023-04-02T00:00:00.000Z' },
        { id: 'test_id2', type: 'story', updatedAt: '2023-04-01T00:00:00.000Z' }
      ];
      
      mockStorageService.getCollection.mockResolvedValue(mockTraces);
      
      const result = await TraceService.getAllTraces();
      
      expect(mockStorageService.getCollection).toHaveBeenCalledWith('traces');
      expect(result).toEqual(mockTraces);
      // 检查排序
      expect(result[0].id).toBe('test_id1');
    });
    
    it('应该根据类型筛选留痕记录', async () => {
      const mockTraces = [
        { id: 'test_id1', type: 'article', updatedAt: '2023-04-01T00:00:00.000Z' },
        { id: 'test_id2', type: 'story', updatedAt: '2023-04-01T00:00:00.000Z' }
      ];
      
      mockStorageService.getCollection.mockResolvedValue(mockTraces);
      
      const result = await TraceService.getAllTraces({ type: 'article' });
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('article');
    });
  });
  
  describe('removeTrace', () => {
    it('应该删除留痕记录并触发事件', async () => {
      const result = await TraceService.removeTrace('test_id');
      
      expect(mockStorageService.removeItem).toHaveBeenCalledWith('traces', 'test_id');
      expect(EventBus.emit).toHaveBeenCalledWith('trace:data:removed', { id: 'test_id' });
      expect(result).toBe(true);
    });
  });
  
  describe('handleDataUpdated', () => {
    it('应该将本地数据添加到同步队列', async () => {
      const mockData = { id: 'test_id', syncStatus: 'local' };
      
      await TraceService.handleDataUpdated(mockData);
      
      expect(mockSyncService.addToSyncQueue).toHaveBeenCalledWith('traces', mockData.id, mockData);
    });
    
    it('不应该将已同步的数据添加到同步队列', async () => {
      const mockData = { id: 'test_id', syncStatus: 'synced' };
      
      await TraceService.handleDataUpdated(mockData);
      
      expect(mockSyncService.addToSyncQueue).not.toHaveBeenCalled();
    });
  });
}); 