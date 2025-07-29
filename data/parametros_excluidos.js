// data/parametros_excluidos.js

// Mapea el ID de la sucursal al array de parámetros excluidos
window.parametrosExcluidosPorSucursal = {
    // Usa el ID real de cada sucursal/franquicia aquí:
    "americas": [
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "los baños estaban limpios"
    ],
    "centro": [
      "jardineras y macetas en buen estado",
      "musica con volumen adecuado",
      "botes de basura estaban limpios y no llenos"
    ],
    "crystal": [
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "los baños estaban limpios"
    ],
    "galerias": [
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "los baños estaban limpios"
    ],
    "angeles": [
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "los baños estaban limpios"
    ],
    "altabrisa": [
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "los baños estaban limpios"
    ],
    "guayabal": [
      "puertas de acceso y vidrios limpios",
      "los baños estaban limpios",
      "se acercaron a tocar mesa",
      "anotaron en el vaso, el producto solicitado sin tachones ni manchas"
    ],
    "movil_deportiva": [
      "se acercaron a tocar mesa",
      "tableta",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "sillas y mesas dentro limpias",
      "mesas y sillas en buen estado",
      "los baños estaban limpios",
      "botes de basura limpios y no llenos",
      "la barra de atrás estaba limpia y ordenada",
      "mesas y sillas en buen estado"
    ],
    "deportiva": [
      "puertas de acceso y vidrios limpios"
    ],
    "movil_venta": [
      "se acercaron a tocar mesa",
      "tableta",
      "jardineras y macetas en buen estado",
      "puerta de acceso y vidrios limpios",
      "la musica con volumen adecuado",
      "sillas y mesas estaban limpias",
      "el piso estaba limpio",
      "los baños estaban limpios",
      "botes de basura limpios y no llenos",
      "la barra de atrás estaba limpia y ordenada",
      "mesas y sillas en buen estado"
    ],
    "olmeca": [
      "jardineras y macetas en buen estado"
    ],
    "pista": [
      "se acercaron a tocar mesa",
      "tableta",
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "sillas y mesas estaban limpias",
      "el piso estaba limpio",
      "los baños estaban limpios",
      "botes de basura limpios y no llenos",
      "clima de la sucursal funcionando",
      "mesas y sillas en buen estado"
    ],
    "walmart_carrizal": [
      "tableta",
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "los baños estaban limpios"
    ],
    "walmart_deportiva": [
      "se acercaron a tocar mesa",
      "tableta",
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "sillas y mesas estaban limpias",
      "el piso estaba limpio",
      "los baños estaban limpios",
      "botes de basura limpios y no llenos",
      "mesas y sillas en buen estado"
    ],
    "walmart_universidad": [
      "tableta",
      "jardineras y macetas en buen estado",
      "puertas de acceso y vidrios limpios",
      "musica con volumen adecuado",
      "los baños estaban limpios"
    ],
    "usuma": [
      "jardineras y macetas en buen estado",
      "musica con volumen adecuado",
      "botes de basura estaban limpios y no llenos"
    ]
  };
  
  /**
   * Devuelve el array de parámetros excluidos para una sucursal por su ID.
   * @param {string} sucursalId
   * @returns {string[]} Array de parámetros a excluir, o [] si no hay exclusiones.
   */
  window.obtenerParametrosExcluidos = function(sucursalId) {
    return window.parametrosExcluidosPorSucursal[sucursalId] || [];
  }