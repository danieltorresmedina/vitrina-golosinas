/**
 * Punto de entrada: monta la aplicación y define las dos pantallas.
 *   /        → Vitrina (la ve el público)
 *   /admin   → Panel de administración (requiere iniciar sesión)
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProveedorCarro } from './estado/CarroContexto.jsx';
import Vitrina from './paginas/Vitrina.jsx';
import Admin from './paginas/Admin.jsx';

// Tipografías incluidas en la app (no dependen de Google Fonts). Solo el alfabeto latino.
import '@fontsource/bagel-fat-one/latin-400.css';
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-500.css';
import '@fontsource/figtree/latin-700.css';
import '@fontsource/figtree/latin-800.css';
import './estilos.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorCarro>
        <Routes>
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<Vitrina />} />
        </Routes>
      </ProveedorCarro>
    </BrowserRouter>
  </React.StrictMode>,
);
