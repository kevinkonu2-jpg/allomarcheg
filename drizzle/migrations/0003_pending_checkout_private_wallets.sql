ALTER POLICY "admins read wallets" ON public.admin_wallets USING (admin_id = auth.uid() AND public.has_role(auth.uid(),'admin'));
ALTER POLICY "own withdrawals" ON public.withdrawals USING (admin_id = auth.uid() AND public.has_role(auth.uid(),'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
ALTER TABLE public.orders ADD COLUMN payment_provider text;
ALTER TABLE public.orders ADD COLUMN payment_reference text;
CREATE UNIQUE INDEX orders_payment_reference_unique ON public.orders(payment_provider,payment_reference) WHERE payment_reference IS NOT NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_client_profile_fk FOREIGN KEY (client_id) REFERENCES public.profiles(id) NOT VALID;
ALTER TABLE public.admin_wallets ADD CONSTRAINT wallets_admin_profile_fk FOREIGN KEY (admin_id) REFERENCES public.profiles(id) NOT VALID;
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_wallet_owner_fk FOREIGN KEY (admin_id) REFERENCES public.admin_wallets(admin_id) NOT VALID;
CREATE TABLE public.order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id),
 product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
 shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
 title text NOT NULL,
 unit_price numeric(10,2) NOT NULL,
 quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 999)
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order owner or admin reads lines" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.client_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);
CREATE OR REPLACE FUNCTION public.place_order(_items jsonb,_shipping text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total numeric:=0; oid uuid; it jsonb; p record; qty integer; city text; lines jsonb:='[]'::jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF _items IS NULL OR jsonb_typeof(_items)<>'array' THEN RAISE EXCEPTION 'Panier invalide'; END IF;
 IF jsonb_array_length(_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Panier invalide'; END IF;
 IF _shipping IS NULL OR length(trim(_shipping)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Adresse requise'; END IF;
 oid:=gen_random_uuid();
 FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
  IF coalesce(it->>'quantity','') !~ '^[1-9][0-9]{0,2}$' THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  qty:=(it->>'quantity')::integer;
  SELECT pr.*,s.city AS shop_city INTO p FROM public.products pr JOIN public.shops s ON s.id=pr.shop_id WHERE pr.id=(it->>'product_id')::uuid AND NOT pr.is_amazon_affiliate AND s.shop_status='active' FOR SHARE OF pr,s;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit indisponible'; END IF;
  IF p.price < 0 OR p.price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Prix invalide'; END IF;
  IF city IS NULL THEN city:=p.city_target; END IF;
  IF p.city_target IS NULL OR p.city_target IS DISTINCT FROM city OR p.shop_city IS DISTINCT FROM city THEN RAISE EXCEPTION 'Les articles doivent appartenir à la même ville'; END IF;
  IF right(_shipping,length(city)+2)<>', '||city THEN RAISE EXCEPTION 'Adresse hors de la ville de livraison'; END IF;
  total:=total+p.price*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('product_id',p.id,'shop_id',p.shop_id,'quantity',qty,'title',p.title,'price',p.price));
 END LOOP;
 INSERT INTO public.orders(id,client_id,total_amount,platform_commission,payment_status,shipping_address,items) VALUES(oid,auth.uid(),total,round(total*0.10,2),'pending',_shipping,lines);
 INSERT INTO public.order_items(order_id,product_id,shop_id,title,unit_price,quantity) SELECT oid,(v->>'product_id')::uuid,(v->>'shop_id')::uuid,v->>'title',(v->>'price')::numeric,(v->>'quantity')::integer FROM jsonb_array_elements(lines) v;
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.place_order(jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_stats() RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
 RETURN json_build_object(
 'revenue',(SELECT coalesce(sum(total_amount),0) FROM public.orders WHERE payment_status='paid'),
 'commissions',(SELECT coalesce(sum(platform_commission),0) FROM public.orders WHERE payment_status='paid'),
 'orders',(SELECT count(*) FROM public.orders WHERE payment_status='paid'),
 'pending_withdrawals',(SELECT coalesce(sum(amount),0) FROM public.withdrawals WHERE admin_id=auth.uid() AND status='requested'),
 'vendors',(SELECT count(distinct vendor_id) FROM public.shops WHERE shop_status='active'),
 'affiliates',(SELECT count(*) FROM public.products WHERE is_amazon_affiliate));
END $$;
REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
COMMENT ON COLUMN public.orders.payment_reference IS 'Verified gateway reference; only trusted payment confirmation may settle orders. Checkout never credits wallets.';