export type MirrorType = '/' | '\\';

export interface Cell {
  row: number;
  col: number;
  mirror?: MirrorType;
}

export type Grid = Cell[][];

export type Direction = {
  dr: number;
  dc: number;
};

export type EntrySide = 'top' | 'bottom' | 'left' | 'right';

export interface EntryPoint {
  side: EntrySide;
  index: number; // 0..N-1
}

export interface ExitPoint {
  side: EntrySide;
  index: number;
}

export interface TraceResult {
  exit?: ExitPoint; // 出口点
  steps: number | -1; // -1 represents loop/infinity
  path?: Array<{ r: number; c: number }>; // 光路路径
}

export interface LevelData {
  size: number;
  grid: Grid;
  clues: {
    top: (number | string)[];
    bottom: (number | string)[];
    left: (number | string)[];
    right: (number | string)[];
  };
  paths?: Array<{ entry: EntryPoint; exit: ExitPoint; path: Array<{ r: number; c: number }>; steps: number }>; // 所有光路
}

export const DUMMY = true;
