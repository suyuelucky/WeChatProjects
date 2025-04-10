/**
 * wx-mock.js
 * 微信小程序API模拟模块
 * 
 * 创建时间: 2025-04-09 21:05:33
 * 创建者: Claude AI 3.7 Sonnet
 */

// 默认配置
const defaults = {
  // 响应时间范围(ms)
  minResponseTime: 50,
  maxResponseTime: 300,
  
  // 模拟文件大小范围(bytes)
  minFileSize: 10 * 1024,    // 10KB
  maxFileSize: 200 * 1024,   // 200KB
  
  // 错误概率
  errorRate: 0.05,           // 5%的请求会失败
  
  // 模拟文件系统满的概率
  fsFullRate: 0.01,          // 1%的文件系统操作会报告已满
  
  // 模拟内存限制
  memoryWarningRate: 0.02,   // 2%的操作会触发内存警告
};

// 运行时配置
let config = { ...defaults };

// 最后生成的文件大小
let lastFileSize = 0;

/**
 * 创建模拟wx对象
 * @returns {Object} 模拟的wx对象
 */
function createMock() {
  // 内存警告回调
  let memoryWarningCallback = null;
  
  // 模拟的缓存系统
  const mockStorage = {};
  
  // 模拟的文件系统
  const mockFileSystem = {
    files: {},
    mkdirSync: jest.fn((dirPath) => {
      // 模拟创建目录失败(1%概率)
      if (Math.random() < 0.01) {
        throw new Error('创建目录失败');
      }
    }),
    accessSync: jest.fn((filePath) => {
      // 模拟文件不存在(如果mockFileSystem中没有)
      if (!mockFileSystem.files[filePath]) {
        throw new Error('文件不存在');
      }
    }),
    unlinkSync: jest.fn((filePath) => {
      // 删除文件
      delete mockFileSystem.files[filePath];
    }),
    statSync: jest.fn((filePath) => {
      // 返回文件大小
      return {
        size: mockFileSystem.files[filePath] || _generateFileSize()
      };
    }),
    readFileSync: jest.fn(() => {
      return new ArrayBuffer(8);
    }),
    copyFile: jest.fn(({ srcPath, destPath, success, fail }) => {
      // 模拟文件系统已满
      if (Math.random() < config.fsFullRate) {
        fail && fail({ errMsg: '文件系统已满' });
        return;
      }
      
      // 复制文件
      mockFileSystem.files[destPath] = mockFileSystem.files[srcPath] || _generateFileSize();
      success && success();
    }),
    stat: jest.fn(({ path, success, fail }) => {
      // 模拟获取文件信息
      try {
        const size = mockFileSystem.files[path] || _generateFileSize();
        mockFileSystem.files[path] = size; // 保存文件大小
        lastFileSize = size; // 记录最后一个文件大小
        
        success && success({
          stats: { size }
        });
      } catch (e) {
        fail && fail({ errMsg: '获取文件信息失败' });
      }
    })
  };
  
  // 模拟的wx对象
  return {
    // 环境变量
    env: {
      USER_DATA_PATH: '/mock/user/path'
    },
    
    // 文件系统管理器
    getFileSystemManager: jest.fn(() => mockFileSystem),
    
    // 下载文件
    downloadFile: jest.fn(({ url, success, fail }) => {
      // 等待随机时间模拟网络延迟
      const delay = _randomBetween(config.minResponseTime, config.maxResponseTime);
      
      // 模拟下载任务对象
      const task = {
        abort: jest.fn(),
        onProgressUpdate: jest.fn(),
        offProgressUpdate: jest.fn(),
        onHeadersReceived: jest.fn(),
        offHeadersReceived: jest.fn()
      };
      
      // 异步模拟下载结果
      setTimeout(() => {
        // 模拟随机错误
        if (url.includes('error=true') || Math.random() < config.errorRate) {
          fail && fail({ errMsg: '下载失败' });
          return;
        }
        
        // 生成随机大小的文件
        const fileSize = _generateFileSize();
        const tempFilePath = `/mock/temp/${Date.now()}_${url.split('/').pop()}`;
        
        // 保存到模拟文件系统
        mockFileSystem.files[tempFilePath] = fileSize;
        lastFileSize = fileSize;
        
        // 触发随机内存警告
        _triggerRandomMemoryWarning(memoryWarningCallback);
        
        // 返回成功
        success && success({
          statusCode: 200,
          tempFilePath
        });
      }, delay);
      
      return task;
    }),
    
    // 获取图片信息
    getImageInfo: jest.fn(({ src, success, fail }) => {
      // 等待随机时间模拟延迟
      const delay = _randomBetween(config.minResponseTime / 2, config.maxResponseTime / 2);
      
      setTimeout(() => {
        // 模拟随机错误
        if (src.includes('error=true') || Math.random() < config.errorRate) {
          fail && fail({ errMsg: '获取图片信息失败' });
          return;
        }
        
        // 返回成功
        success && success({
          width: _randomBetween(100, 2000),
          height: _randomBetween(100, 2000),
          path: src
        });
      }, delay);
    }),
    
    // Canvas相关
    canvasToTempFilePath: jest.fn(({ success, fail }) => {
      // 等待随机时间模拟处理延迟
      const delay = _randomBetween(config.minResponseTime, config.maxResponseTime);
      
      setTimeout(() => {
        // 模拟随机错误
        if (Math.random() < config.errorRate * 2) { // 处理图片失败概率略高
          fail && fail({ errMsg: '处理图片失败' });
          return;
        }
        
        // 返回成功
        const tempFilePath = `/mock/temp/canvas_${Date.now()}.jpg`;
        mockFileSystem.files[tempFilePath] = _generateFileSize(config.minFileSize / 2, config.maxFileSize / 2); // 处理后的文件一般更小
        
        success && success({
          tempFilePath
        });
      }, delay);
    }),
    
    // 存储API
    setStorage: jest.fn(({ key, data, success, fail }) => {
      // 模拟随机失败
      if (Math.random() < config.errorRate) {
        fail && fail({ errMsg: '存储失败' });
        return;
      }
      
      mockStorage[key] = data;
      success && success();
    }),
    
    getStorage: jest.fn(({ key, success, fail }) => {
      // 如果该键不存在
      if (!mockStorage[key]) {
        fail && fail({ errMsg: '数据不存在' });
        return;
      }
      
      success && success({ data: mockStorage[key] });
    }),
    
    // 内存警告
    onMemoryWarning: jest.fn((callback) => {
      memoryWarningCallback = callback;
    }),
    
    // 预览图片
    previewImage: jest.fn(() => {}),
    
    // 显示加载和消息
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    showToast: jest.fn()
  };
}

/**
 * 模拟getCurrentPages 
 */
const getCurrentPages = jest.fn(() => [{
  createSelectorQuery: jest.fn(() => ({
    select: jest.fn(() => ({
      fields: jest.fn(() => ({
        exec: jest.fn((callback) => {
          // 模拟Canvas节点
          callback([{
            node: {
              width: 0,
              height: 0,
              getContext: jest.fn(() => ({
                clearRect: jest.fn(),
                drawImage: jest.fn()
              })),
              createImage: jest.fn(() => {
                const img = {
                  onload: null,
                  onerror: null
                };
                
                // 模拟异步加载过程
                setTimeout(() => {
                  if (img.onload) {
                    img.onload();
                  }
                }, _randomBetween(10, 50));
                
                return img;
              })
            }
          }]);
        })
      }))
    }))
  })
}]);

/**
 * 设置响应时间范围
 * @param {Number} min 最小响应时间(ms)
 * @param {Number} max 最大响应时间(ms)
 */
function setResponseTimeRange(min, max) {
  config.minResponseTime = min;
  config.maxResponseTime = max;
}

/**
 * 设置文件大小范围
 * @param {Number} min 最小文件大小(bytes)
 * @param {Number} max 最大文件大小(bytes)
 */
function setFileSizeRange(min, max) {
  config.minFileSize = min;
  config.maxFileSize = max;
}

/**
 * 设置错误率
 * @param {Number} rate 错误率(0-1)
 */
function setErrorRate(rate) {
  config.errorRate = rate;
}

/**
 * 生成随机大小的文件
 * @private
 */
function _generateFileSize(min = config.minFileSize, max = config.maxFileSize) {
  const size = _randomBetween(min, max);
  lastFileSize = size;
  return size;
}

/**
 * 随机触发内存警告
 * @param {Function} callback 内存警告回调
 * @private
 */
function _triggerRandomMemoryWarning(callback) {
  if (callback && Math.random() < config.memoryWarningRate) {
    // 随机警告级别(10-20之间)
    const level = Math.floor(_randomBetween(10, 20));
    callback({ level });
  }
}

/**
 * 生成指定范围内的随机数
 * @param {Number} min 最小值
 * @param {Number} max 最大值
 * @returns {Number} 随机数
 * @private
 */
function _randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 获取最后生成的文件大小
 * @returns {Number} 文件大小(bytes)
 */
function getLastFileSize() {
  return lastFileSize;
}

// 导出函数和对象
module.exports = {
  createMock,
  getCurrentPages,
  setResponseTimeRange,
  setFileSizeRange,
  setErrorRate,
  getLastFileSize,
  reset: () => {
    config = { ...defaults };
    lastFileSize = 0;
  }
}; 