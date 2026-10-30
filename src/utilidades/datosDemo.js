/**
 * Datos de ejemplo para el MODO DEMO (cuando no hay claves de Supabase).
 * Sirven para ver y probar la vitrina sin configurar nada. No se guardan en ninguna parte.
 */
export const AJUSTES_DEMO = {
  nombreTienda: 'Dulce Kiosko',
  whatsapp: '56912345678',
  ivaPct: 19,
  margenSugeridoPct: 40,
};

export const PRODUCTOS_DEMO = [
  { id: 'd1', nombre: 'Cuchuflí de manjar', descripcion: 'Crujiente por fuera, relleno cremoso de manjar casero.', categoria: 'Cuchuflíes', imagenUrl: null, precio: 700 },
  { id: 'd2', nombre: 'Cuchuflí de chocolate', descripcion: 'Barquillo relleno de crema de cacao.', categoria: 'Cuchuflíes', imagenUrl: null, precio: 750 },
  { id: 'd3', nombre: 'Caja de 6 cuchuflíes', descripcion: 'Mezcla de sabores para compartir.', categoria: 'Cuchuflíes', imagenUrl: null, precio: 3990 },
  { id: 'd4', nombre: 'Cocada tradicional', descripcion: 'Coco rallado y azúcar, receta de la abuela.', categoria: 'Cocadas', imagenUrl: null, precio: 1200 },
  { id: 'd5', nombre: 'Cocada de manjar', descripcion: 'Con un corazón de manjar.', categoria: 'Cocadas', imagenUrl: null, precio: 1400 },
  { id: 'd6', nombre: 'Gomitas ositos 200 g', descripcion: 'Frutales y blanditas.', categoria: 'Gomitas', imagenUrl: null, precio: 2490 },
  { id: 'd7', nombre: 'Gomitas ácidas 150 g', descripcion: 'Con cubierta de azúcar ácida.', categoria: 'Gomitas', imagenUrl: null, precio: 2290 },
  { id: 'd8', nombre: 'Pack degustación', descripcion: '2 cuchuflíes, 1 cocada y una bolsita de gomitas.', categoria: 'Packs', imagenUrl: null, precio: 5490 },
];
