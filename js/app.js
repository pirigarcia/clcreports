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
import { sucursales, obtenerSucursalPorId } from '../data/sucursales.js';
import { franquicias, obtenerFranquiciaPorId } from '../data/franquicias.js';
import { categorias, parametros, getParametrosPorCategoria, getParametroPorId, getParametrosParaSucursal, getPuntajeMaximo } from '../data/parametros.js';
import { videoLinks } from '../data/video_links.js';
import { parametrosExcluidosPorSucursal, parametrosExcluidosPorFranquicia } from '../data/parametros_excluidos.js';
// window.parametrosData = parametros; // Si necesitas la variable global, ya está definida en el archivo de datos
import { showSection, createElement, formatDate, showLoading, hideLoading, showNotification } from './utils/dom.js';

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
  });
})();

// --- EVENTOS PARA CARGA DINÁMICA DE SECCIONES ---
document.addEventListener('sectionShown', (e) => {
  if (e.detail.sectionId === 'dashboard') {
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
  html += '<thead><tr><th>Parámetro</th>';
  lista.forEach(item => { html += `<th>${item.nombre}</th>`; });
  html += '</tr></thead><tbody>';
  safeForEachParametros(param => {
    html += `<tr><td><span data-bs-toggle="tooltip" title="${param.descripcion || ''}">${param.nombre}</span></td>`;
    lista.forEach(item => {
      const excluidos = (window.obtenerParametrosExcluidos && window.obtenerParametrosExcluidos(item.id)) || [];
      const esExcluido = excluidos.includes(param.nombre);
      if (esExcluido) {
        html += `<td class="bg-dark text-white" data-bs-toggle="tooltip" title="No aplica">NA</td>`;
      } else {
        let valor = '';
        if (window.state && Array.isArray(state.evaluaciones)) {
          const evals = state.evaluaciones
            .filter(ev => (ev.sucursalId === item.id || ev.franquiciaId === item.id) && ev.resultados && typeof ev.resultados === 'object')
            .sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0));
          if (evals.length > 0) {
            const resultados = evals[0].resultados;
            valor = resultados[param.id] ?? resultados[param.nombre] ?? '';
            if (typeof valor === 'boolean') valor = valor ? 'Sí' : 'No';
            if (valor === null || valor === undefined || valor === '') valor = '—';
          } else {
            valor = '—';
          }
        } else {
          valor = '—';
        }
        html += `<td>${valor}</td>`;
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

  // Cargar sucursales y franquicias
  await cargarSucursales();
  await cargarFranquicias();

  // Cargar evaluaciones
  await cargarEvaluaciones();

  // Inicializar la tabla de evaluaciones
  actualizarTablaEvaluaciones();

  // Inicializar la matriz
  renderizarMatriz();
}

// --- CARGAR SUCURSALES ---
async function cargarSucursales() {
  const sucursalesRef = collection(db, 'sucursales');
  const q = query(sucursalesRef);
  const querySnapshot = await getDocs(q);
  state.sucursales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- CARGAR FRANQUICIAS ---
async function cargarFranquicias() {
  const franquiciasRef = collection(db, 'franquicias');
  const q = query(franquiciasRef);
  const querySnapshot = await getDocs(q);
  state.franquicias = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- CARGAR EVALUACIONES ---
async function cargarEvaluaciones() {
  console.log("Entrando a cargarEvaluaciones()");
  const evaluacionesRef = collection(db, 'evaluaciones');
  const q = query(evaluacionesRef);
  try {
    const querySnapshot = await getDocs(q);
    console.log("Evaluaciones recibidas:", querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    state.evaluaciones = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener evaluaciones:", error);
    state.evaluaciones = [];
  }
}

// --- ACTUALIZAR TARJETAS DE RESUMEN DEL DASHBOARD ---
function actualizarResumen() {
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
function actualizarTablaEvaluaciones() {
  const tabla = document.getElementById('tabla-evaluaciones');
  if (!tabla) return;
  const tbody = tabla.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    tabla.appendChild(tbody);
  }
  tbody.innerHTML = '';
  state.evaluaciones.forEach(evaluacion => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${evaluacion.fecha ? formatDate(evaluacion.fecha.toDate ? evaluacion.fecha.toDate() : new Date(evaluacion.fecha), 'DD/MM/YYYY HH:mm') : '-'}</td>
      <td>${evaluacion.sucursalNombre || '-'}</td>
      <td>${evaluacion.tipo || '-'}</td>
      <td>${evaluacion.modelo || evaluacion.modeloFranquicia || '-'}</td>
      <td>${evaluacion.usuarioNombre || '-'}</td>
      <td>${evaluacion.puntajeTotal || 0}%</td>
      <td>${evaluacion.completada ? 'Completada' : 'Pendiente'}</td>
      <td class="text-end">
        <!-- Aquí puedes poner botones de acciones, por ahora vacío -->
      </td>
    `;
    tbody.appendChild(tr);
  });
}

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
    const tbody = document.getElementById('tabla-historial-evaluaciones')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (snapshot.size === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="5" class="text-center py-4 text-muted">
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
        <td>${ev.sucursalNombre || '-'}</td>
        <td>${ev.usuarioNombre || '-'}</td>
        <td>${ev.puntajeTotal != null ? ev.puntajeTotal + '%' : '-'}</td>
        <td>${ev.completada ? 'Completada' : 'Pendiente'}</td>
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
          if (param.tipo === 'booleano') {
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
              <input type="number" class="form-control" name="param_${param.id}" min="0" max="100" required>
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
  const inputs = seccion.querySelectorAll('[name^="param_"]');
  let total = 0, max = 0;
  inputs.forEach(input => {
    const paramId = input.name.replace('param_', '');
    const param = parametros.find(p => p.id === paramId);
    if (!param) return;
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
    e.preventDefault();
    actualizarPreviewPuntaje();
    const total = Number(document.getElementById('preview-puntaje').textContent);
    const max = Number(document.getElementById('preview-max').textContent);
    const porcentaje = Number(document.getElementById('preview-porcentaje').textContent);
    if (!confirm(`¿Guardar evaluación con ${total} puntos de ${max} posibles? (${porcentaje}%)`)) {
      return;
    }
    // Obtener valores del formulario
    const sucursalSelect = document.getElementById('sucursal');
    const modeloSelect = document.getElementById('modelo-franquicia');
    const fechaInput = document.getElementById('fecha');
    const observacionesInput = document.getElementById('observaciones');
    const sucursalId = sucursalSelect?.value || null;
    const modelo = modeloSelect?.value || '';
    const fecha = fechaInput?.value ? new Date(fechaInput.value) : new Date();
    const observaciones = observacionesInput?.value || '';
    const usuario = state.currentUser?.email || "desconocido";
    // Recolectar respuestas de parámetros
    const respuestas = {};
    let puntajeTotal = 0, totalParams = 0;
    const seccion = document.getElementById('seccion-parametros');
    if (seccion) {
      const inputs = seccion.querySelectorAll('[name^="param_"]');
      inputs.forEach(input => {
        const paramId = input.name.replace('param_', '');
        const param = parametros.find(p => p.id === paramId);
        let val = 0;
        if (param && param.tipo === 'booleano') {
          val = input.checked ? param.peso : 0;
        } else {
          val = Number(input.value);
        }
        respuestas[paramId] = val;
        puntajeTotal += val;
        totalParams++;
      });
    }
    puntajeTotal = totalParams > 0 ? Math.round(puntajeTotal / totalParams) : 0;
    const evaluacion = {
      sucursalId,
      modelo,
      usuarioNombre: usuario,
      fecha,
      respuestas,
      puntajeTotal,
      observaciones,
      completada: true
    };
    await addDoc(collection(db, 'evaluaciones'), evaluacion);
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getInstance(document.getElementById('modalNuevaEvaluacion')).hide();
    } else {
      document.getElementById('modalNuevaEvaluacion').style.display = 'none';
    }
    await cargarEvaluaciones();
    actualizarResumen();
    mostrarGraficaSucursales();
    showNotification('Evaluación guardada correctamente', 'success');
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