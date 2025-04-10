/**
 * 数据类型优先级模块
 * 定义不同类型数据的优先级规则，用于存储管理器的智能清理策略
 * 
 * 作者：AI助手
 * 创建日期：2025-04-10
 */

// 数据类型枚举
var DATA_TYPES = {
  SYSTEM: 'system',  // 系统数据（最高优先级）
  CORE: 'core',      // 核心数据（极高优先级）
  USER: 'user',      // 用户数据（高优先级）
  WORK: 'work',      // 工作数据（中等优先级）
  CACHE: 'cache',    // 缓存数据（低优先级）
  TEMP: 'temp'       // 临时数据（最低优先级）
};

// 数据优先级枚举
var PRIORITIES = {
  CRITICAL: 100,    // 关键数据（不应被自动清理）
  VERY_HIGH: 90,    // 非常高的优先级
  HIGH: 75,         // 高优先级
  NORMAL: 50,       // 普通优先级
  LOW: 25,          // 低优先级
  VERY_LOW: 10,     // 非常低的优先级
  LOWEST: 0         // 最低优先级（首先被清理）
};

// 数据类型到优先级的映射
var TYPE_TO_PRIORITY_MAP = {
  [DATA_TYPES.SYSTEM]: PRIORITIES.CRITICAL,
  [DATA_TYPES.CORE]: PRIORITIES.VERY_HIGH,
  [DATA_TYPES.USER]: PRIORITIES.HIGH,
  [DATA_TYPES.WORK]: PRIORITIES.NORMAL,
  [DATA_TYPES.CACHE]: PRIORITIES.LOW,
  [DATA_TYPES.TEMP]: PRIORITIES.LOWEST
};

/**
 * 获取数据类型的优先级
 * @param {string} dataType 数据类型
 * @returns {number} 数据优先级值
 */
function getTypePriority(dataType) {
  return TYPE_TO_PRIORITY_MAP[dataType] || PRIORITIES.NORMAL;
}

/**
 * 获取优先级分组的数据类型
 * @param {number} priority 优先级值
 * @returns {Array<string>} 该优先级对应的数据类型数组
 */
function getTypesByPriority(priority) {
  var result = [];
  
  for (var type in TYPE_TO_PRIORITY_MAP) {
    if (TYPE_TO_PRIORITY_MAP[type] === priority) {
      result.push(type);
    }
  }
  
  return result;
}

/**
 * 判断某个数据类型是否高于另一个数据类型
 * @param {string} typeA 数据类型A
 * @param {string} typeB 数据类型B
 * @returns {boolean} 如果A的优先级高于B，则返回true
 */
function isTypeHigherPriority(typeA, typeB) {
  var priorityA = getTypePriority(typeA);
  var priorityB = getTypePriority(typeB);
  
  return priorityA > priorityB;
}

/**
 * 获取所有数据类型，按优先级排序（高到低）
 * @returns {Array<string>} 排序后的数据类型数组
 */
function getAllTypesByPriority() {
  var types = Object.keys(DATA_TYPES);
  
  types.sort(function(a, b) {
    return getTypePriority(DATA_TYPES[b]) - getTypePriority(DATA_TYPES[a]);
  });
  
  return types.map(function(type) {
    return DATA_TYPES[type];
  });
}

/**
 * 自定义数据优先级
 * @param {string} dataType 数据类型
 * @param {number} priority 新的优先级值
 */
function setTypePriority(dataType, priority) {
  if (DATA_TYPES[dataType.toUpperCase()] && typeof priority === 'number') {
    TYPE_TO_PRIORITY_MAP[dataType] = priority;
  }
}

// 导出模块
module.exports = {
  DATA_TYPES: DATA_TYPES,
  PRIORITIES: PRIORITIES,
  getTypePriority: getTypePriority,
  getTypesByPriority: getTypesByPriority,
  isTypeHigherPriority: isTypeHigherPriority,
  getAllTypesByPriority: getAllTypesByPriority,
  setTypePriority: setTypePriority
}; 