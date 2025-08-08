// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Carga las credenciales de la cuenta de servicio
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint de Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    // 1. Busca al usuario por email
    const userRecord = await auth.getUserByEmail(email);

    // 2. (Simplificado) Por ahora, no validamos la contraseña en el backend.
    // La validación real requeriría que el cliente inicie sesión con el SDK del cliente
    // y envíe un token de ID al backend para su verificación.
    // Por ahora, si el usuario existe, asumimos que el login es exitoso.

    // 3. Genera un token de sesión simple (no es un token de Firebase)
    // En un sistema de producción, usarías JWT (JSON Web Tokens) aquí.
    const sessionToken = `session_${userRecord.uid}_${Date.now()}`;

    res.json({
      message: 'Login exitoso',
      uid: userRecord.uid,
      email: userRecord.email,
      token: sessionToken, // Token de sesión para futuras peticiones
      rol: userRecord.customClaims?.rol || 'usuario' // Asume que tienes roles en custom claims
    });

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }
    console.error('Error en el login:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Endpoint para exponer config de Firebase al frontend de forma segura
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  });
});

// Ejemplo de endpoint seguro (a futuro se protegería con el token de sesión)
app.get('/api/evaluaciones', async (req, res) => {
  try {
    const snapshot = await db.collection('evaluaciones').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error obteniendo evaluaciones:', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo evaluaciones' });
  }
});

// --- ENDPOINT PARA SUCURSALES ---
app.get('/api/sucursales', async (req, res) => {
  try {
    const snapshot = await db.collection('sucursales').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo sucursales' });
  }
});

// --- ENDPOINT PARA FRANQUICIAS ---
app.get('/api/franquicias', async (req, res) => {
  try {
    const snapshot = await db.collection('franquicias').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error obteniendo franquicias:', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo franquicias' });
  }
});

// --- ENDPOINT PARA PARÁMETROS ---
app.get('/api/parametros', async (req, res) => {
  try {
    const snapshot = await db.collection('parametros').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error obteniendo parametros:', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo parametros' });
  }
});

// --- ENDPOINT PARA REPORTES (EVALUACIONES, PUEDES AJUSTAR FILTROS LUEGO) ---
app.get('/api/reportes', async (req, res) => {
  try {
    const snapshot = await db.collection('evaluaciones').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error obteniendo reportes:', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo reportes' });
  }
});

// --- ENDPOINT PARA MATRIZ (PUEDES AJUSTAR LÓGICA SEGÚN TU NECESIDAD) ---
app.get('/api/matriz', async (req, res) => {
  try {
    // Aquí puedes ajustar la lógica para la matriz según tu estructura
    const sucursalesSnap = await db.collection('sucursales').get();
    const franquiciasSnap = await db.collection('franquicias').get();
    const parametrosSnap = await db.collection('parametros').get();
    res.json({
      ok: true,
      sucursales: sucursalesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      franquicias: franquiciasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      parametros: parametrosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });
  } catch (error) {
    console.error('Error obteniendo matriz:', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo matriz' });
  }
});

app.listen(3001, () => {
  console.log('Backend escuchando en http://localhost:3001');
});