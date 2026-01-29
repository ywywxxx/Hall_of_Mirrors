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
    index: number;
}
export interface TraceResult {
    steps: number | -1;
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
}
//# sourceMappingURL=types.d.ts.map