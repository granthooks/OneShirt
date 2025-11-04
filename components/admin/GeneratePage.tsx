import React from 'react';
import { motion } from 'framer-motion';
import ImageGenerator from '../ImageGenerator';
import { Shirt } from '../../types';

interface GeneratePageProps {
  onAddShirt: (shirt: Shirt) => void;
}

const GeneratePage: React.FC<GeneratePageProps> = ({ onAddShirt }) => {
  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-3xl font-bold text-white mb-6">Generate Designs</h1>

      <div className="max-w-4xl mx-auto">
        <ImageGenerator onAddShirt={onAddShirt} />
      </div>
    </motion.div>
  );
};

export default GeneratePage;
