import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Sparkles } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Step 1",
    subtitle: "TAP TO START",
    description: "Tap a colored dot to start",
  },
  {
    title: "Step 2",
    subtitle: "DRAW THE FLOW",
    description: "Drag to draw a path",
  },
  {
    title: "Step 3",
    subtitle: "CONNECT DOTS",
    description: "Connect to the matching dot",
  },
  {
    title: "Step 4",
    subtitle: "COMPLETE THE BOARD",
    description: "Fill ALL cells to win!",
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Auto transition steps every 4 seconds for hands-free learning, or user can click
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        className="bg-[#121214] border border-white/10 text-white p-8 rounded-[36px] max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col items-center"
      >
        <button 
          onClick={onComplete}
          className="absolute top-6 right-6 text-white/30 hover:text-white/75 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Visual Animation Section */}
        <div className="w-full aspect-square bg-white/5 rounded-3xl border border-white/5 p-4 flex items-center justify-center relative overflow-hidden mb-6">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-44 h-44 relative bg-[#18181c] p-2 rounded-2xl border border-white/5">
            {/* Render 3x3 cells */}
            {Array.from({ length: 9 }).map((_, index) => {
              const row = Math.floor(index / 3);
              const col = index % 3;

              // Helper flags for rendering paths/dots
              let showDot = false;
              let dotColor = '';
              let isPulsing = false;
              let showPath = false;
              let pathColor = '';
              let pathDirection: 'down' | 'up' | 'full-vertical' | '' = '';

              // Step 1: Highlight Red dot at (0,0) [index 0]
              if (currentStep === 0) {
                if (index === 0) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                  isPulsing = true;
                } else if (index === 6) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                } else if (index === 2 || index === 8) {
                  showDot = true;
                  dotColor = 'bg-blue-500';
                }
              }

              // Step 2: Draw red path from index 0 down to index 3
              if (currentStep === 1) {
                if (index === 0) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'down';
                } else if (index === 3) {
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'up'; // extends from top to middle
                } else if (index === 6) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                } else if (index === 2 || index === 8) {
                  showDot = true;
                  dotColor = 'bg-blue-500';
                }
              }

              // Step 3: Complete connection to index 6
              if (currentStep === 2) {
                if (index === 0) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'down';
                } else if (index === 3) {
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'full-vertical';
                } else if (index === 6) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'up';
                  isPulsing = true; // Connection pulse
                } else if (index === 2 || index === 8) {
                  showDot = true;
                  dotColor = 'bg-blue-500';
                }
              }

              // Step 4: Fill all cells to win!
              if (currentStep === 3) {
                // Red path (Col 0)
                if (index === 0) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'down';
                } else if (index === 3) {
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'full-vertical';
                } else if (index === 6) {
                  showDot = true;
                  dotColor = 'bg-red-500';
                  showPath = true;
                  pathColor = 'bg-red-500';
                  pathDirection = 'up';
                }
                // Green path (Col 1)
                else if (index === 1) {
                  showDot = true;
                  dotColor = 'bg-emerald-500';
                  showPath = true;
                  pathColor = 'bg-emerald-500';
                  pathDirection = 'down';
                } else if (index === 4) {
                  showPath = true;
                  pathColor = 'bg-emerald-500';
                  pathDirection = 'full-vertical';
                } else if (index === 7) {
                  showDot = true;
                  dotColor = 'bg-emerald-500';
                  showPath = true;
                  pathColor = 'bg-emerald-500';
                  pathDirection = 'up';
                }
                // Blue path (Col 2)
                else if (index === 2) {
                  showDot = true;
                  dotColor = 'bg-blue-500';
                  showPath = true;
                  pathColor = 'bg-blue-500';
                  pathDirection = 'down';
                } else if (index === 5) {
                  showPath = true;
                  pathColor = 'bg-blue-500';
                  pathDirection = 'full-vertical';
                } else if (index === 8) {
                  showDot = true;
                  dotColor = 'bg-blue-500';
                  showPath = true;
                  pathColor = 'bg-blue-500';
                  pathDirection = 'up';
                }
              }

              return (
                <div 
                  key={index} 
                  className="relative w-full h-full bg-[#202024] rounded-lg flex items-center justify-center overflow-hidden"
                >
                  {/* Render Path Line */}
                  {showPath && (
                    <div 
                      className={`absolute ${pathColor} rounded-full`}
                      style={{
                        width: '12px',
                        ...(pathDirection === 'down' && { height: '60%', bottom: 0, width: '12px' }),
                        ...(pathDirection === 'up' && { height: '60%', top: 0, width: '12px' }),
                        ...(pathDirection === 'full-vertical' && { height: '100%', top: 0, width: '12px' }),
                      }}
                    />
                  )}

                  {/* Render Dot */}
                  {showDot && (
                    <motion.div 
                      animate={isPulsing ? { scale: [1, 1.25, 1], boxShadow: ['0px 0px 0px rgba(239, 68, 68, 0)', '0px 0px 12px rgba(239, 68, 68, 0.8)', '0px 0px 0px rgba(239, 68, 68, 0)'] } : {}}
                      transition={isPulsing ? { duration: 1.5, repeat: Infinity } : {}}
                      className={`w-6 h-6 rounded-full ${dotColor} z-10 relative`}
                    />
                  )}
                </div>
              );
            })}

            {/* Simulated Finger cursor overlay */}
            <AnimatePresence>
              {currentStep === 0 && (
                <motion.div
                  initial={{ x: 50, y: 50, opacity: 0 }}
                  animate={{ x: 14, y: 14, opacity: 1, scale: [1, 0.85, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                  className="absolute z-20 pointer-events-none text-3xl"
                  style={{ top: 0, left: 0 }}
                >
                  👆
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  initial={{ x: 14, y: 14, opacity: 0 }}
                  animate={{ 
                    x: [14, 14, 14], 
                    y: [14, 64, 64], 
                    opacity: [0, 1, 1, 0] 
                  }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  className="absolute z-20 pointer-events-none text-3xl"
                  style={{ top: 0, left: 0 }}
                >
                  👆
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  initial={{ x: 14, y: 64, opacity: 0 }}
                  animate={{ 
                    x: [14, 14, 14], 
                    y: [64, 114, 114], 
                    opacity: [0, 1, 1, 0] 
                  }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  className="absolute z-20 pointer-events-none text-3xl"
                  style={{ top: 0, left: 0 }}
                >
                  👆
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                >
                  <div className="bg-emerald-500/20 border border-emerald-400 p-2 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Sparkles size={24} className="text-emerald-400 animate-pulse" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Text Details Section */}
        <div className="text-center w-full min-h-[120px] flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-1">
            {steps[currentStep].title} — {steps[currentStep].subtitle}
          </p>
          <h2 className="text-2xl font-black italic tracking-tighter mb-3 leading-tight uppercase">
            {steps[currentStep].description}
          </h2>
        </div>

        {/* Indicator dots & Button Section */}
        <div className="flex items-center justify-between w-full mt-4">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-cyan-400' : 'w-1.5 bg-white/10 hover:bg-white/30'}`} 
              />
            ))}
          </div>

          {currentStep === steps.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="bg-cyan-500 text-black px-6 py-3 font-black italic text-xs rounded-2xl shadow-lg hover:bg-cyan-400 transition-all uppercase tracking-wider"
            >
              GOT IT! ▶
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={next}
              className="bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors"
            >
              <ChevronRight size={20} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
