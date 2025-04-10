/**
 * dataSync - 数据同步云函数
 * 负责小程序与云端数据同步
 * 
 * 创建时间: 2025年04月09日 10时52分30秒 CST
 * 创建者: Claude 3.7 Sonnet
 */

// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取数据库引用
const db = cloud.database();

/**
 * 获取数据
 * @param {Object} event 事件参数
 * @param {String} event.key 数据键
 * @return {Promise<Object>} 操作结果
 */
async function getData(event) {
  try {
    // 解析键名，格式为 collection_id
    const keyParts = event.key.split('_');
    if (keyParts.length < 2) {
      return {
        success: false,
        message: '无效的键名格式',
        data: null
      };
    }
    
    const collection = keyParts[0];
    const id = keyParts.slice(1).join('_'); // 处理ID中可能包含下划线的情况
    
    // 查询数据
    const result = await db.collection(collection).doc(id).get();
    
    return {
      success: true,
      message: '获取成功',
      data: result.data
    };
  } catch (err) {
    console.error('获取数据失败:', err);
    
    // 检查是否是记录不存在的错误
    if (err.errCode === -1 && err.errMsg.indexOf('not exist') > -1) {
      return {
        success: true, // 这里仍然返回成功，但data为null
        message: '数据不存在',
        data: null
      };
    }
    
    return {
      success: false,
      message: err.message || '获取数据失败',
      data: null,
      error: err
    };
  }
}

/**
 * 保存数据
 * @param {Object} event 事件参数
 * @param {String} event.key 数据键
 * @param {Object} event.value 数据值
 * @return {Promise<Object>} 操作结果
 */
async function setData(event) {
  try {
    // 解析键名，格式为 collection_id
    const keyParts = event.key.split('_');
    if (keyParts.length < 2) {
      return {
        success: false,
        message: '无效的键名格式'
      };
    }
    
    const collection = keyParts[0];
    const id = keyParts.slice(1).join('_');
    const data = event.value;
    
    // 记录同步时间戳
    data._serverSync = {
      timestamp: new Date(),
      openid: cloud.getWXContext().OPENID
    };
    
    // 尝试更新数据
    try {
      await db.collection(collection).doc(id).update({
        data: data
      });
    } catch (updateErr) {
      // 如果记录不存在，则创建
      if (updateErr.errCode === -1 && updateErr.errMsg.indexOf('not exist') > -1) {
        // 创建时添加_id字段
        data._id = id;
        await db.collection(collection).add({
          data: data
        });
      } else {
        throw updateErr;
      }
    }
    
    return {
      success: true,
      message: '保存成功'
    };
  } catch (err) {
    console.error('保存数据失败:', err);
    return {
      success: false,
      message: err.message || '保存数据失败',
      error: err
    };
  }
}

/**
 * 删除数据
 * @param {Object} event 事件参数
 * @param {String} event.key 数据键
 * @return {Promise<Object>} 操作结果
 */
async function removeData(event) {
  try {
    // 解析键名，格式为 collection_id
    const keyParts = event.key.split('_');
    if (keyParts.length < 2) {
      return {
        success: false,
        message: '无效的键名格式'
      };
    }
    
    const collection = keyParts[0];
    const id = keyParts.slice(1).join('_');
    
    // 删除数据
    await db.collection(collection).doc(id).remove();
    
    return {
      success: true,
      message: '删除成功'
    };
  } catch (err) {
    console.error('删除数据失败:', err);
    
    // 如果记录不存在，仍视为成功
    if (err.errCode === -1 && err.errMsg.indexOf('not exist') > -1) {
      return {
        success: true,
        message: '数据不存在或已删除'
      };
    }
    
    return {
      success: false,
      message: err.message || '删除数据失败',
      error: err
    };
  }
}

/**
 * 查询数据
 * @param {Object} event 事件参数
 * @param {String} event.collection 集合名称
 * @param {Object} event.query 查询条件
 * @return {Promise<Object>} 操作结果
 */
async function queryData(event) {
  try {
    const { collection, query } = event;
    
    if (!collection) {
      return {
        success: false,
        message: '缺少集合名称'
      };
    }
    
    // 构建查询
    let dbQuery = db.collection(collection);
    
    // 应用查询条件
    if (query) {
      for (const key in query) {
        // 处理操作符
        if (typeof query[key] === 'object' && query[key] !== null) {
          if (query[key].$gt) {
            dbQuery = dbQuery.where({
              [key]: db.command.gt(query[key].$gt)
            });
          } else if (query[key].$lt) {
            dbQuery = dbQuery.where({
              [key]: db.command.lt(query[key].$lt)
            });
          } else if (query[key].$gte) {
            dbQuery = dbQuery.where({
              [key]: db.command.gte(query[key].$gte)
            });
          } else if (query[key].$lte) {
            dbQuery = dbQuery.where({
              [key]: db.command.lte(query[key].$lte)
            });
          } else if (query[key].$eq) {
            dbQuery = dbQuery.where({
              [key]: query[key].$eq
            });
          } else if (query[key].$ne) {
            dbQuery = dbQuery.where({
              [key]: db.command.neq(query[key].$ne)
            });
          } else {
            dbQuery = dbQuery.where({
              [key]: query[key]
            });
          }
        } else {
          dbQuery = dbQuery.where({
            [key]: query[key]
          });
        }
      }
    }
    
    // 执行查询
    const result = await dbQuery.get();
    
    return {
      success: true,
      message: '查询成功',
      data: result.data
    };
  } catch (err) {
    console.error('查询数据失败:', err);
    return {
      success: false,
      message: err.message || '查询数据失败',
      error: err
    };
  }
}

/**
 * 查询已删除数据
 * @param {Object} event 事件参数
 * @param {String} event.collection 集合名称
 * @param {String} event.since 起始时间戳
 * @return {Promise<Object>} 操作结果
 */
async function queryDeletedData(event) {
  try {
    const { collection, since } = event;
    
    if (!collection) {
      return {
        success: false,
        message: '缺少集合名称'
      };
    }
    
    // 查询删除记录表
    let dbQuery = db.collection('_deleted_records').where({
      collection: collection
    });
    
    // 如果指定了起始时间
    if (since) {
      dbQuery = dbQuery.where({
        deletedAt: db.command.gt(since)
      });
    }
    
    // 执行查询
    const result = await dbQuery.get();
    
    return {
      success: true,
      message: '查询成功',
      data: result.data
    };
  } catch (err) {
    console.error('查询删除数据失败:', err);
    return {
      success: false,
      message: err.message || '查询删除数据失败',
      error: err
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action } = event;
  
  console.log(`执行数据同步操作: ${action}`, event);
  
  // 根据操作类型分发处理
  switch (action) {
    case 'get':
      return getData(event);
    case 'set':
      return setData(event);
    case 'remove':
      return removeData(event);
    case 'query':
      return queryData(event);
    case 'queryDeleted':
      return queryDeletedData(event);
    default:
      return {
        success: false,
        message: `不支持的操作: ${action}`
      };
  }
}; 