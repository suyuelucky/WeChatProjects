/**
 * GraphQL组件索引文件
 * 
 * 导出GraphQL相关组件，便于统一引用
 * 
 * 创建时间: 2025-04-08 21:00:22
 * 创建者: Claude 3.7 Sonnet
 */

var GraphQLQueryBuilder = require('./GraphQLQueryBuilder');
var GraphQLRequestAdapter = require('./GraphQLRequestAdapter');

module.exports = {
  GraphQLQueryBuilder: GraphQLQueryBuilder,
  GraphQLRequestAdapter: GraphQLRequestAdapter,
  
  /**
   * 创建一个GraphQLRequestAdapter实例
   * @param {Object} config - 配置对象
   * @return {GraphQLRequestAdapter} GraphQLRequestAdapter实例
   */
  createAdapter: function(config) {
    return new GraphQLRequestAdapter(config);
  },
  
  /**
   * 创建一个GraphQLQueryBuilder实例
   * @return {GraphQLQueryBuilder} GraphQLQueryBuilder实例
   */
  createQueryBuilder: function() {
    return new GraphQLQueryBuilder();
  }
}; 