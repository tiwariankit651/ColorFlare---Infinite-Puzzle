import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Plus, Trash2, Check, Edit3, Save, AlertCircle, RefreshCw, Grid, PlayCircle, Star, Sparkles, Sliders } from 'lucide-react';
import { GameBoard } from './GameBoard';
import { sounds } from '../lib/sounds';
import confetti from 'canvas-confetti';
import { Level, Cell, CellType } from '../types';
import { PathValidator } from '../logic/pathValidator';

interface LevelEditorScreenProps {
  onBack: () => void;
  username: string;
}

interface CustomLevelSaved {
  id: string;
  name: string;
  gridSize: number;
  colorCount: number;
  dots: { r: number; c: number; colorIndex: number }[];
  walls: { r: number; c: number }[];
}

const PALETTE_COLORS = [
  '#EF4444', // Red (0)
  '#3B82F6', // Blue (1)
  '#10B981', // Emerald (2)
  '#F59E0B', // Amber (3)
  '#8B5CF6', // Violet (4)
  '#06B6D4', // Cyan (5)
];

export const LevelEditorScreen: React.FC<LevelEditorScreenProps> = ({ onBack, username }) => {
  // Library vs Workspace Mode
  const [activeTab, setActiveTab] = useState<'editor' | 'creations'>('creations');

  // Creation options
  const [gridSize, setGridSize] = useState<number>(5);
  const [levelName, setLevelName] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Editor Workspace Grid State
  // Cell item can have type ('empty', 'dot', 'wall') and a colorIndex if dot
  const [editorGrid, setEditorGrid] = useState<Cell[][]>([]);

  // Selected tool in Palette Toolbar
  // 'empty' | 'wall' | number (color index for dots)
  const [selectedTool, setSelectedTool] = useState<string | number>('wall');

  // Playtesting active state
  const [playtestActive, setPlaytestActive] = useState<boolean>(false);
  const [playtestGrid, setPlaytestGrid] = useState<any[][] | null>(null);
  const [playtestMoves, setPlaytestMoves] = useState(0);
  const [playtestLevelObj, setPlaytestLevelObj] = useState<Level | null>(null);
  const [playtestPass, setPlaytestPass] = useState(false);

  // Creations Library
  const [savedCreations, setSavedCreations] = useState<CustomLevelSaved[]>([]);

  // Load custom creations from LocalStorage
  useEffect(() => {
    const list = localStorage.getItem('colorflow_custom_creations');
    if (list) {
      try {
        setSavedCreations(JSON.parse(list));
      } catch (e) {
        console.error('Failed to load custom levels', e);
      }
    }
  }, []);

  // Sync saved creations
  const saveCreationsToStorage = (newList: CustomLevelSaved[]) => {
    setSavedCreations(newList);
    localStorage.setItem('colorflow_custom_creations', JSON.stringify(newList));
  };

  // Build/Re-initialise editor grid workspace when size changes
  useEffect(() => {
    const freshGrid: Cell[][] = Array.from({ length: gridSize }, (_, r) =>
      Array.from({ length: gridSize }, (_, c) => ({
        row: r,
        col: c,
        type: CellType.EMPTY,
        isPath: false,
      }))
    );
    setEditorGrid(freshGrid);
    setLevelName(`Level Created by ${username || 'FlowBuilder'}`);
    setValidationError(null);
  }, [gridSize, username]);

  // Handle cell painter action
  const paintCell = (r: number, c: number) => {
    sounds.playClick();
    const nextGrid = editorGrid.map((row) => row.map((cell) => ({ ...cell })));

    if (selectedTool === 'empty') {
      nextGrid[r][c] = {
        row: r,
        col: c,
        type: CellType.EMPTY,
        isPath: false,
      };
    } else if (selectedTool === 'wall') {
      // Set wall
      nextGrid[r][c] = {
        row: r,
        col: c,
        type: CellType.WALL,
        isPath: false,
      };
    } else {
      // Paint is a Dot of a selectedColor index
      const colorIdx = selectedTool as number;
      // Let's count existing dots of this color. Max 2 since they require a single line connection!
      let count = 0;
      nextGrid.forEach((row) => {
        row.forEach((cell) => {
          if (cell.type === CellType.DOT && cell.colorIndex === colorIdx) {
            count++;
          }
        });
      });

      if (count >= 2) {
        // Find existing dots of this color and reset the oldest one to regular empty grid space
        let removed = false;
        for (let rowIdx = 0; rowIdx < gridSize; rowIdx++) {
          for (let colIdx = 0; colIdx < gridSize; colIdx++) {
            if (nextGrid[rowIdx][colIdx].type === CellType.DOT && nextGrid[rowIdx][colIdx].colorIndex === colorIdx) {
              nextGrid[rowIdx][colIdx] = {
                row: rowIdx,
                col: colIdx,
                type: CellType.EMPTY,
                isPath: false,
              };
              removed = true;
              break;
            }
          }
          if (removed) break;
        }
      }

      nextGrid[r][c] = {
        row: r,
        col: c,
        type: CellType.DOT,
        colorIndex: colorIdx,
        isPath: false,
      };
    }

    setEditorGrid(nextGrid);
    setValidationError(null);
  };

  // Perform custom puzzle validation
  const runValidator = (): { isValid: boolean; colorsCount: number; errorMsg?: string } => {
    // 1. Gather all dots grouped by color
    const dotCounts: Record<number, number> = {};
    let totalDots = 0;

    editorGrid.forEach((row) => {
      row.forEach((cell) => {
        if (cell.type === CellType.DOT) {
          const colorIdx = cell.colorIndex!;
          dotCounts[colorIdx] = (dotCounts[colorIdx] || 0) + 1;
          totalDots++;
        }
      });
    });

    const colors = Object.keys(dotCounts).map(Number);

    if (colors.length === 0) {
      return { isValid: false, colorsCount: 0, errorMsg: 'Add at least 2 pairs of matching colored dots!' };
    }

    if (colors.length < 2) {
      return { isValid: false, colorsCount: colors.length, errorMsg: 'Puzzles require at least 2 distinct color networks.' };
    }

    // Check if each color has exactly 2 endpoints (starting and ending dots)
    for (const colorIdx of colors) {
      if (dotCounts[colorIdx] !== 2) {
        return { 
          isValid: false, 
          colorsCount: colors.length, 
          errorMsg: `Color ${colorIdx + 1} is unbalanced (found ${dotCounts[colorIdx]} end points, need exactly 2!)` 
        };
      }
    }

    return { isValid: true, colorsCount: colors.length };
  };

  // Launch Playtest session
  const startPlaytest = () => {
    sounds.playClick();
    const check = runValidator();
    if (!check.isValid) {
      setValidationError(check.errorMsg || 'Invalid board layout');
      return;
    }

    // Build gameplay elements
    const dotsCount = check.colorsCount;
    // Map colors to compact indexes so that the GameBoard maps them beautifully
    const customLevel: Level = {
      number: 99999, // Dynamic level code
      gridSize: gridSize,
      grid: editorGrid.map(row => row.map(cell => ({ ...cell }))),
      colorCount: dotsCount
    };

    setPlaytestLevelObj(customLevel);
    setPlaytestGrid(editorGrid.map(row => row.map(cell => ({ ...cell }))));
    setPlaytestMoves(0);
    setPlaytestPass(false);
    setPlaytestActive(true);
  };

  const handlePlaytestComplete = () => {
    setPlaytestPass(true);
    sounds.playComplete();

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.7 },
      colors: PALETTE_COLORS
    });
  };

  // Exit Playtest back to Workspace painter
  const closePlaytest = () => {
    sounds.playClick();
    setPlaytestActive(false);
    setPlaytestGrid(null);
    setPlaytestLevelObj(null);
  };

  // Save creation to library
  const saveCreation = () => {
    sounds.playClick();
    const check = runValidator();
    if (!check.isValid) {
      setValidationError(check.errorMsg || 'Invalid board layout');
      window.scrollTo(0, 0);
      return;
    }

    // Gather dots details
    const dots: { r: number; c: number; colorIndex: number }[] = [];
    const walls: { r: number; c: number }[] = [];

    editorGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.type === CellType.DOT) {
          dots.push({ r, c, colorIndex: cell.colorIndex! });
        } else if (cell.type === CellType.WALL) {
          walls.push({ r, c });
        }
      });
    });

    const newLevel: CustomLevelSaved = {
      id: `usr_lvl_${Date.now()}`,
      name: levelName.trim() || `My Custom flow ${savedCreations.length + 1}`,
      gridSize,
      colorCount: check.colorsCount,
      dots,
      walls
    };

    const nextList = [newLevel, ...savedCreations];
    saveCreationsToStorage(nextList);

    confetti({
      particleCount: 85,
      spread: 60,
      origin: { y: 0.6 }
    });

    setLevelName('');
    setActiveTab('creations');
  };

  const deleteCreation = (id: string) => {
    if (confirm('Delete this custom puzzle design forever?')) {
      sounds.playClick();
      const updated = savedCreations.filter(c => c.id !== id);
      saveCreationsToStorage(updated);
    }
  };

  // Trigger play a saved creation from Creations Library
  const playCreationLvl = (lvl: CustomLevelSaved) => {
    sounds.playClick();
    // Setup gameplay grid
    const freshGrid: Cell[][] = Array.from({ length: lvl.gridSize }, (_, r) =>
      Array.from({ length: lvl.gridSize }, (_, c) => {
        // Is it a wall?
        const isWall = lvl.walls.some(w => w.r === r && w.c === c);
        if (isWall) return { row: r, col: c, type: CellType.WALL, isPath: false };

        // Is it a dot?
        const dot = lvl.dots.find(d => d.r === r && d.c === c);
        if (dot) return { row: r, col: c, type: CellType.DOT, colorIndex: dot.colorIndex, isPath: false };

        return { row: r, col: c, type: CellType.EMPTY, isPath: false };
      })
    );

    // Setup playable Level structure
    const customPlayLvl: Level = {
      number: 88888,
      gridSize: lvl.gridSize,
      grid: freshGrid,
      colorCount: lvl.colorCount
    };

    setPlaytestLevelObj(customPlayLvl);
    setPlaytestGrid(freshGrid.map(row => row.map(cell => ({ ...cell }))));
    setPlaytestMoves(0);
    setPlaytestPass(false);
    setPlaytestActive(true);
  };

  return (
    <div className="fixed inset-0 bg-[#1c1917] flex flex-col text-white overflow-hidden p-0 h-screen w-full">
      {/* Background Ambience Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] rounded-full opacity-10 bg-amber-500 blur-[150px]"
        />
        <motion.div 
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full opacity-10 bg-orange-600 blur-[120px]"
        />
      </div>

      <header className="flex items-center p-6 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 justify-between">
        <div className="flex items-center">
          <motion.button 
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="p-2 hover:bg-white/10 rounded-xl transition-colors mr-4 bg-white/5 border border-white/5"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black italic tracking-tighter uppercase leading-none">CELLS DESIGNER</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase">Interactive Level Builder Suite</span>
            </div>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          <button 
            onClick={() => { sounds.playClick(); setActiveTab('creations'); }}
            className={`px-4 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
              activeTab === 'creations' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-white/40 hover:text-white'
            }`}
          >
            Studio Creations
          </button>
          <button 
            onClick={() => { sounds.playClick(); setActiveTab('editor'); }}
            className={`px-4 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
              activeTab === 'editor' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-white/40 hover:text-white'
            }`}
          >
            Developer Hub
          </button>
        </div>
      </header>

      {playtestActive ? (
        /* PLAYTEST ACTIVE RUNNING GAME */
        <div className="flex-1 flex flex-col justify-between p-6 z-10 select-none max-w-lg mx-auto w-full">
          <div className="text-center mt-2">
            <span className="text-[10px] font-black tracking-[0.3em] text-amber-500 uppercase">PLAYTEST WORKSPACE CHIP</span>
            <h3 className="text-xl font-black italic tracking-tighter mt-1">
              {playtestPass ? '🧩 PUZZLE SOLVABLE!' : '💡 TESTING INTERACTIVE LAUNCH'}
            </h3>
            
            <div className="flex justify-center gap-6 mt-4 bg-black/40 border border-white/5 py-2.5 px-6 rounded-2xl max-w-xs mx-auto font-mono text-[10px]">
              <div className="flex flex-col items-center">
                <span className="text-white/30 uppercase tracking-widest font-black mb-0.5">Moves</span>
                <span className="text-sm font-black italic text-[#10B981]">{playtestMoves}</span>
              </div>
              <div className="w-px h-6 bg-white/5 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-white/30 uppercase tracking-widest font-black mb-0.5">Board Layout</span>
                <span className="text-sm font-black text-amber-400">{playtestLevelObj?.gridSize}x{playtestLevelObj?.gridSize} Size</span>
              </div>
            </div>
          </div>

          <div className="my-8 flex justify-center items-center">
            {playtestGrid && playtestLevelObj && (
              <div className="w-full max-w-[340px] aspect-square">
                <GameBoard 
                  level={playtestLevelObj}
                  grid={playtestGrid}
                  setGrid={setPlaytestGrid}
                  colors={PALETTE_COLORS}
                  onComplete={handlePlaytestComplete}
                  onMove={() => setPlaytestMoves(prev => prev + 1)}
                  moveCount={playtestMoves}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {playtestPass ? (
              <motion.button
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={closePlaytest}
                className="w-full py-4 bg-amber-500 text-black font-black italic text-xs tracking-widest rounded-2xl flex items-center justify-center gap-1.5 shadow-2xl hover:bg-amber-400 transition-colors"
              >
                PASS SUCCESS! BACK TO CANVAS
              </motion.button>
            ) : (
              <button 
                onClick={closePlaytest}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black italic text-xs tracking-widest rounded-2xl flex items-center justify-center gap-1.5 transition-all uppercase border border-white/5"
              >
                CLOSE TEST SESSION
              </button>
            )}
          </div>
        </div>
      ) : activeTab === 'editor' ? (
        /* WORKSPACE CANVAS / EDITOR TABLE */
        <main className="flex-1 overflow-y-auto p-6 space-y-6 z-10 custom-scrollbar pb-24 max-w-lg mx-auto w-full">
          {validationError && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-3xl flex items-start gap-3 mt-1">
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
              <p className="text-rose-300 text-xs font-black tracking-tight leading-relaxed uppercase">{validationError}</p>
            </div>
          )}

          {/* Sizing & Metadata */}
          <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 space-y-5 shadow-inner">
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 px-1">Configure Map Scale</h3>

            <div className="flex items-center justify-between bg-black/25 p-4 rounded-2xl border border-white/5">
              <span className="text-xs font-bold text-white/40 uppercase">Canvas Dimensions:</span>
              <div className="flex gap-2">
                {[5, 6, 7].map((size) => (
                  <button
                    key={size}
                    onClick={() => { sounds.playClick(); setGridSize(size); }}
                    className={`w-10 h-10 rounded-xl font-black font-mono flex items-center justify-center border-2 transition-all ${
                      gridSize === size 
                        ? 'bg-amber-500 text-black border-amber-500 font-black scale-105 shadow-md shadow-amber-500/20' 
                        : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] px-1 block">Custom Level Label Name:</label>
              <input
                type="text"
                placeholder="Enter custom arena title..."
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                className="w-full bg-black/20 border border-white/5 hover:border-white/10 focus:border-amber-500 font-bold px-4 py-3.5 rounded-2xl text-xs placeholder:text-white/20 tracking-tight focus:outline-none focus:ring-0 transition-colors"
                maxLength={40}
              />
            </div>
          </div>

          {/* Workspace Painter Board Grid Canvas */}
          <div className="flex flex-col items-center">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-4 px-2 tracking-widest">TAP TILES TO PAINT MAP DATA</h3>
            
            {/* Painting Canvas Grid */}
            <div 
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
              className="grid gap-[2.5px] p-2 bg-black/50 border border-white/5 rounded-[2rem] w-full max-w-[340px] aspect-square overflow-hidden"
            >
              {editorGrid.map((row, r) => 
                row.map((cell, c) => {
                  let cellBgColor = 'rgba(255,255,255,0.03)';
                  let cellContentRender = null;

                  if (cell.type === CellType.WALL) {
                    cellBgColor = '#292524'; // dark neutral wall block
                    cellContentRender = <div className="w-full h-full bg-[#3c3633] rounded-[4px] border border-stone-800/50 shadow-inner" />;
                  } else if (cell.type === CellType.DOT) {
                    const dotColor = PALETTE_COLORS[cell.colorIndex!];
                    cellContentRender = (
                      <div 
                        style={{ backgroundColor: dotColor, boxShadow: `0 0 15px ${dotColor}80` }}
                        className="w-3/5 h-3/5 rounded-full border border-white animate-pulse" 
                      />
                    );
                  }

                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => paintCell(r, c)}
                      className="relative w-full aspect-square flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                      style={{ backgroundColor: cellBgColor }}
                    >
                      {cellContentRender}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Toolbox Toolbar Selector */}
          <div className="bg-stone-900/40 p-5 rounded-[2.5rem] border border-white/5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] text-center mb-1">DESIGN PALETTE ELEMENTS BRUSH</h4>

            <div className="flex flex-wrap gap-2 justify-center">
              {/* Reset/Eraser tool */}
              <button
                onClick={() => { sounds.playClick(); setSelectedTool('empty'); }}
                className={`px-4 h-11 rounded-2xl flex items-center justify-center gap-1.5 border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedTool === 'empty' 
                    ? 'bg-amber-500 text-black border-amber-500 scale-105 font-black shadow-lg shadow-amber-500/20' 
                    : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'
                }`}
              >
                🎨 Eraser
              </button>

              {/* Roadblock/Wall tool */}
              <button
                onClick={() => { sounds.playClick(); setSelectedTool('wall'); }}
                className={`px-4 h-11 rounded-2xl flex items-center justify-center gap-1.5 border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedTool === 'wall' 
                    ? 'bg-amber-500 text-black border-amber-500 scale-105 font-black shadow-lg shadow-amber-500/20' 
                    : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'
                }`}
              >
                🧱 Walls
              </button>

              <div className="w-full h-px bg-white/5 my-2" />

              {/* Color dots picker */}
              {PALETTE_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => { sounds.playClick(); setSelectedTool(idx); }}
                  className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedTool === idx 
                      ? 'border-white scale-110 shadow-lg shadow-white/10' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  <span className="text-[8px] font-black text-black bg-white rounded-full w-4 h-4 flex items-center justify-center">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Hub action triggers */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={startPlaytest}
              className="py-4 bg-[#78350F]/20 text-orange-400 hover:bg-[#78350F]/45 border border-orange-500/20 rounded-2xl font-black italic tracking-widest text-xs flex items-center justify-center gap-2 transition-colors uppercase shadow-md"
            >
              <PlayCircle size={14} /> PLAYTEST CHIP
            </button>

            <button
              onClick={saveCreation}
              className="py-4 bg-amber-500 text-black hover:bg-amber-400 rounded-2xl font-black italic tracking-widest text-xs flex items-center justify-center gap-2 transition-colors uppercase shadow-xl"
            >
              <Check size={14} /> SAVE PUZZLE
            </button>
          </div>
        </main>
      ) : (
        /* CREATIONS LIBRARY SCREEN */
        <main className="flex-1 overflow-y-auto p-6 space-y-6 z-10 custom-scrollbar pb-24 max-w-lg mx-auto w-full">
          {/* Create puzzle call-to-action banner card */}
          <div className="bg-gradient-to-br from-[#78350f]/20 via-[#451a03]/10 to-black/30 border border-white/5 rounded-[2.5rem] p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-500/15 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
              <Plus size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black italic text-stone-200">Craft Custom Puzzles</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                Place starter nodes, build tricky blockers, design pathways, and playtest layouts instantly!
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { sounds.playClick(); setActiveTab('editor'); }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black italic text-xs tracking-widest rounded-2xl uppercase transition-colors inline-block"
            >
              Launch Blueprint Studio
            </motion.button>
          </div>

          {/* Saved Levels Playlist list */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-black uppercase tracking-[0.4em] text-white/30 px-2">YOUR STUDIO REPERTOIRE ({savedCreations.length})</h4>

            {savedCreations.length === 0 ? (
              <div className="text-center py-12 bg-white/5 border border-white/5 rounded-[2rem] p-6">
                <Grid className="text-white/15 mx-auto mb-3 animate-pulse" size={40} />
                <p className="text-sm font-semibold text-white/30 uppercase tracking-[0.2em] mb-1">Studio Library Empty</p>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Jump to Developer Hub to draft your first board blueprint.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedCreations.map((lvl) => (
                  <div 
                    key={lvl.id}
                    className="p-5 rounded-[2.25rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/25 flex items-center justify-center font-black italic text-lg shadow-inner">
                        {lvl.gridSize}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-black italic tracking-wide uppercase">{lvl.name}</span>
                        <div className="flex items-center gap-2 mt-1 font-mono text-[9px] text-white/40">
                          <span>{lvl.gridSize}x{lvl.gridSize} Scale</span>
                          <span className="w-1 h-1 bg-white/25 rounded-full" />
                          <span>{lvl.colorCount} Colors</span>
                          {lvl.walls.length > 0 && (
                            <>
                              <span className="w-1 h-1 bg-white/25 rounded-full" />
                              <span className="text-orange-400">{lvl.walls.length} Blocks</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => playCreationLvl(lvl)}
                        className="p-3 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded-xl transition-all border border-[#10b981]/25"
                      >
                        <PlayCircle size={16} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteCreation(lvl.id)}
                        className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/10"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
};
