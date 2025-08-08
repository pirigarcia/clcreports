import { login, logout, getCurrentUser, subscribeToAuthChanges } from './auth.js';
import { showSection } from './utils/dom.js';

export const initUI = (user) => {
    console.log('Inicializando interfaz de usuario...');
    
    // Configurar manejadores de eventos
    setupEventListeners();
    
    // Mostrar sección inicial basada en autenticación
    if (user) {
        showSection('dashboard');
        updateUserInfo(user);
    } else {
        showSection('login');
    }
    
    // Suscribirse a cambios de autenticación
    subscribeToAuthChanges(handleAuthStateChange);
};

function setupEventListeners() {
    // Navegación
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = e.target.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Iniciando sesión...';
        await login(email, password);
        // Enriquecer usuario autenticado con datos de window.usuarios
        let extraUser = null;
        if (window.usuarios && Array.isArray(window.usuarios)) {
            extraUser = window.usuarios.find(u => u.email === email);
        }
        // Mezclar datos extra con el usuario autenticado de Firebase
        if (extraUser) {
            // auth.currentUser puede no estar disponible aquí, así que solo guarda el extraUser
            window.state = window.state || {};
            window.state.currentUser = {
                email,
                ...extraUser
            };
        }
        showSection('dashboard');
        showNotification('Sesión iniciada correctamente', 'success');
    } catch (error) {
        console.error('Error en inicio de sesión:', error);
        showNotification(error.message || 'Error al iniciar sesión', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

/**
 * Maneja los cambios en el estado de autenticación
 * @param {Object} authState - Estado actual de autenticación
 */
function handleAuthStateChange(authState) {
    const { user, loading, error } = authState;
    
    // Actualizar UI basada en el estado de autenticación
    if (user) {
        updateUserInfo(user);
        
        // Ocultar secciones de login/registro, mostrar menú
        document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.no-auth').forEach(el => el.style.display = 'none');
        
        // Si está en la página de login, redirigir al dashboard
        if (window.location.hash === '#login' || window.location.hash === '') {
            showSection('dashboard');
        }
    } else {
        // Mostrar login si no está autenticado
        document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.no-auth').forEach(el => el.style.display = 'block');
        
        if (window.location.hash !== '#login') {
            showSection('login');
        }
    }
    
    // Mostrar error si existe
    if (error) {
        showNotification(error, 'error');
    }
}

/**
 * Actualiza la información del usuario en la interfaz
 * @param {Object} user - Datos del usuario
 */
function updateUserInfo(user) {
    // Actualizar nombre de usuario
    const userElements = document.querySelectorAll('.user-name');
    userElements.forEach(el => {
        el.textContent = user.nombre || user.email.split('@')[0];
    });
    
    // Actualizar avatar
    const avatarElements = document.querySelectorAll('.user-avatar');
    avatarElements.forEach(el => {
        if (user.photoURL) {
            el.src = user.photoURL;
            el.alt = user.nombre || 'Usuario';
            el.style.display = 'block';
        } else {
            // Mostrar iniciales si no hay foto
            const name = user.nombre || user.email;
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            el.src = `data:image/svg+xml;base64,${btoa(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <rect width="40" height="40" fill="#4a6cf7" rx="20"/>
                    <text x="50%" y="55%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">${initials}</text>
                </svg>
            `)}`;
        }
    });
    
    // Actualizar rol del usuario
    const roleElements = document.querySelectorAll('.user-role');
    roleElements.forEach(el => {
        if (user.rol) {
            el.textContent = user.rol.charAt(0).toUpperCase() + user.rol.slice(1);
            el.style.display = 'inline-block';
        } else {
            el.style.display = 'none';
        }
    });
}

/**
 * Muestra una notificación al usuario
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 * @param {number} [duration=5000] - Duración en milisegundos
 */
export function showNotification(message, type = 'info', duration = 5000) {
    // Crear contenedor de notificaciones si no existe
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.role = 'alert';
    notification.style.minWidth = '300px';
    notification.style.marginBottom = '10px';
    notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    `;
    
    // Agregar al contenedor
    container.appendChild(notification);
    
    // Inicializar tooltip de Bootstrap si está disponible
    if (window.bootstrap) {
        new window.bootstrap.Alert(notification);
    }
    
    // Eliminar después de la duración especificada
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode === container) {
                    container.removeChild(notification);
                }
            }, 150);
        }, duration);
    }
    
    // Devolver función para cerrar manualmente
    return {
        close: () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode === container) {
                    container.removeChild(notification);
                }
            }, 150);
        }
    };
}

// Inicializar tooltips de Bootstrap cuando estén disponibles
document.addEventListener('DOMContentLoaded', () => {
    if (window.bootstrap && window.bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new window.bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

// --- Delegación de eventos para logout-btn (siempre funciona, incluso con menús dinámicos) ---
document.body.addEventListener('click', async (e) => {
    const logoutBtn = e.target.closest('#logout-btn');
    if (logoutBtn) {
        console.log('Logout button clicked');
        try {
            await logout();
            showSection('login');
            showNotification('Sesión cerrada correctamente', 'success');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showNotification('Error al cerrar sesión', 'error');
        }
    }
});
