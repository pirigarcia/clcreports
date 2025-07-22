// Importaciones
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { sucursales, obtenerSucursalPorId } from '../data/sucursales.js';
import { franquicias, obtenerFranquiciaPorId } from '../data/franquicias.js';
import { categorias, parametros } from '../data/parametros.js';
import { showSection, createElement, formatDate, showLoading, hideLoading, showNotification } from './utils/dom.js';

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
const auth = getAuth(app);

// Estado global de la aplicación
const state = {
  currentUser: null,
  sucursales: [],
  evaluaciones: [],
  currentEvaluation: null,
  evaluacionEditando: null
};

// Elementos del DOM
const elements = {
  // Navegación
  navLinks: document.querySelectorAll('[data-section]'),
  userDropdown: document.getElementById('userDropdown'),
  userName: document.querySelector('.user-name'),
  logoutBtn: document.getElementById('logout-btn'),
  
  // Dashboard
  totalEvaluaciones: document.getElementById('total-evaluaciones'),
  promedioGeneral: document.getElementById('promedio-general'),
  evaluacionesMes: document.getElementById('evaluaciones-mes'),
  sucursalDestacada: document.getElementById('sucursal-destacada'),
  puntajeSucursal: document.getElementById('puntaje-sucursal'),
  tablaEvaluaciones: document.getElementById('tabla-evaluaciones'),
  atencionSucursales: document.getElementById('atencion-sucursales'),
  atencionTodasOk: document.getElementById('atencion-todas-ok'),
  
  // Filtros
  filtroForm: document.getElementById('filtro-form'),
  filtroSucursal: document.getElementById('filtro-sucursal'),
  filtroFechaInicio: document.getElementById('filtro-fecha-inicio'),
  filtroFechaFin: document.getElementById('filtro-fecha-fin'),
  
  // Modal de nueva evaluación
  modalNuevaEvaluacion: null,
  formNuevaEvaluacion: document.getElementById('form-nueva-evaluacion'),
  btnNuevaEvaluacion: document.getElementById('nueva-evaluacion'),
  btnGuardarEvaluacion: document.getElementById('guardar-evaluacion'),
  selectSucursal: document.getElementById('sucursal'),
  inputFecha: document.getElementById('fecha'),
  seccionParametros: document.getElementById('seccion-parametros'),
  inputObservaciones: document.getElementById('observaciones'),
  tipoCafeGroup: document.getElementById('tipo-cafe-group'),
  tipoCafeSelect: document.getElementById('tipo-cafe')
};

// Inicialización de la aplicación
async function initApp() {
  try {
    console.log('Inicializando aplicación...');
    
    // Configurar la fecha actual en el input de fecha
    const now = new Date();
    if (elements.inputFecha) {
      elements.inputFecha.value = now.toISOString().slice(0, 16);
    }
    
    // Cargar sucursales
    await cargarSucursales();
    
    // Configurar manejadores de eventos
    setupEventListeners();
    
    // Utilizar Bootstrap Modal del global (window.bootstrap.Modal)
    document.addEventListener('DOMContentLoaded', () => {
      const modalElement = document.getElementById('modalNuevaEvaluacion');
      if (modalElement && window.bootstrap && window.bootstrap.Modal) {
        elements.modalNuevaEvaluacion = new window.bootstrap.Modal(modalElement);
        console.log('Modal de nueva evaluación inicializado');
      } else {
        console.error('No se encontró el modal con id "modalNuevaEvaluacion" o Bootstrap no está cargado');
      }
    });
    
    // Inicializar el dropdown de usuario (Bootstrap)
    document.addEventListener('DOMContentLoaded', () => {
      const userDropdownEl = document.getElementById('userDropdown');
      if (userDropdownEl && window.bootstrap && window.bootstrap.Dropdown) {
        new window.bootstrap.Dropdown(userDropdownEl);
        console.log('Dropdown de usuario inicializado');
      } else {
        console.error('No se encontró el botón userDropdown o Bootstrap no está cargado');
      }
    });
    
    // Observar cambios en la autenticación
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuario autenticado
        state.currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0]
        };
        
        // Actualizar UI
        if (elements.userName) {
          elements.userName.textContent = state.currentUser.displayName;
        }
        // Mostrar/ocultar el botón aquí, cuando ya sabemos quién es el usuario
        if (elements.btnNuevaEvaluacion) {
          elements.btnNuevaEvaluacion.style.display = esAdmin() ? '' : 'none';
        }
        // --- CORRECCIÓN: Establecer sucursales/franquicias visibles según el rol ---
        state.sucursales = obtenerSucursalesVisibles();
        // Cargar evaluaciones
        await cargarEvaluaciones();
      } else {
        // Usuario no autenticado, redirigir a login
        window.location.href = 'login.html';
      }
    });
    
  } catch (error) {
    console.error('Error en initApp:', error);
    showNotification('Error al inicializar la aplicación', 'error');
  }
}

// Cargar sucursales desde el módulo
async function cargarSucursales() {
  try {
    state.sucursales = obtenerSucursalesVisibles();
    llenarSelectSucursales(elements.filtroSucursal, 'Todas las sucursales');
  } catch (error) {
    console.error('Error al cargar sucursales:', error);
    showNotification('Error al cargar las sucursales', 'error');
  }
}

// Llenar un select con las sucursales
function llenarSelectSucursales(selectElement, placeholderText) {
  if (!selectElement) return;
  
  // Limpiar opciones existentes
  selectElement.innerHTML = '';
  
  // Agregar opción por defecto
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = placeholderText;
  defaultOption.disabled = selectElement.id === 'sucursal';
  selectElement.appendChild(defaultOption);
  
  // Agregar opciones de sucursales
  state.sucursales.forEach(sucursal => {
    if (!sucursal.activa) return;
    
    const option = document.createElement('option');
    option.value = sucursal.id;
    option.textContent = sucursal.nombre;
    selectElement.appendChild(option);
  });
}

// Cargar evaluaciones desde Firestore
async function cargarEvaluaciones(filtros = {}) {
  try {
    showLoading();
    let q = collection(db, 'evaluaciones');
    const condiciones = [];
    // Filtrar por sucursales/franquicias según usuario
    if (!esAdmin()) {
      const sucursalesPermitidas = state.sucursales.map(s => s.id);
      if (sucursalesPermitidas.length > 0) {
        condiciones.push(where('sucursalId', 'in', sucursalesPermitidas));
      } else {
        // Si no hay sucursales permitidas, no buscar nada
        state.evaluaciones = [];
        actualizarResumen();
        actualizarTablaEvaluaciones();
        hideLoading();
        return;
      }
    }
    if (filtros.sucursalId) {
      condiciones.push(where('sucursalId', '==', filtros.sucursalId));
    }
    if (filtros.fechaInicio || filtros.fechaFin) {
      const fechas = {};
      if (filtros.fechaInicio) fechas['>='] = new Date(filtros.fechaInicio);
      if (filtros.fechaFin) {
        const fechaFin = new Date(filtros.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        fechas['<='] = fechaFin;
      }
      if (fechas['>=']) condiciones.push(where('fecha', '>=', fechas['>=']));
      if (fechas['<=']) condiciones.push(where('fecha', '<=', fechas['<=']));
    }
    // Construir la query
    if (condiciones.length > 0) {
      q = query(q, ...condiciones);
    }
    console.log('[DEBUG] Sucursales locales:', sucursales.map(s => s.id));
    console.log('[DEBUG] Franquicias locales:', franquicias.map(f => f.id));
    console.log('[DEBUG] Sucursales permitidas para query:', state.sucursales.map(s => s.id));
    console.log('[DEBUG] Es admin:', esAdmin());
    console.log('[DEBUG] Query condiciones:', condiciones);

    const querySnapshot = await getDocs(q);

    console.log('[DEBUG] Evaluaciones recibidas:', querySnapshot.size);
    state.evaluaciones = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('[DEBUG] Evaluación:', doc.id, data);
      let tipo = '';
      if (sucursales.find(s => s.id === data.sucursalId)) {
        tipo = 'sucursal';
      } else if (franquicias.find(f => f.id === data.sucursalId)) {
        tipo = 'franquicia';
      } else {
        tipo = 'desconocido';
      }
      state.evaluaciones.push({
        id: doc.id,
        ...data,
        fecha: data.fecha?.toDate() || new Date(),
        tipo
      });
    });
    actualizarResumen();
    actualizarTablaEvaluaciones();
  } catch (error) {
    console.error('Error al cargar evaluaciones:', error);
    showNotification('Error al cargar las evaluaciones', 'error');
  } finally {
    hideLoading();
  }
}

// Actualizar el resumen del dashboard
function actualizarResumen() {
  // Totales generales y pendientes correctos
  const total = state.evaluaciones.length;

  // Listas completas
  const totalSucursales = sucursales.length;
  const totalFranquicias = franquicias.length;

  // IDs evaluados
  const sucursalesEvaluadas = new Set(
    state.evaluaciones.filter(ev => ev.tipo === 'sucursal' && ev.completada).map(ev => ev.sucursalId)
  );
  const franquiciasEvaluadas = new Set(
    state.evaluaciones.filter(ev => ev.tipo === 'franquicia' && ev.completada).map(ev => ev.sucursalId)
  );

  // Pendientes
  const sucursalesPendientes = sucursales.filter(s => !sucursalesEvaluadas.has(s.id));
  const franquiciasPendientes = franquicias.filter(f => !franquiciasEvaluadas.has(f.id));

  // Mostrar totales en el dashboard
  if (elements.totalEvaluaciones) {
    if (esAdmin()) {
      elements.totalEvaluaciones.innerHTML = `
        <span class="fw-bold" style="font-size:2.2rem;">${total}</span> <span style="font-size:1.1rem;">evaluaciones</span>
        <div class="mt-2 d-flex flex-wrap gap-1">
          <span class="badge bg-primary text-wrap" style="font-size:0.95rem;">${totalSucursales} sucursales</span>
          <span class="badge bg-info text-wrap" style="font-size:0.95rem;">${totalFranquicias} franquicias</span>
          <span class="badge bg-warning text-dark text-wrap" style="font-size:0.95rem;">${sucursalesPendientes.length} sucursal${sucursalesPendientes.length === 1 ? '' : 'es'} pendiente${sucursalesPendientes.length === 1 ? '' : 's'}</span>
          <span class="badge bg-warning text-dark text-wrap" style="font-size:0.95rem;">${franquiciasPendientes.length} franquicia${franquiciasPendientes.length === 1 ? '' : 's'} pendiente${franquiciasPendientes.length === 1 ? '' : 's'}</span>
        </div>
      `;
    } else if (esFranquiciasUser()) {
      elements.totalEvaluaciones.innerHTML = `
        <span class="fw-bold" style="font-size:2.2rem;">${total}</span> <span style="font-size:1.1rem;">evaluaciones</span>
        <div class="mt-2 d-flex flex-wrap gap-1">
          <span class="badge bg-info text-wrap" style="font-size:0.95rem;">${totalFranquicias} franquicias</span>
          <span class="badge bg-warning text-dark text-wrap" style="font-size:0.95rem;">${franquiciasPendientes.length} franquicia${franquiciasPendientes.length === 1 ? '' : 's'} pendiente${franquiciasPendientes.length === 1 ? '' : 's'}</span>
        </div>
      `;
    } else if (esGopUser()) {
      elements.totalEvaluaciones.innerHTML = `
        <span class="fw-bold" style="font-size:2.2rem;">${total}</span> <span style="font-size:1.1rem;">evaluaciones</span>
        <div class="mt-2 d-flex flex-wrap gap-1">
          <span class="badge bg-primary text-wrap" style="font-size:0.95rem;">${totalSucursales} sucursales</span>
          <span class="badge bg-warning text-dark text-wrap" style="font-size:0.95rem;">${sucursalesPendientes.length} sucursal${sucursalesPendientes.length === 1 ? '' : 'es'} pendiente${sucursalesPendientes.length === 1 ? '' : 's'}</span>
        </div>
      `;
    }
  }
  
  // Promedio general
  if (elements.promedioGeneral) {
    const promedio = total > 0
      ? Math.round(state.evaluaciones.reduce((sum, evaluacion) => sum + (evaluacion.puntajeTotal || 0), 0) / total)
      : 0;
    elements.promedioGeneral.textContent = promedio;
    // Cambiar color de fondo en Promedio General según regla
    const promedioGeneralCard = document.querySelector('#promedio-general')?.closest('.card');
    if (promedioGeneralCard) {
      promedioGeneralCard.classList.remove('bg-success', 'bg-warning', 'bg-danger');
      if (promedio >= 96) {
        promedioGeneralCard.classList.add('bg-success');
      } else if (promedio >= 91) {
        promedioGeneralCard.classList.add('bg-warning');
      } else {
        promedioGeneralCard.classList.add('bg-danger');
      }
    }
  }
  
  // Evaluaciones del mes actual
  if (elements.evaluacionesMes) {
    const ahora = new Date();
    const mesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const evaluacionesMes = state.evaluaciones.filter(evaluacion => 
      new Date(evaluacion.fecha) >= mesActual
    ).length;
    elements.evaluacionesMes.textContent = evaluacionesMes;
  }
  
  // Sucursal destacada (la de mayor puntaje promedio)
  if (elements.sucursalDestacada && elements.puntajeSucursal) {
    if (state.evaluaciones.length > 0) {
      const sucursalesPuntaje = {};
      
      state.evaluaciones.forEach(evaluacion => {
        if (!sucursalesPuntaje[evaluacion.sucursalId]) {
          sucursalesPuntaje[evaluacion.sucursalId] = {
            total: 0,
            count: 0,
            promedio: 0
          };
        }
        
        sucursalesPuntaje[evaluacion.sucursalId].total += evaluacion.puntajeTotal || 0;
        sucursalesPuntaje[evaluacion.sucursalId].count++;
      });
      
      // Calcular promedios
      Object.keys(sucursalesPuntaje).forEach(sucursalId => {
        sucursalesPuntaje[sucursalId].promedio = 
          Math.round(sucursalesPuntaje[sucursalId].total / sucursalesPuntaje[sucursalId].count);
      });
      
      // Encontrar la sucursal con mayor puntaje
      let mejorSucursal = null;
      let mejorPuntaje = 0;
      
      Object.entries(sucursalesPuntaje).forEach(([sucursalId, datos]) => {
        if (datos.promedio > mejorPuntaje) {
          mejorPuntaje = datos.promedio;
          mejorSucursal = state.sucursales.find(s => s.id === sucursalId);
        }
      });
      
      if (mejorSucursal) {
        elements.sucursalDestacada.textContent = mejorSucursal.nombre;
        elements.puntajeSucursal.textContent = `${mejorPuntaje}% de cumplimiento`;
      }
    } else {
      elements.sucursalDestacada.textContent = '-';
      elements.puntajeSucursal.textContent = 'No hay datos';
    }
  }
  
  // --- BLOQUE DE ATENCIÓN (SUCURSALES CON BAJO PROMEDIO) ---
  if (elements.atencionSucursales && elements.atencionTodasOk) {
    const atencionCard = document.querySelector('#atencion-block .card');
    // Calcular promedios por sucursal
    const sucursalesMap = {};
    state.evaluaciones.forEach(ev => {
      if (!ev.sucursalId) return;
      if (!sucursalesMap[ev.sucursalId]) {
        sucursalesMap[ev.sucursalId] = { nombre: ev.sucursalNombre, total: 0, count: 0 };
      }
      sucursalesMap[ev.sucursalId].total += ev.puntajeTotal || 0;
      sucursalesMap[ev.sucursalId].count++;
    });
    // Calcular promedio y preparar arreglo
    const promedios = Object.values(sucursalesMap).map(s => ({
      nombre: s.nombre,
      promedio: s.count ? Math.round(s.total / s.count) : 0
    }));
    // Filtrar solo sucursales con promedio menor a 100%
    const promediosFiltrados = promedios.filter(s => s.promedio < 100);
    // Revisar si todas cumplen al 100%
    const todasOk = promedios.length > 0 && promediosFiltrados.length === 0;
    elements.atencionSucursales.innerHTML = '';
    elements.atencionTodasOk.style.display = 'none';
    // Limpiar animación previa y restaurar fondo amarillo
    if (atencionCard) {
      atencionCard.classList.remove('atencion-animada');
      atencionCard.classList.add('bg-warning');
    }
    if (todasOk) {
      elements.atencionTodasOk.style.display = '';
      if (atencionCard) {
        atencionCard.classList.add('atencion-animada');
        atencionCard.classList.remove('bg-warning');
      }
      if (esAdmin()) {
        elements.atencionTodasOk.textContent = '¡Todas las sucursales y franquicias cumplen al 100%!';
      } else if (esFranquiciasUser()) {
        elements.atencionTodasOk.textContent = '¡Todas las franquicias cumplen al 100%!';
      } else {
        elements.atencionTodasOk.textContent = '¡Todas las sucursales cumplen al 100%!';
      }
    } else {
      promediosFiltrados.slice(0, 3).forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="fw-bold">${s.nombre}</span>: <span class="text-danger">${s.promedio}%</span>`;
        elements.atencionSucursales.appendChild(li);
      });
    }
  }
}

// Actualizar la tabla de evaluaciones recientes
function actualizarTablaEvaluaciones() {
  const tabla = document.getElementById('tabla-evaluaciones');
  if (!tabla) return;
  const tbody = tabla.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (state.evaluaciones.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="8" class="text-center py-4 text-muted">
        No se encontraron evaluaciones
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }
  const sucursalesPermitidas = state.sucursales.map(s => s.id);
  const evaluacionesFiltradas = esAdmin()
    ? state.evaluaciones
    : state.evaluaciones.filter(ev => sucursalesPermitidas.includes(ev.sucursalId));
  evaluacionesFiltradas.forEach(evaluacion => {
    let sucursal = { nombre: 'Desconocida' };
    let modelo = 'Cafetería';
    const tipo = evaluacion.tipo === 'sucursal' ? 'Sucursal' : evaluacion.tipo === 'franquicia' ? 'Franquicia' : 'Desconocido';
    if (evaluacion.tipo === 'franquicia') {
      sucursal = franquicias.find(f => f.id === evaluacion.sucursalId) || { nombre: 'Desconocida' };
      if(['dosbocas','cumuapa'].includes(evaluacion.sucursalId)) {
        modelo = 'Móvil';
      } else {
        modelo = 'Cafetería';
      }
    } else {
      sucursal = obtenerSucursalPorId(evaluacion.sucursalId) || { nombre: 'Desconocida' };
      if(['movil-la-venta', 'movil-deportiva'].includes(evaluacion.sucursalId)) {
        modelo = 'Móvil';
      } else if(['walmart-deportiva', 'walmart-carrizal', 'walmart-universidad', 'pista'].includes(evaluacion.sucursalId)) {
        modelo = 'Express';
      } else {
        modelo = 'Cafetería';
      }
    }
    const fecha = formatDate(evaluacion.fecha, 'DD/MM/YYYY HH:mm');
    const estado = evaluacion.completada ? 'Completada' : 'Pendiente';
    const estadoClass = evaluacion.completada ? 'success' : 'warning';
    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${sucursal.nombre}</td>
      <td>${tipo}</td>
      <td>${modelo}</td>
      <td>${evaluacion.usuarioNombre || 'Anónimo'}</td>
      <td>${evaluacion.puntajeTotal || 0}%</td>
      <td><span class="badge bg-${estadoClass}">${estado}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary btn-ver-evaluacion" data-id="${evaluacion.id}">
          <i class="fas fa-eye"></i>
        </button>
        ${esAdmin() ? `
        <button class="btn btn-sm btn-outline-secondary btn-editar-evaluacion ms-1" data-id="${evaluacion.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger btn-eliminar-evaluacion ms-1" data-id="${evaluacion.id}">
          <i class="fas fa-trash"></i>
        </button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Ver los detalles de una evaluación
function verEvaluacion(evaluacionId) {
  const evaluacion = state.evaluaciones.find(e => e.id === evaluacionId);
  if (!evaluacion) return;
  
  // TODO: Implementar vista detallada de la evaluación
  showNotification(`Viendo evaluación de ${evaluacion.sucursalNombre}`, 'info');
  cargarParametrosEvaluacion(); // Asegura que el formulario esté renderizado
  setTimeout(() => {
    rellenarFormularioEvaluacion(evaluacion, true);
    if (elements.modalNuevaEvaluacion) {
      elements.modalNuevaEvaluacion.show();
    }
  }, 200);
}

// Editar una evaluación existente
function esAdmin() {
  const adminEmails = [
    'unknownshoppersmx@gmail.com',
  ];
  // Ajusta esta lógica según cómo determines el rol admin en tu app
  return state.currentUser && adminEmails.includes(state.currentUser.email);
}

function editarEvaluacion(evaluacionId) {
  if (!esAdmin()) {
    showNotification('Solo el administrador puede editar evaluaciones', 'error');
    return;
  }
  const evaluacion = state.evaluaciones.find(e => e.id === evaluacionId);
  if (!evaluacion) return;
  cargarParametrosEvaluacion();
  setTimeout(() => {
    rellenarFormularioEvaluacion(evaluacion, false);
    state.evaluacionEditando = evaluacionId;
    if (elements.modalNuevaEvaluacion) {
      elements.modalNuevaEvaluacion.show();
    }
  }, 200);
}

// Confirmar eliminación de una evaluación
function confirmarEliminarEvaluacion(evaluacionId) {
  if (confirm('¿Estás seguro de que deseas eliminar esta evaluación? Esta acción no se puede deshacer.')) {
    eliminarEvaluacion(evaluacionId);
  }
}

// Eliminar una evaluación
async function eliminarEvaluacion(evaluacionId) {
  try {
    showLoading();
    
    // Eliminar de Firestore
    await deleteDoc(doc(db, 'evaluaciones', evaluacionId));
    // Actualizar UI (historial y resumen)
    const selectorMes = document.getElementById('selectorMes');
    if (selectorMes) {
      await cargarHistorialEvaluaciones(selectorMes.value);
    }
    await cargarEvaluaciones(); // Para refrescar el dashboard
    actualizarResumen();
    showNotification('Evaluación eliminada correctamente', 'success');
  } catch (error) {
    console.error('Error al eliminar la evaluación:', error);
    showNotification('Error al eliminar la evaluación: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Cargar parámetros para la evaluación en el formulario
function cargarParametrosEvaluacion() {
  if (!elements.seccionParametros) return;
  elements.seccionParametros.innerHTML = '';

  // Para cada categoría, buscar parámetros asociados
  categorias.forEach((categoria) => {
    const categoriaDiv = document.createElement('div');
    categoriaDiv.className = 'categoria-evaluacion mb-4';
    categoriaDiv.dataset.categoriaId = categoria.id;

    // Título de la categoría
    const tituloCategoria = document.createElement('h5');
    tituloCategoria.className = 'mb-3';
    tituloCategoria.textContent = categoria.nombre;
    categoriaDiv.appendChild(tituloCategoria);

    // Descripción de la categoría (si existe)
    if (categoria.descripcion) {
      const descCategoria = document.createElement('p');
      descCategoria.className = 'text-muted small mb-3';
      descCategoria.textContent = categoria.descripcion;
      categoriaDiv.appendChild(descCategoria);
    }

    // Contenedor de parámetros
    const parametrosContainer = document.createElement('div');
    parametrosContainer.className = 'parametros-container';

    // Buscar parámetros por categoriaId
    const parametrosCategoria = parametros.filter(p => p.categoriaId === categoria.id);
    if (parametrosCategoria.length > 0) {
      parametrosCategoria.forEach((parametro, paramIndex) => {
        const parametroDiv = document.createElement('div');
        parametroDiv.className = 'parametro-evaluacion card mb-3';
        parametroDiv.dataset.parametroId = parametro.id;

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        // --- NUEVO DISEÑO: parámetro y opciones en una sola fila ---
        const filaParam = document.createElement('div');
        filaParam.className = 'd-flex align-items-center flex-wrap gap-3';

        // Título del parámetro
        const tituloParam = document.createElement('span');
        tituloParam.className = 'fw-semibold';
        tituloParam.textContent = parametro.nombre;
        filaParam.appendChild(tituloParam);

        // Opciones 1 (Sí/Cumple) y 0 (No/No cumple) para todos los parámetros
        const opcionesDiv = document.createElement('div');
        opcionesDiv.className = 'opciones-puntuacion';
        // Sí/Cumple
        const opcionSiDiv = document.createElement('div');
        opcionSiDiv.className = 'form-check form-check-inline';
        const inputSi = document.createElement('input');
        inputSi.className = 'form-check-input';
        inputSi.type = 'radio';
        inputSi.name = `param-${categoria.id}-${parametro.id}`;
        inputSi.id = `param-${categoria.id}-${parametro.id}-1`;
        inputSi.value = 1;
        inputSi.required = true;
        inputSi.checked = true; // <-- SELECCIONADO POR DEFECTO
        const labelSi = document.createElement('label');
        labelSi.className = 'form-check-label';
        labelSi.htmlFor = inputSi.id;
        labelSi.textContent = 'Sí (1)';
        opcionSiDiv.appendChild(inputSi);
        opcionSiDiv.appendChild(labelSi);
        opcionesDiv.appendChild(opcionSiDiv);
        // No/No cumple
        const opcionNoDiv = document.createElement('div');
        opcionNoDiv.className = 'form-check form-check-inline';
        const inputNo = document.createElement('input');
        inputNo.className = 'form-check-input';
        inputNo.type = 'radio';
        inputNo.name = `param-${categoria.id}-${parametro.id}`;
        inputNo.id = `param-${categoria.id}-${parametro.id}-0`;
        inputNo.value = 0;
        inputNo.required = true;
        const labelNo = document.createElement('label');
        labelNo.className = 'form-check-label';
        labelNo.htmlFor = inputNo.id;
        labelNo.textContent = 'No (0)';
        opcionNoDiv.appendChild(inputNo);
        opcionNoDiv.appendChild(labelNo);
        opcionesDiv.appendChild(opcionNoDiv);

        filaParam.appendChild(opcionesDiv);
        cardBody.appendChild(filaParam);

        // Descripción del parámetro (si existe)
        if (parametro.descripcion) {
          const descParam = document.createElement('p');
          descParam.className = 'card-text text-muted small mb-0';
          descParam.textContent = parametro.descripcion;
          cardBody.appendChild(descParam);
        }
        parametroDiv.appendChild(cardBody);
        parametrosContainer.appendChild(parametroDiv);
      });
    } else {
      // Mensaje si no hay parámetros en la categoría
      const sinParametros = document.createElement('div');
      sinParametros.className = 'alert alert-info';
      sinParametros.textContent = 'No hay parámetros definidos para esta categoría.';
      parametrosContainer.appendChild(sinParametros);
    }
    categoriaDiv.appendChild(parametrosContainer);
    elements.seccionParametros.appendChild(categoriaDiv);
  });
}

// Rellenar el formulario de evaluación con datos existentes y modo lectura/editable
function rellenarFormularioEvaluacion(evaluacion, modoLectura = false) {
  // Fecha
  if (elements.inputFecha) {
    elements.inputFecha.value = new Date(evaluacion.fecha).toISOString().slice(0, 16);
    elements.inputFecha.disabled = modoLectura;
  }
  // Sucursal
  if (elements.selectSucursal) {
    elements.selectSucursal.value = evaluacion.sucursalId;
    elements.selectSucursal.disabled = modoLectura;
  }
  // Observaciones
  if (elements.inputObservaciones) {
    elements.inputObservaciones.value = evaluacion.observaciones || '';
    elements.inputObservaciones.readOnly = modoLectura;
  }
  // Parámetros
  if (Array.isArray(evaluacion.respuestas)) {
    evaluacion.respuestas.forEach(rta => {
      const inputName = `param-${rta.categoriaId}-${rta.parametroId}`;
      const radio = document.querySelector(`input[name="${inputName}"][value="${rta.valor}"]`);
      if (radio) {
        radio.checked = true;
        radio.disabled = modoLectura;
      }
      // Deshabilitar ambos radios si modoLectura
      if (modoLectura) {
        const radios = document.getElementsByName(inputName);
        radios.forEach(r => r.disabled = true);
      }
    });
  }
  // Botones
  if (elements.btnGuardarEvaluacion) {
    elements.btnGuardarEvaluacion.style.display = modoLectura ? 'none' : '';
  }
  const btnCerrar = document.getElementById('btnCerrarEvaluacion');
  if (btnCerrar) {
    btnCerrar.style.display = modoLectura ? '' : 'none';
  }
}

// Guardar una nueva evaluación
async function guardarEvaluacion() {
  try {
    // Validar que el usuario esté autenticado
    if (!state.currentUser) {
      showNotification('Debes iniciar sesión para guardar evaluaciones', 'error');
      return;
    }

    // Validar que se haya seleccionado una sucursal
    const sucursalId = elements.selectSucursal?.value;
    if (!sucursalId) {
      showNotification('Por favor selecciona una sucursal', 'error');
      elements.selectSucursal.focus();
      return;
    }

    // Validar la fecha
    const fecha = elements.inputFecha?.value;
    if (!fecha) {
      showNotification('Por favor ingresa una fecha de evaluación', 'error');
      elements.inputFecha.focus();
      return;
    }

    // Validar que se hayan respondido todos los parámetros requeridos
    const parametrosNoRespondidos = [];
    categorias.forEach((categoria) => {
      const parametrosCategoria = parametros.filter(p => p.categoriaId === categoria.id);
      parametrosCategoria.forEach((parametro) => {
        const inputName = `param-${categoria.id}-${parametro.id}`;
        const radioSelected = document.querySelector(`input[name="${inputName}"]:checked`);
        if (!radioSelected) {
          parametrosNoRespondidos.push(parametro.nombre);
        }
      });
    });

    if (parametrosNoRespondidos.length > 0) {
      showNotification(`Por favor responde todos los parámetros. Faltan: ${parametrosNoRespondidos.join(', ')}`, 'error');
      return;
    }

    // Mostrar indicador de carga
    showLoading('Guardando evaluación...');

    // Obtener la sucursal o franquicia seleccionada
    let sucursal = state.sucursales.find(s => s.id === sucursalId);
    if (!sucursal) {
      // Buscar en franquicias si no se encontró en sucursales
      sucursal = franquicias.find(f => f.id === sucursalId);
    }
    if (!sucursal) {
      throw new Error('No se encontró la sucursal seleccionada');
    }

    // Recolectar respuestas de los parámetros
    const respuestas = [];
    let puntajeTotal = 0;
    let totalParametros = 0;

    categorias.forEach((categoria) => {
      const parametrosCategoria = parametros.filter(p => p.categoriaId === categoria.id);
      parametrosCategoria.forEach((parametro) => {
        const inputName = `param-${categoria.id}-${parametro.id}`;
        const radioSelected = document.querySelector(`input[name="${inputName}"]:checked`);
        const valor = radioSelected ? parseInt(radioSelected.value) : 0;
        respuestas.push({
          categoriaId: categoria.id,
          categoriaNombre: categoria.nombre,
          parametroId: parametro.id,
          parametroNombre: parametro.nombre,
          valor,
          peso: parametro.peso || 1
        });
        puntajeTotal += valor;
        totalParametros += 1;
      });
    });

    // Calcular puntaje final (0-100%)
    const puntajeFinal = totalParametros > 0
      ? Math.round((puntajeTotal / totalParametros) * 100)
      : 0;

    // --- LOG PARA DEPURACIÓN ---
    console.log('Respuestas:', respuestas);
    console.log('Puntaje calculado:', puntajeFinal, 'Total parámetros:', totalParametros, 'Total positivos:', puntajeTotal);

    // Crear objeto de evaluación
    const evaluacion = {
      sucursalId,
      sucursalNombre: sucursal.nombre,
      fecha: new Date(fecha),
      usuarioId: state.currentUser.uid,
      usuarioNombre: state.currentUser.displayName || 'Usuario',
      usuarioEmail: state.currentUser.email || '',
      observaciones: elements.inputObservaciones?.value || '',
      respuestas,
      puntajeTotal: puntajeFinal,
      completada: true,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    };

    // Guardar en Firestore
    if (state.evaluacionEditando) {
      await setDoc(doc(db, 'evaluaciones', state.evaluacionEditando), evaluacion);
      state.evaluacionEditando = null;
    } else {
      const docRef = await addDoc(collection(db, 'evaluaciones'), evaluacion);
    }

    // Actualizar UI
    showNotification('Evaluación guardada correctamente', 'success');

    // Cerrar el modal
    if (elements.modalNuevaEvaluacion) {
      elements.modalNuevaEvaluacion.hide();
    }

    // Recargar evaluaciones
    await cargarEvaluaciones();

    // Limpiar formulario
    if (elements.formNuevaEvaluacion) {
      elements.formNuevaEvaluacion.reset();
    }

    // Restablecer la fecha actual
    const now = new Date();
    if (elements.inputFecha) {
      elements.inputFecha.value = now.toISOString().slice(0, 16);
    }

  } catch (error) {
    console.error('Error al guardar la evaluación:', error);
    showNotification(`Error al guardar la evaluación: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

// Configurar manejadores de eventos
function setupEventListeners() {
  // Navegación
  elements.navLinks?.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = e.currentTarget.getAttribute('data-section');
      showSection(sectionId);
      
      // Actualizar clase activa
      elements.navLinks?.forEach(l => l.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });
  
  // Cerrar sesión
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        // Limpiar estado y redirigir al login
        state.currentUser = null;
        showNotification('Sesión cerrada correctamente', 'success');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showNotification('Error al cerrar sesión', 'error');
      }
    });
  }
  
  // Filtros
  if (elements.filtroForm) {
    elements.filtroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const filtros = {
        sucursalId: elements.filtroSucursal?.value || null,
        fechaInicio: elements.filtroFechaInicio?.value || null,
        fechaFin: elements.filtroFechaFin?.value || null
      };
      cargarEvaluaciones(filtros);
    });
  }
  
  // Toggle de filtro de mis evaluaciones
  const toggleMisEvaluaciones = document.getElementById('solo-mis-evaluaciones');
  if (toggleMisEvaluaciones) {
    toggleMisEvaluaciones.addEventListener('change', () => {
      const filtros = {
        sucursalId: elements.filtroSucursal?.value || null,
        fechaInicio: elements.filtroFechaInicio?.value || null,
        fechaFin: elements.filtroFechaFin?.value || null
      };
      cargarEvaluaciones(filtros);
    });
  }
  
  // Nueva evaluación
  if (elements.btnNuevaEvaluacion) {
    console.log('Configurando evento para el botón de nueva evaluación');
    elements.btnNuevaEvaluacion.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Botón de nueva evaluación clickeado');
      
      // Verificar que el usuario esté autenticado
      if (!state.currentUser) {
        showNotification('Por favor inicia sesión para crear una evaluación', 'error');
        return;
      }
      
      // Verificar que el modal esté inicializado
      if (!elements.modalNuevaEvaluacion) {
        console.error('El modal no está inicializado');
        showNotification('Error al cargar el formulario de evaluación', 'error');
        return;
      }
      
      try {
        // Cargar las sucursales en el select
        if (elements.selectSucursal) {
          console.log('Cargando sucursales en el select');
          //llenarSelectSucursales(elements.selectSucursal, 'Seleccione una sucursal');
        } else {
          console.error('No se encontró el select de sucursales');
        }
        
        // Cargar los parámetros de evaluación
        console.log('Cargando parámetros de evaluación');
        await cargarParametrosEvaluacion();
        
        // Mostrar el modal
        console.log('Mostrando el modal de nueva evaluación');
        elements.modalNuevaEvaluacion.show();
        
      } catch (error) {
        console.error('Error al cargar el formulario de evaluación:', error);
        showNotification('Error al cargar el formulario de evaluación', 'error');
      }
    });
  } else {
    console.error('No se encontró el botón de nueva evaluación');
  }
  
  // Guardar evaluación
  if (elements.btnGuardarEvaluacion) {
    elements.btnGuardarEvaluacion.addEventListener('click', guardarEvaluacion);
  }
  
  // Cerrar modal al hacer clic en el botón de cancelar
  const btnCancelar = document.querySelector('[data-bs-dismiss="modal"]');
  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      elements.modalNuevaEvaluacion.hide();
    });
  }
}

// Inicializar el modal de Bootstrap para nueva evaluación después de que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  const modalElement = document.getElementById('modalNuevaEvaluacion');
  if (modalElement && window.bootstrap && window.bootstrap.Modal) {
    elements.modalNuevaEvaluacion = new window.bootstrap.Modal(modalElement);
    console.log('Modal de nueva evaluación inicializado');
  } else {
    console.error('No se encontró el modal con id "modalNuevaEvaluacion" o Bootstrap no está cargado');
  }
});

// Inicializar el dropdown de usuario (Bootstrap)
document.addEventListener('DOMContentLoaded', () => {
  const userDropdownEl = document.getElementById('userDropdown');
  if (userDropdownEl && window.bootstrap && window.bootstrap.Dropdown) {
    new window.bootstrap.Dropdown(userDropdownEl);
    console.log('Dropdown de usuario inicializado');
  } else {
    console.error('No se encontró el botón userDropdown o Bootstrap no está cargado');
  }
});

// Recargar el select de sucursal/franquicia cada vez que se abre el modal
const modalNuevaEvaluacionEl = document.getElementById('modalNuevaEvaluacion');
if (modalNuevaEvaluacionEl) {
  modalNuevaEvaluacionEl.addEventListener('show.bs.modal', () => {
    const tipo = esAdmin() && elements.tipoCafeSelect ? elements.tipoCafeSelect.value : (esFranquiciasUser() ? 'franquicia' : 'sucursal');
    cargarSucursalesModal(tipo);
  });
}

// Evento para mostrar/ocultar al cambiar tipo
if (elements.tipoCafeSelect) {
  elements.tipoCafeSelect.addEventListener('change', mostrarOcultarModeloFranquicia);
}
// Evento para actualizar modelo al cambiar sucursal/franquicia seleccionada
if (elements.selectSucursal) {
  elements.selectSucursal.addEventListener('change', mostrarOcultarModeloFranquicia);
}

// Al abrir el modal, establecer visibilidad correcta
// Ya existe modalNuevaEvaluacionEl arriba, solo úsala aquí sin el 'const'
modalNuevaEvaluacionEl.addEventListener('show.bs.modal', mostrarOcultarModeloFranquicia);

// --- INICIO LÓGICA DE FILTRADO SUCURSALES/FRANQUICIAS ---
// Lista de franquicias (nombre exacto)
const NOMBRES_FRANQUICIAS = [
  'Vía 2',
  'City center',
  'Cárdenas',
  'Paraíso',
  'Dos Bocas',
  'Cumuapa',
  'Cunduacán',
  'Jalpa de Méndez',
  'Cd del Cármen'
];

function esFranquiciasUser() {
  return state.currentUser && state.currentUser.email === 'franquicias@cafelacabana.com';
}

function esGopUser() {
  return state.currentUser && state.currentUser.email === 'gop@cafelacabana.com';
}

// Filtra las sucursales según el usuario logueado
function obtenerSucursalesVisibles() {
  if (esAdmin()) return [...sucursales, ...franquicias];
  if (esFranquiciasUser()) {
    return [...franquicias];
  }
  if (esGopUser()) {
    return [...sucursales];
  }
  return [];
}

// --- FIN LÓGICA DE FILTRADO SUCURSALES/FRANQUICIAS ---

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Ocultar todas las secciones excepto dashboard al cargar
  document.querySelectorAll('.section-content').forEach(sec => {
    if (sec.id === 'dashboard') {
      sec.style.display = '';
    } else {
      sec.style.display = 'none';
    }
  });

  // Manejar clics en la barra de navegación
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      document.querySelectorAll('.section-content').forEach(sec => {
        sec.style.display = (sec.id === section) ? '' : 'none';
      });
      // Lanzar evento personalizado para lógica extra si es necesario
      document.dispatchEvent(new CustomEvent('sectionShown', { detail: { sectionId: section } }));
    });
  });

  initApp().catch(error => {
    console.error('Error al inicializar la aplicación:', error);
    showNotification('Error al iniciar la aplicación', 'error');
  });
});

// --- GRÁFICA GENERAL DE SUCURSALES ---
async function cargarHistorialEvaluaciones(yyyymm) {
  console.log('Cargando historial para:', yyyymm);
  
  // yyyy-mm
  const [year, month] = yyyymm.split('-');
  const inicio = new Date(Number(year), Number(month) - 1, 1);
  const fin = new Date(Number(year), Number(month), 1, 0, 0, 0); // primer día del mes siguiente

  // LOG: Verifica el rango de fechas
  console.log('Rango de consulta:', inicio, fin);

  // Consulta Firestore por evaluaciones de ese rango de fechas
  const q = query(
    collection(db, 'evaluaciones'),
    where('fecha', '>=', inicio),
    where('fecha', '<', fin),
    orderBy('fecha', 'desc')
  );
  const snapshot = await getDocs(q);
  const rows = [];
  snapshot.forEach(docSnap => {
    const ev = docSnap.data();
    rows.push({
      id: docSnap.id,
      fecha: ev.fecha.toDate ? ev.fecha.toDate() : new Date(ev.fecha),
      sucursal: ev.sucursalNombre,
      evaluador: ev.usuarioNombre || '',
      puntaje: ev.puntajeTotal || 0,
      estado: ev.completada ? 'Completada' : 'Pendiente',
    });
  });
  // LOG: Verifica los resultados obtenidos
  console.log('Rows:', rows);
  renderTablaHistorial(rows);
}

function renderTablaHistorial(rows) {
  const tbody = document.getElementById('tablaHistorialEvaluaciones');
  if (!tbody) {
    console.warn('No se encontró el tbody de historial de evaluaciones');
    return;
  }
  tbody.innerHTML = '';
  rows.forEach(ev => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ev.fecha.toLocaleDateString()}</td>
      <td>${ev.sucursal}</td>
      <td>${ev.evaluador}</td>
      <td>${ev.puntaje}%</td>
      <td>${ev.estado}</td>
      <td>
        <button class="btn btn-outline-primary btn-sm" title="Ver evaluación" onclick="verEvaluacion('${ev.id}')">
          <i class="fas fa-eye"></i>
        </button>
        ${esAdmin() ? `<button class="btn btn-outline-success btn-sm" title="Editar evaluación" onclick="editarEvaluacion('${ev.id}')">
          <i class="fas fa-pencil-fill"></i>
        </button>` : ''}
        ${esAdmin() ? `<button class="btn btn-outline-danger btn-sm" title="Eliminar evaluación" onclick="eliminarEvaluacion('${ev.id}')">
          <i class="fas fa-trash"></i>
        </button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- HISTORIAL DE EVALUACIONES POR MES ---
let graficaSucursales = null;

function mostrarGraficaSucursales() {
  // Agrupa evaluaciones por sucursal y calcula promedio
  const sucursalesMap = {};
  state.evaluaciones.forEach(ev => {
    if (!ev.sucursalNombre) return;
    if (!sucursalesMap[ev.sucursalNombre]) {
      sucursalesMap[ev.sucursalNombre] = { total: 0, count: 0 };
    }
    sucursalesMap[ev.sucursalNombre].total += ev.puntajeTotal || 0;
    sucursalesMap[ev.sucursalNombre].count++;
  });
  const labels = Object.keys(sucursalesMap);
  const data = labels.map(suc => {
    const s = sucursalesMap[suc];
    return s.count ? Math.round(s.total / s.count) : 0;
  });
  const ctx = document.getElementById('graficaSucursales')?.getContext('2d');
  if (!ctx) return;
  if (graficaSucursales) {
    graficaSucursales.destroy();
  }
  // Asignar color según el puntaje de cada sucursal
  const backgroundColors = data.map(score => {
    if (score >= 96) return '#198754'; // verde (Bootstrap bg-success)
    if (score >= 91) return '#ffc107'; // amarillo (Bootstrap bg-warning)
    return '#dc3545'; // rojo (Bootstrap bg-danger)
  });
  graficaSucursales = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Puntaje promedio (%)',
        data: data,
        backgroundColor: backgroundColors
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

document.addEventListener('sectionShown', (e) => {
  if (e.detail.sectionId === 'reportes') {
    mostrarGraficaSucursales();
  }
});

// Hacer funciones globales para el HTML inline onclick
window.verEvaluacion = verEvaluacion;
window.editarEvaluacion = editarEvaluacion;
window.eliminarEvaluacion = eliminarEvaluacion;

// Mostrar u ocultar el selector de modelo de franquicia en el modal según el tipo seleccionado
function mostrarOcultarModeloFranquicia() {
  const grupoModelo = document.getElementById('grupo-modelo-franquicia');
  const selectModelo = document.getElementById('modelo-franquicia');
  const tipo = elements.tipoCafeSelect ? elements.tipoCafeSelect.value : '';
  if (grupoModelo && selectModelo) {
    if (tipo === 'franquicia') {
      grupoModelo.style.display = '';
      // Si la franquicia ya tiene modelo, seleccionarlo
      const franquiciaSeleccionada = franquicias.find(f => f.id === (elements.selectSucursal ? elements.selectSucursal.value : ''));
      if (franquiciaSeleccionada && franquiciaSeleccionada.modelo) {
        selectModelo.value = franquiciaSeleccionada.modelo;
      } else {
        selectModelo.value = 'Cafetería';
      }
    } else {
      grupoModelo.style.display = 'none';
    }
  }
}
