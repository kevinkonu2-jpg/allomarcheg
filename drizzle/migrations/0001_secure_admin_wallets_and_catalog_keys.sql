ALTER TABLE public.products ADD COLUMN IF NOT EXISTS demo_key text;
CREATE UNIQUE INDEX IF NOT EXISTS products_demo_key_unique ON public.products(demo_key) WHERE demo_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id,full_name,email) VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email);
 INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'client');
 RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.grant_admin(_email text, _share numeric DEFAULT 0) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
 IF _share IS NULL OR _share < 0 OR _share > 100 THEN RAISE EXCEPTION 'Part invalide'; END IF;
 PERFORM pg_advisory_xact_lock(873451);
 SELECT id INTO target FROM public.profiles WHERE lower(email)=lower(trim(_email));
 IF target IS NULL THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
 IF public.has_role(target,'admin') THEN RAISE EXCEPTION 'Ce compte est déjà administrateur'; END IF;
 IF (SELECT coalesce(sum(share_percent),0) FROM public.admin_wallets)+_share > 100 THEN RAISE EXCEPTION 'La somme des parts dépasse 100 %%'; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(target,'admin') ON CONFLICT(user_id,role) DO NOTHING;
 INSERT INTO public.admin_wallets(admin_id,share_percent) VALUES(target,_share) ON CONFLICT(admin_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.grant_admin(text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin(text,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
 IF _amount IS NULL OR _amount::text IN ('NaN','Infinity','-Infinity') OR _amount <= 0 OR _amount <> round(_amount,2) THEN RAISE EXCEPTION 'Montant invalide'; END IF;
 UPDATE public.admin_wallets SET available_balance=available_balance-_amount, withdrawn_amount=withdrawn_amount+_amount WHERE admin_id=auth.uid() AND available_balance>=_amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
 INSERT INTO public.withdrawals(admin_id,amount) VALUES(auth.uid(),_amount);
END $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats() RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
 RETURN json_build_object(
 'revenue',(SELECT coalesce(sum(total_amount),0) FROM public.orders WHERE payment_status='paid'),
 'commissions',(SELECT coalesce(sum(platform_commission),0) FROM public.orders WHERE payment_status='paid'),
 'orders',(SELECT count(*) FROM public.orders),
 'vendors',(SELECT count(distinct coalesce(vendor_id::text,id::text)) FROM public.shops WHERE shop_status='active'),
 'affiliates',(SELECT count(*) FROM public.products WHERE is_amazon_affiliate));
END $$;
REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.place_order(_items jsonb,_shipping text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total numeric:=0; comm numeric; oid uuid; it jsonb; p record; qty integer; city text; lines jsonb:='[]'::jsonb; share_sum numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF _items IS NULL OR jsonb_typeof(_items)<>'array' THEN RAISE EXCEPTION 'Panier invalide'; END IF;
 IF jsonb_array_length(_items)=0 THEN RAISE EXCEPTION 'Panier vide'; END IF;
 IF _shipping IS NULL OR length(trim(_shipping))=0 THEN RAISE EXCEPTION 'Adresse requise'; END IF;
 FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
  IF coalesce(it->>'quantity','') !~ '^[1-9][0-9]*$' THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  qty:=(it->>'quantity')::integer;
  SELECT pr.* INTO p FROM public.products pr JOIN public.shops s ON s.id=pr.shop_id WHERE pr.id=(it->>'product_id')::uuid AND NOT pr.is_amazon_affiliate AND s.shop_status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit indisponible'; END IF;
  IF city IS NULL THEN city:=p.city_target; END IF;
  IF p.city_target IS NULL OR p.city_target IS DISTINCT FROM city THEN RAISE EXCEPTION 'Les articles doivent appartenir à la même ville'; END IF;
  IF right(_shipping,length(city)+2)<>', '||city THEN RAISE EXCEPTION 'Adresse hors de la ville de livraison'; END IF;
  total:=total+p.price*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('product_id',p.id,'quantity',qty,'title',p.title,'price',p.price));
 END LOOP;
 comm:=round(total*0.10,2);
 INSERT INTO public.orders(client_id,total_amount,platform_commission,payment_status,shipping_address,items) VALUES(auth.uid(),total,comm,'paid',_shipping,lines) RETURNING id INTO oid;
 SELECT coalesce(sum(share_percent),0) INTO share_sum FROM public.admin_wallets;
 IF share_sum>0 THEN
  UPDATE public.admin_wallets SET total_earned=total_earned+round(comm*share_percent/share_sum,2),available_balance=available_balance+round(comm*share_percent/share_sum,2);
 END IF;
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.place_order(jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text) TO authenticated;