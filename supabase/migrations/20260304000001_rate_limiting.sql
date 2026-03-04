-- Rate limiting for Contact Messages (max 3 messages per IP/Session per hour)
-- Because we don't have IP easily in pure RLS without custom headers, 
-- we can limit by email or IP if we pass it. For now, we limit by identical email within the last hour.

CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS trigger AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.contact_messages
  WHERE email = NEW.email
    AND created_at > (NOW() - INTERVAL '1 hour');

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Please wait before sending another message.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_contact_messages_rl ON public.contact_messages;
CREATE TRIGGER tr_contact_messages_rl
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE PROCEDURE check_rate_limit();

-- Same for bulk requests
CREATE OR REPLACE FUNCTION check_bulk_rate_limit()
RETURNS trigger AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.bulk_requests
  WHERE email = NEW.email
    AND created_at > (NOW() - INTERVAL '1 hour');

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded for bulk requests.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_bulk_requests_rl ON public.bulk_requests;
CREATE TRIGGER tr_bulk_requests_rl
  BEFORE INSERT ON public.bulk_requests
  FOR EACH ROW
  EXECUTE PROCEDURE check_bulk_rate_limit();
