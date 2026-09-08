const socket = io();

let currentRoom = null;
let isAdmin = false;
let participants = [];

const homeScreen = document.getElementById("homeScreen");
const roomScreen = document.getElementById("roomScreen");

const createRoomButton =
    document.getElementById("createRoomButton");

const joinRoomButton =
    document.getElementById("joinRoomButton");

const nameInput =
    document.getElementById("nameInput");

const roomInput =
    document.getElementById("roomInput");

const roomCodeDisplay =
    document.getElementById("roomCodeDisplay");

const participantCount =
    document.getElementById("participantCount");

const participantsList =
    document.getElementById("participantsList");

const spinButton =
    document.getElementById("spinButton");

const adminMessage =
    document.getElementById("adminMessage");

const wheel =
    document.getElementById("wheel");

const result =
    document.getElementById("result");

const homeMessage =
    document.getElementById("homeMessage");


// Crear sala
createRoomButton.addEventListener("click", () => {

    socket.emit("createRoom");

});


// Unirse a una sala
joinRoomButton.addEventListener("click", () => {

    const name = nameInput.value.trim();

    const roomCode = roomInput.value
        .trim()
        .toUpperCase();

    homeMessage.textContent = "";

    socket.emit("joinRoom", {
        name: name,
        roomCode: roomCode
    });

});


// Sala creada
socket.on("roomCreated", (data) => {

    currentRoom = data.roomCode;

    isAdmin = true;

    showRoom();

});


// Usuario unido
socket.on("joinedRoom", (data) => {

    currentRoom = data.roomCode;

    isAdmin = false;

    showRoom();

});


// Error al entrar
socket.on("joinError", (data) => {

    homeMessage.textContent =
        data.message;

});


// Mostrar sala
function showRoom() {

    homeScreen.classList.add("hidden");

    roomScreen.classList.remove("hidden");

    roomCodeDisplay.textContent =
        currentRoom;

    if (isAdmin) {

        spinButton.classList.remove("hidden");

        adminMessage.classList.remove("hidden");

    } else {

        spinButton.classList.add("hidden");

        adminMessage.classList.add("hidden");

    }

}


// Actualizar participantes
socket.on("participantsUpdate", (data) => {

    participants = data.participants;

    participantCount.textContent =
        participants.length;

    renderParticipants();

    createWheel();

});


// Mostrar participantes
function renderParticipants() {

    if (participants.length === 0) {

        participantsList.textContent =
            "No hay participantes todavía.";

        return;
    }

    participantsList.innerHTML = "";

    participants.forEach((participant, index) => {

        const div =
            document.createElement("div");

        div.className = "participant";

        div.textContent =
            `${index + 1}. ${participant.name}`;

        participantsList.appendChild(div);

    });

}


// Crear la ruleta
function createWheel() {

    if (participants.length === 0) {

        wheel.style.background =
            "conic-gradient(#ddd 0deg 360deg)";

        return;
    }

    const colors = [
        "#ff595e",
        "#ffca3a",
        "#8ac926",
        "#1982c4",
        "#6a4c93",
        "#f9844a"
    ];

    const angle =
        360 / participants.length;

    let gradient = "conic-gradient(";

    participants.forEach((participant, index) => {

        const start = index * angle;

        const end = (index + 1) * angle;

        const color =
            colors[index % colors.length];

        gradient +=
            `${color} ${start}deg ${end}deg`;

        if (index < participants.length - 1) {
            gradient += ", ";
        }

    });

    gradient += ")";

    wheel.style.background = gradient;

}


// Girar
spinButton.addEventListener("click", () => {

    spinButton.disabled = true;

    result.textContent =
        "🎡 Girando...";

    socket.emit("spinWheel");

});


// Animación sincronizada
socket.on("wheelSpin", (data) => {

    const total =
        participants.length;

    const segmentAngle =
        360 / total;

    /*
        Calculamos el centro del segmento ganador.
        El puntero está arriba, en 0 grados.
    */

    const targetAngle =
        360 - (
            data.winnerIndex * segmentAngle +
            segmentAngle / 2
        );

    const extraSpins = 5 * 360;

    const rotation =
        extraSpins + targetAngle;

    wheel.style.transform =
        `rotate(${rotation}deg)`;

    result.textContent =
        "🎡 Girando...";

});


// Resultado
socket.on("wheelResult", (data) => {

    result.textContent =
        `🏆 Resultado: ${data.winner.name}`;

    spinButton.disabled = false;

    showWinnerCelebration(data.winner.name);
s
});

function showWinnerCelebration(winnerName) {

    // Crear contenedor
    const celebration = document.createElement("div");

    celebration.className = "celebration";

    celebration.innerHTML = `
        <div class="celebration-message">
            <div class="trophy">🏆</div>
            <h2>¡GANADOR!</h2>
            <div>${winnerName}</div>
        </div>
    `;

    document.body.appendChild(celebration);


    // Crear confeti
    for (let i = 0; i < 80; i++) {

        const confetti =
            document.createElement("div");

        confetti.className = "confetti";

        confetti.style.left =
            Math.random() * 100 + "vw";

        confetti.style.animationDuration =
            (2 + Math.random() * 3) + "s";

        confetti.style.animationDelay =
            Math.random() * .8 + "s";

        confetti.style.transform =
            `rotate(${Math.random() * 360}deg)`;

        document.body.appendChild(confetti);


        setTimeout(() => {

            confetti.remove();

        }, 5000);
    }


    // Quitar celebración después de 4 segundos
    setTimeout(() => {

        celebration.remove();

    }, 4000);
}

// Error al girar
socket.on("spinError", (data) => {

    showNotification(data.message);

    spinButton.disabled = false;

});


// Sala cerrada
socket.on("roomClosed", (data) => {

    alert(data.message);

    location.reload();

});


// Notificación
function showNotification(message) {

    const notification =
        document.getElementById("notification");

    notification.textContent =
        message;

    notification.style.display =
        "block";

    setTimeout(() => {

        notification.style.display =
            "none";

    }, 3000);

}