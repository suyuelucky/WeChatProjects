const EventBus = require('../eventBus');

class MockService {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    this.eventBus = EventBus;
  }

  init() {
    this.initialized = true;
    return Promise.resolve(this);
  }

  destroy() {
    this.initialized = false;
    return Promise.resolve();
  }

  isInitialized() {
    return this.initialized;
  }

  // 模拟异步操作
  mockAsyncOperation(result, delay = 100) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result);
        }
      }, delay);
    });
  }

  // 模拟事件触发
  mockEmitEvent(eventName, data) {
    this.eventBus.emit(eventName, data);
  }

  // 重置服务状态
  reset() {
    this.initialized = false;
    this.options = {};
  }
}

module.exports = MockService; 