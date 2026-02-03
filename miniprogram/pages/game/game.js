const { generateLevel } = require('../../engine/generate')
const { getMirrorCountForSize } = require('../../engine/mirrorCount')
const { calculateClues } = require('../../engine/calculateClues')
const { traceRay } = require('../../engine/trace')
const { getMirrorCoins, addMirrorCoins, deductMirrorCoins, hasEnoughCoins } = require('../../utils/mirrorCoins')
const app = getApp()

Page({
  data: {
    size: 0,
    level: null,
    currentMirrors: {},
    noMirrorMarks: {},
    showAnswer: false,
    showLightPaths: true, // 光线显示开关
    hoveredCell: null,
    cellSize: 50,
    clueSize: 35,
    gridPadding: 2,
    gridCells: [],
    currentClues: null,
    isSolved: false,
    mirrorCoins: 0,
    hasEarnedCoins: false, // 标记是否已经获得过这关的积分
    selectedLight: null // 当前选中的光线 { side: 'top'|'bottom'|'left'|'right', index: number }
  },

  canvasCtx: null,
  canvasNode: null,

  onLoad(options) {
    const size = parseInt(options.size || '3')
    this.setData({ size })
    this.loadMirrorCoins()
    this.generateNewLevel()
    this.updateGridCells()
  },

  onShow() {
    // 页面显示时刷新积分
    this.loadMirrorCoins()
  },

  loadMirrorCoins() {
    const coins = getMirrorCoins()
    this.setData({ mirrorCoins: coins })
    // 同步到全局数据
    if (app && app.globalData) {
      app.globalData.mirrorCoins = coins
    }
  },

  onReady() {
    // 页面渲染完成后初始化 canvas
    this.initCanvas()
  },

  initCanvas() {
    // 使用旧版 Canvas API，更稳定可靠
    try {
      this.canvasCtx = wx.createCanvasContext('pathCanvas', this)
      this.canvasNode = null
      console.log('Canvas 初始化成功（旧版API）')
      if (this.data.level) {
        this.drawPaths()
      }
    } catch (e) {
      console.error('Canvas 初始化失败:', e)
    }
  },

  generateNewLevel() {
    try {
      const size = this.data.size
      let attempts = 0
      const maxAttempts = 10 // 最多尝试10次
      
      while (attempts < maxAttempts) {
        attempts++
        const mirrorCount = getMirrorCountForSize(size)
        const level = generateLevel(size, mirrorCount)
        
        // 检查初始状态（没有放置任何镜子）是否已经通关
        const emptyGrid = this.buildEmptyGrid(size)
        const emptyClues = calculateClues(emptyGrid)
        const isEmptySolved = this.checkSolvedForLevel(emptyClues, level)
        
        if (isEmptySolved) {
          // 如果初始状态就通关了，说明关卡不合格，重新生成
          console.log(`[DEBUG] 关卡 ${attempts} 不合格：初始状态已通关，重新生成...`)
          continue
        }
        
        // 关卡合格，设置数据
        this.setData({
          level,
          currentMirrors: {},
          noMirrorMarks: {},
          showAnswer: false,
          hasEarnedCoins: false, // 重置积分获得标记
          isSolved: false, // 重置通关状态
          currentClues: null, // 重置当前线索
          selectedLight: null // 重置选中的光线
        }, () => {
          this.updateCurrentClues()
          // 延迟绘制，确保 canvas 已准备好
          setTimeout(() => {
            // 如果 canvas 未初始化，先初始化
            if (!this.canvasCtx) {
              console.log('生成新关卡，canvas 未初始化，开始初始化')
              this.initCanvas()
            } else {
              console.log('生成新关卡，canvas 已初始化，直接绘制')
              this.drawPaths()
            }
          }, 300)
        })
        
        console.log(`[DEBUG] 生成合格关卡，尝试次数: ${attempts}`)
        return // 成功生成，退出循环
      }
      
      // 如果尝试多次都失败，使用最后一次生成的关卡
      console.warn(`[DEBUG] 尝试 ${maxAttempts} 次后仍无法生成合格关卡，使用最后一次生成的关卡`)
      const mirrorCount = getMirrorCountForSize(size)
      const level = generateLevel(size, mirrorCount)
      this.setData({
        level,
        currentMirrors: {},
        noMirrorMarks: {},
        showAnswer: false,
        hasEarnedCoins: false,
        isSolved: false,
        currentClues: null,
        selectedLight: null
      }, () => {
        this.updateCurrentClues()
        setTimeout(() => {
          if (!this.canvasCtx) {
            this.initCanvas()
          } else {
            this.drawPaths()
          }
        }, 300)
      })
    } catch (error) {
      console.error('生成关卡失败:', error)
      wx.showToast({
        title: '生成关卡失败',
        icon: 'none'
      })
    }
  },

  // 构建空的网格（没有任何镜子）
  buildEmptyGrid(size) {
    const grid = []
    for (let r = 0; r < size; r++) {
      const row = []
      for (let c = 0; c < size; c++) {
        row.push({ row: r, col: c })
      }
      grid.push(row)
    }
    return grid
  },

  // 检查线索是否与答案匹配（用于验证关卡）
  checkSolvedForLevel(currentClues, level) {
    if (!level) return false
    
    const sides = ['top', 'bottom', 'left', 'right']
    for (const side of sides) {
      for (let i = 0; i < this.data.size; i++) {
        if (currentClues[side][i] !== level.clues[side][i]) {
          return false
        }
      }
    }
    return true
  },

  updateCurrentClues() {
    if (!this.data.level) return
    
    const currentGrid = this.buildCurrentGrid()
    const currentClues = calculateClues(currentGrid)
    
    // 检查是否通关
    const isSolved = this.checkSolved(currentClues)
    const wasSolved = this.data.isSolved
    
    this.setData({
      currentClues,
      isSolved
    }, () => {
      this.updateGridCells()
      this.drawPaths()
      
      // 如果刚通关，奖励积分
      if (isSolved && !wasSolved && !this.data.hasEarnedCoins) {
        this.rewardCoins()
      }
    })
  },

  rewardCoins() {
    const size = this.data.size
    const reward = size * size // n² 个镜子
    const newCoins = addMirrorCoins(reward)
    this.setData({
      mirrorCoins: newCoins,
      hasEarnedCoins: true
    })
    
    // 更新全局数据并通知所有页面
    if (app && app.updateMirrorCoins) {
      app.updateMirrorCoins()
    }
    
    wx.showToast({
      title: `获得 ${reward} 个镜子！`,
      icon: 'success',
      duration: 2000
    })
  },

  updateGridCells() {
    if (!this.data.level) return
    
    const size = this.data.size
    const gridCells = []
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`
        const userMirror = this.data.currentMirrors[key]
        const answerMirror = this.data.level.grid[r][c].mirror
        const noMirrorMark = !!this.data.noMirrorMarks[key]
        
        gridCells.push({
          r,
          c,
          key,
          userMirror: userMirror === '\\' ? 'backslash' : userMirror === '/' ? 'forward' : undefined,
          answerMirror: answerMirror === '\\' ? 'backslash' : answerMirror === '/' ? 'forward' : undefined,
          noMirrorMark: noMirrorMark && !userMirror
        })
      }
    }
    
    this.setData({ gridCells })
  },

  buildCurrentGrid() {
    const size = this.data.size
    const grid = []
    for (let r = 0; r < size; r++) {
      const row = []
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`
        const mirror = this.data.currentMirrors[key]
        row.push({ row: r, col: c, mirror })
      }
      grid.push(row)
    }
    return grid
  },

  checkSolved(currentClues) {
    const { level } = this.data
    if (!level) return false
    
    const sides = ['top', 'bottom', 'left', 'right']
    for (const side of sides) {
      for (let i = 0; i < this.data.size; i++) {
        if (currentClues[side][i] !== level.clues[side][i]) {
          return false
        }
      }
    }
    return true
  },

  onCellClick(e) {
    const { r, c } = e.currentTarget.dataset
    const key = `${r},${c}`
    const currentMirrors = { ...this.data.currentMirrors }
    const noMirrorMarks = { ...this.data.noMirrorMarks }
    
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
    
    this.setData({ currentMirrors, noMirrorMarks }, () => {
      this.updateCurrentClues()
      this.drawPaths()
    })
  },

  onCellLongPress(e) {
    const { r, c } = e.currentTarget.dataset
    const key = `${r},${c}`
    
    if (this.data.currentMirrors[key]) return
    
    const noMirrorMarks = { ...this.data.noMirrorMarks }
    if (noMirrorMarks[key]) {
      delete noMirrorMarks[key]
    } else {
      noMirrorMarks[key] = true
    }
    
    this.setData({ noMirrorMarks }, () => {
      this.updateGridCells()
    })
  },

  onShowAnswer() {
    // 如果已经显示答案，直接隐藏
    if (this.data.showAnswer) {
      this.setData({
        showAnswer: false
      })
      return
    }

    // 如果已经通关，可以免费查看答案
    if (this.data.isSolved) {
      this.setData({
        showAnswer: true
      })
      return
    }

    // 未通关时，需要消耗积分
    const size = this.data.size
    const cost = 2 * size * size // 2×n² 个镜子
    
    if (!hasEnoughCoins(cost)) {
      wx.showModal({
        title: '积分不足',
        content: `查看答案需要 ${cost} 个镜子，当前只有 ${this.data.mirrorCoins} 个。请先完成关卡获得积分！`,
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    // 确认是否消耗积分
    wx.showModal({
      title: '确认查看答案',
      content: `查看答案将消耗 ${cost} 个镜子，确定要继续吗？`,
      success: (res) => {
        if (res.confirm) {
          const result = deductMirrorCoins(cost)
          if (result.success) {
            this.setData({
              showAnswer: true,
              mirrorCoins: result.remaining
            })
            // 更新全局数据并通知所有页面
            if (app && app.updateMirrorCoins) {
              app.updateMirrorCoins()
            }
            wx.showToast({
              title: `已消耗 ${cost} 个镜子`,
              icon: 'none',
              duration: 1500
            })
          }
        }
      }
    })
  },

  onBack() {
    // 返回前更新全局积分并通知所有页面
    if (app && app.updateMirrorCoins) {
      app.updateMirrorCoins()
    }
    wx.navigateBack()
  },

  onLightSwitchChange(e) {
    const showLightPaths = e.detail.value
    this.setData({ showLightPaths })
    // 如果开启光线，重新绘制
    if (showLightPaths) {
      this.drawPaths()
    } else {
      // 如果关闭光线，清空 canvas
      if (this.canvasCtx) {
        const { size, cellSize, gridPadding } = this.data
        const gridWidth = size * cellSize + gridPadding * 2
        const gridHeight = size * cellSize + gridPadding * 2
        this.canvasCtx.clearRect(0, 0, gridWidth, gridHeight)
        if (this.canvasCtx.draw) {
          this.canvasCtx.draw()
        }
      }
    }
  },

  // 处理线索点击
  onClueClick(e) {
    console.log('========== onClueClick 被调用 ==========')
    console.log('事件对象:', e)
    console.log('currentTarget:', e.currentTarget)
    console.log('dataset:', e.currentTarget ? e.currentTarget.dataset : '无')
    
    const dataset = e.currentTarget ? e.currentTarget.dataset : {}
    const { side, index } = dataset
    
    console.log('解析结果 - side:', side, 'index:', index)
    
    if (!side || index === undefined) {
      console.error('缺少必要参数:', { side, index })
      wx.showToast({
        title: '点击事件参数错误',
        icon: 'none'
      })
      return
    }
    
    const indexNum = typeof index === 'number' ? index : parseInt(index)
    
    if (isNaN(indexNum)) {
      console.error('索引解析失败:', index)
      wx.showToast({
        title: '索引解析失败',
        icon: 'none'
      })
      return
    }
    
    console.log('点击线索:', { side, index: indexNum, currentSelected: this.data.selectedLight })
    
    // 如果光线显示关闭，先开启
    if (!this.data.showLightPaths) {
      this.setData({ showLightPaths: true })
    }
    
    // 如果点击的是同一个线索，则取消选中
    if (this.data.selectedLight && 
        this.data.selectedLight.side === side && 
        this.data.selectedLight.index === indexNum) {
      console.log('取消选中光线')
      this.setData({ selectedLight: null }, () => {
        this.drawPaths()
      })
    } else {
      const selectedLight = { side, index: indexNum }
      console.log('选中光线:', selectedLight)
      this.setData({ selectedLight }, () => {
        this.drawPaths()
      })
    }
  },

  getCurrentPaths() {
    if (!this.data.level) return []
    
    const currentGrid = this.buildCurrentGrid()
    const paths = []
    const sides = ['top', 'bottom', 'left', 'right']
    
    for (const side of sides) {
      for (let i = 0; i < this.data.size; i++) {
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
    
    return paths
  },

  drawPaths() {
    // 如果光线显示被关闭且没有选中光线，不绘制
    if (!this.data.showLightPaths && !this.data.selectedLight) {
      return
    }
    
    if (!this.canvasCtx || !this.data.level) {
      console.log('Canvas 未准备好，跳过绘制', {
        hasCtx: !!this.canvasCtx,
        hasLevel: !!this.data.level
      })
      // 如果 canvas 未初始化，尝试初始化
      if (!this.canvasCtx && this.data.level) {
        this.initCanvas()
      }
      return
    }
    
    const paths = this.getCurrentPaths()
    console.log('准备绘制路径，路径数量:', paths.length, '选中光线:', this.data.selectedLight)
    
    if (paths.length === 0) {
      // 如果没有路径，清空 canvas
      const { size, cellSize, gridPadding } = this.data
      const gridWidth = size * cellSize + gridPadding * 2
      const gridHeight = size * cellSize + gridPadding * 2
      this.canvasCtx.clearRect(0, 0, gridWidth, gridHeight)
      if (this.canvasCtx.draw) {
        this.canvasCtx.draw()
      }
      return
    }
    
    const { size, cellSize, gridPadding } = this.data
    const gridWidth = size * cellSize + gridPadding * 2
    const gridHeight = size * cellSize + gridPadding * 2
    
    console.log('绘制路径，网格尺寸:', gridWidth, 'x', gridHeight)
    
    // 清空 canvas
    this.canvasCtx.clearRect(0, 0, gridWidth, gridHeight)
    
    // 颜色数组
    const pathColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']
    
    // 获取入口/出口坐标
    const getEntryExitPoint = (side, index) => {
      switch (side) {
        case 'top':
          return { x: gridPadding + index * cellSize + cellSize / 2, y: 0 }
        case 'bottom':
          return { x: gridPadding + index * cellSize + cellSize / 2, y: gridHeight }
        case 'left':
          return { x: 0, y: gridPadding + index * cellSize + cellSize / 2 }
        case 'right':
          return { x: gridWidth, y: gridPadding + index * cellSize + cellSize / 2 }
        default:
          return { x: 0, y: 0 }
      }
    }
    
    // 获取单元格中心坐标
    const getCellCenter = (r, c) => {
      return {
        x: gridPadding + c * cellSize + cellSize / 2,
        y: gridPadding + r * cellSize + cellSize / 2
      }
    }
    
    // 判断是否是新版 2d canvas API
    const isNewAPI = this.canvasNode !== null
    
    // 绘制每条路径
    let drawnCount = 0
    paths.forEach((pathData, pathIdx) => {
      // 如果选中了光线，只显示选中的光线
      if (this.data.selectedLight) {
        const { side, index } = this.data.selectedLight
        // 确保类型一致进行比较
        if (pathData.entry.side !== side || pathData.entry.index !== index) {
          return // 跳过非选中的光线
        }
        console.log('绘制选中的光线:', { side, index, pathIdx })
      }
      
      const pathColor = pathColors[pathIdx % pathColors.length]
      
      const entryPoint = getEntryExitPoint(pathData.entry.side, pathData.entry.index)
      const exitPoint = getEntryExitPoint(pathData.exit.side, pathData.exit.index)
      
      const points = [entryPoint]
      
      pathData.path.forEach((p) => {
        const center = getCellCenter(p.r, p.c)
        points.push(center)
      })
      
      points.push(exitPoint)
      
      // 判断是否是选中的光线（如果selectedLight存在，则当前光线一定是选中的）
      const isSelected = !!this.data.selectedLight
      
      // 绘制路径
      this.canvasCtx.beginPath()
      this.canvasCtx.moveTo(points[0].x, points[0].y)
      
      for (let i = 1; i < points.length; i++) {
        this.canvasCtx.lineTo(points[i].x, points[i].y)
      }
      
      if (isNewAPI) {
        // 新版 API
        this.canvasCtx.strokeStyle = pathColor
        if (isSelected) {
          // 选中的光线：实线，加粗，不透明
          this.canvasCtx.lineWidth = 6
          this.canvasCtx.setLineDash([])
          this.canvasCtx.globalAlpha = 1.0
        } else {
          // 未选中的光线：虚线，较细，半透明
          this.canvasCtx.lineWidth = 4
          if (this.canvasCtx.setLineDash) {
            this.canvasCtx.setLineDash([8, 4])
          }
          this.canvasCtx.globalAlpha = 0.8
        }
        this.canvasCtx.stroke()
      } else {
        // 旧版 API
        this.canvasCtx.setStrokeStyle(pathColor)
        if (isSelected) {
          // 选中的光线：实线，加粗，不透明
          this.canvasCtx.setLineWidth(6)
          this.canvasCtx.setLineDash([])
          this.canvasCtx.setGlobalAlpha(1.0)
        } else {
          // 未选中的光线：虚线，较细，半透明
          this.canvasCtx.setLineWidth(4)
          this.canvasCtx.setLineDash([8, 4])
          this.canvasCtx.setGlobalAlpha(0.8)
        }
        this.canvasCtx.stroke()
      }
      drawnCount++
    })
    
    console.log('实际绘制路径数量:', drawnCount, '总路径数量:', paths.length)
    
    // 绘制（兼容新旧 API）
    if (isNewAPI) {
      // 新版 API 不需要手动调用 draw，但需要确保绘制完成
      console.log('路径绘制完成（新版API）')
    } else {
      // 旧版 API 需要调用 draw
      this.canvasCtx.draw(false, () => {
        console.log('路径绘制完成（旧版API）')
      })
    }
  }
})
