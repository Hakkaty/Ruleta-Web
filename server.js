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

const ADMIN_PASSWORD = "0705865103Ch_";

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
    countdown: false,
    winner: null,
    rotation: 0,
    forcedTarget: null
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
// REGISTRO AUTOMÁTICO DE PARTICIPANTE
// =====================================================

app.post("/api/participant/login", (req, res) => {

    const { name, accessKey } = req.body;

    // ---------------------------------------------
    // COMPROBAR DATOS
    // ---------------------------------------------

    if (!name || !accessKey) {

        return res.status(400).json({
            ok: false,
            message: "Completa todos los campos."
        });
    }

    // ---------------------------------------------
    // COMPROBAR CLAVE
    // ---------------------------------------------

    if (accessKey !== SERVER_ACCESS_KEY) {

        return res.status(401).json({
            ok: false,
            message: "La clave de acceso no es válida."
        });
    }

    // ---------------------------------------------
    // LIMPIAR NOMBRE
    // ---------------------------------------------

    const cleanName = String(name).trim();

    if (
        cleanName.length < 1 ||
        cleanName.length > 30
    ) {

        return res.status(400).json({
            ok: false,
            message: "El nombre debe tener entre 1 y 30 caracteres."
        });
    }

    // ---------------------------------------------
    // NO PERMITIR REGISTRO DURANTE EL GIRO
    // ---------------------------------------------

    if (roulette.spinning) {

        return res.status(400).json({
            ok: false,
            message: "No puedes registrarte mientras la ruleta está girando."
        });
    }

    // ---------------------------------------------
    // COMPROBAR SI EL NOMBRE YA EXISTE
    // ---------------------------------------------

    const alreadyExists = participants.some(
        p =>
            p.name.toLowerCase() ===
            cleanName.toLowerCase()
    );

    if (alreadyExists) {

        return res.status(400).json({
            ok: false,
            message: "Ese nombre ya está registrado."
        });
    }

    // ---------------------------------------------
    // ELEGIR COLOR AUTOMÁTICAMENTE
    // ---------------------------------------------

    const color =
        COLORS[
            participants.length % COLORS.length
        ];

    // ---------------------------------------------
    // CREAR PARTICIPANTE
    // ---------------------------------------------

    const participant = {

        id: crypto.randomUUID(),

        name: cleanName,

        color: color

    };

    // ---------------------------------------------
    // GUARDAR PARTICIPANTE
    // ---------------------------------------------

    participants.push(participant);

    // ---------------------------------------------
    // CREAR SESIÓN
    // ---------------------------------------------

    const token = generarToken();

    sessions.set(token, {

        type: "participant",

        name: cleanName,

        participantId: participant.id

    });

    // ---------------------------------------------
    // ACTUALIZAR ADMINISTRADOR AUTOMÁTICAMENTE
    // ---------------------------------------------

    broadcastState();

    // ---------------------------------------------
    // RESPONDER AL PARTICIPANTE
    // ---------------------------------------------

    res.json({

        ok: true,

        token,

        name: cleanName,

        participantId: participant.id

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

        socket.on("requestState", () => {

        const session = socket.data.session;

        if (!session) {
            return;
        }

        socket.emit(
            "stateUpdate",
            getPublicState()
        );

    });


    // -------------------------------------------------
    // ADMIN: ESTABLECER CASILLA OBJETIVO
    // -------------------------------------------------

    socket.on("adminSetTarget", (data) => {

        const session = socket.data.session;

        if (!session || session.type !== "admin") {
            return;
        }

        if (roulette.spinning) {

            socket.emit("adminError", {
                message: "No puedes cambiar el objetivo mientras gira la ruleta."
            });

            return;
        }

        const target =
            String(data?.target ?? "").trim();

        if (!target) {

            roulette.forcedTarget = null;

            socket.emit("adminMessage", {
                message: "Objetivo eliminado. La próxima tirada será aleatoria."
            });

            return;
        }

        roulette.forcedTarget = target;

        socket.emit("adminMessage", {
            message: `Objetivo registrado: ${target}`
        });

    });


    // -------------------------------------------------
    // ADMIN: ELIMINAR CASILLA OBJETIVO
    // -------------------------------------------------

    socket.on("adminClearTarget", () => {

        const session = socket.data.session;

        if (!session || session.type !== "admin") {
            return;
        }

        if (roulette.spinning) {
            return;
        }

        roulette.forcedTarget = null;

        socket.emit("adminMessage", {
            message:
                "Objetivo eliminado. La ruleta funcionará de manera aleatoria."
        });

    });
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
// ADMIN: INICIAR CUENTA REGRESIVA
// -------------------------------------------------
socket.on("adminStartCountdown", () => {

    const session = socket.data.session;

    if (!session || session.type !== "admin") {
        return;
    }

    if (roulette.spinning || roulette.countdown) {
        return;
    }

    if (participants.length < 2) {

        socket.emit("adminError", {
            message: "Necesitas al menos 2 participantes."
        });

        return;
    }

    roulette.countdown = true;
    roulette.winner = null;

    io.to("ruleta").emit("wheelCountdown", {
        number: 3
    });

    setTimeout(() => {

        if (!roulette.countdown) return;

        io.to("ruleta").emit("wheelCountdown", {
            number: 2
        });

    }, 1000);

    setTimeout(() => {

        if (!roulette.countdown) return;

        io.to("ruleta").emit("wheelCountdown", {
            number: 1
        });

    }, 2000);

    setTimeout(() => {

        if (!roulette.countdown) return;

        io.to("ruleta").emit("wheelCountdown", {
            number: "START!"
        });

    }, 3000);

setTimeout(() => { 
    if (!roulette.countdown) return; 
    
    roulette.countdown = false; 
    
    // Todos los dispositivos reciben la orden ahora // y comienzan exactamente 1 segundo después. 
    
    const startAt = Date.now() + 1000; 
    
    realizarGiro(startAt);

}, 3000);

});

// -------------------------------------------------
// FUNCIÓN REALIZAR GIRO
// -------------------------------------------------
// -------------------------------------------------
// FUNCIÓN REALIZAR GIRO
// -------------------------------------------------
function realizarGiro(startAt = Date.now()) {

    // Evitar giros simultáneos
    if (roulette.spinning) {
        return;
    }

    if (roulette.countdown) {
        return;
    }

    // Necesitamos al menos 2 participantes
    if (participants.length < 2) {
        return;
    }

    // =====================================================
    // DETERMINAR GANADOR
    // =====================================================

    let winnerIndex = -1;

    if (roulette.forcedTarget) {

        // Primero buscar por ID
        winnerIndex = participants.findIndex(
            p => String(p.id) === String(roulette.forcedTarget)
        );

        // Si no existe, buscar por nombre
        if (winnerIndex === -1) {
            winnerIndex = participants.findIndex(
                p => p.name === roulette.forcedTarget
            );
        }

        // Si es un número, tratarlo como posición 1, 2, 3...
        if (
            winnerIndex === -1 &&
            !isNaN(roulette.forcedTarget)
        ) {

            const number = Number(
                roulette.forcedTarget
            );

            if (
                number >= 1 &&
                number <= participants.length
            ) {
                winnerIndex = number - 1;
            }
        }
    }

    // Si no hay resultado controlado, elegir aleatoriamente
    if (winnerIndex === -1) {
        winnerIndex = Math.floor(
            Math.random() * participants.length
        );
    }

    const winner = participants[winnerIndex];

    // =====================================================
    // CONVERTIR LA POSICIÓN EN ÁNGULO
    // =====================================================

    const segmentAngle =
        360 / participants.length;

    // El puntero está arriba
    const targetAngle =
        360 - (
            winnerIndex * segmentAngle +
            segmentAngle / 2
        );

    // Normalizar rotación actual
    const currentNormalized =
        ((roulette.rotation % 360) + 360) % 360;

    const targetNormalized =
        ((targetAngle % 360) + 360) % 360;

    let difference =
        targetNormalized -
        currentNormalized;

    if (difference < 0) {
        difference += 360;
    }

    // Varias vueltas completas para que se vea el giro
    const extraSpins = 360 * 6;

    roulette.rotation =
        roulette.rotation +
        extraSpins +
        difference;

    // =====================================================
    // PREPARAR ESTADO
    // =====================================================

    roulette.spinning = true;
    roulette.winner = null;

    // El objetivo solo se utiliza una vez
    roulette.forcedTarget = null;

    const duration = 14500;

    io.to("ruleta").emit("wheelSpin", {
        rotation: roulette.rotation,
        duration,
        startAt
    });

    // Esperamos hasta que realmente termine la animación,
    // contando también el tiempo que falta hasta startAt.
    const finishDelay =
        Math.max(0, startAt - Date.now()) +
        duration;

    setTimeout(() => {

        roulette.spinning = false;
        roulette.winner = winner;

        // Primero dejamos la ruleta exactamente en su posición final.
        broadcastState();

        // Después mostramos el ganador.
        io.to("ruleta").emit("wheelResult", {
            winner: roulette.winner
        });

    }, finishDelay);
}

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
