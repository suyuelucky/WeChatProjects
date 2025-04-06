#!/bin/bash

# 微信小程序基础架构极端测试环境设置脚本

echo "======================================================="
echo "        微信小程序基础架构极端测试 - 环境设置            "
echo "======================================================="

# 确认Node.js环境
echo "检查Node.js环境..."
if command -v node > /dev/null 2>&1; then
  NODE_VERSION=$(node -v)
  echo "✓ Node.js已安装: $NODE_VERSION"
else
  echo "× 未检测到Node.js，请先安装Node.js"
  exit 1
fi

# 创建测试目录结构
echo "设置测试目录结构..."
mkdir -p test_cases

# 安装测试所需依赖
echo "安装测试依赖..."
npm install --no-save jest

# 打印测试运行说明
echo ""
echo "环境设置完成！您可以通过以下命令运行测试:"
echo ""
echo "运行全部测试:  node run_all_tests.js"
echo "单独测试模块:  node test_cases/循环依赖测试.js"
echo ""
echo "=======================================================" 