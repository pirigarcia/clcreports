// migrar_sucursales.js
import admin from 'firebase-admin';
import { sucursales } from './data/sucursales.js'; // Asegúrate que sea un ES6 module

// Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('server/serviceAccountKey.json')
});

const db = admin.firestore();

async function migrarSucursales() {
  for (const suc of sucursales) {
    await db.collection('sucursales').doc(suc.id).set(suc);
    console.log(`Migrada sucursal: ${suc.id}`);
  }
  console.log('Migración de sucursales completada.');
}

migrarSucursales().catch(console.error);