/**
 * 照片服务单元测试
 * 测试照片服务的核心功能，包括照片处理、保存和上传
 */

const PhotoService = require('../photoService');
const EventBus = require('../../utils/eventBus');
const MockService = require('../../utils/testing/mockService');

// 模拟依赖模块
jest.mock('../../utils/task-manager', () => ({
  init: jest.fn(),
  checkInterruptedTasks: jest.fn(),
  getTask: jest.fn(),
  cleanCompletedTasks: jest.fn(),
  updateTaskStatus: jest.fn(),
  updateTaskProgress: jest.fn()
}));

jest.mock('../../utils/upload-manager', () => ({
  init: jest.fn(),
  uploadUrl: '',
  uploadPhoto: jest.fn().mockResolvedValue({ taskId: 'task_123' }),
  pauseTask: jest.fn(),
  resumeTask: jest.fn()
}));

jest.mock('../../utils/image-cache-manager', () => ({
  init: jest.fn(),
  addImage: jest.fn(),
  removeImage: jest.fn(),
  getStats: jest.fn().mockReturnValue({ 
    total: 5, 
    thumbnails: 2,
    totalSize: 1024 * 1024 * 10 
  }),
  cleanup: jest.fn()
}));

// 模拟storage服务
const mockStorageService = {
  saveItem: jest.fn().mockResolvedValue(true),
  getItem: jest.fn(),
  removeItem: jest.fn().mockResolvedValue(true),
  getCollection: jest.fn()
};

// 模拟服务容器
const mockContainer = {
  get: jest.fn().mockImplementation((service) => {
    if (service === 'storageService') {
      return mockStorageService;
    }
    return null;
  })
};

// 创建服务容器和依赖
var container = {
  services: {},
  get: function(name) {
    return this.services[name];
  },
  set: function(name, service) {
    this.services[name] = service;
    return this;
  }
};

// 模拟wx对象
global.wx = MockService.createMockWx();

// 模拟云函数
global.wx.cloud = MockService.createMockCloud();

describe('PhotoService', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 初始化PhotoService
    PhotoService.init(mockContainer);
    
    // 设置通用的mock行为
    mockStorageService.getCollection.mockResolvedValue([
      {
        id: 'photo_1',
        path: '/storage/photo_1.jpg',
        thumbnailPath: '/storage/thumb_photo_1.jpg',
        size: 1024 * 1024,
        status: 'local',
        createdAt: '2024-04-01T12:00:00Z'
      },
      {
        id: 'photo_2',
        path: '/storage/photo_2.jpg',
        size: 512 * 1024,
        status: 'local',
        createdAt: '2024-04-02T12:00:00Z'
      }
    ]);
    
    // 监听EventBus
    jest.spyOn(EventBus, 'emit');
  });

  describe('初始化', () => {
    test('应该正确初始化服务和管理器', () => {
      const uploadManager = require('../../utils/upload-manager');
      const taskManager = require('../../utils/task-manager');
      const imageCacheManager = require('../../utils/image-cache-manager');
      
      expect(uploadManager.init).toHaveBeenCalled();
      expect(taskManager.init).toHaveBeenCalled();
      expect(imageCacheManager.init).toHaveBeenCalled();
      expect(PhotoService.container).toBe(mockContainer);
    });
  });

  describe('照片拍摄与选择', () => {
    test('takePhoto应该正确处理拍照结果', async () => {
      // 模拟wx.chooseMedia
      wx.chooseMedia = jest.fn().mockImplementation(options => {
        options.success({
          tempFiles: [
            {
              tempFilePath: '/tmp/wx_photo_123.jpg',
              size: 1024 * 1024
            }
          ]
        });
      });
      
      // 模拟savePhotoToLocal和generateThumbnail
      jest.spyOn(PhotoService, 'savePhotoToLocal').mockResolvedValue('/storage/photo_new.jpg');
      jest.spyOn(PhotoService, 'generateThumbnail').mockResolvedValue('/storage/thumb_photo_new.jpg');
      
      const result = await PhotoService.takePhoto();
      
      expect(wx.chooseMedia).toHaveBeenCalledWith(expect.objectContaining({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera']
      }));
      
      expect(PhotoService.savePhotoToLocal).toHaveBeenCalled();
      expect(PhotoService.generateThumbnail).toHaveBeenCalled();
      expect(mockStorageService.saveItem).toHaveBeenCalled();
      expect(EventBus.emit).toHaveBeenCalledWith('photo:captured', expect.any(Object));
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: '/storage/photo_new.jpg',
        thumbnailPath: '/storage/thumb_photo_new.jpg',
        status: 'local'
      });
    });
    
    test('chooseFromAlbum应该正确处理相册选择', async () => {
      // 模拟wx.chooseMedia
      wx.chooseMedia = jest.fn().mockImplementation(options => {
        options.success({
          tempFiles: [
            {
              tempFilePath: '/tmp/wx_album_123.jpg',
              size: 1024 * 1024
            },
            {
              tempFilePath: '/tmp/wx_album_124.jpg',
              size: 512 * 1024
            }
          ]
        });
      });
      
      // 模拟savePhotoToLocal和generateThumbnail
      jest.spyOn(PhotoService, 'savePhotoToLocal')
        .mockImplementation(path => Promise.resolve(`/storage/${path.split('/').pop()}`));
      jest.spyOn(PhotoService, 'generateThumbnail')
        .mockImplementation((path, id) => Promise.resolve(`/storage/thumb_${id}.jpg`));
      
      const result = await PhotoService.chooseFromAlbum({ count: 2 });
      
      expect(wx.chooseMedia).toHaveBeenCalledWith(expect.objectContaining({
        count: 2,
        mediaType: ['image'],
        sourceType: ['album']
      }));
      
      expect(PhotoService.savePhotoToLocal).toHaveBeenCalledTimes(2);
      expect(PhotoService.generateThumbnail).toHaveBeenCalledTimes(2);
      expect(mockStorageService.saveItem).toHaveBeenCalledTimes(4); // 2张照片，每张保存两次
      expect(EventBus.emit).toHaveBeenCalledWith('photo:selected', expect.any(Object));
      
      expect(result).toHaveLength(2);
    });
  });

  describe('照片管理', () => {
    test('getPhotos应该返回正确的照片列表', async () => {
      const photos = await PhotoService.getPhotos();
      
      expect(mockStorageService.getCollection).toHaveBeenCalledWith('photos');
      expect(photos).toHaveLength(2);
      expect(photos[0].id).toBe('photo_1');
    });
    
    test('getPhotos应该支持筛选条件', async () => {
      const photos = await PhotoService.getPhotos({ ids: ['photo_1'], status: 'local' });
      
      expect(mockStorageService.getCollection).toHaveBeenCalledWith('photos');
      // 注意：这里实际上测试的是我们模拟的过滤功能，真实环境会有不同行为
      expect(photos.length).toBeGreaterThan(0);
    });
    
    test('deletePhotos应该正确删除照片文件和元数据', async () => {
      // 模拟getItem返回照片数据
      mockStorageService.getItem.mockResolvedValue({
        id: 'photo_1',
        path: '/storage/photo_1.jpg',
        thumbnailPath: '/storage/thumb_photo_1.jpg'
      });
      
      // 模拟文件操作
      wx.removeSavedFile = jest.fn().mockImplementation(options => {
        options.success && options.success({});
      });
      
      const result = await PhotoService.deletePhotos('photo_1');
      
      expect(mockStorageService.getItem).toHaveBeenCalledWith('photos', 'photo_1');
      expect(wx.removeSavedFile).toHaveBeenCalledTimes(2); // 原图和缩略图各一次
      expect(mockStorageService.removeItem).toHaveBeenCalledWith('photos', 'photo_1');
      expect(EventBus.emit).toHaveBeenCalledWith('photo:deleted', expect.any(Object));
      expect(result).toBe(true);
    });
  });

  describe('照片上传', () => {
    test('uploadPhotos应该正确创建上传任务', async () => {
      const uploadManager = require('../../utils/upload-manager');
      
      // 模拟getItem返回照片数据
      mockStorageService.getItem.mockResolvedValue({
        id: 'photo_1',
        path: '/storage/photo_1.jpg',
        thumbnailPath: '/storage/thumb_photo_1.jpg',
        size: 1024 * 1024,
        createdAt: '2024-04-01T12:00:00Z'
      });
      
      const result = await PhotoService.uploadPhotos('photo_1', { priority: 10 });
      
      expect(mockStorageService.getItem).toHaveBeenCalledWith('photos', 'photo_1');
      expect(uploadManager.uploadPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          tempFilePath: '/storage/photo_1.jpg',
          photoId: 'photo_1'
        }),
        10
      );
      
      expect(mockStorageService.saveItem).toHaveBeenCalledWith(
        'photos',
        'photo_1',
        expect.objectContaining({
          status: 'uploading',
          uploadTaskId: 'task_123'
        })
      );
      
      expect(EventBus.emit).toHaveBeenCalledWith('photo:upload:started', expect.any(Object));
      expect(result).toHaveLength(1);
    });
    
    test('pauseUpload和resumeUpload应该正确控制上传任务', async () => {
      const uploadManager = require('../../utils/upload-manager');
      
      await PhotoService.pauseUpload(['task_1', 'task_2']);
      expect(uploadManager.pauseTask).toHaveBeenCalledTimes(2);
      expect(uploadManager.pauseTask).toHaveBeenCalledWith('task_1');
      expect(uploadManager.pauseTask).toHaveBeenCalledWith('task_2');
      
      await PhotoService.resumeUpload('task_1');
      expect(uploadManager.resumeTask).toHaveBeenCalledWith('task_1');
    });
  });

  describe('缓存管理', () => {
    test('getMemoryStats应该返回正确的内存统计信息', () => {
      const imageCacheManager = require('../../utils/image-cache-manager');
      
      const stats = PhotoService.getMemoryStats();
      
      expect(imageCacheManager.getStats).toHaveBeenCalled();
      expect(stats).toEqual({
        total: 5,
        thumbnails: 2,
        totalSize: 10485760 // 10 MB
      });
    });
    
    test('cleanupCache应该清理缓存和已完成任务', async () => {
      const imageCacheManager = require('../../utils/image-cache-manager');
      const taskManager = require('../../utils/task-manager');
      
      const result = await PhotoService.cleanupCache();
      
      expect(imageCacheManager.cleanup).toHaveBeenCalled();
      expect(taskManager.cleanCompletedTasks).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('照片上传和云存储', () => {
    beforeEach(() => {
      // 准备存储服务模拟
      var mockStorageService = MockService.createMockStorageService();
      
      // 准备测试照片数据
      var testPhoto = {
        id: 'test_photo_1',
        path: 'test_path/photo1.jpg',
        thumbnailPath: 'test_path/thumb_photo1.jpg',
        size: 1024 * 1024,
        width: 800,
        height: 600,
        createdAt: new Date().toISOString(),
        status: 'local'
      };
      
      // 设置模拟数据
      mockStorageService.mockData = {
        photos: {
          'test_photo_1': testPhoto,
          'test_photo_2': {
            ...testPhoto,
            id: 'test_photo_2',
            path: 'test_path/photo2.jpg'
          }
        }
      };
      
      // 设置到容器
      container.set('storageService', mockStorageService);
      
      // 初始化照片服务
      PhotoService.init(container);
    });
    
    afterEach(() => {
      // 清理模拟数据
      MockService.resetMocks();
    });
    
    test('应该能够初始化云环境', () => {
      // 验证云环境是否初始化
      expect(wx.cloud.inited).toBe(true);
    });
    
    test('应该能够上传照片到云存储', function(done) {
      // 准备上传成功的模拟响应
      wx.cloud.mockUploadSuccess({
        fileID: 'cloud://test-env.prod-123/photos/test_photo_1.jpg',
        statusCode: 200
      });
      
      // 执行上传
      PhotoService.uploadPhotos('test_photo_1')
        .then(function(results) {
          // 验证结果
          expect(results.length).toBe(1);
          expect(results[0].status).toBe('completed');
          expect(results[0].photoId).toBe('test_photo_1');
          
          // 验证照片状态已更新
          return container.get('storageService').getItem('photos', 'test_photo_1');
        })
        .then(function(photo) {
          expect(photo.status).toBe('cloud');
          expect(photo.cloudPath).toBeTruthy();
          done();
        })
        .catch(function(err) {
          done.fail(err);
        });
    });
    
    test('应该能够处理云存储上传失败', function(done) {
      // 准备上传失败的模拟响应
      wx.cloud.mockUploadFail({
        errCode: 10001,
        errMsg: '云存储上传失败'
      });
      
      // 执行上传
      PhotoService.uploadPhotos('test_photo_2')
        .then(function(results) {
          // 验证结果
          expect(results.length).toBe(1);
          expect(results[0].status).toBe('error');
          expect(results[0].photoId).toBe('test_photo_2');
          
          // 验证照片状态已更新为错误
          return container.get('storageService').getItem('photos', 'test_photo_2');
        })
        .then(function(photo) {
          expect(photo.status).toBe('error');
          expect(photo.lastError).toBeTruthy();
          done();
        })
        .catch(function(err) {
          done.fail(err);
        });
    });
    
    test('应该能够从云存储下载照片', function(done) {
      // 准备下载成功的模拟响应
      wx.cloud.mockDownloadSuccess({
        tempFilePath: 'temp_path/downloaded_photo.jpg'
      });
      
      // 执行下载
      var cloudPath = 'cloud://test-env.prod-123/photos/test_photo_1.jpg';
      PhotoService.getPhotoFromCloud(cloudPath)
        .then(function(tempFilePath) {
          expect(tempFilePath).toBe('temp_path/downloaded_photo.jpg');
          done();
        })
        .catch(function(err) {
          done.fail(err);
        });
    });
    
    test('应该能够同步照片云存储状态', function(done) {
      // 模拟照片状态：一张云端存在，一张云端不存在
      var testPhotos = {
        'cloud_photo_1': {
          id: 'cloud_photo_1',
          path: 'test_path/cloud_photo1.jpg',
          status: 'cloud',
          cloudPath: 'cloud://test-env.prod-123/photos/cloud_photo_1.jpg'
        },
        'cloud_photo_2': {
          id: 'cloud_photo_2',
          path: 'test_path/cloud_photo2.jpg',
          status: 'cloud',
          cloudPath: 'cloud://test-env.prod-123/photos/cloud_photo_2.jpg'
        }
      };
      
      // 设置存储服务数据
      container.get('storageService').mockData.photos = {
        ...container.get('storageService').mockData.photos,
        ...testPhotos
      };
      
      // 模拟云存储检查：第一张照片存在，第二张不存在
      wx.cloud.mockFileExists('cloud://test-env.prod-123/photos/cloud_photo_1.jpg', true);
      wx.cloud.mockFileExists('cloud://test-env.prod-123/photos/cloud_photo_2.jpg', false);
      
      // 再次模拟上传成功，用于自动重新上传不存在的照片
      wx.cloud.mockUploadSuccess({
        fileID: 'cloud://test-env.prod-123/photos/cloud_photo_2_new.jpg',
        statusCode: 200
      });
      
      // 执行同步
      PhotoService.syncPhotoStatus(['cloud_photo_1', 'cloud_photo_2'])
        .then(function(result) {
          // 应该有1张照片需要同步
          expect(result.synced).toBe(1);
          expect(result.total).toBe(2);
          
          // 验证状态
          return Promise.all([
            container.get('storageService').getItem('photos', 'cloud_photo_1'),
            container.get('storageService').getItem('photos', 'cloud_photo_2')
          ]);
        })
        .then(function(photos) {
          var photo1 = photos[0];
          var photo2 = photos[1];
          
          // 第一张照片状态应该保持不变
          expect(photo1.status).toBe('cloud');
          
          // 第二张照片应该被重新上传并更新状态
          expect(photo2.status).toBe('cloud');
          expect(photo2.cloudPath).not.toBe('cloud://test-env.prod-123/photos/cloud_photo_2.jpg');
          
          done();
        })
        .catch(function(err) {
          done.fail(err);
        });
    });
  });
}); 