import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { demoMode, supabase } from '../lib/supabase';
import ProductsTab from '../admin/ProductsTab.jsx';
import PurchasesTab from '../admin/PurchasesTab.jsx';
import OrdersTab from '../admin/OrdersTab.jsx';
import SettingsTab from '../admin/SettingsTab.jsx';

const TABS = [
  ['productos', 'Productos'],
  ['compras', 'Compras'],
  ['pedidos', 'Pedidos'],
  ['ajustes', 'Ajustes'],
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError('Correo o contraseña incorrectos.');
    setBusy(false);
  }

  return (
    <form className="panel login" onSubmit={submit}>
      <h1>Panel de administración</h1>
      <label className="field">
        <span>Correo</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </label>
      <label className="field">
        <span>Contraseña</span>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn--candy btn--block" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

export default function Admin() {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [tab, setTab] = useState('productos');

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.title = 'Administración';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (demoMode) {
    return (
      <div className="admin-shell">
        <div className="panel">
          <h1>Falta conectar Supabase</h1>
          <p>
            Crea un archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> (mira el README) y reinicia el servidor.
          </p>
          <Link className="btn btn--ink" to="/">Volver a la vitrina</Link>
        </div>
      </div>
    );
  }

  if (session === undefined) return <div className="admin-shell"><p className="notice">Cargando…</p></div>;
  if (!session) return <div className="admin-shell"><Login /></div>;

  return (
    <div className="admin-shell">
      <header className="admin-head">
        <h1>Administración</h1>
        <div className="admin-head__actions">
          <Link className="btn btn--ghost" to="/">Ver vitrina</Link>
          <button className="btn btn--ink" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Secciones">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? 'is-on' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'productos' && <ProductsTab />}
      {tab === 'compras' && <PurchasesTab />}
      {tab === 'pedidos' && <OrdersTab />}
      {tab === 'ajustes' && <SettingsTab />}
    </div>
  );
}
