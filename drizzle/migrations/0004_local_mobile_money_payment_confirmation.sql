ALTER TABLE public.orders ADD CONSTRAINT orders_payment_provider_check CHECK (payment_provider IN ('tmoney','wave','mtn_momo','airtel_money','moncash'));
CREATE OR REPLACE FUNCTION public.pay_order(_order_id uuid, _payment_method text, _reference text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; share_sum numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF _payment_method IS NULL OR _payment_method NOT IN ('tmoney','wave','mtn_momo','airtel_money','moncash') THEN RAISE EXCEPTION 'Moyen de paiement invalide'; END IF;
 IF _reference IS NULL OR length(trim(_reference)) NOT BETWEEN 6 AND 120 THEN RAISE EXCEPTION 'Référence de paiement invalide'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=_order_id AND client_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
 IF o.payment_status<>'pending' THEN RAISE EXCEPTION 'Commande déjà réglée'; END IF;
 UPDATE public.orders SET payment_status='paid', payment_provider=_payment_method, payment_reference=trim(_reference) WHERE id=o.id;
 SELECT coalesce(sum(share_percent),0) INTO share_sum FROM public.admin_wallets WHERE share_percent>0;
 IF share_sum>0 THEN
  UPDATE public.admin_wallets SET total_earned=total_earned+round(o.platform_commission*share_percent/share_sum,2), available_balance=available_balance+round(o.platform_commission*share_percent/share_sum,2) WHERE share_percent>0;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.pay_order(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pay_order(uuid,text,text) TO authenticated;
COMMENT ON FUNCTION public.pay_order(uuid,text,text) IS 'Settles a pending order after a verified mobile money payment; only then are admin wallets credited.';