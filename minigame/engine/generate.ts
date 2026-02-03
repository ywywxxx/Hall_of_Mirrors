import type { Grid, LevelData, EntrySide, EntryPoint, ExitPoint } from './types';
import { traceRay } from './trace';

function createEmptyGrid(size: number): Grid {
  const grid: Grid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push({ row: r, col: c });
    }
    grid.push(row);
  }
  return grid;
}

export function generateLevel(size: number, mirrorCount: number): LevelData {
  let attempts = 0;
  
  while (attempts < 200) {
    attempts++;
    const grid = createEmptyGrid(size);
    const positions: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        positions.push([r, c]);
      }
    }

    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = positions[i];
      positions[i] = positions[j];
      positions[j] = temp;
    }

    // Place mirrors
    for (let i = 0; i < mirrorCount; i++) {
      const [r, c] = positions[i];
      grid[r][c].mirror = Math.random() < 0.5 ? '/' : '\\';
    }

    const clues: Record<EntrySide, (number | string)[]> = {
      top: Array(size).fill(0),
      bottom: Array(size).fill(0),
      left: Array(size).fill(0),
      right: Array(size).fill(0),
    };

    const paths: Array<{ entry: EntryPoint; exit: ExitPoint; path: Array<{ r: number; c: number }>; steps: number }> = [];
    const stepMap = new Map<string, number>(); // 映射 entryKey -> steps
    let hasLoop = false;
    const sides: EntrySide[] = ['top', 'bottom', 'left', 'right'];
    
    // 追踪所有路径，记录步数
    for (const side of sides) {
      for (let i = 0; i < size; i++) {
        const entry: EntryPoint = { side, index: i };
        const result = traceRay(grid, entry);
        if (result.steps === -1) {
          hasLoop = true;
          clues[side][i] = '∞';
        } else if (result.exit && result.path) {
          const exit = result.exit;
          const entryKey = `${side},${i}`;
          const exitKey = `${exit.side},${exit.index}`;
          
          // 记录步数
          stepMap.set(entryKey, result.steps);
          // 同一条光路的两端应该有相同的步数
          stepMap.set(exitKey, result.steps);
          
          paths.push({
            entry,
            exit,
            path: result.path,
            steps: result.steps
          });
        }
      }
    }
    
    // 设置clues为步数
    for (const side of sides) {
      for (let i = 0; i < size; i++) {
        const key = `${side},${i}`;
        const steps = stepMap.get(key);
        if (steps !== undefined) {
          clues[side][i] = steps;
        } else if (clues[side][i] === 0) {
          clues[side][i] = '?';
        }
      }
    }

    if (!hasLoop || attempts === 200) {
      return {
        size,
        grid,
        clues,
        paths
      };
    }
  }

  throw new Error('Failed to generate level');
}
