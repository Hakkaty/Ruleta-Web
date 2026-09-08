const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT  || 3000;

// =====================================================
// CONFIGURACIÓN
// =====================================================

const ADMIN_PASSWORD = "ADMIN2026";

const COLORS = [
    "#e53935",
    "#1e88e5",
    "#43a047",
    "#fb8c00",
    "#8e24aa",
    "#00acc1",
    "#6d4c41",
    "#3949ab",
    "#f4511e",
    "#00897b",
    "#c0ca33",
    "#5e35b1"
];

// =====================================================
// CLAVE NUEVA CADA VEZ QUE SE INICIA EL SERVIDOR
// =====================================================

function generarClaveServidor() {
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let parte1 = "";
    let parte2 = "";

    for (let i = 0; i < 4; i++) {
        parte1 += caracteres[
            Math.floor(Math.random() * caracteres.length)
        ];
    }

    for (let i = 0; i < 2; i++) {
        parte2 += caracteres[
            Math.floor(Math.random() * caracteres.length)
        ];
    }

    return `VNG-${parte1}-${parte2}`;
}
let SERVER_ACCESS_KEY = generarClaveServidor();

// =====================================================
// DATOS DE LA RULETA
// =====================================================

let participants = [];

let roulette = {
    spinning: false,
    winner: null,
    rotation: 0
};

// =====================================================
// SESIONES
// =====================================================

const sessions = new Map();

function generarToken() {
    return crypto.randomBytes(32).toString("hex");
}

// =====================================================
// EXPRESS
// =====================================================

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================================================
// LOGIN ADMINISTRADOR
// =====================================================

app.post("/api/admin/login", (req, res) => {

    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            ok: false,
            message: "Clave de administrador incorrecta."
        });
    }

    const token = generarToken();

    sessions.set(token, {
        type: "admin"
    });

    res.json({
        ok: true,
        token
    });
});

// =====================================================
// COMPROBAR CLAVE DE PARTICIPANTE
// =====================================================

app.post("/api/participant/login", (req, res) => {

    const { name, accessKey } = req.body;

    if (!name || !accessKey) {
        return res.status(400).json({
            ok: false,
            message: "Completa todos los campos."
        });
    }

    if (accessKey !== SERVER_ACCESS_KEY) {
        return res.status(401).json({
            ok: false,
            message: "La clave de acceso no es válida."
        });
    }

    const cleanName = String(name).trim();

    if (cleanName.length < 1 || cleanName.length > 30) {
        return res.status(400).json({
            ok: false,
            message: "El nombre debe tener entre 1 y 30 caracteres."
        });
    }

    const token = generarToken();

    sessions.set(token, {
        type: "participant",
        name: cleanName
    });

    res.json({
        ok: true,
        token,
        name: cleanName
    });
});

// =====================================================
// FUNCIONES DE AUTORIZACIÓN
// =====================================================

function getSession(socket) {

    const token = socket.handshake.auth?.token;

    if (!token) {
        return null;
    }

    return sessions.get(token) || null;
}

// =====================================================
// ESTADO PÚBLICO
// =====================================================

function getPublicState() {

    return {
        participants: participants.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color
        })),

        spinning: roulette.spinning,

        winner: roulette.winner,

        rotation: roulette.rotation
    };
}

// =====================================================
// ENVIAR ESTADO A TODOS
// =====================================================

function broadcastState() {

    io.to("ruleta").emit(
        "stateUpdate",
        getPublicState()
    );
}
 app.get("/api/server-info", (req, res) => {
    res.json({
        ok: true,
        accessKey: SERVER_ACCESS_KEY
    });
});
// =====================================================
// SOCKET.IO
// =====================================================

io.on("connection", (socket) => {

    console.log("Cliente conectado:", socket.id);

    // -------------------------------------------------
    // AUTENTICACIÓN
    // -------------------------------------------------

    socket.on("authenticate", () => {

        const session = getSession(socket);

        if (!session) {

            socket.emit("authError", {
                message: "Sesión no válida."
            });

            return;
        }

        socket.data.session = session;

        socket.join("ruleta");

        socket.emit("authenticated", {
            type: session.type,
            name: session.name || null
        });

        socket.emit(
            "stateUpdate",
            getPublicState()
        );

        if (session.type === "admin") {

            socket.emit("serverKey", {
                key: SERVER_ACCESS_KEY
            });
        }
    });

    // -------------------------------------------------
    // ADMIN: AGREGAR PARTICIPANTE
    // -------------------------------------------------

    // -------------------------------------------------
// ADMIN: RESETEAR CLAVE DE ACCESO
// -------------------------------------------------

socket.on("adminResetAccessKey", () => {

    const session = socket.data.session;

    if (!session || session.type !== "admin") {
        return;
    }

    // Generar una nueva clave
    SERVER_ACCESS_KEY = generarClaveServidor();

    // Actualizar la clave solamente para los administradores
    socket.emit("serverKey", {
        key: SERVER_ACCESS_KEY
    });

    // Confirmación
    socket.emit("adminMessage", {
        message: "La clave de acceso fue cambiada correctamente."
    });

});

    socket.on("adminAddParticipant", (data) => {

        const session = socket.data.session;

        if (!session || session.type !== "admin") {
            return;
        }

        if (roulette.spinning) {
            socket.emit("adminError", {
                message: "No puedes modificar participantes mientras gira la ruleta."
            });
            return;
        }

        const name = String(data.name || "").trim();
        const color = data.color || COLORS[participants.length % COLORS.length];

        if (!name) {
            return;
        }

        if (participants.some(
            p => p.name.toLowerCase() === name.toLowerCase()
        )) {

            socket.emit("adminError", {
                message: "Ese nombre ya está registrado."
            });

            return;
        }

        const participant = {
            id: crypto.randomUUID(),
            name,
            color
        };

        participants.push(participant);

        broadcastState();
    });

    // -------------------------------------------------
    // ADMIN: EDITAR PARTICIPANTE
    // -------------------------------------------------

    socket.on("adminEditParticipant", (data) => {

        const session = socket.data.session;

        if (!session || session.type !== "admin") {
            return;
        }

        if (roulette.spinning) {
            return;
        }

        const participant = participants.find(
            p => p.id === data.id
        );

        if (!participant) {
            return;
        }

        const newName = String(data.name || "").trim();

        if (!newName) {
            return;
        }

        const duplicate = participants.find(
            p =>
                p.id !== participant.id &&
                p.name.toLowerCase() === newName.toLowerCase()
        );

        if (duplicate) {

            socket.emit("adminError", {
                message: "Ese nombre ya existe."
            });

            return;
        }

        participant.name = newName;

        if (data.color) {
            participant.color = data.color;
        }

        broadcastState();
    });

    // -------------------------------------------------
    // ADMIN: ELIMINAR
    // -------------------------------------------------

    socket.on("adminDeleteParticipant", (data) => {

        const session = socket.data.session;

        if (!session || session.type !== "admin") {
            return;
        }

        if (roulette.spinning) {
            return;
        }

        participants = participants.filter(
            p => p.id !== data.id
        );

        broadcastState();
    });

    // -------------------------------------------------
    // ADMIN: GIRAR RULETA
    // -------------------------------------------------

    socket.on("adminSpin", () => {

        const session = socket.data.session;

        if (!session || session.type !== "admin") {
            return;
        }

        if (roulette.spinning) {
            return;
        }

        if (participants.length < 2) {

            socket.emit("adminError", {
                message: "Necesitas al menos 2 participantes."
            });

            return;
        }

        // Elegir ganador en el servidor
        const winnerIndex = Math.floor(
            Math.random() * participants.length
        );

        const winner = participants[winnerIndex];

        const segmentAngle = 360 / participants.length;

        // Centro del segmento ganador
        const targetAngle =
            360 - (
                winnerIndex * segmentAngle +
                segmentAngle / 2
            );

        const currentRotation =
            ((roulette.rotation % 360) + 360) % 360;

        const difference =
            ((targetAngle - currentRotation) + 360) % 360;

        // Varias vueltas antes de detenerse
        const extraSpins = 360 * 6;

        roulette.rotation += extraSpins + difference;

        roulette.spinning = true;
        roulette.winner = null;

        io.to("ruleta").emit("wheelSpin", {
            rotation: roulette.rotation,
            duration: 6000
        });

        setTimeout(() => {

            roulette.spinning = false;

            roulette.winner = {
                id: winner.id,
                name: winner.name,
                color: winner.color
            };

            broadcastState();

            io.to("ruleta").emit(
                "wheelResult",
                roulette.winner
            );

        }, 6000);
    });

    // -------------------------------------------------
    // DESCONEXIÓN
    // -------------------------------------------------

    socket.on("disconnect", () => {

        console.log(
            "Cliente desconectado:",
            socket.id
        );
    });
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

server.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("========================================");
    console.log("       RULETA WEB INICIADA");
    console.log("========================================");
    console.log("");
    console.log(`PC:          http://localhost:${PORT}`);
    console.log(`Red local:   http://TU-IP:${PORT}`);
    console.log("");
    console.log("CLAVE DE PARTICIPANTES:");
    console.log(SERVER_ACCESS_KEY);
    console.log("");
    console.log("CLAVE ADMIN:");
    console.log(ADMIN_PASSWORD);
    console.log("");
    console.log("========================================");
});
