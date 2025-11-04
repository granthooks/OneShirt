-- Add is_admin field to users table for admin role support
-- Created: 2025-01-04
-- Purpose: Enable admin role checking for Admin Dashboard access

-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster admin user queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Add comment
COMMENT ON COLUMN users.is_admin IS 'Flag indicating if user has admin privileges';
