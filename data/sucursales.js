// Configuración de sucursales
export const sucursales = [
  { id: 'altabrisa', nombre: 'Altabrisa', activa: true },
  { id: 'americas', nombre: 'Américas', activa: true },
  { id: 'angeles', nombre: 'Ángeles', activa: true },
  { id: 'galerias', nombre: 'Galerías', activa: true },
  { id: 'centro', nombre: 'Centro', activa: true },
  { id: 'olmeca', nombre: 'Olmeca', activa: true },
  { id: 'usuma', nombre: 'Usumacinta', activa: true },
  { id: 'pista', nombre: 'Pista', activa: true },
  { id: 'guayabal', nombre: 'Guayabal', activa: true },
  { id: 'crystal', nombre: 'Crystal', activa: true },
  { id: 'deportiva', nombre: 'Deportiva', activa: true },
  { id: 'walmart-deportiva', nombre: 'Walmart Deportiva', activa: true },
  { id: 'walmart-carrizal', nombre: 'Walmart Carrizal', activa: true },
  { id: 'walmart-universidad', nombre: 'Walmart Universidad', activa: true },
  { id: 'movil-deportiva', nombre: 'Móvil Deportiva', activa: true },
  { id: 'movil-la-venta', nombre: 'Móvil La Venta', activa: true }
];

// Función para obtener una sucursal por su ID
export const obtenerSucursalPorId = (id) => {
  return sucursales.find(sucursal => sucursal.id === id);
};

// Función para obtener todas las sucursales activas
export const obtenerSucursalesActivas = () => {
  return sucursales.filter(sucursal => sucursal.activa);
};
