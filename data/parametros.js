// Categorías de evaluación
const categorias = [
  {
    id: 'bienvenida',
    nombre: 'Bienvenida y Atención al Cliente',
    descripcion: 'Parámetros relacionados con la atención al cliente inicial',
    peso: 20,
    aplicaATodas: true
  },
  {
    id: 'producto_ventas',
    nombre: 'Conocimiento del Producto y Ventas',
    descripcion: 'Parámetros relacionados con el conocimiento de productos y técnicas de venta',
    peso: 25,
    aplicaATodas: true
  },
  {
    id: 'atencion_mesa',
    nombre: 'Atención en Mesa',
    descripcion: 'Parámetros relacionados con el servicio en mesa',
    peso: 15,
    aplicaATodas: false
  },
  {
    id: 'tiempos',
    nombre: 'Tiempos de Espera',
    descripcion: 'Parámetros relacionados con los tiempos de atención',
    peso: 15,
    aplicaATodas: true
  },
  {
    id: 'personal',
    nombre: 'Personal y Presentación',
    descripcion: 'Parámetros relacionados con la presentación del personal',
    peso: 10,
    aplicaATodas: true
  },
  {
    id: 'presentacion_producto',
    nombre: 'Presentación del Producto',
    descripcion: 'Parámetros relacionados con la presentación de alimentos y bebidas',
    peso: 15,
    aplicaATodas: true
  },
  {
    id: 'exteriores',
    nombre: 'Instalaciones - Exteriores',
    descripcion: 'Parámetros relacionados con las áreas exteriores de la sucursal',
    peso: 10,
    aplicaATodas: false
  },
  {
    id: 'interiores',
    nombre: 'Instalaciones - Interiores',
    descripcion: 'Parámetros relacionados con las áreas interiores de la sucursal',
    peso: 15,
    aplicaATodas: false
  }
];

// Parámetros de evaluación
export const parametros = [
  // Bienvenida y Atención al Cliente
  {
    id: 'bienvenida_contacto_visual',
    categoriaId: 'bienvenida',
    nombre: 'Contacto visual y saludo',
    descripcion: 'El colaborador lo saludó verbalmente y estableció contacto visual',
    tipo: 'booleano',
    peso:4,
    aplicaATodas: true
  },
  {
    id: 'bienvenida_agradecimiento',
    categoriaId: 'bienvenida',
    nombre: 'Agradecimiento y despedida',
    descripcion: 'El colaborador dio las gracias e invitó a volver',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: true
  },

  // Conocimiento del Producto y Ventas
  {
    id: 'conocimiento_productos',
    categoriaId: 'producto_ventas',
    nombre: 'Conocimiento de productos',
    descripcion: 'Demostró conocimiento de los productos',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: true
  },
  {
    id: 'producto_mes',
    categoriaId: 'producto_ventas',
    nombre: 'Producto del mes',
    descripcion: 'Mencionó el producto del mes',
    tipo: 'booleano',
    peso: 3,
    aplicaATodas: true
  },
  {
    id: 'venta_cruzada',
    categoriaId: 'producto_ventas',
    nombre: 'Venta cruzada',
    descripcion: 'Ofreció productos adicionales (venta cruzada o sugerida)',
    tipo: 'booleano',
    peso: 5,
    aplicaATodas: true
  },
  {
    id: 'app_cabana',
    categoriaId: 'producto_ventas',
    nombre: 'APP Cabaña Cash',
    descripcion: 'Mencionó la APP Cabaña Cash para acumular puntos o registrarse',
    tipo: 'booleano',
    peso: 4,
    aplicaATodas: true
  },
  {
    id: 'pin_personalizador',
    categoriaId: 'producto_ventas',
    nombre: 'Pin personalizador',
    descripcion: 'Uso del pin personalizador',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: true
  },

  // Atención en Mesa
  {
    id: 'atencion_mesa',
    categoriaId: 'atencion_mesa',
    nombre: 'Atención en mesa',
    descripcion: 'Se acercaron a la mesa para identificar necesidades/recoger',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'entrega_ticket',
    categoriaId: 'atencion_mesa',
    nombre: 'Entrega de ticket',
    descripcion: 'Se entregó el ticket',
    tipo: 'booleano',
    peso: 3,
    aplicaATodas: true
  },

  // Tiempos de Espera
  {
    id: 'tiempo_espera_atencion',
    categoriaId: 'tiempos',
    nombre: 'Tiempo de espera de atención',
    descripcion: 'Tiempo total de espera de atención',
    tipo: 'rango',
    opciones: ['Menos de 2 min', '2-5 min', '5-10 min', 'Más de 10 min'],
    peso: 3,
    aplicaATodas: true
  },
  {
    id: 'tiempo_fila',
    categoriaId: 'tiempos',
    nombre: 'Tiempo en fila',
    descripcion: 'Tiempo total en la fila',
    tipo: 'rango',
    opciones: ['Menos de 2 min', '2-5 min', '5-10 min', 'Más de 10 min'],
    peso: 3,
    aplicaATodas: false
  },
  {
    id: 'tiempo_espera_cafe',
    categoriaId: 'tiempos',
    nombre: 'Tiempo de preparación',
    descripcion: 'Tiempo de espera para el café',
    tipo: 'rango',
    opciones: ['Menos de 2 min', '2-5 min', '5-10 min', 'Más de 10 min'],
    peso: 4,
    aplicaATodas: true
  },

  // Personal y Presentación
  {
    id: 'cantidad_colaboradores',
    categoriaId: 'personal',
    nombre: 'Cantidad de colaboradores',
    descripcion: 'Cantidad de colaboradores en la sucursal',
    tipo: 'numero',
    peso: 1,
    aplicaATodas: true
  },
  {
    id: 'apariencia_personal',
    categoriaId: 'personal',
    nombre: 'Apariencia del personal',
    descripcion: 'Los colaboradores estaban limpios y de buena apariencia (uniformes negros)',
    tipo: 'booleano',
    peso: 3,
    aplicaATodas: true
  },
  {
    id: 'tableta',
    categoriaId: 'personal',
    nombre: 'Uso de tableta',
    descripcion: 'Estado y uso de la tableta',
    tipo: 'booleano',
    peso: 3,
    aplicaATodas: false
  },

  // Presentación del Producto
  {
    id: 'presentacion_vaso',
    categoriaId: 'presentacion_producto',
    nombre: 'Presentación del vaso',
    descripcion: 'Anotaron en el vaso el producto sin tachones ni manchas',
    tipo: 'booleano',
    peso: 4,
    aplicaATodas: true
  },
  {
    id: 'presentacion_cafe',
    categoriaId: 'presentacion_producto',
    nombre: 'Presentación del café',
    descripcion: 'Presentación del café adecuada (sin manchas)',
    tipo: 'booleano',
    peso: 6,
    aplicaATodas: true
  },
  {
    id: 'presentacion_alimento',
    categoriaId: 'presentacion_producto',
    nombre: 'Presentación de alimentos',
    descripcion: 'Presentación visual correcta del alimento',
    tipo: 'booleano',
    peso: 6,
    aplicaATodas: true
  },
  {
    id: 'panera_estado',
    categoriaId: 'presentacion_producto',
    nombre: 'Estado de la panera',
    descripcion: 'Panera limpia, ordenada y surtida (platos sin migajas)',
    tipo: 'booleano',
    peso: 1,
    aplicaATodas: true
  },

  // Instalaciones - Exteriores
  {
    id: 'fachada_limpieza',
    categoriaId: 'exteriores',
    nombre: 'Limpieza de fachada',
    descripcion: 'Fachada y accesos limpios',
    tipo: 'booleano',
    peso: 1,
    aplicaATodas: true
  },
  {
    id: 'letrero_anuncio',
    categoriaId: 'exteriores',
    nombre: 'Letrero/anuncio',
    descripcion: 'Estado del letrero/anuncio',
    tipo: 'booleano',
    peso: 1,
    aplicaATodas: true
  },
  {
    id: 'jardineras_macetas',
    categoriaId: 'exteriores',
    nombre: 'Jardineras y macetas',
    descripcion: 'Jardineras y macetas en buen estado y limpias',
    tipo: 'booleano',
    peso: 1,
    aplicaATodas: false
  },

  // Instalaciones - Interiores
  {
    id: 'iluminacion',
    categoriaId: 'interiores',
    nombre: 'Iluminación',
    descripcion: 'Iluminación interior en buen estado',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'puertas_vidrios',
    categoriaId: 'interiores',
    nombre: 'Puertas y vidrios',
    descripcion: 'Puertas de acceso y vidrios limpios',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'musica_volumen',
    categoriaId: 'interiores',
    nombre: 'Música y volumen',
    descripcion: 'Música con volumen adecuado (instrumental o bossa nova)',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'area_mostrador',
    categoriaId: 'interiores',
    nombre: 'Área de mostrador',
    descripcion: 'Área de mostrador con orden y limpieza',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'mesas_sillas_limpieza',
    categoriaId: 'interiores',
    nombre: 'Limpieza de mesas y sillas',
    descripcion: 'Sillas y mesas (dentro y fuera) limpias',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'piso_limpieza',
    categoriaId: 'interiores',
    nombre: 'Limpieza de pisos',
    descripcion: 'Piso limpio',
    tipo: 'booleano',
    peso: 3,
    aplicaATodas: false
  },
  {
    id: 'banos_estado',
    categoriaId: 'interiores',
    nombre: 'Estado de baños',
    descripcion: 'Baños limpios (vidrios, olor, papel, jabón)',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'basura_estado',
    categoriaId: 'interiores',
    nombre: 'Estado de botes de basura',
    descripcion: 'Botes de basura limpios y no llenos',
    tipo: 'booleano',
    peso: 2,
    aplicaATodas: false
  },
  {
    id: 'barra_limpieza',
    categoriaId: 'interiores',
    nombre: 'Limpieza de barra',
    descripcion: 'Barra trasera limpia y ordenada',
    tipo: 'booleano',
    peso: 1,
    aplicaATodas: false
  },
  {
    id: 'clima_funcionando',
    categoriaId: 'interiores',
    nombre: 'Climatización',
    descripcion: 'Climatización funcionando correctamente',
    tipo: 'booleano',
    peso: 4,
    aplicaATodas: true
  },
  {
    id: 'mesas_sillas_estado',
    categoriaId: 'interiores',
    nombre: 'Estado de muebles',
    descripcion: 'Mesas y sillas en buen estado físico',
    tipo: 'booleano',
    peso: 3,
    aplicaATodas: false
  }
];

window.parametrosData = parametros;

// Funciones de utilidad

/**
 * Obtiene los parámetros agrupados por categoría
 * @returns {Object} Objeto con los parámetros agrupados por categoría
 */
function getParametrosPorCategoria() {
  return categorias.map(categoria => ({
    ...categoria,
    parametros: window.parametrosData.filter(p => p.categoriaId === categoria.id)
  }));
}

/**
 * Obtiene un parámetro por su ID
 * @param {string} id - ID del parámetro a buscar
 * @returns {Object} Parámetro encontrado o undefined
 */
function getParametroPorId(id) {
  return window.parametrosData.find(p => p.id === id);
}

/**
 * Obtiene los parámetros que aplican a una sucursal específica
 * @param {string} sucursalId - ID de la sucursal
 * @returns {Array} Lista de parámetros que aplican a la sucursal
 */
function getParametrosParaSucursal(sucursalId) {
  return window.parametrosData.filter(p => 
    p.aplicaATodas || 
    (p.sucursalesEspecificas && p.sucursalesEspecificas.includes(sucursalId))
  );
}

/**
 * Calcula el puntaje máximo posible para una evaluación
 * @param {string} sucursalId - ID de la sucursal (opcional)
 * @returns {number} Puntaje máximo posible
 */
function getPuntajeMaximo(sucursalId = null) {
  const params = sucursalId ? getParametrosParaSucursal(sucursalId) : window.parametrosData;
  return params.reduce((total, param) => total + param.peso, 0);
}

export {
  categorias,
  getParametrosPorCategoria,
  getParametroPorId,
  getParametrosParaSucursal,
  getPuntajeMaximo
};