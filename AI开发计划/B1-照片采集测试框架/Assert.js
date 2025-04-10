/**
 * 工作留痕系统 - 断言工具
 * 用于测试结果验证
 * 符合ES5标准，确保微信小程序兼容性
 */

var Assert = {
  /**
   * 判断两个值是否相等
   * @param {*} actual 实际值
   * @param {*} expected 预期值
   * @param {String} message 错误消息
   * @throws {Error} 如果值不相等则抛出错误
   */
  equal: function(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        message || ('断言失败: ' + JSON.stringify(actual) + ' !== ' + JSON.stringify(expected))
      );
    }
    return true;
  },
  
  /**
   * 判断两个值是否不相等
   * @param {*} actual 实际值
   * @param {*} expected 预期值
   * @param {String} message 错误消息
   * @throws {Error} 如果值相等则抛出错误
   */
  notEqual: function(actual, expected, message) {
    if (actual === expected) {
      throw new Error(
        message || ('断言失败: ' + JSON.stringify(actual) + ' === ' + JSON.stringify(expected))
      );
    }
    return true;
  },
  
  /**
   * 判断两个对象是否深度相等
   * @param {Object} actual 实际对象
   * @param {Object} expected 预期对象
   * @param {String} message 错误消息
   * @throws {Error} 如果对象不相等则抛出错误
   */
  deepEqual: function(actual, expected, message) {
    var actualJson = JSON.stringify(actual);
    var expectedJson = JSON.stringify(expected);
    
    if (actualJson !== expectedJson) {
      throw new Error(
        message || ('断言失败: 对象不相等\n实际: ' + actualJson + '\n预期: ' + expectedJson)
      );
    }
    return true;
  },
  
  /**
   * 判断表达式是否为真
   * @param {*} value 要检查的值
   * @param {String} message 错误消息
   * @throws {Error} 如果值不为true则抛出错误
   */
  isTrue: function(value, message) {
    if (value !== true) {
      throw new Error(
        message || ('断言失败: ' + JSON.stringify(value) + ' 不为 true')
      );
    }
    return true;
  },
  
  /**
   * 判断表达式是否为假
   * @param {*} value 要检查的值
   * @param {String} message 错误消息
   * @throws {Error} 如果值不为false则抛出错误
   */
  isFalse: function(value, message) {
    if (value !== false) {
      throw new Error(
        message || ('断言失败: ' + JSON.stringify(value) + ' 不为 false')
      );
    }
    return true;
  },
  
  /**
   * 判断值是否为null或undefined
   * @param {*} value 要检查的值
   * @param {String} message 错误消息
   * @throws {Error} 如果值不为null或undefined则抛出错误
   */
  isNull: function(value, message) {
    if (value !== null && value !== undefined) {
      throw new Error(
        message || ('断言失败: ' + JSON.stringify(value) + ' 不为 null 或 undefined')
      );
    }
    return true;
  },
  
  /**
   * 判断值是否不为null或undefined
   * @param {*} value 要检查的值
   * @param {String} message 错误消息
   * @throws {Error} 如果值为null或undefined则抛出错误
   */
  notNull: function(value, message) {
    if (value === null || value === undefined) {
      throw new Error(
        message || '断言失败: 值为 null 或 undefined'
      );
    }
    return true;
  },
  
  /**
   * 判断实际值是否大于预期值
   * @param {Number} actual 实际值
   * @param {Number} expected 预期值
   * @param {String} message 错误消息
   * @throws {Error} 如果实际值不大于预期值则抛出错误
   */
  greaterThan: function(actual, expected, message) {
    if (!(actual > expected)) {
      throw new Error(
        message || ('断言失败: ' + actual + ' 不大于 ' + expected)
      );
    }
    return true;
  },
  
  /**
   * 判断实际值是否小于预期值
   * @param {Number} actual 实际值
   * @param {Number} expected 预期值
   * @param {String} message 错误消息
   * @throws {Error} 如果实际值不小于预期值则抛出错误
   */
  lessThan: function(actual, expected, message) {
    if (!(actual < expected)) {
      throw new Error(
        message || ('断言失败: ' + actual + ' 不小于 ' + expected)
      );
    }
    return true;
  },
  
  /**
   * 判断值是否在预期范围内
   * @param {Number} value 要检查的值
   * @param {Number} min 最小值
   * @param {Number} max 最大值
   * @param {String} message 错误消息
   * @throws {Error} 如果值不在范围内则抛出错误
   */
  inRange: function(value, min, max, message) {
    if (value < min || value > max) {
      throw new Error(
        message || ('断言失败: ' + value + ' 不在范围 [' + min + ', ' + max + '] 内')
      );
    }
    return true;
  },
  
  /**
   * 判断字符串是否匹配正则表达式
   * @param {String} value 要检查的字符串
   * @param {RegExp} pattern 正则表达式
   * @param {String} message 错误消息
   * @throws {Error} 如果字符串不匹配正则表达式则抛出错误
   */
  matches: function(value, pattern, message) {
    if (!pattern.test(value)) {
      throw new Error(
        message || ('断言失败: ' + value + ' 不匹配正则表达式 ' + pattern)
      );
    }
    return true;
  },
  
  /**
   * 判断函数是否抛出错误
   * @param {Function} fn 要检查的函数
   * @param {String|RegExp} expectedError 预期的错误消息或匹配模式
   * @param {String} message 错误消息
   * @throws {Error} 如果函数未抛出预期错误则抛出错误
   * @return {Error} 被捕获的错误
   */
  throws: function(fn, expectedError, message) {
    try {
      fn();
      throw new Error(
        message || '断言失败: 未抛出预期错误'
      );
    } catch (error) {
      // 如果是Assert抛出的错误，直接向上传递
      if (error.message && (error.message.indexOf('断言失败:') === 0)) {
        throw error;
      }
      
      // 检查错误是否符合预期
      if (expectedError) {
        if (typeof expectedError === 'string' && error.message !== expectedError) {
          throw new Error(
            message || ('断言失败: 抛出了错误，但消息不符合预期\n' +
                       '预期: ' + expectedError + '\n' +
                       '实际: ' + error.message)
          );
        } else if (expectedError instanceof RegExp && !expectedError.test(error.message)) {
          throw new Error(
            message || ('断言失败: 抛出了错误，但消息不符合预期正则\n' +
                       '预期匹配: ' + expectedError + '\n' +
                       '实际消息: ' + error.message)
          );
        }
      }
      
      return error;
    }
  },
  
  /**
   * 判断数组是否包含特定元素
   * @param {Array} array 要检查的数组
   * @param {*} element 要查找的元素
   * @param {String} message 错误消息
   * @throws {Error} 如果数组不包含该元素则抛出错误
   */
  includes: function(array, element, message) {
    if (array.indexOf(element) === -1) {
      throw new Error(
        message || ('断言失败: 数组不包含元素 ' + JSON.stringify(element))
      );
    }
    return true;
  },
  
  /**
   * 判断对象是否是特定类型的实例
   * @param {Object} object 要检查的对象
   * @param {Function} type 类型构造函数
   * @param {String} message 错误消息
   * @throws {Error} 如果对象不是该类型的实例则抛出错误
   */
  instanceOf: function(object, type, message) {
    if (!(object instanceof type)) {
      throw new Error(
        message || ('断言失败: 对象不是 ' + (type.name || type) + ' 的实例')
      );
    }
    return true;
  }
};

module.exports = Assert; 