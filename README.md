# Vitrina de golosinas

Vitrina web para cuchuflíes, cocadas y gomitas: los clientes ven los productos, arman un carro y el pedido te llega por WhatsApp. Incluye un panel privado (`/admin`) para subir productos con foto y precio, y un módulo de compras que calcula el precio de venta.

**Tecnologías:** React + Vite (JavaScript) · Supabase (base de datos, login e imágenes) · Cloudflare (hosting gratis).

Todo el código, los nombres y los comentarios están en español. Los nombres no llevan tildes ni ñ (`categoria`, `pestana`) para evitar problemas con herramientas; los textos que ve el usuario sí.

---

## Mapa del código: dónde cambiar cada cosa

```
index.html                       Página base. Carga src/principal.jsx.
wrangler.jsonc                   Configuración de Cloudflare (nombre del Worker, carpeta dist, modo SPA).
supabase/schema.sql              Base NUEVA: tablas, reglas de seguridad y bucket de imágenes (se ejecuta en Supabase).
supabase/migracion.sql           Base EXISTENTE en inglés: renombra todo a español sin perder datos (se usa una sola vez).
tests/precios.test.js            Pruebas automáticas de la fórmula de precios (npm test).

src/
  principal.jsx                  Punto de entrada y rutas:  /  → Vitrina,  /admin → Admin.
  estilos.css                    TODOS los estilos. Colores y tipografías en :root (arriba del archivo).

  paginas/
    Vitrina.jsx                  Pantalla pública: portada, filtros por categoría, tarjetas de producto.
    Admin.jsx                    Login y pestañas del panel de administración.

  componentes/
    Carro.jsx                    Panel del carro y envío del pedido por WhatsApp.

  admin/                         Una pestaña del panel por archivo:
    PestanaProductos.jsx           crear/editar/ocultar/eliminar productos y subir foto
    PestanaCompras.jsx             costo + margen + IVA → precio de venta, e historial de compras
    PestanaPedidos.jsx             pedidos que enviaron los clientes
    PestanaAjustes.jsx             nombre de la tienda, WhatsApp, IVA y margen sugerido
    usarCarga.js                   utilidad para cargar datos al abrir cada pestaña

  estado/
    CarroContexto.jsx            Estado del carro (agregar, quitar, total). Se guarda en el navegador.

  servicios/
    supabase.js                  Conexión a Supabase y detección del modo demo.
    baseDatos.js                 ÚNICO archivo que habla con las tablas (convierte nombre_tienda ⇄ nombreTienda).

  utilidades/
    precios.js                   Fórmula del precio (costo + margen + IVA, redondeo a $10).
    whatsapp.js                  Código de pedido, texto del mensaje y enlace wa.me.
    dinero.js                    Formato de pesos chilenos ($1.670).
    imagen.js                    Reduce la foto a ~900 px y la convierte a WebP antes de subirla.
    datosDemo.js                 Productos de ejemplo del modo demo.
```

### Cambios típicos

| Quiero… | Edito… |
|---|---|
| Cambiar colores o tipografías | `src/estilos.css`, bloque `:root` |
| Cambiar el título o texto de la portada | `src/paginas/Vitrina.jsx`, sección `portada` |
| Cambiar el texto del mensaje de WhatsApp | `src/utilidades/whatsapp.js`, función `armarMensaje` |
| Cambiar la fórmula de precio o el redondeo | `src/utilidades/precios.js` (y ajustar `tests/precios.test.js`) |
| Agregar un campo a los productos | `supabase/schema.sql` (columna nueva) + `src/servicios/baseDatos.js` + el formulario en `PestanaProductos.jsx` |
| Cambiar el tamaño de las fotos | `src/utilidades/imagen.js`, parámetro `ladoMaximo` |

---

## Base de datos: diccionario de nombres

Las tablas y columnas de Supabase están en español, en minúsculas y con guion bajo (`nombre_tienda`, `creado_en`). En el código JavaScript se usa la misma palabra en camelCase (`nombreTienda`, `creadoEn`); `src/servicios/baseDatos.js` solo hace ese cambio de formato. Si algún día se renombra una columna, solo se cambia ese archivo.

| Tabla | Qué guarda | Columna (base) → nombre en el código |
|---|---|---|
| `ajustes` | Ajustes de la tienda (1 sola fila) | `nombre_tienda` → `nombreTienda` · `whatsapp` · `iva_pct` → `ivaPct` · `margen_sugerido_pct` → `margenSugeridoPct` · `actualizado_en` |
| `productos` | Productos de la vitrina | `nombre` · `descripcion` · `categoria` · `imagen_url` → `imagenUrl` · `precio` · `activo` · `creado_en` |
| `compras` | Compras (costos y márgenes; **privado**) | `producto_id` → `productoId` · `proveedor` · `cantidad` · `costo_unitario` → `costoUnitario` · `costo_incluye_iva` → `costoIncluyeIva` · `iva_pct` → `ivaPct` · `margen_pct` → `margenPct` · `costo_neto` → `costoNeto` · `precio_sugerido` → `precioSugerido` · `fecha_compra` → `fechaCompra` · `creado_en` |
| `pedidos` | Pedidos enviados por clientes | `codigo` · `cliente` · `nota` · `articulos` · `total` · `creado_en` → `creadoEn` |

Dentro de `pedidos.articulos` cada producto se guarda como `{ id, nombre, precio, cantidad }`.

El bucket de imágenes se sigue llamando `product-images`: es un identificador interno de Supabase Storage y las direcciones de las fotos ya subidas lo incluyen; renombrarlo las dejaría rotas.

### Si tu base todavía está en inglés (products, orders…)

No ejecutes `schema.sql`. Usa `supabase/migracion.sql` (una sola vez):

1. Supabase → **SQL Editor** → pega todo `supabase/migracion.sql` → *Run*. Va en una transacción: si algo falla, no cambia nada.
2. Al terminar, sube de inmediato el código nuevo (`git push`). Mientras Cloudflare publica esa versión (1–2 minutos) la vitrina mostrará error, porque el código antiguo busca las tablas en inglés.
3. Prueba la vitrina, un pedido de prueba y las 4 pestañas del admin.

---

## Cómo se calcula el precio

```
costo neto  = costo ingresado            (si marcas "ya incluye IVA": costo ÷ 1,19)
precio neto = costo neto × (1 + margen%)     ← el margen es sobre el costo
precio      = precio neto × (1 + IVA%)       → se redondea hacia arriba a $10
ganancia    = precio ÷ (1 + IVA%) − costo neto
```

Ejemplo: costo $1.000 + margen 40 % + IVA 19 % = $1.666 → **$1.670**.

---

## Probar en tu computador

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # pruebas de la fórmula de precios
```

Sin variables de entorno la vitrina corre en **modo demo** (productos de ejemplo; el carro y el mensaje de WhatsApp funcionan, no se guarda nada).

## Poner en marcha con datos reales

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan Free).
2. **SQL Editor** → pega todo `supabase/schema.sql` → *Run* (base nueva; si ya tenías tablas en inglés, mira la sección anterior).
3. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**.
4. **Authentication → Users → Add user**: crea tu correo y contraseña (*Auto Confirm User*). Esa es tu cuenta de administrador.
5. **Project Settings → API**: copia *Project URL* y la clave *anon public*.

### 2. Variables de entorno

Copia `.env.example` a `.env` y pega los dos valores. Reinicia `npm run dev`.

### 3. Primer uso

1. Entra a `/admin` e inicia sesión.
2. **Ajustes**: nombre de la tienda y tu WhatsApp con código de país (Chile: `56912345678`).
3. **Productos → Nuevo producto**: foto, nombre, categoría y precio.
4. **Compras**: registra una compra con costo, margen e IVA y deja marcada la casilla para actualizar el precio.

### 4. Publicar en Cloudflare (Worker con Git)

1. Sube la carpeta a un repositorio de GitHub (`.env` no se sube; está en `.gitignore`).
2. Cloudflare → **Workers & Pages → Create → Import a repository**.
3. Build command: `npm run build` · Deploy command: `npx wrangler deploy`.
4. `wrangler.jsonc` indica dónde está el sitio (`dist`) y activa el modo SPA para que `/admin` funcione al recargar. Su `name` debe coincidir con el nombre de tu Worker.
5. **Settings → Build → Build variables and secrets**: agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Las de *Variables & Secrets* son de ejecución y **no** llegan al build (la vitrina seguiría en modo demo).
6. Lanza un build nuevo (push o *Retry build*): los cambios de variables solo se aplican al siguiente build.

---

## Seguridad

- Costos y márgenes viven en `compras`, que **solo el administrador puede leer**. El público ve nombre, foto y precio final.
- La *anon key* es pública por diseño; lo que protege los datos son las reglas (RLS) de `supabase/schema.sql`.
- Cualquier usuario autenticado es administrador: por eso hay que desactivar el registro abierto.
- Los clientes pueden crear pedidos pero no leerlos. El total lo calcula el navegador, así que sirve como registro y no como cobro: confirma por WhatsApp antes de cobrar.

## Límites del plan gratuito

- **Supabase Free:** 500 MB de base de datos, 1 GB de archivos, pausa tras 7 días sin actividad (se reactiva desde su panel).
- **Cloudflare:** los archivos estáticos son ilimitados; esta app no usa funciones de servidor.
