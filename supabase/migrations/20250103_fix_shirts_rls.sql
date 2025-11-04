-- Fix RLS policies for shirts table to allow development
-- This patch makes shirt policies permissive like users/bids

-- Drop restrictive policies
DROP POLICY IF EXISTS "Only service role can insert shirts" ON shirts;
DROP POLICY IF EXISTS "Only service role can update shirts" ON shirts;

-- Create permissive policies for development
CREATE POLICY "Anyone can insert shirts (DEV ONLY)"
    ON shirts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update shirts (DEV ONLY)"
    ON shirts FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- TODO: Tighten these policies for production
