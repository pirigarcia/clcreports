// Configuración de franquicias
export const franquicias = [
    { id: 'via2', nombre: 'Vía 2', activa: true, modelo: 'Cafetería' },
    { id: 'citycenter', nombre: 'City center', activa: true, modelo: 'Cafetería' },
    { id: 'cardenas', nombre: 'Cárdenas', activa: true, modelo: 'Cafetería' },
    { id: 'paraiso', nombre: 'Paraíso', activa: true, modelo: 'Cafetería' },
    { id: 'dosbocas', nombre: 'Dos Bocas', activa: true, modelo: 'Móvil' },
    { id: 'cumuapa', nombre: 'Cumuapa', activa: true, modelo: 'Móvil' },
    { id: 'cunduacan', nombre: 'Cunduacán', activa: true, modelo: 'Cafetería' },
    { id: 'jalpa', nombre: 'Jalpa de Méndez', activa: true, modelo: 'Cafetería' },
    { id: 'cd-carmen', nombre: 'Cd del Cármen', activa: true, modelo: 'Cafetería' }
];
window.franquicias = franquicias;

export function obtenerFranquiciaPorId(id) {
  return franquicias.find(franq => franq.id === id);
}