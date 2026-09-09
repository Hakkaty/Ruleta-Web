let socket = null;

let currentParticipants = [];
let currentRotation = 0;

// =====================================================
// AUDIO
// =====================================================

// =====================================================
// AUDIO
// =====================================================

let musicaFondo = null;
let sonidoRuleta = null;
let sonidoGanador = null;

function prepararAudio() {

    if (!musicaFondo) {
        musicaFondo = document.getElementById("musicaFondo");

        if (musicaFondo) {
            musicaFondo.loop = true;
            musicaFondo.volume = 0.20;
        }
    }

    if (!sonidoRuleta) {
        sonidoRuleta = new Audio("/audio/ruleta.mp3");
        sonidoRuleta.volume = 0.50;
    }

    if (!sonidoGanador) {
        sonidoGanador = new Audio("/audio/ganador.mp3");
        sonidoGanador.volume = 0.80;
    }
}


// =====================================================
// INICIAR MÚSICA
// =====================================================

function iniciarMusica() {

    prepararAudio();

    if (!musicaFondo) {
        console.log("❌ No se encontró musicaFondo");
        return;
    }

    musicaFondo.play()
        .then(() => {
            console.log("🎵 Música de fondo iniciada.");
        })
        .catch(error => {
            console.log(
                "❌ No se pudo iniciar la música:",
                error
            );
        });
}


// =====================================================
// SONIDO RULETA
// =====================================================

function reproducirSonidoRuleta() {

    prepararAudio();

    sonidoRuleta.pause();

if (musicaFondo) {
    musicaFondo.pause();
}
    sonidoRuleta.currentTime = 0;
    sonidoRuleta.play()

        .then(() => {
            console.log("🎡 Sonido de ruleta iniciado.");
        })
        .catch(error => {
            console.log(
                "❌ No se pudo reproducir sonido de ruleta:",
                error
            );
        });
}


// =====================================================
// SONIDO GANADOR
// =====================================================

function reproducirSonidoGanador() {

    prepararAudio();

    sonidoGanador.pause();
    sonidoGanador.currentTime = 0;

    sonidoGanador.play()
        .then(() => {
            console.log("🏆 Sonido de ganador iniciado.");
        })
        .catch(error => {
            console.log(
                "❌ No se pudo reproducir sonido de ganador:",
                error
            );
        });
}
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

const myName =
    document.getElementById("myName");

const publicParticipantCount =
    document.getElementById("publicParticipantCount");

const publicParticipantsList =
    document.getElementById("publicParticipantsList");

const countdownOverlay =
    document.getElementById("countdownOverlay");

const countdownNumber =
    document.getElementById("countdownNumber");
// =====================================================
// ENTRAR
// =====================================================

enterButton.addEventListener("click", async () => {

    prepararAudio();

if (musicaFondo) {
    musicaFondo.currentTime = 0;

    musicaFondo.play()
        .then(() => {
            console.log("🎵 MÚSICA DE FONDO ACTIVADA");
        })
        .catch((error) => {
            console.error("❌ ERROR DE AUDIO:", error);
        });
}
    const name =
        nameInput.value.trim();

    const accessKey =
        accessKeyInput.value.trim().toUpperCase();


    if (!name || !accessKey) {

        loginMessage.textContent =
            "Completa tu nombre y la clave.";

        return;
    }


    // IMPORTANTE:
    // El clic del usuario permite iniciar el audio.

    enterButton.disabled = true;

    loginMessage.textContent =
        "Comprobando acceso...";


    try {

        const response =
            await fetch(
                "/api/participant/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        accessKey: accessKey
                    })
                }
            );


        const data =
            await response.json();


        if (!data.ok) {

            loginMessage.textContent =
                data.message ||
                "No se pudo ingresar.";

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

        console.log(
            "Conectado al servidor."
        );

        socket.emit("authenticate");

    });


    // =================================================
    // AUTENTICADO
    // =================================================

    socket.on(
        "authenticated",
        (data) => {

            console.log(
                "Participante autenticado."
            );


            if (data && data.name) {

                myName.textContent =
                    `👤 ${data.name}`;

            }

        }
    );


    // =================================================
    // ERROR AUTENTICACIÓN
    // =================================================

    socket.on("authError", () => {

    console.log("⚠️ Sesión no válida.");

    localStorage.removeItem("participantToken");
    localStorage.removeItem("participantName");

    if (musicaFondo) {
        musicaFondo.pause();
    }

    loginScreen.classList.remove("hidden");
    rouletteScreen.classList.add("hidden");

    loginMessage.textContent =
        "Tu sesión expiró. Ingresa nuevamente.";

});

    // =================================================
    // ACTUALIZACIÓN DEL ESTADO
    // =================================================

    socket.on(
        "stateUpdate",
        (state) => {

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

    const winnerOverlay = document.getElementById("winnerOverlay");

    if (winnerOverlay) {
        winnerOverlay.classList.remove("show");
    }

}
        }
    );

// =================================================
// CUENTA REGRESIVA
// =================================================

// =================================================
// CUENTA REGRESIVA
// =================================================

socket.on("wheelCountdown", (data) => {

    if (!countdownOverlay || !countdownNumber) {
        return;
    }

    countdownOverlay.classList.remove("hidden");

    countdownNumber.textContent =
        data.number;

    countdownNumber.classList.remove(
        "countdown-animate"
    );

    // Reiniciar animación
    void countdownNumber.offsetWidth;

    countdownNumber.classList.add(
        "countdown-animate"
    );

    console.log(
        "⏱️ CUENTA:",
        data.number
    );

    // START desaparece antes de comenzar el giro
    if (data.number === "START!") {

        setTimeout(() => {

            countdownOverlay.classList.add("hidden");

        }, 700);

    }

});
    // =================================================
    // GIRO
    // =================================================

    socket.on(
        "wheelSpin",
        (data) => {

            console.log(
                "🎡 La ruleta está girando."
            );


            // SONIDO DE RULETA

            reproducirSonidoRuleta();


            wheel.style.transition =
                `transform ${data.duration}ms cubic-bezier(0.12, 0.8, 0.18, 1)`;


            wheel.style.transform =
                `rotate(${data.rotation}deg)`;
        }
    );


    // =================================================
    // RESULTADO
    // =================================================

    socket.on(
        "wheelResult",
        (winner) => {

            console.log(
                "🏆 Ganador:",
                winner.name
            );


            mostrarGanador(
                winner.name
            );


            // SONIDO DEL GANADOR

            reproducirSonidoGanador();

        }
    );

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
// LISTA PÚBLICA
// =====================================================

function renderPublicParticipants() {

    if (
        !publicParticipantCount ||
        !publicParticipantsList
    ) {

        return;
    }


    publicParticipantCount.textContent =
        currentParticipants.length;


    publicParticipantsList.innerHTML =
        "";


    if (currentParticipants.length === 0) {

        publicParticipantsList.innerHTML =
            `<div class="empty">
                Esperando participantes...
            </div>`;

        return;
    }


    currentParticipants.forEach(
        (participant, index) => {

            const row =
                document.createElement("div");

            row.className =
                "public-participant-row";


            const number =
                document.createElement("span");

            number.className =
                "public-participant-number";

            number.textContent =
                index + 1;


            const color =
                document.createElement("span");

            color.className =
                "public-participant-color";

            color.style.background =
                participant.color;


            const name =
                document.createElement("span");

            name.className =
                "public-participant-name";

            name.textContent =
                participant.name;


            row.appendChild(number);

            row.appendChild(color);

            row.appendChild(name);


            publicParticipantsList.appendChild(
                row
            );

        }
    );

}


// =====================================================
// MOSTRAR GANADOR
// =====================================================

function mostrarGanador(nombre) {
    
    const winnerOverlay = document.getElementById("winnerOverlay");
    const winnerName = document.getElementById("winnerName");

    if (!winnerOverlay || !winnerName) {
        console.error("❌ No se encontró la ventana del ganador.");
        return;
    }

    winnerName.textContent = nombre;

    winnerOverlay.classList.add("show");

    console.log("🎉 VENTANA DEL GANADOR MOSTRADA:", nombre);

setTimeout(() => {
    winnerOverlay.classList.remove("show");

    if (musicaFondo) {
        musicaFondo.play().catch(() => {});
    }
}, 6000);}
    

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

// =====================================================
// RECUPERAR SESIÓN AUTOMÁTICAMENTE
// =====================================================

const savedToken =
    localStorage.getItem("participantToken");

const savedName =
    localStorage.getItem("participantName");

if (savedToken && savedName) {

    console.log("🔐 Recuperando sesión...");

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

const refreshStatus =
    document.getElementById("refreshStatus");

if (refreshButton) {

    refreshButton.addEventListener("click", () => {

        console.log("🔄 ACTUALIZANDO...");

        // Mostrar visualmente que se está actualizando
        refreshButton.disabled = true;

        if (refreshStatus) {
            refreshStatus.textContent = "Actualizando...";
        }

        if (socket && socket.connected) {

            socket.emit("requestState");

            // Esperar un momento para que llegue stateUpdate
            setTimeout(() => {

                refreshButton.disabled = false;

                if (refreshStatus) {
                    refreshStatus.textContent = "✓ Actualizado";

                    setTimeout(() => {
                        refreshStatus.textContent = "";
                    }, 2000);
                }

            }, 500);

        } else {

            console.log("⚠️ Socket desconectado.");

            refreshButton.disabled = false;

            if (refreshStatus) {
                refreshStatus.textContent =
                    "⚠️ Sin conexión";
            }

        }

    });



}


// =====================================================
// SALIR
// =====================================================

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


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


            if (musicaFondo) {

                musicaFondo.pause();

                musicaFondo.currentTime = 0;

            }


            if (sonidoRuleta) {

                sonidoRuleta.pause();

                sonidoRuleta.currentTime = 0;

            }


            if (sonidoGanador) {

                sonidoGanador.pause();

                sonidoGanador.currentTime = 0;

            }


            if (socket) {

                socket.disconnect();

            }


            location.href =
                "/participante.html";

        }
    );

}
