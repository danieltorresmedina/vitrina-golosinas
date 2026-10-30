/**
 * Panel de administración (/admin). Solo entra quien inicia sesión con el usuario
 * creado a mano en Supabase (Authentication → Users).
 *
 * Pestañas (cada una es un archivo en src/admin/):
 *   Productos → PestanaProductos.jsx   (crear/editar, foto y precio)
 *   Compras   → PestanaCompras.jsx     (costo + margen + IVA → precio de venta)
 *   Pedidos   → PestanaPedidos.jsx     (pedidos enviados por los clientes)
 *   Ajustes   → PestanaAjustes.jsx     (nombre de la tienda, WhatsApp, IVA, margen)
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { modoDemo } from '../servicios/supabase';
import { cerrarSesion, escucharSesion, iniciarSesion, obtenerSesion } from '../servicios/baseDatos';
import PestanaProductos from '../admin/PestanaProductos.jsx';
import PestanaCompras from '../admin/PestanaCompras.jsx';
import PestanaPedidos from '../admin/PestanaPedidos.jsx';
import PestanaAjustes from '../admin/PestanaAjustes.jsx';

// [identificador, texto de la pestaña]
const PESTANAS = [
  ['productos', 'Productos'],
  ['compras', 'Compras'],
  ['pedidos', 'Pedidos'],
  ['ajustes', 'Ajustes'],
];

/** Formulario de correo y contraseña. */
function Acceso() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setOcupado(true);
    setMensajeError('');
    try {
      await iniciarSesion(correo, clave);
      // Si sale bien, Admin se entera por escucharSesion() y muestra el panel.
    } catch {
      setMensajeError('Correo o contraseña incorrectos.');
    }
    setOcupado(false);
  }

  return (
    <form className="panel acceso" onSubmit={enviar}>
      <h1>Panel de administración</h1>
      <label className="campo">
        <span>Correo</span>
        <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" />
      </label>
      <label className="campo">
        <span>Contraseña</span>
        <input type="password" required value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" />
      </label>
      {mensajeError && <p className="error" role="alert">{mensajeError}</p>}
      <button className="boton boton--chicle boton--ancho" disabled={ocupado}>
        {ocupado ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

export default function Admin() {
  // sesion: undefined = todavía revisando · null = sin sesión · objeto = con sesión
  const [sesion, setSesion] = useState(undefined);
  const [pestanaActiva, setPestanaActiva] = useState('productos');

  // Revisa si ya había una sesión iniciada y se mantiene atento a cambios.
  useEffect(() => {
    if (modoDemo) return undefined;
    obtenerSesion().then(setSesion);
    return escucharSesion(setSesion);
  }, []);

  // Pide a los buscadores que no indexen esta página.
  useEffect(() => {
    document.title = 'Administración';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (modoDemo) {
    return (
      <div className="admin">
        <div className="panel">
          <h1>Falta conectar Supabase</h1>
          <p>
            Crea un archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> (mira el README) y reinicia el servidor.
          </p>
          <Link className="boton boton--tinta" to="/">Volver a la vitrina</Link>
        </div>
      </div>
    );
  }

  if (sesion === undefined) return <div className="admin"><p className="aviso">Cargando…</p></div>;
  if (!sesion) return <div className="admin"><Acceso /></div>;

  return (
    <div className="admin">
      <header className="admin__cabecera">
        <h1>Administración</h1>
        <div className="admin__acciones">
          <Link className="boton boton--fantasma" to="/">Ver vitrina</Link>
          <button className="boton boton--tinta" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>

      <nav className="pestanas" role="tablist" aria-label="Secciones">
        {PESTANAS.map(([id, texto]) => (
          <button
            key={id}
            role="tab"
            aria-selected={pestanaActiva === id}
            className={`pestana ${pestanaActiva === id ? 'seleccionado' : ''}`}
            onClick={() => setPestanaActiva(id)}
          >
            {texto}
          </button>
        ))}
      </nav>

      {pestanaActiva === 'productos' && <PestanaProductos />}
      {pestanaActiva === 'compras' && <PestanaCompras />}
      {pestanaActiva === 'pedidos' && <PestanaPedidos />}
      {pestanaActiva === 'ajustes' && <PestanaAjustes />}
    </div>
  );
}
