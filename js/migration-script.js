// Script de migración para actualizar evaluaciones históricas
// Aplica las nuevas exclusiones de parámetros por sucursal

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc,
  updateDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { obtenerParametrosExcluidos } from '../data/sucursales.js';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbVVwZAWnuEecGD3c8UP49ezQHd7PQ9MQ",
  authDomain: "clcreports-9083b.firebaseapp.com",
  projectId: "clcreports-9083b",
  storageBucket: "clcreports-9083b.appspot.com",
  messagingSenderId: "312363582020",
  appId: "1:312363582020:web:6951c11e95e946f233f211"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Migra todas las evaluaciones históricas aplicando las nuevas exclusiones de parámetros
 */
async function migrarEvaluacionesHistoricas() {
  console.log('🚀 Iniciando migración de evaluaciones históricas...');
  
  try {
    // 1. Obtener todas las evaluaciones
    console.log('📖 Obteniendo evaluaciones de Firebase...');
    const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
    const evaluaciones = [];
    
    evaluacionesSnapshot.forEach((doc) => {
      evaluaciones.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📊 Total de evaluaciones encontradas: ' + evaluaciones.length);
    
    if (evaluaciones.length === 0) {
      console.log('✅ No hay evaluaciones para migrar.');
      return;
    }
    
    // 2. Procesar evaluaciones en lotes
    const loteSize = 500; // Firestore permite hasta 500 operaciones por lote
    let evaluacionesProcesadas = 0;
    let evaluacionesActualizadas = 0;
    
    for (let i = 0; i < evaluaciones.length; i += loteSize) {
      const lote = evaluaciones.slice(i, i + loteSize);
      const batch = writeBatch(db);
      
      console.log('🔄 Procesando lote ' + Math.floor(i / loteSize) + 1 + '/' + Math.ceil(evaluaciones.length / loteSize) + '...');
      
      for (const evaluacion of lote) {
        const resultado = await procesarEvaluacion(evaluacion, batch);
        evaluacionesProcesadas++;
        
        if (resultado.actualizada) {
          evaluacionesActualizadas++;
        }
        
        // Mostrar progreso cada 50 evaluaciones
        if (evaluacionesProcesadas % 50 === 0) {
          console.log('📈 Progreso: ' + evaluacionesProcesadas + '/' + evaluaciones.length + ' evaluaciones procesadas');
        }
      }
      
      // Ejecutar el lote
      if (evaluacionesActualizadas > 0) {
        await batch.commit();
        console.log('✅ Lote ' + Math.floor(i / loteSize) + 1 + ' guardado en Firebase');
      }
    }
    
    console.log('🎉 Migración completada:');
    console.log('   - Evaluaciones procesadas: ' + evaluacionesProcesadas);
    console.log('   - Evaluaciones actualizadas: ' + evaluacionesActualizadas);
    console.log('   - Evaluaciones sin cambios: ' + (evaluacionesProcesadas - evaluacionesActualizadas));
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

/**
 * Procesa una evaluación individual aplicando las nuevas exclusiones
 */
async function procesarEvaluacion(evaluacion, batch) {
  try {
    const { id, sucursalId, respuestas = [] } = evaluacion;
    
    if (!sucursalId || !respuestas.length) {
      console.warn('⚠️  Evaluación ' + id + ' sin sucursalId o respuestas, saltando...');
      return { actualizada: false };
    }
    
    // Obtener parámetros excluidos para esta sucursal
    const parametrosExcluidos = obtenerParametrosExcluidos(sucursalId);
    
    if (parametrosExcluidos.length === 0) {
      // No hay exclusiones para esta sucursal
      return { actualizada: false };
    }
    
    // Filtrar respuestas excluyendo parámetros que ya no aplican
    const respuestasFiltradas = respuestas.filter(respuesta => {
      const excluir = parametrosExcluidos.includes(respuesta.parametroId);
      if (excluir) {
        console.log('🚫 Excluyendo parámetro ' + respuesta.parametroId + ' de evaluación ' + id + ' (sucursal: ' + sucursalId + ')');
      }
      return !excluir;
    });
    
    // Verificar si hubo cambios
    if (respuestasFiltradas.length === respuestas.length) {
      // No se excluyó ningún parámetro
      return { actualizada: false };
    }
    
    // Recalcular puntaje total
    const puntajeTotal = respuestasFiltradas.length > 0
      ? Math.round((respuestasFiltradas.reduce((sum, r) => sum + r.valor, 0) / respuestasFiltradas.length) * 100)
      : 0;
    
    // Preparar actualización
    const actualizacion = {
      respuestas: respuestasFiltradas,
      puntajeTotal: puntajeTotal,
      fechaActualizacion: new Date(),
      migrado: true, // Marca para identificar evaluaciones migradas
      parametrosExcluidosEnMigracion: parametrosExcluidos
    };
    
    // Agregar al batch
    const docRef = doc(db, 'evaluaciones', id);
    batch.update(docRef, actualizacion);
    
    console.log('✏️  Evaluación ' + id + ' programada para actualización (' + respuestas.length + ' → ' + respuestasFiltradas.length + ' parámetros, puntaje: ' + evaluacion.puntajeTotal + ' → ' + puntajeTotal + ')');
    
    return { actualizada: true };
    
  } catch (error) {
    console.error('❌ Error procesando evaluación ' + evaluacion.id + ':', error);
    return { actualizada: false };
  }
}

/**
 * Función para revertir la migración (por si es necesario)
 */
async function revertirMigracion() {
  console.log('🔄 Iniciando reversión de migración...');
  
  try {
    const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
    const evaluacionesMigradas = [];
    
    evaluacionesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.migrado) {
        evaluacionesMigradas.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    console.log('📊 Evaluaciones migradas encontradas: ' + evaluacionesMigradas.length);
    
    if (evaluacionesMigradas.length === 0) {
      console.log('✅ No hay evaluaciones migradas para revertir.');
      return;
    }
    
    // Aquí se podría implementar la lógica de reversión si es necesario
    console.log('⚠️  Función de reversión no implementada. Contacta al desarrollador si necesitas revertir la migración.');
    
  } catch (error) {
    console.error('❌ Error durante la reversión:', error);
    throw error;
  }
}

// Exportar funciones para uso desde la consola del navegador
window.migrarEvaluacionesHistoricas = migrarEvaluacionesHistoricas;
window.revertirMigracion = revertirMigracion;

// Función de ayuda para ejecutar desde la consola
window.ejecutarMigracion = () => {
  console.log('🚨 IMPORTANTE: Esta operación modificará todas las evaluaciones históricas en Firebase.');
  console.log('🚨 Asegúrate de tener un respaldo antes de continuar.');
  console.log('🚨 Para continuar, ejecuta: migrarEvaluacionesHistoricas()');
};

console.log('📋 Script de migración cargado.');
console.log('📋 Para ejecutar la migración, abre la consola del navegador y ejecuta: ejecutarMigracion()');