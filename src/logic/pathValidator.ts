import { Level, CellType, Cell } from '../types';

export class PathValidator {
  static isMoveAllowedThroughRotator(r_from: number, c_from: number, r_to: number, c_to: number, rotatorCell: Cell): boolean {
    const rot = rotatorCell.rotation !== undefined ? rotatorCell.rotation : 0;
    const variety = rotatorCell.variety || 'straight';

    let openDirs: { r: number, c: number }[] = [];

    if (variety === 'straight') {
      const normRot = rot % 180;
      if (normRot === 0) {
        openDirs = [{ r: 0, c: -1 }, { r: 0, c: 1 }]; // Left and Right
      } else {
        openDirs = [{ r: -1, c: 0 }, { r: 1, c: 0 }]; // Top and Bottom
      }
    } else {
      const normRot = rot % 360;
      if (normRot === 0) {
        openDirs = [{ r: 0, c: 1 }, { r: 1, c: 0 }]; // Right and Bottom
      } else if (normRot === 90) {
        openDirs = [{ r: 1, c: 0 }, { r: 0, c: -1 }]; // Bottom and Left
      } else if (normRot === 180) {
        openDirs = [{ r: 0, c: -1 }, { r: -1, c: 0 }]; // Left and Top
      } else {
        openDirs = [{ r: -1, c: 0 }, { r: 0, c: 1 }]; // Top and Right
      }
    }

    const isRotatorTarget = rotatorCell.row === r_to && rotatorCell.col === c_to;
    const otherR = isRotatorTarget ? r_from : r_to;
    const otherC = isRotatorTarget ? c_from : c_to;

    const relR = otherR - rotatorCell.row;
    const relC = otherC - rotatorCell.col;

    return openDirs.some(d => d.r === relR && d.c === relC);
  }

  static isRotatorPassable(fromR: number, fromC: number, toR: number, toC: number, grid: Cell[][]): boolean {
    const fromCell = grid[fromR]?.[fromC];
    const toCell = grid[toR]?.[toC];
    if (!fromCell || !toCell) return false;

    if (fromCell.type === CellType.ROTATOR) {
      if (!this.isMoveAllowedThroughRotator(fromR, fromC, toR, toC, fromCell)) {
        return false;
      }
    }
    if (toCell.type === CellType.ROTATOR) {
      if (!this.isMoveAllowedThroughRotator(fromR, fromC, toR, toC, toCell)) {
        return false;
      }
    }
    return true;
  }

  static isLevelComplete(level: Level): boolean {
    // All non-wall, non-dot cells must be filled with a path
    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        const cell = level.grid[r][c];
        if (cell.type === CellType.WALL) continue;
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

      const currCell = level.grid[curr.r][curr.c];

      // Teleporter jump logic
      if (currCell.type === CellType.TELEPORTER) {
        const pairId = currCell.colorIndex;
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

        // 1. WALL check
        if (cell.type === CellType.WALL) continue;

        // 2. ROTATOR check
        if (!this.isRotatorPassable(curr.r, curr.c, nr, nc, level.grid)) continue;

        // 3. GATE check
        if (cell.type === CellType.GATE) {
          const keyColor = cell.colorIndex;
          const isUnlocked = level.grid.flat().some(f => f.type === CellType.KEY && f.colorIndex === keyColor && f.isPath);
          if (!isUnlocked) continue;
        }

        // 4. BRIDGE check
        let isPathColor = false;
        if (cell.type === CellType.BRIDGE) {
          const isHorizontal = curr.r === nr;
          if (isHorizontal) {
            isPathColor = cell.isPathH === true && cell.pathColorIndexH === colorIndex;
          } else {
            isPathColor = cell.isPathV === true && cell.pathColorIndexV === colorIndex;
          }
        } else {
          isPathColor = cell.pathColorIndex === colorIndex && cell.isPath;
        }

        const isTargetDot = cell.type === CellType.DOT && cell.colorIndex === colorIndex;

        if (isPathColor || isTargetDot) {
          visited.add(`${nr},${nc}`);
          queue.push({ r: nr, c: nc });
        }
      }
    }

    return false;
  }
}
