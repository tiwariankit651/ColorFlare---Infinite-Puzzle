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

  generate(levelNumber: number, hardModeOn?: boolean): Level {
    const effectiveLevel = hardModeOn ? levelNumber + 12 : levelNumber;
    let gridSize = this.getGridSize(effectiveLevel);
    let colorCount = this.getColorCount(effectiveLevel, gridSize);

    // Dynamic Solving Strategy Suite (Restored to the stable, fully verified strategies)
    const STRATEGIES = [
      'default',         // Balanced flow
      'divide',          // Channel squeeze barrier in middle
      'labyrinth',       // Serpentine maze using obstacles
      'corner_lockout',  // Outer corner-placed priority pins
      'outer_loop',      // Boundary edge tracks wrapping centers
      'symmetric',       // Rotational symmetric balance layout
      'bento_box'        // Bento box chambers using walls
    ];

    let strategy = 'default';
    if (effectiveLevel > 3) {
      const strategyIdx = (effectiveLevel * 193 + 467) % STRATEGIES.length;
      strategy = STRATEGIES[strategyIdx];
    }

    // Try multiple attempts with the robust growth algorithm
    for (let attempt = 0; attempt < 500; attempt++) {
      const result = this.tryGenerate(levelNumber, gridSize, colorCount, strategy);
      if (result) {
        // Sculpt strategy on top of the 100% solvable level
        const sculpted = this.sculptStrategy(result, strategy);
        return this.finalizeRotators({ ...sculpted, number: levelNumber });
      }
      this.seed += 0.1;
    }

    // If still fails, reduce colors slightly
    for (let c = colorCount - 1; c >= Math.max(2, colorCount - 2); c--) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const result = this.tryGenerate(levelNumber, gridSize, c, 'default');
        if (result) return this.finalizeRotators({ ...result, number: levelNumber });
        this.seed += 0.1;
      }
    }

    // Fallback if all else fails
    return this.finalizeRotators({ ...this.fallbackLevel(levelNumber), number: levelNumber });
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

    // 1. Seed wall / obstacle positions under strategies
    if (levelNumber > 3) {
      if (strategy === 'divide') {
        const isRowWall = (levelNumber % 2 === 0);
        const mid = Math.floor(gridSize / 2);
        // Leave 2 random open gates
        const gate1 = 1;
        const gate2 = gridSize - 2;
        
        for (let i = 0; i < gridSize; i++) {
          if (i === gate1 || i === gate2) continue;
          const r = isRowWall ? mid : i;
          const c = isRowWall ? i : mid;
          occupied[r][c] = -2; // occupied by wall
          grid[r][c].type = CellType.WALL;
        }
      } 
      else if (strategy === 'bento_box') {
        const midR = Math.floor(gridSize / 2);
        const midC = Math.floor(gridSize / 2);
        // Gate positions
        const gateR1 = 0;
        const gateR2 = gridSize - 1;
        const gateC1 = 0;
        const gateC2 = gridSize - 1;
 
        for (let i = 0; i < gridSize; i++) {
          if (i !== gateR1 && i !== gateR2 && i !== midR) {
            occupied[midR][i] = -2;
            grid[midR][i].type = CellType.WALL;
          }
          if (i !== gateC1 && i !== gateC2 && i !== midC) {
            occupied[i][midC] = -2;
            grid[i][midC].type = CellType.WALL;
          }
        }
      } 
      else if (strategy === 'outer_loop') {
        // Place core mountain in center
        const start = Math.floor(gridSize / 2) - 1;
        const end = Math.floor(gridSize / 2);
        for (let r = start; r <= end; r++) {
          for (let c = start; c <= end; c++) {
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              occupied[r][c] = -2;
              grid[r][c].type = CellType.WALL;
            }
          }
        }
      } 
      else if (strategy === 'corner_lockout') {
        // Place diagonal blocks shielding some corners
        const corners = [
          { r: 0, c: 0, dr: 1, dc: 0, ar: 0, ac: 1 },
          { r: 0, c: gridSize - 1, dr: 1, dc: gridSize - 1, ar: 0, ac: gridSize - 2 },
          { r: gridSize - 1, c: 0, dr: gridSize - 2, dc: 0, ar: gridSize - 1, ac: 1 },
          { r: gridSize - 1, c: gridSize - 1, dr: gridSize - 2, dc: gridSize - 1, ar: gridSize - 1, ac: gridSize - 2 }
        ];
        // Select 2 corners to lock down
        const count = Math.min(2, Math.floor(gridSize / 2));
        for (let i = 0; i < count; i++) {
          const cIdx = (levelNumber + i) % corners.length;
          const corner = corners[cIdx];
          occupied[corner.dr][corner.c] = -2;
          grid[corner.dr][corner.c].type = CellType.WALL;
          occupied[corner.r][corner.ac] = -2;
          grid[corner.r][corner.ac].type = CellType.WALL;
        }
      } 
      else if (strategy === 'symmetric') {
        // Place symmetric walls rotators
        const count = Math.min(2, Math.floor(gridSize / 2));
        for (let i = 0; i < count; i++) {
          const r = 1 + ((levelNumber + i * 2) % (gridSize - 2));
          const c = 1 + ((levelNumber * 13 + i * 7) % (gridSize - 2));
          const sr = gridSize - 1 - r;
          const sc = gridSize - 1 - c;
          
          if (occupied[r][c] === -1 && occupied[sr][sc] === -1) {
            occupied[r][c] = -2;
            grid[r][c].type = CellType.WALL;
            occupied[sr][sc] = -2;
            grid[sr][sc].type = CellType.WALL;
          }
        }
      } 
      else if (strategy === 'labyrinth') {
        // Snake like layout
        const maxWalls = Math.min(6, Math.floor(gridSize * 1.5));
        let placed = 0;
        for (let attempt = 0; attempt < 30 && placed < maxWalls; attempt++) {
          const r = 1 + Math.floor(this.rng() * (gridSize - 2));
          const c = 1 + Math.floor(this.rng() * (gridSize - 2));
          if (occupied[r][c] === -1) {
            occupied[r][c] = -2;
            grid[r][c].type = CellType.WALL;
            placed++;
          }
        }
      }
      else {
        // default / basic strategies - sparse seeding for higher levels to maintain excitement!
        const maxWalls = levelNumber > 10 ? Math.min(3, Math.floor(gridSize / 2)) : 0;
        let placed = 0;
        for (let attempt = 0; attempt < 10 && placed < maxWalls; attempt++) {
          const r = 1 + Math.floor(this.rng() * (gridSize - 2));
          const c = 1 + Math.floor(this.rng() * (gridSize - 2));
          if (occupied[r][c] === -1) {
            occupied[r][c] = -2;
            grid[r][c].type = CellType.WALL;
            placed++;
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
      case 'key_gate':
        sculpted = this.sculptKeyGate(sculpted);
        break;
      case 'bridge_overpass':
        sculpted = this.sculptBridgeOverpass(sculpted);
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
      case 'key_gate':
        return { name: 'Dependency Lockout', desc: 'Secure security nodes. Link matching Key terminals first to open Gate bypass units!' };
      case 'bridge_overpass':
        return { name: 'Dimension Overpass', desc: 'Crossing node junctions. Overlap lines horizontally and vertically to bypass barriers!' };
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

      grid[r][c].type = CellType.WALL;
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
          grid[r][c].type = CellType.WALL;
        }
      }
    }

    return { ...level, grid };
  }

  private sculptWarpTunnel(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const solutionPaths = level.solutionPaths ? level.solutionPaths.map(path => [...path]) : undefined;
    const gridSize = level.gridSize;

    if (solutionPaths) {
      let teleporterPairId = 0;
      const maxPortalPairs = gridSize >= 8 ? 3 : gridSize >= 6 ? 2 : 1;

      // Sort paths by length descending to apply teleporters to the longest paths first
      const sortedPathIndices = solutionPaths
        .map((path, idx) => ({ path, idx }))
        .sort((a, b) => b.path.length - a.path.length);

      for (const item of sortedPathIndices) {
        if (teleporterPairId >= maxPortalPairs) break;
        const path = item.path;
        
        if (path.length >= 5) {
          // Find two distant intermediate spots
          const i = 1;
          const j = path.length - 2;
          
          if (j - i >= 2) {
            const pA = path[i];
            const pB = path[j];

            // Verify they aren't overwriting standard custom tiles or each other
            if (grid[pA.r][pA.c].type === CellType.EMPTY && grid[pB.r][pB.c].type === CellType.EMPTY) {
              grid[pA.r][pA.c].type = CellType.TELEPORTER;
              grid[pA.r][pA.c].colorIndex = teleporterPairId;

              grid[pB.r][pB.c].type = CellType.TELEPORTER;
              grid[pB.r][pB.c].colorIndex = teleporterPairId;

              // Place barriers on bypassed parts of the path
              for (let k = i + 1; k < j; k++) {
                const bypassed = path[k];
                if (grid[bypassed.r][bypassed.c].type === CellType.EMPTY) {
                  grid[bypassed.r][bypassed.c].type = (this.rng() < 0.4) ? CellType.ROTATOR : CellType.WALL;
                }
              }

              // Update the solution path so it skips the bypassed section from simulation and hints
              const newPath = [
                ...path.slice(0, i + 1),
                ...path.slice(j)
              ];
              solutionPaths[item.idx] = newPath;
              teleporterPairId++;
            }
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
        grid[midR][i].type = CellType.WALL;
      }
      if (grid[i][midC].type !== CellType.DOT && !crossings.has(`${i},${midC}`)) {
        grid[i][midC].type = CellType.WALL;
      }
    }

    return { ...level, grid };
  }

  private sculptKeyGate(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const solutionPaths = level.solutionPaths ? level.solutionPaths.map(path => [...path]) : undefined;
    const gridSize = level.gridSize;

    if (solutionPaths && solutionPaths.length >= 2) {
      const maxPairs = gridSize >= 8 ? 2 : 1;
      let pairsPlaced = 0;
      
      // Select path pairings to create chain dependencies (e.g. connecting path X unlocks path Y)
      const pathIndices = Array.from({ length: solutionPaths.length }, (_, i) => i);
      // Shuffle using our deterministic seed-based rng
      for (let s = pathIndices.length - 1; s > 0; s--) {
        const j = Math.floor(this.rng() * (s + 1));
        const temp = pathIndices[s];
        pathIndices[s] = pathIndices[j];
        pathIndices[j] = temp;
      }

      for (let i = 0; i < pathIndices.length - 1; i++) {
        if (pairsPlaced >= maxPairs) break;
        const cKey = pathIndices[i];
        const cGate = pathIndices[i + 1];

        const pathKey = solutionPaths[cKey];
        const pathGate = solutionPaths[cGate];

        if (pathKey.length >= 4 && pathGate.length >= 4) {
          const keyIdx = Math.floor(pathKey.length / 2);
          const keyPos = pathKey[keyIdx];

          const gateIdx = Math.floor(pathGate.length / 2);
          const gatePos = pathGate[gateIdx];

          const keyCell = grid[keyPos.r][keyPos.c];
          const gateCell = grid[gatePos.r][gatePos.c];

          if (
            keyCell.type === CellType.EMPTY && 
            gateCell.type === CellType.EMPTY && 
            keyCell.colorIndex === undefined && 
            gateCell.colorIndex === undefined
          ) {
            grid[keyPos.r][keyPos.c].type = CellType.KEY;
            grid[keyPos.r][keyPos.c].colorIndex = cKey; // Key activated by path cKey

            grid[gatePos.r][gatePos.c].type = CellType.GATE;
            grid[gatePos.r][gatePos.c].colorIndex = cKey; // Gate requires key cKey to open

            pairsPlaced++;
          }
        }
      }
    }
    return { ...level, grid };
  }

  private sculptBridgeOverpass(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const gridSize = level.gridSize;
    
    // Find all cells that are straight parts of any solution path
    const straightCells: { r: number; c: number; isHorizontal: boolean }[] = [];
    if (level.solutionPaths) {
      level.solutionPaths.forEach((path) => {
        for (let i = 1; i < path.length - 1; i++) {
          const prev = path[i - 1];
          const curr = path[i];
          const next = path[i + 1];
          
          if (prev.r === curr.r && next.r === curr.r) {
            straightCells.push({ r: curr.r, c: curr.c, isHorizontal: true });
          } else if (prev.c === curr.c && next.c === curr.c) {
            straightCells.push({ r: curr.r, c: curr.c, isHorizontal: false });
          }
        }
      });
    }

    // Sort straight cells from center outwards to keep bridges nicely centered
    const mid = (gridSize - 1) / 2;
    straightCells.sort((a, b) => {
      const distA = Math.abs(a.r - mid) + Math.abs(a.c - mid);
      const distB = Math.abs(b.r - mid) + Math.abs(b.c - mid);
      return distA - distB;
    });

    let bridgesPlaced = 0;
    const maxBridges = gridSize >= 8 ? 4 : gridSize >= 6 ? 2 : 1;

    for (const cell of straightCells) {
      // Avoid placing adjacent bridges so the level layout remains clean and readable
      let adjacentBridge = false;
      for (const [dr, dc] of [[0,1], [0,-1], [1,0], [-1,0]]) {
        const nr = cell.r + dr;
        const nc = cell.c + dc;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
          if (grid[nr][nc].type === CellType.BRIDGE) {
            adjacentBridge = true;
            break;
          }
        }
      }
      if (adjacentBridge) continue;

      const currentCell = grid[cell.r][cell.c];
      if (currentCell.type === CellType.EMPTY || currentCell.type === CellType.WALL || currentCell.type === CellType.ROTATOR) {
        grid[cell.r][cell.c].type = CellType.BRIDGE;
        grid[cell.r][cell.c].isPath = false;
        bridgesPlaced++;
        if (bridgesPlaced >= maxBridges) break;
      }
    }
    return { ...level, grid };
  }

  applyHardMode(level: Level): Level {
    const grid: Cell[][] = level.grid.map(row => row.map(cell => ({ ...cell })));
    const pathSet = new Set<string>();
    if (level.solutionPaths) {
      for (const path of level.solutionPaths) {
        for (const cell of path) {
          pathSet.add(`${cell.r},${cell.c}`);
        }
      }
    }

    // Convert unused cells to walls or rotators to make routing highly restrictive
    let obstaclesAdded = 0;
    const maxObstacles = level.gridSize >= 7 ? 4 : level.gridSize >= 5 ? 2 : 1;

    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        if (grid[r][c].type === CellType.EMPTY && !pathSet.has(`${r},${c}`)) {
          if (obstaclesAdded < maxObstacles) {
            grid[r][c].type = (this.rng() < 0.5) ? CellType.ROTATOR : CellType.WALL;
            obstaclesAdded++;
          }
        }
      }
    }

    // Calculate move limits and time pressure limits
    const optimalMoves = level.solutionPaths ? level.solutionPaths.reduce((acc, p) => acc + p.length - 1, 0) : level.gridSize * level.gridSize;
    const maxMoves = Math.ceil(optimalMoves * 1.3) + 2;
    const timeLimit = Math.max(20, level.gridSize * 5);

    return {
      ...level,
      grid,
      isHardMode: true,
      maxMoves,
      timeLimit
    };
  }

  private getGridSize(level: number): number {
    if (level <= 5) return 4;
    if (level <= 15) return 5;
    if (level <= 30) return 6;
    if (level <= 60) return 7;
    if (level <= 100) return 8;
    if (level <= 150) return 9;
    if (level <= 250) return 10;
    if (level <= 400) return 11;
    return 12; // Extremely advanced 12x12 grid for master players!
  }

  private getColorCount(level: number, gridSize: number): number {
    if (level <= 3) return 2;
    if (level <= 10) return 3;
    if (level <= 20) return 4;
    if (level <= 40) return 5;
    if (level <= 80) return 6;
    if (level <= 120) return 7;
    if (level <= 180) return 8;
    if (level <= 240) return 9;
    if (level <= 300) return 10;
    if (level <= 360) return 11;
    
    const maxColorsForGridSize = Math.floor((gridSize * gridSize) / 3.2);
    const progressiveColors = 12;
    
    return Math.min(progressiveColors, maxColorsForGridSize, 12); // safe upper bound of 12 colors
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

  private finalizeRotators(level: Level): Level {
    return level;
  }
}
