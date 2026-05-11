import { Level, CellType } from '../types';

export class PathValidator {
  static isLevelComplete(level: Level): boolean {
    // All non-wall cells must be filled or be a dot
    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        const cell = level.grid[r][c];
        if (cell.type === CellType.WALL || cell.type === CellType.ROTATOR) continue;
        if (cell.type === CellType.DOT) continue;
        if (!cell.isPath) return false;
      }
    }

    // All color paths must connect their dots
    for (let i = 0; i < level.colorCount; i++) {
        if (!this.isColorConnected(level, i)) return false;
    }

    return true;
  }

  static isColorConnected(level: Level, colorIndex: number): boolean {
    const dots: { r: number, c: number }[] = [];
    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        if (level.grid[r][c].type === CellType.DOT && level.grid[r][c].colorIndex === colorIndex) {
          dots.push({ r, c });
        }
      }
    }

    if (dots.length !== 2) return false;

    // BFS from first dot to second
    const start = dots[0];
    const target = dots[1];
    const visited = new Set<string>([`${start.r},${start.c}`]);
    const queue: { r: number, c: number }[] = [start];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.r === target.r && curr.c === target.c) return true;

      for (const [dr, dc] of dirs) {
        const nr = curr.r + dr;
        const nc = curr.c + dc;

        if (nr < 0 || nr >= level.gridSize || nc < 0 || nc >= level.gridSize) continue;
        if (visited.has(`${nr},${nc}`)) continue;

        const cell = level.grid[nr][nc];
        if (cell.pathColorIndex === colorIndex || 
            (cell.type === CellType.DOT && cell.colorIndex === colorIndex)) {
          visited.add(`${nr},${nc}`);
          queue.push({ r: nr, c: nc });
        }
      }
    }

    return false;
  }
}
