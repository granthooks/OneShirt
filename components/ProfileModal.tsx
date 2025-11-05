import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { updateUserProfile, getUserWins } from '../services/databaseService';
import type { User as DbUser } from '../services/supabaseClient';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: DbUser | null;
  userId: string | null;
  userEmail: string | null;
  onProfileUpdated: () => void;
}

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userId,
  userEmail,
  onProfileUpdated,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    shippingAddress: '',
    shirtSize: '',
    gender: '',
    avatarUrl: '',
  });
  const [wins, setWins] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWins, setIsLoadingWins] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load user data and wins count when modal opens
  useEffect(() => {
    if (isOpen && user && userId) {
      // Load form data from user
      setFormData({
        name: user.name || '',
        email: user.email || userEmail || '',
        shippingAddress: user.shipping_address || '',
        shirtSize: user.shirt_size || '',
        gender: user.gender || '',
        avatarUrl: user.avatar_url || '',
      });

      // Load wins count
      setIsLoadingWins(true);
      getUserWins(userId)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error loading wins:', error);
            setWins(0);
          } else {
            setWins(data || 0);
          }
        })
        .finally(() => {
          setIsLoadingWins(false);
        });
    }
  }, [isOpen, user, userId, userEmail]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleGenderToggle = (selectedGender: 'male' | 'female') => {
    setFormData((prev) => ({
      ...prev,
      gender: selectedGender,
    }));
    setError(null);
  };

  const handleSave = async () => {
    if (!userId) {
      setError('User ID not found');
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await updateUserProfile(userId, {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        shipping_address: formData.shippingAddress.trim() || null,
        shirt_size: formData.shirtSize || null,
        gender: formData.gender || null,
        avatar_url: formData.avatarUrl.trim() || null,
      });

      if (updateError) {
        setError(updateError);
        return;
      }

      // Notify parent to refresh user data
      onProfileUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-white">Profile</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Wins Display - Prominent at top */}
                <motion.div
                  className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 flex items-center gap-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="bg-yellow-500/20 p-4 rounded-full">
                    <Trophy className="h-12 w-12 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    {isLoadingWins ? (
                      <div className="text-gray-400">Loading...</div>
                    ) : (
                      <>
                        <div className="text-4xl font-bold text-yellow-400">{wins}</div>
                        <div className="text-lg text-gray-300">Wins</div>
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {formData.avatarUrl ? (
                        <img
                          src={formData.avatarUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://i.pravatar.cc/150?u=default';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                          {formData.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      name="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={handleInputChange}
                      placeholder="Image URL"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Shipping Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Shipping Address
                  </label>
                  <textarea
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter your shipping address"
                  />
                </div>

                {/* Shirt Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Shirt Size
                  </label>
                  <select
                    name="shirtSize"
                    value={formData.shirtSize}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select size</option>
                    {SHIRT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gender
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleGenderToggle('male')}
                      className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                        formData.gender === 'male'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenderToggle('female')}
                      className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                        formData.gender === 'female'
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.name.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;

