let socket = null;

let currentParticipants = [];
let currentRotation = 0;


// =====================================================
// ELEMENTOS
// =====================================================

const loginScreen =
    document.getElementById("loginScreen");

const rouletteScreen =
    document.getElementById("rouletteScreen");

const nameInput =
    document.getElementById("participantName");

const accessKeyInput =
    document.getElementById("accessKey");

const enterButton =
    document.getElementById("enterButton");

const loginMessage =
    document.getElementById("loginMessage");

const wheel =
    document.getElementById("wheel");

const winnerBox =
    document.getElementById("winnerBox");

const myName =
    document.getElementById("myName");


// =====================================================
// ENTRAR
// =====================================================

enterButton.addEventListener("click", async () => {

    const name =
        nameInput.value.trim();

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
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    name,
                    accessKey
                })
            });

        const data =
            await response.json();

        if (!data.ok) {

            loginMessage.textContent =
                data.message;

            enterButton.disabled = false;

            return;
        }

        // Guardar sesión
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

    socket =
        io({
            auth: {
                token
            }
        });

    configurarSocket();
}


// =====================================================
// SOCKET
// =====================================================

function configurarSocket() {

    socket.on("connect", () => {

        socket.emit("authenticate");

    });


    socket.on("authenticated", (data) => {

        if (data.name) {

            myName.textContent =
                `👤 ${data.name}`;
        }

    });


    socket.on("authError", () => {

        localStorage.removeItem(
            "participantToken"
        );

        location.reload();

    });


    // Estado inicial y cambios
    socket.on("stateUpdate", (state) => {

        currentParticipants =
            state.participants || [];

        currentRotation =
            state.rotation || 0;

        crearRuleta();

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


    // Giro
    socket.on("wheelSpin", (data) => {

        wheel.style.transition =
            `transform ${data.duration}ms cubic-bezier(0.12, 0.8, 0.18, 1)`;

        wheel.style.transform =
            `rotate(${data.rotation}deg)`;

        winnerBox.innerHTML =
            "<span>🎡 LA RULETA ESTÁ GIRANDO...</span>";

    });


    // Resultado
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

        wheel.style.background =
            "#333";

        return;
    }

    const total =
        currentParticipants.length;

    const angle =
        360 / total;

    const colors =
        currentParticipants.map(
            p => p.color
        );

    let gradient = "conic-gradient(";

    colors.forEach((color, index) => {

        const start =
            index * angle;

        const end =
            (index + 1) * angle;

        gradient +=
            `${color} ${start}deg ${end}deg`;

        if (index < colors.length - 1) {
            gradient += ", ";
        }

    });

    gradient += ")";

    wheel.style.background =
        gradient;


    // Nombres
    currentParticipants.forEach(
        (participant, index) => {

            const label =
                document.createElement("div");

            label.className =
                "wheel-label";

            label.textContent =
                participant.name;

            const centerAngle =
                index * angle + angle / 2;

window.addEventListener("resize", () => {
    crearRuleta();
});

            label.style.transform =
                `rotate(${centerAngle}deg)
                 translateY(-${radius}px)
                 rotate(-${centerAngle}deg)`;

            wheel.appendChild(label);
        }
    );
}


// =====================================================
// GANADOR
// =====================================================

function mostrarGanador(name) {

    winnerBox.innerHTML =
        `<span>🏆 GANADOR</span>
         <strong>${escapeHTML(name)}</strong>`;

}


// =====================================================
// SEGURIDAD TEXTO
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
// SI YA TENÍA SESIÓN
// =====================================================

const savedToken =
    localStorage.getItem(
        "participantToken"
    );

const savedName =
    localStorage.getItem(
        "participantName"
    );

if (savedToken && savedName) {

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

            location.href = "/participante.html";

        }
    );

}

