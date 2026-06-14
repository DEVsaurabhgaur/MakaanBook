
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
