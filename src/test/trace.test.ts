import { describe, it, expect } from 'vitest';
import { traceRay } from '../engine/trace';
import { Grid } from '../engine/types';

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

describe('traceRay', () => {
  it('returns steps to reach boundary again in an empty NxN grid', () => {
    const sizes = [2, 4, 5];
    sizes.forEach(size => {
      const grid = createEmptyGrid(size);
      
      // Test top entry points: from top (r=0) to bottom (r=size-1)
      // Steps: enter (0,i) [1], then move through (1,i), (2,i), ..., (size-1,i) [size]
      // When at (size-1,i), we're at bottom boundary, so stop
      for (let i = 0; i < size; i++) {
        expect(traceRay(grid, { side: 'top', index: i }).steps).toBe(size);
      }
      // Test left entry points: from left (c=0) to right (c=size-1)
      for (let i = 0; i < size; i++) {
        expect(traceRay(grid, { side: 'left', index: i }).steps).toBe(size);
      }
    });
  });

  it('correctly handles a single mirror in 2x2 grid', () => {
    // [ / . ]
    // [ . . ]
    const grid = createEmptyGrid(2);
    grid[0][0].mirror = '/';

    // Top col 0: enters (0,0) [1], hits '/', reflects to left, moves to (0,-1) which is out of bounds
    // But we check boundary before moving, so we should check after entering the cell
    // Actually, we enter (0,0) [1], process mirror, then move to next position
    // After reflection: dr=0, dc=-1, so next is (0, -1) which is out of bounds
    // So we return steps=1 (only entered (0,0))
    expect(traceRay(grid, { side: 'top', index: 0 }).steps).toBe(1);
    
    // Top col 1: enters (0,1) [1], moves to (1,1) [2], which is at bottom boundary, stop
    expect(traceRay(grid, { side: 'top', index: 1 }).steps).toBe(2);

    // Left row 0: enters (0,0) [1], hits '/', reflects to up, moves to (-1,0) which is out of bounds
    expect(traceRay(grid, { side: 'left', index: 0 }).steps).toBe(1);

    // Right row 0: enters (0,1) [1], moves to (0,0) [2], hits '/', reflects to down, moves to (1,0) [3]
    // (1,0) is at bottom boundary, stop
    expect(traceRay(grid, { side: 'right', index: 0 }).steps).toBe(3);
  });
});
