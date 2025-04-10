# 工作留痕系统接口API文档

创建时间: 2025-04-10 11:22:34
创建者: 接口设计组
编辑时间: 2025-04-10 11:58:23

## 接口API文档说明

本文档详细描述工作留痕系统对外提供的所有API接口，包括前端调用的接口和提供给第三方的开放接口。本接口设计满足REST规范，确保系统在高并发下的稳定性和安全性。

## 目录

1. [接口设计原则](#接口设计原则)
2. [接口规范](#接口规范)
3. [通用数据结构](#通用数据结构)
4. [接口详细说明](#接口详细说明)
5. [错误码说明](#错误码说明)
6. [接口变更记录](#接口变更记录)

## 接口设计原则

### RESTful设计

1. **资源唯一标识**: 每个资源都有唯一的URI标识
2. **统一接口**: 使用HTTP标准方法表示操作
   - GET: 获取资源
   - POST: 创建资源
   - PUT: 更新资源
   - DELETE: 删除资源
3. **无状态**: 每个请求包含所有必要信息，不依赖服务器上的任何状态
4. **资源表现形式**: 使用JSON作为数据交换格式

### 安全性原则

1. **身份验证**: 所有非公开接口都需要身份验证
2. **授权控制**: 基于角色的访问控制(RBAC)
3. **数据加密**: 敏感数据传输使用HTTPS
4. **防御XSS和CSRF**: 实施适当的安全头和令牌验证

### 性能原则

1. **分页**: 大量数据查询支持分页
2. **部分响应**: 支持筛选返回字段
3. **缓存策略**: 适当使用HTTP缓存机制
4. **限流**: 防止恶意请求和服务过载

## 接口规范

### 请求规范

#### URL规范

```
https://api.tracesys.com/v1/{resource}/{resourceId}/{subResource}
```

- 基础URL: `https://api.tracesys.com`
- API版本: `/v1`
- 资源名称: 使用复数形式，如`/users`、`/workrecords`
- 资源ID: 资源的唯一标识，如`/users/123`
- 子资源: 资源的从属资源，如`/projects/456/tasks`

#### 请求方法

- `GET`: 获取资源
- `POST`: 创建资源
- `PUT`: 全量更新资源
- `PATCH`: 部分更新资源
- `DELETE`: 删除资源

#### 请求头

| 请求头            | 说明                               | 示例                          |
|-------------------|-----------------------------------|-------------------------------|
| Authorization     | 身份认证令牌，Bearer格式           | Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| Content-Type      | 请求内容类型，默认application/json | application/json              |
| Accept            | 期望的响应格式                     | application/json              |
| X-Request-ID      | 请求唯一标识                       | 550e8400-e29b-41d4-a716-446655440000 |
| X-API-Version     | API版本                           | 1.0                           |

#### 请求参数

1. **路径参数**: URL路径中的参数，如`/users/{userId}`
2. **查询参数**: URL查询字符串中的参数，如`?page=1&size=10`
3. **请求体**: JSON格式的请求数据

### 响应规范

#### 状态码

| 状态码 | 说明                 |
|--------|---------------------|
| 200    | 成功                |
| 201    | 创建成功            |
| 204    | 删除成功            |
| 400    | 请求参数错误        |
| 401    | 未授权              |
| 403    | 权限不足            |
| 404    | 资源不存在          |
| 409    | 资源冲突            |
| 422    | 请求实体无法处理    |
| 429    | 请求过于频繁        |
| 500    | 服务器内部错误      |

#### 响应体格式

成功响应:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 响应数据
  }
}
```

分页响应:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      // 数据列表
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

错误响应:

```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "username",
      "message": "用户名不能为空"
    }
  ]
}
```

## 通用数据结构

### 用户(User)

```json
{
  "id": "string",
  "username": "string",
  "realName": "string",
  "email": "string",
  "phone": "string",
  "department": "string",
  "position": "string",
  "role": "string",
  "status": "active|inactive",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 工作记录(WorkRecord)

```json
{
  "id": "string",
  "userId": "string",
  "projectId": "string",
  "title": "string",
  "content": "string",
  "recordType": "daily|weekly|monthly",
  "workDate": "date",
  "workTime": "number",
  "status": "draft|submitted|approved|rejected",
  "attachments": [
    {
      "id": "string",
      "fileName": "string",
      "fileSize": "number",
      "fileType": "string",
      "fileUrl": "string",
      "uploadTime": "datetime"
    }
  ],
  "comments": [
    {
      "id": "string",
      "userId": "string",
      "content": "string",
      "commentTime": "datetime"
    }
  ],
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 项目(Project)

```json
{
  "id": "string",
  "name": "string",
  "code": "string",
  "description": "string",
  "managerId": "string",
  "status": "planning|inProgress|completed|suspended",
  "startDate": "date",
  "endDate": "date",
  "members": [
    {
      "userId": "string",
      "role": "manager|member",
      "joinDate": "date"
    }
  ],
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 分页参数(Pagination)

```json
{
  "page": "number",
  "size": "number",
  "total": "number",
  "totalPages": "number"
}
```

### 排序参数(Sort)

```json
{
  "field": "string",
  "order": "asc|desc"
}
```

## 详细接口描述

### 用户管理接口

#### 用户注册

- **接口URL**: `/api/v1/users/register`
- **请求方法**: `POST`
- **接口描述**: 新用户注册

**请求参数**:

```json
{
  "username": "string", // 用户名，必填，长度5-20字符
  "password": "string", // 密码，必填，长度8-20字符
  "realName": "string", // 真实姓名，必填
  "email": "string",    // 邮箱，必填，符合邮箱格式
  "phone": "string",    // 手机号，必填，符合手机号格式
  "department": "string", // 部门，必填
  "position": "string"    // 职位，必填
}
```

**响应参数**:

```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": "12345678",
    "username": "zhangsan",
    "realName": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "department": "研发部",
    "position": "开发工程师",
    "role": "user",
    "status": "active",
    "createdAt": "2025-04-10T11:25:00Z"
  }
}
```

#### 用户登录

- **接口URL**: `/api/v1/users/login`
- **请求方法**: `POST`
- **接口描述**: 用户登录认证

**请求参数**:

```json
{
  "username": "string", // 用户名，必填
  "password": "string"  // 密码，必填
}
```

**响应参数**:

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "12345678",
      "username": "zhangsan",
      "realName": "张三",
      "role": "user",
      "department": "研发部",
      "position": "开发工程师"
    }
  }
}
```

#### 获取用户信息

- **接口URL**: `/api/v1/users/{userId}`
- **请求方法**: `GET`
- **接口描述**: 获取指定用户的详细信息

**请求参数**:

- 路径参数:
  - `userId`: 用户ID，必填

**响应参数**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "12345678",
    "username": "zhangsan",
    "realName": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "department": "研发部",
    "position": "开发工程师",
    "role": "user",
    "status": "active",
    "createdAt": "2025-04-10T11:25:00Z",
    "updatedAt": "2025-04-10T11:25:00Z"
  }
}
```

#### 更新用户信息

- **接口URL**: `/api/v1/users/{userId}`
- **请求方法**: `PUT`
- **接口描述**: 更新指定用户的详细信息

**请求参数**:

- 路径参数:
  - `userId`: 用户ID，必填

- 请求体:
```json
{
  "realName": "string", // 真实姓名，选填
  "email": "string",    // 邮箱，选填
  "phone": "string",    // 手机号，选填
  "department": "string", // 部门，选填
  "position": "string",   // 职位，选填
  "status": "active|inactive" // 状态，选填
}
```

**响应参数**:

```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "12345678",
    "username": "zhangsan",
    "realName": "张三(已更新)",
    "email": "zhangsan_new@example.com",
    "phone": "13900139000",
    "department": "产品部",
    "position": "产品经理",
    "role": "user",
    "status": "active",
    "updatedAt": "2025-04-10T11:25:30Z"
  }
}
```

#### 修改密码

- **接口URL**: `/api/v1/users/{userId}/password`
- **请求方法**: `PATCH`
- **接口描述**: 修改用户密码

**请求参数**:

- 路径参数:
  - `userId`: 用户ID，必填

- 请求体:
```json
{
  "oldPassword": "string", // 旧密码，必填
  "newPassword": "string"  // 新密码，必填，长度8-20字符
}
```

**响应参数**:

```json
{
  "code": 200,
  "message": "密码修改成功",
  "data": null
}
```

#### 获取用户列表

- **接口URL**: `/api/v1/users`
- **请求方法**: `GET`
- **接口描述**: 获取用户列表，支持分页、筛选和排序

**请求参数**:

- 查询参数:
  - `page`: 页码，选填，默认1
  - `size`: 每页条数，选填，默认10
  - `department`: 部门筛选，选填
  - `status`: 状态筛选，选填，可选值：active, inactive
  - `keyword`: 关键字搜索，选填，搜索用户名和真实姓名
  - `sortField`: 排序字段，选填，默认createdAt
  - `sortOrder`: 排序方向，选填，可选值：asc, desc，默认desc

**响应参数**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": "12345678",
        "username": "zhangsan",
        "realName": "张三",
        "department": "研发部",
        "position": "开发工程师",
        "status": "active",
        "createdAt": "2025-04-10T11:25:00Z"
      },
      {
        "id": "12345679",
        "username": "lisi",
        "realName": "李四",
        "department": "产品部",
        "position": "产品经理",
        "status": "active",
        "createdAt": "2025-04-09T10:15:00Z"
      }
      // 更多用户...
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### 工作记录管理接口

#### 创建工作记录

- **接口URL**: `/api/v1/work-records`
- **请求方法**: `POST`
- **接口描述**: 创建新的工作记录

**请求参数**:

```json
{
  "projectId": "string",   // 项目ID，必填
  "title": "string",       // 记录标题，必填，1-100字符
  "content": "string",     // 记录内容，必填
  "workDate": "string",    // 工作日期，必填，格式：YYYY-MM-DD
  "workHours": "number",   // 工作时长(小时)，必填，0.5-24之间
  "workType": "string",    // 工作类型，必填，可选值：需求分析、设计、编码、测试、部署、会议、其他
  "priority": "string",    // 优先级，选填，可选值：high、medium、low，默认medium
  "attachments": [         // 附件，选填
    {
      "name": "string",    // 附件名称
      "fileUrl": "string", // 附件URL
      "size": "number",    // 附件大小(KB)
      "type": "string"     // 附件类型，如：pdf、doc、jpg
    }
  ],
  "participants": [        // 参与人员，选填
    {
      "userId": "string",  // 用户ID
      "role": "string"     // 参与角色，如：负责人、协作者
    }
  ]
}
```

**响应参数**:

```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": "WR20250410001",
    "projectId": "P2025001",
    "userId": "12345678",
    "userName": "张三",
    "title": "完成登录模块开发",
    "content": "今日完成了用户登录模块的全部编码工作，包括表单验证、API对接和错误处理",
    "workDate": "2025-04-10",
    "workHours": 8,
    "workType": "编码",
    "priority": "medium",
    "status": "completed",
    "attachments": [
      {
        "id": "F20250410001",
        "name": "登录模块设计文档.pdf",
        "fileUrl": "https://example.com/files/F20250410001",
        "size": 1024,
        "type": "pdf"
      }
    ],
    "participants": [
      {
        "userId": "12345679",
        "userName": "李四",
        "role": "协作者"
      }
    ],
    "createdAt": "2025-04-10T11:30:00Z"
  }
}
```

#### 获取工作记录详情

- **接口URL**: `/api/v1/work-records/{recordId}`
- **请求方法**: `GET`
- **接口描述**: 获取指定工作记录的详细信息

**请求参数**:

- 路径参数:
  - `recordId`: 工作记录ID，必填

**响应参数**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "WR20250410001",
    "projectId": "P2025001",
    "projectName": "工作留痕系统开发",
    "userId": "12345678",
    "userName": "张三",
    "title": "完成登录模块开发",
    "content": "今日完成了用户登录模块的全部编码工作，包括表单验证、API对接和错误处理",
    "workDate": "2025-04-10",
    "workHours": 8,
    "workType": "编码",
    "priority": "medium",
    "status": "completed",
    "attachments": [
      {
        "id": "F20250410001",
        "name": "登录模块设计文档.pdf",
        "fileUrl": "https://example.com/files/F20250410001",
        "size": 1024,
        "type": "pdf",
        "uploadTime": "2025-04-10T11:25:00Z"
      }
    ],
    "participants": [
      {
        "userId": "12345679",
        "userName": "李四",
        "role": "协作者"
      }
    ],
    "comments": [
      {
        "id": "C20250410001",
        "userId": "12345679",
        "userName": "李四",
        "content": "代码质量不错，已完成CR",
        "createdAt": "2025-04-10T14:25:00Z"
      }
    ],
    "createdAt": "2025-04-10T11:30:00Z",
    "updatedAt": "2025-04-10T14:30:00Z"
  }
}
```

#### 更新工作记录

- **接口URL**: `/api/v1/work-records/{recordId}`
- **请求方法**: `PUT`
- **接口描述**: 更新指定工作记录的信息

**请求参数**:

- 路径参数:
  - `recordId`: 工作记录ID，必填

- 请求体:
```json
{
  "title": "string",       // 记录标题，选填
  "content": "string",     // 记录内容，选填
  "workDate": "string",    // 工作日期，选填，格式：YYYY-MM-DD
  "workHours": "number",   // 工作时长(小时)，选填
  "workType": "string",    // 工作类型，选填
  "priority": "string",    // 优先级，选填
  "status": "string",      // 状态，选填，可选值：draft、completed、reviewed
  "attachments": [         // 附件，选填，如果提供则替换现有附件
    {
      "name": "string",
      "fileUrl": "string",
      "size": "number",
      "type": "string"
    }
  ],
  "participants": [        // 参与人员，选填，如果提供则替换现有参与人员
    {
      "userId": "string",
      "role": "string"
    }
  ]
}
```

**响应参数**:

```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "WR20250410001",
    "title": "完成登录模块开发与测试",
    "content": "今日完成了用户登录模块的全部编码和单元测试工作",
    "workDate": "2025-04-10",
    "workHours": 10,
    "workType": "编码",
    "priority": "high",
    "status": "reviewed",
    "updatedAt": "2025-04-10T15:30:00Z"
  }
}
```

#### 删除工作记录

- **接口URL**: `/api/v1/work-records/{recordId}`
- **请求方法**: `DELETE`
- **接口描述**: 删除指定工作记录

**请求参数**:

- 路径参数:
  - `recordId`: 工作记录ID，必填

**响应参数**:

```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

#### 获取工作记录列表

- **接口URL**: `/api/v1/work-records`
- **请求方法**: `GET`
- **接口描述**: 获取工作记录列表，支持分页、筛选和排序

**请求参数**:

- 查询参数:
  - `page`: 页码，选填，默认1
  - `size`: 每页条数，选填，默认10
  - `userId`: 用户ID筛选，选填
  - `projectId`: 项目ID筛选，选填
  - `workType`: 工作类型筛选，选填
  - `status`: 状态筛选，选填
  - `startDate`: 开始日期筛选，选填，格式：YYYY-MM-DD
  - `endDate`: 结束日期筛选，选填，格式：YYYY-MM-DD
  - `keyword`: 关键字搜索，选填，搜索标题和内容
  - `sortField`: 排序字段，选填，默认createdAt
  - `sortOrder`: 排序方向，选填，可选值：asc, desc，默认desc

**响应参数**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": "WR20250410001",
        "projectId": "P2025001",
        "projectName": "工作留痕系统开发",
        "userId": "12345678",
        "userName": "张三",
        "title": "完成登录模块开发",
        "workDate": "2025-04-10",
        "workHours": 8,
        "workType": "编码",
        "status": "completed",
        "createdAt": "2025-04-10T11:30:00Z"
      },
      {
        "id": "WR20250409001",
        "projectId": "P2025001",
        "projectName": "工作留痕系统开发",
        "userId": "12345678",
        "userName": "张三",
        "title": "用户登录模块设计",
        "workDate": "2025-04-09",
        "workHours": 6,
        "workType": "设计",
        "status": "reviewed",
        "createdAt": "2025-04-09T16:45:00Z"
      }
      // 更多工作记录...
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 42,
      "totalPages": 5
    }
  }
}
```

#### 添加工作记录评论

- **接口URL**: `/api/v1/work-records/{recordId}/comments`
- **请求方法**: `POST`
- **接口描述**: 为指定工作记录添加评论

**请求参数**:

- 路径参数:
  - `recordId`: 工作记录ID，必填

- 请求体:
```json
{
  "content": "string" // 评论内容，必填，1-500字符
}
```

**响应参数**:

```json
{
  "code": 201,
  "message": "评论添加成功",
  "data": {
    "id": "C20250410002",
    "userId": "12345680",
    "userName": "王五",
    "content": "请补充单元测试用例",
    "createdAt": "2025-04-10T16:15:00Z"
  }
}
```

### 项目管理接口

#### 创建项目

- **接口URL**: `/api/v1/projects`
- **请求方法**: `POST`
- **接口描述**: 创建新项目

**请求参数**:

```json
{
  "name": "string",            // 项目名称，必填，2-100字符
  "description": "string",     // 项目描述，选填
  "startDate": "string",       // 开始日期，必填，格式：YYYY-MM-DD
  "endDate": "string",         // 预计结束日期，选填，格式：YYYY-MM-DD
  "status": "string",          // 项目状态，必填，可选值：planning、in_progress、completed、on_hold
  "priority": "string",        // 优先级，必填，可选值：high、medium、low
  "leaderId": "string",        // 项目负责人ID，必填
  "tags": [                    // 项目标签，选填
    "string"
  ],
  "members": [                 // 项目成员，选填
    {
      "userId": "string",      // 用户ID
      "role": "string"         // 角色，可选值：leader、developer、designer、tester
    }
  ]
}
```

**响应参数**:

```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": "P2025001",
    "name": "工作留痕系统开发",
    "description": "开发一套完整的企业内部工作留痕管理系统",
    "startDate": "2025-01-15",
    "endDate": "2025-06-30",
    "status": "in_progress",
    "priority": "high",
    "leaderId": "12345678",
    "leaderName": "张三",
    "tags": ["内部系统", "敏捷开发"],
    "members": [
      {
        "userId": "12345678",
        "userName": "张三",
        "role": "leader"
      },
      {
        "userId": "12345679",
        "userName": "李四",
        "role": "developer"
      }
    ],
    "createdAt": "2025-04-10T10:00:00Z"
  }
}
```

#### 获取项目详情

- **接口URL**: `/api/v1/projects/{projectId}`
- **请求方法**: `GET`
- **接口描述**: 获取指定项目的详细信息

**请求参数**:

- 路径参数:
  - `projectId`: 项目ID，必填

**响应参数**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "P2025001",
    "name": "工作留痕系统开发",
    "description": "开发一套完整的企业内部工作留痕管理系统",
    "startDate": "2025-01-15",
    "endDate": "2025-06-30",
    "status": "in_progress",
    "priority": "high",
    "progress": 45,            // 项目进度百分比
    "leaderId": "12345678",
    "leaderName": "张三",
    "tags": ["内部系统", "敏捷开发"],
    "members": [
      {
        "userId": "12345678",
        "userName": "张三",
        "role": "leader",
        "joinTime": "2025-01-15T08:00:00Z"
      },
      {
        "userId": "12345679",
        "userName": "李四",
        "role": "developer",
        "joinTime": "2025-01-15T08:00:00Z"
      },
      {
        "userId": "12345680",
        "userName": "王五",
        "role": "tester",
        "joinTime": "2025-01-20T09:30:00Z"
      }
    ],
    "statistics": {
      "totalWorkRecords": 128,
      "totalWorkHours": 564,
      "completedTasks": 48,
      "pendingTasks": 35,
      "recentActivity": "2025-04-10T15:45:00Z"
    },
    "createdAt": "2025-01-10T14:30:00Z",
    "updatedAt": "2025-04-09T16:20:00Z"
  }
}
```

#### 更新项目信息

- **接口URL**: `/api/v1/projects/{projectId}`
- **请求方法**: `PUT`
- **接口描述**: 更新指定项目的信息

**请求参数**:

- 路径参数:
  - `projectId`: 项目ID，必填

- 请求体:
```json
{
  "name": "string",            // 项目名称，选填
  "description": "string",     // 项目描述，选填
  "startDate": "string",       // 开始日期，选填
  "endDate": "string",         // 预计结束日期，选填
  "status": "string",          // 项目状态，选填
  "priority": "string",        // 优先级，选填
  "leaderId": "string",        // 项目负责人ID，选填
  "tags": [                    // 项目标签，选填，如果提供则替换现有标签
    "string"
  ],
  "progress": "number"         // 项目进度百分比，选填，0-100
}
```

**响应参数**:

```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "P2025001",
    "name": "工作留痕系统开发2.0",
    "status": "in_progress",
    "priority": "high",
    "progress": 50,
    "updatedAt": "2025-04-10T12:30:00Z"
  }
}
```

#### 删除项目

- **接口URL**: `/api/v1/projects/{projectId}`
- **请求方法**: `DELETE`
- **接口描述**: 删除指定项目（仅管理员或项目负责人可操作）

**请求参数**:

- 路径参数:
  - `projectId`: 项目ID，必填

**响应参数**:

```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

#### 获取项目列表

- **接口URL**: `/api/v1/projects`
- **请求方法**: `GET`
- **接口描述**: 获取项目列表，支持分页、筛选和排序

**请求参数**:

- 查询参数:
  - `page`: 页码，选填，默认1
  - `size`: 每页条数，选填，默认10
  - `status`: 项目状态筛选，选填
  - `priority`: 优先级筛选，选填
  - `keyword`: 关键字搜索，选填，搜索项目名称和描述
  - `leaderId`: 负责人ID筛选，选填
  - `memberId`: 成员ID筛选，选填
  - `sortField`: 排序字段，选填，默认createdAt
  - `sortOrder`: 排序方向，选填，可选值：asc, desc，默认desc

**响应参数**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": "P2025001",
        "name": "工作留痕系统开发",
        "description": "开发一套完整的企业内部工作留痕管理系统",
        "status": "in_progress",
        "priority": "high",
        "progress": 45,
        "leaderId": "12345678",
        "leaderName": "张三",
        "memberCount": 5,
        "startDate": "2025-01-15",
        "endDate": "2025-06-30",
        "createdAt": "2025-01-10T14:30:00Z"
      },
      {
        "id": "P2025002",
        "name": "移动APP开发",
        "description": "为工作留痕系统开发配套的移动应用",
        "status": "planning",
        "priority": "medium",
        "progress": 15,
        "leaderId": "12345679",
        "leaderName": "李四",
        "memberCount": 3,
        "startDate": "2025-05-01",
        "endDate": "2025-08-31",
        "createdAt": "2025-03-20T09:15:00Z"
      }
      // 更多项目...
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

#### 项目成员管理 - 添加成员

- **接口URL**: `/api/v1/projects/{projectId}/members`
- **请求方法**: `POST`
- **接口描述**: 向指定项目添加成员

**请求参数**:

- 路径参数:
  - `projectId`: 项目ID，必填

- 请求体:
```json
{
  "members": [                 // 要添加的成员列表
    {
      "userId": "string",      // 用户ID，必填
      "role": "string"         // 角色，必填，可选值：developer、designer、tester
    }
  ]
}
```

**响应参数**:

```json
{
  "code": 200,
  "message": "成员添加成功",
  "data": {
    "addedCount": 2,
    "members": [
      {
        "userId": "12345681",
        "userName": "赵六",
        "role": "developer",
        "joinTime": "2025-04-10T12:45:00Z"
      },
      {
        "userId": "12345682",
        "userName": "钱七",
        "role": "designer",
        "joinTime": "2025-04-10T12:45:00Z"
      }
    ]
  }
}
```

#### 项目成员管理 - 移除成员

- **接口URL**: `/api/v1/projects/{projectId}/members/{userId}`
- **请求方法**: `DELETE`
- **接口描述**: 从指定项目中移除成员

**请求参数**:

- 路径参数:
  - `projectId`: 项目ID，必填
  - `userId`: 用户ID，必填

**响应参数**:

```json
{
  "code": 200,
  "message": "成员移除成功",
  "data": null
}
```

#### 项目成员管理 - 更新成员角色

- **接口URL**: `/api/v1/projects/{projectId}/members/{userId}`
- **请求方法**: `PUT`
- **接口描述**: 更新项目成员的角色

**请求参数**:

- 路径参数:
  - `projectId`: 项目ID，必填
  - `userId`: 用户ID，必填

- 请求体:
```json
{
  "role": "string"      // 新角色，必填，可选值：leader、developer、designer、tester
}
```

**响应参数**:

```json
{
  "code": 200,
  "message": "成员角色更新成功",
  "data": {
    "userId": "12345680",
    "userName": "王五",
    "role": "developer",
    "updateTime": "2025-04-10T13:10:00Z"
  }
}
```

#### 获取项目工作记录

- **接口URL**: `/api/v1/projects/{projectId}/work-records`
- **请求方法**: `GET`
- **接口描述**: 获取指定项目的所有工作记录

**请求参数**:

- 路径参数:
  - `projectId`: 项目ID，必填

- 查询参数:
  - `page`: 页码，选填，默认1
  - `size`: 每页条数，选填，默认10
  - `userId`: 用户ID筛选，选填
  - `workType`: 工作类型筛选，选填
  - `startDate`: 开始日期筛选，选填
  - `endDate`: 结束日期筛选，选填
  - `sortField`: 排序字段，选填，默认createdAt
  - `sortOrder`: 排序方向，选填，可选值：asc, desc，默认desc

**响应参数**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": "WR20250410001",
        "userId": "12345678",
        "userName": "张三",
        "title": "完成登录模块开发",
        "workDate": "2025-04-10",
        "workHours": 8,
        "workType": "编码",
        "status": "completed",
        "createdAt": "2025-04-10T11:30:00Z"
      }
      // 更多工作记录...
    ],
    "statistics": {
      "totalRecords": 128,
      "totalWorkHours": 564,
      "typeDistribution": {
        "需求分析": 80,
        "设计": 120,
        "编码": 240,
        "测试": 100,
        "部署": 24
      },
      "userContributions": [
        {
          "userId": "12345678",
          "userName": "张三",
          "recordCount": 45,
          "workHours": 198
        },
        {
          "userId": "12345679",
          "userName": "李四",
          "recordCount": 42,
          "workHours": 186
        }
        // 更多用户贡献...
      ]
    },
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 128,
      "totalPages": 13
    }
  }
}
```
