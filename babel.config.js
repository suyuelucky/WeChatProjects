module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          // 针对低端机型的兼容性目标
          browsers: [
            '> 1%',
            'last 2 versions',
            'not ie <= 11',
            'Android >= 4.4',
            'iOS >= 9'
          ]
        },
        useBuiltIns: 'usage',
        corejs: 3,
        modules: false, // 保留ES模块语法，便于进行tree-shaking
      }
    ],
    '@babel/preset-react', // 处理React
    '@babel/preset-typescript', // 处理TypeScript
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    [
      '@babel/plugin-transform-regenerator',
      {
        // 异步函数处理
        asyncGenerators: true,
        generators: true,
        async: true
      }
    ],
    // 条件编译，区分小程序和Web环境
    [
      'babel-plugin-transform-define',
      {
        'process.env.PLATFORM': process.env.PLATFORM || 'web'
      }
    ]
  ],
  // 针对不同环境的配置
  env: {
    production: {
      plugins: [
        'transform-remove-console', // 生产环境移除console
        'transform-react-remove-prop-types',
      ]
    },
    development: {
      plugins: [
        'react-refresh/babel' // 开发环境支持热更新
      ]
    }
  }
}; 