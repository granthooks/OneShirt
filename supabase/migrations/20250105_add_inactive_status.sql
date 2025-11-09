-- Add 'inactive' status to shirts table
-- This allows shirts to be soft-deleted by setting status to 'inactive' instead of actually deleting them

-- Update the CHECK constraint to include 'inactive' status
ALTER TABLE shirts
DROP CONSTRAINT IF EXISTS shirts_status_check;

ALTER TABLE shirts
ADD CONSTRAINT shirts_status_check CHECK (status IN ('active', 'won', 'inactive'));

