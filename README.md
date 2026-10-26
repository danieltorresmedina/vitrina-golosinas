# Vitrina de golosinas

Vitrina web para cuchuflíes, cocadas y gomitas: los clientes ven los productos, arman un carro y el pedido te llega por WhatsApp. Incluye un panel privado para subir productos (imagen y precio) y un módulo de compras que calcula el precio de venta.

**Stack:** React + Vite (JS) · Supabase (Postgres, Auth, Storage) · Cloudflare Pages (hosting gratis, permite uso comercial).

## Probar sin configurar nada

```bash
npm install
npm run dev
```

Sin variables de entorno la vitrina corre en **modo demo** con productos de ejemplo (el carro y el mensaje de WhatsApp funcionan; no se guarda nada).

## Poner en marcha con datos reales

### 1. Supabase (≈10 min)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan Free).
2. **SQL Editor** → pega todo `supabase/schema.sql` → *Run*. Crea tablas, reglas de seguridad y el bucket de imágenes.
3. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**.
4. **Authentication → Users → Add user**: crea tu correo y contraseña (marca *Auto Confirm User*). Esa es tu cuenta de administrador.
5. **Project Settings → API**: copia *Project URL* y la clave *anon public*.

### 2. Variables de entorno

Copia `.env.example` a `.env` y pega los dos valores. Reinicia `npm run dev`.

### 3. Primer uso

1. Entra a `/admin` e inicia sesión.
2. **Ajustes**: nombre de la tienda y tu WhatsApp con código de país (Chile: `56912345678`).
3. **Productos → Nuevo producto**: sube foto, nombre, categoría y precio.
4. **Compras**: registra una compra con costo, margen e IVA y deja marcada la casilla para actualizar el precio.

### 4. Publicar en Cloudflare Pages

1. Sube esta carpeta a un repositorio de GitHub (el `.env` no se sube, ya está en `.gitignore`).
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build command: `npm run build` · Output directory: `dist`.
4. En *Environment variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. *Save and Deploy*. El archivo `public/_redirects` hace que `/admin` funcione al recargar.

## Cómo se calcula el precio

```
costo neto  = costo ingresado            (si marcas "ya incluye IVA": costo ÷ 1,19)
precio neto = costo neto × (1 + margen%)
precio      = precio neto × (1 + IVA%)   → redondeado hacia arriba a $10
ganancia    = precio ÷ (1 + IVA%) − costo neto
```

El margen es **sobre el costo**. Ejemplo: costo $1.000 + margen 40% + IVA 19% = $1.666 → **$1.670**. El IVA y el margen sugerido se cambian en *Ajustes*. Las pruebas están en `tests/pricing.test.js` (`npm test`).

## Seguridad: lo que conviene saber

- Los costos y márgenes viven en la tabla `purchases`, que **solo el administrador puede leer**. El público solo ve nombre, foto y precio final.
- La *anon key* es pública por diseño; lo que protege los datos son las políticas RLS del SQL.
- Cualquier usuario autenticado es administrador: por eso hay que desactivar el registro abierto (paso 1.3).
- Los clientes pueden crear pedidos pero no leerlos. El total del pedido lo calcula el navegador, así que sirve como registro y no como cobro: tú confirmas por WhatsApp antes de cobrar.

## Límites del plan gratuito a vigilar

- **Supabase Free:** 500 MB de base de datos, 1 GB de archivos y pausa tras 7 días sin actividad. Las fotos se comprimen solas a ~100 KB. Si el proyecto se pausa, se reactiva desde el panel de Supabase.
- **Cloudflare Pages:** los archivos estáticos son ilimitados; esta app no usa funciones de servidor.

## Siguientes pasos (cuando la vitrina funcione)

- Pago dentro de la app (Mercado Pago o Flow desde una función de servidor).
- Stock por producto y avisos de “agotado”.
- Dominio propio (se conecta gratis en Cloudflare Pages).
