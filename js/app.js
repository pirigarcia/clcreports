// --- IMPORTS Y DATOS ---
import { initUI } from './ui.js';
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
let sucursales, obtenerSucursalPorId, franquicias, obtenerFranquiciaPorId;
try {
  // Intentar import estándar (funciona en localhost)
  ({ sucursales, obtenerSucursalPorId } = await import('../data/sucursales.js'));
  ({ franquicias, obtenerFranquiciaPorId } = await import('../data/franquicias.js'));
} catch (e) {
  try {
    // Intentar ruta absoluta para GitHub Pages
    ({ sucursales, obtenerSucursalPorId } = await import('/clcreports/data/sucursales.js'));
    ({ franquicias, obtenerFranquiciaPorId } = await import('/clcreports/data/franquicias.js'));
  } catch (e2) {
    try {
      // Intentar ruta relativa desde raíz del proyecto
      ({ sucursales, obtenerSucursalPorId } = await import('./data/sucursales.js'));
      ({ franquicias, obtenerFranquiciaPorId } = await import('./data/franquicias.js'));
    } catch (e3) {
      console.error('[CRÍTICO] No se pudieron cargar los datos de sucursales o franquicias en ningún entorno.', e, e2, e3);
      alert('Error crítico: No se pudieron cargar los datos de sucursales/franquicias. Por favor, contacta al administrador.');
    }
  }
}
window.sucursales = sucursales;
window.franquicias = franquicias;
import { categorias, parametros, getParametrosPorCategoria, getParametroPorId, getParametrosParaSucursal, getPuntajeMaximo } from '../data/parametros.js';
import { videoLinks } from '../data/video_links.js';
import { parametrosExcluidosPorSucursal, parametrosExcluidosPorFranquicia } from '../data/parametros_excluidos.js';
// window.parametrosData = parametros; // Si necesitas la variable global, ya está definida en el archivo de datos
import { showSection, createElement, formatDate, showLoading, hideLoading, showNotification } from './utils/dom.js';

// --- Función para detectar si el usuario actual es admin ---
function esUsuarioAdmin() {
  if (!window.state || !window.state.currentUser || !window.usuarios) return false;
  const email = window.state.currentUser.email;
  const usuario = window.usuarios.find(u => u.email === email);
  return usuario && usuario.rol === 'admin';
}

// --- Función dummy temporal para evitar error crítico ---
function esFranquiciasUser() {
  // TODO: Implementa la lógica real según el usuario autenticado
  return false;
}

function esGopUser() {
  // TODO: Implementa la lógica real según el usuario autenticado
  return false;
}

// --- Declaración global para la gráfica de sucursales ---
let graficaSucursales = null;

// --- ESTADO GLOBAL Y ELEMENTOS ---
(async () => {
  // Cargar configuración de Firebase desde backend
  const firebaseConfig = {
    apiKey: "AIzaSyAbVVwZAWnuEecGD3c8UP49ezQHd7PQ9MQ",
    authDomain: "clcreports-9083b.firebaseapp.com",
    projectId: "clcreports-9083b",
    storageBucket: "clcreports-9083b.appspot.com",
    messagingSenderId: "312363582020",
    appId: "1:312363582020:web:6951c11e95e946f233f211"
    // ...otros campos si es necesario
  };

  // Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  // Exponer a window para depuración
  window.firebaseApp = app;
  window.db = db;
  window.auth = auth;

  // Inicializar UI SPA (login, listeners, etc)
  initUI();

  // Estado global y elementos
  window.state = { currentUser: null, sucursales: [], evaluaciones: [], currentEvaluation: null, evaluacionEditando: null };
  window.elements = {
    // ...otros elementos
    navLinks: document.querySelectorAll('.nav-link')
  };

  // --- AUTENTICACIÓN Y CARGA SEGURA DE DATOS ---
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Usuario autenticado:", user.email);
      // Mostrar nombre/email en la UI
      const userNameElement = document.querySelector('.user-name');
      if (userNameElement) {
        userNameElement.textContent = user.email || user.displayName || "Usuario";
      }
      initApp().catch(error => {
        console.error('Error al inicializar la aplicación:', error);
        showNotification('Error al iniciar la aplicación', 'error');
      });
    } else {
      // Limpiar usuario global y mostrar sección de login
      window.state.currentUser = null;
      if (typeof showSection === 'function') {
        showSection('login');
      }
      // Si tienes elementos de UI que dependen del usuario, límpialos aquí
      const userNameElement = document.querySelector('.user-name');
      if (userNameElement) {
        userNameElement.textContent = '';
      }
    }
  });

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
        const sectionId = e.currentTarget.getAttribute('data-section');
        showSection(sectionId);
      });
    });

    // Agregar funcionalidad al botón Filtrar
    const filtroForm = document.getElementById('filtro-form');
    if (filtroForm) {
      filtroForm.addEventListener('submit', function(e) {
        e.preventDefault();
        actualizarResumen();
        actualizarTablaEvaluaciones();
      });
    }
  });
})();

// --- EVENTOS PARA CARGA DINÁMICA DE SECCIONES ---
document.addEventListener('sectionShown', (e) => {
  if (e.detail.sectionId === 'dashboard') {
    // Forzar selector al mes actual si no hay valor
    const selectorMes = document.getElementById('selectorMes');
    if (selectorMes && !selectorMes.value) {
      const now = new Date();
      const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      selectorMes.value = yyyymm;
    }
    actualizarResumen();
    actualizarTablaEvaluaciones();
  }
  if (e.detail.sectionId === 'evaluaciones') {
    const selectorMes = document.getElementById('selectorMes');
    if (selectorMes) {
      cargarHistorialEvaluaciones(selectorMes.value);
      if (!selectorMes.dataset.listenerAttached) {
        selectorMes.addEventListener('change', () => {
          cargarHistorialEvaluaciones(selectorMes.value);
        });
        selectorMes.dataset.listenerAttached = "true";
      }
    }
  }
  if (e.detail.sectionId === 'reportes') {
    mostrarGraficaSucursales();
  }
  if (e.detail.sectionId === 'matriz') {
    renderizarMatriz();
  }
  if (e.detail.sectionId === 'parametros') {
    // renderValoresList();
  }
});

// --- MATRIZ ---
function renderizarMatriz() {
  const contenedor = document.getElementById('contenedor-matriz');
  if (!contenedor) return;
  let lista = [];
  if (typeof esGopUser === 'function' && esGopUser()) {
    lista = sucursales;
  } else if (typeof esFranquiciasUser === 'function' && esFranquiciasUser()) {
    lista = franquicias;
  } else {
    lista = [...sucursales, ...franquicias];
  }
  if (!window.parametros || lista.length === 0) {
    contenedor.innerHTML = `<div class="alert alert-warning">No hay datos para mostrar.</div>`;
    return;
  }
  const parametros = window.parametros;
  let html = '<div class="table-responsive"><table class="table table-bordered table-hover matriz-table">';
  html += '<thead><tr><th style="min-width:220px;max-width:320px;width:28%">Parámetro</th>';
  const colWidth = '110px'; // ancho fijo para todas las sucursales/franquicias
  lista.forEach(item => { html += `<th style="width:${colWidth};min-width:${colWidth};max-width:${colWidth};text-align:center;">${item.nombre}</th>`; });
  html += '</tr></thead><tbody>';
  safeForEachParametros(param => {
    html += `<tr><td style="min-width:220px;max-width:320px;width:28%"><span data-bs-toggle="tooltip" title="${param.descripcion || ''}">${param.nombre}</span></td>`;
    lista.forEach(item => {
      const excluidos = (window.obtenerParametrosExcluidos && window.obtenerParametrosExcluidos(item.id)) || [];
      const esExcluido = excluidos.includes(param.nombre);
      if (esExcluido) {
        // Siempre celda negra, aunque haya evaluación
        html += `<td class="bg-dark text-white" style="width:110px;min-width:110px;max-width:110px;text-align:center;" data-bs-toggle="tooltip" title="No aplica">NA</td>`;
      } else {
        let valor = '';
        if (window.state && Array.isArray(state.evaluaciones)) {
          // Aplica el mismo ancho a las celdas de valor
          const evals = state.evaluaciones
            .filter(ev => (ev.sucursalId === item.id || ev.franquiciaId === item.id) && ev.resultados && typeof ev.resultados === 'object')
            .sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0));
          if (evals.length > 0) {
            // Busca valor del parámetro en la evaluación más reciente
            const resultado = evals[0].respuestas[param.id] ?? evals[0].respuestas[param.nombre];
            if (typeof resultado !== 'undefined' && resultado !== null && resultado !== '') {
              valor = resultado;
            } else {
              valor = '—';
            }
          } else {
            valor = '—';
          }
        } else {
          valor = '—';
        }
        html += `<td style="width:110px;min-width:110px;max-width:110px;text-align:center;">${valor}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
  if (window.bootstrap && window.bootstrap.Tooltip) {
    contenedor.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      new window.bootstrap.Tooltip(el);
    });
  }
}

// --- INICIALIZACIÓN DE LA APP ---
async function initApp() {
  // Inicializar Firebase
  state.currentUser = auth.currentUser;

  window.datosCargados = false;
  showLoading('Cargando datos...');
  // Cargar sucursales y franquicias
  await cargarSucursales();
  await cargarFranquicias();
  window.datosCargados = true;

  // Cargar evaluaciones
  await cargarEvaluaciones();

  // Actualizar dashboard después de cargar datos
  actualizarResumen();
  // Solo llamar después de que sucursales y franquicias estén listas
  actualizarTablaEvaluaciones();
  hideLoading();

  // Inicializar la matriz
  renderizarMatriz();
}

// --- CARGAR SUCURSALES ---
async function cargarSucursales() {
  const sucursalesRef = collection(db, 'sucursales');
  const q = query(sucursalesRef);
  const querySnapshot = await getDocs(q);
  state.sucursales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
window.sucursales = state.sucursales; // sincroniza arrays globales
}

// --- CARGAR FRANQUICIAS ---
async function cargarFranquicias() {
  const franquiciasRef = collection(db, 'franquicias');
  const q = query(franquiciasRef);
  const querySnapshot = await getDocs(q);
  state.franquicias = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  window.franquicias = state.franquicias; // sincroniza arrays globales
}

// --- CARGAR EVALUACIONES ---
async function cargarEvaluaciones() {
  console.log("Entrando a cargarEvaluaciones()");
  const evaluacionesRef = collection(db, 'evaluaciones');
  const q = query(evaluacionesRef);
  try {
    const querySnapshot = await getDocs(q);
    console.log("Evaluaciones recibidas:", querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    state.evaluaciones = querySnapshot.docs.map(doc => {
      const data = { id: doc.id, ...doc.data() };
      data.puntajeTotal = Number(data.puntajeTotal);
      if (isNaN(data.puntajeTotal)) data.puntajeTotal = 0;
      return data;
    });
  } catch (error) {
    console.error("Error al obtener evaluaciones:", error);
    state.evaluaciones = [];
  }
}

// --- ACTUALIZAR TARJETAS DE RESUMEN DEL DASHBOARD ---
function actualizarResumen() {
  // Filtra solo evaluaciones del mes seleccionado
  const selectorMes = document.getElementById('selectorMes');
  let yyyymm = selectorMes?.value;
  if (!yyyymm) {
    // Si no hay selector, usar mes actual
    const now = new Date();
    yyyymm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }
  const [year, month] = yyyymm.split('-');
  const inicio = new Date(Number(year), Number(month) - 1, 1);
  const fin = new Date(Number(year), Number(month), 1);
  const evaluacionesValidas = state.evaluaciones.filter(ev => {
    if (!ev.fecha) return false;
    let d = null;
    if (typeof ev.fecha.toDate === 'function') {
      d = ev.fecha.toDate();
    } else {
      d = new Date(ev.fecha);
    }
    return d >= inicio && d < fin;
  });
  console.log('[DASHBOARD] Resumen para mes:', yyyymm, 'Evaluaciones:', evaluacionesValidas.length, evaluacionesValidas);

  // 1. Total de evaluaciones
  const total = evaluacionesValidas.length;
  const totalElement = document.getElementById('resumen-total');
  if (totalElement) totalElement.textContent = total;

  // 2. Promedio general
  let promedio = 0;
  if (total > 0) {
    promedio = Math.round(
      evaluacionesValidas.reduce((acc, ev) => acc + (ev.puntajeTotal || 0), 0) / total
    );
  }
  const promedioElement = document.getElementById('resumen-promedio');
  if (promedioElement) promedioElement.textContent = promedio + "%";

  // 3. Sucursal destacada (opcional, puedes reforzar la lógica si lo necesitas)
  let destacada = '-';
  if (total > 0) {
    const agrupadas = {};
    evaluacionesValidas.forEach(ev => {
      if (!ev.sucursalNombre) return;
      if (!agrupadas[ev.sucursalNombre]) agrupadas[ev.sucursalNombre] = [];
      agrupadas[ev.sucursalNombre].push(ev.puntajeTotal || 0);
    });
    let maxProm = 0;
    Object.entries(agrupadas).forEach(([suc, scores]) => {
      const prom = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (prom > maxProm) {
        maxProm = prom;
        destacada = suc;
      }
    });
  }
  const destacadaElement = document.getElementById('resumen-destacada');
  if (destacadaElement) destacadaElement.textContent = destacada;
  const cumplimientoElement = document.getElementById('resumen-cumplimiento');
  if (cumplimientoElement) cumplimientoElement.textContent = `${promedio}% de cumplimiento`;

  // 4. Atención (amarilla): muestra advertencia si alguna evaluación tiene puntaje < 90%
  const atencionElement = document.getElementById('resumen-atencion');
  if (atencionElement) {
    const bajo = evaluacionesValidas.some(ev => (ev.puntajeTotal || 0) < 90);
    atencionElement.style.display = bajo ? '' : 'none';
  }
}

// --- ACTUALIZAR TABLA DE EVALUACIONES ---
function getNombreSucursalFranquicia(evaluacion) {
  if (evaluacion.sucursalId) {
    const suc = (state.sucursales || []).find(s => s.id === evaluacion.sucursalId)
      || (window.sucursales || []).find(s => s.id === evaluacion.sucursalId);
    if (!suc) {
      console.warn('[DEBUG][getNombreSucursalFranquicia] No se encontró sucursal para id:', evaluacion.sucursalId, 'IDs disponibles:', (state.sucursales||[]).map(s=>s.id));
    } else {
      console.log('[DEBUG][getNombreSucursalFranquicia] Match sucursal:', suc);
      console.log('[DEBUG][getNombreSucursalFranquicia] Campos del objeto sucursal:', Object.keys(suc), 'Valores:', suc);
    }
    return suc ? suc.nombre : '-';
  } else if (evaluacion.franquiciaId) {
    const franq = (state.franquicias || []).find(f => f.id === evaluacion.franquiciaId)
      || (window.franquicias || []).find(f => f.id === evaluacion.franquiciaId);
    if (!franq) {
      console.warn('[DEBUG][getNombreSucursalFranquicia] No se encontró franquicia para id:', evaluacion.franquiciaId, 'IDs disponibles:', (state.franquicias||[]).map(f=>f.id));
    } else {
      console.log('[DEBUG][getNombreSucursalFranquicia] Match franquicia:', franq);
    }
    return franq ? franq.nombre : '-';
  }
  return '-';
}
function getTipoSucursalFranquicia(evaluacion) {
  if (evaluacion.sucursalId) return 'Sucursal';
  if (evaluacion.franquiciaId) return 'Franquicia';
  return '-';
}
function getModeloSucursalFranquicia(evaluacion) {
  if (evaluacion.sucursalId) {
    const suc = (state.sucursales || []).find(s => s.id === evaluacion.sucursalId)
      || (window.sucursales || []).find(s => s.id === evaluacion.sucursalId);
    if (!suc) {
      console.warn('[DEBUG][getModeloSucursalFranquicia] No se encontró sucursal para id:', evaluacion.sucursalId, 'IDs disponibles:', (state.sucursales||[]).map(s=>s.id));
    } else {
      console.log('[DEBUG][getModeloSucursalFranquicia] Match sucursal:', suc);
    }
    return suc ? suc.modelo : '-';
  } else if (evaluacion.franquiciaId) {
    const franq = (state.franquicias || []).find(f => f.id === evaluacion.franquiciaId)
      || (window.franquicias || []).find(f => f.id === evaluacion.franquiciaId);
    if (!franq) {
      console.warn('[DEBUG][getModeloSucursalFranquicia] No se encontró franquicia para id:', evaluacion.franquiciaId, 'IDs disponibles:', (state.franquicias||[]).map(f=>f.id));
    } else {
      console.log('[DEBUG][getModeloSucursalFranquicia] Match franquicia:', franq);
    }
    return franq ? franq.modelo : '-';
  }
  return '-';
}

function actualizarTablaEvaluaciones() {
  if (!window.datosCargados) {
    console.warn('[DASHBOARD] Intento de renderizar tabla antes de que datos estén listos.');
    return;
  }
  console.log('[DASHBOARD] window.sucursales:', window.sucursales);
  console.log('[DASHBOARD] state.sucursales:', state.sucursales);

  const tabla = document.getElementById('tabla-evaluaciones');
  if (!tabla) return;
  let tbody = tabla.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    tabla.appendChild(tbody);
  }
  tbody.innerHTML = '';
  // Filtrar por mes seleccionado
  const selectorMes = document.getElementById('selectorMes');
  let yyyymm = selectorMes?.value;
  if (!yyyymm) {
    const now = new Date();
    yyyymm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }
  const [year, month] = yyyymm.split('-');
  const inicio = new Date(Number(year), Number(month) - 1, 1);
  const fin = new Date(Number(year), Number(month), 1);
  const evaluacionesFiltradas = state.evaluaciones.filter(ev => {
    if (!ev.fecha) return false;
    let d = null;
    if (typeof ev.fecha.toDate === 'function') {
      d = ev.fecha.toDate();
    } else {
      d = new Date(ev.fecha);
    }
    return d >= inicio && d < fin;
  });
  console.log('[DASHBOARD] Tabla para mes:', yyyymm, 'Evaluaciones:', evaluacionesFiltradas.length, evaluacionesFiltradas);
  console.log('[DEBUG] state.sucursales:', state.sucursales);
  console.log('[DEBUG] state.franquicias:', state.franquicias);
  console.log('[DEBUG] evaluacionesFiltradas:', evaluacionesFiltradas);
  evaluacionesFiltradas.forEach(evaluacion => {
    console.log('[DEBUG] evaluacion.id:', evaluacion.id, 'sucursalId:', evaluacion.sucursalId, 'franquiciaId:', evaluacion.franquiciaId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${evaluacion.fecha ? formatDate(evaluacion.fecha.toDate ? evaluacion.fecha.toDate() : new Date(evaluacion.fecha), 'DD/MM/YYYY HH:mm') : '-'}</td>
      <td title="${getTipoSucursalFranquicia(evaluacion)}: ${evaluacion.sucursalId || evaluacion.franquiciaId}">
        <span class="nombre-sucursal">${getNombreSucursalFranquicia(evaluacion) || '-'}</span>
        <br><small class="text-muted">${getTipoSucursalFranquicia(evaluacion)}: ${evaluacion.sucursalId || evaluacion.franquiciaId}</small>
      </td>
      <td>${evaluacion.sucursalId ? 'Sucursal' : evaluacion.franquiciaId ? 'Franquicia' : getTipoSucursalFranquicia(evaluacion) || '-'}</td>
      <td>${getModeloSucursalFranquicia(evaluacion) || '-'}</td>
      <td>${evaluacion.usuarioNombre || '-'}</td>
      <td>${typeof evaluacion.puntajeTotal === 'number' ? Math.round(evaluacion.puntajeTotal) : 0}%</td>
      <td>${evaluacion.completada ? 'Completada' : 'Pendiente'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger me-1" title="Ver video"><i class="bi bi-eye" style="color:#dc3545;"></i></button>
        <button class="btn btn-sm btn-outline-primary me-1" title="Editar"><i class="bi bi-pencil" style="color:#0d6efd;"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Eliminar"><i class="bi bi-trash" style="color:#dc3545;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Delegación de eventos para los botones de acción
  tbody.addEventListener('click', async function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const tr = btn.closest('tr');
    if (!tr) return;
    // Obtener el índice de la fila
    const rowIndex = Array.from(tbody.children).indexOf(tr);
    // Obtener la evaluación correspondiente
    const evaluacion = evaluacionesFiltradas ? evaluacionesFiltradas[rowIndex] : null;
    if (!evaluacion) return;

    // Botón: Ver video (ojo rojo)
    if (btn.title === 'Ver video') {
      mostrarModalVideoEvaluacion(evaluacion);
    }
    // Botón: Editar
    else if (btn.title === 'Editar') {
      editarEvaluacion(evaluacion);
    }
    // Botón: Eliminar
    else if (btn.title === 'Eliminar') {
      eliminarEvaluacion(evaluacion);
    }
  });
}

// Función para mostrar el modal de detalles de evaluación
function mostrarModalDetallesEvaluacion(evaluacion) {
  // Aquí puedes reutilizar el modal existente o crear uno nuevo
  // Por simplicidad, mostramos los datos en un alert (puedes reemplazarlo por tu modal real)
  let detalles = '';
  detalles += 'Fecha: ' + (evaluacion.fecha ? formatDate(evaluacion.fecha.toDate ? evaluacion.fecha.toDate() : new Date(evaluacion.fecha), 'DD/MM/YYYY HH:mm') : '-') + '\n';
  detalles += 'Sucursal/Franquicia: ' + (getNombreSucursalFranquicia(evaluacion) || '-') + '\n';
  detalles += 'Tipo: ' + (getTipoSucursalFranquicia(evaluacion) || '-') + '\n';
  detalles += 'Modelo: ' + (getModeloSucursalFranquicia(evaluacion) || '-') + '\n';
  detalles += 'Evaluador: ' + (evaluacion.usuarioNombre || '-') + '\n';
  detalles += 'Puntaje: ' + (typeof evaluacion.puntajeTotal === 'number' ? Math.round(evaluacion.puntajeTotal) : 0) + '%\n';
  detalles += 'Estado: ' + (evaluacion.completada ? 'Completada' : 'Pendiente') + '\n';
  detalles += 'Observaciones: ' + (evaluacion.observaciones || '-') + '\n';
  alert(detalles); // TODO: Reemplazar por modal visual
}

// Función para mostrar el modal de video de evaluación
function mostrarModalVideoEvaluacion(evaluacion) {
  // Busca el enlace de video según sucursal/franquicia y fecha
  let videoId = null;
  // Lógica ejemplo: busca en videoLinks por sucursalId/franquiciaId y mes
  // Aquí solo se muestra un ejemplo genérico
  if (evaluacion.sucursalId && videoLinks[evaluacion.sucursalId]) {
    videoId = videoLinks[evaluacion.sucursalId];
  } else if (evaluacion.franquiciaId && videoLinks[evaluacion.franquiciaId]) {
    videoId = videoLinks[evaluacion.franquiciaId];
  }
  if (!videoId) {
    showNotification('No hay video asociado a esta evaluación', 'warning');
    return;
  }
  // Mostrar el modal de YouTube
  const container = document.getElementById('youtubePlayerContainer');
  if (container) {
    container.innerHTML = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    const modal = new bootstrap.Modal(document.getElementById('modalYoutubePlayer'));
    modal.show();
  }
}

// Función para editar evaluación (handler vacío por ahora)
async function editarEvaluacion(evaluacion) {
  console.log('[EDITAR] Click en editar, evaluacion:', evaluacion, 'id:', evaluacion && evaluacion.id);
  // Guardar en estado global que se está editando
  window.state = window.state || {};
  window.state.evaluacionEditando = evaluacion && evaluacion.id ? { ...evaluacion } : null;
  // Guardar en estado global que se está editando
  window.state = window.state || {};
  window.state.evaluacionEditando = evaluacion && evaluacion.id ? { ...evaluacion } : null;
  // Mostrar el modal de evaluación para edición, pero primero renderizar selects y parámetros según la evaluación
  const modalEl = document.getElementById('modalNuevaEvaluacion');
  if (!modalEl) {
    showNotification('No se encontró el modal de evaluación', 'error');
    return;
  }
  try {
    // 1. Rellenar el select mixto de sucursal/franquicia
    const sucursalSelect = document.getElementById('sucursal');
    if (sucursalSelect) {
      sucursalSelect.innerHTML = '<option value="" disabled>Seleccione una opción</option>';
      // Agrega sucursales
      if (Array.isArray(window.sucursales)) {
        window.sucursales.forEach(suc => {
          sucursalSelect.innerHTML += `<option value="${suc.id}" data-modelo="${suc.modelo}">${suc.nombre}</option>`;
        });
      }
      // Agrega franquicias
      if (Array.isArray(window.franquicias)) {
        window.franquicias.forEach(franq => {
          sucursalSelect.innerHTML += `<option value="${franq.id}" data-modelo="${franq.modelo}">${franq.nombre}</option>`;
        });
      }
      // Selecciona el valor correcto
      if (evaluacion.sucursalId) {
        sucursalSelect.value = evaluacion.sucursalId;
      } else if (evaluacion.franquiciaId) {
        sucursalSelect.value = evaluacion.franquiciaId;
      }
    }
    // 2. Rellenar el select de tipo
    const tipoSelect = document.getElementById('tipo-cafe');
    if (tipoSelect && evaluacion.tipo) {
      tipoSelect.value = evaluacion.tipo;
    }
    // 3. Rellenar el select de modelo
    const modeloSelect = document.getElementById('modelo-cafe');
    if (modeloSelect && evaluacion.modelo) {
      modeloSelect.value = evaluacion.modelo;
    }
    // 4. Renderizar los parámetros correctos según la selección
    // (esto dispara la lógica normal del change de sucursal)
    if (sucursalSelect) {
      const event = new Event('change');
      sucursalSelect.dispatchEvent(event);
    }
    // Espera un tiempo breve para asegurar que los parámetros ya están en el DOM
    setTimeout(() => {
      // 5. Precargar observaciones
      const obsInput = document.getElementById('observaciones');
      if (obsInput) {
        obsInput.value = evaluacion.observaciones || '';
      }
      // 6. Precargar respuestas a parámetros
      if (evaluacion.respuestas) {
        Object.entries(evaluacion.respuestas).forEach(([paramId, valor]) => {
          const input = document.querySelector(`[name="param_${paramId}"]`);
          if (input) {
            if (input.type === 'checkbox') {
              input.checked = !!valor;
            } else {
              input.value = valor;
            }
          }
        });
      }
      // 7. Mostrar el modal
      if (window.bootstrap && window.bootstrap.Modal) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      } else {
        modalEl.style.display = 'block';
      }
    }, 100); // 100ms para asegurar que los parámetros ya están
  } catch (err) {
    showNotification('Error al cargar datos para edición', 'error');
    console.error(err);
  }
}

// Función para eliminar evaluación
// Modal visual para confirmar eliminación de evaluación
function eliminarEvaluacion(evaluacion) {
  // Guardar la evaluación a eliminar en el estado global
  window.state = window.state || {};
  window.state.evaluacionAEliminar = evaluacion;
  // Mostrar info básica en el modal
  const infoDiv = document.getElementById('infoEvaluacionEliminar');
  if (infoDiv) {
    infoDiv.innerHTML = `
      <b>Fecha:</b> ${evaluacion.fecha ? (evaluacion.fecha.toDate ? formatDate(evaluacion.fecha.toDate(), 'DD/MM/YYYY HH:mm') : formatDate(new Date(evaluacion.fecha), 'DD/MM/YYYY HH:mm')) : '-'}<br>
      <b>Sucursal/Franquicia:</b> ${getNombreSucursalFranquicia(evaluacion)}<br>
      <b>Modelo:</b> ${getModeloSucursalFranquicia(evaluacion)}<br>
      <b>Evaluador:</b> ${evaluacion.usuarioNombre || '-'}<br>
      <b>Puntaje:</b> ${typeof evaluacion.puntajeTotal === 'number' ? Math.round(evaluacion.puntajeTotal) : '-'}%
    `;
  }
  // Mostrar el modal visual Bootstrap
  const modal = window.bootstrap && window.bootstrap.Modal ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmarEliminar')) : null;
  if (modal) {
    modal.show();
  } else {
    document.getElementById('modalConfirmarEliminar').style.display = 'block';
  }
}

// Listener para el botón de confirmación del modal
(function setupEliminarEvalListener() {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnConfirmarEliminarEval');
    if (btn) {
      btn.addEventListener('click', async () => {
        const evaluacion = window.state && window.state.evaluacionAEliminar;
        if (!evaluacion || !evaluacion.id) {
          showNotification('No se encontró la evaluación a eliminar', 'error');
          return;
        }
        try {
          // Cerrar el modal visual
          const modal = window.bootstrap && window.bootstrap.Modal ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmarEliminar')) : null;
          if (modal) modal.hide();
          // Proceso de borrado (igual que antes)
          const docRef = doc(window.db, 'evaluaciones', evaluacion.id);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            showNotification('La evaluación no existe en Firestore (id: ' + evaluacion.id + ')', 'error');
            return;
          }
          await deleteDoc(docRef);
          showNotification('Evaluación eliminada correctamente', 'success');
          // Refrescar datos
          await cargarEvaluaciones();
          actualizarResumen();
          actualizarTablaEvaluaciones();
        } catch (error) {
          console.error('[ELIMINAR][MODAL] Error:', error);
          if (error && error.code === 'permission-denied') {
            showNotification('No tienes permisos para eliminar. Revisa las reglas de seguridad de Firestore.', 'error');
          } else {
            showNotification('Error al eliminar evaluación: ' + (error.message || error), 'error');
          }
        }
      });
    }
  });
})();


// --- MOSTRAR GRÁFICA DE SUCURSALES ---
function mostrarGraficaSucursales() {
  // Filtra solo evaluaciones con fecha válida
  const evaluacionesValidas = state.evaluaciones.filter(ev => {
    if (!ev.fecha) return false;
    if (typeof ev.fecha.toDate === 'function') {
      const d = ev.fecha.toDate();
      return d instanceof Date && !isNaN(d.getTime());
    } else {
      const d = new Date(ev.fecha);
      return d instanceof Date && !isNaN(d.getTime());
    }
  });
  // Agrupa evaluaciones por sucursal y calcula promedio
  const sucursalesMap = {};
  evaluacionesValidas.forEach(ev => {
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
    return s.count > 0 ? Math.round(s.total / s.count) : 0;
  });
  const ctx = document.getElementById('graficaSucursales')?.getContext('2d');
  if (graficaSucursales) {
    graficaSucursales.destroy();
  }
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

// --- EXPORTAR PDF ---
function exportarPDF() {
  try {
    // Obtener el mes seleccionado
    const selectorMes = document.getElementById('selectorMes');
    if (!selectorMes || !selectorMes.value) {
      showNotification('Seleccione un mes para exportar.', 'warning');
      return;
    }
    
    // Mostrar indicador de carga
    showLoading();
    
    // Verificar que la librería XLSX esté disponible
    if (typeof XLSX === 'undefined') {
      throw new Error('La librería XLSX no está disponible');
    }
    
    // Obtener datos de la tabla
    const table = document.getElementById('tablaHistorialEvaluaciones').parentElement;
    if (!table || table.rows.length <= 1) {
      // Si no hay datos en la tabla, intentar cargarlos directamente desde Firestore
      exportarPDFConDatos(selectorMes.value);
      return;
    }
    
    // Si hay datos en la tabla, exportarlos directamente
    const wb = XLSX.utils.table_to_book(table, { sheet: "Evaluaciones" });
    XLSX.writeFile(wb, `evaluaciones-${selectorMes.value}.xlsx`);
    
    // Ocultar indicador de carga
    hideLoading();
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    hideLoading();
    showNotification('Error al exportar a PDF: ' + error.message, 'error');
  }
}

// Función auxiliar para exportar PDF con datos obtenidos directamente de Firestore
async function exportarPDFConDatos(yyyymm) {
  try {
    // Obtener datos del mes seleccionado
    const [year, month] = yyyymm.split('-');
    const inicio = new Date(Number(year), Number(month) - 1, 1);
    const fin = new Date(Number(year), Number(month), 1, 0, 0, 0); // primer día del mes siguiente
    
    // Consulta Firestore por evaluaciones de ese rango de fechas
    let q = query(
      collection(db, 'evaluaciones'),
      where('fecha', '>=', inicio),
      where('fecha', '<', fin),
      orderBy('fecha', 'desc')
    );
    
    // Filtrar según el rol del usuario
    if (esFranquiciasUser()) {
      q = query(q, where('tipo', '==', 'franquicia'));
    } else if (esGopUser()) {
      q = query(q, where('tipo', '==', 'sucursal'));
    }
    
    const snapshot = await getDocs(q);
    const rows = [];
    
    snapshot.forEach(docSnap => {
      const ev = docSnap.data();
      rows.push({
        Fecha: (ev.fecha && ev.fecha.toDate) ? formatDate(ev.fecha.toDate(), 'DD/MM/YYYY HH:mm') : (ev.fecha ? formatDate(new Date(ev.fecha), 'DD/MM/YYYY HH:mm') : '-'),
        Sucursal: ev.sucursalNombre || 'No disponible',
        Evaluador: ev.usuarioNombre || 'No disponible',
        Puntaje: `${ev.puntajeTotal || 0}%`,
        Estado: ev.completada ? 'Completada' : 'Pendiente'
      });
    });
    
    if (rows.length === 0) {
      hideLoading();
      showNotification('No hay datos para exportar en este mes.', 'warning');
      return;
    }
    
    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Añadir worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");
    
    // Guardar el archivo Excel
    XLSX.writeFile(wb, `evaluaciones-${yyyymm}.xlsx`);
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    hideLoading();
    showNotification('Error al exportar a PDF: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
}

// --- EXPORTAR EXCEL ---
function exportarExcel() {
  try {
    // Obtener el mes seleccionado
    const selectorMes = document.getElementById('selectorMes');
    if (!selectorMes || !selectorMes.value) {
      showNotification('Seleccione un mes para exportar.', 'warning');
      return;
    }
    
    // Mostrar indicador de carga
    showLoading();
    
    // Verificar que la librería XLSX esté disponible
    if (typeof XLSX === 'undefined') {
      throw new Error('La librería XLSX no está disponible');
    }
    
    // Obtener datos de la tabla
    const table = document.getElementById('tablaHistorialEvaluaciones').parentElement;
    if (!table || table.rows.length <= 1) {
      // Si no hay datos en la tabla, intentar cargarlos directamente desde Firestore
      exportarExcelConDatos(selectorMes.value);
      return;
    }
    
    // Si hay datos en la tabla, exportarlos directamente
    const wb = XLSX.utils.table_to_book(table, { sheet: "Evaluaciones" });
    XLSX.writeFile(wb, `evaluaciones-${selectorMes.value}.xlsx`);
    
    // Ocultar indicador de carga
    hideLoading();
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    hideLoading();
    showNotification('Error al exportar a Excel: ' + error.message, 'error');
  }
}

// Función auxiliar para exportar Excel con datos obtenidos directamente de Firestore
async function exportarExcelConDatos(yyyymm) {
  try {
    // Obtener datos del mes seleccionado
    const [year, month] = yyyymm.split('-');
    const inicio = new Date(Number(year), Number(month) - 1, 1);
    const fin = new Date(Number(year), Number(month), 1, 0, 0, 0); // primer día del mes siguiente
    
    // Consulta Firestore por evaluaciones de ese rango de fechas
    let q = query(
      collection(db, 'evaluaciones'),
      where('fecha', '>=', inicio),
      where('fecha', '<', fin),
      orderBy('fecha', 'desc')
    );
    
    // Filtrar según el rol del usuario
    if (esFranquiciasUser()) {
      q = query(q, where('tipo', '==', 'franquicia'));
    } else if (esGopUser()) {
      q = query(q, where('tipo', '==', 'sucursal'));
    }
    
    const snapshot = await getDocs(q);
    const rows = [];
    
    snapshot.forEach(docSnap => {
      const ev = docSnap.data();
      rows.push({
        Fecha: (ev.fecha && ev.fecha.toDate) ? formatDate(ev.fecha.toDate(), 'DD/MM/YYYY HH:mm') : (ev.fecha ? formatDate(new Date(ev.fecha), 'DD/MM/YYYY HH:mm') : '-'),
        Sucursal: ev.sucursalNombre || 'No disponible',
        Evaluador: ev.usuarioNombre || 'No disponible',
        Puntaje: `${ev.puntajeTotal || 0}%`,
        Estado: ev.completada ? 'Completada' : 'Pendiente'
      });
    });
    
    if (rows.length === 0) {
      hideLoading();
      showNotification('No hay datos para exportar en este mes.', 'warning');
      return;
    }
    
    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Añadir worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");
    
    // Guardar el archivo Excel
    XLSX.writeFile(wb, `evaluaciones-${yyyymm}.xlsx`);
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    hideLoading();
    showNotification('Error al exportar a Excel: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Exponer la función cargarHistorialEvaluaciones en el objeto window
window.cargarHistorialEvaluaciones = function cargarHistorialEvaluaciones(yyyymm) {
  // Obtener datos del mes seleccionado
  const [year, month] = yyyymm.split('-');
  const inicio = new Date(Number(year), Number(month) - 1, 1);
  const fin = new Date(Number(year), Number(month), 1, 0, 0, 0); // primer día del mes siguiente
  
  // Consulta Firestore por evaluaciones de ese rango de fechas
  let q = query(
    collection(db, 'evaluaciones'),
    where('fecha', '>=', inicio),
    where('fecha', '<', fin),
    orderBy('fecha', 'desc')
  );
  
  // Filtrar según el rol del usuario
  if (esFranquiciasUser()) {
    q = query(q, where('tipo', '==', 'franquicia'));
  } else if (esGopUser()) {
    q = query(q, where('tipo', '==', 'sucursal'));
  }
  
  getDocs(q).then(snapshot => {
    const tbody = document.getElementById('tabla-evaluaciones')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (snapshot.size === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="8" class="text-center py-4 text-muted">
          No se encontraron evaluaciones
        </td>
      `;
      tbody.appendChild(tr);
      return;
    }
    snapshot.forEach(doc => {
      const ev = doc.data();
      // Validar fecha antes de intentar formatear
      let fechaValida = '-';
      if (ev.fecha) {
        let d;
        if (typeof ev.fecha.toDate === 'function') {
          d = ev.fecha.toDate();
        } else {
          d = new Date(ev.fecha);
        }
        if (d instanceof Date && !isNaN(d.getTime())) {
          fechaValida = formatDate(d, 'DD/MM/YYYY HH:mm');
        }
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fechaValida}</td>
        <td>${getNombreSucursalFranquicia(ev) || '-'}</td>
        <td>${ev.tipo || '-'}</td>
        <td>${ev.modelo || ev.modeloFranquicia || '-'}</td>
        <td>${ev.usuarioNombre || '-'}</td>
        <td>${ev.puntajeTotal != null ? ev.puntajeTotal + '' : '-'}</td>
        <td>${ev.completada ? 'Completada' : 'Pendiente'}</td>
        <td class="text-end">

          <button class="btn btn-sm btn-outline-danger me-1" title="Ver video"><i class="bi bi-eye" style="color:#dc3545;"></i></button>
          <button class="btn btn-sm btn-outline-primary me-1" title="Editar"><i class="bi bi-pencil" style="color:#0d6efd;"></i></button>
          <button class="btn btn-sm btn-outline-danger" title="Eliminar"><i class="bi bi-trash" style="color:#dc3545;"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }).catch(error => {
    console.error('Error al cargar historial de evaluaciones:', error);
    showNotification('Error al cargar el historial de evaluaciones', 'error');
  });
};

// --- AJUSTE PARA EL MODAL Y FORMULARIO DE NUEVA EVALUACIÓN ---
// Adaptar IDs y lógica al HTML real
const btnNuevaEvaluacion = document.getElementById('nueva-evaluacion');
if (btnNuevaEvaluacion) {
  btnNuevaEvaluacion.addEventListener('click', () => {
    const sucursalSelect = document.getElementById('sucursal');
    if (sucursalSelect) {
      sucursalSelect.innerHTML = '<option value="" selected disabled>Seleccione una opción</option>';
      // Agrega sucursales
      if (Array.isArray(window.sucursales)) {
        window.sucursales.forEach(suc => {
          sucursalSelect.innerHTML += `<option value="${suc.id}" data-modelo="${suc.modelo}">Sucursal: ${suc.nombre}</option>`;
        });
      }
      // Agrega franquicias
      if (Array.isArray(window.franquicias)) {
        window.franquicias.forEach(franq => {
          sucursalSelect.innerHTML += `<option value="${franq.id}" data-modelo="${franq.modelo}">Franquicia: ${franq.nombre}</option>`;
        });
      }
    }
    // Limpiar parámetros
    const seccion = document.getElementById('seccion-parametros');
    if (seccion) seccion.innerHTML = '';
    if (window.bootstrap && window.bootstrap.Modal) {
      const modal = new window.bootstrap.Modal(document.getElementById('modalNuevaEvaluacion'));
      modal.show();
    } else {
      document.getElementById('modalNuevaEvaluacion').style.display = 'block';
    }
  });
}

const sucursalSelect = document.getElementById('sucursal');
if (sucursalSelect) {
  sucursalSelect.addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0];
    const sucursalId = selectedOption?.value || '';
    const modelo = selectedOption?.getAttribute('data-modelo') || '';
    // Obtiene lista de parámetros excluidos según sucursal/franquicia
    let excluidos = [];
    if (sucursalId.startsWith('franq')) {
      excluidos = parametrosExcluidosPorFranquicia[sucursalId] || [];
    } else {
      excluidos = parametrosExcluidosPorSucursal[sucursalId] || [];
    }
    // Excluir también los de modelo móvil
    const idsExcluidosMovil = [
      "atencion_mesa", "tableta", "puertas_vidrios", "musica_volumen",
      "mesas_sillas_limpieza", "banos_estado", "basura_estado",
      "barra_limpieza", "mesas_sillas_estado"
    ];
    const parametrosFiltrados = parametros.filter(p =>
      (!excluidos.includes(p.id)) && (modelo === "Móvil" ? !idsExcluidosMovil.includes(p.id) : true)
    );
    // Renderiza los parámetros en el formulario
    const seccion = document.getElementById('seccion-parametros');
    if (seccion) {
      seccion.innerHTML = `<div class="row">
        ${parametrosFiltrados.map((param, idx) => {
          // Forzar checkbox para parámetros 9-12 (índices 8,9,10,11)
          if (param.tipo === 'booleano' || (idx >= 8 && idx <= 11)) {
            return `<div class="col-md-6 mb-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="param_${param.id}" name="param_${param.id}">
                <label class="form-check-label" for="param_${param.id}"><b>${idx + 1}.</b> ${param.nombre}</label>
                <small class="text-muted d-block">${param.descripcion || ''} <span class="badge bg-info">${param.peso} pts</span></small>
              </div>
            </div>`;
          } else {
            return `<div class="col-md-6 mb-3">
              <label><b>${idx + 1}.</b> ${param.nombre}</label>
              <input type="checkbox" class="form-check-input" id="param_${param.id}" name="param_${param.id}">
              <small class="text-muted d-block">${param.descripcion || ''} <span class="badge bg-info">${param.peso} pts</span></small>
            </div>`;
          }
        }).join('')}
      </div>
      <div class="mt-3"><strong>Puntaje actual: <span id="preview-puntaje">0</span> / <span id="preview-max">0</span> (<span id="preview-porcentaje">0</span>%)</strong></div>`;
    }
    // Inicializa preview
    actualizarPreviewPuntaje();
    // Agrega listeners a inputs para actualizar preview
    const updateInputs = seccion.querySelectorAll('[name^="param_"]');
    updateInputs.forEach(inp => {
      inp.addEventListener('input', actualizarPreviewPuntaje);
      inp.addEventListener('change', actualizarPreviewPuntaje);
    });
  });
}

// 2. Función para actualizar preview de puntaje
function actualizarPreviewPuntaje() {
  const seccion = document.getElementById('seccion-parametros');
  if (!seccion) return;

  // Obtener tipo de evaluación y selección actual
  const tipoSelect = document.getElementById('tipo');
  const sucursalSelect = document.getElementById('sucursal');
  const franquiciaSelect = document.getElementById('franquicia');
  const modeloSelect = document.getElementById('modelo');

  let tipo = tipoSelect?.value || '';
  let seleccionId = null;
  let modelo = '';
  if (tipo === 'sucursal') {
    seleccionId = sucursalSelect?.value || null;
    const suc = (window.state?.sucursales || window.sucursales || []).find(s => s.id === seleccionId);
    if (suc) modelo = suc.modelo;
  } else if (tipo === 'franquicia') {
    seleccionId = franquiciaSelect?.value || null;
    const franq = (window.state?.franquicias || window.franquicias || []).find(f => f.id === seleccionId);
    if (franq) modelo = franq.modelo;
  }
  // Fallback: si no se detecta modelo, usar el select manual
  if (!modelo && modeloSelect) {
    modelo = modeloSelect.value || '';
  }

  // Determinar parámetros aplicables
  let parametrosAplicables = [...parametros];
  // Excluir parámetros según sucursal/franquicia/modelo
  if (tipo === 'sucursal' && seleccionId) {
    if (typeof obtenerParametrosExcluidos === 'function') {
      const excluidos = obtenerParametrosExcluidos(seleccionId);
      parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
    } else if (parametrosExcluidosPorSucursal && parametrosExcluidosPorSucursal[seleccionId]) {
      const excluidos = parametrosExcluidosPorSucursal[seleccionId];
      parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
    }
  } else if (tipo === 'franquicia' && seleccionId) {
    if (typeof obtenerParametrosExcluidosFranquicia === 'function') {
      const excluidos = obtenerParametrosExcluidosFranquicia(seleccionId);
      parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
    } else if (parametrosExcluidosPorFranquicia && parametrosExcluidosPorFranquicia[seleccionId]) {
      const excluidos = parametrosExcluidosPorFranquicia[seleccionId];
      parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
    }
  }
  // Excluir por modelo "Móvil" (regla de negocio)
  if (modelo && modelo.toLowerCase().includes('móvil')) {
    const idsExcluidosMovil = [
      'atencion_mesa','tableta','puertas_vidrios','musica_volumen','mesas_sillas_limpieza','banos_estado','basura_estado','barra_limpieza','mesas_sillas_estado'
    ];
    parametrosAplicables = parametrosAplicables.filter(p => !idsExcluidosMovil.includes(p.id));
  }

  // Recolectar valores de los inputs SOLO para parámetros aplicables
  let total = 0, max = 0;
  parametrosAplicables.forEach(param => {
    const input = seccion.querySelector(`[name="param_${param.id}"]`);
    if (!input) return;
    if (param.tipo === 'booleano') {
      if (input.checked) total += param.peso;
      max += param.peso;
    } else {
      const val = Number(input.value) || 0;
      total += val;
      max += param.peso;
    }
  });
  document.getElementById('preview-puntaje').textContent = total;
  document.getElementById('preview-max').textContent = max;
  document.getElementById('preview-porcentaje').textContent = max > 0 ? Math.round((total / max) * 100) : 0;
}


// 3. Antes de guardar, muestra confirmación con puntaje final
const formNuevaEvaluacion = document.getElementById('form-nueva-evaluacion');
if (formNuevaEvaluacion) {
  formNuevaEvaluacion.addEventListener('submit', async (e) => {
    // Verificar si estamos editando una evaluación existente
    const evaluacionEditando = window.state && window.state.evaluacionEditando;
    console.log('[SUBMIT] Estado evaluacionEditando:', evaluacionEditando);

    console.log('>>> SUBMIT formulario de evaluación disparado');
    e.preventDefault();
    actualizarPreviewPuntaje();
    const total = Number(document.getElementById('preview-puntaje').textContent);
    const max = Number(document.getElementById('preview-max').textContent);
    const porcentaje = Number(document.getElementById('preview-porcentaje').textContent);

    // Obtener valores del formulario
    const tipoSelect = document.getElementById('tipo-cafe');
    const sucursalSelect = document.getElementById('sucursal');
    const modeloSelect = document.getElementById('modelo-franquicia');
    const fechaInput = document.getElementById('fecha');
    const observacionesInput = document.getElementById('observaciones');

    const tipo = tipoSelect?.value || '';
    const seleccionId = sucursalSelect?.value || null;
    let sucursalId = null;
    let franquiciaId = null;
    let modelo = '';

    // Buscar en datos locales según tipo
    if (tipo === 'sucursal' && seleccionId) {
      // Buscar en sucursales
      const sucursalObj = (state.sucursales || window.sucursales || []).find(s => s.id === seleccionId);
      if (sucursalObj) {
        sucursalId = sucursalObj.id;
        modelo = sucursalObj.modelo;
      }
    } else if (tipo === 'franquicia' && seleccionId) {
      // Buscar en franquicias
      const franquiciaObj = (state.franquicias || window.franquicias || []).find(f => f.id === seleccionId);
      if (franquiciaObj) {
        franquiciaId = franquiciaObj.id;
        modelo = franquiciaObj.modelo;
      }
    }

    // Fallback: si no se detecta modelo, usar el select manual
    if (!modelo && modeloSelect) {
      modelo = modeloSelect.value || '';
    }
    const fecha = fechaInput?.value ? new Date(fechaInput.value) : new Date();
    const observaciones = observacionesInput?.value || '';
    const usuario = state.currentUser?.email || "desconocido";

    // Log para depuración
    console.log('Tipo seleccionado:', tipo);
    console.log('SucursalId:', sucursalId, 'FranquiciaId:', franquiciaId, 'Modelo:', modelo);
    // Recolectar respuestas de parámetros SOLO de los aplicables (misma lógica que preview)
    const respuestas = {};
    let puntajeTotal = 0, totalParams = 0;
    const seccion = document.getElementById('seccion-parametros');
    let maxPuntaje = 0;
    if (seccion) {
      // --- Lógica de exclusión igual que en actualizarPreviewPuntaje ---
      let parametrosAplicables = [...parametros];
      if (tipo === 'sucursal' && sucursalId) {
        if (typeof obtenerParametrosExcluidos === 'function') {
          const excluidos = obtenerParametrosExcluidos(sucursalId);
          parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
        } else if (parametrosExcluidosPorSucursal && parametrosExcluidosPorSucursal[sucursalId]) {
          const excluidos = parametrosExcluidosPorSucursal[sucursalId];
          parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
        }
      } else if (tipo === 'franquicia' && franquiciaId) {
        if (typeof obtenerParametrosExcluidosFranquicia === 'function') {
          const excluidos = obtenerParametrosExcluidosFranquicia(franquiciaId);
          parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
        } else if (parametrosExcluidosPorFranquicia && parametrosExcluidosPorFranquicia[franquiciaId]) {
          const excluidos = parametrosExcluidosPorFranquicia[franquiciaId];
          parametrosAplicables = parametrosAplicables.filter(p => !excluidos.includes(p.id));
        }
      }
      // Excluir por modelo "Móvil"
      if (modelo && modelo.toLowerCase().includes('móvil')) {
        const idsExcluidosMovil = [
          'atencion_mesa','tableta','puertas_vidrios','musica_volumen','mesas_sillas_limpieza','banos_estado','basura_estado','barra_limpieza','mesas_sillas_estado'
        ];
        parametrosAplicables = parametrosAplicables.filter(p => !idsExcluidosMovil.includes(p.id));
      }
      // --- Fin lógica de exclusión ---
      let debugRows = [];
      parametrosAplicables.forEach(param => {
        const input = seccion.querySelector(`[name="param_${param.id}"]`);
        let val = 0;
        let pesoSumado = 0;
        if (input) {
          if (param.tipo === 'booleano' || input.type === 'checkbox') {
            val = input.checked ? param.peso : 0;
            pesoSumado = param.peso;
            maxPuntaje += param.peso;
          } else {
            val = Number(input.value) || 0;
            pesoSumado = param.peso;
            maxPuntaje += param.peso;
          }
        }
        respuestas[param.id] = val;
        puntajeTotal += val;
        totalParams++;
        debugRows.push({
          paramId: param.id,
          nombre: param.nombre,
          tipo: input ? input.type : 'N/A',
          checked: input && input.type === 'checkbox' ? input.checked : undefined,
          valorInput: input ? input.value : undefined,
          valorUsado: val,
          peso: param.peso,
          pesoSumado
        });
      });
      console.table(debugRows);
      console.log('[DEBUG PUNTAJE] maxPuntaje:', maxPuntaje, 'puntajeTotal:', puntajeTotal, 'totalParams:', totalParams);
    }
    puntajeTotal = maxPuntaje > 0 ? Math.round((puntajeTotal / maxPuntaje) * 100) : 0;
    console.log('[DEBUG PUNTAJE] % Calculado:', puntajeTotal);
    const evaluacion = {
      sucursalId: sucursalId || null,
      franquiciaId: franquiciaId || null,
      tipo: tipo || null, // 'sucursal' o 'franquicia'
      modelo: modelo || null,
      usuarioNombre: usuario,
      fecha,
      respuestas,
      puntajeTotal,
      observaciones,
      completada: true
    };
    // Guardar objeto para depuración global
    window.ultimaEvaluacionAGuardar = evaluacion;
    // Log para depuración
    console.log('Objeto evaluación a guardar:', evaluacion);
    // Log de usuario autenticado para depuración
    console.log('Usuario autenticado al guardar:', window.auth?.currentUser?.email);
    try {
      if (evaluacionEditando && evaluacionEditando.id) {
        // Modo edición: actualizar documento existente
        const docRef = doc(db, 'evaluaciones', evaluacionEditando.id);
        console.log('[SUBMIT] Actualizando docRef:', docRef, 'con objeto:', { ...evaluacion, id: evaluacionEditando.id });
        await setDoc(docRef, { ...evaluacion, id: evaluacionEditando.id });
        console.log('>>> Evaluación actualizada con setDoc');
      } else {
        // Modo creación: nuevo documento
        await addDoc(collection(db, 'evaluaciones'), evaluacion);
        console.log('>>> Evaluación guardada con addDoc');
      }
      if (window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getInstance(document.getElementById('modalNuevaEvaluacion')).hide();
      } else {
        document.getElementById('modalNuevaEvaluacion').style.display = 'none';
      }
      // Limpiar estado de edición
      if (window.state) window.state.evaluacionEditando = null;
      await cargarEvaluaciones();
      actualizarResumen();
      mostrarGraficaSucursales();
      showNotification('Evaluación guardada correctamente', 'success');
    } catch (error) {
      console.error('Error al guardar evaluación:', error);
      showNotification('Error al guardar evaluación: ' + (error.message || error), 'error');
    }
  });
}


// --- MODAL YOUTUBE PLAYER ---
// Agrega un modal para el reproductor de YouTube si no existe
if (!document.getElementById('modalYoutubePlayer')) {
  const modalHtml = `
    <div class="modal fade" id="modalYoutubePlayer" tabindex="-1" aria-labelledby="modalYoutubePlayerLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalYoutubePlayerLabel">Video de Evaluación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body d-flex justify-content-center">
            <div id="youtubePlayerContainer" style="width:100%;max-width:720px;"></div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
// --- END MODAL YOUTUBE PLAYER ---

// Eliminar función filtrarEvaluacionesPorMes si ya no se usa

// function filtrarEvaluacionesPorMes(mes) {
//   // Supón que tienes un array global state.evaluaciones con todas las evaluaciones
//   if (!window.state || !state.evaluaciones) return;
//   const filtradas = state.evaluaciones.filter(ev => {
//     // Asume que ev.fechaCreacion es tipo 'YYYY-MM-DD' o similar
//     return ev.fechaCreacion && ev.fechaCreacion.startsWith(mes);
//   });
//   renderEvaluaciones(filtradas, mes);
// }

// Determina si una evaluación es de modelo "Móvil"
function esEvaluacionMovil(evaluacion) {
  // Ajusta la lógica según cómo guardas el modelo en tu objeto de evaluación
  return evaluacion && (
    (evaluacion.modelo === 'Móvil') ||
    (evaluacion.modeloFranquicia === 'Móvil')
  );
}

// --- UTILIDAD: Validar que parametros sea un array antes de usar forEach ---
function safeForEachParametros(callback) {
  if (Array.isArray(parametros)) {
    parametros.forEach(callback);
  } else if (window.parametrosData && Array.isArray(window.parametrosData)) {
    window.parametrosData.forEach(callback);
  } else {
    console.error('parametros no es un array:', parametros);
    showNotification('Error: parámetros de evaluación no cargados correctamente', 'error');
  }
}