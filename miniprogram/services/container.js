/**
 * 服务容器
 * 用于管理和注入服务依赖
 */

var ServiceContainer = {
  // 服务注册表
  services: {},
  
  /**
   * 注册服务
   * @param {String} name 服务名称
   * @param {Function} factory 服务工厂函数
   * @return {Object} 当前实例，支持链式调用
   */
  register: function(name, factory) {
    this.services[name] = {
      factory: factory,
      instance: null,
      dependencies: []
    };
    return this;
  },
  
  /**
   * 获取服务实例
   * @param {String} name 服务名称
   * @return {Object} 服务实例
   */
  get: function(name) {
    var service = this.services[name];
    
    if (!service) {
      console.warn('服务未注册:', name);
      return null;
    }
    
    // 如果已经实例化，则直接返回实例
    if (service.instance) {
      return service.instance;
    }
    
    try {
      // 创建服务实例
      service.instance = service.factory(this);
      return service.instance;
    } catch (error) {
      console.error('创建服务实例失败:', name, error);
      return null;
    }
  },
  
  /**
   * 获取所有已注册的服务名称
   * @return {Array<String>} 服务名称列表
   */
  getRegisteredServices: function() {
    return Object.keys(this.services);
  },
  
  /**
   * 检查服务是否已注册
   * @param {String} name 服务名称
   * @return {Boolean} 是否已注册
   */
  has: function(name) {
    return !!this.services[name];
  },
  
  /**
   * 重置服务容器
   * 主要用于测试
   */
  reset: function() {
    this.services = {};
  }
};

module.exports = ServiceContainer; 