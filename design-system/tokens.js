/**
 * 香奈尔美学设计系统 - 设计Token
 * 
 * 该文件定义了整个应用程序的设计变量，确保小程序和Web端设计一致性
 * 变量命名遵循Visual Design Token命名规范
 */

// 颜色系统
const colors = {
  // 品牌色彩
  brand: {
    primary: '#000000', // 香奈尔标志性黑色
    secondary: '#FFFFFF', // 品牌白色
    accent: '#BEAF87', // 典雅金色
    highlight: '#E2C39D', // 高光金色
  },
  
  // 中性色彩
  neutral: {
    black: '#000000',
    gray900: '#212121',
    gray800: '#424242',
    gray700: '#616161',
    gray600: '#757575',
    gray500: '#9E9E9E',
    gray400: '#BDBDBD',
    gray300: '#E0E0E0',
    gray200: '#EEEEEE',
    gray100: '#F5F5F5',
    gray50: '#FAFAFA',
    white: '#FFFFFF',
  },
  
  // 功能色彩
  functional: {
    success: '#4A6F3C', // 优雅的深绿色
    error: '#A62626', // 优雅的深红色
    warning: '#CB8E37', // 优雅的琥珀色
    info: '#2D4975', // 优雅的深蓝色
  },
  
  // 半透明覆层
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    medium: 'rgba(255, 255, 255, 0.5)',
    dark: 'rgba(0, 0, 0, 0.5)',
    darker: 'rgba(0, 0, 0, 0.8)',
  },
};

// 排版系统
const typography = {
  // 字体家族
  fontFamily: {
    primary: 'Helvetica Neue, Helvetica, Arial, sans-serif', // 主要字体
    secondary: 'Georgia, Times, Times New Roman, serif', // 次要字体，用于突出强调
    monospace: 'Menlo, Monaco, Consolas, Courier New, monospace', // 等宽字体
  },
  
  // 字体大小
  fontSize: {
    xs: '10px', // 超小
    sm: '12px', // 小
    md: '14px', // 中
    lg: '16px', // 大
    xl: '18px', // 超大
    xxl: '20px', // 特大
    display1: '24px', // 显示文字1
    display2: '32px', // 显示文字2
    display3: '40px', // 显示文字3
  },
  
  // 字重
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // 行高
  lineHeight: {
    tight: 1.2, // 紧凑
    normal: 1.5, // 普通
    loose: 1.8, // 宽松
  },
  
  // 字间距
  letterSpacing: {
    tight: '-0.05em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
  },
};

// 间距系统
const spacing = {
  // 基础间距单位（以4为基数的栅格系统）
  unit: 4,
  
  // 预定义间距
  xxs: '4px',  // 2 * unit
  xs: '8px',   // 2 * unit
  sm: '12px',  // 3 * unit
  md: '16px',  // 4 * unit
  lg: '24px',  // 6 * unit
  xl: '32px',  // 8 * unit
  xxl: '48px', // 12 * unit
  xxxl: '64px',// 16 * unit
  
  // 内容区域
  content: {
    maxWidth: '1200px',
    padding: '16px',
  },
};

// 边框系统
const borders = {
  radius: {
    none: '0',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '16px',
    circle: '50%',
  },
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
  },
};

// 阴影系统
const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xxl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// 过渡效果
const transitions = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
  },
  timing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Z轴层级
const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
};

// 布局断点
const breakpoints = {
  xs: '320px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1600px',
};

// 导出设计系统
const designTokens = {
  colors,
  typography,
  spacing,
  borders,
  shadows,
  transitions,
  zIndex,
  breakpoints,
};

// 根据环境进行不同的导出
// 针对ES模块环境
export default designTokens;

// 针对CommonJS环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = designTokens;
}

// 针对小程序环境
/* global wx */
if (typeof wx !== 'undefined') {
  // 小程序环境下通过全局变量挂载
  wx.designTokens = designTokens;
} 