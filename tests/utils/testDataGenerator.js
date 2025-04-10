/**
 * B1-基础照片采集模块 - 测试数据生成工具
 * 
 * 本工具用于生成测试图像和测试数据，便于进行各种测试
 * 生成的数据会保存在 test_assets 目录下
 */

// 公共工具库
var fs = require('fs');
var path = require('path');

/**
 * 测试数据生成器类
 */
var TestDataGenerator = function() {
  // 测试资源基础路径
  var TEST_ASSETS_PATH = path.join(__dirname, '../test_assets');
  
  // 确保测试资产目录存在
  function ensureAssetsDirectory() {
    if (!fs.existsSync(TEST_ASSETS_PATH)) {
      fs.mkdirSync(TEST_ASSETS_PATH, { recursive: true });
    }
  }
  
  /**
   * 生成测试图像数据
   * @param {number} width - 图像宽度
   * @param {number} height - 图像高度
   * @param {object} options - 其他选项
   * @returns {Uint8Array} 图像像素数据
   */
  function generateImageData(width, height, options) {
    options = options || {};
    var color = options.color || 'gradient';
    
    // 创建图像数据缓冲区 (RGBA格式)
    var size = width * height * 4;
    var data = new Uint8Array(size);
    
    // 生成图像数据
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var index = (y * width + x) * 4;
        
        if (color === 'gradient') {
          // 生成渐变色
          data[index] = Math.floor(255 * x / width);     // R
          data[index + 1] = Math.floor(255 * y / height); // G
          data[index + 2] = 150;                         // B
          data[index + 3] = 255;                         // A
        } else if (color === 'random') {
          // 生成随机颜色
          data[index] = Math.floor(Math.random() * 255);     // R
          data[index + 1] = Math.floor(Math.random() * 255); // G
          data[index + 2] = Math.floor(Math.random() * 255); // B
          data[index + 3] = 255;                             // A
        } else if (color === 'test_pattern') {
          // 生成测试图案（棋盘格）
          var cell = 16; // 棋盘格尺寸
          var isWhite = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
          var value = isWhite ? 255 : 0;
          data[index] = value;     // R
          data[index + 1] = value; // G
          data[index + 2] = value; // B
          data[index + 3] = 255;   // A
        } else {
          // 默认纯色图像
          data[index] = 200;     // R
          data[index + 1] = 100; // G
          data[index + 2] = 50;  // B
          data[index + 3] = 255; // A
        }
      }
    }
    
    return data;
  }
  
  /**
   * 生成测试JPEG图像文件
   * @param {string} filename - 要生成的文件名
   * @param {number} width - 图像宽度
   * @param {number} height - 图像高度
   * @param {object} options - 其他选项
   * @returns {Promise<string>} 生成的图像文件路径
   */
  this.generateTestJPEG = function(filename, width, height, options) {
    return new Promise(function(resolve) {
      ensureAssetsDirectory();
      
      // 这里简化处理，实际上应使用canvas或其他库生成真实图像
      // 由于小程序环境限制，这里仅生成模拟的图像数据文件
      var filePath = path.join(TEST_ASSETS_PATH, filename);
      
      // 生成简单元数据
      var metadata = {
        width: width,
        height: height,
        format: 'jpeg',
        created: Date.now(),
        options: options || {}
      };
      
      // 写入元数据文件（实际应用中会生成真实图像）
      fs.writeFileSync(filePath + '.meta.json', JSON.stringify(metadata, null, 2));
      
      // 生成空数据文件表示图像（模拟）
      fs.writeFileSync(filePath, '');
      
      resolve(filePath);
    });
  };
  
  /**
   * 生成多个测试图像文件
   * @param {number} count - 要生成的图像数量
   * @param {number} width - 图像宽度
   * @param {number} height - 图像高度
   * @returns {Promise<Array<string>>} 生成的图像文件路径数组
   */
  this.generateMultipleTestImages = function(count, width, height) {
    var promises = [];
    var options = [
      { color: 'gradient' },
      { color: 'random' },
      { color: 'test_pattern' }
    ];
    
    for (var i = 0; i < count; i++) {
      var option = options[i % options.length];
      promises.push(
        this.generateTestJPEG('test_image_' + i + '.jpg', width, height, option)
      );
    }
    
    return Promise.all(promises);
  };
  
  /**
   * 生成测试图像压缩对比数据
   * 创建不同质量的图像用于比较压缩效果
   */
  this.generateCompressionTestSet = function() {
    var self = this;
    ensureAssetsDirectory();
    
    return this.generateTestJPEG('source_image.jpg', 1920, 1080, { color: 'gradient' })
      .then(function(sourcePath) {
        var qualityLevels = [100, 80, 60, 40, 20];
        var results = {
          source: sourcePath,
          variants: []
        };
        
        var variantPromises = qualityLevels.map(function(quality) {
          var filename = 'compressed_' + quality + '.jpg';
          return self.generateTestJPEG(filename, 1920, 1080, { 
            quality: quality,
            color: 'gradient'
          }).then(function(path) {
            results.variants.push({
              quality: quality,
              path: path,
              // 模拟不同质量下的文件大小
              size: Math.round(1024 * 1024 * (quality / 100) * 0.8)
            });
            return path;
          });
        });
        
        return Promise.all(variantPromises).then(function() {
          // 将结果保存为JSON
          var resultPath = path.join(TEST_ASSETS_PATH, 'compression_test_set.json');
          fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
          return results;
        });
      });
  };
  
  /**
   * 生成测试照片元数据
   * @param {number} count - 要生成的元数据数量
   * @returns {Array<object>} 生成的照片元数据数组
   */
  this.generatePhotoMetadata = function(count) {
    var metadata = [];
    var categories = ['工作照片', '现场勘查', '设备检查', '问题记录', '文档扫描'];
    var tags = ['重要', '一般', '紧急', '待处理', '已完成', '已归档'];
    
    var now = Date.now();
    var dayInMs = 24 * 60 * 60 * 1000;
    
    for (var i = 0; i < count; i++) {
      var categoryIndex = Math.floor(Math.random() * categories.length);
      var createTime = now - Math.floor(Math.random() * 30) * dayInMs;
      
      // 随机选择1-3个标签
      var selectedTags = [];
      var tagCount = Math.floor(Math.random() * 3) + 1;
      for (var j = 0; j < tagCount; j++) {
        var tagIndex = Math.floor(Math.random() * tags.length);
        if (selectedTags.indexOf(tags[tagIndex]) === -1) {
          selectedTags.push(tags[tagIndex]);
        }
      }
      
      metadata.push({
        id: 'photo_' + i,
        createTime: createTime,
        updateTime: createTime + Math.floor(Math.random() * dayInMs),
        category: categories[categoryIndex],
        tags: selectedTags,
        name: '照片_' + i,
        width: 1920,
        height: 1080,
        size: Math.floor(Math.random() * 1024 * 1024) + 500 * 1024, // 500KB-1.5MB
        format: 'jpeg'
      });
    }
    
    // 保存生成的元数据
    ensureAssetsDirectory();
    var metadataPath = path.join(TEST_ASSETS_PATH, 'test_photo_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return metadata;
  };
  
  /**
   * 生成存储状态测试数据
   * 包括存储空间使用情况、照片计数等
   */
  this.generateStorageStats = function() {
    ensureAssetsDirectory();
    
    var stats = {
      totalPhotos: 158,
      totalSize: 236 * 1024 * 1024, // 236MB
      avgPhotoSize: 1.5 * 1024 * 1024, // 1.5MB
      oldestPhoto: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90天前
      newestPhoto: Date.now() - 1 * 60 * 60 * 1000, // 1小时前
      categoryCounts: {
        '工作照片': 63,
        '现场勘查': 42,
        '设备检查': 27,
        '问题记录': 18,
        '文档扫描': 8
      },
      deviceStorage: {
        total: 64 * 1024 * 1024 * 1024, // 64GB
        used: 32 * 1024 * 1024 * 1024, // 32GB
        available: 32 * 1024 * 1024 * 1024 // 32GB
      }
    };
    
    var statsPath = path.join(TEST_ASSETS_PATH, 'test_storage_stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    
    return stats;
  };
  
  /**
   * 生成随机用户设备信息
   * 用于测试不同设备环境下的兼容性
   */
  this.generateDeviceProfiles = function() {
    ensureAssetsDirectory();
    
    var profiles = [
      {
        name: '低端设备',
        model: 'Generic Android 7.0',
        platform: 'android',
        system: '7.0',
        brand: 'Generic',
        memory: 1024, // 1GB
        storage: 16 * 1024, // 16GB
        cameraResolutions: [
          { width: 640, height: 480 },
          { width: 1280, height: 720 }
        ],
        networkType: '3g',
        screenWidth: 720,
        screenHeight: 1280
      },
      {
        name: '中端设备',
        model: 'iPhone 8',
        platform: 'ios',
        system: '13.4.1',
        brand: 'Apple',
        memory: 2048, // 2GB
        storage: 64 * 1024, // 64GB
        cameraResolutions: [
          { width: 1920, height: 1080 },
          { width: 3264, height: 2448 }
        ],
        networkType: '4g',
        screenWidth: 750,
        screenHeight: 1334
      },
      {
        name: '高端设备',
        model: 'iPhone 13 Pro Max',
        platform: 'ios',
        system: '15.4',
        brand: 'Apple',
        memory: 6144, // 6GB
        storage: 256 * 1024, // 256GB
        cameraResolutions: [
          { width: 1920, height: 1080 },
          { width: 3840, height: 2160 },
          { width: 4032, height: 3024 }
        ],
        networkType: '5g',
        screenWidth: 1284,
        screenHeight: 2778
      },
      {
        name: '高端安卓设备',
        model: 'Samsung Galaxy S21 Ultra',
        platform: 'android',
        system: '12',
        brand: 'Samsung',
        memory: 12288, // 12GB
        storage: 512 * 1024, // 512GB
        cameraResolutions: [
          { width: 1920, height: 1080 },
          { width: 3840, height: 2160 },
          { width: 7680, height: 4320 }
        ],
        networkType: '5g',
        screenWidth: 1440,
        screenHeight: 3200
      }
    ];
    
    var profilesPath = path.join(TEST_ASSETS_PATH, 'test_device_profiles.json');
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
    
    return profiles;
  };
  
  /**
   * 生成测试环境配置
   * 生成不同的测试环境配置文件
   */
  this.generateTestEnvironments = function() {
    ensureAssetsDirectory();
    
    var environments = {
      development: {
        apiBaseUrl: 'https://dev-api.example.com',
        logLevel: 'debug',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        cacheDuration: 1 * 60 * 60 * 1000, // 1小时
        enableCompression: true,
        compressionQuality: 0.8,
        maxBatchSize: 5,
        retryAttempts: 3,
        uploadTimeout: 30 * 1000, // 30秒
        processingTimeout: 60 * 1000 // 60秒
      },
      testing: {
        apiBaseUrl: 'https://test-api.example.com',
        logLevel: 'info',
        maxFileSize: 20 * 1024 * 1024, // 20MB
        cacheDuration: 12 * 60 * 60 * 1000, // 12小时
        enableCompression: true,
        compressionQuality: 0.7,
        maxBatchSize: 10,
        retryAttempts: 2,
        uploadTimeout: 60 * 1000, // 60秒
        processingTimeout: 120 * 1000 // 120秒
      },
      production: {
        apiBaseUrl: 'https://api.example.com',
        logLevel: 'warn',
        maxFileSize: 50 * 1024 * 1024, // 50MB
        cacheDuration: 24 * 60 * 60 * 1000, // 24小时
        enableCompression: true,
        compressionQuality: 0.6,
        maxBatchSize: 20,
        retryAttempts: 5,
        uploadTimeout: 120 * 1000, // 120秒
        processingTimeout: 300 * 1000 // 300秒
      }
    };
    
    var envsPath = path.join(TEST_ASSETS_PATH, 'test_environments.json');
    fs.writeFileSync(envsPath, JSON.stringify(environments, null, 2));
    
    return environments;
  };
};

// 导出生成器实例
module.exports = new TestDataGenerator(); 