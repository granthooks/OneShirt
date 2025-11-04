import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  subscribeToUserUpdates,
  getBidsForUser,
} from '../../services/databaseService';
import type { User, UserStats } from '../../services/databaseService';

// Extended user type with statistics
interface UserWithStats extends User {
  total_bids?: number;
  total_credits_spent?: number;
  shirts_won?: number;
}

// Modal component for Create/Edit User
interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: UserFormData) => void;
  user?: User | null;
  isLoading: boolean;
}

interface UserFormData {
  name: string;
  avatar_url: string;
  credit_balance: number;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user, isLoading }) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    avatar_url: '',
    credit_balance: 100,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        avatar_url: user.avatar_url || '',
        credit_balance: user.credit_balance,
      });
    } else {
      setFormData({
        name: '',
        avatar_url: '',
        credit_balance: 100,
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (formData.credit_balance < 0) {
      newErrors.credit_balance = 'Credit balance cannot be negative';
    }

    if (formData.avatar_url && formData.avatar_url.trim() !== '') {
      try {
        new URL(formData.avatar_url);
      } catch {
        newErrors.avatar_url = 'Must be a valid URL';
      }
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

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
            {user ? 'Edit User' : 'Create New User'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., John Doe"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Avatar URL (optional)
              </label>
              <input
                type="text"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/avatar.jpg"
              />
              {errors.avatar_url && <p className="text-red-400 text-sm mt-1">{errors.avatar_url}</p>}

              {/* Avatar Preview */}
              <div className="mt-3 flex items-center gap-3">
                <div className="text-sm text-gray-400">Preview:</div>
                {formData.avatar_url && !errors.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Avatar preview"
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {formData.name ? getInitials(formData.name) : '?'}
                  </div>
                )}
              </div>
            </div>

            {/* Credit Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Credit Balance *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.credit_balance}
                onChange={(e) => setFormData({ ...formData, credit_balance: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.credit_balance && <p className="text-red-400 text-sm mt-1">{errors.credit_balance}</p>}
              <p className="text-xs text-gray-400 mt-1">
                {user ? 'Update user credit balance (can be any positive number)' : 'Default starting credits: 100'}
              </p>
            </div>

            {/* Read-only fields for editing */}
            {user && (
              <div className="pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400 space-y-2">
                  <div>User ID: <span className="text-gray-300 font-mono text-xs">{user.id}</span></div>
                  <div>Created: <span className="text-gray-300">{new Date(user.created_at).toLocaleString()}</span></div>
                  <div>Last Updated: <span className="text-gray-300">{new Date(user.updated_at).toLocaleString()}</span></div>
                </div>
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
  userName: string;
  userStats: {
    bidCount: number;
    creditsRemaining: number;
    shirtsWon: number;
  };
  isLoading: boolean;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userStats,
  isLoading
}) => {
  if (!isOpen) return null;

  const hasActivity = userStats.bidCount > 0 || userStats.shirtsWon > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Delete User</h2>
        <p className="text-gray-300 mb-2">
          Are you sure you want to delete <span className="font-semibold text-white">{userName}</span>?
        </p>

        {/* User stats */}
        <div className="bg-gray-700/50 rounded-lg p-3 my-4 space-y-1 text-sm">
          <div className="text-gray-300">
            Total Bids: <span className="text-white font-semibold">{userStats.bidCount}</span>
          </div>
          <div className="text-gray-300">
            Credits Remaining: <span className="text-white font-semibold">{userStats.creditsRemaining}</span>
          </div>
          <div className="text-gray-300">
            Shirts Won: <span className="text-white font-semibold">{userStats.shirtsWon}</span>
          </div>
        </div>

        {hasActivity && (
          <p className="text-yellow-400 text-sm mb-4">
            Warning: This user has activity in the system. Deleting will permanently remove all associated data!
          </p>
        )}

        <p className="text-red-400 text-sm mb-4">
          This action cannot be undone.
        </p>

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

// User Stats Modal
interface UserStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithStats | null;
  stats: UserStats | null;
}

const UserStatsModal: React.FC<UserStatsModalProps> = ({ isOpen, onClose, user, stats }) => {
  if (!isOpen || !user || !stats) return null;

  const accountAgeDays = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">User Statistics</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-white">{user.name}</h3>
                <p className="text-sm text-gray-400">Member for {accountAgeDays} days</p>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
              <div className="text-blue-400 text-sm font-medium mb-1">Credit Balance</div>
              <div className="text-2xl font-bold text-white">{stats.credit_balance}</div>
            </div>

            <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-4">
              <div className="text-purple-400 text-sm font-medium mb-1">Total Bids</div>
              <div className="text-2xl font-bold text-white">{stats.total_bids}</div>
            </div>

            <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
              <div className="text-green-400 text-sm font-medium mb-1">Total Credits Spent</div>
              <div className="text-2xl font-bold text-white">{stats.total_credits_spent}</div>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
              <div className="text-yellow-400 text-sm font-medium mb-1">Shirts Won</div>
              <div className="text-2xl font-bold text-white">{stats.shirts_won}</div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-3">Account Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">User ID:</span>
                <span className="text-gray-300 font-mono text-xs">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created:</span>
                <span className="text-gray-300">{new Date(user.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated:</span>
                <span className="text-gray-300">{new Date(user.updated_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Average Credits per Bid:</span>
                <span className="text-gray-300">
                  {stats.total_bids > 0
                    ? (stats.total_credits_spent / stats.total_bids).toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main UsersPage component
const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'credits' | 'bids' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithStats | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [viewingUserStats, setViewingUserStats] = useState<UserStats | null>(null);
  const [viewingUser, setViewingUser] = useState<UserWithStats | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Error/success messages
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Load users with stats
  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await getAllUsers();

    if (error) {
      setMessage({ type: 'error', text: `Failed to load users: ${error}` });
      setLoading(false);
      return;
    }

    // Enrich users with basic stats
    const enrichedUsers: UserWithStats[] = [];
    for (const user of data || []) {
      const { data: bids } = await getBidsForUser(user.id);
      const totalBids = bids?.length || 0;
      const totalCreditsSpent = bids?.reduce((sum, bid) => sum + (bid.credit_cost || 0), 0) || 0;

      enrichedUsers.push({
        ...user,
        total_bids: totalBids,
        total_credits_spent: totalCreditsSpent,
      });
    }

    setUsers(enrichedUsers);
    setLoading(false);
  };

  // Initial load and realtime subscription
  useEffect(() => {
    loadUsers();

    const subscription = subscribeToUserUpdates(() => {
      loadUsers();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter and sort
  useEffect(() => {
    let result = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((user) =>
        user.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'credits':
          compareValue = a.credit_balance - b.credit_balance;
          break;
        case 'bids':
          compareValue = (a.total_bids || 0) - (b.total_bids || 0);
          break;
        case 'date':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredUsers(result);
  }, [users, searchQuery, sortBy, sortOrder]);

  // Handle create
  const handleCreate = async (formData: UserFormData) => {
    setOperationLoading(true);
    const { data, error } = await createUser(
      formData.name,
      formData.avatar_url || undefined
    );

    if (error) {
      setOperationLoading(false);
      setMessage({ type: 'error', text: `Failed to create user: ${error}` });
      return;
    }

    // Update credit balance if different from default
    if (data && formData.credit_balance !== 100) {
      const { error: updateError } = await updateUser(data.id, {
        credit_balance: formData.credit_balance,
      });

      if (updateError) {
        setMessage({ type: 'error', text: `User created but failed to set credits: ${updateError}` });
      }
    }

    setOperationLoading(false);
    setMessage({ type: 'success', text: 'User created successfully!' });
    setIsModalOpen(false);
    loadUsers();
  };

  // Handle update
  const handleUpdate = async (formData: UserFormData) => {
    if (!editingUser) return;

    setOperationLoading(true);
    const { data, error } = await updateUser(editingUser.id, {
      name: formData.name,
      avatar_url: formData.avatar_url || null,
      credit_balance: formData.credit_balance,
    });

    setOperationLoading(false);

    if (error) {
      setMessage({ type: 'error', text: `Failed to update user: ${error}` });
    } else {
      setMessage({ type: 'success', text: 'User updated successfully!' });
      setIsModalOpen(false);
      setEditingUser(null);
      loadUsers();
    }
  };

  // Handle delete
  const handleDeleteClick = async (user: UserWithStats) => {
    setDeletingUser(user);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;

    setOperationLoading(true);
    const { data, error } = await deleteUser(deletingUser.id);

    setOperationLoading(false);

    if (error) {
      setMessage({ type: 'error', text: `Failed to delete user: ${error}` });
    } else {
      setMessage({ type: 'success', text: 'User deleted successfully!' });
      setIsDeleteOpen(false);
      setDeletingUser(null);
      loadUsers();
    }
  };

  // Handle view stats
  const handleViewStats = async (user: UserWithStats) => {
    setViewingUser(user);
    const { data, error } = await getUserStats(user.id);

    if (error) {
      setMessage({ type: 'error', text: `Failed to load user stats: ${error}` });
      return;
    }

    setViewingUserStats(data);
    setIsStatsOpen(true);
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Helper to get user initials
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to calculate account age
  const getAccountAge = (createdAt: string): string => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return months === 1 ? '1 month' : `${months} months`;
    }
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  };

  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
        >
          + Add New User
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
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Sort by */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'credits' | 'bids' | 'date')}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="credits">Sort by Credits</option>
            <option value="bids">Sort by Total Bids</option>
            <option value="date">Sort by Join Date</option>
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

      {/* Users list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
          <div className="text-gray-500 text-lg mb-2">No users found</div>
          <div className="text-gray-400">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Click "Add New User" to get started'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <motion.div
              key={user.id}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {getInitials(user.name)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div className="flex gap-4">
                      <span className="text-blue-400 font-semibold">{user.credit_balance} credits</span>
                      <span>{user.total_bids || 0} bids</span>
                    </div>
                    <div>Member for {getAccountAge(user.created_at)}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewStats(user)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm font-medium transition-colors"
                  >
                    Stats
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(user)}
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
          <UserModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingUser(null);
            }}
            onSave={editingUser ? handleUpdate : handleCreate}
            user={editingUser}
            isLoading={operationLoading}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleteOpen && deletingUser && (
          <DeleteConfirm
            isOpen={isDeleteOpen}
            onClose={() => {
              setIsDeleteOpen(false);
              setDeletingUser(null);
            }}
            onConfirm={handleDeleteConfirm}
            userName={deletingUser.name}
            userStats={{
              bidCount: deletingUser.total_bids || 0,
              creditsRemaining: deletingUser.credit_balance,
              shirtsWon: deletingUser.shirts_won || 0,
            }}
            isLoading={operationLoading}
          />
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {isStatsOpen && viewingUser && (
          <UserStatsModal
            isOpen={isStatsOpen}
            onClose={() => {
              setIsStatsOpen(false);
              setViewingUser(null);
              setViewingUserStats(null);
            }}
            user={viewingUser}
            stats={viewingUserStats}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UsersPage;
