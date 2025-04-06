/**
 * 微信小程序云开发极限测试 - 图表可视化工具
 * 基于Echarts绘制性能数据图表
 */

// 初始化图表
function initCharts() {
    // 检查Echarts库是否加载
    if (typeof echarts === 'undefined') {
        console.error('Echarts库未加载');
        return;
    }
    
    // 初始化内存使用图表
    initMemoryUsageChart();
    
    // 初始化响应时间对比图表
    initResponseTimeChart();
    
    // 初始化成功率对比图表
    initSuccessRateChart();
}

// 初始化内存使用趋势图
function initMemoryUsageChart() {
    const chartDom = document.getElementById('memory-usage-chart');
    if (!chartDom) return;
    
    const chart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '内存使用趋势',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            formatter: '{b}<br />{a}: {c} MB'
        },
        xAxis: {
            type: 'category',
            data: ['开始', '批量操作', '数据完整性', '错误处理', '结束'],
            axisLabel: {
                interval: 0,
                rotate: 30
            }
        },
        yAxis: {
            type: 'value',
            name: '内存 (MB)'
        },
        series: [
            {
                name: '内存使用',
                type: 'line',
                data: [35, 42, 68, 53, 45],
                smooth: true,
                markPoint: {
                    data: [
                        { type: 'max', name: '最大值' },
                        { type: 'min', name: '最小值' }
                    ]
                }
            }
        ],
        color: ['#07c160']
    };
    
    chart.setOption(option);
}

// 初始化响应时间对比图表
function initResponseTimeChart() {
    const chartDom = document.getElementById('response-time-chart');
    if (!chartDom) return;
    
    const chart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '各操作平均响应时间',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        xAxis: {
            type: 'category',
            data: ['云函数调用', '数据库查询', '文件上传'],
            axisLabel: {
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            name: '响应时间 (ms)'
        },
        series: [
            {
                name: '响应时间',
                type: 'bar',
                data: [150, 85, 350],
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c} ms'
                }
            }
        ],
        color: ['#07c160']
    };
    
    chart.setOption(option);
}

// 初始化成功率对比图表
function initSuccessRateChart() {
    const chartDom = document.getElementById('success-rate-chart');
    if (!chartDom) return;
    
    const chart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '各测试模块成功率',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}%'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: ['批量操作', '数据完整性', '错误处理']
        },
        series: [
            {
                name: '成功率',
                type: 'pie',
                radius: '55%',
                center: ['50%', '60%'],
                data: [
                    { value: 92, name: '批量操作' },
                    { value: 88, name: '数据完整性' },
                    { value: 82, name: '错误处理' }
                ],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };
    
    chart.setOption(option);
}

// 当文档加载完成后初始化图表
document.addEventListener('DOMContentLoaded', function() {
    // 添加Echarts库
    if (typeof echarts === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.3.2/dist/echarts.min.js';
        script.onload = initCharts;
        document.head.appendChild(script);
    } else {
        initCharts();
    }
}); 