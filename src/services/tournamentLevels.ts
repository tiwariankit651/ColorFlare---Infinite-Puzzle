import { Level, Cell, CellType } from '../types';
import { LevelGenerator } from '../logic/levelGenerator';

export interface BaseTemplate {
  size: number;
  colorCount: number;
  dots: { r: number; c: number; colorIndex: number }[];
  walls?: { r: number; c: number }[];
}

export const BASE_TEMPLATES: BaseTemplate[] = [
  // 1. Easy 1: 5x5, 4 colors (Concentric Ls)
  {
    size: 5,
    colorCount: 4,
    dots: [
      { r: 0, c: 0, colorIndex: 0 },
      { r: 4, c: 2, colorIndex: 0 },
      { r: 0, c: 1, colorIndex: 1 },
      { r: 0, c: 2, colorIndex: 1 },
      { r: 0, c: 3, colorIndex: 2 },
      { r: 4, c: 4, colorIndex: 2 },
      { r: 0, c: 4, colorIndex: 3 },
      { r: 3, c: 4, colorIndex: 3 }
    ]
  },
  // 2. Easy 2: 5x5, 4 colors (Winding snake)
  {
    size: 5,
    colorCount: 4,
    dots: [
      { r: 4, c: 0, colorIndex: 0 },
      { r: 4, c: 4, colorIndex: 0 },
      { r: 1, c: 1, colorIndex: 1 },
      { r: 4, c: 1, colorIndex: 1 },
      { r: 0, c: 3, colorIndex: 2 },
      { r: 3, c: 4, colorIndex: 2 },
      { r: 0, c: 4, colorIndex: 3 },
      { r: 2, c: 4, colorIndex: 3 }
    ]
  },
  // 3. Medium 1: 6x6, 5 colors (Inner wrapping coils)
  {
    size: 6,
    colorCount: 5,
    dots: [
      { r: 0, c: 0, colorIndex: 0 },
      { r: 5, c: 5, colorIndex: 0 },
      { r: 0, c: 1, colorIndex: 1 },
      { r: 4, c: 5, colorIndex: 1 },
      { r: 0, c: 2, colorIndex: 2 },
      { r: 3, c: 5, colorIndex: 2 },
      { r: 0, c: 3, colorIndex: 3 },
      { r: 2, c: 5, colorIndex: 3 },
      { r: 0, c: 4, colorIndex: 4 },
      { r: 1, c: 4, colorIndex: 4 }
    ]
  },
  // 4. Medium 2: 6x6, 5 colors with central walls (Perfectly symmetrical surround)
  {
    size: 6,
    colorCount: 5,
    walls: [
      { r: 2, c: 2 },
      { r: 2, c: 3 },
      { r: 3, c: 2 },
      { r: 3, c: 3 }
    ],
    dots: [
      { r: 0, c: 0, colorIndex: 0 },
      { r: 5, c: 2, colorIndex: 0 },
      { r: 0, c: 1, colorIndex: 1 },
      { r: 4, c: 2, colorIndex: 1 },
      { r: 0, c: 2, colorIndex: 2 },
      { r: 0, c: 3, colorIndex: 2 },
      { r: 5, c: 3, colorIndex: 3 },
      { r: 0, c: 5, colorIndex: 3 },
      { r: 4, c: 3, colorIndex: 4 },
      { r: 0, c: 4, colorIndex: 4 }
    ]
  },
  // 5. Hard 1: 7x7, 5 colors (Spiraling nested tracks)
  {
    size: 7,
    colorCount: 5,
    dots: [
      { r: 0, c: 0, colorIndex: 0 },
      { r: 6, c: 3, colorIndex: 0 },
      { r: 0, c: 1, colorIndex: 1 },
      { r: 5, c: 3, colorIndex: 1 },
      { r: 0, c: 2, colorIndex: 2 },
      { r: 4, c: 4, colorIndex: 2 },
      { r: 6, c: 4, colorIndex: 3 },
      { r: 0, c: 6, colorIndex: 3 },
      { r: 5, c: 4, colorIndex: 4 },
      { r: 0, c: 5, colorIndex: 4 }
    ]
  },
  // 6. Hard 2: 7x7, 5 colors with core walls (Complex squeezing routing)
  {
    size: 7,
    colorCount: 5,
    walls: [
      { r: 3, c: 3 },
      { r: 3, c: 4 },
      { r: 4, c: 3 },
      { r: 4, c: 4 }
    ],
    dots: [
      { r: 0, c: 0, colorIndex: 0 },
      { r: 6, c: 4, colorIndex: 0 },
      { r: 1, c: 1, colorIndex: 1 },
      { r: 1, c: 5, colorIndex: 1 },
      { r: 4, c: 2, colorIndex: 2 },
      { r: 2, c: 4, colorIndex: 2 },
      { r: 6, c: 5, colorIndex: 3 },
      { r: 0, c: 1, colorIndex: 3 },
      { r: 1, c: 4, colorIndex: 4 },
      { r: 1, c: 2, colorIndex: 4 }
    ]
  },
  // 7. Hard 3: 7x7, 6 colors (Ultimate hex-concentric puzzle)
  {
    size: 7,
    colorCount: 6,
    dots: [
      { r: 0, c: 0, colorIndex: 0 },
      { r: 6, c: 1, colorIndex: 0 },
      { r: 1, c: 1, colorIndex: 1 },
      { r: 5, c: 4, colorIndex: 1 },
      { r: 2, c: 2, colorIndex: 2 },
      { r: 4, c: 4, colorIndex: 2 },
      { r: 6, c: 2, colorIndex: 3 },
      { r: 3, c: 6, colorIndex: 3 },
      { r: 5, c: 5, colorIndex: 4 },
      { r: 1, c: 2, colorIndex: 4 },
      { r: 2, c: 6, colorIndex: 5 },
      { r: 0, c: 1, colorIndex: 5 }
    ]
  }
];

// Map a coordinate symmetrically depending on day of week to give infinitely fresh layouts
export function transformCoordinate(row: number, col: number, size: number, dayIndex: number) {
  let r = row;
  let c = col;
  const mod = dayIndex % 8;

  switch (mod) {
    case 0: // Identity (no change)
      break;
    case 1: // Rotate 90 deg
      r = col;
      c = size - 1 - row;
      break;
    case 2: // Rotate 180 deg
      r = size - 1 - row;
      c = size - 1 - col;
      break;
    case 3: // Rotate 270 deg
      r = size - 1 - col;
      c = row;
      break;
    case 4: // Horizontal mirror
      c = size - 1 - col;
      break;
    case 5: // Vertical mirror
      r = size - 1 - row;
      break;
    case 6: // Transpose
      r = col;
      c = row;
      break;
    default: // Anti-transpose
      r = size - 1 - col;
      c = size - 1 - row;
      break;
  }
  return { r, c };
}

/**
 * Generates 7 daily tournament levels: 2 Easy, 2 Medium, 3 Hard.
 * Employs LevelGenerator with day-based seeding to guarantee the levels are:
 * 1. Exactly the same for all players on a given day.
 * 2. 100% solvable with precise mathematical solutions.
 * 3. Filled with the exciting interactive concepts like bridges, teleporters, dividers, key-gates, etc.
 */
export function getDailyTournamentLevels(dayIndex: number): Level[] {
  const levels: Level[] = [];
  
  // Setups for tournament progression:
  // idx 0-1: Easy (effective levels around 6-10 -> 5x5 grid)
  // idx 2-3: Medium (effective levels around 16-20 -> 6x6 grid)
  // idx 4-6: Hard (effective levels around 31-40 -> 7x7 grid)
  const configs = [
    { levelNum: 8, isHard: false },  // Easy
    { levelNum: 10, isHard: false }, // Easy
    { levelNum: 18, isHard: false }, // Medium
    { levelNum: 22, isHard: false }, // Medium
    { levelNum: 35, isHard: true },  // Hard
    { levelNum: 40, isHard: true },  // Hard
    { levelNum: 45, isHard: true }   // Hard
  ];

  for (let idx = 0; idx < 7; idx++) {
    const cfg = configs[idx];
    // Deterministic daily seeds to keep it identical for all tournament candidates on a given day
    const uniqueSeed = (dayIndex * 317 + idx * 79 + 53) % 10000;
    const generator = new LevelGenerator(uniqueSeed);
    
    let lvl = generator.generate(cfg.levelNum);
    
    // For hard levels, apply hard mode overlays like teleporter linkages and rotator swaps
    if (cfg.isHard) {
      lvl = generator.applyHardMode(lvl);
    }
    
    // Attach stable, consecutive level identifier
    lvl.number = 9000 + (dayIndex * 10) + idx;
    
    levels.push(lvl);
  }
  
  return levels;
}
