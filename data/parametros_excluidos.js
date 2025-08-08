// data/parametros_excluidos.js

// Mapea el ID de la sucursal al array de parámetros excluidos
export const parametrosExcluidosPorSucursal = {
    // Usa el ID real de cada sucursal/franquicia aquí:
    "americas": [
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "banos_estado"
    ],
    "centro": [
      "jardineras_macetas",
      "musica_volumen",
      "basura_estado"
    ],
    "crystal": [
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "banos_estado"
    ],
    "galerias": [
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "banos_estado"
    ],
    "angeles": [
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "banos_estado"
    ],
    "altabrisa": [
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "banos_estado"
    ],
    "guayabal": [
      
      "tableta",
      "jardineras_macetas",
      "musica_volumen",
      "banos_estado",
      "tiempo_fila"
    ],
    "movil-deportiva": [
      "atencion_mesa",
      "tableta",
      "puertas_vidrios",
      "musica_volumen",
      "mesas_sillas_limpieza",
      "mesas_sillas_estado",
      "banos_estado",
      "basura_estado",
      "barra_limpieza",
      "mesas_sillas_estado"
    ],
    "deportiva": [
      "puertas_vidrios"
    ],
    "movil-la-venta": [
      "atencion_mesa",
      "tableta",
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "mesas_sillas_limpieza",
      "piso_limpieza",
      "banos_estado",
      "basura_estado",
      "barra_limpieza",
      "mesas_sillas_estado"
    ],
    "olmeca": [
      "jardineras_macetas"
    ],
    "pista": [
      "atencion_mesa",
      "tableta",
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "mesas_sillas_limpieza",
      "piso_limpieza",
      "banos_estado",
      "basura_estado",
      "clima_funcionando",
      "mesas_sillas_estado"
    ],
    "walmart-carrizal": [
      "tableta",
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "banos_estado"
    ],
    "walmart-deportiva": [
      "atencion_mesa",
      "tableta",
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "mesas_sillas_limpieza",
      "piso_limpieza",
      "banos_estado",
      "basura_estado",
      "mesas_sillas_estado"
    ],
    "walmart-universidad": [
      "tableta",
      "jardineras_macetas",
      "puertas_vidrios",
      "musica_volumen",
      "banos_estado"
    ],
    "usuma": [
      "jardineras_macetas",
      "musica_volumen",
      "basura_estado"
    ]
  };

  // Mapea el ID de la franquicia al array de parámetros excluidos
export const parametrosExcluidosPorFranquicia = {
  // Franquicias cafetería
  "via2": [
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "banos_estado"
  ],
  "citycenter": [
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "banos_estado"
  ],
  "cardenas": [
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "banos_estado"
  ],
  "paraiso": [
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "banos_estado"
  ],
  "cunduacan": [
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "banos_estado"
  ],
  "jalpa": [
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "banos_estado"
  ],
  "cd-carmen": [
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "banos_estado"
  ],

  // Franquicias móviles
  "cumuapa": [
    "atencion_mesa",
    "tableta",
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "mesas_sillas_limpieza",
    "piso_limpieza",
    "banos_estado",
    "basura_estado",
    "barra_limpieza",
    "mesas_sillas_estado"
  ],
  "dosbocas": [
    "atencion_mesa",
    "tableta",
    "jardineras_macetas",
    "puertas_vidrios",
    "musica_volumen",
    "mesas_sillas_limpieza",
    "piso_limpieza",
    "banos_estado",
    "basura_estado",
    "barra_limpieza",
    "mesas_sillas_estado"
  ]
};

  /**
   * Devuelve el array de parámetros excluidos para una sucursal por su ID.
   * @param {string} sucursalId
   * @returns {string[]} Array de parámetros a excluir, o [] si no hay exclusiones.
   */
  export function obtenerParametrosExcluidos(sucursalId) {
    return parametrosExcluidosPorSucursal[sucursalId] || [];
  }
  export function obtenerParametrosExcluidosFranquicia(franquiciaId) {
    return parametrosExcluidosPorFranquicia[franquiciaId] || [];
  }