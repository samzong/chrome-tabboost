/**
 * 发布渠道配置
 * 支持多渠道发布策略
 */

const CHANNELS = {
  // 开发环境
  DEV: {
    name: 'development',
    displayName: '开发版',
    updateUrl: null,
    badgeColor: '#666666',
    debug: true
  },
  
  // 测试环境
  BETA: {
    name: 'beta',
    displayName: '测试版',
    updateUrl: 'https://updates.example.com/beta.xml',
    badgeColor: '#FFA500',
    debug: true
  },
  
  // 生产环境 (Chrome Web Store 受信任测试者)
  TRUSTED_TESTERS: {
    name: 'trusted-testers',
    displayName: '内测版',
    updateUrl: null, // Chrome Web Store 自动处理
    badgeColor: '#0000FF',
    debug: false
  },
  
  // 正式发布
  PROD: {
    name: 'production',
    displayName: '正式版',
    updateUrl: null, // Chrome Web Store 自动处理
    badgeColor: null, // 不显示角标
    debug: false
  }
};

/**
 * 获取当前构建渠道
 * @returns {object} 当前渠道配置
 */
function getCurrentChannel() {
  // 从环境变量获取渠道
  const channelName = process.env.BUILD_CHANNEL || 'DEV';
  
  if (!CHANNELS[channelName]) {
    console.warn(`未知渠道 "${channelName}"，使用开发环境配置`);
    return CHANNELS.DEV;
  }
  
  return CHANNELS[channelName];
}

module.exports = {
  CHANNELS,
  getCurrentChannel
}; 