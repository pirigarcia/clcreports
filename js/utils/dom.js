/**
 * Muestra una sección específica y oculta las demás
 * @param {string} sectionId - ID de la sección a mostrar
 * @param {boolean} updateHash - Si se debe actualizar el hash de la URL
 */
export function showSection(sectionId, updateHash = true) {
    // Ocultar todas las secciones
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = 'none';
    });

    
    
    // Mostrar la sección solicitada
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        
        // Desplazarse al inicio de la sección
        window.scrollTo(0, 0);
        
        // Actualizar el hash de la URL si es necesario
        if (updateHash && window.location.hash !== `#${sectionId}`) {
            window.history.pushState(null, '', `#${sectionId}`);
        }
        
        // Disparar evento personalizado
        const event = new CustomEvent('sectionShown', { detail: { sectionId } });
        document.dispatchEvent(event);
    } else {
        console.warn(`No se encontró la sección con ID: ${sectionId}`);
    }
}

/**
 * Crea un elemento HTML con atributos y contenido
 * @param {string} tag - Etiqueta HTML
 * @param {Object} attributes - Atributos del elemento
 * @param {string|HTMLElement|Array} content - Contenido del elemento
 * @returns {HTMLElement} Elemento HTML creado
 */
export function createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    
    // Establecer atributos
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            if (key.startsWith('data-') || key === 'class' || key === 'id' || key === 'type' || key === 'placeholder' || key === 'value') {
                element.setAttribute(key, value);
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else if (key === 'events') {
                Object.entries(value).forEach(([eventName, handler]) => {
                    element.addEventListener(eventName, handler);
                });
            } else {
                element[key] = value;
            }
        }
    });
    
    // Establecer contenido
    if (content !== null) {
        if (Array.isArray(content)) {
            content.forEach(item => {
                if (item instanceof HTMLElement) {
                    element.appendChild(item);
                } else if (typeof item === 'string') {
                    element.appendChild(document.createTextNode(item));
                }
            });
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        } else if (typeof content === 'string') {
            element.innerHTML = content;
        }
    }
    
    return element;
}

/**
 * Formatea una fecha a un string legible
 * @param {Date|string|number} date - Fecha a formatear
 * @param {string} format - Formato de salida (date, datetime, time, relative)
 * @returns {string} Fecha formateada
 */
export function formatDate(date, format = 'date') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    switch (format) {
        case 'date':
            return d.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
        case 'datetime':
            return d.toLocaleString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
        case 'time':
            return d.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
        case 'relative':
            const now = new Date();
            const diffInSeconds = Math.floor((now - d) / 1000);
            
            if (diffInSeconds < 60) {
                return 'Hace unos segundos';
            }
            
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) {
                return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
            }
            
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) {
                return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
            }
            
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 7) {
                return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
            }
            
            return d.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
        default:
            return d.toLocaleDateString('es-MX');
    }
}

/**
 * Muestra un indicador de carga
 * @param {string} message - Mensaje a mostrar
 * @param {HTMLElement} container - Contenedor donde mostrar el indicador
 * @returns {Function} Función para ocultar el indicador
 */
export function showLoading(message = 'Cargando...', container = document.body) {
    // Eliminar cualquier indicador de carga existente
    const existingLoader = document.getElementById('loading-overlay');
    if (existingLoader) {
        existingLoader.remove();
    }
    
    // Crear el overlay de carga
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    
    // Crear el spinner
    const spinner = document.createElement('div');
    spinner.className = 'spinner-border text-light';
    spinner.role = 'status';
    
    // Crear el mensaje
    const messageElement = document.createElement('span');
    messageElement.className = 'ms-2';
    messageElement.textContent = message;
    messageElement.style.color = 'white';
    
    // Agregar elementos al overlay
    overlay.appendChild(spinner);
    overlay.appendChild(messageElement);
    
    // Agregar el overlay al contenedor
    container.appendChild(overlay);
    
    // Retornar función para ocultar el indicador
    return () => {
        if (document.body.contains(overlay)) {
            overlay.remove();
        }
    };
}

/**
 * Oculta el indicador de carga
 */
export function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

/**
 * Valida si un elemento está visible en el viewport
 * @param {HTMLElement} element - Elemento a verificar
 * @returns {boolean} True si el elemento es visible en el viewport
 */
export function isInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Desplaza la página hasta un elemento de forma suave
 * @param {string|HTMLElement} target - Selector o elemento al que desplazarse
 * @param {Object} options - Opciones de desplazamiento
 * @param {number} [options.offset=0] - Desplazamiento adicional en píxeles
 * @param {string} [options.behavior='smooth'] - Comportamiento del desplazamiento
 */
export function scrollToElement(target, { offset = 0, behavior = 'smooth' } = {}) {
    let element;
    
    if (typeof target === 'string') {
        element = document.querySelector(target);
    } else if (target instanceof HTMLElement) {
        element = target;
    }
    
    if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition - offset,
            behavior
        });
    }
}

/**
 * Crea un elemento de formulario con validación
 * @param {Object} config - Configuración del formulario
 * @param {Function} onSubmit - Función a ejecutar al enviar el formulario
 * @returns {HTMLElement} Elemento del formulario
 */
export function createForm(config, onSubmit) {
    const form = document.createElement('form');
    form.noValidate = true;
    
    // Crear campos del formulario
    config.fields.forEach(fieldConfig => {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'mb-3';
        
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = fieldConfig.id;
        label.textContent = fieldConfig.label;
        
        let input;
        
        if (fieldConfig.type === 'select') {
            input = document.createElement('select');
            input.className = 'form-select';
            input.id = fieldConfig.id;
            input.required = fieldConfig.required || false;
            
            // Agregar opciones
            if (fieldConfig.options) {
                fieldConfig.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    if (option.selected) {
                        optionElement.selected = true;
                    }
                    input.appendChild(optionElement);
                });
            }
        } else {
            input = document.createElement('input');
            input.type = fieldConfig.type || 'text';
            input.className = 'form-control';
            input.id = fieldConfig.id;
            input.required = fieldConfig.required || false;
            
            if (fieldConfig.placeholder) {
                input.placeholder = fieldConfig.placeholder;
            }
            
            if (fieldConfig.value) {
                input.value = fieldConfig.value;
            }
        }
        
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = fieldConfig.invalidMessage || 'Este campo es obligatorio';
        
        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        fieldGroup.appendChild(feedback);
        
        form.appendChild(fieldGroup);
    });
    
    // Agregar botón de envío
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn btn-primary';
    submitButton.textContent = config.submitText || 'Enviar';
    
    form.appendChild(submitButton);
    
    // Manejar envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validar formulario
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }
        
        // Deshabilitar botón de envío
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ${config.submitLoadingText || 'Procesando...'}
        `;
        
        try {
            // Recolectar datos del formulario
            const formData = {};
            config.fields.forEach(field => {
                const input = form.querySelector(`#${field.id}`);
                formData[field.id] = field.type === 'number' ? 
                    parseFloat(input.value) || 0 : 
                    input.value;
            });
            
            // Ejecutar callback con los datos
            if (typeof onSubmit === 'function') {
                await onSubmit(formData, form);
            }
            
            // Resetear formulario si se especificó
            if (config.resetOnSubmit) {
                form.reset();
                form.classList.remove('was-validated');
            }
            
        } catch (error) {
            console.error('Error al procesar el formulario:', error);
            // Mostrar mensaje de error
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger mt-3';
            alert.role = 'alert';
            alert.textContent = error.message || 'Ocurrió un error al procesar el formulario';
            form.insertBefore(alert, submitButton);
            
            // Desplazarse al mensaje de error
            setTimeout(() => {
                scrollToElement(alert, { offset: 20 });
            }, 100);
            
        } finally {
            // Restaurar botón de envío
            submitButton.disabled = false;
            submitButton.textContent = config.submitText || 'Enviar';
        }
    });
    
    return form;
}

/**
 * Muestra una notificación al usuario
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 * @param {number} [duration=5000] - Duración en milisegundos antes de que desaparezca (0 para permanente)
 */
export function showNotification(message, type = 'info', duration = 5000) {
    // Crear contenedor de notificaciones si no existe
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.role = 'alert';
    notification.style.minWidth = '300px';
    notification.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
    
    // Contenido de la notificación
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    `;
    
    // Agregar al contenedor
    container.appendChild(notification);
    
    // Inicializar el tooltip de Bootstrap si está disponible
    if (typeof bootstrap !== 'undefined') {
        new bootstrap.Alert(notification);
    }
    
    // Configurar auto-cierre si se especificó una duración
    if (duration > 0) {
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification && notification.parentNode) {
                        notification.remove();
                    }
                    // Eliminar el contenedor si no hay más notificaciones
                    if (container && container.children.length === 0) {
                        container.remove();
                    }
                }, 150); // Tiempo para la animación de desvanecimiento
            }
        }, duration);
    }
    
    // Devolver función para cerrar manualmente
    return () => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    };
}
