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

// Ejemplo de endpoint seguro (a futuro se protegería con el token de sesión)
app.get('/api/evaluaciones', async (req, res) => {
  // Aquí pones la lógica de consulta a Firestore
  res.json({ ok: true, data: [] });
});

app.listen(3001, () => {
  console.log('Backend escuchando en http://localhost:3001');
});