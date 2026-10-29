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
  UPDATE public.admin_wallets SET total_earned=total_earned+round(comm*share_percent/share_sum,2),available_balance=available_balance+round(comm*share_percent/share_sum,2) WHERE share_percent>0;
 END IF;
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.place_order(jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text) TO authenticated;