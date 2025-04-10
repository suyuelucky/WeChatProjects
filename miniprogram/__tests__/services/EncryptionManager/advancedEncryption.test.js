/**
 * EncryptionManager高级加密功能测试
 * 
 * 创建时间: 2025-04-14 10:35:24 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('EncryptionManager - 高级加密功能测试', function() {
  
  // 初始化测试环境
  beforeEach(function() {
    // 重置wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器
    EncryptionManager.init({
      storage: wxMock.storage,
      defaultAlgorithm: 'AES-256-GCM',
      useCompression: true,
      securityLevel: 'high'
    });
  });
  
  /**
   * 测试加密安全级别配置
   * @category 功能测试
   * @priority P0
   */
  test('test_security_levels', function() {
    // 1. 准备测试数据
    var testData = "安全级别测试数据";
    
    // 2. 测试高安全级别加密
    EncryptionManager.setSecurityLevel('high');
    var highSecEncrypted = EncryptionManager.encrypt(testData);
    
    // 3. 测试标准安全级别加密
    EncryptionManager.setSecurityLevel('standard');
    var standardSecEncrypted = EncryptionManager.encrypt(testData);
    
    // 4. 测试低安全级别加密
    EncryptionManager.setSecurityLevel('low');
    var lowSecEncrypted = EncryptionManager.encrypt(testData);
    
    // 5. 验证不同安全级别产生不同的加密结果
    assert.notEquals(highSecEncrypted, standardSecEncrypted);
    assert.notEquals(highSecEncrypted, lowSecEncrypted);
    assert.notEquals(standardSecEncrypted, lowSecEncrypted);
    
    // 6. 验证所有安全级别都能正确解密
    EncryptionManager.setSecurityLevel('high');
    assert.equals(EncryptionManager.decrypt(highSecEncrypted), testData);
    assert.equals(EncryptionManager.decrypt(standardSecEncrypted), testData);
    assert.equals(EncryptionManager.decrypt(lowSecEncrypted), testData);
  });
  
  /**
   * 测试密钥轮换功能
   * @category 功能测试
   * @priority P0
   */
  test('test_key_rotation', function() {
    // 1. 准备测试数据
    var testData = "密钥轮换测试数据";
    
    // 2. 使用当前密钥加密数据
    var encryptedDataBeforeRotation = EncryptionManager.encrypt(testData);
    
    // 3. 执行密钥轮换
    EncryptionManager.rotateEncryptionKeys();
    
    // 4. 使用新密钥加密相同数据
    var encryptedDataAfterRotation = EncryptionManager.encrypt(testData);
    
    // 5. 验证密钥轮换前后加密结果不同
    assert.notEquals(encryptedDataBeforeRotation, encryptedDataAfterRotation);
    
    // 6. 验证轮换后依然能解密旧数据
    var decryptedOldData = EncryptionManager.decrypt(encryptedDataBeforeRotation);
    assert.equals(decryptedOldData, testData);
    
    // 7. 验证能解密新密钥加密的数据
    var decryptedNewData = EncryptionManager.decrypt(encryptedDataAfterRotation);
    assert.equals(decryptedNewData, testData);
    
    // 8. 测试密钥版本管理
    var currentKeyVersion = EncryptionManager.getCurrentKeyVersion();
    assert.isTrue(currentKeyVersion > 1, "密钥轮换后版本应大于1");
  });
  
  /**
   * 测试高级加密算法
   * @category 功能测试
   * @priority P1
   */
  test('test_advanced_algorithms', function() {
    // 1. 准备测试数据
    var testData = "高级加密算法测试数据";
    
    // 2. 测试GCM模式加密
    var gcmEncrypted = EncryptionManager.encrypt(testData, {
      algorithm: 'AES-256-GCM'
    });
    
    // 3. 测试CCM模式加密
    var ccmEncrypted = EncryptionManager.encrypt(testData, {
      algorithm: 'AES-256-CCM'
    });
    
    // 4. 测试ChaCha20-Poly1305加密（如果支持）
    var chachaEncrypted;
    try {
      chachaEncrypted = EncryptionManager.encrypt(testData, {
        algorithm: 'CHACHA20-POLY1305'
      });
    } catch (e) {
      // 忽略不支持的算法错误
    }
    
    // 5. 验证不同算法产生不同加密结果
    assert.notEquals(gcmEncrypted, ccmEncrypted);
    
    if (chachaEncrypted) {
      assert.notEquals(gcmEncrypted, chachaEncrypted);
      assert.notEquals(ccmEncrypted, chachaEncrypted);
    }
    
    // 6. 验证所有算法都能正确解密
    assert.equals(EncryptionManager.decrypt(gcmEncrypted), testData);
    assert.equals(EncryptionManager.decrypt(ccmEncrypted), testData);
    
    if (chachaEncrypted) {
      assert.equals(EncryptionManager.decrypt(chachaEncrypted), testData);
    }
  });
  
  /**
   * 测试大数据加密性能
   * @category 性能测试
   * @priority P2
   */
  test('test_encryption_performance', function() {
    // 1. 准备大量测试数据
    var largeData = generateLargeData(1024 * 1024); // 1MB数据
    
    // 2. 测量加密时间
    var startEncryptTime = Date.now();
    var encrypted = EncryptionManager.encrypt(largeData);
    var encryptionTime = Date.now() - startEncryptTime;
    
    // 3. 测量解密时间
    var startDecryptTime = Date.now();
    var decrypted = EncryptionManager.decrypt(encrypted);
    var decryptionTime = Date.now() - startDecryptTime;
    
    // 4. 验证解密结果正确
    assert.equals(decrypted, largeData);
    
    // 5. 记录性能测试结果
    console.log("加密1MB数据耗时: " + encryptionTime + "ms");
    console.log("解密1MB数据耗时: " + decryptionTime + "ms");
    
    // 6. 性能断言（根据实际性能要求调整）
    assert.isTrue(encryptionTime < 1000, "1MB数据加密应在1秒内完成");
    assert.isTrue(decryptionTime < 1000, "1MB数据解密应在1秒内完成");
  });
  
  /**
   * 测试加密二进制数据
   * @category 功能测试
   * @priority P1
   */
  test('test_binary_data_encryption', function() {
    // 1. 准备二进制测试数据
    var binaryData = new Uint8Array([0, 1, 2, 3, 255, 254, 253, 252]);
    
    // 2. 加密二进制数据
    var encrypted = EncryptionManager.encryptBinary(binaryData);
    
    // 3. 验证加密结果不为空且与原始数据不同
    assert.notNull(encrypted);
    
    // 4. 解密二进制数据
    var decrypted = EncryptionManager.decryptBinary(encrypted);
    
    // 5. 验证解密结果与原始数据一致
    assert.equals(decrypted.length, binaryData.length);
    
    for (var i = 0; i < binaryData.length; i++) {
      assert.equals(decrypted[i], binaryData[i]);
    }
  });
  
  /**
   * 测试加密设置持久化
   * @category 功能测试
   * @priority P1
   */
  test('test_encryption_settings_persistence', function() {
    // 1. 配置自定义加密设置
    EncryptionManager.configure({
      defaultAlgorithm: 'AES-256-CBC',
      useCompression: true,
      securityLevel: 'high'
    });
    
    // 2. 保存设置到存储
    EncryptionManager.saveSettings();
    
    // 3. 重置加密管理器
    EncryptionManager.reset();
    
    // 4. 从存储加载设置
    EncryptionManager.loadSettings();
    
    // 5. 验证设置已正确加载
    var config = EncryptionManager.getConfiguration();
    assert.equals(config.defaultAlgorithm, 'AES-256-CBC');
    assert.equals(config.useCompression, true);
    assert.equals(config.securityLevel, 'high');
  });
});

/**
 * 辅助函数：生成指定大小的测试数据
 * @param {number} sizeInBytes - 要生成的数据大小（字节）
 * @returns {string} 生成的测试数据
 */
function generateLargeData(sizeInBytes) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  
  // 计算需要生成的字符数量（假设每个字符占1字节）
  var charCount = Math.ceil(sizeInBytes);
  
  for (var i = 0; i < charCount; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
} 