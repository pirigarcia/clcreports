// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAbVVwZAWnuEecGD3c8UP49ezQHd7PQ9MQ",
    authDomain: "clcreports-9083b.firebaseapp.com",
    projectId: "clcreports-9083b",
    storageBucket: "clcreports-9083b.firebasestorage.app",
    messagingSenderId: "312363582020",
    appId: "1:312363582020:web:6951c11e95e946f233f211"
  };
/**
 * Inicializa Firebase y devuelve las instancias necesarias
 * @returns {Promise<{app: Object, db: Object, auth: Object}>} Instancias de Firebase
 */
export const initFirebase = async () => {
    try {
        console.log('Inicializando Firebase...');
        
        // Importaciones dinámicas para code-splitting
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
        const { getFirestore, enableIndexedDbPersistence } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const { getAuth, setPersistence, browserLocalPersistence } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
        
        // Inicializar Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        
        // Configurar persistencia offline
        try {
            await enableIndexedDbPersistence(db);
            console.log('Persistencia offline habilitada');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('La persistencia offline solo puede estar habilitada en una pestaña a la vez.');
            } else if (err.code === 'unimplemented') {
                console.warn('El navegador actual no soporta todas las características necesarias para la persistencia offline');
            }
        }
        
        // Configurar persistencia de autenticación
        await setPersistence(auth, browserLocalPersistence);
        
        console.log('Firebase inicializado correctamente');
        return { app, db, auth };
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
        throw new Error('No se pudo inicializar Firebase. Verifica tu conexión a internet.');
    }
};

/**
 * Obtiene una referencia a la colección de sucursales
 * @param {Object} db - Instancia de Firestore
 * @returns {Object} Referencia a la colección de sucursales
 */
export const getSucursalesRef = (db) => {
    return collection(db, 'sucursales');
};

/**
 * Obtiene una referencia a la colección de evaluaciones
 * @param {Object} db - Instancia de Firestore
 * @returns {Object} Referencia a la colección de evaluaciones
 */
export const getEvaluacionesRef = (db) => {
    return collection(db, 'evaluaciones');
};

/**
 * Obtiene una referencia a la colección de usuarios
 * @param {Object} db - Instancia de Firestore
 * @returns {Object} Referencia a la colección de usuarios
 */
export const getUsuariosRef = (db) => {
    return collection(db, 'usuarios');
};

/**
 * Obtiene una referencia a la colección de parámetros
 * @param {Object} db - Instancia de Firestore
 * @returns {Object} Referencia a la colección de parámetros
 */
export const getParametrosRef = (db) => {
    return collection(db, 'parametros');
};

// Exportar tipos de Firebase para uso en otros módulos
export const firebaseTypes = {
    serverTimestamp: () => {
        return import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js')
            .then(({ serverTimestamp }) => serverTimestamp());
    },
    Timestamp: {
        fromDate: (date) => {
            return import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js')
                .then(({ Timestamp }) => Timestamp.fromDate(date));
        },
        now: () => {
            return import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js')
                .then(({ Timestamp }) => Timestamp.now());
        }
    },
    FieldValue: {
        delete: () => {
            return import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js')
                .then(({ FieldValue }) => FieldValue.delete());
        }
    }
};
