/**
 * Supabase Client Service
 *
 * This module initializes and exports the Supabase client for database operations.
 * It includes TypeScript type definitions for all database tables and validates
 * that required environment variables are present.
 *
 * @module services/supabaseClient
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// DATABASE TYPE DEFINITIONS
// ============================================================================

/**
 * Complete database schema type definition
 * Matches the SQL schema in supabase/migrations/20250103_initial_schema.sql
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          avatar_url: string | null
          credit_balance: number
          is_admin: boolean
          email: string | null
          shipping_address: string | null
          shirt_size: string | null
          gender: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          avatar_url?: string | null
          credit_balance?: number
          is_admin?: boolean
          email?: string | null
          shipping_address?: string | null
          shirt_size?: string | null
          gender?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          credit_balance?: number
          is_admin?: boolean
          email?: string | null
          shipping_address?: string | null
          shirt_size?: string | null
          gender?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shirts: {
        Row: {
          id: string
          name: string
          image_url: string
          current_bid_count: number
          bid_threshold: number
          winner_id: string | null
          status: 'active' | 'won' | 'inactive'
          designer: string | null
          like_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          image_url: string
          current_bid_count?: number
          bid_threshold?: number
          winner_id?: string | null
          status?: 'active' | 'won' | 'inactive'
          designer?: string | null
          like_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          image_url?: string
          current_bid_count?: number
          bid_threshold?: number
          winner_id?: string | null
          status?: 'active' | 'won' | 'inactive'
          designer?: string | null
          like_count?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          user_id: string
          shirt_id: string
          credit_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shirt_id: string
          credit_cost?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shirt_id?: string
          credit_cost?: number
          created_at?: string
        }
      }
    }
    Functions: {
      place_bid: {
        Args: {
          p_user_id: string
          p_shirt_id: string
          p_credit_cost?: number
        }
        Returns: {
          success: boolean
          error?: string
          bid_id?: string
          new_bid_count?: number
          threshold_reached?: boolean
          winner?: boolean
        }
      }
      get_shirt_stats: {
        Args: {
          p_shirt_id: string
        }
        Returns: {
          shirt_id: string
          name: string
          current_bid_count: number
          bid_threshold: number
          status: string
          total_bids: number
          unique_bidders: number
          total_credits_spent: number
        }
      }
      get_user_stats: {
        Args: {
          p_user_id: string
        }
        Returns: {
          user_id: string
          name: string
          credit_balance: number
          total_bids: number
          total_credits_spent: number
          shirts_won: number
        }
      }
    }
  }
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  )
}

// Log Supabase configuration (without exposing the key)
console.log('[supabaseClient] Initializing Supabase client...')
console.log('[supabaseClient] Supabase URL:', supabaseUrl)
console.log('[supabaseClient] Supabase Key present:', !!supabaseAnonKey && supabaseAnonKey.length > 0)

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

/**
 * Supabase client instance
 *
 * This client is configured with the database schema types and can be used
 * throughout the application for all database operations.
 *
 * @example
 * ```typescript
 * import { supabase } from './services/supabaseClient'
 *
 * // Query users
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*')
 *
 * // Call RPC function
 * const result = await supabase.rpc('place_bid', {
 *   p_user_id: userId,
 *   p_shirt_id: shirtId,
 *   p_credit_cost: 1
 * })
 * ```
 */
// Step 1: Create a function to get or re-initialize the Supabase client
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    console.log('[supabaseClient] Creating new Supabase client instance...');
    // Step 3: Try a different configuration - keep autoRefreshToken disabled to prevent hanging
    // The issue seems to be that autoRefreshToken tries to refresh the token and hangs
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: false, // Disabled - causes hanging on page refresh
        detectSessionInUrl: false, // Disable URL-based session detection to prevent conflicts
      },
    });
  }
  return supabaseInstance;
}

// Export the client instance
export const supabase = getSupabaseClient();

// Step 1: Export a function to re-initialize the client if needed
export function reinitializeSupabaseClient() {
  console.log('[supabaseClient] Re-initializing Supabase client...');
  supabaseInstance = null;
  return getSupabaseClient();
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Helper type exports for easier imports in other files
 */
export type User = Database['public']['Tables']['users']['Row']
export type Shirt = Database['public']['Tables']['shirts']['Row']
export type Bid = Database['public']['Tables']['bids']['Row']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type ShirtInsert = Database['public']['Tables']['shirts']['Insert']
export type BidInsert = Database['public']['Tables']['bids']['Insert']

export type UserUpdate = Database['public']['Tables']['users']['Update']
export type ShirtUpdate = Database['public']['Tables']['shirts']['Update']
export type BidUpdate = Database['public']['Tables']['bids']['Update']
