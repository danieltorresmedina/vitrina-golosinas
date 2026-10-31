-- =====================================================================
-- MIGRACIÓN: pasa tablas y columnas de inglés a español SIN perder datos.
-- Pega TODO este archivo en Supabase > SQL Editor > Run (una sola vez).
--
-- Qué hace:
--   1. Renombra las 4 tablas y sus columnas (los datos quedan intactos).
--   2. Convierte los pedidos antiguos: dentro de la lista de artículos,
--      las claves name/price/qty pasan a nombre/precio/cantidad.
--   3. Vuelve a crear las políticas de seguridad con los nombres nuevos.
--
-- Va dentro de una transacción: si algo falla, no se aplica NADA.
-- Es seguro ejecutarlo dos veces (lo que ya está renombrado se omite).
--
-- IMPORTANTE: apenas termine, sube a GitHub el código nuevo (git push).
-- Hasta que Cloudflare publique esa versión, la vitrina publicada mostrará error,
-- porque el código viejo busca las tablas con los nombres en inglés.
-- =====================================================================
begin;

-- ---------- 1. Tablas ----------
do $$
declare t text[];
begin
  foreach t slice 1 in array array[
    ['settings',  'ajustes'],
    ['products',  'productos'],
    ['purchases', 'compras'],
    ['orders',    'pedidos']
  ] loop
    if to_regclass('public.' || t[1]) is not null and to_regclass('public.' || t[2]) is null then
      execute format('alter table public.%I rename to %I', t[1], t[2]);
    end if;
  end loop;
end $$;

-- ---------- 2. Columnas ----------
do $$
declare c text[];
begin
  foreach c slice 1 in array array[
    -- [tabla nueva, columna antigua, columna nueva]
    ['ajustes',   'store_name',         'nombre_tienda'],
    ['ajustes',   'whatsapp_number',    'whatsapp'],
    ['ajustes',   'default_margin_pct', 'margen_sugerido_pct'],
    ['ajustes',   'updated_at',         'actualizado_en'],

    ['productos', 'name',               'nombre'],
    ['productos', 'description',        'descripcion'],
    ['productos', 'category',           'categoria'],
    ['productos', 'image_url',          'imagen_url'],
    ['productos', 'price',              'precio'],
    ['productos', 'active',             'activo'],
    ['productos', 'created_at',         'creado_en'],

    ['compras',   'product_id',         'producto_id'],
    ['compras',   'supplier',           'proveedor'],
    ['compras',   'quantity',           'cantidad'],
    ['compras',   'unit_cost',          'costo_unitario'],
    ['compras',   'cost_includes_iva',  'costo_incluye_iva'],
    ['compras',   'margin_pct',         'margen_pct'],
    ['compras',   'net_cost',           'costo_neto'],
    ['compras',   'suggested_price',    'precio_sugerido'],
    ['compras',   'purchased_at',       'fecha_compra'],
    ['compras',   'created_at',         'creado_en'],

    ['pedidos',   'code',               'codigo'],
    ['pedidos',   'customer_name',      'cliente'],
    ['pedidos',   'note',               'nota'],
    ['pedidos',   'items',              'articulos'],
    ['pedidos',   'created_at',         'creado_en']
    -- (id, iva_pct y total ya se llaman igual en español)
  ] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = c[1] and column_name = c[2]) then
      execute format('alter table public.%I rename column %I to %I', c[1], c[2], c[3]);
    end if;
  end loop;
end $$;

-- Índice de compras con nombre en español
alter index if exists public.purchases_product_idx rename to compras_producto_idx;

-- Restricciones internas (llave primaria, validaciones): sus nombres salen en los mensajes de error
do $$
declare k text[];
begin
  foreach k slice 1 in array array[
    -- [tabla nueva, restricción antigua, restricción nueva]
    ['ajustes',   'settings_pkey',                'ajustes_pkey'],
    ['ajustes',   'settings_id_check',            'ajustes_id_check'],
    ['productos', 'products_pkey',                'productos_pkey'],
    ['productos', 'products_name_check',          'productos_nombre_check'],
    ['productos', 'products_description_check',   'productos_descripcion_check'],
    ['productos', 'products_price_check',         'productos_precio_check'],
    ['compras',   'purchases_pkey',               'compras_pkey'],
    ['compras',   'purchases_product_id_fkey',    'compras_producto_id_fkey'],
    ['compras',   'purchases_quantity_check',     'compras_cantidad_check'],
    ['compras',   'purchases_unit_cost_check',    'compras_costo_unitario_check'],
    ['pedidos',   'orders_pkey',                  'pedidos_pkey'],
    ['pedidos',   'orders_customer_name_check',   'pedidos_cliente_check'],
    ['pedidos',   'orders_note_check',            'pedidos_nota_check'],
    ['pedidos',   'orders_total_check',           'pedidos_total_check']
  ] loop
    if exists (select 1 from pg_constraint
               where conrelid = to_regclass('public.' || k[1]) and conname = k[2]) then
      execute format('alter table public.%I rename constraint %I to %I', k[1], k[2], k[3]);
    end if;
  end loop;
end $$;

-- ---------- 3. Pedidos antiguos: claves JSON en español ----------
update public.pedidos
set articulos = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',       a.valor -> 'id',
        'nombre',   a.valor -> 'name',
        'precio',   a.valor -> 'price',
        'cantidad', a.valor -> 'qty'
      ) order by a.orden
    ),
    '[]'::jsonb)
  from jsonb_array_elements(public.pedidos.articulos) with ordinality as a(valor, orden)
)
where exists (
  select 1 from jsonb_array_elements(public.pedidos.articulos) as a(valor) where a.valor ? 'name'
);

-- ---------- 4. Seguridad (RLS) con nombres nuevos ----------
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('ajustes','productos','compras','pedidos') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "ajustes: lectura publica" on public.ajustes
  for select to anon, authenticated using (true);
create policy "productos: lectura publica activos" on public.productos
  for select to anon, authenticated using (activo = true);

create policy "pedidos: el publico crea pedidos" on public.pedidos
  for insert to anon, authenticated
  with check (jsonb_typeof(articulos) = 'array' and jsonb_array_length(articulos) between 1 and 50);

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

commit;

-- Avisa a la API de Supabase que la estructura cambió (para que no use la copia vieja).
notify pgrst, 'reload schema';

-- ---------- Revisión: debe mostrar las 4 tablas con sus columnas en español ----------
select table_name as tabla, string_agg(column_name, ', ' order by ordinal_position) as columnas
from information_schema.columns
where table_schema = 'public' and table_name in ('ajustes','productos','compras','pedidos')
group by table_name
order by table_name;
