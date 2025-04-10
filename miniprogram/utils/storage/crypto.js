/**
 * 加密辅助模块
 * 为存储加密提供基础加密操作
 * 尽可能使用小程序原生API，兼容性更好
 * 
 * 作者：AI助手
 * 创建日期：2025-04-10
 */

// 检查环境，确定是否使用微信原生API
var isWxEnv = typeof wx !== 'undefined' && wx.arrayBufferToBase64;

/**
 * 字符串转ArrayBuffer
 * @param {string} str 输入字符串
 * @returns {ArrayBuffer} 转换后的ArrayBuffer
 */
function stringToArrayBuffer(str) {
  if (!str) return new ArrayBuffer(0);
  
  if (isWxEnv && wx.stringToArrayBuffer) {
    return wx.stringToArrayBuffer(str);
  }
  
  // 兼容实现
  var encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * ArrayBuffer转字符串
 * @param {ArrayBuffer} buffer 输入ArrayBuffer
 * @returns {string} 转换后的字符串
 */
function arrayBufferToString(buffer) {
  if (!buffer) return '';
  
  if (isWxEnv && wx.arrayBufferToString) {
    return wx.arrayBufferToString(buffer);
  }
  
  // 兼容实现
  var decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(buffer));
}

/**
 * ArrayBuffer转Base64
 * @param {ArrayBuffer} buffer 输入ArrayBuffer
 * @returns {string} Base64字符串
 */
function arrayBufferToBase64(buffer) {
  if (!buffer) return '';
  
  if (isWxEnv && wx.arrayBufferToBase64) {
    return wx.arrayBufferToBase64(buffer);
  }
  
  // 兼容实现
  var bytes = new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64转ArrayBuffer
 * @param {string} base64 输入Base64字符串
 * @returns {ArrayBuffer} 转换后的ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  if (!base64) return new ArrayBuffer(0);
  
  if (isWxEnv && wx.base64ToArrayBuffer) {
    return wx.base64ToArrayBuffer(base64);
  }
  
  // 兼容实现
  var binary = atob(base64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 生成随机字节
 * @param {number} length 字节长度
 * @returns {ArrayBuffer} 随机字节数组
 */
function generateRandomBytes(length) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // 使用Web标准API
    var bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes.buffer;
  } else if (isWxEnv && wx.getRandomValues) {
    // 使用微信小程序API
    var bytes = new Uint8Array(length);
    wx.getRandomValues({
      length: length,
      success: function(res) {
        bytes = new Uint8Array(res.randomValues);
      }
    });
    return bytes.buffer;
  } else {
    // 兼容实现(不安全，仅用于演示)
    var bytes = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes.buffer;
  }
}

/**
 * 从密码派生密钥(PBKDF2实现)
 * @param {ArrayBuffer} password 密码
 * @param {ArrayBuffer} salt 盐
 * @param {number} iterations 迭代次数
 * @param {number} keyLength 密钥长度(位)
 * @returns {ArrayBuffer} 派生的密钥
 */
function deriveKey(password, salt, iterations, keyLength) {
  // 此处是一个简化的PBKDF2实现
  // 实际应用中应使用WebCrypto API或专业加密库
  
  if (isWxEnv && wx.pbkdf2) {
    return wx.pbkdf2({
      password: password,
      salt: salt,
      iterations: iterations,
      keyLength: keyLength / 8, // 转换为字节
      hash: 'SHA-256'
    }).key;
  }
  
  // 简化实现(不安全，仅用于演示)
  var passwordArray = new Uint8Array(password);
  var saltArray = new Uint8Array(salt);
  var result = new Uint8Array(keyLength / 8);
  
  // 混合密码和盐
  for (var i = 0; i < result.length; i++) {
    result[i] = passwordArray[i % passwordArray.length] ^ 
               saltArray[i % saltArray.length];
  }
  
  // 模拟多次迭代
  var hash = result;
  for (var i = 0; i < iterations; i++) {
    hash = simpleHash(hash);
  }
  
  return hash.buffer;
}

/**
 * 简单的哈希函数(演示用)
 * @private
 * @param {Uint8Array} data 输入数据
 * @returns {Uint8Array} 哈希结果
 */
function simpleHash(data) {
  var result = new Uint8Array(32); // SHA-256大小
  
  // 简单的混合操作
  for (var i = 0; i < 32; i++) {
    var sum = 0;
    for (var j = 0; j < data.length; j++) {
      sum += data[j] * (j + i + 1);
    }
    result[i] = sum % 256;
  }
  
  return result;
}

/**
 * AES加密
 * @param {string} plaintext 明文
 * @param {ArrayBuffer} key 密钥
 * @param {ArrayBuffer} iv 初始化向量
 * @param {string} algorithm 算法
 * @returns {ArrayBuffer} 密文
 */
function encrypt(plaintext, key, iv, algorithm) {
  if (isWxEnv && wx.encrypt) {
    // 使用微信小程序API
    return wx.encrypt({
      text: plaintext,
      key: key,
      iv: iv,
      algorithm: algorithm
    }).data;
  }
  
  // 简化实现(不安全，仅用于演示)
  var plaintextArray = new Uint8Array(stringToArrayBuffer(plaintext));
  var keyArray = new Uint8Array(key);
  var ivArray = new Uint8Array(iv);
  var result = new Uint8Array(plaintextArray.length);
  
  for (var i = 0; i < plaintextArray.length; i++) {
    result[i] = plaintextArray[i] ^ keyArray[i % keyArray.length] ^ ivArray[i % ivArray.length];
  }
  
  return result.buffer;
}

/**
 * AES解密
 * @param {ArrayBuffer} ciphertext 密文
 * @param {ArrayBuffer} key 密钥
 * @param {ArrayBuffer} iv 初始化向量
 * @param {string} algorithm 算法
 * @returns {string} 明文
 */
function decrypt(ciphertext, key, iv, algorithm) {
  if (isWxEnv && wx.decrypt) {
    // 使用微信小程序API
    return wx.decrypt({
      data: ciphertext,
      key: key,
      iv: iv,
      algorithm: algorithm
    }).text;
  }
  
  // 简化实现(不安全，仅用于演示)
  var ciphertextArray = new Uint8Array(ciphertext);
  var keyArray = new Uint8Array(key);
  var ivArray = new Uint8Array(iv);
  var result = new Uint8Array(ciphertextArray.length);
  
  for (var i = 0; i < ciphertextArray.length; i++) {
    result[i] = ciphertextArray[i] ^ keyArray[i % keyArray.length] ^ ivArray[i % ivArray.length];
  }
  
  return arrayBufferToString(result.buffer);
}

/**
 * 计算HMAC
 * @param {ArrayBuffer} data 数据
 * @param {ArrayBuffer} key 密钥
 * @param {string} algorithm 算法
 * @returns {ArrayBuffer} HMAC值
 */
function hmac(data, key, algorithm) {
  if (isWxEnv && wx.hmac) {
    // 使用微信小程序API
    return wx.hmac({
      data: data,
      key: key,
      algorithm: algorithm || 'SHA-256'
    }).data;
  }
  
  // 简化实现(不安全，仅用于演示)
  var dataArray = new Uint8Array(data);
  var keyArray = new Uint8Array(key);
  var result = new Uint8Array(32); // SHA-256大小
  
  for (var i = 0; i < result.length; i++) {
    var sum = 0;
    for (var j = 0; j < dataArray.length; j++) {
      sum += dataArray[j] * keyArray[(i + j) % keyArray.length];
    }
    result[i] = sum % 256;
  }
  
  return result.buffer;
}

/**
 * 密码学签名
 * @param {ArrayBuffer} data 数据
 * @param {ArrayBuffer} privateKey 私钥
 * @param {string} algorithm 算法
 * @returns {ArrayBuffer} 签名
 */
function sign(data, privateKey, algorithm) {
  if (isWxEnv && wx.signCrypto) {
    // 使用微信小程序API
    return wx.signCrypto({
      data: data,
      privateKey: privateKey,
      algorithm: algorithm || 'RSA-SHA256'
    }).signature;
  }
  
  // 简化实现，直接使用HMAC(不安全，仅用于演示)
  return hmac(data, privateKey, 'SHA-256');
}

/**
 * 验证签名
 * @param {ArrayBuffer} data 数据
 * @param {ArrayBuffer} signature 签名
 * @param {ArrayBuffer} publicKey 公钥
 * @param {string} algorithm 算法
 * @returns {boolean} 验证结果
 */
function verify(data, signature, publicKey, algorithm) {
  if (isWxEnv && wx.verifyCrypto) {
    // 使用微信小程序API
    return wx.verifyCrypto({
      data: data,
      signature: signature,
      publicKey: publicKey,
      algorithm: algorithm || 'RSA-SHA256'
    }).result;
  }
  
  // 简化实现，直接使用HMAC(不安全，仅用于演示)
  var expectedSignature = hmac(data, publicKey, 'SHA-256');
  
  // 比较签名
  var signatureArray = new Uint8Array(signature);
  var expectedArray = new Uint8Array(expectedSignature);
  
  if (signatureArray.length !== expectedArray.length) {
    return false;
  }
  
  for (var i = 0; i < signatureArray.length; i++) {
    if (signatureArray[i] !== expectedArray[i]) {
      return false;
    }
  }
  
  return true;
}

// 导出模块
module.exports = {
  stringToArrayBuffer: stringToArrayBuffer,
  arrayBufferToString: arrayBufferToString,
  arrayBufferToBase64: arrayBufferToBase64,
  base64ToArrayBuffer: base64ToArrayBuffer,
  generateRandomBytes: generateRandomBytes,
  deriveKey: deriveKey,
  encrypt: encrypt,
  decrypt: decrypt,
  hmac: hmac,
  sign: sign,
  verify: verify
}; 