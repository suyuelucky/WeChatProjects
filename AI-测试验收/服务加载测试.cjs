/**
 * 服务加载测试
 * 检查核心服务模块是否能正确导入和初始化
 */

// 模拟微信环境
global.wx = {
  getStorageSync: () => ({}),
  setStorageSync: () => {},
  onNetworkStatusChange: () => {},
  getNetworkType: (options) => {
    if (options && options.success) {
      options.success({ networkType: 'wifi', isConnected: true });
    }
  },
  cloud: {
    init: () => {},
    inited: true
  },
  env: {
    USER_DATA_PATH: '/mock/user/path'
  }
};

// 避免真实网络请求
global.EventBus = {
  on: () => {},
  emit: () => {}
};

// 测试导入服务
console.log('===== 服务加载测试 =====');
console.log('开始时间:', new Date().toLocaleString());

try {
  console.log('1. 导入服务容器');
  const ServiceContainer = require('../miniprogram/services/container.cjs');
  console.log('✅ 服务容器导入成功');

  console.log('2. 导入StorageService');
  const StorageService = require('../miniprogram/services/storageService.cjs');
  console.log('✅ StorageService导入成功');

  console.log('3. 导入PhotoService');
  const PhotoService = require('../miniprogram/services/photoService.cjs');
  console.log('✅ PhotoService导入成功');

  console.log('4. 导入工具类');
  const ImageCacheManager = require('../miniprogram/utils/image-cache-manager.cjs');
  console.log('✅ ImageCacheManager导入成功');

  // 检查关键方法
  console.log('5. 检查关键方法');
  if (typeof ImageCacheManager.getLastCleanupTime === 'function') {
    console.log('✅ ImageCacheManager.getLastCleanupTime方法存在');
  } else {
    console.log('❌ ImageCacheManager.getLastCleanupTime方法不存在');
  }

  if (typeof ImageCacheManager.getStats === 'function') {
    console.log('✅ ImageCacheManager.getStats方法存在');
  } else {
    console.log('❌ ImageCacheManager.getStats方法不存在');
  }

  console.log('\n测试总结: 所有服务模块都能正确导入');
} catch (error) {
  console.error('❌ 测试失败:', error);
}

console.log('结束时间:', new Date().toLocaleString());
console.log('===== 测试结束 ====='); 