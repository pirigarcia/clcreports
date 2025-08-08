// migrar_todo.js
import admin from 'firebase-admin';
import { sucursales } from './data/sucursales.js';
import { franquicias } from './data/franquicias.js';
import { definirParametros } from './data/parametros.js';
import parametrosExcluidosSucursal from './data/parametros_excluidos.js';
import parametrosExcluidosFranquicia from './data/parametros_excluidos.js';
import usuarios from './data/usuarios.js';

// Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('server/serviceAccountKey.json')
});

const db = admin.firestore();

async function migrarColeccion(nombre, datos, idField = 'id') {
  for (const item of datos) {
    await db.collection(nombre).doc(item[idField].toString()).set(item);
    console.log(`Migrado a ${nombre}: ${item[idField]}`);
  }
}

async function migrarParametrosExcluidos(nombre, datos) {
  for (const [key, excluidos] of Object.entries(datos)) {
    await db.collection(nombre).doc(key).set({ excluidos });
    console.log(`Migrado a ${nombre}: ${key}`);
  }
}

async function main() {
  await migrarColeccion('sucursales', sucursales);
  await migrarColeccion('franquicias', franquicias);
  await migrarColeccion('parametros', definirParametros);
  await migrarParametrosExcluidos('parametros_excluidos_sucursal', parametrosExcluidosSucursal.parametrosExcluidosPorSucursal);
  await migrarParametrosExcluidos('parametros_excluidos_franquicia', parametrosExcluidosFranquicia.parametrosExcluidosPorFranquicia);
  await migrarColeccion('usuarios', usuarios, 'email');
  console.log('✅ Migración completa de todas las colecciones base.');
}

main().catch(console.error);