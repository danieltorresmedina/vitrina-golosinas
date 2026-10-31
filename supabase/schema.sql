-- =====================================================================
-- Vitrina de golosinas · esquema Supabase (tablas y columnas en español)
-- Para una base NUEVA: pega TODO este archivo en Supabase > SQL Editor > Run.
-- Es seguro volver a ejecutarlo.
--
-- Si tu base ya tiene las tablas en inglés (products, orders...), NO uses este
-- archivo: ejecuta supabase/migracion.sql, que renombra sin perder datos.
-- =====================================================================

-- Protección: evita crear tablas vacías en paralelo a las antiguas en inglés.
do $$
begin
  if to_regclass('public.products') is not null and to_regclass('public.productos') is null then
    raise exception 'Tu base todavía usa nombres en inglés. Ejecuta supabase/migracion.sql en vez de este archivo.';
  end if;
end $$;

-- ---------- Tablas ----------
create table if not exists public.ajustes (
  id int primary key default 1 check (id = 1),              -- una sola fila
  nombre_tienda text not null default 'Mi dulcería',
  whatsapp text not null default '',                        -- con código de país, ej: 56912345678
  iva_pct numeric(5,2) not null default 19,
  margen_sugerido_pct numeric(6,2) not null default 40,
  actualizado_en timestamptz not null default now()
);
insert into public.ajustes (id) values (1) on conflict (id) do nothing;

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  descripcion text check (char_length(descripcion) <= 300),
  categoria text not null default 'Otros',
  imagen_url text,
  precio integer not null default 0 check (precio >= 0),    -- precio final al público (CLP, con IVA)
  activo boolean not null default true,                     -- false = oculto en la vitrina
  creado_en timestamptz not null default now()
);

-- Módulo de compras: costos y márgenes. NUNCA se exponen al público.
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  proveedor text,
  cantidad integer not null check (cantidad > 0),
  costo_unitario numeric(12,2) not null check (costo_unitario >= 0),  -- tal como lo ingresaste
  costo_incluye_iva boolean not null default false,
  iva_pct numeric(5,2) not null default 19,
  margen_pct numeric(6,2) not null,
  costo_neto numeric(12,2) not null,                        -- costo unitario neto (sin IVA)
  precio_sugerido integer not null,                         -- precio final calculado
  fecha_compra date not null default current_date,
  creado_en timestamptz not null default now()
);
create index if not exists compras_producto_idx on public.compras(producto_id, fecha_compra desc);

-- En `articulos` se guarda una lista JSON: [{ "id", "nombre", "precio", "cantidad" }, ...]
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  cliente text check (char_length(cliente) <= 80),
  nota text check (char_length(nota) <= 300),
  articulos jsonb not null,
  total integer not null check (total >= 0),
  creado_en timestamptz not null default now()
);

-- ---------- Seguridad (RLS) ----------
alter table public.ajustes   enable row level security;
alter table public.productos enable row level security;
alter table public.compras   enable row level security;
alter table public.pedidos   enable row level security;

-- Limpia políticas previas para poder re-ejecutar
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('ajustes','productos','compras','pedidos') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Público: puede leer ajustes y productos activos. Nada más.
create policy "ajustes: lectura publica" on public.ajustes
  for select to anon, authenticated using (true);
create policy "productos: lectura publica activos" on public.productos
  for select to anon, authenticated using (activo = true);

-- Público: puede crear pedidos (no leerlos).
create policy "pedidos: el publico crea pedidos" on public.pedidos
  for insert to anon, authenticated
  with check (jsonb_typeof(articulos) = 'array' and jsonb_array_length(articulos) between 1 and 50);

-- Administrador (usuario autenticado): todo.
-- IMPORTANTE: desactiva "Allow new users to sign up" en Authentication > Sign In / Providers
-- y crea tu usuario a mano, así solo tú eres "authenticated".
create policy "ajustes: admin" on public.ajustes
  for all to authenticated using (true) with check (true);
create policy "productos: admin" on public.productos
  for all to authenticated using (true) with check (true);
create policy "compras: admin" on public.compras
  for all to authenticated using (true) with check (true);
create policy "pedidos: admin lee" on public.pedidos
  for select to authenticated using (true);
create policy "pedidos: admin actualiza" on public.pedidos
  for update to authenticated using (true) with check (true);
create policy "pedidos: admin borra" on public.pedidos
  for delete to authenticated using (true);

-- ---------- Imágenes de productos ----------
-- El bucket conserva el nombre 'product-images': es un identificador interno del almacenamiento
-- y las direcciones de las fotos ya subidas lo incluyen. Renombrarlo las dejaría rotas.
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
