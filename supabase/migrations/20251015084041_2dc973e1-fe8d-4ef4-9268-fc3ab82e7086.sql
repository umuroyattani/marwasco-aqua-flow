-- Add litres and location columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN litres integer NOT NULL DEFAULT 1000,
ADD COLUMN location text NOT NULL DEFAULT '';

-- Update the bookings table comment
COMMENT ON COLUMN public.bookings.litres IS 'Number of litres ordered (used to calculate amount at KSH 2 per litre)';
COMMENT ON COLUMN public.bookings.location IS 'Delivery location specified by customer';

-- Add delivered status to bookings (will be set by admin after delivery)
-- Status flow: pending -> confirmed (after payment) -> delivered (after admin confirms)
ALTER TABLE public.bookings 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add check constraint to ensure litres is positive
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_litres_positive CHECK (litres > 0);

-- Add constraint to prevent double bookings at same time slot
-- This is enforced at application level, but we add a unique index for confirmed bookings
CREATE UNIQUE INDEX bookings_confirmed_time_slot_idx 
ON public.bookings (booking_date, time_slot) 
WHERE status IN ('confirmed', 'delivered');