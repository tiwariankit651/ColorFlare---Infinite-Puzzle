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

    // Find all unique colorIndices of DOTs present on the board
    const uniqueColors = new Set<number>();
    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        const cell = level.grid[r][c];
        if (cell.type === CellType.DOT && cell.colorIndex !== undefined) {
          uniqueColors.add(cell.colorIndex);
        }
      }
    }

    // All present color paths must connect their dots
    for (const colorIndex of uniqueColors) {
        if (!this.isColorConnected(level, colorIndex)) return false;
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

      // Teleporter jump logic
      const currentCell = level.grid[curr.r][curr.c];
      if (currentCell && currentCell.type === CellType.TELEPORTER) {
        const pairId = currentCell.colorIndex;
        const otherPortal = level.grid.flat().find(f => 
          f.type === CellType.TELEPORTER && 
          f.colorIndex === pairId && 
          (f.row !== curr.r || f.col !== curr.c)
        );
        if (otherPortal && (otherPortal.pathColorIndex === colorIndex || otherPortal.isPath)) {
          const key = `${otherPortal.row},${otherPortal.col}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ r: otherPortal.row, c: otherPortal.col });
          }
        }
      }

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
