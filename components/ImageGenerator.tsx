
import React, { useState } from 'react';
import { generateImage } from '../services/imageGenerationService';
import { Shirt } from '../types';

interface ImageGeneratorProps {
  onAddShirt: (shirt: Shirt) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onAddShirt }) => {
  const [prompt, setPrompt] = useState('');
  const [shirtName, setShirtName] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    try {
      const imageUrl = await generateImage(prompt);
      setGeneratedImageUrl(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShirt = () => {
    if (!generatedImageUrl || !shirtName.trim()) {
      setError('Please provide a name for the shirt.');
      return;
    }
    const newShirt: Shirt = {
      id: `ai_${new Date().getTime()}`,
      name: shirtName,
      imageUrl: generatedImageUrl,
      currentBidCount: 0,
      bidThreshold: 250,
    };
    onAddShirt(newShirt);
    setPrompt('');
    setShirtName('');
    setGeneratedImageUrl(null);
    setError(null);
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">AI T-Shirt Designer</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="shirtName" className="block text-sm font-medium text-gray-300 mb-1">Shirt Name</label>
          <input
            id="shirtName"
            type="text"
            value={shirtName}
            onChange={(e) => setShirtName(e.target.value)}
            placeholder="e.g., 'Cosmic Cat'"
            className="w-full bg-gray-700 text-white rounded-md border border-gray-600 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Design Prompt</label>
          <textarea
            id="prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cat wearing sunglasses floating in space, synthwave style"
            className="w-full bg-gray-700 text-white rounded-md border border-gray-600 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full flex items-center justify-center bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
          {isLoading ? 'Generating...' : 'Generate Design'}
        </button>
      </div>

      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

      {generatedImageUrl && (
        <div className="mt-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Generated Preview</h3>
          <div className="bg-gray-700 p-4 rounded-lg inline-block">
             <img src={generatedImageUrl} alt="Generated t-shirt design" className="w-56 h-56 object-cover rounded-md" />
          </div>
          <button
            onClick={handleAddShirt}
            className="mt-4 bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
          >
            Add to Inventory
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
