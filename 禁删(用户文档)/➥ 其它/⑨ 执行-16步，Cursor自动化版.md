| 步骤序号和任务目录        | 具体碎步                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| Step 0.1.1 环境搭建       | [✓] Cursor检查本地是否安装微信开发者工具（版本≥1.06.2401020）                                |
|                           | [✓] 若无则Cursor下载安装至默认路径                                                            |
|                           | [✓] Cursor执行 `devbox init` 和 `npm init` 安装devbox（≥0.8.0）和Node.js（v18.x）        |
|                           | [✓] Cursor输出"环境就绪，2025-03-25 20:15:40"至logs/step_0.1.1_logA.txt                     |
|                           | [✓] Cursor生成logA：任务目标"搭建小程序和网页版环境"                                        |
|                           | [✓] logA技术选型"微信工具v1.06.x+React v18.x（Cursor选次版本，记package.json）"             |
|                           | [✓] logA输入"命令"，输出"项目目录miniprogram/和web/"，风险"版本冲突"                    |
|                           | [✓] logA缓解"锁定v18.x"，代码量"60行"，保存至logs/step_0.1.1_logA.txt                     |
|                           | [✓] Cursor开发src/step_0.1.1.js，配置miniprogram/app.json（4按钮导航）                        |
|                           | [✓] 配置web/package.json（React依赖），代码<200行                                             |
|                           | [⚠️] Cursor检查语法（ESLint错误=0），嵌套≤5层                                                 |
|                           | [✓] 交付物路径miniprogram/app.json和web/src/index.js                                          |
|                           | [⚠️] Cursor测试3场景：小程序工具启动（成功率≥99%）                                            |
|                           | [⚠️] React项目运行（npm start无报错），弱网200ms编译（成功）                                   |
|                           | [⚠️] Cursor检查语法（ESLint通过）、水合（无警告）                                              |
|                           | [✓] 日志"输入devbox init，输出项目目录，耗时<5分钟"≥90字至logs/step_0.1.1_logB.txt         |
|                           | [✓] Cursor总结logB：完成"环境搭建，小程序和网页版就绪"                                      |
|                           | [✓] logB问题"无"，方案"无"，建议"配置腾讯云"                                            |
|                           | [✓] 交付物"miniprogram/和web/目录"，≥90字至logs/step_0.1.1_logB.txt                        |
|                           |                                                                                           |
| Step 0.1.2 配置腾讯云后端 | [✓] Cursor读取logs/step_0.1.1_logB.txt全文（≥90字）                                          |
|                           | [✓] 若无输出"Step 0.1.1未完成，缺少环境"，确认"环境搭建"完成                              |
|                           | [✓] Cursor输出"已理解任务：配置腾讯云CVM、COS、CDN替换云函数"                               |
|                           | [✓] 输出至logs/step_0.1.2_logA.txt，含"响应<1秒，数据不丢"                                  |
|                           | [✓] Cursor生成logA：任务目标"配置腾讯云后端支持日记存储"                                    |
|                           | [✓] logA技术选型"腾讯云CVM v3.x+COS v5.x+CDN（Cursor选次版本，记package.json）"             |
|                           | [✓] logA输入"部署命令"，输出"服务URL如https://api.example.com"                            |
|                           | [✓] logA风险"网络延迟>1秒或上传失败"，缓解"CDN加速+重试队列"                              |
|                           | [✓] logA代码量"150行"，保存至logs/step_0.1.2_logA.txt                                       |
|                           | [⚠️] Cursor开发src/step_0.1.2.js，初始化CVM（Node.js服务端口3000）                             |
|                           | [⚠️] 配置COS（存储桶diary-bucket），CDN（域名cdn.example.com）                                 |
|                           | [⚠️] 设置HTTPS接口/upload，代码<200行                                                          |
|                           | [⚠️] Cursor检查语法（ESLint错误=0）、嵌套≤5层、变量定义（无undefined）                        |
|                           | [ ] 人工提供腾讯云密钥，Cursor部署至CVM                                                       |
|                           | [⚠️] 交付物路径src/server/index.js和cos-config.json                                            |
|                           | [ ] Cursor测试3场景：CVM响应GET /health（<1秒，成功率≥99%）                                  |
|                           | [ ] COS上传1MB文件（成功），CDN加载文件（<500ms，弱网重试成功）                               |
|                           | [⚠️] Cursor检查语法（ESLint通过）、循环复杂度（<10）                                           |
|                           | [ ] 日志"输入curl api.example.com，输出200 OK"≥90字至logs/step_0.1.2_logB.txt              |
|                           | [ ] Cursor总结logB：完成"腾讯云后端配置，接口可用"                                          |
|                           | [ ] logB问题"无"，方案"无"，建议"渲染导航和按钮"                                        |
|                           | [ ] 交付物"src/server/index.js和cos-config.json"，≥90字至logs/step_0.1.2_logB.txt          |
|                           |                                                                                           |
| Step 1.1.1 渲染导航和按钮 | [ ] Cursor读取logs/step_0.1.2_logB.txt全文（≥90字）                                          |
|                           | [ ] 若无输出"Step 0.1.2未完成，缺少后端"，确认"腾讯云后端"完成                            |
|                           | [ ] Cursor读取xxx_project_plan.md全文（≥500字）                                              |
|                           | [ ] 若<500字输出"需求不足，请补充"，确认"4按钮导航+拍照"需求                              |
|                           | [ ] Cursor输出"已理解任务：渲染4按钮导航（日记/首页/任务/我的）和拍照按钮"                  |
|                           | [ ] 输出含"小程序+网页版，响应<16ms，帧率≥90"至logs/step_1.1.1_logA.txt                    |
|                           | [ ] Cursor生成logA：任务目标"渲染4导航+拍照按钮，跨端一致"                                  |
|                           | [ ] logA技术选型"wx.createAnimation v2.x+React v18.x（Cursor选次版本，记package.json）"     |
|                           | [ ] logA输入"点击事件"，输出"页面切换+拍照跳转"                                           |
|                           | [ ] logA风险"切换卡顿>16ms或状态丢失"，缓解"wx.createAnimation+LocalStorage缓存"          |
|                           | [ ] logA代码量"180行"，保存至logs/step_1.1.1_logA.txt                                       |
|                           | [ ] Cursor开发src/step_1.1.1.js（小程序），渲染4按钮+拍照图标                                 |
|                           | [ ] Cursor开发src/web/step_1.1.1.jsx（网页版），UI香奈儿风，帧率≥90                          |
|                           | [ ] 状态存LocalStorage键lastPage，代码<200行                                                  |
|                           | [ ] Cursor检查语法（ESLint错误=0）、水合（wxml和React一致性≥95%）                            |
|                           | [ ] Cursor检查嵌套≤5层                                                                       |
|                           | [ ] 交付物路径miniprogram/pages/index/index.wxml和web/src/components/NavBar.jsx               |
|                           | [ ] Cursor测试3场景：小程序导航切换（<16ms，帧率≥90，成功率≥99%）                           |
|                           | [ ] 网页版切换（<16ms，Safari正常），断网恢复（LocalStorage读lastPage正确）                   |
|                           | [ ] Cursor检查语法（ESLint通过）、水合（无差异）、内存泄漏（<1MB）                            |
|                           | [ ] 日志"输入点击日记，输出切换至日记页，帧率95"≥90字至logs/step_1.1.1_logB.txt            |
|                           | [ ] Cursor总结logB：完成"4按钮导航和拍照按钮渲染，小程序+网页版"                            |
|                           | [ ] logB问题"无"，方案"无"，建议"调用相机拍照"                                          |
|                           | [ ] 交付物"miniprogram/pages/index/和web/src/components/"，≥90字至logs/step_1.1.1_logB.txt |
|                           |                                                                                           |
| Step 1.1.2 调用相机拍照   | [ ] Cursor读取logs/step_1.1.1_logB.txt全文（≥90字）                                          |
|                           | [ ] 若无输出"Step 1.1.1未完成，缺少导航"，确认"导航和按钮"完成                            |
|                           | [ ] Cursor输出"已理解任务：调用相机支持单张/连续拍摄"                                       |
|                           | [ ] 输出含"切换动画≥90帧，数据不丢"至logs/step_1.1.2_logA.txt                              |
|                           | [ ] Cursor生成logA：任务目标"调用相机拍照"                                                  |
|                           | [ ] logA技术选型"wx.chooseImage v2.x+React v18.x（Cursor选次版本，记package.json）"         |
|                           | [ ] logA输入"点击拍照"，输出"照片路径"                                                    |
|                           | [ ] logA风险"动画卡顿>16ms或照片丢"，缓解"wx.createAnimation+LocalStorage"                |
|                           | [ ] logA代码量"160行"，保存至logs/step_1.1.2_logA.txt                                       |
|                           | [ ] Cursor开发src/step_1.1.2.js（小程序），调用wx.chooseImage实现拍照                         |
|                           | [ ] Cursor开发src/web/step_1.1.2.jsx（网页版用 `<input type="file">`）                      |
|                           | [ ] 连续拍摄用循环，帧率≥90，照片路径存LocalStorage键photos                                  |
|                           | [ ] 代码<200行                                                                                |
|                           | [ ] Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | [ ] 交付物路径miniprogram/pages/diary/camera.js和web/src/components/Camera.jsx                |
|                           | [ ] Cursor测试3场景：单张拍摄（<16ms，帧率≥90成功率≥99%）                                 |
|                           | [ ] 连续拍5张（<16ms/张），弱网（路径存LocalStorage正确）                                     |
|                           | [ ] Cursor检查语法（ESLint通过）、水合（无差异）、变量定义（无undefined）                     |
|                           | [ ] 日志"输入点击，输出照片路径，帧率92"≥90字至logs/step_1.1.2_logB.txt                    |
|                           | [ ] Cursor总结logB：完成"相机拍照，小程序+网页版"                                           |
|                           | [ ] logB问题"无"，方案"无"，建议"选相册照片"                                            |
|                           | [ ] 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_1.1.2_logB.txt |
|                           |                                                                                           |
| Step 1.1.3 从相册选择照片 | Cursor读取logs/step_1.1.2_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 1.1.2未完成，缺少拍照"，确认"相机拍照"完成                              |
|                           | Cursor输出"已理解任务：从相册选择照片，跳转<200ms"                                      |
|                           | 输出含"帧率≥90"至logs/step_1.1.3_logA.txt                                              |
|                           | Cursor生成logA：任务目标"相册选图"                                                      |
|                           | logA技术选型"wx.chooseImage v2.x+React v18.x（Cursor选次版本，记package.json）"         |
|                           | logA输入"点击相册"，输出"照片路径数组"                                                |
|                           | logA风险"加载慢>200ms或数据丢"，缓解"预加载+LocalStorage"                             |
|                           | logA代码量"140行"，保存至logs/step_1.1.3_logA.txt                                       |
|                           | Cursor开发src/step_1.1.3.js（小程序），调用wx.chooseImage选图                             |
|                           | Cursor开发src/web/step_1.1.3.jsx（网页版），跳转动画<200ms                                |
|                           | 帧率≥90，路径存LocalStorage键photos                                                      |
|                           | 代码<200行                                                                                |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/album.js和web/src/components/Album.jsx                  |
|                           | Cursor测试3场景：选1张图（<200ms，帧率≥90，成功率≥99%）                                 |
|                           | 选5张图（<200ms），弱网（路径保存正确）                                                   |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、内存泄漏（<1MB）                            |
|                           | 日志"输入点击，输出5张路径，帧率93"≥90字至logs/step_1.1.3_logB.txt                     |
|                           | Cursor总结logB：完成"相册选图，小程序+网页版"                                           |
|                           | logB问题"无"，方案"无"，建议"展示照片"                                              |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_1.1.3_logB.txt |
|                           |                                                                                           |
| Step 1.2.1 设计照片布局   | Cursor读取logs/step_1.1.3_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 1.1.3未完成，缺少选图"，确认"相册选图"完成                              |
|                           | Cursor输出"已理解任务：设计每行3张照片布局"                                             |
|                           | 输出含"滚动帧率≥90"至logs/step_1.2.1_logA.txt                                          |
|                           | Cursor生成logA：任务目标"每行3张布局"                                                   |
|                           | logA技术选型"wx.createSelectorQuery v2.x+React v18.x（Cursor选次版本）"                 |
|                           | logA输入"照片路径数组"，输出"布局渲染"                                                |
|                           | logA风险"滚动卡顿>16ms"，缓解"懒加载"                                                 |
|                           | logA代码量"110行"，保存至logs/step_1.2.1_logA.txt                                       |
|                           | Cursor开发src/step_1.2.1.js（小程序），从LocalStorage读photos                             |
|                           | Cursor开发src/web/step_1.2.1.jsx（网页版），每行3张布局                                   |
|                           | 帧率≥90，代码<200行                                                                      |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/layout.wxml和web/src/components/PhotoLayout.jsx         |
|                           | Cursor测试3场景：渲染3张（<16ms，帧率≥90，成功率≥99%）                                  |
|                           | 滚动10张（帧率≥90），弱网（布局完整）                                                    |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、循环复杂度（<10）                           |
|                           | 日志"输入3张路径，输出每行3张，帧率94"≥90字至logs/step_1.2.1_logB.txt                  |
|                           | Cursor总结logB：完成"照片布局设计，小程序+网页版"                                       |
|                           | logB问题"无"，方案"无"，建议"动态加载照片"                                          |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_1.2.1_logB.txt |
|                           |                                                                                           |
| Step 1.2.2 动态加载照片   | Cursor读取logs/step_1.2.1_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 1.2.1未完成，缺少布局"，确认"照片布局"完成                              |
|                           | Cursor输出"已理解任务：动态加载照片至布局"                                              |
|                           | 输出含"加载动画<16ms/帧，帧率≥90"至logs/step_1.2.2_logA.txt                            |
|                           | Cursor生成logA：任务目标"动态加载照片"                                                  |
|                           | logA技术选型"wx.createAnimation v2.x+React v18.x（Cursor选次版本）"                     |
|                           | logA输入"照片路径数组"，输出"渲染照片"                                                |
|                           | logA风险"加载>16ms"，缓解"预加载+分批setData"                                         |
|                           | logA代码量"150行"，保存至logs/step_1.2.2_logA.txt                                       |
|                           | Cursor开发src/step_1.2.2.js（小程序），动态加载photos至布局                               |
|                           | Cursor开发src/web/step_1.2.2.jsx（网页版），动画<16ms/帧                                  |
|                           | 帧率≥90，代码<200行                                                                      |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/display.js和web/src/components/PhotoDisplay.jsx         |
|                           | Cursor测试3场景：加载5张（<16ms/张，帧率≥90，成功率≥99%）                               |
|                           | 加载10张（帧率≥90），弱网（缓存显示）                                                    |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、内存泄漏（<1MB）                            |
|                           | 日志"输入5张路径，输出渲染完成，帧率95"≥90字至logs/step_1.2.2_logB.txt                 |
|                           | Cursor总结logB：完成"动态加载照片，小程序+网页版"                                       |
|                           | logB问题"无"，方案"无"，建议"渲染文本编辑区"                                        |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_1.2.2_logB.txt |
|                           |                                                                                           |
| Step 1.3.1 渲染文本编辑区 | Cursor读取logs/step_1.2.2_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 1.2.2未完成，缺少照片加载"，确认"动态加载"完成                          |
|                           | Cursor输出"已理解任务：渲染文本编辑区和工具条"                                          |
|                           | 输出含"切换<100ms，帧率≥90"至logs/step_1.3.1_logA.txt                                  |
|                           | Cursor生成logA：任务目标"渲染文本编辑区+工具条"                                         |
|                           | logA技术选型"wx.createSelectorQuery v2.x+React v18.x（Cursor选次版本）"                 |
|                           | logA输入"点击编辑"，输出"编辑界面"                                                    |
|                           | logA风险"切换>100ms"，缓解"精准setData"                                               |
|                           | logA代码量"160行"，保存至logs/step_1.3.1_logA.txt                                       |
|                           | Cursor开发src/step_1.3.1.js（小程序），渲染文本框+工具条（加粗/语音）                     |
|                           | Cursor开发src/web/step_1.3.1.jsx（网页版），切换<100ms，帧率≥90                          |
|                           | 代码<200行                                                                                |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/editor.wxml和web/src/components/Editor.jsx              |
|                           | Cursor测试3场景：切换编辑区（<100ms，帧率≥90，成功率≥99%）                              |
|                           | 工具条点击（<16ms），弱网（布局完整）                                                     |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、变量定义（无undefined）                     |
|                           | 日志"输入点击，输出编辑区，帧率93"≥90字至logs/step_1.3.1_logB.txt                      |
|                           | Cursor总结logB：完成"文本编辑区渲染，小程序+网页版"                                     |
|                           | logB问题"无"，方案"无"，建议"语音输入"                                              |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_1.3.1_logB.txt |
|                           |                                                                                           |
| Step 1.3.2 语音输入转文字 | Cursor读取logs/step_1.3.1_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 1.3.1未完成，缺少编辑区"，确认"文本编辑区"完成                          |
|                           | Cursor输出"已理解任务：语音输入实时转文字"                                              |
|                           | 输出含"声波动画≥90帧"至logs/step_1.3.2_logA.txt                                        |
|                           | Cursor生成logA：任务目标"语音转文字"                                                    |
|                           | logA技术选型"wx.getRecorderManager v2.x+Web Speech API（Cursor选次版本）"               |
|                           | logA输入"麦克风点击"，输出"文本"                                                      |
|                           | logA风险"转录延迟>16ms"，缓解"分段上传"                                               |
|                           | logA代码量"190行"，保存至logs/step_1.3.2_logA.txt                                       |
|                           | Cursor开发src/step_1.3.2.js（小程序），实现语音转文字                                     |
|                           | Cursor开发src/web/step_1.3.2.jsx（网页版），声波动画<16ms/帧                              |
|                           | 帧率≥90，代码<200行                                                                      |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/voice.js和web/src/components/VoiceInput.jsx             |
|                           | Cursor测试3场景：5秒语音转文字（<16ms，帧率≥90，成功率≥99%）                            |
|                           | 噪音环境（识别率≥90%），弱网（本地缓存）                                                 |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、循环复杂度（<10）                           |
|                           | 日志"输入5秒语音，输出文本，帧率94"≥90字至logs/step_1.3.2_logB.txt                     |
|                           | Cursor总结logB：完成"语音输入转文字，小程序+网页版"                                     |
|                           | logB问题"无"，方案"无"，建议"手动输入"                                              |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_1.3.2_logB.txt |
|                           |                                                                                           |
| Step 1.3.3 手动输入文本   | Cursor读取logs/step_1.3.2_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 1.3.2未完成，缺少语音"，确认"语音输入"完成                              |
|                           | Cursor输出"已理解任务：支持手动键盘输入"                                                |
|                           | 输出含"响应<16ms，帧率≥90"至logs/step_1.3.3_logA.txt                                   |
|                           | Cursor生成logA：任务目标"手动输入文本"                                                  |
|                           | logA技术选型"wx.createSelectorQuery v2.x+React v18.x（Cursor选次版本）"                 |
|                           | logA输入"键盘输入"，输出"文本内容"                                                    |
|                           | logA风险"输入卡顿>16ms"，缓解"节流输入"                                               |
|                           | logA代码量"130行"，保存至logs/step_1.3.3_logA.txt                                       |
|                           | Cursor开发src/step_1.3.3.js（小程序），支持键盘输入                                       |
|                           | Cursor开发src/web/step_1.3.3.jsx（网页版），响应<16ms，帧率≥90                           |
|                           | 代码<200行                                                                                |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/manual.js和web/src/components/ManualInput.jsx           |
|                           | Cursor测试3场景：输入10字（<16ms，帧率≥90，成功率≥99%）                                 |
|                           | 输入100字（<16ms/字），弱网（本地缓存）                                                   |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、变量定义（无undefined）                     |
|                           | 日志"输入10字，输出文本，帧率95"≥90字至logs/step_1.3.3_logB.txt                        |
|                           | Cursor总结logB：完成"手动输入文本，小程序+网页版"                                       |
|                           | logB问题"无"，方案"无"，建议"照片拖拽排序"                                          |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_1.3.3_logB.txt |
|                           |                                                                                           |
| Step 2.1.1 照片拖拽排序   | Cursor读取logs/step_1.3.3_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 1.3.3未完成，缺少手动输入"，确认"手动输入"完成                          |
|                           | Cursor输出"已理解任务：实现照片拖拽排序"                                                |
|                           | 输出含"拖动帧率≥90"至logs/step_2.1.1_logA.txt                                          |
|                           | Cursor生成logA：任务目标"照片拖拽排序"                                                  |
|                           | logA技术选型"wx.createTouchEvent v2.x+React v18.x（Cursor选次版本）"                    |
|                           | logA输入"拖拽事件"，输出"新照片顺序"                                                  |
|                           | logA风险"拖动卡顿>16ms"，缓解"节流更新"                                               |
|                           | logA代码量"170行"，保存至logs/step_2.1.1_logA.txt                                       |
|                           | Cursor开发src/step_2.1.1.js（小程序），实现拖拽排序                                       |
|                           | Cursor开发src/web/step_2.1.1.jsx（网页版），帧率≥90                                      |
|                           | 顺序存LocalStorage键photoOrder，代码<200行                                                |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/drag.js和web/src/components/PhotoDrag.jsx               |
|                           | Cursor测试3场景：拖拽3张（<16ms，帧率≥90，成功率≥99%）                                  |
|                           | 拖拽10张（帧率≥90），弱网（顺序保存）                                                    |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、内存泄漏（<1MB）                            |
|                           | 日志"输入拖拽，输出新顺序，帧率93"≥90字至logs/step_2.1.1_logB.txt                      |
|                           | Cursor总结logB：完成"照片拖拽排序，小程序+网页版"                                       |
|                           | logB问题"无"，方案"无"，建议"删除和封面设置"                                        |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_2.1.1_logB.txt |
|                           |                                                                                           |
| Step 2.1.2 删除和封面设置 | Cursor读取logs/step_2.1.1_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 2.1.1未完成，缺少拖拽"，确认"照片拖拽"完成                              |
|                           | Cursor输出"已理解任务：添加照片删除和封面设置"                                          |
|                           | 输出含"点击动效<200ms，帧率≥90"至logs/step_2.1.2_logA.txt                              |
|                           | Cursor生成logA：任务目标"删除和封面设置"                                                |
|                           | logA技术选型"wx.createAnimation v2.x+React v18.x（Cursor选次版本）"                     |
|                           | logA输入"点击叉叉/封面"，输出"删除或封面标记"                                         |
|                           | logA风险"动效>200ms"，缓解"动画优化"                                                  |
|                           | logA代码量"150行"，保存至logs/step_2.1.2_logA.txt                                       |
|                           | Cursor开发src/step_2.1.2.js（小程序），添加删除（叉叉）                                   |
|                           | Cursor开发src/web/step_2.1.2.jsx（网页版），封面设置（最多3张）                           |
|                           | 动效<200ms，帧率≥90，代码<200行                                                          |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/edit.js和web/src/components/PhotoEdit.jsx               |
|                           | Cursor测试3场景：删除1张（<200ms，帧率≥90，成功率≥99%）                                 |
|                           | 设3张封面（正确标记），弱网（缓存更新）                                                   |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、变量定义（无undefined）                     |
|                           | 日志"输入点击叉叉，输出删除，帧率94"≥90字至logs/step_2.1.2_logB.txt                    |
|                           | Cursor总结logB：完成"删除和封面设置，小程序+网页版"                                     |
|                           | logB问题"无"，方案"无"，建议"长按放大动效"                                          |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_2.1.2_logB.txt |
|                           |                                                                                           |
| Step 2.1.3 长按放大动效   | Cursor读取logs/step_2.1.2_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 2.1.2未完成，缺少删除"，确认"删除和封面"完成                            |
|                           | Cursor输出"已理解任务：长按照片放大动效"                                                |
|                           | 输出含"缩放帧率≥90"至logs/step_2.1.3_logA.txt                                          |
|                           | Cursor生成logA：任务目标"长按放大动效"                                                  |
|                           | logA技术选型"wx.createAnimation v2.x+React v18.x（Cursor选次版本）"                     |
|                           | logA输入"长按事件"，输出"放大照片"                                                    |
|                           | logA风险"缩放>16ms"，缓解"动画优化"                                                   |
|                           | logA代码量"140行"，保存至logs/step_2.1.3_logA.txt                                       |
|                           | Cursor开发src/step_2.1.3.js（小程序），实现长按放大                                       |
|                           | Cursor开发src/web/step_2.1.3.jsx（网页版），缩放帧率≥90                                  |
|                           | 代码<200行                                                                                |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/zoom.js和web/src/components/PhotoZoom.jsx               |
|                           | Cursor测试3场景：长按放大（<16ms，帧率≥90，成功率≥99%）                                 |
|                           | 缩小恢复（<16ms），弱网（动效完整）                                                       |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、内存泄漏（<1MB）                            |
|                           | 日志"输入长按，输出放大，帧率95"≥90字至logs/step_2.1.3_logB.txt                        |
|                           | Cursor总结logB：完成"长按放大动效，小程序+网页版"                                       |
|                           | logB问题"无"，方案"无"，建议"AI修正错别字"                                          |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_2.1.3_logB.txt |
|                           |                                                                                           |
| Step 2.2.1 AI修正错别字   | Cursor读取logs/step_2.1.3_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 2.1.3未完成，缺少放大"，确认"长按动效"完成                              |
|                           | Cursor输出"已理解任务：AI修正语音输入错别字"                                            |
|                           | 输出含"处理<1秒，帧率≥90"至logs/step_2.2.1_logA.txt                                    |
|                           | Cursor生成logA：任务目标"AI修正错别字"                                                  |
|                           | logA技术选型"腾讯云AI API v3.x+React v18.x（Cursor选次版本）"                           |
|                           | logA输入"语音文本"，输出"修正文本"                                                    |
|                           | logA风险"处理>1秒"，缓解"本地预处理"                                                  |
|                           | logA代码量"160行"，保存至logs/step_2.2.1_logA.txt                                       |
|                           | Cursor开发src/step_2.2.1.js（小程序），调用腾讯云AI修正错别字                             |
|                           | Cursor开发src/web/step_2.2.1.jsx（网页版），处理<1秒，帧率≥90                            |
|                           | 代码<200行                                                                                |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/ai-fix.js和web/src/components/AIFix.jsx                 |
|                           | Cursor测试3场景：修正10字（<1秒，帧率≥90，成功率≥99%）                                  |
|                           | 修正50字（<1秒），弱网（本地缓存）                                                        |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、循环复杂度（<10）                           |
|                           | 日志"输入语音文本，输出修正，帧率93"≥90字至logs/step_2.2.1_logB.txt                    |
|                           | Cursor总结logB：完成"AI修正错别字，小程序+网页版"                                       |
|                           | logB问题"无"，方案"无"，建议"AI全文润色"                                            |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_2.2.1_logB.txt |
|                           |                                                                                           |
| Step 2.2.2 AI全文润色     | Cursor读取logs/step_2.2.1_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 2.2.1未完成，缺少修正"，确认"AI修正"完成                                |
|                           | Cursor输出"已理解任务：AI全文润色并调整排版"                                            |
|                           | 输出含"渲染<500ms，帧率≥90"至logs/step_2.2.2_logA.txt                                  |
|                           | Cursor生成logA：任务目标"AI润色全文"                                                    |
|                           | logA技术选型"腾讯云AI API v3.x+React v18.x（Cursor选次版本）"                           |
|                           | logA输入"原始文本"，输出"润色文本"                                                    |
|                           | logA风险"渲染>500ms"，缓解"分段渲染"                                                  |
|                           | logA代码量"180行"，保存至logs/step_2.2.2_logA.txt                                       |
|                           | Cursor开发src/step_2.2.2.js（小程序），调用AI润色                                         |
|                           | Cursor开发src/web/step_2.2.2.jsx（网页版），渲染<500ms，帧率≥90                          |
|                           | 代码<200行                                                                                |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/polish.js和web/src/components/AIPolish.jsx              |
|                           | Cursor测试3场景：润色50字（<500ms，帧率≥90，成功率≥99%）                                |
|                           | 润色200字（<500ms），弱网（本地缓存）                                                     |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、内存泄漏（<1MB）                            |
|                           | 日志"输入50字，输出润色，帧率94"≥90字至logs/step_2.2.2_logB.txt                        |
|                           | Cursor总结logB：完成"AI全文润色，小程序+网页版"                                         |
|                           | logB问题"无"，方案"无"，建议"本地缓存"                                              |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_2.2.2_logB.txt |
|                           |                                                                                           |
| Step 2.3.1 本地缓存数据   | Cursor读取logs/step_2.2.2_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 2.2.2未完成，缺少润色"，确认"AI润色"完成                                |
|                           | Cursor输出"已理解任务：本地缓存照片和文本"                                              |
|                           | 输出含"写入<200ms，数据不丢"至logs/step_2.3.1_logA.txt                                  |
|                           | Cursor生成logA：任务目标"本地缓存数据"                                                  |
|                           | logA技术选型"wx.setStorageSync v2.x+React v18.x（Cursor选次版本）"                      |
|                           | logA输入"照片+文本"，输出"缓存成功"                                                   |
|                           | logA风险"写入>200ms"，缓解"分片存储"                                                  |
|                           | logA代码量"140行"，保存至logs/step_2.3.1_logA.txt                                       |
|                           | Cursor开发src/step_2.3.1.js（小程序），缓存photos和text至LocalStorage                     |
|                           | Cursor开发src/web/step_2.3.1.jsx（网页版），写入<200ms                                    |
|                           | 键diaryData，代码<200行                                                                   |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/cache.js和web/src/components/Cache.jsx                  |
|                           | Cursor测试3场景：缓存5张+50字（<200ms，成功率≥99%）                                      |
|                           | 缓存10张+200字（<200ms），断网（数据完整）                                                |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、变量定义（无undefined）                     |
|                           | 日志"输入5张+50字，输出缓存，耗时180ms"≥90字至logs/step_2.3.1_logB.txt                 |
|                           | Cursor总结logB：完成"本地缓存数据，小程序+网页版"                                       |
|                           | logB问题"无"，方案"无"，建议"异步上传"                                              |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_2.3.1_logB.txt |
|                           |                                                                                           |
| Step 2.3.2 异步上传服务器 | Cursor读取logs/step_2.3.1_logB.txt全文（≥90字）                                          |
|                           | 若无输出"Step 2.3.1未完成，缺少缓存"，确认"本地缓存"完成                              |
|                           | Cursor输出"已理解任务：异步上传至腾讯云COS"                                             |
|                           | 输出含"弱网不卡，帧率≥90"至logs/step_2.3.2_logA.txt                                    |
|                           | Cursor生成logA：任务目标"异步上传数据"                                                  |
|                           | logA技术选型"wx.uploadFile v2.x+fetch API（Cursor选次版本）"                            |
|                           | logA输入"缓存数据"，输出"COS URL"                                                     |
|                           | logA风险"弱网失败"，缓解"队列重试"                                                    |
|                           | logA代码量"160行"，保存至logs/step_2.3.2_logA.txt                                       |
|                           | Cursor开发src/step_2.3.2.js（小程序），从LocalStorage读diaryData                          |
|                           | Cursor开发src/web/step_2.3.2.jsx（网页版），异步上传至COS                                 |
|                           | 帧率≥90，代码<200行                                                                      |
|                           | Cursor检查语法（ESLint错误=0）、水合（一致性≥95%）、嵌套≤5层                            |
|                           | 交付物路径miniprogram/pages/diary/upload.js和web/src/components/Upload.jsx                |
|                           | Cursor测试3场景：上传5张+50字（<1秒，帧推迟5秒后自动播放帧率≥90，成功率≥99%）           |
|                           | 上传10张+200字（<2秒），弱网200ms（重试成功）                                             |
|                           | Cursor检查语法（ESLint通过）、水合（无差异）、循环复杂度（<10）                           |
|                           | 日志"输入5张+50字，输出COS URL，帧率95"≥90字至logs/step_2.3.2_logB.txt                 |
|                           | Cursor总结logB：完成"异步上传服务器，小程序+网页版"                                     |
|                           | logB问题"无"，方案"无"，建议"测试上线"                                              |
|                           | 交付物"miniprogram/pages/diary/和web/src/components/"，≥90字至logs/step_2.3.2_logB.txt |
