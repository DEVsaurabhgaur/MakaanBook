-- Alter electricity_bills to support meter replacement tracking
ALTER TABLE public.electricity_bills
  ADD COLUMN IF NOT EXISTS is_meter_replaced boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS old_meter_final_reading numeric,
  ADD COLUMN IF NOT EXISTS new_meter_start_reading numeric;

-- Update new-user trigger: auto-link tenant profile and roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid;
  v_landlord_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  -- Check if user is a pre-registered tenant (email exists in tenants, and user_id is not set yet)
  SELECT id, landlord_id INTO v_tenant_id, v_landlord_id
  FROM public.tenants
  WHERE email = NEW.email AND user_id IS NULL
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    -- Link tenant to the auth user
    UPDATE public.tenants
    SET user_id = NEW.id
    WHERE id = v_tenant_id;

    -- Assign tenant role
    INSERT INTO public.user_roles (user_id, role, landlord_id)
    VALUES (NEW.id, 'tenant', v_landlord_id)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Assign landlord role (default)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'landlord')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;
