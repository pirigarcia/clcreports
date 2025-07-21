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
  inputObservaciones: document.getElementById('observaciones')
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
    state.sucursales = [...sucursales];
    
    // Llenar selectores de sucursales
    llenarSelectSucursales(elements.filtroSucursal, 'Todas las sucursales');
    llenarSelectSucursales(elements.selectSucursal, 'Seleccione una sucursal');
    
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
    
    // Construir consulta
    let q = collection(db, 'evaluaciones');
    const condiciones = [];
    
    // Aplicar filtros
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
      condiciones.push(where('fecha', '>=', new Date(filtros.fechaInicio || '1970-01-01')));
    }
    
    // Solo las evaluaciones del usuario actual si está el filtro activo
    const soloMisEvaluaciones = document.getElementById('solo-mis-evaluaciones')?.checked;
    if (soloMisEvaluaciones && state.currentUser) {
      condiciones.push(where('usuarioId', '==', state.currentUser.uid));
    }
    
    // Ordenar por fecha descendente
    condiciones.push(orderBy('fecha', 'desc'));
    
    // Aplicar condiciones a la consulta
    if (condiciones.length > 0) {
      q = query(q, ...condiciones);
    }
    
    // Ejecutar consulta
    const querySnapshot = await getDocs(q);
    state.evaluaciones = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      state.evaluaciones.push({
        id: doc.id,
        ...data,
        // Asegurar que la fecha sea un objeto Date
        fecha: data.fecha?.toDate() || new Date()
      });
    });
    
    // Actualizar UI
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
  // Total de evaluaciones
  if (elements.totalEvaluaciones) {
    elements.totalEvaluaciones.textContent = state.evaluaciones.length;
  }
  
  // Promedio general
  if (elements.promedioGeneral) {
    const promedio = state.evaluaciones.length > 0
      ? Math.round(state.evaluaciones.reduce((sum, evaluacion) => sum + (evaluacion.puntajeTotal || 0), 0) / state.evaluaciones.length)
      : 0;
    elements.promedioGeneral.textContent = promedio;
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
}

// Actualizar la tabla de evaluaciones
function actualizarTablaEvaluaciones() {
  if (!elements.tablaEvaluaciones) return;
  
  const tbody = elements.tablaEvaluaciones.querySelector('tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (state.evaluaciones.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="6" class="text-center py-4 text-muted">
        No se encontraron evaluaciones
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }
  
  state.evaluaciones.forEach(evaluacion => {
    const sucursal = obtenerSucursalPorId(evaluacion.sucursalId) || { nombre: 'Desconocida' };
    const fecha = formatDate(evaluacion.fecha, 'DD/MM/YYYY HH:mm');
    const estado = evaluacion.completada ? 'Completada' : 'Pendiente';
    const estadoClass = evaluacion.completada ? 'success' : 'warning';
    
    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${sucursal.nombre}</td>
      <td>${evaluacion.usuarioNombre || 'Anónimo'}</td>
      <td>${evaluacion.puntajeTotal || 0}%</td>
      <td><span class="badge bg-${estadoClass}">${estado}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary btn-ver-evaluacion" data-id="${evaluacion.id}">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary btn-editar-evaluacion ms-1" data-id="${evaluacion.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger btn-eliminar-evaluacion ms-1" data-id="${evaluacion.id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Agregar manejadores de eventos a los botones
  document.querySelectorAll('.btn-ver-evaluacion').forEach(btn => {
    btn.addEventListener('click', (e) => verEvaluacion(e.target.closest('button').dataset.id));
  });
  
  document.querySelectorAll('.btn-editar-evaluacion').forEach(btn => {
    btn.addEventListener('click', (e) => editarEvaluacion(e.target.closest('button').dataset.id));
  });
  
  document.querySelectorAll('.btn-eliminar-evaluacion').forEach(btn => {
    btn.addEventListener('click', (e) => confirmarEliminarEvaluacion(e.target.closest('button').dataset.id));
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
  // Ajusta esta lógica según cómo determines el rol admin en tu app
  return state.currentUser && state.currentUser.email === 'unknownshoppersmx@gmail.com';
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
    showLoading('Eliminando evaluación...');
    console.log('Intentando eliminar evaluación:', evaluacionId);
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

        // Título del parámetro
        const tituloParam = document.createElement('h6');
        tituloParam.className = 'card-title';
        tituloParam.textContent = parametro.nombre;

        // Descripción del parámetro (si existe)
        if (parametro.descripcion) {
          const descParam = document.createElement('p');
          descParam.className = 'card-text text-muted small';
          descParam.textContent = parametro.descripcion;
          cardBody.appendChild(descParam);
        }

        // Opciones 1 (Sí/Cumple) y 0 (No/No cumple) para todos los parámetros
        const opcionesDiv = document.createElement('div');
        opcionesDiv.className = 'opciones-puntuacion mt-2';

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

        // Agregar elementos al contenedor del parámetro
        cardBody.appendChild(tituloParam);
        cardBody.appendChild(opcionesDiv);
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

    // Obtener la sucursal seleccionada
    const sucursal = state.sucursales.find(s => s.id === sucursalId);
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
          llenarSelectSucursales(elements.selectSucursal, 'Seleccione una sucursal');
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

// Función para crear usuarios iniciales (solo ejecutar una vez)
async function crearUsuariosIniciales() {
  try {
    // Verificar que el usuario actual sea administrador
    if (!state.currentUser || state.currentUser.email !== 'unknownshoppers@gmail.com') {
      console.log('No tienes permisos para crear usuarios');
      return;
    }

    // Usuarios a crear
    const usuarios = [
      {
        email: 'unknownshoppers@gmail.com',
        nombre: 'Administrador',
        rol: 'admin',
        activo: true,
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp()
      },
      {
        email: 'gop@cafelacabana.com',
        nombre: 'Usuario Gestion Operativa',
        rol: 'usuario',
        activo: true,
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp()
      }
    ];

    // Referencia a la colección de usuarios
    const usuariosRef = collection(db, 'usuarios');
    
    // Verificar y crear cada usuario
    for (const usuario of usuarios) {
      // Verificar si el usuario ya existe
      const q = query(usuariosRef, where('email', '==', usuario.email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Crear el usuario si no existe
        await addDoc(usuariosRef, usuario);
        console.log(`Usuario ${usuario.email} creado exitosamente`);
      } else {
        console.log(`El usuario ${usuario.email} ya existe`);
      }
    }
    
    showNotification('Usuarios verificados/creados correctamente', 'success');
  } catch (error) {
    console.error('Error al crear usuarios iniciales:', error);
    showNotification('Error al crear usuarios: ' + error.message, 'error');
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(error => {
    console.error('Error al inicializar la aplicación:', error);
    showNotification('Error al iniciar la aplicación', 'error');
  });
});

// --- HISTORIAL DE EVALUACIONES POR MES ---
document.addEventListener('DOMContentLoaded', () => {
  const selectorMes = document.getElementById('selectorMes');
  if (selectorMes) {
    // Valor por defecto: mes actual
    const now = new Date();
    selectorMes.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    cargarHistorialEvaluaciones(selectorMes.value);
    selectorMes.addEventListener('change', () => {
      cargarHistorialEvaluaciones(selectorMes.value);
    });
  }
});

async function cargarHistorialEvaluaciones(yyyymm) {
  console.log('Cargando historial para:', yyyymm);
  
  // yyyy-mm
  const [year, month] = yyyymm.split('-');
  const inicio = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0);
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
          <i class="bi bi-eye-fill"></i>
        </button>
        ${esAdmin() ? `<button class="btn btn-outline-success btn-sm" title="Editar evaluación" onclick="editarEvaluacion('${ev.id}')">
          <i class="bi bi-pencil-fill"></i>
        </button>` : ''}
        ${esAdmin() ? `<button class="btn btn-outline-danger btn-sm" title="Eliminar evaluación" onclick="eliminarEvaluacion('${ev.id}')">
          <i class="bi bi-trash3-fill"></i>
        </button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- GRÁFICA GENERAL DE SUCURSALES ---
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
  graficaSucursales = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Puntaje promedio (%)',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.7)'
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
