// 小游戏入口文件
const { generateLevel } = require('./engine/generate')
const { getMirrorCountForSize } = require('./engine/mirrorCount')
const { calculateClues } = require('./engine/calculateClues')
const { traceRay } = require('./engine/trace')
const { getMirrorCoins, addMirrorCoins, deductMirrorCoins, hasEnoughCoins } = require('./utils/mirrorCoins')

// 游戏状态
let gameState = {
  screen: 'menu', // 'menu' | 'game' | 'tutorial'
  size: 3,
  level: null,
  currentMirrors: {},
  noMirrorMarks: {},
  showAnswer: false,
  showAllLightPaths: true,  // 显示全部光线（虚线）
  showCurrentLightPaths: true,  // 显示当前光线（实线）
  isSolved: false,
  mirrorCoins: 0,
  hasEarnedCoins: false,
  hasViewedAnswer: false,  // 是否曾经查看过答案（查看过答案后通关不奖励）
  currentClues: null,
  currentCellSize: 35,  // 动态计算的格子大小
  currentClueSize: 28,  // 动态计算的线索大小
  highlightedPaths: new Set(),  // 高亮的光线路径（使用Set存储路径索引）
  selectedLights: new Set(),  // 当前选中的光线集合（存储格式：'side-index'）
  hintPaths: new Set(),  // 提示的光线路径（答案光路，存储格式：'side-index'）
  showHintPaths: true,  // 是否显示所有提示光线
  hintCount: 0,  // 当前关卡已使用的提示次数
  touchStartTime: 0,  // 触摸开始时间
  touchStartPos: null,  // 触摸开始位置 {x, y, r, c}
  longPressTimer: null,  // 长按定时器
  tutorialStep: 0,  // 引导步骤（0-7）
  tutorialCompleted: false,  // 引导是否完成
  tutorialDemo: null,  // 引导示例关卡
  tutorialDemoMirrors: {},  // 引导示例中的镜子
  tutorialDemoClues: null,  // 引导示例的线索
  hardMode: false,  // 困难模式
  hiddenClues: new Set()  // 困难模式下隐藏的线索（存储格式：'top-0', 'bottom-1'等）
}

// Canvas 相关
let canvas = null
let ctx = null
let systemInfo = null

// 游戏配置
const config = {
  gridPadding: 2,
  availableSizes: [2, 3, 5, 7, 9, 10, 11]
}

// 根据格子数量和屏幕宽度动态计算格子大小
function calculateCellSize(size, windowWidth) {
  // 预留空间：左右侧线索、卡片内边距、边缘间距
  const minEdgeMargin = 20  // 最小边缘间距
  const cardPadding = 15    // 卡片内边距
  const clueSizeRatio = 0.8 // 线索大小是格子大小的比例
  const sideClueSpaceRatio = 1.1 // 左右侧线索空间比例
  
  // 计算可用宽度
  const availableWidth = windowWidth - minEdgeMargin * 2 - cardPadding * 2
  
  // 估算线索大小（会根据格子大小调整）
  // 先假设一个基础格子大小来计算
  let estimatedCellSize = Math.min(50, availableWidth / (size + sideClueSpaceRatio * 2))
  
  // 根据格子数量调整：小格子可以更大
  if (size <= 3) {
    estimatedCellSize = Math.min(55, availableWidth / (size + sideClueSpaceRatio * 2))
  } else if (size <= 5) {
    estimatedCellSize = Math.min(50, availableWidth / (size + sideClueSpaceRatio * 2))
  } else if (size <= 7) {
    estimatedCellSize = Math.min(40, availableWidth / (size + sideClueSpaceRatio * 2))
  } else {
    estimatedCellSize = Math.min(35, availableWidth / (size + sideClueSpaceRatio * 2))
  }
  
  // 精确计算：考虑线索大小
  const clueSize = Math.max(20, Math.floor(estimatedCellSize * clueSizeRatio))
  const sideClueSpace = clueSize + 8
  const gridWidth = size * estimatedCellSize + config.gridPadding * 2
  const totalWidth = gridWidth + sideClueSpace * 2 + cardPadding * 2
  
  // 如果超出屏幕，按比例缩小
  if (totalWidth > availableWidth) {
    const scale = availableWidth / totalWidth
    estimatedCellSize = Math.floor(estimatedCellSize * scale)
  }
  
  // 确保最小尺寸
  return Math.max(25, estimatedCellSize)
}

// 根据格子大小计算线索大小
function calculateClueSize(cellSize) {
  return Math.max(20, Math.floor(cellSize * 0.8))
}

// 绘制渐变背景
function drawGradientBackground() {
  const info = getSystemInfo()
  const { windowWidth, windowHeight } = info
  
  // 创建梦幻色彩渐变（高明度、低饱和）
  const gradient = ctx.createLinearGradient(0, 0, windowWidth, windowHeight)
  gradient.addColorStop(0, '#FFF5F7')    // 极浅粉
  gradient.addColorStop(0.2, '#F3E5F5')  // 浅紫
  gradient.addColorStop(0.4, '#E3F2FD')  // 浅蓝
  gradient.addColorStop(0.6, '#E8F5E9')  // 浅绿
  gradient.addColorStop(0.8, '#FFFDE7')  // 浅黄
  gradient.addColorStop(1, '#FFF5F7')    // 回到浅粉
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, windowWidth, windowHeight)
}

// 绘制圆角矩形
function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// 绘制带阴影的圆角矩形
function drawRoundedRectWithShadow(x, y, width, height, radius, fillColor, strokeColor, strokeWidth, shadowBlur) {
  // 阴影
  if (shadowBlur) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2
  }
  
  drawRoundedRect(x, y, width, height, radius)
  
  if (fillColor) {
    ctx.fillStyle = fillColor
    ctx.fill()
  }
  
  if (strokeColor && strokeWidth) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.stroke()
  }
  
  // 重置阴影
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

// 小游戏生命周期
GameGlobal.onShow = function() {
  console.log('小游戏显示')
  gameState.mirrorCoins = getMirrorCoins()
  if (gameState.screen === 'game') {
    drawGame()
  } else if (gameState.screen === 'tutorial') {
    drawTutorial()
  } else {
    drawMenu()
  }
}

GameGlobal.onHide = function() {
  console.log('小游戏隐藏')
}

// 获取系统信息
function getSystemInfo() {
  if (!systemInfo) {
    systemInfo = wx.getSystemInfoSync()
  }
  return systemInfo
}

// 初始化 Canvas
function initCanvas() {
  const info = getSystemInfo()
  const { windowWidth, windowHeight } = info
  
  canvas = wx.createCanvas()
  canvas.width = windowWidth
  canvas.height = windowHeight
  ctx = canvas.getContext('2d')
  
  console.log('Canvas 初始化成功，尺寸:', windowWidth, 'x', windowHeight)
  
  // 绘制初始界面
  drawMenu()
}

// 绘制菜单界面
function drawMenu() {
  if (!ctx) return
  
  const info = getSystemInfo()
  const { windowWidth, windowHeight } = info
  
  // 清空画布
  ctx.clearRect(0, 0, windowWidth, windowHeight)
  
  // 渐变背景
  drawGradientBackground()
  
  // 积分显示（右上角，圆角卡片样式）
  const coinCardWidth = 120
  const coinCardHeight = 40
  const coinCardX = windowWidth - coinCardWidth - 20
  const coinCardY = 20
  
  drawRoundedRectWithShadow(coinCardX, coinCardY, coinCardWidth, coinCardHeight, 20, 'rgba(255, 255, 255, 0.9)', '#FFD93D', 2, 8)
  
  ctx.fillStyle = '#CE93D8'
  ctx.font = 'bold 18px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText(`🪞 ${gameState.mirrorCoins}`, coinCardX + coinCardWidth / 2, coinCardY + coinCardHeight / 2 + 6)
  
  // 标题
  ctx.fillStyle = '#CE93D8'
  ctx.font = 'bold 48px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(206, 147, 216, 0.3)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillText('✨ 镜子迷宫 ✨', windowWidth / 2, 120)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  
  // 困难模式开关按钮（右下角小按钮）
  const switchButtonWidth = 60
  const switchButtonHeight = 60
  const switchButtonX = windowWidth - switchButtonWidth - 20
  const switchButtonY = windowHeight - switchButtonHeight - 20
  
  // 困难模式按钮背景
  const switchButtonColor = gameState.hardMode ? '#FF6B6B' : '#E0E0E0'
  drawRoundedRectWithShadow(switchButtonX, switchButtonY, switchButtonWidth, switchButtonHeight, 30, switchButtonColor, null, 0, 8)
  
  // 困难模式按钮图标
  ctx.fillStyle = gameState.hardMode ? '#FFFFFF' : '#666666'
  ctx.font = 'bold 32px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(gameState.hardMode ? '🔥' : '⚪', switchButtonX + switchButtonWidth / 2, switchButtonY + switchButtonHeight / 2 + 1)
  
  // 保存困难模式按钮位置供触摸事件使用
  gameState.hardModeButtonBounds = {
    x: switchButtonX,
    y: switchButtonY,
    width: switchButtonWidth,
    height: switchButtonHeight
  }
  
  // 难度选择按钮 - 调整大小和间距以容纳7个选项
  const buttonWidth = 200
  const buttonHeight = 55  // 减小按钮高度
  const startY = 200
  const spacing = 10  // 减小间距
  
  config.availableSizes.forEach((size, index) => {
    const x = windowWidth / 2 - buttonWidth / 2
    const y = startY + index * (buttonHeight + spacing)
    
    if (y + buttonHeight > windowHeight - 80) return  // 调整底部边距，避免和困难模式按钮重叠
    
    // 按钮背景（蓝色，圆角，阴影）
    drawRoundedRectWithShadow(x, y, buttonWidth, buttonHeight, 16, '#B3D9FF', null, 0, 8)
    
    // 2×2按钮使用深蓝色
    const buttonColor = size === 2 ? '#4A90E2' : '#B3D9FF'
    drawRoundedRectWithShadow(x, y, buttonWidth, buttonHeight, 16, buttonColor, null, 0, 8)
    
    // 按钮文字（2×2字体小一点，其他也稍微小一点）
    ctx.fillStyle = '#FFFFFF'
    ctx.font = size === 2 ? 'bold 24px STKaiti, KaiTi, STSong, SimSun, serif' : 'bold 28px STKaiti, KaiTi, STSong, SimSun, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const buttonText = size === 2 ? `${size}×${size}（新手引导）` : `${size}×${size}`
    ctx.fillText(buttonText, x + buttonWidth / 2, y + buttonHeight / 2 + 1)
  })
}

// 绘制引导界面
function drawTutorial() {
  if (!ctx) return
  
  const info = getSystemInfo()
  const { windowWidth, windowHeight } = info
  
  // 清空画布
  ctx.clearRect(0, 0, windowWidth, windowHeight)
  
  // 渐变背景
  drawGradientBackground()
  
  const step = gameState.tutorialStep
  const steps = [
    {
      title: '✨ 欢迎来到镜子迷宫 ✨',
      content: '这是一个需要放置镜子来引导光线的解谜游戏\n\n通过放置镜子，让光线从入口到达对应的出口',
      icon: '🪞'
    },
    {
      title: '🎯 游戏规则',
      content: '• 每个格子的边都同时是光的发射/接收器\n• 数字是这束光从发射到被接收的总光程\n• 放置镜子，让光线按照数字要求完成路径',
      icon: '🎯',
      hasDemo: true,
      demoHint: '观察光线如何从顶部发射，经过镜子反射后到达底部'
    },
    {
      title: '🪞 如何放置镜子',
      content: '• 镜子是双面反射镜（不能透射）\n• 点击格子：放置 \\ 镜子\n• 再次点击：切换为 / 镜子\n• 第三次点击：移除镜子\n• 长按格子：标记为"无镜子"（no）',
      icon: '🪞',
      hasDemo: true,
      demoHint: '点击格子试试放置镜子！'
    },
    {
      title: '🔢 理解线索数字',
      content: '• 每个边都有数字，表示光从发射到被接收的总光程\n• 内圈数字：正确答案（绿色=正确，粉色=错误）\n• 外圈红色数字：当前错误值（只有错误时才显示）\n• 目标是让所有边的数字都变绿',
      icon: '🔢',
      hasDemo: true,
      demoHint: '放置镜子，观察数字如何变化'
    },
    {
      title: '💡 查看光线路径',
      content: '• 光线会以虚线显示在网格上\n• 点击格子：高亮显示经过该格子的光线（实线）\n• 可以随时开关光线显示',
      icon: '💡',
      hasDemo: true,
      demoHint: '点击格子查看光线路径高亮'
    },
    {
      title: '🪞 镜子系统',
      content: '• 完成关卡获得画布上所有镜子\n• 查看答案消耗 n² 个镜子\n• 镜子显示在右上角',
      icon: '🪞'
    },
    {
      title: '🚀 准备好了吗？',
      content: '现在让我们开始你的第一关！\n\n这是一个 2×2 的简单关卡，\n按照提示放置镜子，完成挑战吧！',
      icon: '🚀'
    }
  ]
  
  const currentStep = steps[step]
  if (!currentStep) return
  
  // 如果有示例，初始化示例
  if (currentStep.hasDemo) {
    initTutorialDemo()
    updateTutorialDemoClues()
  }
  
  // 标题（减小字体，确保不超出）- 莫兰迪灰紫
  ctx.fillStyle = '#8B7FA8'
  ctx.font = 'bold 28px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(139, 127, 168, 0.3)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillText(currentStep.title, windowWidth / 2, 80)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  
  // 图标（减小尺寸）- 莫兰迪灰粉
  ctx.fillStyle = '#B89A9A'
  ctx.font = 'bold 50px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.fillText(currentStep.icon, windowWidth / 2, 130)
  
  // 内容卡片（莫兰迪灰蓝背景，动态调整高度）
  const cardWidth = windowWidth - 40
  const cardPadding = 20
  const hasDemo = currentStep.hasDemo
  const demoHeight = hasDemo ? 180 : 0  // 示例区域高度
  const maxCardHeight = windowHeight - 380 - demoHeight  // 预留标题、图标、按钮、示例空间
  const cardX = 20
  const cardY = 160
  
  // 计算需要的卡片高度
  const lines = currentStep.content.split('\n')
  const lineHeight = 24
  const textHeight = lines.length * lineHeight
  const cardHeight = Math.min(textHeight + cardPadding * 2, maxCardHeight)
  
  drawRoundedRectWithShadow(cardX, cardY, cardWidth, cardHeight, 20, '#7A8FA3', '#5A6B7A', 2, 16)
  
  // 内容文字（白色，在深蓝背景上，动态调整字体大小以适配）
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  
  const startY = cardY + cardPadding
  const maxTextWidth = cardWidth - cardPadding * 2  // 可用文本宽度
  
  // 绘制文本，每行居中显示，动态调整字体大小
  lines.forEach((line, index) => {
    if (!line.trim()) {
      // 空行，跳过
      return
    }
    
    // 动态计算合适的字体大小
    let fontSize = 18
    let textWidth = 0
    let testFont = ''
    
    // 从18px开始，逐步减小直到文字能放下
    for (let testSize = 18; testSize >= 12; testSize -= 1) {
      testFont = `${testSize}px STKaiti, KaiTi, STSong, SimSun, serif`
      ctx.font = testFont
      textWidth = ctx.measureText(line).width
      if (textWidth <= maxTextWidth) {
        fontSize = testSize
        break
      }
    }
    
    // 使用计算出的字体大小绘制文字
    ctx.font = `${fontSize}px STKaiti, KaiTi, STSong, SimSun, serif`
    ctx.fillText(line, windowWidth / 2, startY + index * lineHeight)
  })
  
  // 如果有示例，绘制交互式示例 - 往下挪一点，避免和内容卡片重叠
  if (hasDemo && gameState.tutorialDemo) {
    drawTutorialDemo(cardX, cardY + cardHeight + 35, cardWidth, demoHeight, currentStep)
  }
  
  // 按钮
  const buttonHeight = 50
  const buttonSpacing = 15
  const bottomMargin = 20
  const buttonGap = 15  // 按钮之间的间距
  
  // 第一行按钮（上一步和下一步/开始游戏）- 往上挪，避免和返回按钮重合
  const firstRowY = windowHeight - bottomMargin - buttonHeight - buttonHeight - buttonGap
  
  // 上一步按钮（第一步不显示）- 莫兰迪灰
  if (step > 0) {
    const prevButtonWidth = 120
    const prevButtonX = 20
    drawRoundedRectWithShadow(prevButtonX, firstRowY, prevButtonWidth, buttonHeight, 25, '#B8B8B8', null, 0, 8)
    ctx.fillStyle = '#5A5A5A'
    ctx.font = 'bold 22px STKaiti, KaiTi, STSong, SimSun, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // 调整文字位置，使其更居中（减少垂直偏移）
    ctx.fillText('← 上一步', prevButtonX + prevButtonWidth / 2, firstRowY + buttonHeight / 2 + 1)
  }
  
  // 下一步/开始游戏按钮 - 开始游戏用浅蓝色，下一步用莫兰迪灰蓝
  const nextButtonWidth = step === steps.length - 1 ? 200 : 150
  const nextButtonX = step > 0 ? windowWidth - nextButtonWidth - 20 : windowWidth / 2 - nextButtonWidth / 2
  const nextButtonText = step === steps.length - 1 ? '🎮 开始游戏' : '下一步 →'
  const nextButtonColor = step === steps.length - 1 ? '#B2CEFE' : '#8FA3B8'  // 开始游戏用浅蓝色
  
  drawRoundedRectWithShadow(nextButtonX, firstRowY, nextButtonWidth, buttonHeight, 25, nextButtonColor, null, 0, 8)
  ctx.fillStyle = step === steps.length - 1 ? '#FFFFFF' : '#FFFFFF'  // 开始游戏按钮文字用白色
  ctx.font = 'bold 22px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 调整文字位置，使其更居中（减少垂直偏移）
  ctx.fillText(nextButtonText, nextButtonX + nextButtonWidth / 2, firstRowY + buttonHeight / 2 + 1)
  
  // 第二行按钮（返回按钮）
  const secondRowY = windowHeight - bottomMargin - buttonHeight
  
  // 返回按钮（左侧，鹅黄色背景，和正常界面一样）
  const backButtonWidth = 100
  const backButtonX = buttonSpacing
  drawRoundedRectWithShadow(backButtonX, secondRowY, backButtonWidth, buttonHeight, 25, '#FFF9E6', '#FFD93D', 2, 8)
  ctx.fillStyle = '#CE93D8'
  ctx.font = 'bold 20px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText('← 返回', backButtonX + backButtonWidth / 2, secondRowY + buttonHeight / 2 + 4)
  
  // 步骤指示器 - 莫兰迪深灰
  ctx.fillStyle = '#8A8A8A'
  ctx.font = '18px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${step + 1} / ${steps.length}`, windowWidth / 2, firstRowY - 20)
}

// 绘制引导示例
function drawTutorialDemo(demoX, demoY, demoWidth, demoHeight, step) {
  if (!gameState.tutorialDemo) return
  
  const size = 2
  const cellSize = Math.min(50, (demoWidth - 60) / size)  // 确保示例不会太大
  const clueSize = 20
  const padding = 10
  const sideClueSpace = clueSize + 5
  
  // 示例卡片背景 - 格子位置保持不变
  const demoCardWidth = size * cellSize + sideClueSpace * 2 + padding * 2
  const demoCardHeight = size * cellSize + clueSize * 2 + padding * 2 + 20
  const demoCardX = demoX + (demoWidth - demoCardWidth) / 2
  const demoCardY = demoY  // 恢复原位置，保持格子位置不变
  
  drawRoundedRectWithShadow(demoCardX, demoCardY, demoCardWidth, demoCardHeight, 15, '#F5F5F0', '#C4A8A8', 2, 8)
  
  // 提示文字 - 莫兰迪深灰 - 上下都有空间，不贴着任何东西
  if (step.demoHint) {
    ctx.fillStyle = '#6A6A6A'
    ctx.font = '16px STKaiti, KaiTi, STSong, SimSun, serif'
    ctx.textAlign = 'center'
    // 放在卡片上方，上下都有足够的空间（上方距离内容卡片底部，下方距离示例卡片顶部）
    ctx.fillText(step.demoHint, demoX + demoWidth / 2, demoCardY - 25)  // 和卡片顶部保持25像素间距，上下都有空间
  }
  
  // 计算网格位置 - 保持原位置不变
  const gridX = demoCardX + padding + sideClueSpace
  const gridY = demoCardY + padding + clueSize + 10  // 减少上边距，让外边框变窄
  
  // 绘制网格背景 - 莫兰迪灰蓝，四角圆润的正方形
  const gridSize = size * cellSize
  drawRoundedRect(gridX, gridY, gridSize, gridSize, 6)
  ctx.fillStyle = '#E0E5EA'
  ctx.fill()
  
  // 绘制网格线 - 莫兰迪灰蓝
  ctx.strokeStyle = '#B8C4D1'
  ctx.lineWidth = 1
  for (let i = 0; i <= size; i++) {
    const pos = gridX + i * cellSize
    ctx.beginPath()
    ctx.moveTo(pos, gridY)
    ctx.lineTo(pos, gridY + size * cellSize)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(gridX, gridY + i * cellSize)
    ctx.lineTo(gridX + size * cellSize, gridY + i * cellSize)
    ctx.stroke()
  }
  
  // 绘制格子背景
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cellX = gridX + c * cellSize
      const cellY = gridY + r * cellSize
      drawRoundedRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4, 4)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fill()
    }
  }
  
  // 绘制线索（显示所有四个方向，与实际游戏一致）
  const demoClues = gameState.tutorialDemoClues || gameState.tutorialDemo.clues
  const answerClues = gameState.tutorialDemo.clues
  if (demoClues && answerClues) {
    const sides = [
      { name: 'top', x: 0, y: -1 },
      { name: 'bottom', x: 0, y: 1 },
      { name: 'left', x: -1, y: 0 },
      { name: 'right', x: 1, y: 0 }
    ]
    
    sides.forEach(side => {
      for (let i = 0; i < size; i++) {
        // 计算线索位置
        let clueX, clueY
        if (side.name === 'top') {
          clueX = gridX + i * cellSize + cellSize / 2
          clueY = gridY - clueSize / 2 - 3
        } else if (side.name === 'bottom') {
          clueX = gridX + i * cellSize + cellSize / 2
          clueY = gridY + size * cellSize + clueSize / 2 + 3
        } else if (side.name === 'left') {
          clueX = gridX - sideClueSpace + clueSize / 2
          clueY = gridY + i * cellSize + cellSize / 2
        } else { // right
          clueX = gridX + size * cellSize + sideClueSpace - clueSize / 2
          clueY = gridY + i * cellSize + cellSize / 2
        }
        
        const answerValue = answerClues[side.name][i]
        const currentValue = demoClues[side.name][i]
        const isCorrect = currentValue === answerValue
        
        // 内圈：线索背景（正确时梦幻绿，错误时梦幻粉）- 糖果色系
        drawRoundedRect(clueX - clueSize / 2, clueY - clueSize / 2, clueSize, clueSize, 4)
        ctx.fillStyle = isCorrect ? '#B2DFDB' : '#FFCDD2'
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1
        ctx.stroke()
        
        // 内圈文字：始终显示正确答案（白色，居中）
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 12px STKaiti, KaiTi, STSong, SimSun, serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(answerValue.toString(), clueX, clueY)
        
        // 外圈：如果错误，在背景框外侧显示红色错误数字（当前值）
        if (!isCorrect) {
          ctx.fillStyle = '#FF0000'
          ctx.font = 'bold 10px STKaiti, KaiTi, STSong, SimSun, serif'
          if (side.name === 'top') {
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillText(currentValue.toString(), clueX, clueY - clueSize / 2 - 5)
          } else if (side.name === 'bottom') {
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(currentValue.toString(), clueX, clueY + clueSize / 2 + 5)
          } else if (side.name === 'left') {
            ctx.textAlign = 'right'
            ctx.textBaseline = 'middle'
            ctx.fillText(currentValue.toString(), clueX - clueSize / 2 - 5, clueY)
          } else { // right
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.fillText(currentValue.toString(), clueX + clueSize / 2 + 5, clueY)
          }
        }
      }
    })
  }
  
  // 绘制镜子
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`
      const cellX = gridX + c * cellSize
      const cellY = gridY + r * cellSize
      
      const userMirror = gameState.tutorialDemoMirrors[key]
      const answerMirror = gameState.tutorialDemo.grid[r][c].mirror
      
      // 显示答案镜子（如果有且用户未放置，且是观察步骤）- 糖果色系
      if (answerMirror && !userMirror && step.demoHint && step.demoHint.includes('观察')) {
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        if (answerMirror === '\\') {
          ctx.moveTo(cellX + 8, cellY + 8)
          ctx.lineTo(cellX + cellSize - 8, cellY + cellSize - 8)
        } else {
          ctx.moveTo(cellX + cellSize - 8, cellY + 8)
          ctx.lineTo(cellX + 8, cellY + cellSize - 8)
        }
        ctx.stroke()
        ctx.globalAlpha = 1.0
      }
      
      // 绘制用户放置的镜子 - 糖果色系
      if (userMirror) {
        ctx.strokeStyle = '#8B4513'
        ctx.lineWidth = 3
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.beginPath()
        if (userMirror === '\\') {
          ctx.moveTo(cellX + 8, cellY + 8)
          ctx.lineTo(cellX + cellSize - 8, cellY + cellSize - 8)
        } else {
          ctx.moveTo(cellX + cellSize - 8, cellY + 8)
          ctx.lineTo(cellX + 8, cellY + cellSize - 8)
        }
        ctx.stroke()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }
    }
  }
  
  // 绘制光线路径（如果步骤需要显示光线）
  if (step.demoHint && (step.demoHint.includes('光线') || step.demoHint.includes('观察'))) {
    const demoGrid = []
    for (let r = 0; r < 2; r++) {
      const row = []
      for (let c = 0; c < 2; c++) {
        const key = `${r},${c}`
        const mirror = gameState.tutorialDemoMirrors[key] || gameState.tutorialDemo.grid[r][c].mirror || null
        row.push({ row: r, col: c, mirror })
      }
      demoGrid.push(row)
    }
    
    // 绘制所有四个方向的光线 - 糖果色系
    const sides = ['top', 'bottom', 'left', 'right']
    const pathColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
    
    sides.forEach((side, sideIdx) => {
      for (let i = 0; i < size; i++) {
        const result = traceRay(demoGrid, { side, index: i })
        if (result.exit && result.path) {
          const pathColor = pathColors[sideIdx % pathColors.length]
          
          // 入口点
          let entryX, entryY
          if (side === 'top') {
            entryX = gridX + i * cellSize + cellSize / 2
            entryY = gridY
          } else if (side === 'bottom') {
            entryX = gridX + i * cellSize + cellSize / 2
            entryY = gridY + size * cellSize
          } else if (side === 'left') {
            entryX = gridX
            entryY = gridY + i * cellSize + cellSize / 2
          } else { // right
            entryX = gridX + size * cellSize
            entryY = gridY + i * cellSize + cellSize / 2
          }
          
          // 路径点
          const points = [{ x: entryX, y: entryY }]
          result.path.forEach((p) => {
            points.push({
              x: gridX + p.c * cellSize + cellSize / 2,
              y: gridY + p.r * cellSize + cellSize / 2
            })
          })
          
          // 出口点
          let exitX, exitY
          if (result.exit.side === 'top') {
            exitX = gridX + result.exit.index * cellSize + cellSize / 2
            exitY = gridY
          } else if (result.exit.side === 'bottom') {
            exitX = gridX + result.exit.index * cellSize + cellSize / 2
            exitY = gridY + size * cellSize
          } else if (result.exit.side === 'left') {
            exitX = gridX
            exitY = gridY + result.exit.index * cellSize + cellSize / 2
          } else { // right
            exitX = gridX + size * cellSize
            exitY = gridY + result.exit.index * cellSize + cellSize / 2
          }
          points.push({ x: exitX, y: exitY })
          
          // 绘制路径
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let j = 1; j < points.length; j++) {
            ctx.lineTo(points[j].x, points[j].y)
          }
          
          if (!gameState.highlightedPaths) {
            gameState.highlightedPaths = new Set()
          }
          const isHighlighted = gameState.highlightedPaths.has(`${side}-${i}`)
          ctx.strokeStyle = pathColor
          if (isHighlighted) {
            ctx.lineWidth = 3
            ctx.setLineDash([])
            ctx.globalAlpha = 1.0
          } else {
            ctx.lineWidth = 2
            ctx.setLineDash([4, 2])
            ctx.globalAlpha = 0.7
          }
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1.0
        }
      }
    })
  }
  
  // 保存示例位置信息供触摸事件使用
  gameState.tutorialDemoBounds = {
    gridX, gridY, cellSize, size, demoCardX, demoCardY, demoCardWidth: demoCardWidth, demoCardHeight: demoCardHeight
  }
}

// 处理引导界面触摸
function handleTutorialTouch(e) {
  const touch = e.touches && e.touches[0] ? e.touches[0] : (e.detail || e)
  const x = touch.clientX || touch.x || 0
  const y = touch.clientY || touch.y || 0
  
  const info = getSystemInfo()
  const { windowWidth, windowHeight } = info
  
  const step = gameState.tutorialStep
  const steps = [
    { hasDemo: false },
    { hasDemo: true, demoHint: '观察光线如何从顶部发射，经过镜子反射后到达底部' },
    { hasDemo: true, demoHint: '点击格子试试放置镜子！' },
    { hasDemo: true, demoHint: '放置镜子，观察数字如何变化' },
    { hasDemo: true, demoHint: '点击格子查看光线路径高亮' },
    { hasDemo: false },
    { hasDemo: false }
  ]
  const currentStep = steps[step]
  
  // 检查是否点击了示例（如果有示例）
  if (currentStep && currentStep.hasDemo && gameState.tutorialDemoBounds) {
    const { gridX, gridY, cellSize, size } = gameState.tutorialDemoBounds
    const gridWidth = size * cellSize
    const gridHeight = size * cellSize
    
    if (x >= gridX && x <= gridX + gridWidth && y >= gridY && y <= gridY + gridHeight) {
      const cellX = x - gridX
      const cellY = y - gridY
      const c = Math.floor(cellX / cellSize)
      const r = Math.floor(cellY / cellSize)
      
      if (r >= 0 && r < size && c >= 0 && c < size) {
        // 处理示例格子点击
        const key = `${r},${c}`
        const currentMirrors = { ...gameState.tutorialDemoMirrors }
        const current = currentMirrors[key]
        
        if (!current) {
          currentMirrors[key] = '\\'
        } else if (current === '\\') {
          currentMirrors[key] = '/'
        } else {
          delete currentMirrors[key]
        }
        
        gameState.tutorialDemoMirrors = currentMirrors
        updateTutorialDemoClues()
        
        // 如果是查看光线路径步骤，高亮路径
        if (step === 4) {
          if (!gameState.highlightedPaths) {
            gameState.highlightedPaths = new Set()
          }
          gameState.highlightedPaths.clear()
          
          const demoGrid = []
          for (let dr = 0; dr < 2; dr++) {
            const row = []
            for (let dc = 0; dc < 2; dc++) {
              const dkey = `${dr},${dc}`
              const mirror = gameState.tutorialDemoMirrors[dkey] || gameState.tutorialDemo.grid[dr][dc].mirror || null
              row.push({ row: dr, col: dc, mirror })
            }
            demoGrid.push(row)
          }
          
          const sides = ['top', 'bottom']
          sides.forEach((side, sideIdx) => {
            for (let i = 0; i < size; i++) {
              const result = traceRay(demoGrid, { side, index: i })
              if (result.exit && result.path) {
                const passesThrough = result.path.some(p => p.r === r && p.c === c)
                if (passesThrough) {
                  gameState.highlightedPaths.add(`${side}-${i}`)
                }
              }
            }
          })
        }
        
        drawTutorial()
        return
      }
    }
  }
  
  const buttonHeight = 50
  const buttonSpacing = 15
  const bottomMargin = 20
  const buttonGap = 15
  const firstRowY = windowHeight - bottomMargin - buttonHeight - buttonHeight - buttonGap
  const secondRowY = windowHeight - bottomMargin - buttonHeight
  
  // 返回按钮（底部左侧，鹅黄色）
  const backButtonWidth = 100
  const backButtonX = buttonSpacing
  if (x >= backButtonX && x <= backButtonX + backButtonWidth &&
      y >= secondRowY && y <= secondRowY + buttonHeight) {
    gameState.screen = 'menu'
    drawMenu()
    return
  }
  
  // 上一步按钮
  if (step > 0) {
    const prevButtonWidth = 120
    const prevButtonX = 20
    if (x >= prevButtonX && x <= prevButtonX + prevButtonWidth &&
        y >= firstRowY && y <= firstRowY + buttonHeight) {
      gameState.tutorialStep--
      // 重置示例状态
      if (gameState.tutorialStep < 1 || gameState.tutorialStep > 4) {
        gameState.tutorialDemo = null
        gameState.tutorialDemoMirrors = {}
      }
      drawTutorial()
      return
    }
  }
  
  // 下一步/开始游戏按钮
  const nextButtonWidth = step === 6 ? 200 : 150
  const nextButtonX = step > 0 ? windowWidth - nextButtonWidth - 20 : windowWidth / 2 - nextButtonWidth / 2
  
  if (x >= nextButtonX && x <= nextButtonX + nextButtonWidth &&
      y >= firstRowY && y <= firstRowY + buttonHeight) {
    if (step === 6) {
      // 最后一步，开始游戏
      markTutorialCompleted()
      gameState.screen = 'game'
      gameState.currentMirrors = {}
      gameState.noMirrorMarks = {}
      gameState.showAnswer = false
      gameState.isSolved = false
      gameState.hasEarnedCoins = false
      gameState.hasViewedAnswer = false
      gameState.currentClues = null
      generateNewLevel()
      updateCurrentClues()
      drawGame()
    } else {
      // 下一步
      gameState.tutorialStep++
      // 如果离开示例步骤，重置示例状态
      if (gameState.tutorialStep < 1 || gameState.tutorialStep > 4) {
        gameState.tutorialDemo = null
        gameState.tutorialDemoMirrors = {}
      }
      drawTutorial()
    }
  }
}

// 处理菜单点击
function handleMenuTouch(e) {
  // 小游戏的触摸事件结构：e.touches[0].clientX, e.touches[0].clientY
  const touch = e.touches && e.touches[0] ? e.touches[0] : (e.detail || e)
  const x = touch.clientX || touch.x || 0
  const y = touch.clientY || touch.y || 0
  
  console.log('菜单触摸事件:', { x, y, touch, e })
  
  const info = getSystemInfo()
  const { windowWidth } = info
  
  // 检查是否点击了困难模式开关
  if (gameState.hardModeButtonBounds) {
    const { x: switchX, y: switchY, width: switchWidth, height: switchHeight } = gameState.hardModeButtonBounds
    if (x >= switchX && x <= switchX + switchWidth &&
        y >= switchY && y <= switchY + switchHeight) {
      gameState.hardMode = !gameState.hardMode
      drawMenu()
      return
    }
  }
  
  const buttonWidth = 200
  const buttonHeight = 55  // 与绘制函数保持一致
  const startY = 200
  const spacing = 10  // 与绘制函数保持一致
  const buttonX = windowWidth / 2 - buttonWidth / 2
  
  config.availableSizes.forEach((size, index) => {
    const buttonY = startY + index * (buttonHeight + spacing)
    
    if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
      console.log('选择了难度:', size)
      startGame(size)
    }
  })
}

// 检查引导是否完成
function isTutorialCompleted() {
  try {
    return wx.getStorageSync('tutorialCompleted') === true
  } catch (e) {
    return false
  }
}

// 标记引导完成
function markTutorialCompleted() {
  try {
    wx.setStorageSync('tutorialCompleted', true)
    gameState.tutorialCompleted = true
  } catch (e) {
    console.error('保存引导状态失败:', e)
  }
}

// 开始游戏
function startGame(size) {
  // 如果是2×2，每次都强制进入引导流程
  if (size === 2) {
    gameState.screen = 'tutorial'
    gameState.tutorialStep = 0
    gameState.size = 2
    drawTutorial()
    return
  }
  
  gameState.screen = 'game'
  gameState.size = size
  gameState.currentMirrors = {}
  gameState.noMirrorMarks = {}
  gameState.showAnswer = false
  gameState.isSolved = false
  gameState.hasEarnedCoins = false
  gameState.hasViewedAnswer = false  // 重置查看答案标记
  gameState.currentClues = null
  gameState.selectedLights.clear()  // 重置选中的光线
  gameState.hintPaths.clear()  // 清空提示路径
  gameState.hintCount = 0  // 重置提示次数
  
  // 困难模式：对所有3×3及以上关卡启用，随机隐藏约1/3的线索
  if (gameState.hardMode && size >= 3) {
    gameState.hiddenClues = new Set()
    const sides = ['top', 'bottom', 'left', 'right']
    const allClueKeys = []
    
    // 收集所有线索的key
    sides.forEach(side => {
      for (let i = 0; i < size; i++) {
        allClueKeys.push(`${side}-${i}`)
      }
    })
    
    // 随机选择约1/3的线索隐藏
    const totalClues = allClueKeys.length
    const hideCount = Math.floor(totalClues / 3)
    const shuffled = [...allClueKeys].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < hideCount; i++) {
      gameState.hiddenClues.add(shuffled[i])
    }
  } else {
    // 非困难模式或2×2关卡，不隐藏线索
    gameState.hiddenClues = new Set()
  }
  
  generateNewLevel()
  // 初始化线索（在绘制前计算）
  updateCurrentClues()
  drawGame()
}

// 生成新关卡
function generateNewLevel() {
  // 重置游戏状态
  gameState.currentMirrors = {}
  gameState.noMirrorMarks = {}
  gameState.showAnswer = false
  gameState.isSolved = false
  gameState.hasEarnedCoins = false
  gameState.hasViewedAnswer = false  // 重置查看答案标记
  gameState.currentClues = null
  gameState.highlightedPaths.clear()  // 清空高亮路径
  gameState.selectedLights.clear()  // 重置选中的光线
  gameState.hintPaths.clear()  // 清空提示路径
  gameState.hintCount = 0  // 重置提示次数
  // 清除触摸状态
  if (gameState.longPressTimer) {
    clearTimeout(gameState.longPressTimer)
    gameState.longPressTimer = null
  }
  gameState.touchStartPos = null
  gameState.touchStartTime = 0
  
  // 困难模式：每次生成新关卡时重新随机选择隐藏的线索位置
  if (gameState.hardMode && gameState.size >= 3) {
    gameState.hiddenClues = new Set()
    const sides = ['top', 'bottom', 'left', 'right']
    const allClueKeys = []
    
    // 收集所有线索的key
    sides.forEach(side => {
      for (let i = 0; i < gameState.size; i++) {
        allClueKeys.push(`${side}-${i}`)
      }
    })
    
    // 随机选择约1/3的线索隐藏
    const totalClues = allClueKeys.length
    const hideCount = Math.floor(totalClues / 3)
    const shuffled = [...allClueKeys].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < hideCount; i++) {
      gameState.hiddenClues.add(shuffled[i])
    }
  } else {
    // 非困难模式或2×2关卡，不隐藏线索
    gameState.hiddenClues = new Set()
  }
  
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    attempts++
    const mirrorCount = getMirrorCountForSize(gameState.size)
    const level = generateLevel(gameState.size, mirrorCount)
    
    const emptyGrid = buildEmptyGrid(gameState.size)
    const emptyClues = calculateClues(emptyGrid)
    const isEmptySolved = checkSolvedForLevel(emptyClues, level)
    
    if (isEmptySolved) {
      console.log(`[DEBUG] 关卡 ${attempts} 不合格：初始状态已通关，重新生成...`)
      continue
    }
    
    gameState.level = level
    console.log(`[DEBUG] 生成合格关卡，尝试次数: ${attempts}`)
    return
  }
  
  console.warn(`[DEBUG] 尝试 ${maxAttempts} 次后仍无法生成合格关卡，使用最后一次生成的关卡`)
  const mirrorCount = getMirrorCountForSize(gameState.size)
  gameState.level = generateLevel(gameState.size, mirrorCount)
}

// 构建空的网格
function buildEmptyGrid(size) {
  const grid = []
  for (let r = 0; r < size; r++) {
    const row = []
    for (let c = 0; c < size; c++) {
      row.push({ row: r, col: c })
    }
    grid.push(row)
  }
  return grid
}

// 创建引导示例关卡（简单的2x2示例）
function createTutorialDemo() {
  // 创建一个简单的2x2关卡，左上角有一个 \ 镜子
  const grid = buildEmptyGrid(2)
  grid[0][0].mirror = '\\'
  
  // 计算线索
  const clues = calculateClues(grid)
  
  return {
    grid: grid,
    clues: clues
  }
}

// 初始化引导示例
function initTutorialDemo() {
  if (!gameState.tutorialDemo) {
    gameState.tutorialDemo = createTutorialDemo()
    gameState.tutorialDemoMirrors = {}
    gameState.tutorialDemoClues = null
  }
}

// 更新引导示例的线索
function updateTutorialDemoClues() {
  if (!gameState.tutorialDemo) return
  
  const demoGrid = []
  for (let r = 0; r < 2; r++) {
    const row = []
    for (let c = 0; c < 2; c++) {
      const key = `${r},${c}`
      const mirror = gameState.tutorialDemoMirrors[key] || gameState.tutorialDemo.grid[r][c].mirror || null
      row.push({ row: r, col: c, mirror })
    }
    demoGrid.push(row)
  }
  
  gameState.tutorialDemoClues = calculateClues(demoGrid)
}

// 检查线索是否与答案匹配
function checkSolvedForLevel(currentClues, level) {
  if (!level) return false
  
  const sides = ['top', 'bottom', 'left', 'right']
  for (const side of sides) {
    for (let i = 0; i < gameState.size; i++) {
      // 困难模式：只检查显示的线索
      const clueKey = `${side}-${i}`
      if (gameState.hardMode && gameState.hiddenClues && gameState.hiddenClues.has(clueKey)) {
        // 隐藏的线索不检查
        continue
      }
      
      if (currentClues[side][i] !== level.clues[side][i]) {
        return false
      }
    }
  }
  return true
}

// 构建当前网格
function buildCurrentGrid() {
  const size = gameState.size
  const grid = []
  for (let r = 0; r < size; r++) {
    const row = []
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`
      const mirror = gameState.currentMirrors[key]
      row.push({ row: r, col: c, mirror })
    }
    grid.push(row)
  }
  return grid
}

// 构建答案网格
function buildAnswerGrid() {
  const size = gameState.size
  const grid = []
  if (!gameState.level) return grid
  
  for (let r = 0; r < size; r++) {
    const row = []
    for (let c = 0; c < size; c++) {
      const mirror = gameState.level.grid[r][c].mirror
      row.push({ row: r, col: c, mirror })
    }
    grid.push(row)
  }
  return grid
}

// 更新当前线索
function updateCurrentClues() {
  if (!gameState.level) return
  
  const currentGrid = buildCurrentGrid()
  const currentClues = calculateClues(currentGrid)
  
  const isSolved = checkSolved(currentClues)
  const wasSolved = gameState.isSolved
  
  gameState.currentClues = currentClues
  gameState.isSolved = isSolved
  
  // 只有在未查看过答案的情况下才给奖励
  if (isSolved && !wasSolved && !gameState.hasEarnedCoins && !gameState.hasViewedAnswer) {
    rewardCoins()
  }
  
  drawGame()
}

// 检查是否通关
function checkSolved(currentClues) {
  const { level } = gameState
  if (!level || !currentClues) return false
  
  // 使用checkSolvedForLevel函数，它已经正确处理了困难模式下的隐藏线索
  return checkSolvedForLevel(currentClues, level)
}

// 奖励积分
function rewardCoins() {
  // 奖励 = 当前画布上的镜子数量
  const reward = Object.keys(gameState.currentMirrors).length
  const newCoins = addMirrorCoins(reward)
  gameState.mirrorCoins = newCoins
  gameState.hasEarnedCoins = true
  
  wx.showToast({
    title: `获得 ${reward} 个镜子！`,
    icon: 'success',
    duration: 2000
  })
}

// 计算网格位置和大小（统一函数，供绘制和触摸事件使用）
function calculateGridPosition(windowWidth, windowHeight) {
  const { size } = gameState
  const minEdgeMargin = 10
  const topSpace = 100
  const bottomSpace = 100
  const clueSpace = 25
  
  const availableWidth = windowWidth - minEdgeMargin * 2
  const availableHeight = windowHeight - topSpace - bottomSpace - minEdgeMargin * 2
  
  const clueSize = 24
  const sideClueSpace = clueSize + clueSpace
  const gridWidthWithClues = availableWidth - sideClueSpace * 2
  const gridHeightWithClues = availableHeight - clueSize * 2 - clueSpace
  
  const cellSizeByWidth = Math.floor(gridWidthWithClues / size)
  const cellSizeByHeight = Math.floor(gridHeightWithClues / size)
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight, 50)
  
  const gridWidth = size * cellSize + config.gridPadding * 2
  const gridHeight = size * cellSize + config.gridPadding * 2
  
  const totalWidth = gridWidth + sideClueSpace * 2
  const gridX = (windowWidth - totalWidth) / 2 + sideClueSpace
  const gridY = topSpace + clueSize + clueSpace / 2
  
  return {
    gridX,
    gridY,
    gridWidth,
    gridHeight,
    cellSize,
    clueSize,
    sideClueSpace
  }
}

// 绘制游戏界面
function drawGame() {
  if (!ctx || !gameState.level) return
  
  const info = getSystemInfo()
  const { windowWidth, windowHeight } = info
  
  // 清空画布
  ctx.clearRect(0, 0, windowWidth, windowHeight)
  
  // 渐变背景
  drawGradientBackground()
  
  // 积分显示（右上角）
  const coinCardWidth = 120
  const coinCardHeight = 40
  const coinCardX = windowWidth - coinCardWidth - 20
  const coinCardY = 20
  
  drawRoundedRectWithShadow(coinCardX, coinCardY, coinCardWidth, coinCardHeight, 20, 'rgba(255, 255, 255, 0.9)', '#FFC1CC', 2, 8) // 柔粉边框
  
  ctx.fillStyle = '#FF6B81' // 深一点的糖果粉
  ctx.font = 'bold 18px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText(`🪞 ${gameState.mirrorCoins}`, coinCardX + coinCardWidth / 2, coinCardY + coinCardHeight / 2 + 6)
  
  // 标题
  ctx.fillStyle = '#B39DDB' // 梦幻紫
  ctx.font = 'bold 28px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(206, 147, 216, 0.3)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillText(`✨ ${gameState.size}×${gameState.size} 关卡 ✨`, windowWidth / 2, 60)
  if (gameState.isSolved) {
    ctx.fillStyle = '#81C784'
    ctx.font = 'bold 20px STKaiti, KaiTi, STSong, SimSun, serif'
    ctx.fillText('✅ 已解决！', windowWidth / 2, 90)
  }
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  
  // 使用统一函数计算网格位置和大小
  const gridInfo = calculateGridPosition(windowWidth, windowHeight)
  const { gridX, gridY, gridWidth, gridHeight, cellSize, clueSize } = gridInfo
  
  // 保存计算出的尺寸供其他函数使用
  gameState.currentCellSize = cellSize
  gameState.currentClueSize = clueSize
  
  // 绘制网格
  drawGrid(gridX, gridY)
  
  // 绘制线索
  drawClues(gridX, gridY)
  
  // 绘制镜子
  drawMirrors(gridX, gridY)
  
  // 绘制光线路径（根据标志决定显示什么：提示光路或当前光路）
  if (gameState.showHintPaths || gameState.showAllLightPaths || gameState.showCurrentLightPaths) {
    drawLightPaths(gridX, gridY)
  }
  
  // 绘制清空按钮（格子右下角）
  drawClearButton(gridX, gridY)
  
  // 绘制按钮
  drawButtons(windowWidth, windowHeight)
  
  // 如果通关，显示提示
  if (gameState.isSolved) {
    const solvedY = gridY + gridHeight + 20
    const solvedWidth = gridWidth + sideClueSpace * 2
    const solvedX = (windowWidth - solvedWidth) / 2
    drawRoundedRectWithShadow(solvedX, solvedY, solvedWidth, 50, 8, '#81C784', null, 0, 8)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 18px STKaiti, KaiTi, STSong, SimSun, serif'
    ctx.textAlign = 'center'
    ctx.fillText('🎉 恭喜！你解开了！', solvedX + solvedWidth / 2, solvedY + 30)
  }
}

// 绘制网格
function drawGrid(gridX, gridY) {
  const { size } = gameState
  const cellSize = gameState.currentCellSize || 35  // 使用动态计算的格子大小
  const padding = config.gridPadding
  const gridWidth = size * cellSize + padding * 2
  const gridHeight = size * cellSize + padding * 2
  
  // 计算内部网格的位置（考虑padding）
  const innerGridX = gridX + padding
  const innerGridY = gridY + padding
  const gridSize = size * cellSize
  
  // 绘制网格背景 - 莫兰迪灰蓝，无圆角，边缘锋利，调浅
  ctx.beginPath()
  ctx.rect(innerGridX, innerGridY, gridSize, gridSize)
  ctx.fillStyle = '#F0F4F8'  // 更浅的灰蓝色
  ctx.fill()
  
  // 绘制网格线 - 莫兰迪灰蓝，根据格子数量动态调整粗细
  ctx.strokeStyle = '#B8C4D1'
  // 格子越多，线越细：去掉最小值限制
  ctx.lineWidth = 1 / Math.sqrt(size)
  for (let i = 0; i <= size; i++) {
    const pos = innerGridX + i * cellSize
    ctx.beginPath()
    ctx.moveTo(pos, innerGridY)
    ctx.lineTo(pos, innerGridY + size * cellSize)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(innerGridX, innerGridY + i * cellSize)
    ctx.lineTo(innerGridX + size * cellSize, innerGridY + i * cellSize)
    ctx.stroke()
  }
  
  // 绘制格子背景 - 无圆角，不透明，边缘锋利
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cellX = innerGridX + c * cellSize
      const cellY = innerGridY + r * cellSize
      ctx.beginPath()
      ctx.rect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4)
      ctx.fillStyle = '#FFFFFF'  // 不透明白色
      ctx.fill()
    }
  }
}

// 绘制线索
function drawClues(gridX, gridY) {
  const { size, level, currentClues } = gameState
  if (!level) return
  
  const cellSize = gameState.currentCellSize || 35  // 使用动态计算的格子大小
  const padding = config.gridPadding
  const clueSize = gameState.currentClueSize || 28  // 使用动态计算的线索大小
  const sideClueSpace = clueSize + 8  // 左右侧线索空间
  
  const sides = [
    { name: 'top', x: 0, y: -1 },
    { name: 'bottom', x: 0, y: 1 },
    { name: 'left', x: -1, y: 0 },
    { name: 'right', x: 1, y: 0 }
  ]
  
  sides.forEach(side => {
    for (let i = 0; i < size; i++) {
      // 困难模式：检查这个线索是否被隐藏
      const clueKey = `${side.name}-${i}`
      if (gameState.hardMode && gameState.hiddenClues && gameState.hiddenClues.has(clueKey)) {
        // 隐藏的线索不绘制
        continue
      }
      
      // 计算线索位置（在网格边缘外侧）
      let clueX, clueY
      if (side.name === 'top') {
        clueX = gridX + padding + i * cellSize + cellSize / 2
        clueY = gridY - clueSize / 2 - 5
      } else if (side.name === 'bottom') {
        clueX = gridX + padding + i * cellSize + cellSize / 2
        clueY = gridY + padding + size * cellSize + clueSize / 2 + 5
      } else if (side.name === 'left') {
        clueX = gridX - sideClueSpace + clueSize / 2
        clueY = gridY + padding + i * cellSize + cellSize / 2
      } else { // right
        clueX = gridX + padding + size * cellSize + sideClueSpace - clueSize / 2
        clueY = gridY + padding + i * cellSize + cellSize / 2
      }
      
      const answerValue = level.clues[side.name][i]
      const currentValue = currentClues ? currentClues[side.name][i] : answerValue
      const isCorrect = currentClues ? (currentValue === answerValue) : true
      
      // 检查是否被选中
      const lightKey = `${side.name}-${i}`
      const isSelected = gameState.selectedLights.has(lightKey)
      
      // 内圈：线索背景（圆角，正确时梦幻绿，错误时梦幻粉）
      drawRoundedRect(clueX - clueSize / 2, clueY - clueSize / 2, clueSize, clueSize, 6)
      if (isSelected) {
        // 选中状态：使用更明显的颜色
        ctx.fillStyle = '#CE93D8' // 紫色高亮
      } else {
        ctx.fillStyle = isCorrect ? '#B2DFDB' : '#FFCDD2'
      }
      ctx.fill()
      
      // 边框（选中时加粗，白色）
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = isSelected ? 3 : 1
      ctx.stroke()
      
      // 重置阴影
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // 内圈文字：始终显示正确答案（白色，居中），减小字号
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 14px STKaiti, KaiTi, STSong, SimSun, serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(answerValue.toString(), clueX, clueY)
      
      // 外圈：如果错误，在背景框外侧显示红色错误数字（当前值），减小字号
      if (!isCorrect && currentClues) {
        ctx.fillStyle = '#FF0000'
        ctx.font = 'bold 11px STKaiti, KaiTi, STSong, SimSun, serif'
        if (side.name === 'top') {
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(currentValue.toString(), clueX, clueY - clueSize / 2 - 8)
        } else if (side.name === 'bottom') {
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillText(currentValue.toString(), clueX, clueY + clueSize / 2 + 8)
        } else if (side.name === 'left') {
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.fillText(currentValue.toString(), clueX - clueSize / 2 - 8, clueY)
        } else { // right
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillText(currentValue.toString(), clueX + clueSize / 2 + 8, clueY)
        }
      }
    }
  })
}

// 绘制镜子
function drawMirrors(gridX, gridY) {
  const { size, level, currentMirrors, noMirrorMarks, showAnswer } = gameState
  if (!level) return
  
  const cellSize = gameState.currentCellSize || 35  // 使用动态计算的格子大小
  const padding = config.gridPadding
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`
      const cellX = gridX + padding + c * cellSize
      const cellY = gridY + padding + r * cellSize
      const centerX = cellX + cellSize / 2
      const centerY = cellY + cellSize / 2
      
      const userMirror = currentMirrors[key]
      const answerMirror = level.grid[r][c].mirror
      const noMirrorMark = !!noMirrorMarks[key]
      
      // 显示答案时绘制答案镜子（半透明灰色），根据格子数量动态调整粗细
      if (showAnswer && answerMirror && !userMirror) {
        ctx.strokeStyle = '#999999'
        // 格子越多，线越细
        ctx.lineWidth = Math.max(0.5, 6 / Math.sqrt(size))
        ctx.globalAlpha = 0.4
        if (answerMirror === '\\') {
          ctx.beginPath()
          ctx.moveTo(cellX + 5, cellY + 5)
          ctx.lineTo(cellX + cellSize - 5, cellY + cellSize - 5)
          ctx.stroke()
        } else if (answerMirror === '/') {
          ctx.beginPath()
          ctx.moveTo(cellX + cellSize - 5, cellY + 5)
          ctx.lineTo(cellX + 5, cellY + cellSize - 5)
          ctx.stroke()
        }
        ctx.globalAlpha = 1.0
      }
      
      // 绘制用户放置的镜子（棕色，无阴影，边缘锋利），根据格子数量动态调整粗细
      if (userMirror) {
        ctx.strokeStyle = '#8B4513'
        // 格子越多，线越细
        ctx.lineWidth = Math.max(0.5, 8 / Math.sqrt(size))
        // 确保没有阴影效果
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        if (userMirror === '\\') {
          ctx.beginPath()
          ctx.moveTo(cellX + 5, cellY + 5)
          ctx.lineTo(cellX + cellSize - 5, cellY + cellSize - 5)
          ctx.stroke()
        } else if (userMirror === '/') {
          ctx.beginPath()
          ctx.moveTo(cellX + cellSize - 5, cellY + 5)
          ctx.lineTo(cellX + 5, cellY + cellSize - 5)
          ctx.stroke()
        }
      }
      
      // 绘制"无镜子"标记（手写风格英文）
      if (noMirrorMark && !userMirror) {
        ctx.fillStyle = '#999999'
        // 使用手写风格的字体，更随意
        ctx.font = 'italic bold 18px "Comic Sans MS", "Marker Felt", "Chalkboard", "Bradley Hand", cursive'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // 基于格子坐标生成固定的伪随机偏移，让每个标记看起来更随意但位置固定
        const seed = r * 7 + c * 13
        const offsetX = (seed % 5 - 2) * 0.8
        const offsetY = ((seed * 3) % 5 - 2) * 0.8
        ctx.fillText('no', centerX + offsetX, centerY + offsetY)
      }
    }
  }
}

// 绘制光线路径
function drawLightPaths(gridX, gridY) {
  const { size, level } = gameState
  if (!level) return
  
  const cellSize = gameState.currentCellSize || 35  // 使用动态计算的格子大小
  const padding = config.gridPadding
  const gridWidth = size * cellSize + padding * 2
  const gridHeight = size * cellSize + padding * 2
  
  const getEntryExitPoint = (side, index) => {
    switch (side) {
      case 'top':
        return { x: gridX + padding + index * cellSize + cellSize / 2, y: gridY }
      case 'bottom':
        return { x: gridX + padding + index * cellSize + cellSize / 2, y: gridY + gridHeight }
      case 'left':
        return { x: gridX, y: gridY + padding + index * cellSize + cellSize / 2 }
      case 'right':
        return { x: gridX + gridWidth, y: gridY + padding + index * cellSize + cellSize / 2 }
      default:
        return { x: 0, y: 0 }
    }
  }
  
  const getCellCenter = (r, c) => {
    return {
      x: gridX + padding + c * cellSize + cellSize / 2,
      y: gridY + padding + r * cellSize + cellSize / 2
    }
  }
  
  // 如果显示提示光路且有提示路径，只绘制提示光路，不绘制当前光路
  if (gameState.showHintPaths && gameState.hintPaths.size > 0) {
    const answerGrid = buildAnswerGrid()
    const sides = ['top', 'bottom', 'left', 'right']
    
    // 将hintPaths转换为数组，以便按顺序分配颜色
    const hintPathsArray = Array.from(gameState.hintPaths)
    // 定义提示光路颜色：第一条是黑色，后续是深浅不一的深灰色（不按深浅顺序）
    const hintColors = ['#000000', '#6E6E6E', '#333333', '#808080', '#4A4A4A', '#929292', '#5C5C5C', '#A4A4A4']
    
    // 绘制提示光线（答案光路）
    hintPathsArray.forEach((hintKey, hintIndex) => {
      const [side, indexStr] = hintKey.split('-')
      const index = parseInt(indexStr)
      
      if (sides.includes(side) && index >= 0 && index < size) {
        const result = traceRay(answerGrid, { side, index })
        if (result.exit && result.path) {
          const entryPoint = getEntryExitPoint(side, index)
          const exitPoint = getEntryExitPoint(result.exit.side, result.exit.index)
          
          const points = [entryPoint]
          result.path.forEach((p) => {
            const center = getCellCenter(p.r, p.c)
            points.push(center)
          })
          points.push(exitPoint)
          
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y)
          }
          
          // 第一条提示是黑色，后续是深浅不一的深灰色
          const colorIndex = Math.min(hintIndex, hintColors.length - 1)
          ctx.strokeStyle = hintColors[colorIndex]
          ctx.lineWidth = Math.max(1, 5 / Math.sqrt(size))
          ctx.setLineDash([])
          ctx.globalAlpha = 0.8
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1.0
        }
      }
    })
    // 显示提示光路时，直接返回，不绘制当前光路
    return
  }
  
  // 如果不显示提示光路（或提示光路为空），绘制当前光路
  const currentGrid = buildCurrentGrid()
  const paths = []
  const sides = ['top', 'bottom', 'left', 'right']
  
  for (const side of sides) {
    for (let i = 0; i < size; i++) {
      const result = traceRay(currentGrid, { side, index: i })
      if (result.exit && result.path) {
        paths.push({
          entry: { side, index: i },
          exit: result.exit,
          path: result.path
        })
      }
    }
  }
  
  if (paths.length === 0) return
  
  const pathColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']
  
  // 如果选中了多条光线，为选中的光线分配不同的颜色（使用原来的颜色数组）
  // 重新排列颜色，避免相近颜色一起出现：
  // 红色系：'#FF6B6B', '#FFA07A'
  // 蓝绿色系：'#4ECDC4', '#45B7D1', '#98D8C8', '#85C1E2'
  // 其他：'#F7DC6F' (黄色), '#BB8FCE' (紫色)
  // 重新排列为：红、蓝绿、黄、红、蓝绿、紫、蓝绿、蓝绿
  const optimizedColors = ['#FF6B6B', '#4ECDC4', '#F7DC6F', '#FFA07A', '#45B7D1', '#BB8FCE', '#98D8C8', '#85C1E2']
  
  const selectedLightColorMap = new Map()
  if (gameState.selectedLights.size > 0) {
    let colorIndex = 0
    // 为每条选中的光线分配一个颜色索引（使用优化后的颜色顺序）
    gameState.selectedLights.forEach((lightKey) => {
      selectedLightColorMap.set(lightKey, colorIndex)
      colorIndex++
    })
  }
  
  paths.forEach((pathData, pathIdx) => {
    // 如果选中了光线，只显示选中的光线
    if (gameState.selectedLights.size > 0) {
      const lightKey = `${pathData.entry.side}-${pathData.entry.index}`
      if (!gameState.selectedLights.has(lightKey)) {
        return // 跳过非选中的光线
      }
    }
    
    // 如果选中了多条光线，使用优化后的颜色数组，确保每条光线使用不同的颜色且不相近
    let pathColor
    if (gameState.selectedLights.size > 0) {
      const lightKey = `${pathData.entry.side}-${pathData.entry.index}`
      const colorIndex = selectedLightColorMap.get(lightKey) || 0
      pathColor = optimizedColors[colorIndex % optimizedColors.length]
    } else {
      pathColor = pathColors[pathIdx % pathColors.length]
    }
    
    const entryPoint = getEntryExitPoint(pathData.entry.side, pathData.entry.index)
    const exitPoint = getEntryExitPoint(pathData.exit.side, pathData.exit.index)
    
    const points = [entryPoint]
    pathData.path.forEach((p) => {
      const center = getCellCenter(p.r, p.c)
      points.push(center)
    })
    points.push(exitPoint)
    
    // 绘制路径
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    
    const isHighlighted = gameState.highlightedPaths.has(pathIdx)
    const lightKey = `${pathData.entry.side}-${pathData.entry.index}`
    const isSelected = gameState.selectedLights.has(lightKey)
    
    // 如果选中了光线，只显示选中的光线（实线、加粗、不透明）
    if (isSelected) {
      ctx.strokeStyle = pathColor
      ctx.lineWidth = Math.max(1, 6 / Math.sqrt(size))
      ctx.setLineDash([])
      ctx.globalAlpha = 1.0
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1.0
      return
    }
    
    // 根据按钮状态决定是否绘制
    // 实线（当前光线）：只有showCurrentLightPaths为true且isHighlighted为true时绘制
    // 虚线（全部光线）：只有showAllLightPaths为true且isHighlighted为false时绘制
    if (isHighlighted && !gameState.showCurrentLightPaths) {
      return  // 不显示当前光线，跳过
    }
    if (!isHighlighted && !gameState.showAllLightPaths) {
      return  // 不显示全部光线，跳过
    }
    
    ctx.strokeStyle = pathColor
    // 根据格子数量动态调整光线粗细：格子越多，光线越细
    if (isHighlighted) {
      // 高亮路径：实线，不透明，加粗至原来的1.5倍
      ctx.lineWidth = Math.max(0.5, 4 / Math.sqrt(size)) * 1.5
      ctx.setLineDash([])
      ctx.globalAlpha = 1.0
    } else {
      // 普通路径：虚线，去掉最小值限制
      ctx.lineWidth = 4 / Math.sqrt(size)
      ctx.setLineDash([8, 4])
      ctx.globalAlpha = 0.35  // 拉高50%透明度（从0.7变成0.35）
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1.0
  })
}

// 绘制清空按钮（格子外面，右下角）
function drawClearButton(gridX, gridY) {
  const { size } = gameState
  const cellSize = gameState.currentCellSize || 35
  const padding = config.gridPadding
  const gridWidth = size * cellSize + padding * 2
  const gridHeight = size * cellSize + padding * 2
  
  // 按钮尺寸
  const buttonWidth = 60
  const buttonHeight = 30
  const buttonX = gridX + gridWidth - buttonWidth + 32  // 再右移20px（从12改为32）
  const buttonY = gridY + gridHeight + 48  // 再下移3px（从45改为48）
  
  // 保存按钮位置供触摸事件使用
  gameState.clearButtonBounds = {
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight
  }
  
  // 绘制按钮背景（浅灰色，圆角）
  drawRoundedRectWithShadow(buttonX, buttonY, buttonWidth, buttonHeight, 8, '#E0E0E0', null, 0, 4)
  
  // 绘制按钮文字
  ctx.fillStyle = '#666666'
  ctx.font = 'bold 14px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🗑️ 清空', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 1)
}

// 绘制按钮
function drawButtons(windowWidth, windowHeight) {
  const buttonHeight = 45
  const buttonSpacing = 12
  const bottomMargin = 20
  
  // 第零行按钮（提示按钮和显示提示光线开关）- 在新关卡上面
  const zeroRowY = windowHeight - bottomMargin - buttonHeight - buttonSpacing - buttonHeight - buttonSpacing - buttonHeight
  const buttonWidth = (windowWidth - buttonSpacing * 3) / 2
  
  // 提示按钮（淡橙色，在新关卡上面）
  const hintButtonX = buttonSpacing
  const size = gameState.size
  // 计算提示价格：第1次免费，第2次n，第3次2n，3n封顶
  let hintCost = 0
  if (gameState.hintCount === 0) {
    hintCost = 0  // 免费
  } else if (gameState.hintCount === 1) {
    hintCost = size  // n 个镜子
  } else if (gameState.hintCount === 2) {
    hintCost = 2 * size  // 2n 个镜子
  } else {
    hintCost = 3 * size  // 3n 封顶
  }
  const hintButtonColor = '#FFD9B3'  // 淡橙色
  drawRoundedRectWithShadow(hintButtonX, zeroRowY, buttonWidth, buttonHeight, 12, hintButtonColor, null, 0, 4)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 18px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  const hintText = hintCost === 0 ? '💡 提示(免费)' : `💡 提示(${hintCost})`
  ctx.fillText(hintText, hintButtonX + buttonWidth / 2, zeroRowY + buttonHeight / 2 + 4)
  
  // 显示提示光线开关按钮（在提示按钮右边）
  const showHintButtonX = windowWidth - buttonWidth - buttonSpacing
  const showHintButtonColor = gameState.showHintPaths ? '#D0F0C0' : '#E0E0E0'
  drawRoundedRectWithShadow(showHintButtonX, zeroRowY, buttonWidth, buttonHeight, 12, showHintButtonColor, null, 0, 4)
  ctx.fillStyle = gameState.showHintPaths ? '#689F38' : '#FFFFFF'
  ctx.font = 'bold 18px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText('💡 提示光线', showHintButtonX + buttonWidth / 2, zeroRowY + buttonHeight / 2 + 4)
  
  // 第一行按钮（新关卡和答案按钮）
  const firstRowY = windowHeight - bottomMargin - buttonHeight - buttonSpacing - buttonHeight
  const firstRowButtonWidth = (windowWidth - buttonSpacing * 3) / 2  // 两个按钮，三个间距（左右各一个，中间一个）
  
  // 新关卡按钮（淡蓝色）
  const newLevelX = buttonSpacing
  drawRoundedRectWithShadow(newLevelX, firstRowY, firstRowButtonWidth, buttonHeight, 12, '#B2CEFE', null, 0, 4)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 18px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText('✨ 新关卡', newLevelX + firstRowButtonWidth / 2, firstRowY + buttonHeight / 2 + 4)
  
  // 显示答案按钮（淡紫色）
  const answerButtonX = windowWidth - firstRowButtonWidth - buttonSpacing
  const answerCost = size * size  // 看答案消耗 n*n 个镜子
  const answerButtonColor = gameState.showAnswer ? '#FEC8D8' : '#E0BBE4'
  drawRoundedRectWithShadow(answerButtonX, firstRowY, firstRowButtonWidth, buttonHeight, 12, answerButtonColor, null, 0, 4)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 18px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  const answerText = gameState.showAnswer ? '🙈 隐藏答案' : `👁️ 答案(${answerCost})`
  ctx.fillText(answerText, answerButtonX + firstRowButtonWidth / 2, firstRowY + buttonHeight / 2 + 4)
  
  // 第二行按钮（返回按钮和光线开关）
  const secondRowY = windowHeight - bottomMargin - buttonHeight
  
  // 返回按钮（左侧，鹅黄色背景）
  const backButtonWidth = 100
  const backButtonX = buttonSpacing
  drawRoundedRectWithShadow(backButtonX, secondRowY, backButtonWidth, buttonHeight, 25, '#FFF9E6', '#FFD93D', 2, 8)
  ctx.fillStyle = '#CE93D8'
  ctx.font = 'bold 20px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText('← 返回', backButtonX + backButtonWidth / 2, secondRowY + buttonHeight / 2 + 4)
  
  // 两个光线开关按钮（右侧）
  const remainingWidth = windowWidth - backButtonX - backButtonWidth - buttonSpacing * 4
  const lightButtonWidth = remainingWidth / 2
  const allLightX = backButtonX + backButtonWidth + buttonSpacing
  const currentLightX = allLightX + lightButtonWidth + buttonSpacing
  
  // 显示全部光线按钮
  const allLightColor = gameState.showAllLightPaths ? '#D0F0C0' : '#E0E0E0'
  drawRoundedRectWithShadow(allLightX, secondRowY, lightButtonWidth, buttonHeight, 12, allLightColor, null, 0, 4)
  ctx.fillStyle = gameState.showAllLightPaths ? '#689F38' : '#FFFFFF'
  ctx.font = 'bold 16px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText('💡 全部', allLightX + lightButtonWidth / 2, secondRowY + buttonHeight / 2 + 4)
  
  // 显示当前光线按钮
  const currentLightColor = gameState.showCurrentLightPaths ? '#D0F0C0' : '#E0E0E0'
  drawRoundedRectWithShadow(currentLightX, secondRowY, lightButtonWidth, buttonHeight, 12, currentLightColor, null, 0, 4)
  ctx.fillStyle = gameState.showCurrentLightPaths ? '#689F38' : '#FFFFFF'
  ctx.font = 'bold 16px STKaiti, KaiTi, STSong, SimSun, serif'
  ctx.textAlign = 'center'
  ctx.fillText('✨ 当前', currentLightX + lightButtonWidth / 2, secondRowY + buttonHeight / 2 + 4)
}

// 处理游戏界面触摸开始
function handleGameTouchStart(e) {
  // 小游戏的触摸事件结构：e.touches[0].clientX, e.touches[0].clientY
  const touch = e.touches && e.touches[0] ? e.touches[0] : (e.detail || e)
  const x = touch.clientX || touch.x || 0
  const y = touch.clientY || touch.y || 0
  
  const info = getSystemInfo()
  const { windowWidth, windowHeight } = info
  
  // 使用统一函数计算网格位置和大小
  const gridInfo = calculateGridPosition(windowWidth, windowHeight)
  const { gridX, gridY, gridWidth, gridHeight, cellSize } = gridInfo
  const { size } = gameState
  
  // 检查按钮点击（与新布局匹配）
  const buttonHeight = 45
  const buttonSpacing = 12
  const bottomMargin = 20
  
  // 第零行按钮（提示按钮和显示提示光线开关）
  const zeroRowY = windowHeight - bottomMargin - buttonHeight - buttonSpacing - buttonHeight - buttonSpacing - buttonHeight
  const buttonWidth = (windowWidth - buttonSpacing * 3) / 2
  const hintButtonX = buttonSpacing
  const showHintButtonX = windowWidth - buttonWidth - buttonSpacing
  
  // 第一行按钮（新关卡和答案按钮）
  const firstRowY = windowHeight - bottomMargin - buttonHeight - buttonSpacing - buttonHeight
  const firstRowButtonWidth = (windowWidth - buttonSpacing * 3) / 2
  
  // 检查是否点击了按钮（按钮点击不处理长按，但记录位置供TouchEnd处理）
  const newLevelX = buttonSpacing
  const answerButtonX = windowWidth - firstRowButtonWidth - buttonSpacing
  const secondRowY = windowHeight - bottomMargin - buttonHeight
  const backButtonWidth = 100
  const backButtonX = buttonSpacing
  const remainingWidth = windowWidth - backButtonX - backButtonWidth - buttonSpacing * 4
  const lightButtonWidth = remainingWidth / 2
  const allLightX = backButtonX + backButtonWidth + buttonSpacing
  const currentLightX = allLightX + lightButtonWidth + buttonSpacing
  
  // 记录触摸开始信息（用于TouchEnd处理按钮点击）
  gameState.touchStartTime = Date.now()
  gameState.touchStartPos = { x, y, isButton: false }
  
  if ((x >= hintButtonX && x <= hintButtonX + buttonWidth && y >= zeroRowY && y <= zeroRowY + buttonHeight) ||
      (x >= showHintButtonX && x <= showHintButtonX + buttonWidth && y >= zeroRowY && y <= zeroRowY + buttonHeight) ||
      (x >= newLevelX && x <= newLevelX + firstRowButtonWidth && y >= firstRowY && y <= firstRowY + buttonHeight) ||
      (x >= answerButtonX && x <= answerButtonX + firstRowButtonWidth && y >= firstRowY && y <= firstRowY + buttonHeight) ||
      (x >= backButtonX && x <= backButtonX + backButtonWidth && y >= secondRowY && y <= secondRowY + buttonHeight) ||
      (x >= allLightX && x <= allLightX + lightButtonWidth && y >= secondRowY && y <= secondRowY + buttonHeight) ||
      (x >= currentLightX && x <= currentLightX + lightButtonWidth && y >= secondRowY && y <= secondRowY + buttonHeight)) {
    // 点击了按钮，标记为按钮点击，不处理长按
    gameState.touchStartPos.isButton = true
    return
  }
  
  // 检查清空按钮点击
  if (gameState.clearButtonBounds) {
    const { x: clearX, y: clearY, width: clearWidth, height: clearHeight } = gameState.clearButtonBounds
    if (x >= clearX && x <= clearX + clearWidth && y >= clearY && y <= clearY + clearHeight) {
      gameState.touchStartPos.isButton = true
      gameState.touchStartPos.isClearButton = true
      return
    }
  }
  
  // 检查网格点击
  if (x >= gridX && x <= gridX + gridWidth && y >= gridY && y <= gridY + gridHeight) {
    const cellSize = gameState.currentCellSize || 35
    const cellX = x - gridX - config.gridPadding
    const cellY = y - gridY - config.gridPadding
    const c = Math.floor(cellX / cellSize)
    const r = Math.floor(cellY / cellSize)
    
    if (r >= 0 && r < size && c >= 0 && c < size) {
      // 记录触摸开始信息（网格点击）
      gameState.touchStartPos = { x, y, r, c, isButton: false }
      
      // 清除之前的定时器
      if (gameState.longPressTimer) {
        clearTimeout(gameState.longPressTimer)
      }
      
      // 设置长按定时器（500ms）
      gameState.longPressTimer = setTimeout(() => {
        // 检查是否还在同一个格子上
        if (gameState.touchStartPos && 
            gameState.touchStartPos.r === r && 
            gameState.touchStartPos.c === c) {
          handleCellLongPress(r, c)
        }
        gameState.longPressTimer = null
      }, 500)
    }
  }
}

// 处理游戏界面触摸结束
function handleGameTouchEnd(e) {
  // 清除长按定时器
  if (gameState.longPressTimer) {
    clearTimeout(gameState.longPressTimer)
    gameState.longPressTimer = null
  }
  
  // 处理按钮点击或普通点击
  if (gameState.touchStartPos && gameState.touchStartTime) {
    const touchDuration = Date.now() - gameState.touchStartTime
    const touch = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : (e.detail || e)
    const x = touch.clientX || touch.x || gameState.touchStartPos.x || 0
    const y = touch.clientY || touch.y || gameState.touchStartPos.y || 0
    
    // 如果是按钮点击，直接处理
    if (gameState.touchStartPos.isButton && touchDuration < 500) {
      const info = getSystemInfo()
      const { windowWidth, windowHeight } = info
      
      const buttonHeight = 45
      const buttonSpacing = 12
      const bottomMargin = 20
      
      // 第零行按钮（提示按钮和显示提示光线开关）
      const zeroRowY = windowHeight - bottomMargin - buttonHeight - buttonSpacing - buttonHeight - buttonSpacing - buttonHeight
      const buttonWidth = (windowWidth - buttonSpacing * 3) / 2
      const hintButtonX = buttonSpacing
      const showHintButtonX = windowWidth - buttonWidth - buttonSpacing
      
      // 第一行按钮（新关卡和答案按钮）
      const firstRowY = windowHeight - bottomMargin - buttonHeight - buttonSpacing - buttonHeight
      const firstRowButtonWidth = (windowWidth - buttonSpacing * 3) / 2
      const newLevelX = buttonSpacing
      const answerButtonX = windowWidth - firstRowButtonWidth - buttonSpacing
      const secondRowY = windowHeight - bottomMargin - buttonHeight
      const backButtonWidth = 100
      const backButtonX = buttonSpacing
      const switchWidth = windowWidth - backButtonX - backButtonWidth - buttonSpacing * 3
      const switchX = backButtonX + backButtonWidth + buttonSpacing
      
      // 提示按钮
      if (x >= hintButtonX && x <= hintButtonX + buttonWidth && y >= zeroRowY && y <= zeroRowY + buttonHeight) {
        handleHintClick()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 显示提示光线开关按钮
      if (x >= showHintButtonX && x <= showHintButtonX + buttonWidth && y >= zeroRowY && y <= zeroRowY + buttonHeight) {
        gameState.showHintPaths = !gameState.showHintPaths
        // 如果开启提示光路，强制关闭当前光路显示
        if (gameState.showHintPaths) {
          gameState.showAllLightPaths = false
          gameState.showCurrentLightPaths = false
        } else {
          // 如果关闭提示光路，默认仅开启当前光线，并清空高亮路径（避免显示过多）
          gameState.highlightedPaths.clear()
          gameState.showCurrentLightPaths = true
          gameState.showAllLightPaths = false
        }
        drawGame()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 新关卡按钮
      if (x >= newLevelX && x <= newLevelX + firstRowButtonWidth && y >= firstRowY && y <= firstRowY + buttonHeight) {
        generateNewLevel()
        updateCurrentClues()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 显示答案按钮
      if (x >= answerButtonX && x <= answerButtonX + firstRowButtonWidth && y >= firstRowY && y <= firstRowY + buttonHeight) {
        toggleShowAnswer()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 返回按钮
      if (x >= backButtonX && x <= backButtonX + backButtonWidth && y >= secondRowY && y <= secondRowY + buttonHeight) {
        gameState.screen = 'menu'
        drawMenu()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 光线开关按钮
      const remainingWidth = windowWidth - backButtonX - backButtonWidth - buttonSpacing * 4
      const lightButtonWidth = remainingWidth / 2
      const allLightX = backButtonX + backButtonWidth + buttonSpacing
      const currentLightX = allLightX + lightButtonWidth + buttonSpacing
      
      // 显示全部光线按钮
      if (x >= allLightX && x <= allLightX + lightButtonWidth && y >= secondRowY && y <= secondRowY + buttonHeight) {
        // 如果提示光路开启，先关闭提示光路
        if (gameState.showHintPaths) {
          gameState.showHintPaths = false
        }
        gameState.showAllLightPaths = !gameState.showAllLightPaths
        // 如果开启全部光线，默认也开启当前光线
        if (gameState.showAllLightPaths && !gameState.showCurrentLightPaths) {
          gameState.showCurrentLightPaths = true
        }
        drawGame()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 显示当前光线按钮
      if (x >= currentLightX && x <= currentLightX + lightButtonWidth && y >= secondRowY && y <= secondRowY + buttonHeight) {
        // 如果提示光路开启，先关闭提示光路
        if (gameState.showHintPaths) {
          gameState.showHintPaths = false
        }
        gameState.showCurrentLightPaths = !gameState.showCurrentLightPaths
        // 如果关闭当前光线，但全部光线还开着，则也关闭全部光线（不能显示全部光线但不显示当前光线）
        if (!gameState.showCurrentLightPaths && gameState.showAllLightPaths) {
          gameState.showAllLightPaths = false
        }
        drawGame()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 清空按钮
      if (gameState.touchStartPos && gameState.touchStartPos.isClearButton) {
        if (gameState.clearButtonBounds) {
          const { x: clearX, y: clearY, width: clearWidth, height: clearHeight } = gameState.clearButtonBounds
          if (x >= clearX && x <= clearX + clearWidth && y >= clearY && y <= clearY + clearHeight) {
            // 二次确认
            wx.showModal({
              title: '确认清空',
              content: '确定要清空所有镜子和标记吗？此操作不可撤销。',
              confirmText: '确定',
              cancelText: '取消',
              success: (res) => {
                if (res.confirm) {
                  // 清空所有镜子和"no"标记
                  gameState.currentMirrors = {}
                  gameState.noMirrorMarks = {}
                  updateCurrentClues()
                }
                gameState.touchStartPos = null
                gameState.touchStartTime = 0
              },
              fail: () => {
                gameState.touchStartPos = null
                gameState.touchStartTime = 0
              }
            })
            return
          }
        }
      }
    }
    
    // 如果不是长按，则处理为普通点击
    if (touchDuration < 500 && !gameState.touchStartPos.isButton) {
      const info = getSystemInfo()
      const { windowWidth, windowHeight } = info
      
      // 使用统一函数计算网格位置和大小
      const gridInfo = calculateGridPosition(windowWidth, windowHeight)
      const { gridX, gridY, gridWidth, gridHeight, cellSize } = gridInfo
      const { size } = gameState
      
      // 先检查是否点击了线索
      const clueSize = gameState.currentClueSize || 28
      const sideClueSpace = clueSize + 8
      const padding = config.gridPadding
      let clickedClue = null
      
      // 检查顶部线索
      for (let i = 0; i < size; i++) {
        const clueX = gridX + padding + i * cellSize + cellSize / 2
        const clueY = gridY - clueSize / 2 - 5
        const clueHalfSize = clueSize / 2 + 5 // 增加点击区域
        if (x >= clueX - clueHalfSize && x <= clueX + clueHalfSize &&
            y >= clueY - clueHalfSize && y <= clueY + clueHalfSize) {
          clickedClue = { side: 'top', index: i }
          break
        }
      }
      
      // 检查底部线索
      if (!clickedClue) {
        for (let i = 0; i < size; i++) {
          const clueX = gridX + padding + i * cellSize + cellSize / 2
          const clueY = gridY + padding + size * cellSize + clueSize / 2 + 5
          const clueHalfSize = clueSize / 2 + 5
          if (x >= clueX - clueHalfSize && x <= clueX + clueHalfSize &&
              y >= clueY - clueHalfSize && y <= clueY + clueHalfSize) {
            clickedClue = { side: 'bottom', index: i }
            break
          }
        }
      }
      
      // 检查左侧线索
      if (!clickedClue) {
        for (let i = 0; i < size; i++) {
          const clueX = gridX - sideClueSpace + clueSize / 2
          const clueY = gridY + padding + i * cellSize + cellSize / 2
          const clueHalfSize = clueSize / 2 + 5
          if (x >= clueX - clueHalfSize && x <= clueX + clueHalfSize &&
              y >= clueY - clueHalfSize && y <= clueY + clueHalfSize) {
            clickedClue = { side: 'left', index: i }
            break
          }
        }
      }
      
      // 检查右侧线索
      if (!clickedClue) {
        for (let i = 0; i < size; i++) {
          const clueX = gridX + padding + size * cellSize + sideClueSpace - clueSize / 2
          const clueY = gridY + padding + i * cellSize + cellSize / 2
          const clueHalfSize = clueSize / 2 + 5
          if (x >= clueX - clueHalfSize && x <= clueX + clueHalfSize &&
              y >= clueY - clueHalfSize && y <= clueY + clueHalfSize) {
            clickedClue = { side: 'right', index: i }
            break
          }
        }
      }
      
      // 如果点击了线索，处理线索点击
      if (clickedClue) {
        const lightKey = `${clickedClue.side}-${clickedClue.index}`
        // 如果已经选中，则取消选中；否则添加到选中集合
        if (gameState.selectedLights.has(lightKey)) {
          gameState.selectedLights.delete(lightKey)
          // 如果所有光线都取消选中，清空高亮路径
          if (gameState.selectedLights.size === 0) {
            gameState.highlightedPaths.clear()
          }
        } else {
          gameState.selectedLights.add(lightKey)
          // 选中新光线时，清空之前的高亮路径
          gameState.highlightedPaths.clear()
        }
        // 确保光线显示开启
        if (!gameState.showCurrentLightPaths) {
          gameState.showCurrentLightPaths = true
        }
        drawGame()
        gameState.touchStartPos = null
        gameState.touchStartTime = 0
        return
      }
      
      // 检查网格点击
      if (x >= gridX && x <= gridX + gridWidth && y >= gridY && y <= gridY + gridHeight) {
        const cellX = x - gridX - config.gridPadding
        const cellY = y - gridY - config.gridPadding
        const c = Math.floor(cellX / cellSize)
        const r = Math.floor(cellY / cellSize)
        
        if (r >= 0 && r < size && c >= 0 && c < size &&
            gameState.touchStartPos && 
            gameState.touchStartPos.r === r && 
            gameState.touchStartPos.c === c) {
          handleCellClick(r, c)
        }
      }
      
      gameState.touchStartPos = null
      gameState.touchStartTime = 0
    } else if (touchDuration >= 500) {
      // 长按已经处理，清除状态
      gameState.touchStartPos = null
      gameState.touchStartTime = 0
    } else {
      // 其他情况，清除状态
      gameState.touchStartPos = null
      gameState.touchStartTime = 0
    }
  }
}

// 处理游戏界面触摸（保持兼容性）
function handleGameTouch(e) {
  handleGameTouchStart(e)
}

// 处理提示按钮点击
function handleHintClick() {
  if (!gameState.level || !gameState.currentClues) return
  
  const size = gameState.size
  // 计算提示价格：第1次免费，第2次n，第3次2n，3n封顶
  let hintCost = 0
  if (gameState.hintCount === 0) {
    hintCost = 0  // 免费
  } else if (gameState.hintCount === 1) {
    hintCost = size  // n 个镜子
  } else if (gameState.hintCount === 2) {
    hintCost = 2 * size  // 2n 个镜子
  } else {
    hintCost = 3 * size  // 3n 封顶
  }
  
  // 如果不是免费，检查积分是否足够
  if (hintCost > 0 && !hasEnoughCoins(hintCost)) {
    wx.showModal({
      title: '积分不足',
      content: `提示需要 ${hintCost} 个镜子，当前只有 ${gameState.mirrorCoins} 个。`,
      showCancel: false,
      confirmText: '知道了'
    })
    return
  }
  
  // 找到所有标红的边（当前值与答案不匹配的边）
  const wrongClues = []
  const sides = ['top', 'bottom', 'left', 'right']
  
  sides.forEach(side => {
    for (let i = 0; i < size; i++) {
      const currentValue = gameState.currentClues[side][i]
      const answerValue = gameState.level.clues[side][i]
      if (currentValue !== answerValue) {
        wrongClues.push({ side, index: i })
      }
    }
  })
  
  if (wrongClues.length === 0) {
    wx.showModal({
      title: '无需提示',
      content: '所有线索都正确，不需要提示！',
      showCancel: false,
      confirmText: '知道了'
    })
    return
  }
  
  // 随机选择一个标红的边
  const randomClue = wrongClues[Math.floor(Math.random() * wrongClues.length)]
  const hintKey = `${randomClue.side}-${randomClue.index}`
  
  // 如果已经提示过这个边，重新选择
  if (gameState.hintPaths.has(hintKey)) {
    // 从剩余的标红边中选择
    const remainingWrongClues = wrongClues.filter(c => {
      const key = `${c.side}-${c.index}`
      return !gameState.hintPaths.has(key)
    })
    
    if (remainingWrongClues.length === 0) {
      wx.showModal({
        title: '提示已用完',
        content: '所有标红的边都已经提示过了！',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }
    
    const newRandomClue = remainingWrongClues[Math.floor(Math.random() * remainingWrongClues.length)]
    const newHintKey = `${newRandomClue.side}-${newRandomClue.index}`
    gameState.hintPaths.add(newHintKey)
  } else {
    gameState.hintPaths.add(hintKey)
  }
  
  // 扣除积分（如果不是免费）
  if (hintCost > 0) {
    const result = deductMirrorCoins(hintCost)
    gameState.mirrorCoins = result.remaining
  }
  
  // 增加提示次数
  gameState.hintCount++
  
  // 确保提示光线显示开启
  if (!gameState.showHintPaths) {
    gameState.showHintPaths = true
  }
  
  drawGame()
}

// 处理格子点击
function handleCellClick(r, c) {
  const key = `${r},${c}`
  const currentMirrors = { ...gameState.currentMirrors }
  const noMirrorMarks = { ...gameState.noMirrorMarks }
  
  const current = currentMirrors[key]
  if (!current) {
    currentMirrors[key] = '\\'
    delete noMirrorMarks[key]
  } else if (current === '\\') {
    currentMirrors[key] = '/'
    delete noMirrorMarks[key]
  } else {
    delete currentMirrors[key]
  }
  
  gameState.currentMirrors = currentMirrors
  gameState.noMirrorMarks = noMirrorMarks
  updateCurrentClues()
  
  // 高亮经过这个格子的光线路径
  highlightPathsThroughCell(r, c)
}

// 高亮经过指定格子的光线路径
function highlightPathsThroughCell(r, c) {
  const { size, level } = gameState
  if (!level) return
  
  // 清空之前的高亮
  gameState.highlightedPaths.clear()
  
  // 计算当前所有光线路径
  const currentGrid = buildCurrentGrid()
  const paths = []
  const sides = ['top', 'bottom', 'left', 'right']
  
  for (const side of sides) {
    for (let i = 0; i < size; i++) {
      const result = traceRay(currentGrid, { side, index: i })
      if (result.exit && result.path) {
        paths.push({
          entry: { side, index: i },
          exit: result.exit,
          path: result.path
        })
      }
    }
  }
  
  // 找到所有经过指定格子的路径
  paths.forEach((pathData, pathIdx) => {
    const passesThrough = pathData.path.some(p => p.r === r && p.c === c)
    if (passesThrough) {
      gameState.highlightedPaths.add(pathIdx)
    }
  })
  
  // 重新绘制游戏界面
  drawGame()
}

// 处理长按
function handleCellLongPress(r, c) {
  const key = `${r},${c}`
  
  if (gameState.currentMirrors[key]) return
  
  const noMirrorMarks = { ...gameState.noMirrorMarks }
  if (noMirrorMarks[key]) {
    delete noMirrorMarks[key]
  } else {
    noMirrorMarks[key] = true
  }
  
  gameState.noMirrorMarks = noMirrorMarks
  drawGame()
}

// 切换显示答案
function toggleShowAnswer() {
  if (gameState.showAnswer) {
    gameState.showAnswer = false
    drawGame()
    return
  }
  
  if (gameState.isSolved) {
    gameState.showAnswer = true
    drawGame()
    return
  }
  
  const size = gameState.size
  const cost = size * size  // 看答案消耗 n*n 个镜子
  
  if (!hasEnoughCoins(cost)) {
    wx.showModal({
      title: '积分不足',
      content: `查看答案需要 ${cost} 个镜子，当前只有 ${gameState.mirrorCoins} 个。请先完成关卡获得积分！`,
      showCancel: false,
      confirmText: '知道了'
    })
    return
  }
  
  wx.showModal({
    title: '确认查看答案',
    content: `查看答案将消耗 ${cost} 个镜子，确定要继续吗？`,
    success: (res) => {
      if (res.confirm) {
        const result = deductMirrorCoins(cost)
        if (result.success) {
          gameState.showAnswer = true
          gameState.hasViewedAnswer = true  // 标记已查看答案
          gameState.mirrorCoins = result.remaining
          drawGame()
          wx.showToast({
            title: `已消耗 ${cost} 个镜子`,
            icon: 'none',
            duration: 1500
          })
        }
      }
    }
  })
}

// 触摸事件处理
wx.onTouchStart(function(e) {
  if (gameState.screen === 'menu') {
    handleMenuTouch(e)
  } else if (gameState.screen === 'tutorial') {
    handleTutorialTouch(e)
  } else {
    handleGameTouchStart(e)
  }
})

wx.onTouchEnd(function(e) {
  if (gameState.screen === 'game') {
    handleGameTouchEnd(e)
  }
})

wx.onTouchCancel(function(e) {
  // 触摸取消时清除长按定时器
  if (gameState.longPressTimer) {
    clearTimeout(gameState.longPressTimer)
    gameState.longPressTimer = null
  }
  gameState.touchStartPos = null
  gameState.touchStartTime = 0
})

// 启动游戏
initCanvas()
