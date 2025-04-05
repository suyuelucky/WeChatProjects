// 外脑系统配置
const exobrainConfig = {
  // 开发环境配置
  development: {
    baseUrl: 'http://localhost:3000',
    timeout: 10000,
    retryTimes: 3
  },
  
  // 生产环境配置
  production: {
    baseUrl: 'http://your-server-ip:3000',
    timeout: 5000,
    retryTimes: 2
  }
};

// 获取当前环境配置
const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return exobrainConfig[env];
};

module.exports = {
  getConfig
}; 