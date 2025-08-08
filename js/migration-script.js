// Script de migración para poblar Firestore con sucursales, franquicias, parámetros y parámetros excluidos desde los archivos JS locales

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc,
  writeBatch,
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

import { sucursales } from '../data/sucursales.js';
import { franquicias } from '../data/franquicias.js';
import { parametros } from '../data/parametros.js';
import { parametrosExcluidosPorSucursal, parametrosExcluidosPorFranquicia } from '../data/parametros_excluidos.js';

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
 * Función general para migrar cualquier array a una colección Firestore
 */
async function migrarArrayACollection(dataArray, collectionName, idField = null) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.warn(`No hay datos para migrar a la colección ${collectionName}.`);
    return;
  }
  const batch = writeBatch(db);
  dataArray.forEach(item => {
    let docRef;
    if (idField && item[idField]) {
      docRef = doc(db, collectionName, String(item[idField]));
    } else {
      docRef = doc(collection(db, collectionName));
    }
    batch.set(docRef, item);
  });
  await batch.commit();
  console.log(`✅ Migración completa: ${dataArray.length} documentos a la colección ${collectionName}`);
}

/**
 * Función principal para migrar todos los datos clave
 */
async function migrarTodo() {
  await migrarArrayACollection(sucursales, 'sucursales', 'id');
  await migrarArrayACollection(franquicias, 'franquicias', 'id');
  await migrarArrayACollection(parametros, 'parametros', 'id');

  // Guarda los parámetros excluidos como documentos únicos
  await setDoc(doc(db, 'parametros_excluidos', 'porSucursal'), parametrosExcluidosPorSucursal);
  await setDoc(doc(db, 'parametros_excluidos', 'porFranquicia'), parametrosExcluidosPorFranquicia);

  console.log('� Migración completa de sucursales, franquicias, parámetros y parámetros excluidos.');
}

// Exportar función para uso desde la consola del navegador
window.migrarTodo = migrarTodo;

// Función de ayuda para ejecutar desde la consola
window.ejecutarMigracion = () => {
  console.log('🚨 IMPORTANTE: Esta operación modificará todos los datos en Firebase.');
  console.log('🚨 Asegúrate de tener un respaldo antes de continuar.');
  console.log('🚨 Para continuar, ejecuta: migrarTodo()');
};

console.log('📋 Script de migración cargado.');
console.log('📋 Para ejecutar la migración, abre la consola del navegador y ejecuta: ejecutarMigracion()');