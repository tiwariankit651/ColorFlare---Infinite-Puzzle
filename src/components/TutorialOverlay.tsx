import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "HOW TO PLAY",
    description: "Connect matching colored dots by dragging your finger. Create a flow between them!",
    icon: "👆"
  },
  {
    title: "CREATE A PATH",
    description: "Create a continuous path between two dots of the same color.",
    icon: "🔗"
  },
  {
    title: "NO CROSSING",
    description: "Paths cannot cross or overlap. If you cross a path, it will be broken!",
    icon: "🚫"
  },
  {
    title: "FILL THE BOARD",
    description: "To win, every single cell on the board must be filled with a colored path.",
    icon: "⬛"
  },
  {
    title: "EDGE STRATEGY",
    description: "PRO TIP: Try to route paths along the edges first to avoid blocking yourself in the center.",
    icon: "📐"
  },
  {
    title: "EFFICIENCY",
    description: "The fewer moves you take, the more stars you earn! 3 stars is the goal.",
    icon: "⭐"
  },
  {
    title: "GETTING STUCK?",
    description: "If a level seems impossible, use a hint or reset and try a different starting color.",
    icon: "💡"
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="bg-white text-black p-8 rounded-[40px] max-w-sm w-full shadow-2xl relative overflow-hidden"
        >
          <button 
            onClick={onComplete}
            className="absolute top-6 right-6 text-black/20 hover:text-black/50 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="text-6xl mb-6">{steps[currentStep].icon}</div>
          <h2 className="text-3xl font-black italic tracking-tighter mb-4 leading-tight">
            {steps[currentStep].title}
          </h2>
          <p className="text-black/60 font-medium leading-relaxed mb-8">
            {steps[currentStep].description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-black' : 'w-1.5 bg-black/10'}`} 
                />
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={next}
              className="bg-black text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            >
              <ChevronRight size={24} />
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
