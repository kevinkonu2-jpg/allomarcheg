create type public.app_role as enum ('client','vendor','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  city text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid()=id or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid()=id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid,
  shop_name text not null,
  city text not null,
  description text,
  image_url text,
  shop_status text not null default 'active',
  created_at timestamptz not null default now()
);
grant select on public.shops to anon;
grant select, insert, update, delete on public.shops to authenticated;
grant all on public.shops to service_role;
alter table public.shops enable row level security;
create policy "public shops read" on public.shops for select to anon, authenticated using (shop_status='active' or vendor_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "vendor manage shop" on public.shops for all to authenticated using (vendor_id=auth.uid() or public.has_role(auth.uid(),'admin')) with check (vendor_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  category text not null default 'General',
  image_url text,
  is_amazon_affiliate boolean not null default false,
  affiliate_link text,
  city_target text,
  created_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public products read" on public.products for select to anon, authenticated using (true);
create policy "manage products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin') or exists(select 1 from public.shops s where s.id=shop_id and s.vendor_id=auth.uid()))
  with check (public.has_role(auth.uid(),'admin') or exists(select 1 from public.shops s where s.id=shop_id and s.vendor_id=auth.uid()));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  total_amount numeric(10,2) not null,
  platform_commission numeric(10,2) not null default 0,
  payment_status text not null default 'pending',
  shipping_address text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (client_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.admin_wallets (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null unique,
  share_percent numeric(5,2) not null default 0,
  total_earned numeric(12,2) not null default 0,
  available_balance numeric(12,2) not null default 0,
  withdrawn_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.admin_wallets to authenticated;
grant all on public.admin_wallets to service_role;
alter table public.admin_wallets enable row level security;
create policy "admins read wallets" on public.admin_wallets for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  amount numeric(12,2) not null,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);
grant select on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "own withdrawals" on public.withdrawals for select to authenticated using (admin_id=auth.uid());

-- signup: profile + role (first user becomes admin with wallet)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare is_first boolean;
begin
  insert into public.profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  select not exists(select 1 from public.user_roles where role='admin') into is_first;
  insert into public.user_roles(user_id, role) values (new.id, 'client');
  if is_first then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
    insert into public.admin_wallets(admin_id, share_percent) values (new.id, 100);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- place order: commission 10%, paid immediately (simulated), split among admin wallets by share
create or replace function public.place_order(_items jsonb, _shipping text)
returns uuid language plpgsql security definer set search_path = public as $$
declare total numeric := 0; comm numeric; oid uuid; it jsonb; p record; share_sum numeric;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    select price into p from public.products where id = (it->>'product_id')::uuid and is_amazon_affiliate=false;
    if not found then raise exception 'Invalid product'; end if;
    total := total + p.price * greatest(1, (it->>'quantity')::int);
  end loop;
  comm := round(total * 0.10, 2);
  insert into public.orders(client_id,total_amount,platform_commission,payment_status,shipping_address,items)
  values (auth.uid(), total, comm, 'paid', _shipping, _items) returning id into oid;
  select coalesce(sum(share_percent),0) into share_sum from public.admin_wallets;
  if share_sum > 0 then
    update public.admin_wallets set
      total_earned = total_earned + round(comm*share_percent/share_sum,2),
      available_balance = available_balance + round(comm*share_percent/share_sum,2);
  end if;
  return oid;
end $$;
grant execute on function public.place_order(jsonb,text) to authenticated;

create or replace function public.request_withdrawal(_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if _amount <= 0 then raise exception 'Invalid amount'; end if;
  update public.admin_wallets set available_balance = available_balance - _amount, withdrawn_amount = withdrawn_amount + _amount
   where admin_id = auth.uid() and available_balance >= _amount;
  if not found then raise exception 'Insufficient balance'; end if;
  insert into public.withdrawals(admin_id, amount) values (auth.uid(), _amount);
end $$;
grant execute on function public.request_withdrawal(numeric) to authenticated;

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  return json_build_object(
    'revenue', (select coalesce(sum(total_amount),0) from orders where payment_status='paid'),
    'orders', (select count(*) from orders),
    'vendors', (select count(distinct coalesce(vendor_id::text, id::text)) from shops where shop_status='active'),
    'affiliates', (select count(*) from products where is_amazon_affiliate)
  );
end $$;
grant execute on function public.admin_stats() to authenticated;

-- seed
insert into public.shops(id, shop_name, city, description) values
 ('11111111-0000-0000-0000-000000000001','Boulangerie Lumière','Paris','Artisan breads and pastries baked at dawn.'),
 ('11111111-0000-0000-0000-000000000002','Marais Fleurs','Paris','Seasonal bouquets delivered across Paris.'),
 ('11111111-0000-0000-0000-000000000003','Harbor Roasters','Boston','Small-batch coffee roasted in the Seaport.'),
 ('11111111-0000-0000-0000-000000000004','Beacon Hill Goods','Boston','Handmade home goods from New England makers.'),
 ('11111111-0000-0000-0000-000000000005','Marché Akodessewa','Lomé','Wax fabrics and tailored pieces from Lomé.'),
 ('11111111-0000-0000-0000-000000000006','Saveurs du Togo','Lomé','Spices, gari and local delicacies.');

insert into public.products(shop_id,title,description,price,category,image_url,city_target) values
 ('11111111-0000-0000-0000-000000000001','Sourdough Campagne','Naturally leavened country loaf.',6.50,'Food','https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=800','Paris'),
 ('11111111-0000-0000-0000-000000000001','Croissants (box of 6)','Pure butter, flaky layers.',9.00,'Food','https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800','Paris'),
 ('11111111-0000-0000-0000-000000000002','Peony Bouquet','Fresh seasonal peonies.',42.00,'Home','https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800','Paris'),
 ('11111111-0000-0000-0000-000000000003','Ethiopia Yirgacheffe 340g','Floral, citrus, light roast.',18.00,'Food','https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800','Boston'),
 ('11111111-0000-0000-0000-000000000004','Hand-thrown Mug','Stoneware, glazed in sea blue.',28.00,'Home','https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800','Boston'),
 ('11111111-0000-0000-0000-000000000005','Wax Print Fabric (6 yards)','Vibrant Dutch wax cotton.',35.00,'Fashion','https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800','Lomé'),
 ('11111111-0000-0000-0000-000000000006','Spice Box Togolais','Selection of six local spices.',14.00,'Food','https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800','Lomé');

insert into public.products(title,description,price,category,image_url,is_amazon_affiliate,affiliate_link) values
 ('Wireless Noise-Cancelling Headphones','Top-rated over-ear headphones.',249.00,'Electronics','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',true,'https://www.amazon.com/s?k=noise+cancelling+headphones'),
 ('Smart Watch Series','Fitness tracking and notifications.',199.00,'Electronics','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',true,'https://www.amazon.com/s?k=smart+watch'),
 ('Leather Backpack','Full-grain travel backpack.',89.00,'Fashion','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',true,'https://www.amazon.com/s?k=leather+backpack'),
 ('Pour-Over Coffee Set','Glass dripper and carafe.',39.00,'Home','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',true,'https://www.amazon.com/s?k=pour+over+coffee+set');