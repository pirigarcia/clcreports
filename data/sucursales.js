// Configuración de sucursales
export const sucursales = [
  { id: 'altabrisa', nombre: 'Altabrisa', activa: true, modelo: 'Cafetería' },
  { id: 'americas', nombre: 'Américas', activa: true, modelo: 'Cafetería' },
  { id: 'angeles', nombre: 'Ángeles', activa: true, modelo: 'Cafetería' },
  { id: 'galerias', nombre: 'Galerías', activa: true, modelo: 'Cafetería' },
  { id: 'centro', nombre: 'Centro', activa: true, modelo: 'Cafetería' },
  { id: 'olmeca', nombre: 'Olmeca', activa: true, modelo: 'Cafetería' },
  { id: 'usuma', nombre: 'Usumacinta', activa: true, modelo: 'Cafetería' },
  { id: 'pista', nombre: 'Pista', activa: true, modelo: 'Express' },
  { id: 'guayabal', nombre: 'Guayabal', activa: true, modelo: 'Cafetería' },
  { id: 'crystal', nombre: 'Crystal', activa: true, modelo: 'Cafetería' },
  { id: 'deportiva', nombre: 'Deportiva', activa: true, modelo: 'Cafetería' },
  { id: 'walmart-deportiva', nombre: 'Walmart Deportiva', activa: true, modelo: 'Express' },
  { id: 'walmart-carrizal', nombre: 'Walmart Carrizal', activa: true, modelo: 'Express' },
  { id: 'walmart-universidad', nombre: 'Walmart Universidad', activa: true, modelo: 'Express' },
  { id: 'movil-deportiva', nombre: 'Móvil Deportiva', activa: true, modelo: 'Móvil' },
  { id: 'movil-la-venta', nombre: 'Móvil La Venta', activa: true, modelo: 'Móvil' }
];

// Función para obtener una sucursal por su ID
export const obtenerSucursalPorId = (id) => {
  return sucursales.find(sucursal => sucursal.id === id);
};

// Función para obtener todas las sucursales activas
export const obtenerSucursalesActivas = () => {
  return sucursales.filter(sucursal => sucursal.activa);
};
