
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt } from '../types';

interface WinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  winningShirt: Shirt | null;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ isOpen, onClose, winningShirt }) => {
  if (!winningShirt) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, y: -100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: -100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-full">
                {/* Confetti-like background effect */}
                {[...Array(50)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-yellow-400"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            width: `${Math.random() * 8 + 4}px`,
                            height: `${Math.random() * 8 + 4}px`,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [0, -50, -100] }}
                        transition={{ duration: Math.random() * 2 + 1, delay: Math.random() * 0.5, repeat: Infinity }}
                    />
                ))}
            </div>
            <h2 className="text-3xl font-black text-white mb-2 relative z-10">YOU WON!</h2>
            <p className="text-gray-300 mb-4 relative z-10">You placed the winning bid on:</p>
            <div className="mb-6 relative z-10">
              <img src={winningShirt.imageUrl} alt={winningShirt.name} className="w-40 h-40 object-cover rounded-lg mx-auto shadow-lg border-4 border-yellow-400" />
              <p className="mt-3 font-bold text-lg text-white">{winningShirt.name}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 relative z-10"
            >
              Awesome! Next Shirt
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinnerModal;
