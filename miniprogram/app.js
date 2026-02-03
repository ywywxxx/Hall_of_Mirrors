const { getMirrorCoins } = require('./utils/mirrorCoins')

App({
  onLaunch() {
    console.log('镜子迷宫小程序启动')
    // 初始化积分
    this.updateMirrorCoins()
    
    // 检查是否已登录，如果没有则跳转到登录页
    // 注意：这里不自动跳转，让用户手动进入登录页
  },
  globalData: {
    userInfo: null,
    mirrorCoins: 0
  },
  
  // 更新全局积分数据
  updateMirrorCoins() {
    try {
      const coins = getMirrorCoins()
      this.globalData.mirrorCoins = coins
      // 通知所有页面更新
      this.notifyPagesUpdate()
    } catch (e) {
      console.error('更新积分失败:', e)
    }
  },
  
  // 通知所有页面更新积分
  notifyPagesUpdate() {
    try {
      const pages = getCurrentPages()
      if (pages && pages.length > 0) {
        pages.forEach(page => {
          if (page && typeof page.loadMirrorCoins === 'function') {
            page.loadMirrorCoins()
          }
        })
      }
    } catch (e) {
      console.error('通知页面更新失败:', e)
    }
  }
})
