-- ============================================================
-- Phone number call/text counter triggers + backfill
-- ============================================================

-- 1. Trigger function: increment total_calls_handled on calls INSERT
CREATE OR REPLACE FUNCTION increment_phone_number_calls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.phone_number_id IS NOT NULL THEN
    UPDATE phone_numbers
    SET total_calls_handled = total_calls_handled + 1
    WHERE id = NEW.phone_number_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_phone_calls
  AFTER INSERT ON calls
  FOR EACH ROW
  EXECUTE FUNCTION increment_phone_number_calls();

-- 2. Trigger function: increment total_texts_sent on sms_messages INSERT (outbound only)
CREATE OR REPLACE FUNCTION increment_phone_number_texts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.phone_number_id IS NOT NULL AND NEW.direction = 'outbound' THEN
    UPDATE phone_numbers
    SET total_texts_sent = total_texts_sent + 1
    WHERE id = NEW.phone_number_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_phone_texts
  AFTER INSERT ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_phone_number_texts();

-- 3. Backfill existing counts from historical data
UPDATE phone_numbers pn
SET total_calls_handled = sub.cnt
FROM (
  SELECT phone_number_id, COUNT(*) AS cnt
  FROM calls
  WHERE phone_number_id IS NOT NULL
  GROUP BY phone_number_id
) sub
WHERE pn.id = sub.phone_number_id;

UPDATE phone_numbers pn
SET total_texts_sent = sub.cnt
FROM (
  SELECT phone_number_id, COUNT(*) AS cnt
  FROM sms_messages
  WHERE phone_number_id IS NOT NULL
    AND direction = 'outbound'
  GROUP BY phone_number_id
) sub
WHERE pn.id = sub.phone_number_id;
