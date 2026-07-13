import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ChevronRight, HelpCircle, AlertCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InteractiveTutorialProps {
  onComplete: () => void;
}

enum TutorialStep {
  TAP_DOT = 1,
  DRAG_DRAW = 2,
  CONNECT_PAIR = 3,
  FILL_ALL = 4,
  COMPLETED = 5
}

interface GridCell {
  row: number;
  col: number;
  type: 'empty' | 'dot';
  color: 'red' | 'blue' | null;
  isPath: boolean;
  pathColor: 'red' | 'blue' | null;
}

const playSound = (type: 'tap' | 'success' | 'error' | 'connect') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'connect') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Fail silently if AudioContext not supported
  }
};

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState<TutorialStep>(TutorialStep.TAP_DOT);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ r: number; c: number }[]>([]);
  const [drawingColor, setDrawingColor] = useState<'red' | 'blue' | null>(null);
  const [hintMessage, setHintMessage] = useState<string>('');
  const [shakeGrid, setShakeGrid] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize grids depending on current tutorial step
  useEffect(() => {
    initStepGrid(step);
    setHintMessage('');
  }, [step]);

  const initStepGrid = (currentStep: TutorialStep) => {
    const tempGrid: GridCell[][] = Array.from({ length: 3 }, (_, r) =>
      Array.from({ length: 3 }, (_, c) => ({
        row: r,
        col: c,
        type: 'empty',
        color: null,
        isPath: false,
        pathColor: null,
      }))
    );

    if (currentStep === TutorialStep.TAP_DOT || currentStep === TutorialStep.DRAG_DRAW || currentStep === TutorialStep.CONNECT_PAIR) {
      // 3x3 grid with one Red pair at (0,0) and (2,2)
      tempGrid[0][0] = { row: 0, col: 0, type: 'dot', color: 'red', isPath: false, pathColor: null };
      tempGrid[2][2] = { row: 2, col: 2, type: 'dot', color: 'red', isPath: false, pathColor: null };

      if (currentStep === TutorialStep.DRAG_DRAW) {
        // Red dot tapped already
        tempGrid[0][0].isPath = true;
        tempGrid[0][0].pathColor = 'red';
        setCurrentPath([{ r: 0, c: 0 }]);
        setDrawingColor('red');
      } else if (currentStep === TutorialStep.CONNECT_PAIR) {
        // Path partially drawn from (0,0) -> (0,1) -> (0,2)
        const path = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }];
        path.forEach(pos => {
          tempGrid[pos.r][pos.c].isPath = true;
          tempGrid[pos.r][pos.c].pathColor = 'red';
        });
        setCurrentPath(path);
        setDrawingColor('red');
      } else {
        setCurrentPath([]);
        setDrawingColor(null);
      }
    } else if (currentStep === TutorialStep.FILL_ALL) {
      // 3x3 grid with fully connected Red pair and unconnected Blue pair
      // Red at (0,0) and (2,2) with path: (0,0) -> (0,1) -> (0,2) -> (1,2) -> (2,2)
      tempGrid[0][0] = { row: 0, col: 0, type: 'dot', color: 'red', isPath: true, pathColor: 'red' };
      tempGrid[0][1] = { row: 0, col: 1, type: 'empty', color: null, isPath: true, pathColor: 'red' };
      tempGrid[0][2] = { row: 0, col: 2, type: 'empty', color: null, isPath: true, pathColor: 'red' };
      tempGrid[1][2] = { row: 1, col: 2, type: 'empty', color: null, isPath: true, pathColor: 'red' };
      tempGrid[2][2] = { row: 2, col: 2, type: 'dot', color: 'red', isPath: true, pathColor: 'red' };

      // Blue at (1,1) and (2,1)
      tempGrid[1][1] = { row: 1, col: 1, type: 'dot', color: 'blue', isPath: false, pathColor: null };
      tempGrid[2][1] = { row: 2, col: 1, type: 'dot', color: 'blue', isPath: false, pathColor: null };

      setCurrentPath([]);
      setDrawingColor(null);
    }

    setGrid(tempGrid);
  };

  const handleInteractionStart = (r: number, c: number) => {
    if (step === TutorialStep.TAP_DOT) {
      if (r === 0 && c === 0) {
        playSound('tap');
        // Transition to DRAG_DRAW
        setStep(TutorialStep.DRAG_DRAW);
      } else {
        playSound('error');
        setHintMessage("Tap the flashing red dot at the top left!");
        triggerShake();
      }
      return;
    }

    if (step === TutorialStep.DRAG_DRAW) {
      if (r === 0 && c === 0) {
        setIsDrawing(true);
        setCurrentPath([{ r, c }]);
        setDrawingColor('red');
        playSound('tap');
      } else {
        playSound('error');
        setHintMessage("Start drawing from the active red dot!");
        triggerShake();
      }
      return;
    }

    if (step === TutorialStep.CONNECT_PAIR) {
      // Must start dragging from the current head of the path which is (0,2) or start over from (0,0)
      if (r === 0 && c === 2) {
        setIsDrawing(true);
        setDrawingColor('red');
        playSound('tap');
      } else if (r === 0 && c === 0) {
        setIsDrawing(true);
        setCurrentPath([{ r, c }]);
        setDrawingColor('red');
        playSound('tap');
        // Re-draw path dynamically
        const updated = [...grid];
        updated[0][1].isPath = false;
        updated[0][1].pathColor = null;
        updated[0][2].isPath = false;
        updated[0][2].pathColor = null;
        setGrid(updated);
      } else {
        playSound('error');
        setHintMessage("Drag from the end of the line at the top-right dot!");
        triggerShake();
      }
      return;
    }

    if (step === TutorialStep.FILL_ALL) {
      const cell = grid[r]?.[c];
      if (cell && cell.color === 'blue') {
        setIsDrawing(true);
        setDrawingColor('blue');
        setCurrentPath([{ r, c }]);
        playSound('tap');

        // Reset any existing blue path first
        const updated = grid.map(row =>
          row.map(cell => {
            if (cell.pathColor === 'blue') {
              return { ...cell, isPath: false, pathColor: null };
            }
            return cell;
          })
        );
        updated[r][c].isPath = true;
        updated[r][c].pathColor = 'blue';
        setGrid(updated);
      } else if (cell && cell.color === 'red') {
        setHintMessage("The Red line is already perfect! Try connecting the Blue dots.");
        triggerShake();
      }
    }
  };

  const handleInteractionMove = (r: number, c: number) => {
    if (!isDrawing || !drawingColor) return;

    // Check if cell exists
    const cell = grid[r]?.[c];
    if (!cell) return;

    const last = currentPath[currentPath.length - 1];
    if (!last) return;

    // If same as last cell, do nothing
    if (last.r === r && last.c === c) return;

    // Must be adjacent (distance = 1)
    const distance = Math.abs(last.r - r) + Math.abs(last.c - c);
    if (distance !== 1) return;

    // Specific rules per step
    if (step === TutorialStep.DRAG_DRAW) {
      // Must draw along the guide: (0,0) -> (0,1) -> (0,2)
      const expectedPath = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }];
      const nextIndex = currentPath.length;

      if (nextIndex < expectedPath.length && expectedPath[nextIndex].r === r && expectedPath[nextIndex].c === c) {
        // Correct path block
        const newPath = [...currentPath, { r, c }];
        setCurrentPath(newPath);
        playSound('tap');

        const updated = [...grid];
        updated[r][c].isPath = true;
        updated[r][c].pathColor = 'red';
        setGrid(updated);

        // If completed step 2 expected path
        if (newPath.length === 3) {
          setIsDrawing(false);
          setStep(TutorialStep.CONNECT_PAIR);
        }
      } else {
        // Wrong direction! Reset.
        handleWrongMove();
      }
      return;
    }

    if (step === TutorialStep.CONNECT_PAIR) {
      // Must follow guide: (0,2) -> (1,2) -> (2,2)
      const expectedPath = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }];
      const nextIndex = currentPath.length;

      if (nextIndex < expectedPath.length && expectedPath[nextIndex].r === r && expectedPath[nextIndex].c === c) {
        const newPath = [...currentPath, { r, c }];
        setCurrentPath(newPath);

        const updated = [...grid];
        updated[r][c].isPath = true;
        updated[r][c].pathColor = 'red';
        setGrid(updated);

        // If connected to matching dot (2,2)
        if (r === 2 && c === 2) {
          setIsDrawing(false);
          playSound('connect');
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
          setHintMessage("Amazing! Red pair is connected perfectly! 🎉");
          setTimeout(() => {
            setStep(TutorialStep.FILL_ALL);
          }, 1500);
        } else {
          playSound('tap');
        }
      } else {
        handleWrongMove();
      }
      return;
    }

    if (step === TutorialStep.FILL_ALL) {
      // Blue drawing
      // Prevent intersecting Red path
      if (cell.pathColor === 'red') {
        playSound('error');
        setHintMessage("You can't cross an existing path! Draw around it.");
        triggerShake();
        setIsDrawing(false);
        return;
      }

      // Check if already in current blue path (user retracting path)
      const visitedIndex = currentPath.findIndex(p => p.r === r && p.c === c);
      if (visitedIndex !== -1) {
        // Retract path back to this cell
        const retractedPath = currentPath.slice(0, visitedIndex + 1);
        const cellsToClear = currentPath.slice(visitedIndex + 1);
        
        const updated = [...grid];
        cellsToClear.forEach(p => {
          updated[p.r][p.c].isPath = false;
          updated[p.r][p.c].pathColor = null;
        });
        setGrid(updated);
        setCurrentPath(retractedPath);
        playSound('tap');
        return;
      }

      // Append to path
      const newPath = [...currentPath, { r, c }];
      setCurrentPath(newPath);

      const updated = [...grid];
      updated[r][c].isPath = true;
      updated[r][c].pathColor = 'blue';
      setGrid(updated);

      if (cell.color === 'blue' && (r !== currentPath[0].r || c !== currentPath[0].c)) {
        // Connected Blue pair!
        setIsDrawing(false);
        
        // Check if all cells are filled (we must have connected Blue AND filled empty cells)
        const allFilled = updated.flat().every(cell => cell.isPath);
        if (allFilled) {
          playSound('success');
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 }
          });
          setStep(TutorialStep.COMPLETED);
        } else {
          // Connected blue, but shortcuts taken, so some empty cell left
          playSound('error');
          setHintMessage("Connections are made, but you must fill ALL empty grid cells to win! Try drawing around!");
          triggerShake();
          // Reset blue path to let them try again
          setTimeout(() => {
            initStepGrid(TutorialStep.FILL_ALL);
          }, 1500);
        }
      } else {
        playSound('tap');
      }
    }
  };

  const handleInteractionEnd = () => {
    setIsDrawing(false);
    if (step === TutorialStep.FILL_ALL) {
      // If we released inside empty cells without connecting blue dot, clear the blue path
      const lastCell = currentPath[currentPath.length - 1];
      if (lastCell && grid[lastCell.r][lastCell.c].color !== 'blue') {
        const updated = grid.map(row =>
          row.map(cell => {
            if (cell.pathColor === 'blue') {
              return { ...cell, isPath: false, pathColor: null };
            }
            return cell;
          })
        );
        setGrid(updated);
        setCurrentPath([]);
      }
    }
  };

  const handleWrongMove = () => {
    playSound('error');
    setShakeGrid(true);
    setIsDrawing(false);
    setHintMessage("Follow the dotted guide to draw correctly!");
    setTimeout(() => setShakeGrid(false), 500);
    // Reset back to start of step
    initStepGrid(step);
  };

  const triggerShake = () => {
    setShakeGrid(true);
    setTimeout(() => setShakeGrid(false), 500);
  };

  // Drag handlers for desktop mouse
  const onMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    handleInteractionStart(r, c);
  };

  const onMouseEnter = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    handleInteractionMove(r, c);
  };

  // Drag handlers for mobile touch
  const onTouchStart = (e: React.TouchEvent, r: number, c: number) => {
    handleInteractionStart(r, c);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const col = Math.floor((x / rect.width) * 3);
    const row = Math.floor((y / rect.height) * 3);

    if (row >= 0 && row < 3 && col >= 0 && col < 3) {
      handleInteractionMove(row, col);
    }
  };

  // Guide helper definitions
  const getGuideOverlay = (r: number, c: number) => {
    if (step === TutorialStep.TAP_DOT && r === 0 && c === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-12 h-12 rounded-full border-4 border-red-500"
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-10 text-white font-bold text-xs bg-red-600 px-2 py-1 rounded shadow-md flex items-center gap-1 z-40"
          >
            TAP HERE <ArrowRight size={12} className="rotate-90" />
          </motion.div>
        </div>
      );
    }

    // Path trail indicator guides
    if (step === TutorialStep.DRAG_DRAW) {
      // Guide trail shows (0,0) -> (0,1) -> (0,2)
      if ((r === 0 && c === 1) || (r === 0 && c === 2)) {
        const isTarget = r === 0 && c === 2;
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <motion.div
              animate={isTarget ? { scale: [1, 1.15, 1] } : { opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className={`w-4 h-4 rounded-full border-2 border-dashed border-red-400 bg-red-500/10 ${isTarget ? 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''}`}
            />
          </div>
        );
      }
    }

    if (step === TutorialStep.CONNECT_PAIR) {
      // Guide trail shows (0,2) -> (1,2) -> (2,2)
      if ((r === 1 && c === 2) || (r === 2 && c === 2)) {
        const isTarget = r === 2 && c === 2;
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <motion.div
              animate={isTarget ? { scale: [1, 1.15, 1] } : { opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className={`w-4 h-4 rounded-full border-2 border-dashed border-red-400 bg-red-500/10 ${isTarget ? 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''}`}
            />
          </div>
        );
      }
    }

    if (step === TutorialStep.FILL_ALL) {
      // Guide trails show where to connect blue: (1,1) -> (1,0) -> (2,0) -> (2,1)
      if ((r === 1 && c === 0) || (r === 2 && c === 0)) {
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-4 h-4 rounded-full border-2 border-dashed border-blue-400 bg-blue-500/10"
            />
          </div>
        );
      }
    }

    return null;
  };

  const getStepText = () => {
    switch (step) {
      case TutorialStep.TAP_DOT:
        return {
          title: "TAP THE DOT",
          desc: "Touch the colored dot to activate it. Every path must start and end at matching colors.",
          badge: "Step 1 of 4"
        };
      case TutorialStep.DRAG_DRAW:
        return {
          title: "DRAG TO DRAW",
          desc: "Hold and drag your finger along the dotted outline to start drawing a path.",
          badge: "Step 2 of 4"
        };
      case TutorialStep.CONNECT_PAIR:
        return {
          title: "CONNECT THE PAIR",
          desc: "Connect the path into the matching red endpoint dot to link them together.",
          badge: "Step 3 of 4"
        };
      case TutorialStep.FILL_ALL:
        return {
          title: "FILL ALL CELLS",
          desc: "Fill EVERY single cell on the board! Connect the blue pair by looping around the red path.",
          badge: "Step 4 of 4"
        };
      default:
        return {
          title: "YOU'RE READY!",
          desc: "You have mastered the mechanics of ColorFlow. Dive in and solve beautiful flow levels!",
          badge: "Completed 🎉"
        };
    }
  };

  const stepMeta = getStepText();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl text-white select-none overflow-y-auto p-4 md:p-6">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="text-yellow-400 animate-pulse" size={20} />
          <span className="font-bold tracking-widest text-xs text-slate-300">COLORFLOW TUTORIAL</span>
        </div>
        <button
          onClick={onComplete}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
        >
          <span>Skip</span>
          <X size={14} />
        </button>
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-6 md:gap-8 mt-8">
        {/* Step Badge */}
        <motion.div
          key={`badge-${step}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider"
        >
          {stepMeta.badge}
        </motion.div>

        {/* Playable Stage */}
        <AnimatePresence mode="wait">
          {step !== TutorialStep.COMPLETED ? (
            <motion.div
              key="playable-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center"
            >
              {/* Grid Box */}
              <motion.div
                ref={gridRef}
                animate={shakeGrid ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-3 grid-rows-3 gap-1.5 w-72 h-72 md:w-80 md:h-80 bg-slate-900/80 p-3 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-pointer select-none touch-none"
                onTouchMove={onTouchMove}
                onTouchEnd={handleInteractionEnd}
                onMouseUp={handleInteractionEnd}
                onMouseLeave={handleInteractionEnd}
              >
                {grid.map((rowArr, rIdx) =>
                  rowArr.map((cell, cIdx) => {
                    const isDot = cell.type === 'dot';
                    const colorVal = cell.color || cell.pathColor;
                    const hexColor = colorVal === 'red' ? '#ef4444' : colorVal === 'blue' ? '#3b82f6' : undefined;
                    const pathColorHex = cell.pathColor === 'red' ? '#ef4444' : cell.pathColor === 'blue' ? '#3b82f6' : undefined;

                    // Pulsing effect for unfilled cells in Step 4
                    const shouldPulseEmpty = step === TutorialStep.FILL_ALL && !cell.isPath && cell.type === 'empty';

                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        onMouseDown={(e) => onMouseDown(e, rIdx, cIdx)}
                        onMouseEnter={(e) => onMouseEnter(e, rIdx, cIdx)}
                        onTouchStart={(e) => onTouchStart(e, rIdx, cIdx)}
                        className={`relative aspect-square rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-center transition-all ${
                          shouldPulseEmpty ? 'ring-1 ring-blue-500/20' : ''
                        }`}
                      >
                        {/* Empty pulsing background indicator */}
                        {shouldPulseEmpty && (
                          <motion.div
                            animate={{ opacity: [0.05, 0.15, 0.05] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 bg-blue-500 rounded-xl"
                          />
                        )}

                        {/* Connection line inside cell segment */}
                        {cell.isPath && pathColorHex && !isDot && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 z-0 m-[25%] rounded-full shadow-lg"
                            style={{
                              backgroundColor: pathColorHex,
                              boxShadow: `0 0 10px ${pathColorHex}aa, 0 0 20px ${pathColorHex}44`
                            }}
                          />
                        )}

                        {/* Cell Background connection tint */}
                        {cell.isPath && pathColorHex && (
                          <div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{ backgroundColor: `${pathColorHex}33` }}
                          />
                        )}

                        {/* Dot rendering */}
                        {isDot && hexColor && (
                          <div className="flex items-center justify-center w-full h-full relative z-10">
                            <motion.div
                              animate={
                                cell.isPath
                                  ? { scale: [1, 1.05, 1] }
                                  : cell.color === 'red' && step === TutorialStep.TAP_DOT
                                  ? { scale: [1, 1.1, 1] }
                                  : { scale: 1 }
                              }
                              transition={
                                cell.color === 'red' && step === TutorialStep.TAP_DOT
                                  ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                                  : { duration: 0.2 }
                              }
                              className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center"
                              style={{
                                backgroundColor: hexColor,
                                boxShadow: cell.isPath
                                  ? `0 0 20px ${hexColor}`
                                  : `0 0 12px ${hexColor}66`
                              }}
                            />
                          </div>
                        )}

                        {/* Step Guides & Prompts overlays */}
                        {getGuideOverlay(rIdx, cIdx)}
                      </div>
                    );
                  })
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="completed-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center bg-slate-900/60 p-6 rounded-2xl border border-white/10 shadow-2xl text-center gap-4"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <Sparkles size={32} className="animate-spin-slow" />
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-emerald-400">YOU ARE READY!</h3>
              
              <div className="text-slate-300 text-sm leading-relaxed flex flex-col gap-2 max-w-xs mx-auto">
                <div className="flex items-center gap-2 text-left bg-white/5 p-2 rounded border border-white/5">
                  <span className="text-indigo-400 font-bold text-lg">1</span>
                  <span>Connect dots of matching colors</span>
                </div>
                <div className="flex items-center gap-2 text-left bg-white/5 p-2 rounded border border-white/5">
                  <span className="text-indigo-400 font-bold text-lg">2</span>
                  <span>Fill every single cell on the grid</span>
                </div>
                <div className="flex items-center gap-2 text-left bg-white/5 p-2 rounded border border-white/5">
                  <span className="text-indigo-400 font-bold text-lg">3</span>
                  <span>Do not cross paths or overlap lines</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onComplete}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 border border-indigo-400/20 flex items-center justify-center gap-2 mt-2"
              >
                <span>START PLAYING</span>
                <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Guidelines */}
        <div className="text-center px-4 max-w-sm h-28 flex flex-col justify-start">
          <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white mb-2 uppercase">
            {stepMeta.title}
          </h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            {stepMeta.desc}
          </p>
        </div>

        {/* Hint Messages */}
        <div className="h-10 text-center">
          <AnimatePresence mode="wait">
            {hintMessage && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs rounded-lg shadow-sm"
              >
                <HelpCircle size={14} className="flex-shrink-0" />
                <span>{hintMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step Indicator dots at bottom */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                step === s
                  ? 'w-6 bg-indigo-500 shadow-[0_0_8px_#6366f1]'
                  : step > s
                  ? 'bg-indigo-500/40'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
