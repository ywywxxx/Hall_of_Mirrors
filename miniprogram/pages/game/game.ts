import { generateLevel } from '../../engine/generate'
import { getMirrorCountForSize } from '../../engine/mirrorCount'
import { calculateClues } from '../../engine/calculateClues'
import { traceRay } from '../../engine/trace'
import type { LevelData, Cell, MirrorType, EntrySide } from '../../engine/types'

Page({
  data: {
    size: 0,
    level: null as LevelData | null,
    currentMirrors: {} as Record<string, MirrorType>,
    noMirrorMarks: {} as Record<string, boolean>,
    showAnswer: false,
    hoveredCell: null as { r: number; c: number } | null,
    cellSize: 50,
    clueSize: 35,
    gridPadding: 2,
    gridCells: [] as Array<{ r: number; c: number; key: string; userMirror?: string; answerMirror?: string; noMirrorMark?: boolean }>,
    currentClues: null as any,
    isSolved: false
  },

  canvasCtx: null as any,
  canvasNode: null as any,

  onLoad(options: { size?: string }) {
    const size = parseInt(options.size || '3')
    this.setData({ size })
    this.generateNewLevel()
    this.updateGridCells()
  },

  onReady() {
    // 页面渲染完成后初始化 canvas
    this.initCanvas()
  },

  initCanvas() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#pathCanvas').fields({ node: true, size: true }).exec((res) => {
      if (res[0] && res[0].node) {
        // 新版 2d canvas API
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        const width = res[0].width || (this.data.size * this.data.cellSize + this.data.gridPadding * 2)
        const height = res[0].height || (this.data.size * this.data.cellSize + this.data.gridPadding * 2)
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        this.canvasCtx = ctx
        this.canvasNode = canvas
        this.drawPaths()
      } else {
        // 兼容旧版 API（如果新版不可用）
        try {
          this.canvasCtx = wx.createCanvasContext('pathCanvas', this)
          this.drawPaths()
        } catch (e) {
          console.warn('Canvas 初始化失败:', e)
        }
      }
    })
  },

  generateNewLevel() {
    try {
      const size = this.data.size
      const mirrorCount = getMirrorCountForSize(size)
      const level = generateLevel(size, mirrorCount)
      this.setData({
        level,
        currentMirrors: {},
        noMirrorMarks: {},
        showAnswer: false
      }, () => {
        this.updateCurrentClues()
        // 延迟绘制，确保 canvas 已准备好
        setTimeout(() => {
          this.drawPaths()
        }, 100)
      })
    } catch (error) {
      console.error('生成关卡失败:', error)
      wx.showToast({
        title: '生成关卡失败',
        icon: 'none'
      })
    }
  },

  updateCurrentClues() {
    if (!this.data.level) return
    
    const currentGrid = this.buildCurrentGrid()
    const currentClues = calculateClues(currentGrid)
    
    // 检查是否通关
    const isSolved = this.checkSolved(currentClues)
    
    this.setData({
      currentClues,
      isSolved
    }, () => {
      this.updateGridCells()
      this.drawPaths()
    })
  },

  updateGridCells() {
    if (!this.data.level) return
    
    const size = this.data.size
    const gridCells: Array<{ r: number; c: number; key: string; userMirror?: string; answerMirror?: string; noMirrorMark?: boolean }> = []
    
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

  buildCurrentGrid(): Cell[][] {
    const size = this.data.size
    const grid: Cell[][] = []
    for (let r = 0; r < size; r++) {
      const row: Cell[] = []
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`
        const mirror = this.data.currentMirrors[key]
        row.push({ row: r, col: c, mirror })
      }
      grid.push(row)
    }
    return grid
  },

  checkSolved(currentClues: any): boolean {
    const { level } = this.data
    if (!level) return false
    
    const sides: EntrySide[] = ['top', 'bottom', 'left', 'right']
    for (const side of sides) {
      for (let i = 0; i < this.data.size; i++) {
        if (currentClues[side][i] !== level.clues[side][i]) {
          return false
        }
      }
    }
    return true
  },

  onCellClick(e: any) {
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

  onCellLongPress(e: any) {
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
    this.setData({
      showAnswer: !this.data.showAnswer
    })
  },

  onBack() {
    wx.navigateBack()
  },

  getCurrentPaths() {
    if (!this.data.level) return []
    
    const currentGrid = this.buildCurrentGrid()
    const paths: Array<{ entry: { side: EntrySide; index: number }; exit: { side: EntrySide; index: number }; path: Array<{ r: number; c: number }> }> = []
    const sides: EntrySide[] = ['top', 'bottom', 'left', 'right']
    
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
    if (!this.canvasCtx || !this.data.level) return
    
    const paths = this.getCurrentPaths()
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
    
    // 清空 canvas
    this.canvasCtx.clearRect(0, 0, gridWidth, gridHeight)
    
    // 颜色数组
    const pathColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']
    
    // 获取入口/出口坐标
    const getEntryExitPoint = (side: string, index: number) => {
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
    const getCellCenter = (r: number, c: number) => {
      return {
        x: gridPadding + c * cellSize + cellSize / 2,
        y: gridPadding + r * cellSize + cellSize / 2
      }
    }
    
    // 判断是否是新版 2d canvas API
    const isNewAPI = this.canvasNode !== null
    
    // 绘制每条路径
    paths.forEach((pathData, pathIdx) => {
      const pathColor = pathColors[pathIdx % pathColors.length]
      
      const entryPoint = getEntryExitPoint(pathData.entry.side, pathData.entry.index)
      const exitPoint = getEntryExitPoint(pathData.exit.side, pathData.exit.index)
      
      const points: Array<{ x: number; y: number }> = [entryPoint]
      
      pathData.path.forEach((p) => {
        const center = getCellCenter(p.r, p.c)
        points.push(center)
      })
      
      points.push(exitPoint)
      
      // 绘制路径
      this.canvasCtx.beginPath()
      this.canvasCtx.moveTo(points[0].x, points[0].y)
      
      for (let i = 1; i < points.length; i++) {
        this.canvasCtx.lineTo(points[i].x, points[i].y)
      }
      
      if (isNewAPI) {
        // 新版 API
        this.canvasCtx.strokeStyle = pathColor
        this.canvasCtx.lineWidth = 4
        if (this.canvasCtx.setLineDash) {
          this.canvasCtx.setLineDash([8, 4])
        } else {
          // 某些版本可能不支持 setLineDash，使用 lineDashOffset
          this.canvasCtx.lineDashOffset = 0
        }
        this.canvasCtx.globalAlpha = 0.8
        this.canvasCtx.stroke()
      } else {
        // 旧版 API
        this.canvasCtx.setStrokeStyle(pathColor)
        this.canvasCtx.setLineWidth(4)
        this.canvasCtx.setLineDash([8, 4])
        this.canvasCtx.setGlobalAlpha(0.8)
        this.canvasCtx.stroke()
      }
    })
    
    // 绘制（兼容新旧 API）
    if (isNewAPI) {
      // 新版 API 不需要手动调用 draw
    } else {
      // 旧版 API 需要调用 draw
      this.canvasCtx.draw(false, () => {})
    }
  }
})
