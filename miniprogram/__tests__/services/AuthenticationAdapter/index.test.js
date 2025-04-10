/**
 * AuthenticationAdapter测试索引
 * 
 * 创建时间: 2025-04-09 15:03:45 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试索引文件
 */

// 导入所有测试套件
require('./basicAuth.test');
require('./tokenManagement.test');
require('./sessionHandling.test');
require('./authStrategies.test');
require('./securityVulnerability.test');
require('./integrationTests.test');

/**
 * AuthenticationAdapter 测试套件组织
 * 
 * 1. 基础认证测试 (basicAuth.test.js)
 *    - 微信登录测试
 *    - 用户名密码认证测试
 *    - 会话有效性测试
 *    - 令牌刷新测试
 *    - 登出功能测试
 *    - 权限检查测试
 *    - 安全存储模式测试
 * 
 * 2. 令牌管理测试 (tokenManagement.test.js)
 *    - 访问令牌获取测试
 *    - 令牌过期处理测试
 *    - 令牌刷新失败测试
 *    - 自动令牌刷新测试
 *    - 令牌安全存储测试
 *    - 令牌刷新间隔配置测试
 * 
 * 3. 会话处理测试 (sessionHandling.test.js)
 *    - 会话存储和恢复测试
 *    - 会话过期自动处理测试
 *    - 会话异常检测测试
 *    - 会话持久化测试
 *    - 会话安全升级测试
 * 
 * 4. 认证策略测试 (authStrategies.test.js)
 *    - 多种认证策略统一管理测试
 *    - 自定义认证策略测试
 *    - 认证策略失败处理测试
 *    - 认证策略优先级和回退测试
 *    - 离线认证策略测试
 * 
 * 5. 安全漏洞测试 (securityVulnerability.test.js)
 *    - 令牌泄露防护测试
 *    - 暴力攻击防护测试
 *    - 会话劫持防护测试
 *    - XSS攻击防护测试
 *    - CSRF防护测试
 * 
 * 6. 集成测试 (integrationTests.test.js)
 *    - 认证与同步流程集成测试
 *    - 令牌失效和自动刷新流程测试
 *    - 认证与加密存储集成测试
 *    - 认证状态变化监听测试
 *    - 权限与功能访问控制测试
 */

// 测试运行配置
module.exports = {
  // 测试优先级
  priorities: {
    P0: '关键功能，必须通过',
    P1: '重要功能，应该通过',
    P2: '次要功能，建议通过'
  },
  
  // 测试类别
  categories: {
    '功能测试': '验证基础功能是否正常工作',
    '安全测试': '验证安全相关功能是否有效',
    '错误处理测试': '验证错误情况处理是否合理',
    '集成测试': '验证与其他组件集成是否正常'
  },
  
  // 测试覆盖范围
  coverage: {
    '认证流程': ['basicAuth.test.js', 'authStrategies.test.js'],
    '令牌管理': ['tokenManagement.test.js', 'integrationTests.test.js'],
    '会话处理': ['sessionHandling.test.js', 'securityVulnerability.test.js'],
    '安全机制': ['securityVulnerability.test.js', 'sessionHandling.test.js'],
    '权限管理': ['basicAuth.test.js', 'integrationTests.test.js'],
    '系统集成': ['integrationTests.test.js']
  }
}; 