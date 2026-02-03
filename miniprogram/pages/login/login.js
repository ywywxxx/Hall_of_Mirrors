Page({
  data: {
    userInfo: null
  },

  onLoad() {
    console.log('登录页面加载')
  },

  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      // 用户同意授权
      this.setData({
        userInfo: e.detail.userInfo
      })
      // 保存用户信息到全局
      const app = getApp()
      if (app && app.globalData) {
        app.globalData.userInfo = e.detail.userInfo
      }
      // 跳转到首页（使用 redirectTo 关闭登录页）
      wx.redirectTo({
        url: '/pages/index/index',
        success: () => {
          console.log('跳转到首页成功')
        },
        fail: (err) => {
          console.error('跳转失败:', err)
          // 如果 redirectTo 失败，尝试使用 navigateTo
          wx.navigateTo({
            url: '/pages/index/index',
            fail: () => {
              wx.showToast({
                title: '跳转失败: ' + (err.errMsg || '未知错误'),
                icon: 'none',
                duration: 2000
              })
            }
          })
        }
      })
    } else {
      // 用户拒绝授权
      wx.showToast({
        title: '需要授权才能使用',
        icon: 'none'
      })
    }
  },

  onSkip() {
    // 跳过登录，直接进入首页
    wx.redirectTo({
      url: '/pages/index/index',
      success: () => {
        console.log('跳过登录，跳转到首页成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        // 如果 redirectTo 失败，尝试使用 navigateTo
        wx.navigateTo({
          url: '/pages/index/index',
          fail: () => {
            wx.showToast({
              title: '跳转失败: ' + (err.errMsg || '未知错误'),
              icon: 'none',
              duration: 2000
            })
          }
        })
      }
    })
  }
})
