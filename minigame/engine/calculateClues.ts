import type { Grid, EntrySide, EntryPoint } from './types';
import { traceRay } from './trace';

export function calculateClues(grid: Grid): Record<EntrySide, (number | string)[]> {
  const size = grid.length;
  const clues: Record<EntrySide, (number | string)[]> = {
    top: Array(size).fill(0),
    bottom: Array(size).fill(0),
    left: Array(size).fill(0),
    right: Array(size).fill(0),
  };

  const stepMap = new Map<string, number>();
  const sides: EntrySide[] = ['top', 'bottom', 'left', 'right'];
  
  // 追踪所有路径，记录步数
  for (const side of sides) {
    for (let i = 0; i < size; i++) {
      const entry: EntryPoint = { side, index: i };
      const result = traceRay(grid, entry);
      if (result.steps === -1) {
        clues[side][i] = '∞';
      } else if (result.exit) {
        const exit = result.exit;
        const entryKey = `${side},${i}`;
        const exitKey = `${exit.side},${exit.index}`;
        
        // 记录步数
        stepMap.set(entryKey, result.steps);
        // 同一条光路的两端应该有相同的步数
        stepMap.set(exitKey, result.steps);
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

  return clues;
}
