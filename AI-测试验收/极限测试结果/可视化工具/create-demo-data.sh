#!/bin/bash

# 指定输出文件路径
OUTPUT_FILE="demo-data.json"

# 创建JSON内容
cat > "$OUTPUT_FILE" << 'EOL'
{
  "overview": {
    "totalTests": 12,
    "successTests": 10,
    "failedTests": 2,
    "successRate": 83
  },
  "batchOperations": {
    "cloudFunction": {
      "total": 20,
      "success": 19,
      "failed": 1,
      "avgTime": 145,
      "successRate": 95
    },
    "dbQuery": {
      "total": 20,
      "success": 20,
      "failed": 0,
      "avgTime": 72,
      "successRate": 100
    },
    "fileUpload": {
      "total": 20,
      "success": 17,
      "failed": 3,
      "avgTime": 310,
      "successRate": 85
    }
  },
  "dataIntegrity": {
    "longString": {
      "result": "通过",
      "actualSupport": "5MB",
      "limit": "无明显截断"
    },
    "nestedObject": {
      "result": "部分通过",
      "actualSupport": "32层",
      "limit": "超过32层会自动截断"
    },
    "largeObject": {
      "result": "通过",
      "actualSupport": "500个字段",
      "limit": "无明显限制"
    },
    "specialChars": {
      "result": "通过",
      "actualSupport": "完全支持",
      "limit": "无限制"
    }
  },
  "errorHandling": {
    "invalidInput": {
      "testCount": 10,
      "successCount": 10,
      "key": "正确拒绝率: 100%",
      "result": "通过"
    },
    "edgeCases": {
      "testCount": 10,
      "successCount": 9,
      "key": "边界处理正确率: 90%",
      "result": "通过"
    },
    "concurrentErrors": {
      "testCount": 10,
      "successCount": 8,
      "key": "冲突解决率: 80%",
      "result": "通过"
    },
    "networkRecovery": {
      "testCount": 10,
      "successCount": 9,
      "key": "恢复成功率: 90%",
      "result": "通过"
    },
    "permissionErrors": {
      "testCount": 5,
      "successCount": 5,
      "key": "全部正确拒绝并提示",
      "result": "通过"
    }
  },
  "performance": {
    "avgMemoryUsage": "40MB",
    "peakMemoryUsage": "65MB",
    "avgResponseTime": "125ms",
    "memoryTrend": [32, 38, 65, 50, 40]
  }
}
EOL

echo "演示数据文件已创建: $OUTPUT_FILE" 