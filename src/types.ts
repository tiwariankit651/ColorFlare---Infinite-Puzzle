
export enum CellType {
  EMPTY = 'empty',
  DOT = 'dot',
  WALL = 'wall',
  ROTATOR = 'rotator',
  TELEPORTER = 'teleporter'
}

export interface Cell {
  row: number;
  col: number;
  type: CellType;
  colorIndex?: number;
  isPath: boolean;
  pathColorIndex?: number;
}

export interface Level {
  number: number;
  gridSize: number;
  grid: Cell[][];
  colorCount: number;
  solutionPaths?: { r: number, c: number }[][];
}

export type ThemeName = 'forest' | 'ocean' | 'space' | 'candy' | 'desert' | 'arctic' | 'volcano' | 'garden' | 'city' | 'clouds';
export type MusicStyle = 'calm' | 'upbeat' | 'lofi' | 'nature' | 'retro' | 'none';
export type AccentColor = 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'teal' | 'red' | 'amber';

export interface GameState {
  currentLevel: number;
  stars: number;
  theme: ThemeName;
  accentColor: AccentColor;
  volume: number;
}
