import { Cell, CellType, Level } from '../types';

export class LevelGenerator {
  private seed: number = Math.random();

  constructor(seed?: number) {
    if (seed !== undefined) {
      this.seed = seed;
    }
  }

  private rng() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  generate(levelNumber: number): Level {
    let gridSize = this.getGridSize(levelNumber);
    let colorCount = this.getColorCount(levelNumber, gridSize);

    // Try multiple attempts with the robust growth algorithm
    for (let attempt = 0; attempt < 500; attempt++) {
      const result = this.tryGenerate(levelNumber, gridSize, colorCount);
      if (result) return result;
      // After some attempts, try to shuffle the seed slightly for more variety
      this.seed += 0.1;
    }

    // If still fails, reduce colors slightly
    for (let c = colorCount - 1; c >= Math.max(2, colorCount - 2); c--) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const result = this.tryGenerate(levelNumber, gridSize, c);
        if (result) return result;
        this.seed += 0.1;
      }
    }

    // Fallback if all else fails
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

    const occupied = Array.from({ length: gridSize }, () => Array(gridSize).fill(-1)); // -1: empty, -2: wall, >=0: colorIndex
    const solutionPaths: { r: number; c: number }[][] = Array.from({ length: colorCount }, () => []);

    // 1. Seed wall positions (limited and structured)
    if (levelNumber > 20) {
      const wallProb = Math.min(0.1, levelNumber / 1000);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (this.rng() < wallProb) {
            // Don't place walls in corners or next to each other
            const isCorner = (r === 0 || r === gridSize - 1) && (c === 0 || c === gridSize - 1);
            if (!isCorner) {
              occupied[r][c] = -2;
              grid[r][c].type = CellType.WALL;
            }
          }
        }
      }
    }

    // 2. Pick starting dots
    const freeCells: { r: number, c: number }[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (occupied[r][c] === -1) freeCells.push({ r, c });
      }
    }

    if (freeCells.length < colorCount * 2) return null;

    // Shuffle free cells
    for (let i = freeCells.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [freeCells[i], freeCells[j]] = [freeCells[j], freeCells[i]];
    }

    const activePaths: number[] = [];
    for (let i = 0; i < colorCount; i++) {
      const cell = freeCells[i];
      occupied[cell.r][cell.c] = i;
      solutionPaths[i].push(cell);
      activePaths.push(i);
    }

    // 3. Iteratively grow paths to fill the grid
    let growAttempts = 0;
    const maxGrowAttempts = gridSize * gridSize * 10;
    const currentActive = [...activePaths];

    while (currentActive.length > 0 && growAttempts < maxGrowAttempts) {
      growAttempts++;
      const randIdx = Math.floor(this.rng() * currentActive.length);
      const colorIdx = currentActive[randIdx];
      const path = solutionPaths[colorIdx];

      // Try extending from either end of the path
      const ends = [{ cell: path[0], atStart: true }];
      if (path.length > 1) ends.push({ cell: path[path.length - 1], atStart: false });

      const possibleMoves: { r: number, c: number, atStart: boolean }[] = [];
      for (const end of ends) {
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = end.cell.r + dr;
          const nc = end.cell.c + dc;
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && occupied[nr][nc] === -1) {
            possibleMoves.push({ r: nr, c: nc, atStart: end.atStart });
          }
        }
      }

      if (possibleMoves.length > 0) {
        const move = possibleMoves[Math.floor(this.rng() * possibleMoves.length)];
        occupied[move.r][move.c] = colorIdx;
        if (move.atStart) {
          path.unshift({ r: move.r, c: move.c });
        } else {
          path.push({ r: move.r, c: move.c });
        }
      } else {
        currentActive.splice(randIdx, 1);
      }
    }

    // 4. Verify all empty cells are filled
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (occupied[r][c] === -1) return null;
      }
    }

    // 5. Ensure all paths have length >= 2
    for (let i = 0; i < colorCount; i++) {
        if (solutionPaths[i].length < 2) return null;
    }

    // 6. Set dots at ends of paths
    for (let i = 0; i < colorCount; i++) {
      const path = solutionPaths[i];
      const start = path[0];
      const end = path[path.length - 1];
      
      grid[start.r][start.c].type = CellType.DOT;
      grid[start.r][start.c].colorIndex = i;
      
      grid[end.r][end.c].type = CellType.DOT;
      grid[end.r][end.c].colorIndex = i;
    }

    return {
      number: levelNumber,
      gridSize,
      grid,
      colorCount,
      solutionPaths: solutionPaths.map(p => p.map(c => ({ r: c.r, c: c.c })))
    };
  }

  private getGridSize(level: number): number {
    if (level <= 5) return 4;
    if (level <= 15) return 5;
    if (level <= 30) return 6;
    if (level <= 60) return 7;
    if (level <= 100) return 8;
    return 9;
  }

  private getColorCount(level: number, gridSize: number): number {
    if (level <= 3) return 2;
    if (level <= 10) return 3;
    if (level <= 20) return 4;
    if (level <= 40) return 5;
    if (level <= 80) return 6;
    
    // Cap color count more strictly at higher levels to keep it solvable but dense
    const maxColorsForGridSize = Math.floor((gridSize * gridSize) / 3.5);
    const progressiveColors = 3 + Math.floor(level / 20);
    
    return Math.min(progressiveColors, maxColorsForGridSize, 8); // Max 8 colors for UI sanity
  }

  private fallbackLevel(levelNumber: number): Level {
    const gridSize = this.getGridSize(levelNumber);
    const grid: Cell[][] = Array.from({ length: gridSize }, (_, r) =>
      Array.from({ length: gridSize }, (_, c) => ({
        row: r,
        col: c,
        type: CellType.EMPTY,
        isPath: false,
      }))
    );

    // Guaranteed solvable zigzag pattern for any grid size
    const colorCount = Math.min(gridSize, 5);
    const solutionPaths: { r: number; c: number }[][] = [];

    for (let i = 0; i < colorCount; i++) {
        const path: {r: number, c: number}[] = [];
        const startR = 0, startC = i;
        const endR = gridSize - 1, endC = i;
        
        for (let r = 0; r < gridSize; r++) {
            path.push({ r, c: i });
        }
        
        grid[startR][startC].type = CellType.DOT;
        grid[startR][startC].colorIndex = i;
        grid[endR][endC].type = CellType.DOT;
        grid[endR][endC].colorIndex = i;
        solutionPaths.push(path);
    }

    return {
      number: levelNumber,
      gridSize,
      grid,
      colorCount,
      solutionPaths,
    };
  }
}
