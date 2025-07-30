// Configuración de franquicias
export const franquicias = [
    { id: 'via2', nombre: 'Vía 2', activa: true, modelo: 'Cafetería' },
    { id: 'citycenter', nombre: 'City center', activa: true, modelo: 'Cafetería' },
    { id: 'cardenas', nombre: 'Cárdenas', activa: true, modelo: 'Cafetería' },
    { id: 'paraiso', nombre: 'Paraíso', activa: true, modelo: 'Cafetería' },
    { id: 'dosbocas', nombre: 'Dos Bocas', activa: true, modelo: 'Cafetería' },
    { id: 'cumuapa', nombre: 'Cumuapa', activa: true, modelo: 'Cafetería' },
    { id: 'cunduacan', nombre: 'Cunduacán', activa: true, modelo: 'Cafetería' },
    { id: 'jalpa', nombre: 'Jalpa de Méndez', activa: true, modelo: 'Cafetería' },
    { id: 'cd-carmen', nombre: 'Cd del Cármen', activa: true, modelo: 'Cafetería' }
  ];
  
  // Función para obtener una franquicia por su ID
  export const obtenerFranquiciaPorId = (id) => {
    return franquicias.find(franquicia => franquicia.id === id);
  };