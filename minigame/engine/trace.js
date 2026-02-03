function traceRay(grid, entry) {
  const size = grid.length
  let r, c, dr, dc

  switch (entry.side) {
    case 'top':
      r = 0
      c = entry.index
      dr = 1
      dc = 0
      break
    case 'bottom':
      r = size - 1
      c = entry.index
      dr = -1
      dc = 0
      break
    case 'left':
      r = entry.index
      c = 0
      dr = 0
      dc = 1
      break
    case 'right':
      r = entry.index
      c = size - 1
      dr = 0
      dc = -1
      break
    default:
      throw new Error('Invalid entry side')
  }

  let steps = 0
  const visited = new Set()
  const path = []
  
  // 记录入口点
  path.push({ r, c })
  steps++
  
  while (true) {
    const cell = grid[r][c]
    const state = `${r},${c},${dr},${dc}`
    if (visited.has(state)) {
      return { steps: -1, path }
    }
    visited.add(state)
    
    if (cell.mirror) {
      if (cell.mirror === '/') {
        const nextDr = -dc
        const nextDc = -dr
        dr = nextDr
        dc = nextDc
      } else if (cell.mirror === '\\') {
        const nextDr = dc
        const nextDc = dr
        dr = nextDr
        dc = nextDc
      }
    }

    const nextR = r + dr
    const nextC = c + dc

    // 检查是否离开网格
    if (nextR < 0 || nextR >= size || nextC < 0 || nextC >= size) {
      // 确定出口点
      let exit
      if (nextR < 0) {
        exit = { side: 'top', index: nextC }
      } else if (nextR >= size) {
        exit = { side: 'bottom', index: nextC }
      } else if (nextC < 0) {
        exit = { side: 'left', index: nextR }
      } else if (nextC >= size) {
        exit = { side: 'right', index: nextR }
      }
      return { exit, steps, path }
    }

    r = nextR
    c = nextC
    path.push({ r, c })
    steps++
  }
}

module.exports = {
  traceRay
}
