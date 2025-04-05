/**
 * 小程序组件懒加载工具
 * 
 * 提供图片懒加载及组件条件渲染功能，针对低端机型优化性能
 */

/**
 * 图片懒加载
 * 
 * 使用IntersectionObserver API实现图片懒加载
 * 
 * @param {Object} options - 配置项
 * @param {String} options.selector - 图片选择器
 * @param {Component} options.component - 组件实例
 * @param {String} options.dataSrc - 图片原始src属性名
 * @param {Number} options.threshold - 出现比例阈值
 * @returns {Function} 销毁观察者的函数
 */
export function lazyLoadImages(options = {}) {
  const {
    selector = '.lazy-image',
    component,
    dataSrc = 'data-src',
    threshold = 0
  } = options;
  
  if (!component) {
    console.warn('lazyLoadImages: component is required');
    return () => {};
  }
  
  const observer = component.createIntersectionObserver({
    thresholds: [threshold],
    observeAll: true
  });
  
  observer.relativeToViewport();
  
  observer.observe(selector, (res) => {
    if (res.intersectionRatio > 0) {
      // 获取所有属性
      const dataset = res.dataset;
      
      // 如果存在data-src，替换为src
      if (dataset && dataset[dataSrc]) {
        // 找到对应的图片元素进行更新
        const query = wx.createSelectorQuery().in(component);
        query.select(`#${res.id}`).node().exec((result) => {
          if (result && result[0] && result[0].node) {
            const img = result[0].node;
            img.src = dataset[dataSrc];
          }
        });
      }
    }
  });
  
  // 返回清理函数
  return () => {
    if (observer) {
      observer.disconnect();
    }
  };
}

/**
 * 组件懒加载 - 基于可见性触发渲染
 * 
 * @param {Object} options - 配置项
 * @param {String} options.selector - 容器选择器
 * @param {Component} options.component - 组件实例
 * @param {String} options.dataKey - 组件数据中标识是否加载的键名
 * @returns {Function} 销毁观察者的函数
 */
export function lazyLoadComponent(options = {}) {
  const {
    selector = '.lazy-component',
    component,
    dataKey = 'isLoaded',
    threshold = 0.1
  } = options;
  
  if (!component) {
    console.warn('lazyLoadComponent: component is required');
    return () => {};
  }
  
  const observer = component.createIntersectionObserver({
    thresholds: [threshold]
  });
  
  observer.relativeToViewport();
  
  observer.observe(selector, (res) => {
    if (res.intersectionRatio > 0) {
      // 更新组件状态，触发渲染
      const data = {};
      data[dataKey] = true;
      component.setData(data);
      
      // 停止观察
      observer.disconnect();
    }
  });
  
  // 返回清理函数
  return () => {
    if (observer) {
      observer.disconnect();
    }
  };
}

/**
 * 页面组件懒加载
 * 
 * 用于分段加载页面内容，优化低端机型性能
 * 
 * @param {Page} page - 页面实例
 * @param {Array} sections - 需要懒加载的数据段配置
 * @returns {Function} 销毁所有观察者的函数
 */
export function lazyLoadPageSections(page, sections = []) {
  if (!page) {
    console.warn('lazyLoadPageSections: page is required');
    return () => {};
  }
  
  const observers = [];
  
  sections.forEach(section => {
    const {
      selector,
      dataKey,
      threshold = 0.1
    } = section;
    
    if (!selector || !dataKey) {
      return;
    }
    
    const observer = page.createIntersectionObserver({
      thresholds: [threshold]
    });
    
    observer.relativeToViewport();
    
    observer.observe(selector, (res) => {
      if (res.intersectionRatio > 0) {
        // 更新页面数据，触发区域渲染
        const data = {};
        data[dataKey] = true;
        page.setData(data);
        
        // 停止观察
        observer.disconnect();
      }
    });
    
    observers.push(observer);
  });
  
  // 返回清理函数
  return () => {
    observers.forEach(observer => {
      if (observer) {
        observer.disconnect();
      }
    });
  };
} 