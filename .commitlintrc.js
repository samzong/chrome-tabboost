module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', // 新功能
      'fix', // 修复bug
      'docs', // 文档变更
      'style', // 代码格式(不影响代码运行的变动)
      'refactor', // 重构
      'perf', // 性能优化
      'test', // 增加测试
      'build', // 构建过程或辅助工具的变动
      'ci', // CI相关变化
      'chore', // 其他修改
      'revert' // 回滚
    ]],
    'scope-enum': [0, 'always', [
      'core', // 核心功能
      'popup', // 弹出窗口
      'options', // 选项页面
      'split-view', // 分屏模式
      'i18n', // 国际化
      'sync', // 数据同步
      'perf', // 性能
      'security', // 安全性
      'a11y', // 辅助功能
      'release' // 发布相关
    ]],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 100],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case']
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never']
  }
}; 