const { getMirrorCoins } = require('../../utils/mirrorCoins')
const app = getApp()

Page({
  data: {
    availableSizes: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    mirrorCoins: 0
  },

  onLoad() {
    console.log('首页加载')
    this.loadMirrorCoins()
  },

  onShow() {
    // 页面显示时刷新积分
    console.log('首页显示，刷新积分')
    this.loadMirrorCoins()
    // 同时从全局数据获取
    if (app && app.globalData) {
      this.setData({ mirrorCoins: app.globalData.mirrorCoins || 0 })
    }
  },

  loadMirrorCoins() {
    try {
      const coins = getMirrorCoins()
      console.log('加载积分:', coins)
      this.setData({ mirrorCoins: coins })
      // 同步到全局数据
      if (app && app.globalData) {
        app.globalData.mirrorCoins = coins
      }
    } catch (e) {
      console.error('加载积分失败:', e)
      this.setData({ mirrorCoins: 0 })
    }
  },

  onSizeSelect(e) {
    const size = e.currentTarget.dataset.size
    console.log('选择难度:', size)
    wx.navigateTo({
      url: `/pages/game/game?size=${size}`,
      success: () => {
        console.log('跳转成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        wx.showToast({
          title: '跳转失败: ' + (err.errMsg || '未知错误'),
          icon: 'none',
          duration: 2000
        })
      }
    })
  }
})
