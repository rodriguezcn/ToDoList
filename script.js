let usuarioActual = null; 
let arregloTareas = []; // Ahora inicia vacío, se llena desde la base de datos
let criterioOrden = 'fecha_creacion'; 
let ordenAscendente = false;          

const pantallaInicioSesion = document.getElementById('pantalla-inicio-sesion');
const pantallaPrincipal = document.getElementById('pantalla-principal');
const formularioInicioSesion = document.getElementById('formulario-inicio-sesion');
const mensajeErrorLogin = document.getElementById('error-inicio-sesion');
const mensajeBienvenida = document.getElementById('mensaje-bienvenida');
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');
const botonRegistrarse = document.getElementById('boton-registrarse');

const cuerpoTablaTareas = document.getElementById('cuerpo-tabla-tareas'); 
const contadorTareas = document.getElementById('contador-tareas');
const formularioTarea = document.getElementById('formulario-tarea');

// Inputs del Filtro
const filtroTitulo = document.getElementById('filtro-titulo');
const filtroEtiqueta = document.getElementById('filtro-etiqueta');
const filtroEstado = document.getElementById('filtro-estado');
const filtroFechaCreacion = document.getElementById('filtro-fecha-creacion');
const filtroFechaModificacion = document.getElementById('filtro-fecha-modificacion');
const filtroUsuario = document.getElementById('filtro-usuario');
const botonLimpiarFiltros = document.getElementById('boton-limpiar-filtros');

// Elementos del Modal
const modalTareaBootstrap = new bootstrap.Modal(document.getElementById('modal-tarea'));
const botonAbrirModalAgregar = document.getElementById('boton-abrir-modal-agregar');
const tituloModal = document.getElementById('etiqueta-modal-tarea');
const contenedorFechaCreacion = document.getElementById('contenedor-fecha-creacion');

// Campos del formulario dentro del modal
const campoIdTarea = document.getElementById('campo-id-tarea');
const campoFechaCreacion = document.getElementById('campo-fecha-creacion');
const campoTitulo = document.getElementById('campo-titulo');
const campoDescripcion = document.getElementById('campo-descripcion');
const campoEtiqueta = document.getElementById('campo-etiqueta');
const campoEstado = document.getElementById('campo-estado');

// --- AUTENTICACIÓN Y REGISTRO ---
formularioInicioSesion.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nombreUsuario = document.getElementById('input-usuario').value.trim();
    const contrasenia = document.getElementById('input-contrasenia').value;

    // Conexión real al backend para iniciar sesión
    const respuesta = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: nombreUsuario, contrasenia: contrasenia })
    });
    
    const datos = await respuesta.json();

    if (datos.exito) {
        usuarioActual = datos.usuario;
        pantallaInicioSesion.classList.add('d-none');
        pantallaPrincipal.classList.remove('d-none');
        mensajeErrorLogin.classList.add('d-none');
        formularioInicioSesion.reset();
        
        mensajeBienvenida.innerHTML = `<i class="bi bi-person-circle me-1"></i> Hola, <strong>${usuarioActual.nombre}</strong>`;
        
        // Cargar tareas desde SQLite
        await cargarTareasDesdeBaseDeDatos();
    } else {
        mensajeErrorLogin.classList.remove('d-none');
        mensajeErrorLogin.textContent = "Usuario o contraseña incorrectos.";
    }
});

// Registro de usuario simple
botonRegistrarse.addEventListener('click', async () => {
    const nombreUsuario = document.getElementById('input-usuario').value.trim();
    const contrasenia = document.getElementById('input-contrasenia').value;

    if(!nombreUsuario || !contrasenia) {
        alert("Escribe un usuario y contraseña en los campos para registrarte.");
        return;
    }

    const respuesta = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: nombreUsuario, contrasenia: contrasenia })
    });
    const datos = await respuesta.json();
    
    if(datos.exito) alert("Usuario creado correctamente. Ya puedes ingresar.");
    else alert("El usuario ya existe.");
});

botonCerrarSesion.addEventListener('click', () => {
    usuarioActual = null;
    pantallaPrincipal.classList.add('d-none');
    pantallaInicioSesion.classList.remove('d-none');
});

// --- CARGA Y RENDERIZADO DESDE BASE DE DATOS ---
async function cargarTareasDesdeBaseDeDatos() {
    const respuesta = await fetch('/api/tareas');
    arregloTareas = await respuesta.json();
    mostrarTareasEnPantalla();
}

// Se expone al objeto global window para que pueda ser llamada desde el HTML
window.ordenarPor = (criterio) => {
    if (criterioOrden === criterio) {
        ordenAscendente = !ordenAscendente;
    } else {
        criterioOrden = criterio;
        ordenAscendente = (criterio === 'titulo' || criterio === 'tag' || criterio === 'estado' || criterio === 'id_usuario');
    }
    mostrarTareasEnPantalla(); 
};

function mostrarTareasEnPantalla() {
    cuerpoTablaTareas.innerHTML = '';
    
    // Lógica de ordenamiento
    let tareasProcesadas = [...arregloTareas].sort((a, b) => {
        let modificador = ordenAscendente ? 1 : -1;
        switch (criterioOrden) {
            case 'fecha_creacion': return (new Date(a.fecha_creacion) - new Date(b.fecha_creacion)) * modificador;
            case 'fecha_modificacion': return ((a.fecha_modificacion ? new Date(a.fecha_modificacion) : new Date(0)) - (b.fecha_modificacion ? new Date(b.fecha_modificacion) : new Date(0))) * modificador;
            case 'titulo': return a.titulo.localeCompare(b.titulo) * modificador;
            case 'tag': return a.tag.localeCompare(b.tag) * modificador;
            case 'estado': return a.estado.localeCompare(b.estado) * modificador;
            case 'id_usuario': return (a.nombre_creador || '').localeCompare(b.nombre_creador || '') * modificador;
            default: return 0;
        }
    });

    const valorFiltroTitulo = filtroTitulo.value.toLowerCase();
    const valorFiltroEtiqueta = filtroEtiqueta.value.toLowerCase();
    const valorFiltroEstado = filtroEstado.value;
    const valorFiltroFechaCreacion = filtroFechaCreacion.value;
    const valorFiltroFechaModificacion = filtroFechaModificacion.value;
    const valorFiltroUsuario = filtroUsuario.value.toLowerCase();

    const tareasFiltradas = tareasProcesadas.filter(tarea => {
        const coincideTitulo = tarea.titulo.toLowerCase().includes(valorFiltroTitulo);
        const coincideEtiqueta = tarea.tag.toLowerCase().includes(valorFiltroEtiqueta);
        const coincideEstado = valorFiltroEstado === 'todos' || tarea.estado === valorFiltroEstado;
        const coincideFechaCreacion = !valorFiltroFechaCreacion || tarea.fecha_creacion === valorFiltroFechaCreacion;
        const coincideFechaModificacion = !valorFiltroFechaModificacion || tarea.fecha_modificacion === valorFiltroFechaModificacion;
        const coincideUsuario = (tarea.nombre_creador || '').toLowerCase().includes(valorFiltroUsuario);
        
        return coincideTitulo && coincideEtiqueta && coincideEstado && coincideFechaCreacion && coincideFechaModificacion && coincideUsuario;
    });

    contadorTareas.textContent = `${tareasFiltradas.length} tareas`;

    if (tareasFiltradas.length === 0) {
        cuerpoTablaTareas.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-4">No se encontraron tareas.</td></tr>`;
        return;
    }

    tareasFiltradas.forEach(tarea => {
        const filaTabla = document.createElement('tr');
        let colorInsigniaEstado = 'bg-secondary';
        
        if (tarea.estado === 'Pendiente') colorInsigniaEstado = 'bg-secondary';
        if (tarea.estado === 'En Proceso') colorInsigniaEstado = 'bg-primary';
        if (tarea.estado === 'Pausada') colorInsigniaEstado = 'bg-danger';
        if (tarea.estado === 'Finalizada') colorInsigniaEstado = 'bg-success';

        filaTabla.innerHTML = `
            <td>
                <div class="fw-bold">${tarea.titulo}</div>
                <small class="text-muted d-block text-truncate" style="max-width: 350px;" title="${tarea.descripcion}">${tarea.descripcion}</small>
            </td>
            <td><span class="badge bg-light text-dark border small d-inline-block text-center" style="width: 130px;"><i class="bi bi-tag me-1"></i>${tarea.tag}</span></td>
            <td><span class="badge ${colorInsigniaEstado} small d-inline-block text-center" style="width: 130px;">${tarea.estado}</span></td>
            <td><small class="text-secondary"><strong>${tarea.nombre_creador || 'Desconocido'}</strong></small></td>
            <td><small class="text-muted">${tarea.fecha_creacion}</small></td>
            <td><small class="text-muted">${tarea.fecha_modificacion || '-'}</small></td>
            <td class="text-end px-3">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-secondary" onclick="abrirModalEdicion(${tarea.id_tarea})" title="Editar tarea"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-outline-danger" onclick="eliminarTarea(${tarea.id_tarea})" title="Eliminar tarea"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        `;
        cuerpoTablaTareas.appendChild(filaTabla);
    });
}

// --- CREAR Y EDITAR EN BASE DE DATOS ---
botonAbrirModalAgregar.addEventListener('click', () => {
    formularioTarea.reset();
    campoIdTarea.value = ""; 
    tituloModal.textContent = "Nueva Tarea";
    contenedorFechaCreacion.classList.add('d-none'); 
    modalTareaBootstrap.show();
});

window.abrirModalEdicion = (idBuscado) => {
    const tareaEncontrada = arregloTareas.find(t => t.id_tarea === idBuscado);
    if (!tareaEncontrada) return;

    campoIdTarea.value = tareaEncontrada.id_tarea;
    campoTitulo.value = tareaEncontrada.titulo;
    campoDescripcion.value = tareaEncontrada.descripcion;
    campoEtiqueta.value = tareaEncontrada.tag;
    campoEstado.value = tareaEncontrada.estado;
    campoFechaCreacion.value = tareaEncontrada.fecha_creacion;
    
    tituloModal.textContent = "Editar Tarea";
    contenedorFechaCreacion.classList.remove('d-none');
    modalTareaBootstrap.show();
};

formularioTarea.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const idDeLaTarea = campoIdTarea.value;
    const fechaDeHoy = new Date().toISOString().split('T')[0];

    const datosDeLaTarea = {
        titulo: campoTitulo.value.trim(),
        descripcion: campoDescripcion.value.trim(),
        estado: campoEstado.value,
        tag: campoEtiqueta.value.trim(),
        id_usuario: usuarioActual.id_usuario 
    };

    if (idDeLaTarea === "") {
        // Enviar al Backend (Crear Nueva)
        datosDeLaTarea.fecha_creacion = fechaDeHoy;
        await fetch('/api/tareas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosDeLaTarea)
        });
    } else {
        // Enviar al Backend (Actualizar Existente)
        datosDeLaTarea.fecha_modificacion = fechaDeHoy;
        await fetch(`/api/tareas/${idDeLaTarea}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosDeLaTarea)
        });
    }

    modalTareaBootstrap.hide();
    await cargarTareasDesdeBaseDeDatos(); // Recargar las tareas actualizadas de la base de datos
});

// Eliminar de Base de Datos
window.eliminarTarea = async (idAEliminar) => {
    if (confirm("¿Está seguro de que desea eliminar de forma permanente esta tarea?")) {
        await fetch(`/api/tareas/${idAEliminar}`, { method: 'DELETE' });
        await cargarTareasDesdeBaseDeDatos();
    }
};

// Escuchar cambios en los inputs de los filtros
const todosLosFiltros = [filtroTitulo, filtroEtiqueta, filtroEstado, filtroFechaCreacion, filtroFechaModificacion, filtroUsuario];
todosLosFiltros.forEach(inputFiltro => {
    inputFiltro.addEventListener('input', mostrarTareasEnPantalla);
    inputFiltro.addEventListener('change', mostrarTareasEnPantalla);
});

botonLimpiarFiltros.addEventListener('click', () => {
    filtroTitulo.value = "";
    filtroEtiqueta.value = "";
    filtroEstado.value = "todos";
    filtroFechaCreacion.value = "";
    filtroFechaModificacion.value = "";
    filtroUsuario.value = "";
    mostrarTareasEnPantalla();
});