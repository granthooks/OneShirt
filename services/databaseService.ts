/**
 * Database Service Module
 *
 * This module provides a comprehensive API for all database operations including
 * CRUD operations for users, shirts, and bids, as well as realtime subscriptions.
 *
 * @module services/databaseService
 */

import { supabase } from './supabaseClient'
import type {
  User,
  Shirt,
  Bid,
  UserInsert,
  ShirtInsert,
  BidInsert,
  UserUpdate,
  ShirtUpdate,
} from './supabaseClient'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Standard response format for all database operations
 */
export interface DatabaseResponse<T> {
  data: T | null
  error: string | null
}

/**
 * User statistics returned from get_user_stats function
 */
export interface UserStats {
  user_id: string
  name: string
  credit_balance: number
  total_bids: number
  total_credits_spent: number
  shirts_won: number
}

/**
 * Shirt statistics returned from get_shirt_stats function
 */
export interface ShirtStats {
  shirt_id: string
  name: string
  current_bid_count: number
  bid_threshold: number
  status: string
  total_bids: number
  unique_bidders: number
  total_credits_spent: number
}

/**
 * Place bid result returned from place_bid function
 */
export interface PlaceBidResult {
  success: boolean
  error?: string
  bid_id?: string
  new_bid_count?: number
  threshold_reached?: boolean
  winner?: boolean
}

/**
 * Realtime subscription handle
 */
export type RealtimeSubscription = ReturnType<typeof supabase.channel>

// ============================================================================
// USER FUNCTIONS
// ============================================================================

/**
 * Create a new user with default 100 credits
 *
 * @param name - User's display name
 * @param avatarUrl - Optional avatar URL
 * @param isAdmin - Optional admin flag (defaults to false)
 * @returns The created user or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await createUser('John Doe', 'https://example.com/avatar.jpg')
 * if (error) console.error(error)
 * else console.log('Created user:', data)
 * ```
 */
export async function createUser(
  name: string,
  avatarUrl?: string,
  isAdmin?: boolean
): Promise<DatabaseResponse<User>> {
  try {
    const userData: UserInsert = {
      name,
      avatar_url: avatarUrl || null,
      credit_balance: 100, // Default starting credits
      is_admin: isAdmin || false,
    }

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error creating user'
    console.error('Exception creating user:', err)
    return { data: null, error: message }
  }
}

/**
 * Get a user by their ID
 *
 * @param userId - The user's unique identifier
 * @returns The user or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getUser('123e4567-e89b-12d3-a456-426614174000')
 * ```
 */
export async function getUser(userId: string): Promise<DatabaseResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error getting user:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting user'
    console.error('Exception getting user:', err)
    return { data: null, error: message }
  }
}

/**
 * Get a user by their name
 *
 * @param name - The user's display name
 * @returns The user or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getUserByName('John Doe')
 * ```
 */
export async function getUserByName(name: string): Promise<DatabaseResponse<User>> {
  try {
    // Use limit(1).maybeSingle() to handle duplicates gracefully
    // This will return the first user if duplicates exist, or null if no user exists
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error getting user by name:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting user by name'
    console.error('Exception getting user by name:', err)
    return { data: null, error: message }
  }
}

/**
 * Update a user's credit balance
 *
 * @param userId - The user's unique identifier
 * @param newBalance - The new credit balance
 * @returns The updated user or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await updateUserCredits('user-123', 75)
 * ```
 */
export async function updateUserCredits(
  userId: string,
  newBalance: number
): Promise<DatabaseResponse<User>> {
  try {
    const updateData: UserUpdate = {
      credit_balance: newBalance,
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user credits:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error updating user credits'
    console.error('Exception updating user credits:', err)
    return { data: null, error: message }
  }
}

/**
 * Get comprehensive statistics for a user
 *
 * @param userId - The user's unique identifier
 * @returns User statistics or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getUserStats('user-123')
 * console.log(`Total bids: ${data?.total_bids}, Shirts won: ${data?.shirts_won}`)
 * ```
 */
export async function getUserStats(
  userId: string
): Promise<DatabaseResponse<UserStats>> {
  try {
    const { data, error } = await supabase.rpc('get_user_stats', {
      p_user_id: userId,
    })

    if (error) {
      console.error('Error getting user stats:', error)
      return { data: null, error: error.message }
    }

    return { data: data as UserStats, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting user stats'
    console.error('Exception getting user stats:', err)
    return { data: null, error: message }
  }
}

// ============================================================================
// SHIRT FUNCTIONS
// ============================================================================

/**
 * Create a new shirt
 *
 * @param name - Shirt display name
 * @param imageUrl - URL to the shirt image
 * @param bidThreshold - Optional bid threshold (defaults to 100)
 * @param designer - Optional designer name
 * @param likes - Optional initial like count (defaults to 0)
 * @returns The created shirt or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await createShirt(
 *   'Awesome Design',
 *   'https://example.com/shirt.jpg',
 *   50,
 *   'Designer Name',
 *   0
 * )
 * ```
 */
export async function createShirt(
  name: string,
  imageUrl: string,
  bidThreshold?: number,
  designer?: string,
  likes?: number
): Promise<DatabaseResponse<Shirt>> {
  try {
    const shirtData: ShirtInsert = {
      name,
      image_url: imageUrl,
      bid_threshold: bidThreshold || 100,
      current_bid_count: 0,
      status: 'active',
      designer: designer || null,
      like_count: likes || 0,
    }

    const { data, error } = await supabase
      .from('shirts')
      .insert(shirtData)
      .select()
      .single()

    if (error) {
      console.error('Error creating shirt:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error creating shirt'
    console.error('Exception creating shirt:', err)
    return { data: null, error: message }
  }
}

/**
 * Get a shirt by its ID
 *
 * @param shirtId - The shirt's unique identifier
 * @returns The shirt or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getShirt('shirt-123')
 * ```
 */
export async function getShirt(shirtId: string): Promise<DatabaseResponse<Shirt>> {
  try {
    const { data, error } = await supabase
      .from('shirts')
      .select('*')
      .eq('id', shirtId)
      .single()

    if (error) {
      console.error('Error getting shirt:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting shirt'
    console.error('Exception getting shirt:', err)
    return { data: null, error: message }
  }
}

/**
 * Get all active (unwon) shirts
 *
 * @returns Array of active shirts or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getActiveShirts()
 * console.log(`Found ${data?.length} active shirts`)
 * ```
 */
export async function getActiveShirts(): Promise<DatabaseResponse<Shirt[]>> {
  try {
    const { data, error } = await supabase
      .from('shirts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting active shirts:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting active shirts'
    console.error('Exception getting active shirts:', err)
    return { data: null, error: message }
  }
}

/**
 * Get all shirts (both active and won)
 *
 * @returns Array of all shirts or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getAllShirts()
 * ```
 */
export async function getAllShirts(): Promise<DatabaseResponse<Shirt[]>> {
  try {
    const { data, error } = await supabase
      .from('shirts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting all shirts:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting all shirts'
    console.error('Exception getting all shirts:', err)
    return { data: null, error: message }
  }
}

/**
 * Update a shirt's bid count
 *
 * @param shirtId - The shirt's unique identifier
 * @param newCount - The new bid count
 * @returns The updated shirt or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await updateShirtBidCount('shirt-123', 25)
 * ```
 */
export async function updateShirtBidCount(
  shirtId: string,
  newCount: number
): Promise<DatabaseResponse<Shirt>> {
  try {
    const updateData: ShirtUpdate = {
      current_bid_count: newCount,
    }

    const { data, error } = await supabase
      .from('shirts')
      .update(updateData)
      .eq('id', shirtId)
      .select()
      .single()

    if (error) {
      console.error('Error updating shirt bid count:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error updating shirt bid count'
    console.error('Exception updating shirt bid count:', err)
    return { data: null, error: message }
  }
}

/**
 * Mark a shirt as won by a user
 *
 * @param shirtId - The shirt's unique identifier
 * @param winnerId - The winning user's ID
 * @returns The updated shirt or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await markShirtAsWon('shirt-123', 'user-456')
 * ```
 */
export async function markShirtAsWon(
  shirtId: string,
  winnerId: string
): Promise<DatabaseResponse<Shirt>> {
  try {
    const updateData: ShirtUpdate = {
      status: 'won',
      winner_id: winnerId,
    }

    const { data, error } = await supabase
      .from('shirts')
      .update(updateData)
      .eq('id', shirtId)
      .select()
      .single()

    if (error) {
      console.error('Error marking shirt as won:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error marking shirt as won'
    console.error('Exception marking shirt as won:', err)
    return { data: null, error: message }
  }
}

/**
 * Get comprehensive statistics for a shirt
 *
 * @param shirtId - The shirt's unique identifier
 * @returns Shirt statistics or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getShirtStats('shirt-123')
 * console.log(`Total bids: ${data?.total_bids}, Unique bidders: ${data?.unique_bidders}`)
 * ```
 */
export async function getShirtStats(
  shirtId: string
): Promise<DatabaseResponse<ShirtStats>> {
  try {
    const { data, error } = await supabase.rpc('get_shirt_stats', {
      p_shirt_id: shirtId,
    })

    if (error) {
      console.error('Error getting shirt stats:', error)
      return { data: null, error: error.message }
    }

    return { data: data as ShirtStats, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting shirt stats'
    console.error('Exception getting shirt stats:', err)
    return { data: null, error: message }
  }
}

/**
 * Update shirt properties
 *
 * @param shirtId - The shirt's unique identifier
 * @param updates - Object containing fields to update
 * @returns The updated shirt or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await updateShirt('shirt-123', {
 *   name: 'Updated Design',
 *   designer: 'Jane Doe',
 *   bid_threshold: 150
 * })
 * ```
 */
export async function updateShirt(
  shirtId: string,
  updates: {
    name?: string
    image_url?: string
    designer?: string | null
    bid_threshold?: number
    like_count?: number | null
    status?: 'active' | 'won'
  }
): Promise<DatabaseResponse<Shirt>> {
  try {
    const updateData: ShirtUpdate = updates

    const { data, error } = await supabase
      .from('shirts')
      .update(updateData)
      .eq('id', shirtId)
      .select()
      .single()

    if (error) {
      console.error('Error updating shirt:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error updating shirt'
    console.error('Exception updating shirt:', err)
    return { data: null, error: message }
  }
}

/**
 * Delete a shirt by ID
 *
 * @param shirtId - The shirt's unique identifier
 * @returns Success status or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await deleteShirt('shirt-123')
 * if (data) console.log('Shirt deleted successfully')
 * ```
 */
export async function deleteShirt(
  shirtId: string
): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('shirts')
      .delete()
      .eq('id', shirtId)

    if (error) {
      console.error('Error deleting shirt:', error)
      return { data: false, error: error.message }
    }

    return { data: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting shirt'
    console.error('Exception deleting shirt:', err)
    return { data: false, error: message }
  }
}

// ============================================================================
// BID FUNCTIONS
// ============================================================================

/**
 * Place a bid on a shirt using the atomic database function
 *
 * This function handles all the complex logic atomically:
 * - Validates user has enough credits
 * - Deducts credits from user
 * - Creates bid record
 * - Increments shirt bid count
 * - Checks if threshold reached and marks shirt as won
 *
 * @param userId - The user placing the bid
 * @param shirtId - The shirt being bid on
 * @param creditCost - Optional credit cost (defaults to 1)
 * @returns Result of the bid operation
 *
 * @example
 * ```typescript
 * const { data, error } = await placeBid('user-123', 'shirt-456', 1)
 * if (data?.winner) {
 *   console.log('Congratulations! You won the shirt!')
 * }
 * ```
 */
export async function placeBid(
  userId: string,
  shirtId: string,
  creditCost: number = 1
): Promise<DatabaseResponse<PlaceBidResult>> {
  try {
    const { data, error } = await supabase.rpc('place_bid', {
      p_user_id: userId,
      p_shirt_id: shirtId,
      p_credit_cost: creditCost,
    })

    if (error) {
      console.error('Error placing bid:', error)
      return { data: null, error: error.message }
    }

    // Check if the function returned an error in the result
    if (data && !data.success) {
      console.error('Bid placement failed:', data.error)
      return { data: null, error: data.error || 'Bid placement failed' }
    }

    return { data: data as PlaceBidResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error placing bid'
    console.error('Exception placing bid:', err)
    return { data: null, error: message }
  }
}

/**
 * Get all bids for a specific shirt
 *
 * @param shirtId - The shirt's unique identifier
 * @returns Array of bids or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getBidsForShirt('shirt-123')
 * console.log(`This shirt has ${data?.length} bids`)
 * ```
 */
export async function getBidsForShirt(shirtId: string): Promise<DatabaseResponse<Bid[]>> {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('shirt_id', shirtId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting bids for shirt:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting bids for shirt'
    console.error('Exception getting bids for shirt:', err)
    return { data: null, error: message }
  }
}

/**
 * Get all bids placed by a specific user
 *
 * @param userId - The user's unique identifier
 * @returns Array of bids or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getBidsForUser('user-123')
 * console.log(`User has placed ${data?.length} bids`)
 * ```
 */
export async function getBidsForUser(userId: string): Promise<DatabaseResponse<Bid[]>> {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting bids for user:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting bids for user'
    console.error('Exception getting bids for user:', err)
    return { data: null, error: message }
  }
}

/**
 * Get recent bids across all shirts
 *
 * @param limit - Maximum number of bids to return (defaults to 10)
 * @returns Array of recent bids or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getRecentBids(20)
 * console.log('Latest 20 bids:', data)
 * ```
 */
export async function getRecentBids(limit: number = 10): Promise<DatabaseResponse<Bid[]>> {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting recent bids:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting recent bids'
    console.error('Exception getting recent bids:', err)
    return { data: null, error: message }
  }
}

// ============================================================================
// REALTIME SUBSCRIPTION FUNCTIONS
// ============================================================================

/**
 * Subscribe to shirt updates in realtime
 *
 * @param callback - Function to call when shirts are updated
 * @returns Subscription handle for unsubscribing
 *
 * @example
 * ```typescript
 * const subscription = subscribeToShirtUpdates((payload) => {
 *   console.log('Shirt updated:', payload.new)
 * })
 *
 * // Later, to unsubscribe:
 * supabase.removeChannel(subscription)
 * ```
 */
export function subscribeToShirtUpdates(
  callback: (payload: any) => void
): RealtimeSubscription {
  const channel = supabase
    .channel('shirts-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shirts',
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Subscribe to new bids in realtime
 *
 * @param callback - Function to call when new bids are placed
 * @returns Subscription handle for unsubscribing
 *
 * @example
 * ```typescript
 * const subscription = subscribeToBidUpdates((payload) => {
 *   console.log('New bid placed:', payload.new)
 * })
 *
 * // Later, to unsubscribe:
 * supabase.removeChannel(subscription)
 * ```
 */
export function subscribeToBidUpdates(
  callback: (payload: any) => void
): RealtimeSubscription {
  const channel = supabase
    .channel('bids-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Unsubscribe from all realtime subscriptions
 *
 * This is useful for cleanup when components unmount or when you want
 * to stop listening to all realtime updates.
 *
 * @example
 * ```typescript
 * // In a React component cleanup
 * useEffect(() => {
 *   const sub1 = subscribeToShirtUpdates(handleUpdate)
 *   const sub2 = subscribeToBidUpdates(handleBid)
 *
 *   return () => {
 *     unsubscribeAll()
 *   }
 * }, [])
 * ```
 */
export async function unsubscribeAll(): Promise<void> {
  try {
    await supabase.removeAllChannels()
    console.log('Unsubscribed from all realtime channels')
  } catch (err) {
    console.error('Error unsubscribing from channels:', err)
  }
}

// ============================================================================
// DASHBOARD STATISTICS FUNCTIONS
// ============================================================================

/**
 * Statistics overview for admin dashboard
 */
export interface StatsOverview {
  totalActiveShirts: number
  totalUsers: number
  totalBidsToday: number
  totalRevenue: number
}

/**
 * Top shirt data for leaderboard
 */
export interface TopShirt {
  id: string
  name: string
  image_url: string
  current_bid_count: number
  bid_threshold: number
  total_bids: number
}

/**
 * Top user data for leaderboard
 */
export interface TopUser {
  id: string
  name: string
  avatar_url: string | null
  total_bids: number
  total_credits_spent: number
}

/**
 * Recent bid with joined user and shirt data
 */
export interface RecentBidWithDetails {
  id: string
  user_id: string
  shirt_id: string
  credits_spent: number
  created_at: string
  user_name: string
  user_avatar: string | null
  shirt_name: string
  shirt_image: string
}

/**
 * Get overview statistics for the dashboard
 *
 * @returns Overview statistics or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getStatsOverview()
 * console.log(`Total shirts: ${data?.totalActiveShirts}`)
 * ```
 */
export async function getStatsOverview(): Promise<DatabaseResponse<StatsOverview>> {
  try {
    // Get total active shirts
    const { count: shirtsCount, error: shirtsError } = await supabase
      .from('shirts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    if (shirtsError) throw shirtsError

    // Get total users
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (usersError) throw usersError

    // Get bids from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: bidsTodayCount, error: bidsError } = await supabase
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    if (bidsError) throw bidsError

    // Get total revenue (sum of all credits spent)
    const { data: revenue, error: revenueError } = await supabase
      .from('bids')
      .select('credit_cost')

    if (revenueError) throw revenueError

    const totalRevenue = revenue?.reduce((sum, bid) => sum + (bid.credit_cost || 0), 0) || 0

    const stats: StatsOverview = {
      totalActiveShirts: shirtsCount || 0,
      totalUsers: usersCount || 0,
      totalBidsToday: bidsTodayCount || 0,
      totalRevenue,
    }

    return { data: stats, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting stats overview'
    console.error('Exception getting stats overview:', err)
    return { data: null, error: message }
  }
}

/**
 * Get recent bids with user and shirt details joined
 *
 * @param limit - Maximum number of bids to return (defaults to 10)
 * @returns Array of recent bids with details or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getRecentBidsWithDetails(20)
 * ```
 */
export async function getRecentBidsWithDetails(
  limit: number = 10
): Promise<DatabaseResponse<RecentBidWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        id,
        user_id,
        shirt_id,
        credit_cost,
        created_at,
        users:user_id (
          name,
          avatar_url
        ),
        shirts:shirt_id (
          name,
          image_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting recent bids with details:', error)
      return { data: null, error: error.message }
    }

    // Transform the data to flatten the joined fields
    const transformedData: RecentBidWithDetails[] = (data || []).map((bid: any) => ({
      id: bid.id,
      user_id: bid.user_id,
      shirt_id: bid.shirt_id,
      credits_spent: bid.credit_cost,
      created_at: bid.created_at,
      user_name: bid.users?.name || 'Unknown User',
      user_avatar: bid.users?.avatar_url || null,
      shirt_name: bid.shirts?.name || 'Unknown Shirt',
      shirt_image: bid.shirts?.image_url || '',
    }))

    return { data: transformedData, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting recent bids with details'
    console.error('Exception getting recent bids with details:', err)
    return { data: null, error: message }
  }
}

/**
 * Get top shirts by bid count
 *
 * @param limit - Maximum number of shirts to return (defaults to 5)
 * @returns Array of top shirts or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getTopShirts(10)
 * ```
 */
export async function getTopShirts(limit: number = 5): Promise<DatabaseResponse<TopShirt[]>> {
  try {
    // Get shirts with their bid counts
    const { data: shirts, error: shirtsError } = await supabase
      .from('shirts')
      .select('id, name, image_url, current_bid_count, bid_threshold')
      .eq('status', 'active')
      .order('current_bid_count', { ascending: false })
      .limit(limit)

    if (shirtsError) throw shirtsError

    // For each shirt, get the total number of bids
    const shirtsWithTotals: TopShirt[] = []

    for (const shirt of shirts || []) {
      const { count, error: countError } = await supabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('shirt_id', shirt.id)

      if (countError) {
        console.error('Error getting bid count for shirt:', countError)
        continue
      }

      shirtsWithTotals.push({
        id: shirt.id,
        name: shirt.name,
        image_url: shirt.image_url,
        current_bid_count: shirt.current_bid_count,
        bid_threshold: shirt.bid_threshold,
        total_bids: count || 0,
      })
    }

    return { data: shirtsWithTotals, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting top shirts'
    console.error('Exception getting top shirts:', err)
    return { data: null, error: message }
  }
}

/**
 * Get top users by bid count
 *
 * @param limit - Maximum number of users to return (defaults to 5)
 * @returns Array of top users or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getTopUsers(10)
 * ```
 */
export async function getTopUsers(limit: number = 5): Promise<DatabaseResponse<TopUser[]>> {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, avatar_url')

    if (usersError) throw usersError

    // For each user, get their bid count and credits spent
    const usersWithStats: TopUser[] = []

    for (const user of users || []) {
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('credit_cost')
        .eq('user_id', user.id)

      if (bidsError) {
        console.error('Error getting bids for user:', bidsError)
        continue
      }

      const totalBids = bids?.length || 0
      const totalCreditsSpent = bids?.reduce((sum, bid) => sum + (bid.credit_cost || 0), 0) || 0

      usersWithStats.push({
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        total_bids: totalBids,
        total_credits_spent: totalCreditsSpent,
      })
    }

    // Sort by total bids and limit
    usersWithStats.sort((a, b) => b.total_bids - a.total_bids)
    const topUsers = usersWithStats.slice(0, limit)

    return { data: topUsers, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting top users'
    console.error('Exception getting top users:', err)
    return { data: null, error: message }
  }
}

// ============================================================================
// USER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all users in the system
 *
 * @returns Array of all users or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getAllUsers()
 * console.log(`Found ${data?.length} users`)
 * ```
 */
export async function getAllUsers(): Promise<DatabaseResponse<User[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting all users:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting all users'
    console.error('Exception getting all users:', err)
    return { data: null, error: message }
  }
}

/**
 * Update user properties
 *
 * @param userId - The user's unique identifier
 * @param updates - Object containing fields to update
 * @returns The updated user or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await updateUser('user-123', {
 *   name: 'Jane Doe',
 *   credit_balance: 150,
 *   avatar_url: 'https://example.com/avatar.jpg'
 * })
 * ```
 */
export async function updateUser(
  userId: string,
  updates: {
    name?: string
    avatar_url?: string | null
    credit_balance?: number
    is_admin?: boolean
  }
): Promise<DatabaseResponse<User>> {
  try {
    const updateData: UserUpdate = updates

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error updating user'
    console.error('Exception updating user:', err)
    return { data: null, error: message }
  }
}

/**
 * Delete a user by ID
 *
 * @param userId - The user's unique identifier
 * @returns Success status or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await deleteUser('user-123')
 * if (data) console.log('User deleted successfully')
 * ```
 */
export async function deleteUser(
  userId: string
): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      return { data: false, error: error.message }
    }

    return { data: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting user'
    console.error('Exception deleting user:', err)
    return { data: false, error: message }
  }
}

/**
 * Subscribe to user updates in realtime
 *
 * @param callback - Function to call when users are updated
 * @returns Subscription handle for unsubscribing
 *
 * @example
 * ```typescript
 * const subscription = subscribeToUserUpdates((payload) => {
 *   console.log('User updated:', payload.new)
 * })
 *
 * // Later, to unsubscribe:
 * supabase.removeChannel(subscription)
 * ```
 */
export function subscribeToUserUpdates(
  callback: (payload: any) => void
): RealtimeSubscription {
  const channel = supabase
    .channel('users-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
      },
      callback
    )
    .subscribe()

  return channel
}

// ============================================================================
// ORDERS & WINNERS FUNCTIONS
// ============================================================================

/**
 * Order information with winner details
 */
export interface OrderWithWinner {
  shirt: Shirt
  winner: User
  win_date: string
  total_bids_by_winner: number
  // TODO: Add these fields to database in future
  // shipping_status: 'pending' | 'processing' | 'shipped' | 'delivered'
  // tracking_number?: string
  // delivery_date?: string
}

/**
 * Get all won shirts (orders) with winner information
 *
 * @returns Array of orders with winner details or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getWonShirts()
 * console.log(`Found ${data?.length} orders`)
 * ```
 */
export async function getWonShirts(): Promise<DatabaseResponse<OrderWithWinner[]>> {
  try {
    // Get all won shirts with winner information
    const { data: wonShirts, error: shirtsError } = await supabase
      .from('shirts')
      .select(`
        *,
        winner:winner_id (*)
      `)
      .eq('status', 'won')
      .not('winner_id', 'is', null)
      .order('updated_at', { ascending: false })

    if (shirtsError) {
      console.error('Error getting won shirts:', shirtsError)
      return { data: null, error: shirtsError.message }
    }

    // For each won shirt, get the number of bids the winner placed
    const ordersWithDetails: OrderWithWinner[] = []

    for (const shirtData of wonShirts || []) {
      // Count bids by the winner for this specific shirt
      const { count, error: countError } = await supabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('shirt_id', shirtData.id)
        .eq('user_id', shirtData.winner_id)

      if (countError) {
        console.error('Error counting winner bids:', countError)
        continue
      }

      ordersWithDetails.push({
        shirt: shirtData,
        winner: (shirtData as any).winner,
        win_date: shirtData.updated_at,
        total_bids_by_winner: count || 0,
      })
    }

    return { data: ordersWithDetails, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting won shirts'
    console.error('Exception getting won shirts:', err)
    return { data: null, error: message }
  }
}

/**
 * Get winner information for a specific shirt
 *
 * @param shirtId - The shirt's unique identifier
 * @returns Shirt with winner details or an error
 *
 * @example
 * ```typescript
 * const { data, error } = await getShirtWinner('shirt-123')
 * console.log(`Winner: ${data?.winner.name}`)
 * ```
 */
export async function getShirtWinner(
  shirtId: string
): Promise<DatabaseResponse<{ shirt: Shirt; winner: User; total_bids_by_winner: number }>> {
  try {
    const { data: shirt, error: shirtError } = await supabase
      .from('shirts')
      .select(`
        *,
        winner:winner_id (*)
      `)
      .eq('id', shirtId)
      .single()

    if (shirtError) {
      console.error('Error getting shirt winner:', shirtError)
      return { data: null, error: shirtError.message }
    }

    if (!shirt.winner_id) {
      return { data: null, error: 'This shirt has no winner yet' }
    }

    // Count bids by the winner for this shirt
    const { count, error: countError } = await supabase
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .eq('shirt_id', shirtId)
      .eq('user_id', shirt.winner_id)

    if (countError) {
      console.error('Error counting winner bids:', countError)
      return { data: null, error: countError.message }
    }

    return {
      data: {
        shirt,
        winner: (shirt as any).winner,
        total_bids_by_winner: count || 0,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting shirt winner'
    console.error('Exception getting shirt winner:', err)
    return { data: null, error: message }
  }
}
