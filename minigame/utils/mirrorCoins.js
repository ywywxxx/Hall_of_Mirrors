// 积分（圆形小镜子）管理工具

const STORAGE_KEY = 'mirrorCoins'

// 获取当前积分
function getMirrorCoins() {
  try {
    const coins = wx.getStorageSync(STORAGE_KEY)
    return coins || 0
  } catch (e) {
    console.error('获取积分失败:', e)
    return 0
  }
}

// 设置积分
function setMirrorCoins(coins) {
  try {
    wx.setStorageSync(STORAGE_KEY, coins)
    return true
  } catch (e) {
    console.error('保存积分失败:', e)
    return false
  }
}

// 增加积分
function addMirrorCoins(amount) {
  const current = getMirrorCoins()
  const newAmount = current + amount
  setMirrorCoins(newAmount)
  return newAmount
}

// 扣除积分
function deductMirrorCoins(amount) {
  const current = getMirrorCoins()
  if (current < amount) {
    return { success: false, remaining: current }
  }
  const newAmount = current - amount
  setMirrorCoins(newAmount)
  return { success: true, remaining: newAmount }
}

// 检查是否有足够积分
function hasEnoughCoins(amount) {
  return getMirrorCoins() >= amount
}

module.exports = {
  getMirrorCoins,
  setMirrorCoins,
  addMirrorCoins,
  deductMirrorCoins,
  hasEnoughCoins
}
