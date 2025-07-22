// Configuración de franquicias
export const franquicias = [
    { id: 'via2', nombre: 'Vía 2', activa: true },
    { id: 'citycenter', nombre: 'City center', activa: true },
    { id: 'cardenas', nombre: 'Cárdenas', activa: true },
    { id: 'paraiso', nombre: 'Paraíso', activa: true },
    { id: 'dosbocas', nombre: 'Dos Bocas', activa: true },
    { id: 'cumuapa', nombre: 'Cumuapa', activa: true },
    { id: 'cunduacan', nombre: 'Cunduacán', activa: true },
    { id: 'jalpa', nombre: 'Jalpa de Méndez', activa: true },
    { id: 'cd-carmen', nombre: 'Cd del Cármen', activa: true }
  ];
  
  // Función para obtener una franquicia por su ID
  export const obtenerFranquiciaPorId = (id) => {
    return franquicias.find(franquicia => franquicia.id === id);
  };