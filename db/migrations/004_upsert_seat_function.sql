-- db/migrations/004_upsert_seat_function.sql

-- This function handles the logic for a student selecting a seat in a session.
-- It prevents race conditions by checking for seat availability and performing
-- the upsert within a single transaction.
CREATE OR REPLACE FUNCTION public.upsert_session_seat(
    p_session_id BIGINT,
    p_account_id BIGINT,
    p_seat_row INT,
    p_seat_col INT
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    is_taken BOOLEAN;
BEGIN
    -- 1. Lock the table and check if the seat is already taken in this session
    -- We use FOR UPDATE to lock the rows that match, preventing other transactions
    -- from modifying them until this transaction commits.
    SELECT EXISTS (
        SELECT 1
        FROM public.session_seats
        WHERE session_id = p_session_id
          AND seat_row = p_seat_row
          AND seat_col = p_seat_col
          AND account_id != p_account_id -- Exclude the current user's own seat
        FOR UPDATE
    ) INTO is_taken;

    -- 2. If the seat is taken by another student, raise an exception
    IF is_taken THEN
        RAISE EXCEPTION 'Seat is already taken';
    END IF;

    -- 3. Upsert the student's seat selection
    INSERT INTO public.session_seats (session_id, account_id, seat_row, seat_col)
    VALUES (p_session_id, p_account_id, p_seat_row, p_seat_col)
    ON CONFLICT (session_id, account_id)
    DO UPDATE SET
        seat_row = EXCLUDED.seat_row,
        seat_col = EXCLUDED.seat_col,
        created_at = timezone('utc'::text, now());

END;
$$;

-- Add comments for clarity
COMMENT ON FUNCTION public.upsert_session_seat(BIGINT, BIGINT, INT, INT)
IS 'Atomically upserts a student''s seat in a session, preventing race conditions. Checks if a seat is taken before assigning it.';
