ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_details jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_account_phone text;
ALTER TABLE public.orders DROP CONSTRAINT orders_payment_provider_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_provider_check CHECK (payment_provider IN ('tmoney','flooz','wave','mtn_momo','airtel_money','moncash'));
UPDATE public.orders SET is_simulated=true WHERE payment_reference LIKE 'DEMO-%';
REVOKE EXECUTE ON FUNCTION public.pay_order(uuid,text,text) FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION public.pay_order(uuid,text,text) IS 'Reserved for trusted verified gateway settlement. Never callable from browser simulation.';
CREATE OR REPLACE FUNCTION public.submit_delivery_order(_items jsonb,_catalog_city text,_delivery jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE oid uuid; dc text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 dc:=_delivery->>'city';
 IF _catalog_city IS NULL OR _catalog_city NOT IN ('Paris','Boston','Lomé') OR dc IS NULL OR NOT (dc=_catalog_city OR (_catalog_city='Lomé' AND dc IN ('Lomé','Tsévié','Aného','Kpalimé','Atakpamé','Sokodé','Kara','Dapaong'))) THEN RAISE EXCEPTION 'Ville non desservie'; END IF;
 IF coalesce(length(trim(_delivery->>'fullName')),0) NOT BETWEEN 3 AND 120 OR coalesce(length(trim(_delivery->>'address')),0) NOT BETWEEN 5 AND 500 OR coalesce(_delivery->>'phone','') !~ '^\+?[0-9]{8,15}$' THEN RAISE EXCEPTION 'Coordonnées invalides'; END IF;
 oid:=public.place_order(_items,trim(_delivery->>'fullName')||' · '||trim(_delivery->>'address')||' · '||dc||' · '||(_delivery->>'phone')||', '||_catalog_city);
 UPDATE public.orders SET delivery_details=_delivery WHERE id=oid;
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.submit_delivery_order(jsonb,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_delivery_order(jsonb,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.simulate_order_payment(_order_id uuid,_method text,_phone text,_confirmed boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o record;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF _confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirmation requise'; END IF;
 IF _method IS NULL OR _method NOT IN ('tmoney','flooz','wave','mtn_momo','airtel_money','moncash') OR coalesce(_phone,'') !~ '^\+?[0-9]{8,15}$' THEN RAISE EXCEPTION 'Compte invalide'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=_order_id AND client_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
 IF o.payment_status='paid' AND o.is_simulated AND o.payment_provider=_method AND o.payment_account_phone=_phone THEN RETURN; END IF;
 IF o.payment_status<>'pending' THEN RAISE EXCEPTION 'Commande déjà réglée'; END IF;
 UPDATE public.orders SET payment_status='paid',is_simulated=true,payment_provider=_method,payment_account_phone=_phone,payment_reference='SIM-'||gen_random_uuid()::text WHERE id=o.id;
END $$;
REVOKE ALL ON FUNCTION public.simulate_order_payment(uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.simulate_order_payment(uuid,text,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_stats() RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE share_sum numeric; mine numeric;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
 SELECT coalesce(sum(share_percent),0) INTO share_sum FROM public.admin_wallets WHERE share_percent>0;
 SELECT coalesce(share_percent,0) INTO mine FROM public.admin_wallets WHERE admin_id=auth.uid();
 RETURN json_build_object('revenue',(SELECT coalesce(sum(total_amount),0) FROM orders WHERE payment_status='paid' AND NOT is_simulated),'commissions',(SELECT coalesce(sum(platform_commission),0) FROM orders WHERE payment_status='paid' AND NOT is_simulated),'orders',(SELECT count(*) FROM orders WHERE payment_status='paid' AND NOT is_simulated),'pending_withdrawals',(SELECT coalesce(sum(amount),0) FROM withdrawals WHERE admin_id=auth.uid() AND status='requested'),'simulation_revenue',(SELECT coalesce(sum(total_amount),0) FROM orders WHERE payment_status='paid' AND is_simulated),'simulation_orders',(SELECT count(*) FROM orders WHERE payment_status='paid' AND is_simulated),'simulation_earned',(SELECT coalesce(sum(round(platform_commission*coalesce(mine,0)/nullif(share_sum,0),2)),0) FROM orders WHERE payment_status='paid' AND is_simulated));
END $$;