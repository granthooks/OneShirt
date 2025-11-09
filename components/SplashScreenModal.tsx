
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import splashSwipeImage from '../images/splash_screen/splash-swipe.png';
import splashCreditsImage from '../images/splash_screen/splash-credits.png';
import splashWinImage from '../images/splash_screen/splash-win.png';
import splashMagicLinkImage from '../images/splash_screen/splash-magic-link.png';

interface SplashScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

const SplashScreenModal: React.FC<SplashScreenModalProps> = ({ isOpen, onClose, onGetStarted }) => {
  const handleGetStarted = () => {
    // Store in localStorage to prevent showing again
    localStorage.setItem('hasSeenSplash', 'true');
    onGetStarted();
  };

  const handleSkip = () => {
    // Store in localStorage to prevent showing again
    localStorage.setItem('hasSeenSplash', 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start md:items-center justify-center z-50 p-4 overflow-y-auto"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
          onClick={handleSkip}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl p-6 pt-12 md:p-12 md:pt-12 text-center max-w-2xl w-full relative my-4 md:my-8 min-h-fit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close/Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Skip"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tight">
                Welcome to <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">OneShirt</span>!
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 font-semibold">
                Swipe. Bid. Win!
              </p>
            </motion.div>

            {/* Feature Sections */}
            <div className="space-y-6 mb-8">
              {/* Section 1: Swipe Through Unique Designs */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col md:flex-row items-center gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex-shrink-0">
                  <img
                    src={splashSwipeImage}
                    alt="Swipe through unique t-shirt designs"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-lg object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Swipe Through Unique Designs
                  </h3>
                  <p className="text-gray-300 text-base md:text-lg">
                    Every shirt is hand-picked and from our premium collection. Swipe right to bid, left to pass. Discover amazing designs you won't find anywhere else.
                  </p>
                </div>
              </motion.div>

              {/* Section 2: Bid with Credits */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col md:flex-row items-center gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex-shrink-0">
                  <img
                    src={splashCreditsImage}
                    alt="Bid with credits to win unique designs"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-lg object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Bid with Credits
                  </h3>
                  <p className="text-gray-300 text-base md:text-lg">
                    Each bid costs just 1 credit. Every bid gets you closer to winning. The more you bid, the more chances you have!
                  </p>
                </div>
              </motion.div>

              {/* Section 3: Win & Wear */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col md:flex-row items-center gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex-shrink-0">
                  <img
                    src={splashWinImage}
                    alt="Win and wear your unique t-shirt"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-lg object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Win & Wear
                  </h3>
                  <p className="text-gray-300 text-base md:text-lg">
                    The 250th bidder wins the physical shirt! We'll print it and ship it to your door for free. Rock your unique design!
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-lg py-4 px-8 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-6 h-6" />
              </motion.button>

              {/* Section 4: Get Started Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-center gap-3 text-gray-300">
                  <img
                    src={splashMagicLinkImage}
                    alt="Sign up with magic link"
                    className="w-12 h-12 rounded-lg shadow-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm md:text-base">
                      Sign up instantly with magic link
                    </p>
                    <p className="text-xs md:text-sm text-gray-400">
                      Start with free credits - no credit card required!
                    </p>
                  </div>
                </div>
              </motion.div>

              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-white transition-colors text-sm underline"
              >
                Skip for now
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreenModal;
