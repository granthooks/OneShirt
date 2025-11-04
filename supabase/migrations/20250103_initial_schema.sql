-- OneShirt Initial Schema Migration
-- This migration sets up the complete database schema for the OneShirt bidding platform
-- Created: 2025-01-03

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
-- Stores user information and credit balances
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    avatar_url TEXT,
    credit_balance INTEGER NOT NULL DEFAULT 100 CHECK (credit_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shirts table
-- Stores shirt designs and their bidding status
CREATE TABLE IF NOT EXISTS shirts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    current_bid_count INTEGER NOT NULL DEFAULT 0 CHECK (current_bid_count >= 0),
    bid_threshold INTEGER NOT NULL DEFAULT 250 CHECK (bid_threshold > 0),
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bids table
-- Stores all bid transactions
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shirt_id UUID NOT NULL REFERENCES shirts(id) ON DELETE CASCADE,
    credit_cost INTEGER NOT NULL DEFAULT 1 CHECK (credit_cost > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for filtering active/won shirts
CREATE INDEX IF NOT EXISTS idx_shirts_status ON shirts(status);

-- Index for querying bids by shirt
CREATE INDEX IF NOT EXISTS idx_bids_shirt_id ON bids(shirt_id);

-- Index for querying bids by user
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);

-- Index for ordering bids by time
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for shirts table
CREATE TRIGGER update_shirts_updated_at
    BEFORE UPDATE ON shirts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Function to place a bid atomically
-- This function handles the entire bid transaction:
-- 1. Validates user has enough credits
-- 2. Deducts credits from user
-- 3. Creates bid record
-- 4. Increments shirt bid count
-- 5. Checks if threshold reached and marks shirt as won
CREATE OR REPLACE FUNCTION place_bid(
    p_user_id UUID,
    p_shirt_id UUID,
    p_credit_cost INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    v_user_credits INTEGER;
    v_shirt_status TEXT;
    v_current_bid_count INTEGER;
    v_bid_threshold INTEGER;
    v_bid_id UUID;
    v_new_bid_count INTEGER;
    v_result JSON;
BEGIN
    -- Lock the user row to prevent concurrent credit modifications
    SELECT credit_balance INTO v_user_credits
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    -- Check if user exists
    IF v_user_credits IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Check if user has enough credits
    IF v_user_credits < p_credit_cost THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_credit_cost,
            'available', v_user_credits
        );
    END IF;

    -- Lock the shirt row to prevent concurrent bid modifications
    SELECT status, current_bid_count, bid_threshold
    INTO v_shirt_status, v_current_bid_count, v_bid_threshold
    FROM shirts
    WHERE id = p_shirt_id
    FOR UPDATE;

    -- Check if shirt exists
    IF v_shirt_status IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Shirt not found'
        );
    END IF;

    -- Check if shirt is still active
    IF v_shirt_status != 'active' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Shirt is no longer active for bidding'
        );
    END IF;

    -- Deduct credits from user
    UPDATE users
    SET credit_balance = credit_balance - p_credit_cost
    WHERE id = p_user_id;

    -- Create bid record
    INSERT INTO bids (user_id, shirt_id, credit_cost)
    VALUES (p_user_id, p_shirt_id, p_credit_cost)
    RETURNING id INTO v_bid_id;

    -- Increment shirt bid count
    v_new_bid_count := v_current_bid_count + 1;

    UPDATE shirts
    SET current_bid_count = v_new_bid_count
    WHERE id = p_shirt_id;

    -- Check if threshold reached and mark as won
    IF v_new_bid_count >= v_bid_threshold THEN
        UPDATE shirts
        SET status = 'won',
            winner_id = p_user_id
        WHERE id = p_shirt_id;

        v_result := json_build_object(
            'success', true,
            'bid_id', v_bid_id,
            'new_bid_count', v_new_bid_count,
            'threshold_reached', true,
            'winner', true
        );
    ELSE
        v_result := json_build_object(
            'success', true,
            'bid_id', v_bid_id,
            'new_bid_count', v_new_bid_count,
            'threshold_reached', false,
            'winner', false
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
--
-- IMPORTANT: These policies are currently PERMISSIVE for development purposes.
-- They allow anonymous access to enable testing without authentication.
-- In production, these should be tightened to require proper authentication
-- and authorization checks using auth.uid() and user roles.
--
-- TODO: Before production deployment:
-- - Require authentication for user creation and updates
-- - Require auth.uid() = user_id for bid insertion
-- - Add proper authorization checks for sensitive operations
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shirts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Allow public read access to user profiles
CREATE POLICY "Users are viewable by everyone"
    ON users FOR SELECT
    USING (true);

-- Allow users to update their profile
-- NOTE: Currently permissive for development - will add auth.uid() check in production
CREATE POLICY "Users can be updated"
    ON users FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow anyone to create a user profile
-- NOTE: Currently permissive for development - will require auth.uid() = id in production
CREATE POLICY "Anyone can create a user profile"
    ON users FOR INSERT
    WITH CHECK (true);

-- Shirts table policies
-- Allow public read access to all shirts
CREATE POLICY "Shirts are viewable by everyone"
    ON shirts FOR SELECT
    USING (true);

-- Only allow system/admin to insert shirts (via service role)
-- Regular users cannot insert shirts
CREATE POLICY "Only service role can insert shirts"
    ON shirts FOR INSERT
    WITH CHECK (false); -- Will be overridden by service role key

-- Only allow system/admin to update shirts (via service role)
CREATE POLICY "Only service role can update shirts"
    ON shirts FOR UPDATE
    USING (false); -- Will be overridden by service role key

-- Bids table policies
-- Allow users to view all bids (for leaderboard/activity feed)
CREATE POLICY "Bids are viewable by everyone"
    ON bids FOR SELECT
    USING (true);

-- Allow anyone to insert bids
-- NOTE: Currently permissive for development - will require auth.uid() = user_id in production
CREATE POLICY "Anyone can insert bids"
    ON bids FOR INSERT
    WITH CHECK (true);

-- Users cannot update or delete bids (immutable)
-- No UPDATE or DELETE policies = no one can modify bids

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get shirt statistics
CREATE OR REPLACE FUNCTION get_shirt_stats(p_shirt_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'shirt_id', s.id,
        'name', s.name,
        'current_bid_count', s.current_bid_count,
        'bid_threshold', s.bid_threshold,
        'status', s.status,
        'total_bids', COUNT(b.id),
        'unique_bidders', COUNT(DISTINCT b.user_id),
        'total_credits_spent', COALESCE(SUM(b.credit_cost), 0)
    ) INTO v_result
    FROM shirts s
    LEFT JOIN bids b ON b.shirt_id = s.id
    WHERE s.id = p_shirt_id
    GROUP BY s.id, s.name, s.current_bid_count, s.bid_threshold, s.status;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'user_id', u.id,
        'name', u.name,
        'credit_balance', u.credit_balance,
        'total_bids', COUNT(b.id),
        'total_credits_spent', COALESCE(SUM(b.credit_cost), 0),
        'shirts_won', (
            SELECT COUNT(*)
            FROM shirts
            WHERE winner_id = u.id
        )
    ) INTO v_result
    FROM users u
    LEFT JOIN bids b ON b.user_id = u.id
    WHERE u.id = p_user_id
    GROUP BY u.id, u.name, u.credit_balance;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Stores user profiles and credit balances';
COMMENT ON TABLE shirts IS 'Stores shirt designs and their bidding status';
COMMENT ON TABLE bids IS 'Immutable log of all bid transactions';

COMMENT ON FUNCTION place_bid IS 'Atomically processes a bid transaction with all validations and updates';
COMMENT ON FUNCTION get_shirt_stats IS 'Returns comprehensive statistics for a shirt';
COMMENT ON FUNCTION get_user_stats IS 'Returns comprehensive statistics for a user';
