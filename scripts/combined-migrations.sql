
-- Enums
CREATE TYPE public.app_role AS ENUM ('landlord', 'tenant');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'partial');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'online', 'upi', 'bank_transfer');
CREATE TYPE public.notification_type AS ENUM ('rent_due', 'rent_overdue', 'bill_due', 'payment_received', 'general');
CREATE TYPE public.chat_role AS ENUM ('user', 'assistant');

-- Updated-at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  profile_pic_url text,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES (no recursive RLS)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  landlord_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- New-user trigger: profile + default landlord role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  -- If signup metadata explicitly says tenant, skip auto-landlord role (landlord will create tenant role manually via admin)
  IF COALESCE(NEW.raw_user_meta_data->>'role','landlord') = 'landlord' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'landlord')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- HOUSES
CREATE TABLE public.houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_name text NOT NULL,
  address text,
  city text,
  default_unit_rate numeric DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.houses TO authenticated;
GRANT ALL ON public.houses TO service_role;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landlord manages own houses" ON public.houses FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE TRIGGER trg_houses_updated BEFORE UPDATE ON public.houses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROOMS
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  floor text,
  monthly_rent numeric NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 5,
  security_deposit numeric DEFAULT 0,
  is_occupied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landlord manages own rooms" ON public.rooms FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TENANTS
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  alternate_phone text,
  email text,
  profile_pic_url text,
  aadhar_number text,
  id_proof_url text,
  move_in_date date NOT NULL DEFAULT CURRENT_DATE,
  move_out_date date,
  is_active boolean NOT NULL DEFAULT true,
  monthly_rent numeric NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landlord manages tenants" ON public.tenants FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "tenant reads self" ON public.tenants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RENT RECORDS
CREATE TABLE public.rent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  rent_amount numeric NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount_paid numeric NOT NULL DEFAULT 0,
  pending_amount numeric NOT NULL DEFAULT 0,
  mode_of_payment public.payment_mode,
  transaction_id text,
  cash_proof_urls text[],
  cash_serial_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_records TO authenticated;
GRANT ALL ON public.rent_records TO service_role;
ALTER TABLE public.rent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landlord manages rent" ON public.rent_records FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "tenant reads own rent" ON public.rent_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.user_id = auth.uid()));
CREATE TRIGGER trg_rent_updated BEFORE UPDATE ON public.rent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ELECTRICITY BILLS
CREATE TABLE public.electricity_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  previous_reading numeric NOT NULL DEFAULT 0,
  current_reading numeric NOT NULL DEFAULT 0,
  billed_units numeric NOT NULL DEFAULT 0,
  per_unit_rate numeric NOT NULL DEFAULT 0,
  bill_amount numeric NOT NULL DEFAULT 0,
  fixed_charge numeric NOT NULL DEFAULT 0,
  total_bill numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_date date,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount_paid numeric NOT NULL DEFAULT 0,
  mode_of_payment public.payment_mode,
  transaction_id text,
  cash_proof_urls text[],
  cash_serial_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.electricity_bills TO authenticated;
GRANT ALL ON public.electricity_bills TO service_role;
ALTER TABLE public.electricity_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landlord manages bills" ON public.electricity_bills FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "tenant reads own bills" ON public.electricity_bills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.user_id = auth.uid()));
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON public.electricity_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  related_record_id uuid,
  related_record_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI CHAT HISTORY
CREATE TABLE public.ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.chat_role NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_history TO authenticated;
GRANT ALL ON public.ai_chat_history TO service_role;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat" ON public.ai_chat_history FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);

-- Storage policies
-- profile-pics: public read, owner write
CREATE POLICY "profile pics public read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'profile-pics');
CREATE POLICY "profile pics auth write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pics' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "profile pics auth update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-pics' AND (storage.foldername(name))[1] = auth.uid()::text);

-- id-proofs & payment-proofs: owner-scoped
CREATE POLICY "id proofs owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "id proofs owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pay proofs owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "pay proofs owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE POLICY "profile pics owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-pics' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "profile pics owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pics' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 1. Remove public read on profile-pics
DROP POLICY IF EXISTS "profile pics public read" ON storage.objects;

-- 2. Landlord can read id-proofs for their managed tenants
CREATE POLICY "id proofs landlord read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'id-proofs'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.landlord_id = auth.uid()
        AND (storage.foldername(name))[1] = t.id::text
    )
  );

-- 3. Landlord can write/update id-proofs for their managed tenants
CREATE POLICY "id proofs landlord write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'id-proofs'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.landlord_id = auth.uid()
        AND (storage.foldername(name))[1] = t.id::text
    )
  );

-- 4. UPDATE policies for id-proofs and payment-proofs (owner)
CREATE POLICY "id proofs owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "id proofs landlord update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'id-proofs'
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.landlord_id = auth.uid() AND (storage.foldername(name))[1] = t.id::text)
  )
  WITH CHECK (
    bucket_id = 'id-proofs'
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.landlord_id = auth.uid() AND (storage.foldername(name))[1] = t.id::text)
  );

CREATE POLICY "pay proofs owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. DELETE policies for all three buckets (owner-scoped)
CREATE POLICY "id proofs owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "id proofs landlord delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'id-proofs'
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.landlord_id = auth.uid() AND (storage.foldername(name))[1] = t.id::text)
  );

CREATE POLICY "pay proofs owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile pics owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-pics' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Explicitly deny user_roles writes from the API (service_role bypasses RLS)
CREATE POLICY "user_roles no client insert" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "user_roles no client update" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "user_roles no client delete" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);
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
