-- Add status column to bookings table for cancellation tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

-- Create an index for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Update RLS policies to consider status when checking for conflicts
-- (existing bookings with 'cancelled' status should not block new bookings)