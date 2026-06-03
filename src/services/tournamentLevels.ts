import { Level, Cell, CellType } from '../types';

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

export function getDailyTournamentLevels(dayIndex: number): Level[] {
  return BASE_TEMPLATES.map((template, idx) => {
    const size = template.size;
    const colorsCount = template.colorCount;
    const levelNumber = 9000 + (dayIndex * 10) + idx;

    // Initialize clean grid
    const grid: Cell[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => ({
        row: r,
        col: c,
        type: CellType.EMPTY,
        isPath: false
      }))
    );

    // Place and transform walls
    if (template.walls) {
      template.walls.forEach(wall => {
        const { r: tr, c: tc } = transformCoordinate(wall.r, wall.c, size, dayIndex);
        grid[tr][tc] = {
          row: tr,
          col: tc,
          type: CellType.WALL,
          isPath: false
        };
      });
    }

    // Place and transform dots
    template.dots.forEach(dot => {
      const { r: tr, c: tc } = transformCoordinate(dot.r, dot.c, size, dayIndex);
      // Permute color indices to change visual tones daily
      const finalColorIndex = (dot.colorIndex + dayIndex) % colorsCount;
      grid[tr][tc] = {
        row: tr,
        col: tc,
        type: CellType.DOT,
        colorIndex: finalColorIndex,
        isPath: false
      };
    });

    return {
      number: levelNumber,
      gridSize: size,
      grid: grid,
      colorCount: colorsCount
    };
  });
}
