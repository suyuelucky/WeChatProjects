const DetailPage = require('../trace/detail/index');
const EventBus = require('../../utils/eventBus');

describe('工作跟踪详情页', () => {
  let page;
  let mockTraceService;
  let mockApp;

  // 模拟工作跟踪数据
  const mockTrace = {
    id: 'trace-123',
    title: '测试工作跟踪',
    content: '这是一个测试工作跟踪的内容描述',
    type: 'daily',
    status: 'completed',
    location: {
      name: '测试地点',
      address: '测试地址',
      latitude: 31.2304,
      longitude: 121.4737
    },
    createdAt: new Date('2023-01-01T08:00:00Z').getTime(),
    updatedAt: new Date('2023-01-01T09:30:00Z').getTime(),
    photos: [
      {
        id: 'photo-1',
        url: 'https://example.com/photo1.jpg',
        thumbnailUrl: 'https://example.com/photo1-thumb.jpg',
        description: '照片1描述'
      },
      {
        id: 'photo-2',
        url: 'https://example.com/photo2.jpg',
        thumbnailUrl: 'https://example.com/photo2-thumb.jpg',
        description: '照片2描述'
      }
    ]
  };

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟TraceService
    mockTraceService = {
      getTraceById: jest.fn().mockResolvedValue(mockTrace),
      removeTrace: jest.fn().mockResolvedValue(true)
    };
    
    // 模拟App实例
    mockApp = {
      getService: jest.fn().mockImplementation((service) => {
        if (service === 'traceService') {
          return mockTraceService;
        }
        return null;
      }),
      globalData: {
        networkType: 'wifi',
        isConnected: true
      }
    };
    
    // 覆盖全局getApp
    global.getApp = jest.fn().mockReturnValue(mockApp);
    
    // 模拟Page方法
    global.Page = jest.fn(pageConfig => {
      page = pageConfig;
      return pageConfig;
    });
    
    // 监听事件总线
    jest.spyOn(EventBus, 'on');
    jest.spyOn(EventBus, 'emit');
    
    // 加载页面模块
    require('../trace/detail/index');
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('页面生命周期', () => {
    it('应该在加载页面时初始化数据', async () => {
      // 模拟页面参数
      const mockOptions = { 
        id: 'trace-123' 
      };
      
      // 调用onLoad
      await page.onLoad(mockOptions);
      
      // 验证初始数据
      expect(page.data).toEqual(expect.objectContaining({
        traceId: 'trace-123',
        loading: false,
        error: null
      }));
      
      // 验证trace服务方法被调用
      expect(mockTraceService.getTraceById).toHaveBeenCalledWith('trace-123');
      
      // 验证trace数据被正确设置
      expect(page.data.trace).toEqual(mockTrace);
    });
    
    it('应该处理加载错误情况', async () => {
      // 模拟服务方法抛出错误
      const mockError = new Error('获取工作跟踪失败');
      mockTraceService.getTraceById.mockRejectedValueOnce(mockError);
      
      // 调用onLoad
      await page.onLoad({ id: 'invalid-id' });
      
      // 验证错误状态被正确设置
      expect(page.data.loading).toBe(false);
      expect(page.data.error).toBe('获取工作跟踪失败');
      expect(page.data.trace).toBeNull();
      
      // 验证错误弹窗被显示
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '获取工作跟踪失败',
          icon: 'none'
        })
      );
    });
    
    it('应该在页面卸载时清理资源', () => {
      // 调用onUnload
      page.onUnload();
      
      // 验证数据被重置
      expect(page.data.trace).toBeNull();
    });
  });

  describe('页面交互', () => {
    it('应该正确处理照片预览', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 模拟点击照片
      const event = {
        currentTarget: {
          dataset: {
            index: 1,
            url: mockTrace.photos[1].url
          }
        }
      };
      
      // 调用预览方法
      page.handlePreviewImage(event);
      
      // 验证预览API被调用
      expect(wx.previewImage).toHaveBeenCalledWith({
        current: mockTrace.photos[1].url,
        urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
      });
    });
    
    it('应该正确处理删除工作跟踪', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 模拟确认框返回确认
      wx.showModal.mockImplementationOnce(options => {
        options.success({ confirm: true });
      });
      
      // 调用删除方法
      await page.handleDeleteTrace();
      
      // 验证确认框被显示
      expect(wx.showModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '确认删除',
          content: '确定要删除此工作跟踪记录吗？'
        })
      );
      
      // 验证删除API被调用
      expect(mockTraceService.removeTrace).toHaveBeenCalledWith('trace-123');
      
      // 验证成功提示被显示
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '删除成功'
        })
      );
      
      // 验证返回上一页
      expect(wx.navigateBack).toHaveBeenCalled();
    });
    
    it('应该正确处理取消删除', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 模拟确认框返回取消
      wx.showModal.mockImplementationOnce(options => {
        options.success({ confirm: false });
      });
      
      // 调用删除方法
      await page.handleDeleteTrace();
      
      // 验证确认框被显示
      expect(wx.showModal).toHaveBeenCalled();
      
      // 验证删除API没有被调用
      expect(mockTraceService.removeTrace).not.toHaveBeenCalled();
    });
    
    it('应该处理删除过程中的错误', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 模拟确认框返回确认
      wx.showModal.mockImplementationOnce(options => {
        options.success({ confirm: true });
      });
      
      // 模拟删除方法抛出错误
      const mockError = new Error('删除失败');
      mockTraceService.removeTrace.mockRejectedValueOnce(mockError);
      
      // 调用删除方法
      await page.handleDeleteTrace();
      
      // 验证错误提示被显示
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '删除失败',
          icon: 'none'
        })
      );
    });
  });

  describe('页面导航', () => {
    it('应该正确处理编辑跳转', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 调用编辑方法
      page.handleEditTrace();
      
      // 验证导航API被调用
      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/trace/edit/index?id=trace-123'
      });
    });
    
    it('应该正确处理地图跳转', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 调用查看地图方法
      page.handleViewLocation();
      
      // 验证打开位置API被调用
      expect(wx.openLocation).toHaveBeenCalledWith({
        latitude: mockTrace.location.latitude,
        longitude: mockTrace.location.longitude,
        name: mockTrace.location.name,
        address: mockTrace.location.address
      });
    });
  });

  describe('数据格式化', () => {
    it('应该正确格式化时间', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 调用格式化方法
      const formattedTime = page.formatDate(mockTrace.createdAt);
      
      // 验证格式化结果
      expect(formattedTime).toBe('2023-01-01 08:00:00');
    });
    
    it('应该正确解析状态文本', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 验证状态映射结果
      expect(page.getStatusText('pending')).toBe('待处理');
      expect(page.getStatusText('in-progress')).toBe('进行中');
      expect(page.getStatusText('completed')).toBe('已完成');
      expect(page.getStatusText('cancelled')).toBe('已取消');
      expect(page.getStatusText('unknown')).toBe('未知');
    });
    
    it('应该正确解析类型文本', async () => {
      // 首先加载页面数据
      await page.onLoad({ id: 'trace-123' });
      
      // 验证类型映射结果
      expect(page.getTypeText('daily')).toBe('日常工作');
      expect(page.getTypeText('urgent')).toBe('紧急任务');
      expect(page.getTypeText('meeting')).toBe('会议纪要');
      expect(page.getTypeText('unknown')).toBe('其他');
    });
  });
}); 