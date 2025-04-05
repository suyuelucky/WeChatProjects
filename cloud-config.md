# 微信云托管配置信息（重要！请勿删除或修改）

> 创建时间：2025年3月28日 17时26分07秒
> 地理位置：香港特别行政区，亚洲/香港时区
> 位置坐标：22.2783,114.1747

## 服务信息
- 服务域名: https://express-4mc2-150413-4-1351414515.sh.run.tcloudbase.com
- 环境ID: prod-6gkt60ur787b10ad
- 服务名称: express-4mc2

## 小程序调用示例
```javascript
// 在app.js的onLaunch中初始化
wx.cloud.init({
  env: 'prod-6gkt60ur787b10ad'
})

// 调用云托管服务示例
wx.cloud.callContainer({
  "config": {
    "env": "prod-6gkt60ur787b10ad"
  },
  "path": "/api/count",
  "header": {
    "X-WX-SERVICE": "express-4mc2"
  },
  "method": "POST",
  "data": {
    "action": "inc"
  }
})
```

## 数据库信息
- 类型: MySQL
- 用户名: root
- 密码: [在微信云托管控制台查看]
- 连接方式: 通过环境变量自动注入，无需手动配置连接参数

## 代码仓库
- 模板来源: WeixinCloud/wxcloudrun-express
- GitHub地址: https://github.com/WeixinCloud/wxcloudrun-express
- 本地开发文档: https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/guide/debug/

## API接口说明
### 1. 获取计数值
- 请求方法: GET
- 接口路径: /api/count
- 响应示例:
```json
{
  "code": 0,
  "data": 1
}
```

### 2. 更新计数值
- 请求方法: POST
- 接口路径: /api/count
- 请求参数:
```json
{
  "action": "inc"  // "inc"为增加计数，"clear"为清零
}
```
- 响应示例:
```json
{
  "code": 0,
  "data": 2  // 更新后的计数值
}
```

## 重要提示
1. 本文件包含重要配置信息，请勿删除或修改
2. 环境ID和服务名称在小程序调用云托管服务时必须使用
3. 如需修改配置请到微信云托管控制台操作：https://cloud.weixin.qq.com/ 