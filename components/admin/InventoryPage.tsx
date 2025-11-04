import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllShirts,
  createShirt,
  updateShirt,
  deleteShirt,
  subscribeToShirtUpdates,
  getBidsForShirt,
} from '../../services/databaseService';
import type { Shirt } from '../../services/supabaseClient';

// Modal component for Create/Edit
interface ShirtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shirt: ShirtFormData) => void;
  shirt?: Shirt | null;
  isLoading: boolean;
}

interface ShirtFormData {
  name: string;
  image_url: string;
  designer: string;
  bid_threshold: number;
  like_count: number;
  status: 'active' | 'won';
}

const ShirtModal: React.FC<ShirtModalProps> = ({ isOpen, onClose, onSave, shirt, isLoading }) => {
  const [formData, setFormData] = useState<ShirtFormData>({
    name: '',
    image_url: '',
    designer: '',
    bid_threshold: 100,
    like_count: 0,
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shirt) {
      setFormData({
        name: shirt.name,
        image_url: shirt.image_url,
        designer: shirt.designer || '',
        bid_threshold: shirt.bid_threshold,
        like_count: shirt.like_count || 0,
        status: shirt.status,
      });
    } else {
      setFormData({
        name: '',
        image_url: '',
        designer: '',
        bid_threshold: 100,
        like_count: 0,
        status: 'active',
      });
    }
    setErrors({});
  }, [shirt, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    if (!formData.image_url) {
      newErrors.image_url = 'Image URL is required';
    } else {
      try {
        new URL(formData.image_url);
      } catch {
        newErrors.image_url = 'Must be a valid URL';
      }
    }

    if (formData.bid_threshold < 1) {
      newErrors.bid_threshold = 'Bid threshold must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            {shirt ? 'Edit Shirt' : 'Create New Shirt'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Shirt Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Cool Design"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Image URL *
              </label>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/shirt.jpg"
              />
              {errors.image_url && <p className="text-red-400 text-sm mt-1">{errors.image_url}</p>}
              {formData.image_url && !errors.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Designer */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Designer (optional)
              </label>
              <input
                type="text"
                value={formData.designer}
                onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Alex Chen"
              />
            </div>

            {/* Bid Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Bid Threshold *
              </label>
              <input
                type="number"
                min="1"
                value={formData.bid_threshold}
                onChange={(e) => setFormData({ ...formData, bid_threshold: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.bid_threshold && <p className="text-red-400 text-sm mt-1">{errors.bid_threshold}</p>}
            </div>

            {/* Like Count */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Like Count
              </label>
              <input
                type="number"
                min="0"
                value={formData.like_count}
                onChange={(e) => setFormData({ ...formData, like_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            {shirt && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'won' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="won">Won</option>
                </select>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// Delete confirmation dialog
interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shirtName: string;
  bidCount: number;
  isLoading: boolean;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ isOpen, onClose, onConfirm, shirtName, bidCount, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Delete Shirt</h2>
        <p className="text-gray-300 mb-2">
          Are you sure you want to delete <span className="font-semibold text-white">{shirtName}</span>?
        </p>
        {bidCount > 0 && (
          <p className="text-yellow-400 text-sm mb-4">
            Warning: This shirt has {bidCount} active bids!
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Main InventoryPage component
const InventoryPage: React.FC = () => {
  const [shirts, setShirts] = useState<Shirt[]>([]);
  const [filteredShirts, setFilteredShirts] = useState<Shirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'won'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'bids' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShirt, setEditingShirt] = useState<Shirt | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingShirt, setDeletingShirt] = useState<Shirt | null>(null);
  const [deletingShirtBidCount, setDeletingShirtBidCount] = useState(0);
  const [operationLoading, setOperationLoading] = useState(false);

  // Error/success messages
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Load shirts
  const loadShirts = async () => {
    setLoading(true);
    const { data, error } = await getAllShirts();
    if (error) {
      setMessage({ type: 'error', text: `Failed to load shirts: ${error}` });
    } else {
      setShirts(data || []);
    }
    setLoading(false);
  };

  // Initial load and realtime subscription
  useEffect(() => {
    loadShirts();

    const subscription = subscribeToShirtUpdates(() => {
      loadShirts();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter and sort
  useEffect(() => {
    let result = [...shirts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (shirt) =>
          shirt.name.toLowerCase().includes(query) ||
          (shirt.designer && shirt.designer.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((shirt) => shirt.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'bids':
          compareValue = a.current_bid_count - b.current_bid_count;
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredShirts(result);
  }, [shirts, searchQuery, statusFilter, sortBy, sortOrder]);

  // Handle create
  const handleCreate = async (formData: ShirtFormData) => {
    setOperationLoading(true);
    const { data, error } = await createShirt(
      formData.name,
      formData.image_url,
      formData.bid_threshold,
      formData.designer || undefined,
      formData.like_count
    );

    setOperationLoading(false);

    if (error) {
      setMessage({ type: 'error', text: `Failed to create shirt: ${error}` });
    } else {
      setMessage({ type: 'success', text: 'Shirt created successfully!' });
      setIsModalOpen(false);
      loadShirts();
    }
  };

  // Handle update
  const handleUpdate = async (formData: ShirtFormData) => {
    if (!editingShirt) return;

    setOperationLoading(true);
    const { data, error } = await updateShirt(editingShirt.id, {
      name: formData.name,
      image_url: formData.image_url,
      designer: formData.designer || null,
      bid_threshold: formData.bid_threshold,
      like_count: formData.like_count,
      status: formData.status,
    });

    setOperationLoading(false);

    if (error) {
      setMessage({ type: 'error', text: `Failed to update shirt: ${error}` });
    } else {
      setMessage({ type: 'success', text: 'Shirt updated successfully!' });
      setIsModalOpen(false);
      setEditingShirt(null);
      loadShirts();
    }
  };

  // Handle delete
  const handleDeleteClick = async (shirt: Shirt) => {
    setDeletingShirt(shirt);

    // Get bid count for warning
    const { data } = await getBidsForShirt(shirt.id);
    setDeletingShirtBidCount(data?.length || 0);

    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingShirt) return;

    setOperationLoading(true);
    const { data, error } = await deleteShirt(deletingShirt.id);

    setOperationLoading(false);

    if (error) {
      setMessage({ type: 'error', text: `Failed to delete shirt: ${error}` });
    } else {
      setMessage({ type: 'success', text: 'Shirt deleted successfully!' });
      setIsDeleteOpen(false);
      setDeletingShirt(null);
      loadShirts();
    }
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Shirt Inventory</h1>
        <button
          onClick={() => {
            setEditingShirt(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
        >
          + Add New Shirt
        </button>
      </div>

      {/* Message banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and search */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name or designer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'won')}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="won">Won</option>
          </select>

          {/* Sort by */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'bids' | 'status')}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="bids">Sort by Bids</option>
            <option value="status">Sort by Status</option>
          </select>

          {/* Sort order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
          >
            {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </div>

      {/* Shirts list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading shirts...</div>
      ) : filteredShirts.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
          <div className="text-gray-500 text-lg mb-2">No shirts found</div>
          <div className="text-gray-400">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Click "Add New Shirt" to get started'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShirts.map((shirt) => (
            <motion.div
              key={shirt.id}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center gap-4">
                {/* Image */}
                <img
                  src={shirt.image_url}
                  alt={shirt.name}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=No+Image';
                  }}
                />

                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{shirt.name}</h3>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Designer: {shirt.designer || 'Anonymous'}</div>
                    <div>
                      Bids: {shirt.current_bid_count}/{shirt.bid_threshold}
                      {shirt.like_count !== null && shirt.like_count > 0 && ` • Likes: ${shirt.like_count}`}
                    </div>
                    <div>
                      Status:{' '}
                      <span
                        className={`font-semibold ${
                          shirt.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                        }`}
                      >
                        {shirt.status.charAt(0).toUpperCase() + shirt.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingShirt(shirt);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(shirt)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ShirtModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingShirt(null);
            }}
            onSave={editingShirt ? handleUpdate : handleCreate}
            shirt={editingShirt}
            isLoading={operationLoading}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleteOpen && deletingShirt && (
          <DeleteConfirm
            isOpen={isDeleteOpen}
            onClose={() => {
              setIsDeleteOpen(false);
              setDeletingShirt(null);
            }}
            onConfirm={handleDeleteConfirm}
            shirtName={deletingShirt.name}
            bidCount={deletingShirtBidCount}
            isLoading={operationLoading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InventoryPage;
