/**
 * 云环境配置检测与修复工具
 * 创建时间：2025-04-10 22:29:22
 * 创建者：Claude助手
 */

// 云环境ID列表
const ENV_LIST = [
  'cloudbase-5giucop314e2cd87', // 当前app.js中配置的环境
  'prod-2cx5eb', // 备用环境1
  'test-00d1p' // 备用环境2
];

/**
 * 云环境检测器
 */
const CloudEnvChecker = {
  /**
   * 检查并尝试所有可用环境
   * @returns {Promise<Object>} 检查结果
   */
  checkAndFixEnvironment: function() {
    return new Promise((resolve, reject) => {
      // 检查云开发是否可用
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        return reject({
          success: false,
          error: 'CLOUD_NOT_AVAILABLE',
          message: '云开发不可用，请升级基础库'
        });
      }

      // 记录当前使用的环境ID
      const currentEnvId = this.getCurrentEnvId();
      console.log('当前配置的云环境ID:', currentEnvId);

      // 依次尝试所有环境
      this.testEnvironments(ENV_LIST)
        .then(result => {
          if (result.success) {
            console.log('找到可用的云环境:', result.envId);
            
            // 如果当前环境不是可用环境，尝试切换
            if (currentEnvId !== result.envId) {
              this.switchEnvironment(result.envId);
            }
            
            resolve({
              success: true,
              envId: result.envId,
              switched: currentEnvId !== result.envId,
              message: '云环境检测完成'
            });
          } else {
            reject({
              success: false,
              error: 'NO_VALID_ENV',
              message: '未找到可用的云环境',
              testedEnvs: ENV_LIST
            });
          }
        })
        .catch(err => {
          reject({
            success: false,
            error: 'TEST_FAILED',
            message: '云环境测试失败',
            details: err
          });
        });
    });
  },

  /**
   * 获取当前配置的环境ID
   * @returns {String} 环境ID
   */
  getCurrentEnvId: function() {
    try {
      // 尝试从云开发实例获取
      if (wx.cloud && wx.cloud.config) {
        const config = wx.cloud.config();
        if (config && config.env) {
          return config.env;
        }
      }
      
      // 默认返回app.js中配置的环境
      return ENV_LIST[0];
    } catch (err) {
      console.error('获取当前环境ID失败:', err);
      return ENV_LIST[0];
    }
  },

  /**
   * 测试所有环境直到找到可用的
   * @param {Array<String>} envList 环境ID列表
   * @returns {Promise<Object>} 测试结果
   */
  testEnvironments: function(envList) {
    return new Promise(async (resolve, reject) => {
      let validEnv = null;
      
      for (let i = 0; i < envList.length; i++) {
        const envId = envList[i];
        try {
          console.log(`正在测试云环境 ${i+1}/${envList.length}: ${envId}`);
          const result = await this.testSingleEnvironment(envId);
          if (result.success) {
            validEnv = envId;
            break;
          }
        } catch (err) {
          console.error(`环境 ${envId} 测试失败:`, err);
        }
      }
      
      if (validEnv) {
        resolve({
          success: true,
          envId: validEnv
        });
      } else {
        resolve({
          success: false,
          message: '所有环境均不可用'
        });
      }
    });
  },

  /**
   * 测试单个环境
   * @param {String} envId 环境ID
   * @returns {Promise<Object>} 测试结果
   */
  testSingleEnvironment: function(envId) {
    return new Promise((resolve, reject) => {
      // 初始化指定环境
      try {
        wx.cloud.init({
          env: envId,
          traceUser: true
        });
      } catch (err) {
        return reject({
          success: false,
          error: 'INIT_FAILED',
          message: `初始化云环境失败: ${envId}`,
          details: err
        });
      }
      
      // 尝试调用云函数
      wx.cloud.callFunction({
        name: 'getOpenId',
        data: { msg: 'envTest' },
        success: (res) => {
          resolve({
            success: true,
            result: res,
            message: `环境 ${envId} 测试成功`
          });
        },
        fail: (err) => {
          reject({
            success: false,
            error: 'CALL_FUNCTION_FAILED',
            message: `环境 ${envId} 调用云函数失败`,
            details: err
          });
        }
      });
    });
  },

  /**
   * 切换到可用环境
   * @param {String} envId 新环境ID
   */
  switchEnvironment: function(envId) {
    console.log(`切换到云环境: ${envId}`);
    try {
      wx.cloud.init({
        env: envId,
        traceUser: true
      });
      
      // 如果有全局app实例，更新它的云环境记录
      const app = getApp();
      if (app) {
        app.globalData = app.globalData || {};
        app.globalData.cloudEnv = envId;
      }
      
      console.log('云环境切换成功');
      return true;
    } catch (err) {
      console.error('云环境切换失败:', err);
      return false;
    }
  }
};

module.exports = CloudEnvChecker; 