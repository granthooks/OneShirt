import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Package, DollarSign, Activity, RefreshCw } from 'lucide-react';
import {
  getStatsOverview,
  getRecentBidsWithDetails,
  getTopShirts,
  getTopUsers,
  subscribeToBidUpdates,
  type StatsOverview,
  type RecentBidWithDetails,
  type TopShirt,
  type TopUser,
  type RealtimeSubscription,
} from '../../services/databaseService';
import { supabase } from '../../services/supabaseClient';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading: boolean;
  gradient: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, loading, gradient }) => (
  <motion.div
    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all shadow-lg hover:shadow-xl"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className="text-gray-400 text-sm mb-2">{label}</div>
    <div className="text-3xl font-bold text-white">
      {loading ? (
        <div className="animate-pulse bg-gray-700 h-8 w-24 rounded"></div>
      ) : (
        value
      )}
    </div>
  </motion.div>
);

const DashboardPage: React.FC = () => {
  const [statsOverview, setStatsOverview] = useState<StatsOverview | null>(null);
  const [recentBids, setRecentBids] = useState<RecentBidWithDetails[]>([]);
  const [topShirts, setTopShirts] = useState<TopShirt[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load all dashboard data
  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      setError(null);

      // Fetch all data in parallel
      const [overviewResult, bidsResult, shirtsResult, usersResult] = await Promise.all([
        getStatsOverview(),
        getRecentBidsWithDetails(10),
        getTopShirts(5),
        getTopUsers(5),
      ]);

      if (overviewResult.error) throw new Error(overviewResult.error);
      if (bidsResult.error) throw new Error(bidsResult.error);
      if (shirtsResult.error) throw new Error(shirtsResult.error);
      if (usersResult.error) throw new Error(usersResult.error);

      setStatsOverview(overviewResult.data);
      setRecentBids(bidsResult.data || []);
      setTopShirts(shirtsResult.data || []);
      setTopUsers(usersResult.data || []);
      setLastUpdate(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    let subscription: RealtimeSubscription | null = null;

    const setupRealtimeSubscription = () => {
      // Subscribe to new bids
      subscription = subscribeToBidUpdates((payload) => {
        console.log('New bid detected:', payload);
        // Refresh dashboard data when a new bid comes in
        loadDashboardData(true);
      });
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  // Format timestamp to relative time
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const bidTime = new Date(timestamp);
    const diffMs = now.getTime() - bidTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (error && !statsOverview) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
          <div className="text-red-400 text-lg mb-2">Error Loading Dashboard</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={() => loadDashboardData()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Package}
          label="Total Active Shirts"
          value={statsOverview?.totalActiveShirts ?? '--'}
          loading={loading}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={statsOverview?.totalUsers ?? '--'}
          loading={loading}
          gradient="from-green-500 to-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Bids Today"
          value={statsOverview?.totalBidsToday ?? '--'}
          loading={loading}
          gradient="from-purple-500 to-purple-600"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue (Credits)"
          value={statsOverview?.totalRevenue ?? '--'}
          loading={loading}
          gradient="from-yellow-500 to-yellow-600"
        />
      </div>

      {/* Recent Activity Section */}
      <motion.div
        className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-700 h-16 rounded"></div>
            ))}
          </div>
        ) : recentBids.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent bids yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentBids.map((bid) => (
              <motion.div
                key={bid.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-3">
                  {bid.user_avatar ? (
                    <img
                      src={bid.user_avatar}
                      alt={bid.user_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {bid.user_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-white font-medium">
                      <span className="text-blue-400">{bid.user_name}</span> bid on{' '}
                      <span className="text-purple-400">{bid.shirt_name}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatTimeAgo(bid.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-yellow-400 font-bold">{bid.credits_spent} credits</div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Bottom Row: Popular Shirts & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular Shirts */}
        <motion.div
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Popular Shirts
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-700 h-20 rounded"></div>
              ))}
            </div>
          ) : topShirts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No shirts available yet
            </div>
          ) : (
            <div className="space-y-3">
              {topShirts.map((shirt, index) => (
                <div
                  key={shirt.id}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="text-2xl font-bold text-gray-600 w-8">
                    #{index + 1}
                  </div>
                  <img
                    src={shirt.image_url}
                    alt={shirt.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">{shirt.name}</div>
                    <div className="text-sm text-gray-400">
                      {shirt.current_bid_count} / {shirt.bid_threshold} bids
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (shirt.current_bid_count / shirt.bid_threshold) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-blue-400 font-bold">
                    {shirt.total_bids} total
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Users Leaderboard */}
        <motion.div
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Top Users
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-700 h-20 rounded"></div>
              ))}
            </div>
          ) : topUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users yet
            </div>
          ) : (
            <div className="space-y-3">
              {topUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="text-2xl font-bold text-gray-600 w-8">
                    #{index + 1}
                  </div>
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-white font-medium">{user.name}</div>
                    <div className="text-sm text-gray-400">
                      {user.total_bids} bid{user.total_bids !== 1 ? 's' : ''} placed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">
                      {user.total_credits_spent}
                    </div>
                    <div className="text-xs text-gray-400">credits spent</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
