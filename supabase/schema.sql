-- =====================================================================
-- Vitrina de golosinas · esquema Supabase
-- Pega TODO este archivo en Supabase > SQL Editor > Run. Es seguro volver a ejecutarlo.
-- =====================================================================

-- ---------- Tablas ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Mi dulcería',
  whatsapp_number text not null default '',          -- con código de país, ej: 56912345678
  iva_pct numeric(5,2) not null default 19,
  default_margin_pct numeric(6,2) not null default 40,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  category text not null default 'Otros',
  image_url text,
  price integer not null default 0 check (price >= 0),  -- precio final al público (CLP, con IVA)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Módulo de compras: costos y márgenes. NUNCA se exponen al público.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier text,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),   -- tal como lo ingresaste
  cost_includes_iva boolean not null default false,
  iva_pct numeric(5,2) not null default 19,
  margin_pct numeric(6,2) not null,
  net_cost numeric(12,2) not null,                           -- costo unitario neto (sin IVA)
  suggested_price integer not null,                          -- precio final calculado
  purchased_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists purchases_product_idx on public.purchases(product_id, purchased_at desc);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  customer_name text check (char_length(customer_name) <= 80),
  note text check (char_length(note) <= 300),
  items jsonb not null,
  total integer not null check (total >= 0),
  created_at timestamptz not null default now()
);

-- ---------- Seguridad (RLS) ----------
alter table public.settings  enable row level security;
alter table public.products  enable row level security;
alter table public.purchases enable row level security;
alter table public.orders    enable row level security;

-- Limpia políticas previas para poder re-ejecutar
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('settings','products','purchases','orders') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Público: puede leer ajustes y productos activos. Nada más.
create policy "settings: lectura publica" on public.settings
  for select to anon, authenticated using (true);
create policy "products: lectura publica activos" on public.products
  for select to anon, authenticated using (active = true);

-- Público: puede crear pedidos (no leerlos).
create policy "orders: el publico crea pedidos" on public.orders
  for insert to anon, authenticated
  with check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50);

-- Administrador (usuario autenticado): todo.
-- IMPORTANTE: desactiva "Allow new users to sign up" en Authentication > Sign In / Providers
-- y crea tu usuario a mano, así solo tú eres "authenticated".
create policy "settings: admin" on public.settings
  for all to authenticated using (true) with check (true);
create policy "products: admin" on public.products
  for all to authenticated using (true) with check (true);
create policy "purchases: admin" on public.purchases
  for all to authenticated using (true) with check (true);
create policy "orders: admin lee y gestiona" on public.orders
  for select to authenticated using (true);
create policy "orders: admin actualiza" on public.orders
  for update to authenticated using (true) with check (true);
create policy "orders: admin borra" on public.orders
  for delete to authenticated using (true);

-- ---------- Imágenes de productos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 1048576, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 1048576,
  allowed_mime_types = array['image/webp','image/jpeg','image/png'];

drop policy if exists "imagenes: admin sube" on storage.objects;
drop policy if exists "imagenes: admin actualiza" on storage.objects;
drop policy if exists "imagenes: admin borra" on storage.objects;
create policy "imagenes: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');
create policy "imagenes: admin actualiza" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');
create policy "imagenes: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');
