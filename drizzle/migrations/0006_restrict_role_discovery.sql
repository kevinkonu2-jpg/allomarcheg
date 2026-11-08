CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
 SELECT (auth.uid() = _user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') OR auth.role()='service_role')
 AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
COMMENT ON FUNCTION public.has_role(uuid,public.app_role) IS 'Only self, an authenticated admin, or a trusted service may inspect roles. Navigation is not authorization.';