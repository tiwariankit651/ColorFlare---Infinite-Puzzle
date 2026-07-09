import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Level, CellType } from '../types';
import { PathValidator } from '../logic/pathValidator';
import { CellComponent } from './Cell';
import { sounds } from '../lib/sounds';

interface GameBoardProps {
  level: Level;
  grid: any[][];
  setGrid: (grid: any[][]) => void;
  onComplete: (finalGrid?: any[][]) => void;
  colors: string[];
  hintPath?: { r: number, c: number }[];
  onMove?: (nextGrid: any[][], colorIndex: number, isStartStroke?: boolean) => void;
  onError?: () => void;
  moveCount?: number;
  showingSolution?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  level, 
  grid, 
  setGrid, 
  onComplete, 
  colors, 
  hintPath, 
  onMove, 
  onError, 
  moveCount = 0, 
  showingSolution = false 
}) => {
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [lastCell, setLastCell] = useState<{ r: number, c: number } | null>(null);
  const [startCell, setStartCell] = useState<{ r: number, c: number } | null>(null);
  const [pulsePos, setPulsePos] = useState<{ r: number, c: number, color: string } | null>(null);
  const [hasClearedThisStroke, setHasClearedThisStroke] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearColor = useCallback((colorIndex: number) => {
    if (showingSolution) return;
    setGrid(grid.map(row => 
      row.map(cell => {
        if (cell.pathColorIndex === colorIndex) {
          return { ...cell, isPath: false, pathColorIndex: undefined };
        }
        return cell;
      })
    ));
  }, [grid, setGrid, showingSolution]);

  const handleCellInteraction = useCallback((r: number, c: number, isInitiating: boolean = false) => {
    if (showingSolution) return;
    if (r < 0 || r >= grid.length || c < 0 || c >= (grid[r]?.length || 0)) return;
    const cell = grid[r][c];

    // Case 1: Start drawing
    if (isInitiating) {
      if (cell.type === CellType.DOT) {
        const colorIdx = cell.colorIndex!;
        onMove?.(grid, colorIdx, true);
        // Do NOT clearColor immediately on click/touch to prevent losing existing paths on simple taps.
        setActiveColor(colorIdx);
        setLastCell({ r, c });
        setStartCell({ r, c });
        setHasClearedThisStroke(false);
        sounds.playClick();
      }
      return;
    }

    // Case 2: Continue path
    if (activeColor === null || lastCell === null) return;
    if (cell.type === CellType.WALL || cell.type === CellType.ROTATOR) return;

    // Must be adjacent
    const dr = Math.abs(r - lastCell.r);
    const dc = Math.abs(c - lastCell.c);
    if (dr + dc !== 1) {
      if (dr + dc > 0) onError?.();
      return;
    }

    // Handle initial clearing of path if we move to a cell that is not part of the existing path
    let currentGrid = grid;
    if (!hasClearedThisStroke) {
      const isPartOfExistingPath = cell.pathColorIndex === activeColor && cell.isPath;
      if (!isPartOfExistingPath) {
        currentGrid = grid.map(row => 
          row.map(cItem => {
            if (cItem.pathColorIndex === activeColor) {
              return { ...cItem, isPath: false, pathColorIndex: undefined };
            }
            return cItem;
          })
        );
        setHasClearedThisStroke(true);
      }
    }

    const cellState = currentGrid[r][c];

    // Blocked by DOTs of other colors
    if (cellState.type === CellType.DOT && cellState.colorIndex !== activeColor) {
      onError?.();
      return;
    }

    // Can't go on another color's path - but in ColorFlare, we break/clear the crossed color path for forgiveness!
    if (cellState.isPath && cellState.pathColorIndex !== activeColor) {
      const crossedColor = cellState.pathColorIndex;
      currentGrid = currentGrid.map(row => 
        row.map(cItem => {
          if (cItem.pathColorIndex === crossedColor) {
            return { ...cItem, isPath: false, pathColorIndex: undefined };
          }
          return cItem;
        })
      );
    }

    const nextGrid = [...currentGrid.map(row => [...row])];
    nextGrid[r][c] = { ...nextGrid[r][c], isPath: true, pathColorIndex: activeColor };
    
    // Teleporter logic
    let targetCell = { r, c };
    if (cellState.type === CellType.TELEPORTER) {
      const pairId = cellState.colorIndex;
      const otherPair = level.grid.flat().find(f => f.type === CellType.TELEPORTER && f.colorIndex === pairId && (f.row !== r || f.col !== c));
      if (otherPair) {
        nextGrid[otherPair.row][otherPair.col] = { ...nextGrid[otherPair.row][otherPair.col], isPath: true, pathColorIndex: activeColor };
        targetCell = { r: otherPair.row, c: otherPair.col };
        sounds.playConnect();
      }
    }

    sounds.playConnect();

    const winCheckLevel = { ...level, grid: nextGrid };
    if (PathValidator.isLevelComplete(winCheckLevel)) {
        setTimeout(() => onComplete?.(nextGrid), 100);
    }
    
    onMove?.(nextGrid, activeColor, false);
    setGrid(nextGrid);
    setLastCell(targetCell);

    // Check if reached the other dot of the same color
    if (cellState.type === CellType.DOT && cellState.colorIndex === activeColor) {
      if (startCell && (r !== startCell.r || c !== startCell.c)) {
        setPulsePos({ r, c, color: colors[activeColor % colors.length] });
        setTimeout(() => setPulsePos(null), 1000);
        setActiveColor(null);
        setLastCell(null);
        setStartCell(null);
      }
    }
  }, [grid, activeColor, lastCell, startCell, clearColor, level, onComplete, onMove, setGrid, colors, hasClearedThisStroke]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (activeColor === null || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const cellSize = rect.width / level.gridSize;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    if (row >= 0 && row < level.gridSize && col >= 0 && col < level.gridSize) {
      if (lastCell?.r !== row || lastCell?.c !== col) {
        handleCellInteraction(row, col, false);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeColor === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cellSize = rect.width / level.gridSize;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    if (row >= 0 && row < level.gridSize && col >= 0 && col < level.gridSize) {
      if (lastCell?.r !== row || lastCell?.c !== col) {
        handleCellInteraction(row, col, false);
      }
    }
  };

  const [hintStep, setHintStep] = useState(-1);

  useEffect(() => {
    if (hintPath && hintPath.length > 0) {
      setHintStep(0);
      const interval = setInterval(() => {
        setHintStep(prev => (prev + 1) % (hintPath.length + 1));
      }, 400);
      return () => clearInterval(interval);
    } else {
      setHintStep(-1);
    }
  }, [hintPath]);

  const isHintCell = (r: number, c: number) => {
    if (!hintPath || hintStep === -1) return false;
    const cellIdx = hintPath.findIndex(p => p.r === r && p.c === c);
    return cellIdx !== -1 && cellIdx < hintStep;
  };

  const isTutorialCell = (r: number, c: number) => {
    if (!hintPath || hintPath.length === 0 || level.number > 2) return false;
    const step = Math.min(hintPath.length - 1, moveCount);
    const target = hintPath[step];
    return target && target.r === r && target.c === c;
  };

  const handleRelease = () => {
    setActiveColor(null);
    setLastCell(null);
    setStartCell(null);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventDefault = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    // Register touch start and touch move natively with passive: false to force cancelable preventDefault
    el.addEventListener('touchstart', preventDefault, { passive: false });
    el.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      el.removeEventListener('touchstart', preventDefault);
      el.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="grid w-full aspect-square bg-black/20 p-1 rounded-xl shadow-2xl overflow-hidden select-none"
      style={{
        gridTemplateColumns: `repeat(${level.gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${level.gridSize}, 1fr)`,
        touchAction: 'none',
        overscrollBehavior: 'none'
      }}
      onMouseDown={(e) => {
          const rect = containerRef.current!.getBoundingClientRect();
          const col = Math.floor((e.clientX - rect.left) / (rect.width / level.gridSize));
          const row = Math.floor((e.clientY - rect.top) / (rect.width / level.gridSize));
          handleCellInteraction(row, col, true);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onTouchStart={(e) => {
          if (e.cancelable) {
            e.preventDefault();
          }
          const rect = containerRef.current!.getBoundingClientRect();
          const touch = e.touches[0];
          const col = Math.floor((touch.clientX - rect.left) / (rect.width / level.gridSize));
          const row = Math.floor((touch.clientY - rect.top) / (rect.width / level.gridSize));
          handleCellInteraction(row, col, true);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleRelease}
    >
      {grid.flat().map((cell, idx) => {
        let cellHintColor: string | undefined = undefined;
        if (showingSolution && level.solutionPaths) {
          const pathIdx = level.solutionPaths.findIndex(path => path.some(p => p.r === cell.row && p.c === cell.col));
          if (pathIdx !== -1) {
            cellHintColor = colors[pathIdx % colors.length];
          }
        }

        return (
          <CellComponent
            key={`${cell.row}-${cell.col}`}
            cell={cell}
            color={cell.pathColorIndex !== undefined ? colors[cell.pathColorIndex % colors.length] : (cell.colorIndex !== undefined ? colors[cell.colorIndex % colors.length] : undefined)}
            isActive={lastCell?.r === cell.row && lastCell?.c === cell.col}
            isHint={isHintCell(cell.row, cell.col)}
            isTutorial={isTutorialCell(cell.row, cell.col)}
            hintColor={cellHintColor}
          />
        );
      })}

      {/* Connection Pulse Effect */}
      <AnimatePresence>
        {pulsePos && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute z-50 pointer-events-none rounded-full blur-xl"
            style={{
              width: `${100 / level.gridSize}%`,
              height: `${100 / level.gridSize}%`,
              left: `${(pulsePos.c / level.gridSize) * 100}%`,
              top: `${(pulsePos.r / level.gridSize) * 100}%`,
              backgroundColor: pulsePos.color,
              boxShadow: `0 0 40px ${pulsePos.color}`
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
