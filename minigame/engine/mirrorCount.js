// 生成高斯分布的随机数（使用 Box-Muller 变换）
function gaussianRandom(mean, stdDev) {
  let u = 0, v = 0
  while (u === 0) u = Math.random() // 避免 log(0)
  while (v === 0) v = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return z * stdDev + mean
}

// 生成在 [min, max] 范围内的高斯分布随机整数
function gaussianRandomInt(min, max) {
  if (min === max) return min
  const mean = (min + max) / 2
  const stdDev = (max - min) / 4 // 标准差设为范围的1/4，使得大部分值在范围内
  let value = Math.round(gaussianRandom(mean, stdDev))
  // 截断到范围内
  value = Math.max(min, Math.min(max, value))
  return value
}

// 根据尺寸生成镜子数量（高斯分布：n-1 到 int(n^2/2)）
function getMirrorCountForSize(size) {
  const min = size - 1
  const max = Math.floor(size * size / 2)
  return gaussianRandomInt(min, max)
}

module.exports = {
  gaussianRandomInt,
  getMirrorCountForSize
}
