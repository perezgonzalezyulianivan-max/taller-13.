/* ==========================================================
   Taller 13 - Tablero Kanban
   Programación Web Creativa II - Universidad de Caldas
   ========================================================== */

"use strict";

/* ---------- 1. Constantes y datos de apoyo ---------- */
const CLAVE_ALMACENAMIENTO = "taller13_kanban_tareas";

const ESTADOS = ["pendiente", "proceso", "completada"];
const PRIORIDADES = ["baja", "media", "alta"];

const NOMBRES_ESTADO = {
    pendiente: "Pendientes",
    proceso: "En proceso",
    completada: "Completadas"
};

const NOMBRES_PRIORIDAD = {
    baja: "Baja",
    media: "Media",
    alta: "Alta"
};

const MENSAJES_VACIO = {
    pendiente: "No hay tareas pendientes. Cree una nueva tarea con el formulario.",
    proceso: "No hay tareas en proceso. Arrastre una tarjeta aquí o use Iniciar.",
    completada: "Todavía no hay tareas completadas."
};

/* Botones de movimiento que tendrá cada tarjeta según su estado actual */
const ACCIONES_MOVER = {
    pendiente: {
        anterior: null,
        siguiente: { estado: "proceso", texto: "Iniciar →" }
    },
    proceso: {
        anterior: { estado: "pendiente", texto: "← Pendiente" },
        siguiente: { estado: "completada", texto: "Completar →" }
    },
    completada: {
        anterior: { estado: "proceso", texto: "← Reabrir" },
        siguiente: null
    }
};

/* ---------- 2. Estado de la aplicación ---------- */
let tareas = [];
let idEnEdicion = null;
let idArrastrado = null;
let temporizadorMensaje = null;

/* ---------- 3. Referencias al DOM ---------- */
const formulario = document.getElementById("form-tarea");
const campoTitulo = document.getElementById("titulo");
const campoDescripcion = document.getElementById("descripcion");
const campoPrioridad = document.getElementById("prioridad");
const tituloFormulario = document.getElementById("titulo-formulario");
const botonGuardar = document.getElementById("btn-guardar");
const botonCancelar = document.getElementById("btn-cancelar");
const botonVaciar = document.getElementById("btn-vaciar");
const zonaMensaje = document.getElementById("mensaje");
const totalTareas = document.getElementById("total-tareas");
const columnas = document.querySelectorAll(".columna");

/* ---------- 4. LocalStorage ---------- */
function guardarTareas() {
    try {
        localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(tareas));
    } catch (error) {
        console.error("No se pudo guardar en LocalStorage:", error);
        mostrarMensaje("No se pudo guardar la información.", "error");
    }
}

function cargarTareas() {
    try {
        const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
        if (!texto) {
            return [];
        }
        const datos = JSON.parse(texto);
        if (!Array.isArray(datos)) {
            return [];
        }
        return datos
            .filter((t) => t && typeof t === "object" && t.titulo)
            .map((t) => ({
                id: String(t.id || generarId()),
                titulo: String(t.titulo),
                descripcion: String(t.descripcion || ""),
                prioridad: PRIORIDADES.includes(t.prioridad)
                    ? t.prioridad
                    : "media",
                estado: ESTADOS.includes(t.estado) ? t.estado : "pendiente",
                fechaCreacion: t.fechaCreacion || new Date().toISOString()
            }));
    } catch (error) {
        console.error("No se pudo leer LocalStorage:", error);
        return [];
    }
}

/* ---------- 5. Utilidades ---------- */
function generarId() {
    return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatearFecha(fechaIso) {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
        return "Fecha no disponible";
    }
    return fecha.toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function mostrarMensaje(texto, tipo) {
    zonaMensaje.textContent = texto;
    zonaMensaje.className = "mensaje mensaje-" + tipo;
    zonaMensaje.hidden = false;
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => {
        zonaMensaje.hidden = true;
    }, 3500);
}

/* ---------- 6. Operaciones sobre las tareas ---------- */
function crearTarea(titulo, descripcion, prioridad) {
    const nueva = {
        id: generarId(),
        titulo: titulo,
        descripcion: descripcion,
        prioridad: prioridad,
        estado: "pendiente",
        fechaCreacion: new Date().toISOString()
    };
    tareas.push(nueva);
}

function actualizarTarea(id, titulo, descripcion, prioridad) {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) {
        return;
    }
    tarea.titulo = titulo;
    tarea.descripcion = descripcion;
    tarea.prioridad = prioridad;
}

function eliminarTarea(id) {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) {
        return;
    }
    const confirmado = window.confirm(
        '¿Desea eliminar la tarea "' + tarea.titulo + '"?'
    );
    if (!confirmado) {
        return;
    }
    tareas = tareas.filter((t) => t.id !== id);
    if (idEnEdicion === id) {
        cancelarEdicion();
    }
    guardarTareas();
    renderizarTablero();
    mostrarMensaje("La tarea fue eliminada.", "exito");
}

function moverTarea(id, nuevoEstado) {
    if (!ESTADOS.includes(nuevoEstado)) {
        return;
    }
    const indice = tareas.findIndex((t) => t.id === id);
    if (indice === -1) {
        return;
    }
    const tarea = tareas[indice];
    if (tarea.estado === nuevoEstado) {
        return;
    }
    tareas.splice(indice, 1);
    tarea.estado = nuevoEstado;
    tareas.push(tarea);
    guardarTareas();
    renderizarTablero();
    mostrarMensaje(
        'La tarea "' + tarea.titulo + '" pasó a ' +
            NOMBRES_ESTADO[nuevoEstado] + ".",
        "exito"
    );
}

/* ---------- 7. Edición mediante el formulario ---------- */
function iniciarEdicion(id) {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) {
        return;
    }
    idEnEdicion = id;
    campoTitulo.value = tarea.titulo;
    campoDescripcion.value = tarea.descripcion;
    campoPrioridad.value = tarea.prioridad;
    tituloFormulario.textContent = "Editar tarea";
    botonGuardar.textContent = "Guardar cambios";
    botonCancelar.hidden = false;
    formulario.classList.add("modo-edicion");
    renderizarTablero();
    formulario.scrollIntoView({ behavior: "smooth", block: "center" });
    campoTitulo.focus({ preventScroll: true });
}

function cancelarEdicion() {
    idEnEdicion = null;
    formulario.reset();
    tituloFormulario.textContent = "Nueva tarea";
    botonGuardar.textContent = "Agregar tarea";
    botonCancelar.hidden = true;
    formulario.classList.remove("modo-edicion");
    renderizarTablero();
}

function manejarEnvio(evento) {
    evento.preventDefault();

    const titulo = campoTitulo.value.trim();
    const descripcion = campoDescripcion.value.trim();
    const prioridad = campoPrioridad.value;

    if (titulo === "") {
        mostrarMensaje("Escriba un título para la tarea.", "error");
        campoTitulo.focus();
        return;
    }

    if (idEnEdicion !== null) {
        actualizarTarea(idEnEdicion, titulo, descripcion, prioridad);
        guardarTareas();
        cancelarEdicion();
        mostrarMensaje("La tarea fue actualizada correctamente.", "exito");
    } else {
        crearTarea(titulo, descripcion, prioridad);
        guardarTareas();
        formulario.reset();
        renderizarTablero();
        mostrarMensaje("La tarea fue creada en la columna Pendientes.", "exito");
        campoTitulo.focus();
    }
}

function vaciarTablero() {
    if (tareas.length === 0) {
        mostrarMensaje("El tablero ya está vacío.", "error");
        return;
    }
    const confirmado = window.confirm(
        "¿Desea eliminar TODAS las tareas del tablero?"
    );
    if (!confirmado) {
        return;
    }
    tareas = [];
    guardarTareas();
    cancelarEdicion();
    mostrarMensaje("Se eliminaron todas las tareas.", "exito");
}

/* ---------- 8. Creación de elementos del DOM ---------- */
function crearBoton(texto, clase, accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn-mini " + clase;
    boton.textContent = texto;
    boton.addEventListener("click", accion);
    return boton;
}

function crearTarjeta(tarea) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta prioridad-" + tarea.prioridad;
    if (tarea.id === idEnEdicion) {
        tarjeta.classList.add("en-edicion");
    }
    tarjeta.draggable = true;
    tarjeta.dataset.id = tarea.id;

    /* Eventos de arrastre de la tarjeta */
    tarjeta.addEventListener("dragstart", (evento) => {
        idArrastrado = tarea.id;
        evento.dataTransfer.setData("text/plain", tarea.id);
        evento.dataTransfer.effectAllowed = "move";
        setTimeout(() => tarjeta.classList.add("arrastrando"), 0);
    });

    tarjeta.addEventListener("dragend", () => {
        idArrastrado = null;
        tarjeta.classList.remove("arrastrando");
        columnas.forEach((columna) => columna.classList.remove("sobre"));
    });

    /* Etiqueta de prioridad */
    const cabecera = document.createElement("div");
    cabecera.className = "tarjeta-cabecera";
    const etiqueta = document.createElement("span");
    etiqueta.className = "etiqueta-prioridad etiqueta-" + tarea.prioridad;
    etiqueta.textContent = "Prioridad " + NOMBRES_PRIORIDAD[tarea.prioridad];
    cabecera.appendChild(etiqueta);
    tarjeta.appendChild(cabecera);

    /* Título */
    const titulo = document.createElement("h3");
    titulo.className = "tarjeta-titulo";
    titulo.textContent = tarea.titulo;
    tarjeta.appendChild(titulo);

    /* Descripción (solo si existe) */
    if (tarea.descripcion !== "") {
        const descripcion = document.createElement("p");
        descripcion.className = "tarjeta-descripcion";
        descripcion.textContent = tarea.descripcion;
        tarjeta.appendChild(descripcion);
    }

    /* Fecha de creación */
    const fecha = document.createElement("p");
    fecha.className = "tarjeta-fecha";
    fecha.textContent = "Creada: " + formatearFecha(tarea.fechaCreacion);
    tarjeta.appendChild(fecha);

    /* Botones de acción */
    const acciones = document.createElement("div");
    acciones.className = "tarjeta-acciones";
    const movimientos = ACCIONES_MOVER[tarea.estado];

    if (movimientos.anterior) {
        acciones.appendChild(
            crearBoton(movimientos.anterior.texto, "btn-mover", () => {
                moverTarea(tarea.id, movimientos.anterior.estado);
            })
        );
    }
    if (movimientos.siguiente) {
        acciones.appendChild(
            crearBoton(movimientos.siguiente.texto, "btn-mover", () => {
                moverTarea(tarea.id, movimientos.siguiente.estado);
            })
        );
    }
    acciones.appendChild(
        crearBoton("Editar", "btn-editar", () => iniciarEdicion(tarea.id))
    );
    acciones.appendChild(
        crearBoton("Eliminar", "btn-eliminar", () => eliminarTarea(tarea.id))
    );
    tarjeta.appendChild(acciones);

    return tarjeta;
}

function crearMensajeVacio(estado) {
    const mensaje = document.createElement("p");
    mensaje.className = "mensaje-vacio";
    mensaje.textContent = MENSAJES_VACIO[estado];
    return mensaje;
}

/* ---------- 9. Dibujar el tablero ---------- */
function renderizarTablero() {
    ESTADOS.forEach((estado) => {
        const lista = document.getElementById("lista-" + estado);
        const contador = document.getElementById("contador-" + estado);
        const tareasDelEstado = tareas.filter((t) => t.estado === estado);

        lista.innerHTML = "";

        if (tareasDelEstado.length === 0) {
            lista.appendChild(crearMensajeVacio(estado));
        } else {
            tareasDelEstado.forEach((tarea) => {
                lista.appendChild(crearTarjeta(tarea));
            });
        }

        contador.textContent = tareasDelEstado.length;
    });

    totalTareas.textContent = tareas.length;
}

/* ---------- 10. Drag and Drop en las columnas ---------- */
function configurarDragAndDrop() {
    columnas.forEach((columna) => {
        const estadoColumna = columna.dataset.estado;

        columna.addEventListener("dragover", (evento) => {
            evento.preventDefault();
            evento.dataTransfer.dropEffect = "move";
            columna.classList.add("sobre");
        });

        columna.addEventListener("dragleave", (evento) => {
            if (!columna.contains(evento.relatedTarget)) {
                columna.classList.remove("sobre");
            }
        });

        columna.addEventListener("drop", (evento) => {
            evento.preventDefault();
            columna.classList.remove("sobre");
            const id = idArrastrado || evento.dataTransfer.getData("text/plain");
            if (id) {
                moverTarea(id, estadoColumna);
            }
        });
    });
}

/* ---------- 11. Eventos generales e inicio ---------- */
formulario.addEventListener("submit", manejarEnvio);
botonCancelar.addEventListener("click", cancelarEdicion);
botonVaciar.addEventListener("click", vaciarTablero);

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && idEnEdicion !== null) {
        cancelarEdicion();
    }
});

function iniciar() {
    tareas = cargarTareas();
    configurarDragAndDrop();
    renderizarTablero();
}

iniciar();
