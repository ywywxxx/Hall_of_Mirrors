Page({
  data: {
    availableSizes: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  },

  onLoad() {
    console.log('首页加载')
  },

  onSizeSelect(e: any) {
    const size = e.currentTarget.dataset.size
    wx.navigateTo({
      url: `/pages/game/game?size=${size}`
    })
  }
})
