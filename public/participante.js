let socket = null;

let currentParticipants = [];
let currentRotation = 0;

// =====================================================
// ELEMENTOS
// =====================================================

const loginScreen = document.getElementById("loginScreen");
const rouletteScreen = document.getElementById("rouletteScreen");

const nameInput = document.getElementById("participantName");
const accessKeyInput = document.getElementById("accessKey");
const enterButton = document.getElementById("enterButton");
const loginMessage = document.getElementById("loginMessage");

const wheel = document.getElementById("wheel");
const winnerBox = document.getElementById("winnerBox");
const myName = document.getElementById("myName");

const publicParticipantCount =
document.getElementById("publicParticipantCount");

const publicParticipantsList =
document.getElementById("publicParticipantsList");

// =====================================================
// ENTRAR
// =====================================================

enterButton.addEventListener("click", async () => {

const name = nameInput.value.trim();

const accessKey =
    accessKeyInput.value.trim().toUpperCase();

if (!name || !accessKey) {

    loginMessage.textContent =
        "Completa tu nombre y la clave.";

    return;
}

enterButton.disabled = true;

loginMessage.textContent =
    "Comprobando acceso...";

try {

    const response =
        await fetch("/api/participant/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                accessKey: accessKey
            })
        });

    const data = await response.json();

    if (!data.ok) {

        loginMessage.textContent =
            data.message || "No se pudo ingresar.";

        enterButton.disabled = false;

        return;
    }

    localStorage.setItem(
        "participantToken",
        data.token
    );

    localStorage.setItem(
        "participantName",
        data.name
    );

    entrarALaRuleta(
        data.token,
        data.name
    );

} catch (error) {

    console.error(error);

    loginMessage.textContent =
        "No se pudo conectar con el servidor.";

    enterButton.disabled = false;
}

});

// =====================================================
// ENTRAR A LA RULETA
// =====================================================

function entrarALaRuleta(token, name) {


loginScreen.classList.add("hidden");

rouletteScreen.classList.remove("hidden");

myName.textContent =
    `👤 ${name}`;

socket = io({
    auth: {
        token: token
    }
});

configurarSocket();


}

// =====================================================
// SOCKET
// =====================================================

function configurarSocket() {

socket.on("connect", () => {

    console.log("Conectado al servidor.");

    socket.emit("authenticate");

});


socket.on("authenticated", (data) => {

    console.log("Participante autenticado.");

    if (data && data.name) {

        myName.textContent =
            `👤 ${data.name}`;

    }

});


socket.on("authError", () => {

    localStorage.removeItem(
        "participantToken"
    );

    localStorage.removeItem(
        "participantName"
    );

    location.reload();

});


// =================================================
// ACTUALIZACIÓN DEL ESTADO
// =================================================

socket.on("stateUpdate", (state) => {

    currentParticipants =
        state.participants || [];

    currentRotation =
        state.rotation || 0;

    crearRuleta();

    renderPublicParticipants();

    wheel.style.transform =
        `rotate(${currentRotation}deg)`;


    if (state.winner) {

        mostrarGanador(
            state.winner.name
        );

    } else {

        winnerBox.innerHTML =
            "<span>ESPERANDO RESULTADO</span>";

    }

});


// =================================================
// GIRO
// =================================================

socket.on("wheelSpin", (data) => {

    wheel.style.transition =
        `transform ${data.duration}ms cubic-bezier(0.12, 0.8, 0.18, 1)`;

    wheel.style.transform =
        `rotate(${data.rotation}deg)`;

    winnerBox.innerHTML =
        "<span>🎡 LA RULETA ESTÁ GIRANDO...</span>";

});


// =================================================
// RESULTADO
// =================================================

socket.on("wheelResult", (winner) => {

    mostrarGanador(
        winner.name
    );

});


}

// =====================================================
// CREAR RULETA
// =====================================================

function crearRuleta() {

wheel.innerHTML = "";

if (currentParticipants.length === 0) {

    wheel.style.background = "#333";

    return;
}

const total =
    currentParticipants.length;

const angle =
    360 / total;


// Crear fondo de la ruleta

let gradient =
    "conic-gradient(";

currentParticipants.forEach(
    (participant, index) => {

        const start =
            index * angle;

        const end =
            (index + 1) * angle;

        gradient +=
            `${participant.color} ${start}deg ${end}deg`;

        if (
            index <
            currentParticipants.length - 1
        ) {

            gradient += ", ";

        }

    }
);

gradient += ")";

wheel.style.background =
    gradient;


// Radio de los nombres

const radius =
    Math.max(
        50,
        wheel.offsetWidth * 0.34
    );


// Crear nombres

currentParticipants.forEach(
    (participant, index) => {

        const label =
            document.createElement("div");

        label.className =
            "wheel-label";

        label.textContent =
            participant.name;

        const centerAngle =
            index * angle +
            angle / 2;

        label.style.transform =
            `rotate(${centerAngle}deg)
             translateY(-${radius}px)
             rotate(-${centerAngle}deg)`;

        wheel.appendChild(label);

    }
);


}

// =====================================================
// CAMBIO DE TAMAÑO
// =====================================================

window.addEventListener(
"resize",
() => {

    crearRuleta();

    wheel.style.transform =
        `rotate(${currentRotation}deg)`;

}


);

// =====================================================
// LISTA PÚBLICA DE PARTICIPANTES
// =====================================================

function renderPublicParticipants() {

if (
    !publicParticipantCount ||
    !publicParticipantsList
) {

    return;
}


// Número de participantes

publicParticipantCount.textContent =
    currentParticipants.length;


// Limpiar lista

publicParticipantsList.innerHTML = "";


// Sin participantes

if (currentParticipants.length === 0) {

    publicParticipantsList.innerHTML =
        `<div class="empty">
            Esperando participantes...
        </div>`;

    return;
}


// Crear participantes

currentParticipants.forEach(
    (participant, index) => {

        const row =
            document.createElement("div");

        row.className =
            "public-participant-row";


        // Número

        const number =
            document.createElement("span");

        number.className =
            "public-participant-number";

        number.textContent =
            index + 1;


        // Color

        const color =
            document.createElement("span");

        color.className =
            "public-participant-color";

        color.style.background =
            participant.color;


        // Nombre

        const name =
            document.createElement("span");

        name.className =
            "public-participant-name";

        name.textContent =
            participant.name;


        row.appendChild(number);
        row.appendChild(color);
        row.appendChild(name);

        publicParticipantsList.appendChild(row);

    }
);

}

// =====================================================
// MOSTRAR GANADOR
// =====================================================

function mostrarGanador(name) {


winnerBox.innerHTML =
    `<span>🏆 GANADOR</span>
     <strong>${escapeHTML(name)}</strong>`;


}

// =====================================================
// SEGURIDAD
// =====================================================

function escapeHTML(text) {

return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

// =====================================================
// RECUPERAR SESIÓN
// =====================================================

const savedToken =
localStorage.getItem(
"participantToken"
);

const savedName =
localStorage.getItem(
"participantName"
);

if (
savedToken &&
savedName
) {


entrarALaRuleta(
    savedToken,
    savedName
);


}

// =====================================================
// ACTUALIZAR
// =====================================================

const refreshButton =
document.getElementById("refreshButton");

if (refreshButton) {

refreshButton.addEventListener(
    "click",
    () => {

        location.reload();

    }
);

}

// =====================================================
// SALIR
// =====================================================

const logoutButton =
document.getElementById("logoutButton");

if (logoutButton) {

logoutButton.addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            "participantToken"
        );

        localStorage.removeItem(
            "participantName"
        );

        if (socket) {

            socket.disconnect();

        }

        location.href =
            "/participante.html";

    }
);
}
