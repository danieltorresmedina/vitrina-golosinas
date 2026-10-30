# Vitrina de golosinas

Vitrina web para cuchuflíes, cocadas y gomitas: los clientes ven los productos, arman un carro y el pedido te llega por WhatsApp. Incluye un panel privado (`/admin`) para subir productos con foto y precio, y un módulo de compras que calcula el precio de venta.

**Tecnologías:** React + Vite (JavaScript) · Supabase (base de datos, login e imágenes) · Cloudflare (hosting gratis).

Todo el código, los nombres y los comentarios están en español. Los nombres no llevan tildes ni ñ (`categoria`, `pestana`) para evitar problemas con herramientas; los textos que ve el usuario sí.

---

## Mapa del código: dónde cambiar cada cosa

```
index.html                       Página base. Carga src/principal.jsx.
wrangler.jsonc                   Configuración de Cloudflare (nombre del Worker, carpeta dist, modo SPA).
supabase/schema.sql              Tablas, reglas de seguridad y bucket de imágenes (se ejecuta en Supabase).
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
    baseDatos.js                 ÚNICO archivo que habla con las tablas. Traduce nombres inglés ⇄ español.

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

Las tablas y columnas de Supabase siguen en inglés (ya tienen datos reales). El código usa nombres en español y `src/servicios/baseDatos.js` hace la traducción. Si algún día se renombran en la base, solo se cambia ese archivo.

| Tabla (base) | Qué guarda | Columna (base) → nombre en el código |
|---|---|---|
| `settings` | Ajustes de la tienda (1 sola fila) | `store_name` → `nombreTienda` · `whatsapp_number` → `whatsapp` · `iva_pct` → `ivaPct` · `default_margin_pct` → `margenSugeridoPct` |
| `products` | Productos de la vitrina | `name` → `nombre` · `description` → `descripcion` · `category` → `categoria` · `image_url` → `imagenUrl` · `price` → `precio` · `active` → `activo` |
| `purchases` | Compras (costos y márgenes; **privado**) | `product_id` → `productoId` · `supplier` → `proveedor` · `quantity` → `cantidad` · `unit_cost` → `costoUnitario` · `cost_includes_iva` → `costoIncluyeIva` · `margin_pct` → `margenPct` · `net_cost` → `costoNeto` · `suggested_price` → `precioSugerido` · `purchased_at` → `fechaCompra` |
| `orders` | Pedidos enviados por clientes | `code` → `codigo` · `customer_name` → `cliente` · `note` → `nota` · `items` → `items` · `total` → `total` · `created_at` → `creadoEn` |

Dentro de `orders.items` cada producto se guarda como `{ id, name, price, qty }` → `{ id, nombre, precio, cantidad }`.

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
2. **SQL Editor** → pega todo `supabase/schema.sql` → *Run*.
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

- Costos y márgenes viven en `purchases`, que **solo el administrador puede leer**. El público ve nombre, foto y precio final.
- La *anon key* es pública por diseño; lo que protege los datos son las reglas (RLS) de `supabase/schema.sql`.
- Cualquier usuario autenticado es administrador: por eso hay que desactivar el registro abierto.
- Los clientes pueden crear pedidos pero no leerlos. El total lo calcula el navegador, así que sirve como registro y no como cobro: confirma por WhatsApp antes de cobrar.

## Límites del plan gratuito

- **Supabase Free:** 500 MB de base de datos, 1 GB de archivos, pausa tras 7 días sin actividad (se reactiva desde su panel).
- **Cloudflare:** los archivos estáticos son ilimitados; esta app no usa funciones de servidor.
