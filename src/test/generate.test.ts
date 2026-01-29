import { describe, it, expect } from 'vitest';
import { generateLevel } from '../engine/generate';

describe('generateLevel', () => {
  it('generates a level with correct size and mirror count', () => {
    const size = 4;
    const mirrorCount = 3;
    const level = generateLevel(size, mirrorCount);

    expect(level.size).toBe(size);
    
    let actualMirrorCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (level.grid[r][c].mirror) {
          actualMirrorCount++;
        }
      }
    }
    expect(actualMirrorCount).toBe(mirrorCount);
  });

  it('generates 4N clues', () => {
    const size = 5;
    const level = generateLevel(size, 5);
    
    expect(level.clues.top.length).toBe(size);
    expect(level.clues.bottom.length).toBe(size);
    expect(level.clues.left.length).toBe(size);
    expect(level.clues.right.length).toBe(size);
  });
});
