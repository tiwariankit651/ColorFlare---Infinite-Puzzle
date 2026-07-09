
export enum CellType {
  EMPTY = 'empty',
  DOT = 'dot',
  WALL = 'wall',
  ROTATOR = 'rotator',
  TELEPORTER = 'teleporter',
  KEY = 'key',
  GATE = 'gate',
  BRIDGE = 'bridge'
}

export interface Cell {
  row: number;
  col: number;
  type: CellType;
  colorIndex?: number;
  isPath: boolean;
  pathColorIndex?: number;
  isPathH?: boolean;
  isPathV?: boolean;
  pathColorIndexH?: number;
  pathColorIndexV?: number;
  rotation?: number;
  variety?: 'straight' | 'curved';
}

export interface Level {
  number: number;
  gridSize: number;
  grid: Cell[][];
  colorCount: number;
  solutionPaths?: { r: number, c: number }[][];
  strategyName?: string;
  strategyDesc?: string;
  strategyType?: string;
  isHardMode?: boolean;
  maxMoves?: number;
  timeLimit?: number;
}

export type ThemeName = 'forest' | 'ocean' | 'space' | 'candy' | 'desert' | 'arctic' | 'volcano' | 'garden' | 'city' | 'clouds' | 'cyber' | 'zen';
export type MusicStyle = 'calm' | 'upbeat' | 'lofi' | 'nature' | 'retro' | 'jazz' | 'ambient' | 'deep' | 'pulse' | 'ethereal' | 'none';
export type AccentColor = 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'teal' | 'red' | 'amber';

export interface GameState {
  currentLevel: number;
  stars: number;
  theme: ThemeName;
  accentColor: AccentColor;
  volume: number;
}
