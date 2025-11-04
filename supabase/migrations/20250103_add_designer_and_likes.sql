-- Add designer and like_count columns to shirts table
-- Created: 2025-01-03

-- Add designer column (nullable TEXT)
ALTER TABLE shirts 
ADD COLUMN IF NOT EXISTS designer TEXT;

-- Add like_count column (INTEGER with default 0)
ALTER TABLE shirts 
ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0);

-- Update existing shirts with example designer names and like counts
-- Using a DO block to iterate through shirts and assign values
DO $$
DECLARE
  shirt_record RECORD;
  designers TEXT[] := ARRAY['Alex Chen', 'Sam Rivera', 'Jordan Kim', 'Taylor Swift', 'Morgan Lee', 'Casey Park', 'Drew Martinez', 'Riley Johnson'];
  like_counts INTEGER[] := ARRAY[42, 18, 89, 156, 67, 124, 93, 201];
  designer_index INTEGER;
  like_index INTEGER;
  shirt_counter INTEGER := 0;
BEGIN
  FOR shirt_record IN SELECT id FROM shirts ORDER BY created_at LOOP
    -- Cycle through designers and like counts
    designer_index := (shirt_counter % array_length(designers, 1)) + 1;
    like_index := (shirt_counter % array_length(like_counts, 1)) + 1;
    
    -- Update the shirt with designer and like count
    UPDATE shirts 
    SET 
      designer = designers[designer_index],
      like_count = like_counts[like_index]
    WHERE id = shirt_record.id;
    
    shirt_counter := shirt_counter + 1;
  END LOOP;
END $$;

-- Add index on designer for potential filtering/searching
CREATE INDEX IF NOT EXISTS idx_shirts_designer ON shirts(designer);

-- Add index on like_count for sorting/popularity queries
CREATE INDEX IF NOT EXISTS idx_shirts_like_count ON shirts(like_count DESC);

