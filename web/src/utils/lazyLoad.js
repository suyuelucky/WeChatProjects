import React, { Suspense } from 'react';

/**
 * 组件懒加载HOC
 * 
 * 用于优化低端机型性能，按需加载组件
 * 
 * @param {Function} importCallback - React.lazy导入回调
 * @param {React.ReactNode} fallback - 加载中显示的内容
 * @returns {React.ComponentType} - 懒加载的组件
 */
export function lazyLoad(importCallback, fallback = null) {
  const LazyComponent = React.lazy(importCallback);
  
  return (props) => (
    <Suspense fallback={fallback || <div className="loading-placeholder">加载中...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * 图片懒加载
 * 
 * 使用IntersectionObserver API实现图片懒加载
 * 
 * @param {Element} el - 图片元素
 * @returns {Function} - 清理函数
 */
export function lazyLoadImage(el) {
  if (!el) return () => {};
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const image = entry.target;
        const src = image.getAttribute('data-src');
        
        if (src) {
          image.setAttribute('src', src);
          image.removeAttribute('data-src');
        }
        
        observer.unobserve(image);
      }
    });
  }, {
    rootMargin: '100px'
  });
  
  observer.observe(el);
  
  return () => {
    if (el) {
      observer.unobserve(el);
    }
  };
}

/**
 * 路由懒加载
 * 
 * 用于按需加载路由页面
 * 
 * @param {Function} importCallback - React.lazy导入回调
 * @returns {Object} - 路由配置
 */
export function lazyLoadRoute(importCallback) {
  return {
    element: <Suspense fallback={<div className="loading-placeholder">页面加载中...</div>}>
      {React.createElement(React.lazy(importCallback))}
    </Suspense>
  };
} 