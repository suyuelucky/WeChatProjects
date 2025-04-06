/**
 * Event Emitter模块
 * 
 * 这是eventBus.js的别名，用于提供更现代的命名约定
 * 同时为了兼容ES模块和CommonJS模块系统
 */

const EventBus = require('./eventBus.js');

// 导出EventBus别名
module.exports = EventBus; 