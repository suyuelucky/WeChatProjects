# NotificationCenter 通知中心组件

## 简介

NotificationCenter是一个轻量级、灵活的微信小程序通知提示组件，用于向用户展示各类通知信息，包括成功提示、错误警告、普通通知等。该组件支持多种显示方式和动画效果，可高度自定义样式和行为。

## 特性

- 支持多种通知类型（成功、错误、警告、信息）
- 可自定义显示位置（顶部、中间、底部）
- 支持自动消失和手动关闭
- 可配置显示时长和动画效果
- 支持通知队列管理
- 支持图标和文本混排
- 可自定义样式和主题
- 支持点击回调和关闭回调

## 组件结构

```
components/
└── notification/
    ├── notification.js       // 组件逻辑
    ├── notification.json     // 组件配置
    ├── notification.wxml     // 组件模板
    └── notification.wxss     // 组件样式
```

## API参考

### 属性配置

| 属性 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| type | String | 'info' | 通知类型，可选值：info、success、warning、error |
| message | String | '' | 通知内容文本 |
| title | String | '' | 通知标题，可选 |
| position | String | 'top' | 显示位置，可选值：top、center、bottom |
| duration | Number | 3000 | 显示时间（毫秒），设为0则不自动关闭 |
| closable | Boolean | true | 是否显示关闭按钮 |
| showIcon | Boolean | true | 是否显示类型图标 |
| customIcon | String | '' | 自定义图标路径 |
| customClass | String | '' | 自定义样式类名 |
| zIndex | Number | 9999 | 元素堆叠层级 |
| mask | Boolean | false | 是否显示遮罩层 |
| maskClosable | Boolean | true | 点击遮罩层是否可关闭 |

### 事件

| 事件名 | 说明 | 参数 |
| ------ | ---- | ---- |
| tap | 点击通知时触发 | event |
| close | 通知关闭时触发 | event |

### 方法

#### 组件实例方法

| 方法名 | 说明 | 参数 |
| ------ | ---- | ---- |
| show | 显示通知 | - |
| hide | 隐藏通知 | - |
| update | 更新通知内容 | options |

#### 全局API方法

notificationCenter对象提供以下静态方法，可在任意页面使用：

```javascript
// 导入通知中心
import { notificationCenter } from '/utils/components/notification/index';

// 基本使用方法
notificationCenter.show(options);
notificationCenter.info(message, [options]);
notificationCenter.success(message, [options]);
notificationCenter.warning(message, [options]);
notificationCenter.error(message, [options]);
notificationCenter.closeAll();
```

## 使用示例

### 基本用法

**WXML中使用组件：**

```html
<!-- 页面中引入组件 -->
<notification id="notification"></notification>
```

**JS中调用：**

```javascript
Page({
  data: {
    // 页面数据
  },
  
  onLoad() {
    // 获取组件实例
    this.notification = this.selectComponent('#notification');
  },
  
  showNotification() {
    // 显示通知
    this.notification.show({
      type: 'success',
      title: '操作成功',
      message: '数据已成功保存',
      duration: 2000
    });
  }
});
```

### 全局调用方式

```javascript
// 页面.js
import { notificationCenter } from '/utils/components/notification/index';

Page({
  showSuccessMsg() {
    notificationCenter.success('操作成功！');
  },
  
  showErrorMsg() {
    notificationCenter.error('网络连接失败，请稍后重试', {
      duration: 5000,
      closable: true
    });
  },
  
  showCustomNotification() {
    notificationCenter.show({
      type: 'info',
      title: '系统通知',
      message: '您有一条新消息，请注意查收',
      position: 'bottom',
      showIcon: true,
      customClass: 'my-custom-notification',
      onTap: () => {
        wx.navigateTo({
          url: '/pages/message/detail'
        });
      }
    });
  }
});
```

### 不同类型通知

```javascript
// 信息通知
notificationCenter.info('这是一条普通信息');

// 成功通知
notificationCenter.success('操作已成功完成');

// 警告通知
notificationCenter.warning('请注意，这是一个警告');

// 错误通知
notificationCenter.error('操作失败，请重试');
```

### 自定义位置

```javascript
// 顶部通知
notificationCenter.info('顶部通知', { position: 'top' });

// 中间通知
notificationCenter.info('中间通知', { position: 'center' });

// 底部通知
notificationCenter.info('底部通知', { position: 'bottom' });
```

### 自定义持续时间

```javascript
// 显示5秒后自动关闭
notificationCenter.info('短暂通知', { duration: 5000 });

// 不自动关闭
notificationCenter.info('需手动关闭的通知', { duration: 0, closable: true });
```

### 带回调函数的通知

```javascript
notificationCenter.success('操作成功', {
  duration: 2000,
  onTap: () => {
    console.log('通知被点击');
  },
  onClose: () => {
    console.log('通知已关闭');
  }
});
```

### 带遮罩层的通知

```javascript
notificationCenter.warning('重要警告', {
  mask: true,
  maskClosable: true,
  duration: 0 // 需手动关闭
});
```

### 队列通知

```javascript
// 连续显示多个通知
notificationCenter.success('第一条通知');
notificationCenter.info('第二条通知');
notificationCenter.warning('第三条通知');

// 清空所有通知
notificationCenter.closeAll();
```

### 组件引用方式使用

**WXML:**

```html
<notification 
  id="notification"
  type="{{notificationType}}"
  title="{{notificationTitle}}"
  message="{{notificationMessage}}"
  position="{{notificationPosition}}"
  duration="{{notificationDuration}}"
  bind:tap="onNotificationTap"
  bind:close="onNotificationClose">
</notification>
```

**JS:**

```javascript
Page({
  data: {
    notificationType: 'info',
    notificationTitle: '系统消息',
    notificationMessage: '欢迎使用通知中心',
    notificationPosition: 'top',
    notificationDuration: 3000
  },
  
  showCustomNotification() {
    // 更新配置
    this.setData({
      notificationType: 'success',
      notificationTitle: '温馨提示',
      notificationMessage: '您的操作已完成'
    });
    
    // 显示通知
    this.selectComponent('#notification').show();
  },
  
  onNotificationTap() {
    console.log('通知被点击');
  },
  
  onNotificationClose() {
    console.log('通知已关闭');
  }
});
```

## 自定义样式

### 修改默认样式变量

可以在app.wxss中覆盖默认样式变量：

```css
page {
  /* 主题色变量 */
  --notification-primary-color: #2b85e4;
  --notification-success-color: #19be6b;
  --notification-warning-color: #ff9900;
  --notification-error-color: #ed3f14;
  
  /* 背景色变量 */
  --notification-bg-color: #fff;
  --notification-mask-color: rgba(0, 0, 0, 0.3);
  
  /* 文本色变量 */
  --notification-title-color: #17233d;
  --notification-content-color: #515a6e;
  
  /* 大小和间距变量 */
  --notification-border-radius: 4px;
  --notification-padding: 12px 16px;
  --notification-margin: 10px;
}
```

### 使用自定义样式类

```javascript
notificationCenter.info('自定义样式通知', {
  customClass: 'my-custom-notification'
});
```

```css
/* 在页面或全局样式中定义 */
.my-custom-notification {
  background-color: #f8f8f9;
  border-left: 4px solid #2d8cf0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
}
```

## 高级配置

### 全局默认配置

可以修改全局默认配置：

```javascript
// 在app.js中或全局入口设置
import { notificationCenter } from '/utils/components/notification/index';

// 设置全局默认配置
notificationCenter.config({
  duration: 4000,
  position: 'top',
  maxCount: 3,        // 最大同时显示数量
  defaultIcon: true,  // 显示默认图标
  enableAnimation: true // 启用动画
});
```

### 限制通知数量和防抖

```javascript
// 设置最大同时显示数量
notificationCenter.config({
  maxCount: 3, // 最多同时显示3条通知
  duplicate: false // 防止重复内容的通知
});
```

## 注意事项

1. 组件依赖于微信小程序基础库2.2.3及以上版本。
2. 全局调用方式需要确保组件已在页面中正确注册。
3. 过多同时显示的通知会影响用户体验，建议设置合理的maxCount值。
4. 长文本内容建议使用Modal组件而非通知组件展示。
5. 通知组件显示时间不宜过长，推荐1.5秒到5秒之间。
6. 重要操作结果通知应当设置较长的显示时间，确保用户能看到。
7. 组件可能受到页面层级和原生组件覆盖影响，使用时注意zIndex设置。

## 常见问题

### Q: 为什么通知组件无法正常显示？
A: 检查组件是否正确注册，及组件ID是否正确。另外，确保zIndex值足够高，避免被其他元素遮挡。

### Q: 如何实现带有操作按钮的通知？
A: 可以在通知内容中使用富文本，或者使用自定义渲染函数来实现。

### Q: 通知组件和Toast组件有什么区别？
A: Toast一般用于简短的操作反馈，样式固定；通知组件更加灵活，可包含更多信息和交互元素。

### Q: 如何在通知中使用HTML内容？
A: 微信小程序不直接支持HTML，但可以使用rich-text组件在通知内容中展示富文本。

## 版本历史

- v1.0.0 (2023-05-10): 基础版本发布
- v1.1.0 (2023-06-15): 添加动画效果和主题支持
- v1.2.0 (2023-08-20): 增加队列管理和防抖功能
- v1.3.0 (2023-10-30): 增加自定义渲染和富文本支持 