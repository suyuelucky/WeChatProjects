/**
 * EncryptionManager测试索引文件
 * 
 * 创建时间: 2025-04-09 12:21:45 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试索引
 */

// 引入各个测试模块
require('./encryptionBasic.test.js');
require('./keyManagement.test.js');
require('./keyRotation.test.js');
require('./secureStorage.test.js');
require('./dataIntegrity.test.js');

/**
 * EncryptionManager测试套件主要包含以下测试模块：
 * 
 * 1. encryptionBasic.test.js - 基础加密解密功能测试
 *    - 测试基本加密解密功能
 *    - 测试不同加密算法
 *    - 测试边界条件处理
 *    - 测试加密参数配置
 *    - 测试大数据量加密性能
 * 
 * 2. keyManagement.test.js - 密钥管理功能测试
 *    - 测试密钥生成
 *    - 测试密钥存储
 *    - 测试密钥检索
 *    - 测试主密钥管理
 * 
 * 3. keyRotation.test.js - 密钥轮换功能测试
 *    - 测试基本密钥轮换
 *    - 测试数据加密跨密钥轮换
 *    - 测试自动密钥轮换
 *    - 测试轮换历史记录
 *    - 测试密钥轮换性能
 * 
 * 4. secureStorage.test.js - 安全存储功能测试
 *    - 测试加密数据持久化
 *    - 测试安全存储隔离
 *    - 测试不同安全级别
 *    - 测试存储命名空间
 * 
 * 5. dataIntegrity.test.js - 数据完整性测试
 *    - 测试数据签名功能
 *    - 测试哈希加盐功能
 *    - 测试数据验证功能
 *    - 测试篡改检测
 */

// 如果在Node.js环境中运行（而非微信小程序环境）
if (typeof global !== 'undefined') {
  console.log('运行EncryptionManager完整测试套件...');
} 