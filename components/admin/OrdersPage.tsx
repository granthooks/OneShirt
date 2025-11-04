import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Filter,
  Truck,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  X,
  Printer,
  Mail,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  getWonShirts,
  getShirtWinner,
  getBidsForShirt,
  type OrderWithWinner,
  type Bid,
} from '../../services/databaseService';

// TODO: Future enhancement - Add these fields to shirts table in database
type ShippingStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

interface OrderWithShippingInfo extends OrderWithWinner {
  shipping_status: ShippingStatus;
  tracking_number?: string;
  delivery_date?: string;
  notes?: string;
}

type SortOption = 'newest' | 'oldest' | 'name';
type StatusFilter = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered';

const OrdersPage: React.FC = () => {
  // State management
  const [orders, setOrders] = useState<OrderWithShippingInfo[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithShippingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<OrderWithShippingInfo | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [orderBids, setOrderBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);

  // Status update form
  const [newStatus, setNewStatus] = useState<ShippingStatus>('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Load orders data
  const loadOrders = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      setError(null);

      const { data, error: ordersError } = await getWonShirts();

      if (ordersError) throw new Error(ordersError);

      // Convert to orders with placeholder shipping info
      // TODO: Once database schema is updated, load real shipping data
      const ordersWithShipping: OrderWithShippingInfo[] = (data || []).map((order) => ({
        ...order,
        shipping_status: 'pending' as ShippingStatus,
        tracking_number: undefined,
        delivery_date: undefined,
        notes: undefined,
      }));

      setOrders(ordersWithShipping);
      setFilteredOrders(ordersWithShipping);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadOrders();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...orders];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.shirt.name.toLowerCase().includes(query) ||
          order.winner.name.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((order) => order.shipping_status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.win_date).getTime() - new Date(a.win_date).getTime();
        case 'oldest':
          return new Date(a.win_date).getTime() - new Date(b.win_date).getTime();
        case 'name':
          return a.shirt.name.localeCompare(b.shirt.name);
        default:
          return 0;
      }
    });

    setFilteredOrders(result);
  }, [orders, searchQuery, statusFilter, sortOption]);

  // Open details modal
  const handleViewDetails = async (order: OrderWithShippingInfo) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setLoadingBids(true);

    // Load bid history for this shirt
    const { data, error } = await getBidsForShirt(order.shirt.id);
    if (!error && data) {
      setOrderBids(data);
    }
    setLoadingBids(false);
  };

  // Open status update modal
  const handleUpdateStatus = (order: OrderWithShippingInfo) => {
    setSelectedOrder(order);
    setNewStatus(order.shipping_status);
    setTrackingNumber(order.tracking_number || '');
    setDeliveryDate(order.delivery_date || '');
    setStatusNotes(order.notes || '');
    setShowStatusModal(true);
  };

  // Save status update
  const handleSaveStatus = () => {
    if (!selectedOrder) return;

    // TODO: Once database schema is updated, save to database
    // For now, just update local state
    const updatedOrders = orders.map((order) =>
      order.shirt.id === selectedOrder.shirt.id
        ? {
            ...order,
            shipping_status: newStatus,
            tracking_number: trackingNumber || undefined,
            delivery_date: deliveryDate || undefined,
            notes: statusNotes || undefined,
          }
        : order
    );

    setOrders(updatedOrders);
    setShowStatusModal(false);
    setSelectedOrder(null);

    console.log('Status updated (local only - database schema not yet updated):', {
      shirtId: selectedOrder.shirt.id,
      newStatus,
      trackingNumber,
      deliveryDate,
      statusNotes,
    });
  };

  // Format date/time helpers
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: ShippingStatus) => {
    const styles = {
      pending: 'bg-gray-600 text-gray-200',
      processing: 'bg-blue-600 text-blue-100',
      shipped: 'bg-purple-600 text-purple-100',
      delivered: 'bg-green-600 text-green-100',
    };

    const icons = {
      pending: Clock,
      processing: RefreshCw,
      shipped: Truck,
      delivered: CheckCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        <Icon className="w-4 h-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Placeholder handlers for future features
  const handleExportOrders = () => {
    console.log('Export orders - Placeholder feature');
    alert('Export feature coming soon!');
  };

  const handleEmailWinner = (order: OrderWithShippingInfo) => {
    console.log('Email winner:', order.winner.name);
    alert(`Email feature coming soon!\nWould email: ${order.winner.name}`);
  };

  const handlePrintOrder = (order: OrderWithShippingInfo) => {
    console.log('Print order:', order.shirt.name);
    // Open print dialog with order summary
    window.print();
  };

  if (error && orders.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
          <div className="text-red-400 text-lg mb-2">Error Loading Orders</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={() => loadOrders()}
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
        <div>
          <h1 className="text-3xl font-bold text-white">Winners & Orders</h1>
          <p className="text-gray-400 mt-1">Manage shirt winners and order fulfillment</p>
        </div>
        <button
          onClick={handleExportOrders}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Orders
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by shirt name or winner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">By Name</option>
          </select>

          {/* Refresh */}
          <button
            onClick={() => loadOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-800 h-32 rounded-lg"></div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <div className="text-gray-400 text-lg mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders yet'}
          </div>
          <div className="text-gray-500">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Orders will appear here when shirts are won'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.shirt.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-6">
                {/* Shirt Image */}
                <img
                  src={order.shirt.image_url}
                  alt={order.shirt.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />

                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{order.shirt.name}</h3>
                      <div className="text-sm text-gray-400">
                        {order.shirt.current_bid_count} / {order.shirt.bid_threshold} bids
                        {order.shirt.designer && (
                          <span className="ml-3">
                            by <span className="text-purple-400">{order.shirt.designer}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(order.shipping_status)}
                  </div>

                  {/* Winner Info */}
                  <div className="flex items-center gap-3 mb-3">
                    {order.winner.avatar_url ? (
                      <img
                        src={order.winner.avatar_url}
                        alt={order.winner.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {order.winner.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">{order.winner.name}</div>
                      <div className="text-sm text-gray-400">
                        {order.total_bids_by_winner} bid{order.total_bids_by_winner !== 1 ? 's' : ''} placed •
                        Won {formatTimeAgo(order.win_date)}
                      </div>
                    </div>
                  </div>

                  {/* Tracking Info */}
                  {order.tracking_number && (
                    <div className="bg-gray-700/50 rounded px-3 py-2 mb-3">
                      <div className="text-sm text-gray-400">Tracking Number</div>
                      <div className="text-white font-mono">{order.tracking_number}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUpdateStatus(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Update Status
                    </button>
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Update Status Modal */}
      <AnimatePresence>
        {showStatusModal && selectedOrder && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStatusModal(false)}
          >
            <motion.div
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Update Shipping Status</h2>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Current Status */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Current Status</div>
                  {getStatusBadge(selectedOrder.shipping_status)}
                </div>

                {/* New Status */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ShippingStatus)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                {/* Tracking Number (shown when shipped) */}
                {(newStatus === 'shipped' || newStatus === 'delivered') && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tracking Number</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Delivery Date (shown when delivered) */}
                {newStatus === 'delivered' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Delivery Date</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Notes (Optional)</label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Add any notes about this order..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Note about placeholder */}
                <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
                  <div className="text-yellow-400 text-sm">
                    Note: Status updates are currently stored in local state only. Database schema updates needed
                    for persistent storage.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveStatus}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedOrder && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full border border-gray-700 my-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Order Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Shirt Details */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex gap-4">
                  <img
                    src={selectedOrder.shirt.image_url}
                    alt={selectedOrder.shirt.name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{selectedOrder.shirt.name}</h3>
                    {selectedOrder.shirt.designer && (
                      <div className="text-gray-400 mb-2">
                        Designer: <span className="text-purple-400">{selectedOrder.shirt.designer}</span>
                      </div>
                    )}
                    <div className="text-gray-400 mb-2">
                      Final Bid Count: {selectedOrder.shirt.current_bid_count} / {selectedOrder.shirt.bid_threshold}
                    </div>
                    <div>{getStatusBadge(selectedOrder.shipping_status)}</div>
                  </div>
                </div>
              </div>

              {/* Winner Details */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-3">Winner Information</h3>
                <div className="flex items-center gap-4 mb-4">
                  {selectedOrder.winner.avatar_url ? (
                    <img
                      src={selectedOrder.winner.avatar_url}
                      alt={selectedOrder.winner.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                      {selectedOrder.winner.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-white font-medium text-lg">{selectedOrder.winner.name}</div>
                    <div className="text-gray-400">
                      Credits: {selectedOrder.winner.credit_balance}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Bids on This Shirt</div>
                    <div className="text-white font-bold">{selectedOrder.total_bids_by_winner}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Won Date</div>
                    <div className="text-white font-bold">{formatDate(selectedOrder.win_date)}</div>
                  </div>
                </div>
                <div className="mt-4 bg-yellow-900/20 border border-yellow-700 rounded p-3">
                  <div className="text-yellow-400 text-sm">
                    Shipping Address: <span className="italic">Address on file (feature coming soon)</span>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              {(selectedOrder.tracking_number || selectedOrder.delivery_date || selectedOrder.notes) && (
                <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-bold text-white mb-3">Shipping Information</h3>
                  {selectedOrder.tracking_number && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-400">Tracking Number</div>
                      <div className="text-white font-mono">{selectedOrder.tracking_number}</div>
                    </div>
                  )}
                  {selectedOrder.delivery_date && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-400">Delivery Date</div>
                      <div className="text-white">{formatDate(selectedOrder.delivery_date)}</div>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div>
                      <div className="text-sm text-gray-400">Notes</div>
                      <div className="text-white">{selectedOrder.notes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Bid History */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-3">Bid History</h3>
                {loadingBids ? (
                  <div className="text-center py-4 text-gray-400">Loading bids...</div>
                ) : orderBids.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">No bids found</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {orderBids.slice(0, 10).map((bid) => (
                      <div key={bid.id} className="flex justify-between items-center text-sm">
                        <div className="text-gray-400">{formatDate(bid.created_at)}</div>
                        <div className="text-yellow-400">{bid.credit_cost} credit</div>
                      </div>
                    ))}
                    {orderBids.length > 10 && (
                      <div className="text-center text-gray-500 text-sm pt-2">
                        + {orderBids.length - 10} more bids
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleEmailWinner(selectedOrder)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email Winner
                </button>
                <button
                  onClick={() => handlePrintOrder(selectedOrder)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OrdersPage;
