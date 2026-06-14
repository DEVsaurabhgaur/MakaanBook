
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE POLICY "profile pics owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-pics' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "profile pics owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pics' AND (storage.foldername(name))[1] = auth.uid()::text);
