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

    // Dynamic Solving Strategy Suite
    const STRATEGIES = [
      'default',         // Balanced flow
      'divide',          // Channel squeeze barrier in middle
      'labyrinth',       // Serpentine maze using obstacles
      'warp_tunnel',     // Teleporters bridging blocking wall lines
      'bento_box',       // Four compartmentalised quadrant rooms
      'corner_lockout',  // Outer corner-placed priority pins
      'outer_loop',      // Boundary edge tracks wrapping centers
      'symmetric'        // Rotational symmetric balance layout
    ];

    let strategy = 'default';
    if (levelNumber > 3) {
      const strategyIdx = (levelNumber * 193 + 467) % STRATEGIES.length;
      strategy = STRATEGIES[strategyIdx];
    }

    // Try multiple attempts with the robust growth algorithm
    for (let attempt = 0; attempt < 500; attempt++) {
      const result = this.tryGenerate(levelNumber, gridSize, colorCount, strategy);
      if (result) {
        // Sculpt strategy on top of the 100% solvable level
        const sculpted = this.sculptStrategy(result, strategy);
        return sculpted;
      }
      this.seed += 0.1;
    }

    // If still fails, reduce colors slightly
    for (let c = colorCount - 1; c >= Math.max(2, colorCount - 2); c--) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const result = this.tryGenerate(levelNumber, gridSize, c, 'default');
        if (result) return result;
        this.seed += 0.1;
      }
    }

    // Fallback if all else fails
    return this.fallbackLevel(levelNumber);
  }

  private tryGenerate(levelNumber: number, gridSize: number, colorCount: number, strategy: string): Level | null {
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
    if (levelNumber > 20 && strategy !== 'bento_box' && strategy !== 'divide' && strategy !== 'warp_tunnel') {
      const wallProb = Math.min(0.12, levelNumber / 900);
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

    // Apply Strategic Dot Placement Constraints
    if (strategy === 'corner_lockout') {
      freeCells.sort((a, b) => {
        const distA = Math.min(a.r + a.c, a.r + (gridSize - 1 - a.c), (gridSize - 1 - a.r) + a.c, (gridSize - 1 - a.r) + (gridSize - 1 - a.c));
        const distB = Math.min(b.r + b.c, b.r + (gridSize - 1 - b.c), (gridSize - 1 - b.r) + b.c, (gridSize - 1 - b.r) + (gridSize - 1 - b.c));
        return distA - distB; // Closest to corner first
      });
    } else if (strategy === 'outer_loop') {
      freeCells.sort((a, b) => {
        const distA = Math.min(a.r, a.c, gridSize - 1 - a.r, gridSize - 1 - a.c);
        const distB = Math.min(b.r, b.c, gridSize - 1 - b.r, gridSize - 1 - b.c);
        return distA - distB; // Edge perimeter cells first
      });
    } else if (strategy === 'symmetric') {
      freeCells.sort((a, b) => {
        const distA = Math.abs(a.r - (gridSize - 1) / 2) + Math.abs(a.c - (gridSize - 1) / 2);
        const distB = Math.abs(b.r - (gridSize - 1) / 2) + Math.abs(b.c - (gridSize - 1) / 2);
        return distB - distA; // Radial outermost symmetrically placed cells first
      });
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
    const maxGrowAttempts = gridSize * gridSize * 12;
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

  private sculptStrategy(level: Level, strategy: string): Level {
    let sculpted = { ...level };
    const details = this.getStrategyDetails(strategy);
    sculpted.strategyType = strategy;
    sculpted.strategyName = details.name;
    sculpted.strategyDesc = details.desc;

    switch (strategy) {
      case 'divide':
        sculpted = this.sculptGreatDivide(sculpted);
        break;
      case 'labyrinth':
        sculpted = this.sculptLabyrinth(sculpted);
        break;
      case 'warp_tunnel':
        sculpted = this.sculptWarpTunnel(sculpted);
        break;
      case 'bento_box':
        sculpted = this.sculptBentoBox(sculpted);
        break;
      default:
        break;
    }

    return sculpted;
  }

  private getStrategyDetails(strategy: string) {
    switch (strategy) {
      case 'divide':
        return { name: 'The Great Divide', desc: 'A central pipeline barrier blocks direct flow. Squeeze paths through narrow gaps.' };
      case 'labyrinth':
        return { name: 'Serpentine Labyrinth', desc: 'Dense winding barriers block shortcut paths. One single misstep blocks other colors.' };
      case 'warp_tunnel':
        return { name: 'Quantum Warp', desc: 'Portals bridge blocking wall dividers. Step into the teleporters to link paths.' };
      case 'bento_box':
        return { name: 'Bento Box Chambers', desc: 'Grid divided into 4 secure rooms with narrow gates. Solve compartmentalized paths neatly.' };
      case 'corner_lockout':
        return { name: 'Corner Lockout', desc: 'Colored terminals nested deeply in corners. Route and solve perimeter endpoints first!' };
      case 'outer_loop':
        return { name: 'Boundary Orbit', desc: 'Orbit outer colors around borders to clear a clean tunnel for central colors.' };
      case 'symmetric':
        return { name: 'Specular Mirror', desc: 'Rotational mirrored dots. Elegant specular mirror patterns hold the solution.' };
      default:
        return { name: 'Balanced Flow', desc: 'Connect matching terminals. Fill the entire board Grid completely.' };
    }
  }

  private sculptGreatDivide(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const gridSize = level.gridSize;
    const isRowWall = this.rng() < 0.5;
    const mid = Math.floor(gridSize / 2);

    const crossings = new Set<string>();
    if (level.solutionPaths) {
      for (const path of level.solutionPaths) {
        for (const cell of path) {
          if (isRowWall && cell.r === mid) crossings.add(`${cell.r},${cell.c}`);
          else if (!isRowWall && cell.c === mid) crossings.add(`${cell.r},${cell.c}`);
        }
      }
    }

    for (let i = 0; i < gridSize; i++) {
      const r = isRowWall ? mid : i;
      const c = isRowWall ? i : mid;
      if (grid[r][c].type === CellType.DOT) continue;
      if (crossings.has(`${r},${c}`)) continue;

      grid[r][c].type = (i % 2 === 0) ? CellType.WALL : CellType.ROTATOR;
    }

    return { ...level, grid };
  }

  private sculptLabyrinth(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const pathSet = new Set<string>();
    if (level.solutionPaths) {
      for (const path of level.solutionPaths) {
        for (const cell of path) {
          pathSet.add(`${cell.r},${cell.c}`);
        }
      }
    }

    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        if (grid[r][c].type === CellType.DOT) continue;
        if (pathSet.has(`${r},${c}`)) continue;

        if (this.rng() < 0.65) {
          grid[r][c].type = (this.rng() < 0.35) ? CellType.ROTATOR : CellType.WALL;
        }
      }
    }

    return { ...level, grid };
  }

  private sculptWarpTunnel(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const solutionPaths = level.solutionPaths ? level.solutionPaths.map(path => [...path]) : undefined;

    if (solutionPaths) {
      let longestIdx = -1;
      let maxLen = 0;
      for (let i = 0; i < solutionPaths.length; i++) {
        if (solutionPaths[i].length > maxLen) {
          maxLen = solutionPaths[i].length;
          longestIdx = i;
        }
      }

      if (longestIdx !== -1 && maxLen >= 5) {
        const path = solutionPaths[longestIdx];
        const i = 1;
        const j = path.length - 2;

        if (j - i >= 2) {
          const pA = path[i];
          const pB = path[j];

          grid[pA.r][pA.c].type = CellType.TELEPORTER;
          grid[pA.r][pA.c].colorIndex = 0; // high portal pair ID

          grid[pB.r][pB.c].type = CellType.TELEPORTER;
          grid[pB.r][pB.c].colorIndex = 0;

          for (let k = i + 1; k < j; k++) {
            const bypassed = path[k];
            grid[bypassed.r][bypassed.c].type = (this.rng() < 0.5) ? CellType.ROTATOR : CellType.WALL;
          }

          const newPath = [
            ...path.slice(0, i + 1),
            ...path.slice(j)
          ];
          solutionPaths[longestIdx] = newPath;
        }
      }
    }

    return {
      ...level,
      grid,
      solutionPaths
    };
  }

  private sculptBentoBox(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const gridSize = level.gridSize;
    const midR = Math.floor(gridSize / 2);
    const midC = Math.floor(gridSize / 2);

    const crossings = new Set<string>();
    if (level.solutionPaths) {
      for (const path of level.solutionPaths) {
        for (const cell of path) {
          if (cell.r === midR || cell.c === midC) {
            crossings.add(`${cell.r},${cell.c}`);
          }
        }
      }
    }

    for (let i = 0; i < gridSize; i++) {
      if (grid[midR][i].type !== CellType.DOT && !crossings.has(`${midR},${i}`)) {
        grid[midR][i].type = (i % 2 === 0) ? CellType.WALL : CellType.ROTATOR;
      }
      if (grid[i][midC].type !== CellType.DOT && !crossings.has(`${i},${midC}`)) {
        grid[i][midC].type = (i % 2 === 0) ? CellType.WALL : CellType.ROTATOR;
      }
    }

    return { ...level, grid };
  }

  applyHardMode(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const solutionPaths = level.solutionPaths ? level.solutionPaths.map(path => [...path]) : undefined;

    let teleporterPairId = 0;

    if (solutionPaths) {
      for (let pIdx = 0; pIdx < solutionPaths.length; pIdx++) {
        const path = solutionPaths[pIdx];
        if (path.length >= 5) {
          const i = 1;
          const j = path.length - 2;

          if (j - i >= 2) {
            const startPortal = path[i];
            const endPortal = path[j];

            grid[startPortal.r][startPortal.c].type = CellType.TELEPORTER;
            grid[startPortal.r][startPortal.c].colorIndex = teleporterPairId;

            grid[endPortal.r][endPortal.c].type = CellType.TELEPORTER;
            grid[endPortal.r][endPortal.c].colorIndex = teleporterPairId;

            for (let k = i + 1; k < j; k++) {
              const bypassed = path[k];
              grid[bypassed.r][bypassed.c].type = CellType.ROTATOR;
            }

            const newPath = [
              ...path.slice(0, i + 1),
              ...path.slice(j)
            ];
            solutionPaths[pIdx] = newPath;

            teleporterPairId++;
            if (teleporterPairId >= 2) break;
          }
        }
      }
    }

    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        if (grid[r][c].type === CellType.WALL) {
          if (this.rng() < 0.5) {
            grid[r][c].type = CellType.ROTATOR;
          }
        }
      }
    }

    return {
      ...level,
      grid,
      solutionPaths
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
    
    const maxColorsForGridSize = Math.floor((gridSize * gridSize) / 3.5);
    const progressiveColors = 3 + Math.floor(level / 20);
    
    return Math.min(progressiveColors, maxColorsForGridSize, 8);
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
      strategyName: 'Balanced Flow',
      strategyDesc: 'Fill the entire board complete. Grid traversal is linear.'
    };
  }
}
