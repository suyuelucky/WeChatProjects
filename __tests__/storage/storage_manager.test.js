const StorageManager = require('../../utils/storage/storage_manager');
const wx = require('../../miniprogram/utils/testing/wx-mock');

describe('StorageManager - 基础功能测试', () => {
  let storageManager;
  
  beforeEach(() => {
    wx._reset();
    storageManager = new StorageManager();
  });
  
  describe('存储操作', () => {
    const testKey = 'test_key';
    const testValue = { data: 'test_value' };
    
    it('应能正确存储和读取数据', (done) => {
      storageManager.setItem(testKey, testValue)
        .then(() => storageManager.getItem(testKey))
        .then((value) => {
          expect(value).toEqual(testValue);
          done();
        })
        .catch(done);
    });
    
    it('存储数据时应更新访问时间', (done) => {
      const beforeTime = Date.now();
      
      storageManager.setItem(testKey, testValue)
        .then(() => {
          const meta = wx.getStorageSync(testKey + '_meta');
          expect(meta.lastAccess).toBeGreaterThanOrEqual(beforeTime);
          done();
        })
        .catch(done);
    });
    
    it('读取数据时应更新访问时间', (done) => {
      storageManager.setItem(testKey, testValue)
        .then(() => {
          const beforeTime = Date.now();
          return storageManager.getItem(testKey)
            .then(() => {
              const meta = wx.getStorageSync(testKey + '_meta');
              expect(meta.lastAccess).toBeGreaterThanOrEqual(beforeTime);
              done();
            });
        })
        .catch(done);
    });
    
    it('删除数据时应同时删除元数据', (done) => {
      storageManager.setItem(testKey, testValue)
        .then(() => storageManager.removeItem(testKey))
        .then(() => {
          expect(wx.getStorageSync(testKey)).toBeUndefined();
          expect(wx.getStorageSync(testKey + '_meta')).toBeUndefined();
          done();
        })
        .catch(done);
    });
  });
  
  describe('极端情况测试', () => {
    it('存储空间满时应拒绝写入', (done) => {
      const mockStorageInfo = {
        currentSize: 10 * 1024 * 1024, // 10MB
        limitSize: 10 * 1024 * 1024
      };
      
      jest.spyOn(wx, 'getStorageInfoSync').mockReturnValue(mockStorageInfo);
      
      storageManager.setItem('test_key', 'test_value')
        .catch((error) => {
          expect(error.message).toContain('存储空间已满');
          done();
        });
    });
    
    it('接近阈值时应触发警告', (done) => {
      const mockStorageInfo = {
        currentSize: 8 * 1024 * 1024, // 8MB
        limitSize: 10 * 1024 * 1024
      };
      
      jest.spyOn(wx, 'getStorageInfoSync').mockReturnValue(mockStorageInfo);
      jest.spyOn(wx, 'showModal');
      
      storageManager.setItem('test_key', 'test_value')
        .then(() => {
          expect(wx.showModal).toHaveBeenCalledWith(
            expect.objectContaining({
              title: '存储空间警告'
            })
          );
          done();
        })
        .catch(done);
    });
    
    it('存储写入失败时应自动重试', (done) => {
      let attempts = 0;
      jest.spyOn(wx, 'setStorage').mockImplementation((options) => {
        attempts++;
        if (attempts < 3) {
          options.fail(new Error('写入失败'));
        } else {
          options.success();
        }
        options.complete();
      });
      
      storageManager.setItem('test_key', 'test_value')
        .then(() => {
          expect(attempts).toBe(3);
          done();
        })
        .catch(done);
    });
    
    it('超过最大重试次数应抛出错误', (done) => {
      jest.spyOn(wx, 'setStorage').mockImplementation((options) => {
        options.fail(new Error('写入失败'));
        options.complete();
      });
      
      storageManager.setItem('test_key', 'test_value')
        .catch((error) => {
          expect(error.message).toContain('写入失败');
          expect(wx.setStorage).toHaveBeenCalledTimes(3);
          done();
        });
    });
  });
}); 