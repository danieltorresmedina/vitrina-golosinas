import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CartProvider } from './lib/cart.jsx';
import Shop from './pages/Shop.jsx';
import Admin from './pages/Admin.jsx';
import '@fontsource/bagel-fat-one/latin-400.css';
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-500.css';
import '@fontsource/figtree/latin-700.css';
import '@fontsource/figtree/latin-800.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<Shop />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
