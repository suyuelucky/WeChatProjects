/**
 * 微信小程序测试工具
 * 提供简单的单元测试和集成测试功能
 */

// 模拟微信环境对象
if (typeof wx === 'undefined') {
  global.wx = createMockWx();
}

/**
 * 创建模拟的wx对象
 */
function createMockWx() {
  return {
    // 存储相关模拟
    _storage: {},
    
    setStorageSync: function(key, value) {
      this._storage[key] = value;
    },
    
    getStorageSync: function(key) {
      return this._storage[key];
    },
    
    removeStorageSync: function(key) {
      delete this._storage[key];
    },
    
    getStorageInfo: function(options) {
      const keys = Object.keys(this._storage);
      const size = JSON.stringify(this._storage).length;
      
      if (options && options.success) {
        options.success({
          keys: keys,
          currentSize: size,
          limitSize: 10 * 1024 * 1024
        });
      }
      
      return {
        keys: keys,
        currentSize: size,
        limitSize: 10 * 1024 * 1024
      };
    },
    
    // 显示相关模拟
    showToast: function(options) {
      console.log('Toast:', options.title);
    },
    
    showModal: function(options) {
      console.log('Modal:', options.title, options.content);
      
      if (options.success) {
        options.success({
          confirm: true,
          cancel: false
        });
      }
    },
    
    showLoading: function(options) {
      console.log('Loading:', options.title);
    },
    
    hideLoading: function() {
      console.log('Hide Loading');
    },
    
    // 文件相关模拟
    saveFile: function(options) {
      const savedPath = 'saved_' + options.tempFilePath;
      
      if (options.success) {
        options.success({
          savedFilePath: savedPath
        });
      }
      
      return {
        savedFilePath: savedPath
      };
    },
    
    removeSavedFile: function(options) {
      if (options.success) {
        options.success({});
      }
    },
    
    getImageInfo: function(options) {
      if (options.success) {
        options.success({
          width: 1280,
          height: 720,
          path: options.src
        });
      }
    },
    
    // 辅助功能
    canIUse: function() {
      return true;
    },
    
    createOffscreenCanvas: function() {
      return {
        createImage: function() {
          return {
            onload: null,
            onerror: null,
            src: ''
          };
        },
        getContext: function() {
          return {
            clearRect: function() {},
            drawImage: function() {}
          };
        }
      };
    },
    
    canvasToTempFilePath: function(options) {
      if (options.success) {
        options.success({
          tempFilePath: 'canvas_temp_path_' + Date.now()
        });
      }
    },
    
    navigateTo: function(options) {
      console.log('Navigate to:', options.url);
    },
    
    navigateBack: function() {
      console.log('Navigate back');
    },
    
    getSystemInfoSync: function() {
      return {
        platform: 'devtools',
        statusBarHeight: 20,
        windowWidth: 375,
        windowHeight: 667
      };
    }
  };
}

/**
 * 测试套件
 */
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeEachFn = null;
    this.afterEachFn = null;
  }
  
  /**
   * 添加测试用例
   */
  test(desc, fn) {
    this.tests.push({
      description: desc,
      testFn: fn
    });
  }
  
  /**
   * 在每个测试用例前执行
   */
  beforeEach(fn) {
    this.beforeEachFn = fn;
  }
  
  /**
   * 在每个测试用例后执行
   */
  afterEach(fn) {
    this.afterEachFn = fn;
  }
  
  /**
   * 执行测试套件
   */
  async run() {
    console.log(`\n测试套件: ${this.name}`);
    console.log('------------------------------');
    
    let passed = 0;
    let failed = 0;
    
    for (const test of this.tests) {
      try {
        // 运行 beforeEach 钩子
        if (this.beforeEachFn) {
          await this.beforeEachFn();
        }
        
        // 运行测试
        await test.testFn();
        
        // 运行 afterEach 钩子
        if (this.afterEachFn) {
          await this.afterEachFn();
        }
        
        console.log(`✓ ${test.description}`);
        passed++;
      } catch (error) {
        console.error(`✗ ${test.description}`);
        console.error(`  ${error.message}`);
        if (error.stack) {
          console.error(`  ${error.stack.split('\n')[1]}`);
        }
        failed++;
      }
    }
    
    console.log('------------------------------');
    console.log(`结果: ${passed} 通过, ${failed} 失败`);
    
    return {
      total: passed + failed,
      passed,
      failed
    };
  }
}

/**
 * 断言类
 */
class Assert {
  static equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `期望 ${expected}, 实际为 ${actual}`);
    }
  }
  
  static notEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `不应该等于 ${expected}`);
    }
  }
  
  static isTrue(value, message) {
    if (value !== true) {
      throw new Error(message || `期望为 true, 实际为 ${value}`);
    }
  }
  
  static isFalse(value, message) {
    if (value !== false) {
      throw new Error(message || `期望为 false, 实际为 ${value}`);
    }
  }
  
  static deepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    
    if (actualStr !== expectedStr) {
      throw new Error(message || `对象不相等\n期望: ${expectedStr}\n实际: ${actualStr}`);
    }
  }
  
  static throws(fn, message) {
    try {
      fn();
      throw new Error(message || '期望抛出异常，但没有');
    } catch (e) {
      // 如果抛出了错误，测试通过
      if (e.message === message) {
        throw e;
      }
    }
  }
}

// 导出工具
module.exports = {
  TestSuite,
  Assert,
  createMockWx
}; 