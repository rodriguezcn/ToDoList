const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const aplicacion = express();
const PORT = 3000;

// Middlewares: Permitir recibir JSON y servir los archivos estáticos (HTML, CSS, JS)
aplicacion.use(express.json());
aplicacion.use(express.static("./"));

// Conexión a Base de Datos
const baseDeDatos = new sqlite3.Database("./database.db", (error) => {
    if (error) {
        console.error("Error conectando a la base de datos:", error.message);
    } else {
        console.log("Base SQLite conectada");
    }
});

// Inicialización de Tablas y Usuario Test
baseDeDatos.serialize(() => {
    baseDeDatos.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL UNIQUE,
        contrasenia TEXT NOT NULL,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
    )`);
    
    baseDeDatos.run(`CREATE TABLE IF NOT EXISTS tareas (
        id_tarea INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        estado TEXT DEFAULT 'Pendiente',
        fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
        tag TEXT,
        id_usuario INTEGER,
        fecha_modificacion TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    )`);

    // Insertar el usuario test por defecto (IGNORA si ya existe)    
    baseDeDatos.run(`INSERT OR IGNORE INTO usuarios (usuario, contrasenia, nombre, email)
    VALUES ('test', 'test', 'Usuario Test', 'test@example.com')`);
});

// --- RUTAS DE LA API ---
// 1. Iniciar Sesión
aplicacion.post("/api/login", (peticion, respuesta) => {
    const { usuario, contrasenia } = peticion.body;
    baseDeDatos.get(`SELECT * FROM usuarios WHERE usuario = ? AND contrasenia = ?`, [usuario, contrasenia], (error, usuarioEncontrado) => {
        if (error) return respuesta.status(500).json({ error: error.message });
        if (usuarioEncontrado) respuesta.json({ exito: true, usuario: usuarioEncontrado });
        else respuesta.status(401).json({ exito: false });
    });
});

// 2. Registrar nuevo usuario
aplicacion.post("/api/registro", (peticion, respuesta) => {
    const { usuario, contrasenia } = peticion.body;
    baseDeDatos.run(`INSERT INTO usuarios (usuario, contrasenia, nombre, email) VALUES (?, ?, ?, ?)`,
        [usuario, contrasenia, usuario, `${usuario}@mail.com`], function(error) {
            if (error) return respuesta.status(400).json({ exito: false, error: "El usuario ya existe" });
            respuesta.json({ exito: true });
        });
});

// 3. Obtener todas las tareas

aplicacion.get("/api/tareas", (peticion, respuesta) => {
    // Obtenemos el id_usuario desde la URL (ej: /api/tareas?id_usuario=1)
    const { id_usuario } = peticion.query;

    if (!id_usuario) {
        return respuesta.status(400).json({ error: "Falta el id_usuario en la petición" });
    }

    const sql = `
        SELECT t.*, u.usuario as nombre_creador 
        FROM tareas t 
        LEFT JOIN usuarios u ON t.id_usuario = u.id_usuario
        WHERE t.id_usuario = ?
    `;

    baseDeDatos.all(sql, [id_usuario], (error, filas) => {
        if (error) return respuesta.status(500).json({ error: error.message });
        respuesta.json(filas);
    });
});

// 4. Crear tarea nueva
aplicacion.post("/api/tareas", (peticion, respuesta) => {
    const { titulo, descripcion, estado, tag, id_usuario, fecha_creacion } = peticion.body;
    const consultaSql = `INSERT INTO tareas (titulo, descripcion, estado, tag, id_usuario, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    baseDeDatos.run(consultaSql, [titulo, descripcion, estado, tag, id_usuario, fecha_creacion, ""], function(error) {
        if (error) return respuesta.status(500).json({ error: error.message });
        respuesta.json({ id_tarea: this.lastID });
    });
});

// 5. Modificar tarea existente
aplicacion.put("/api/tareas/:id", (peticion, respuesta) => {
    const { titulo, descripcion, estado, tag, fecha_modificacion } = peticion.body;
    const consultaSql = `UPDATE tareas SET titulo = ?, descripcion = ?, estado = ?, tag = ?, fecha_modificacion = ? WHERE id_tarea = ?`;
    baseDeDatos.run(consultaSql, [titulo, descripcion, estado, tag, fecha_modificacion, peticion.params.id], function(error) {
        if (error) return respuesta.status(500).json({ error: error.message });
        respuesta.json({ exito: true });
    });
});

// 6. Eliminar tarea
aplicacion.delete("/api/tareas/:id", (peticion, respuesta) => {
    baseDeDatos.run(`DELETE FROM tareas WHERE id_tarea = ?`, peticion.params.id, function(error) {
        if (error) return respuesta.status(500).json({ error: error.message });
        respuesta.json({ exito: true });
    });
});

// Iniciar Servidor
aplicacion.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}/`);
});