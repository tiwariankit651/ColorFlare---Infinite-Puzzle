import { Cell, CellType, Level } from '../types';

export class LevelGenerator {
  private rng() {
    return Math.random();
  }

  generate(levelNumber: number): Level {
    const gridSize = this.getGridSize(levelNumber);
    const colorCount = this.getColorCount(levelNumber, gridSize);

    // Try many times to get a valid fully-filled level
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = this.tryGenerate(levelNumber, gridSize, colorCount);
      if (result) return result;
    }

    // If still fails, reduce colors and try
    for (let c = colorCount; c >= 2; c--) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const result = this.tryGenerate(levelNumber, gridSize, c);
        if (result) return result;
      }
    }

    return this.fallbackLevel(levelNumber);
  }

  private tryGenerate(levelNumber: number, gridSize: number, colorCount: number): Level | null {
    const grid: Cell[][] = Array.from({ length: gridSize }, (_, r) =>
      Array.from({ length: gridSize }, (_, c) => ({
        row: r,
        col: c,
        type: CellType.EMPTY,
        isPath: false,
      }))
    );

    const occupied = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    const solutionPaths: { r: number; c: number }[][] = [];
    let totalOccupied = 0;

    // Place walls for higher levels
    if (levelNumber > 10) {
      const wallCount = Math.min(Math.floor(levelNumber / 12), Math.floor((gridSize * gridSize) / 8));
      for (let i = 0; i < wallCount; i++) {
        const r = Math.floor(this.rng() * gridSize);
        const c = Math.floor(this.rng() * gridSize);
        if (!occupied[r][c]) {
          grid[r][c].type = CellType.WALL;
          occupied[r][c] = true;
          totalOccupied++;
        }
      }
    }

    const totalCells = gridSize * gridSize;
    const freeCellsCount = totalCells - totalOccupied;

    // Calculate path lengths - distribute cells among colors
    const pathLengths: number[] = [];
    let remaining = freeCellsCount;
    for (let i = 0; i < colorCount; i++) {
      if (i === colorCount - 1) {
        pathLengths.push(remaining);
      } else {
        const avg = Math.floor(remaining / (colorCount - i));
        const len = Math.max(3, avg + Math.floor(this.rng() * 3) - 1);
        const actualLen = Math.min(len, remaining - (colorCount - i - 1) * 2);
        pathLengths.push(actualLen);
        remaining -= actualLen;
      }
    }

    // Generate each path using backtracking DFS
    for (let color = 0; color < colorCount; color++) {
      const targetLen = pathLengths[color];
      if (targetLen < 2) return null;

      const path = this.backtrackPath(gridSize, occupied, targetLen);
      if (!path || path.length !== targetLen) return null;

      solutionPaths.push(path.map(p => ({ r: p.r, c: p.c })));
      path.forEach(p => {
        occupied[p.r][p.c] = true;
      });

      // Set dots
      const start = path[0];
      const end = path[path.length - 1];
      
      grid[start.r][start.c].type = CellType.DOT;
      grid[start.r][start.c].colorIndex = color;
      
      grid[end.r][end.c].type = CellType.DOT;
      grid[end.r][end.c].colorIndex = color;
    }

    // Verify ALL cells are covered
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!occupied[r][c]) return null;
      }
    }

    return {
      number: levelNumber,
      gridSize,
      grid,
      colorCount,
      solutionPaths,
    };
  }

  private backtrackPath(size: number, occupied: boolean[][], targetLen: number): { r: number, c: number }[] | null {
    const freeCells: { r: number, c: number }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!occupied[r][c]) freeCells.push({ r, c });
      }
    }
    if (freeCells.length < targetLen) return null;
    
    // Shuffle
    freeCells.sort(() => this.rng() - 0.5);

    for (const start of freeCells.slice(0, 20)) {
      const path = [start];
      const visited = Array.from({ length: size }, () => Array(size).fill(false));
      visited[start.r][start.c] = true;

      if (this.dfsBacktrack(size, occupied, visited, path, targetLen)) {
        return path;
      }
    }
    return null;
  }

  private dfsBacktrack(
    size: number, 
    occupied: boolean[][], 
    visited: boolean[][], 
    path: { r: number, c: number }[], 
    targetLen: number
  ): boolean {
    if (path.length === targetLen) return true;

    const last = path[path.length - 1];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]].sort(() => this.rng() - 0.5);

    for (const [dr, dc] of dirs) {
      const nr = last.r + dr;
      const nc = last.c + dc;

      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !occupied[nr][nc] && !visited[nr][nc]) {
        visited[nr][nc] = true;
        path.push({ r: nr, c: nc });

        const remainingNeeded = targetLen - path.length;
        if (remainingNeeded === 0 || this.hasEnoughReachable(size, occupied, visited, { r: nr, c: nc }, remainingNeeded)) {
          if (this.dfsBacktrack(size, occupied, visited, path, targetLen)) return true;
        }

        path.pop();
        visited[nr][nc] = false;
      }
    }
    return false;
  }

  private hasEnoughReachable(size: number, occupied: boolean[][], visited: boolean[][], pos: { r: number, c: number }, needed: number): boolean {
    if (needed <= 0) return true;
    let count = 0;
    const stack = [pos];
    const seen = new Set([`${pos.r},${pos.c}`]);

    while (stack.length > 0 && count < needed) {
      const curr = stack.pop()!;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = curr.r + dr;
        const nc = curr.c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const key = `${nr},${nc}`;
          if (!seen.has(key) && !occupied[nr][nc] && !visited[nr][nc]) {
            seen.add(key);
            count++;
            if (count >= needed) return true;
            stack.push({ r: nr, c: nc });
          }
        }
      }
    }
    return count >= needed;
  }

  private getGridSize(level: number): number {
    if (level <= 3) return 4;
    if (level <= 8) return 5;
    if (level <= 20) return 6;
    if (level <= 40) return 7;
    if (level <= 70) return 8;
    return 9;
  }

  private getColorCount(level: number, gridSize: number): number {
    if (level <= 2) return 2;
    if (level <= 5) return 3;
    if (level <= 10) return 4;
    return Math.min(2 + Math.floor(level / 8), Math.floor((gridSize * gridSize) / 3));
  }

  private fallbackLevel(levelNumber: number): Level {
    const grid: Cell[][] = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (_, c) => ({
        row: r,
        col: c,
        type: CellType.EMPTY,
        isPath: false,
      }))
    );

    grid[0][0].type = CellType.DOT; grid[0][0].colorIndex = 0;
    grid[3][3].type = CellType.DOT; grid[3][3].colorIndex = 0;
    grid[0][3].type = CellType.DOT; grid[0][3].colorIndex = 1;
    grid[3][0].type = CellType.DOT; grid[3][0].colorIndex = 1;

    const solutionPaths = [
      [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }],
      [{ r: 0, c: 3 }, { r: 0, c: 2 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 2, c: 2 }, { r: 2, c: 1 }],
    ];

    return {
      number: levelNumber,
      gridSize: 4,
      grid,
      colorCount: 2,
      solutionPaths,
    };
  }
}
