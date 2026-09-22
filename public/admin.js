let socket = null;

let participants = [];

let currentRotation = 0;

// =====================================================
// ELEMENTOS
// =====================================================

const adminLogin =
    document.getElementById("adminLogin");

const adminPanel =
    document.getElementById("adminPanel");

const adminPassword =
    document.getElementById("adminPassword");

const adminLoginButton =
    document.getElementById("adminLoginButton");

const adminLoginMessage =
    document.getElementById("adminLoginMessage");

const serverKey =
    document.getElementById("serverKey");

const newName =
    document.getElementById("newName");

const newColor =
    document.getElementById("newColor");

const addParticipant =
    document.getElementById("addParticipant");

const participantsList =
    document.getElementById("participantsList");

const participantCount =
    document.getElementById("participantCount");

const adminMessage =
    document.getElementById("adminMessage");

const adminWheel =
    document.getElementById("adminWheel");

const spinButton =
    document.getElementById("spinButton");

const adminWinner =
    document.getElementById("adminWinner");

const countdown =
    document.getElementById("countdown");

const controlResultButton =
    document.getElementById("controlResultButton");

const controlResultPanel =
    document.getElementById("controlResultPanel");

const closeControlResult =
    document.getElementById("closeControlResult");

const controlParticipantCount =
    document.getElementById("controlParticipantCount");

const demoParticipant =
    document.getElementById("demoParticipant");

const demoResultButton =
    document.getElementById("demoResultButton");

const demoResultMessage =
    document.getElementById("demoResultMessage");


// =====================================================
// CONTROLAR RESULTADO
// =====================================================

if (controlResultButton) {

    controlResultButton.addEventListener(
        "click",
        () => {

            actualizarParticipantesDemo();

            if (controlResultPanel) {

                controlResultPanel.classList.remove(
                    "hidden"
                );

            }

        }
    );

}


if (closeControlResult) {

    closeControlResult.addEventListener(
        "click",
        () => {

            if (controlResultPanel) {

                controlResultPanel.classList.add(
                    "hidden"
                );

            }

        }
    );

}


// =====================================================
// PREPARAR RESULTADO
// =====================================================

if (demoResultButton) {

    demoResultButton.addEventListener(
        "click",
        () => {

            const selectedValue =
                demoParticipant.value;


            if (selectedValue === "") {

                demoResultMessage.textContent =
                    "⚠️ Por favor selecciona un participante.";

                demoResultMessage.style.color =
                    "red";

                return;

            }


            if (!socket) {

                demoResultMessage.textContent =
                    "❌ No hay conexión con el servidor.";

                demoResultMessage.style.color =
                    "red";

                return;

            }


            socket.emit(
                "adminSetTarget",
                {
                    target: selectedValue
                }
            );


            demoResultMessage.textContent =
                "🎯 Resultado preparado con éxito.";

            demoResultMessage.style.color =
                "#4caf50";


            setTimeout(
                () => {

                    if (controlResultPanel) {

                        controlResultPanel.classList.add(
                            "hidden"
                        );

                    }

                },
                1500
            );

        }
    );

}


// =====================================================
// LOGIN ADMINISTRADOR
// =====================================================

adminLoginButton.addEventListener(
    "click",
    async () => {

        const password =
            adminPassword.value;


        if (!password) {

            adminLoginMessage.textContent =
                "Ingresa la clave.";

            return;

        }


        adminLoginButton.disabled =
            true;


        try {

            const response =
                await fetch(
                    "/api/admin/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            password
                        })
                    }
                );


            const data =
                await response.json();


            if (!data.ok) {

                adminLoginMessage.textContent =
                    data.message;

                adminLoginButton.disabled =
                    false;

                return;

            }


            localStorage.setItem(
                "adminToken",
                data.token
            );


            entrarAlPanel(
                data.token
            );


        } catch (error) {

            console.error(error);

            adminLoginMessage.textContent =
                "Error al conectar.";

            adminLoginButton.disabled =
                false;

        }

    }
);


// =====================================================
// ENTRAR AL PANEL
// =====================================================

function entrarAlPanel(token) {

    adminLogin.classList.add(
        "hidden"
    );


    adminPanel.classList.remove(
        "hidden"
    );


    conectarSocket(token);

}


// =====================================================
// SOCKET
// =====================================================

function conectarSocket(token) {

    socket =
        io({
            auth: {
                token
            }
        });


    // =================================================
    // CONECTADO
    // =================================================

    socket.on(
        "connect",
        () => {

            console.log(
                "Conectado al servidor."
            );


            socket.emit(
                "authenticate"
            );

        }
    );


    // =================================================
    // AUTENTICADO
    // =================================================

    socket.on(
        "authenticated",
        () => {

            console.log(
                "Administrador autenticado."
            );

        }
    );


    // =================================================
    // CLAVE DEL SERVIDOR
    // =================================================

    socket.on(
        "serverKey",
        (data) => {

            serverKey.textContent =
                data.key;

        }
    );


    // =================================================
    // ERROR AUTENTICACIÓN
    // =================================================

    socket.on(
        "authError",
        (data) => {

            localStorage.removeItem(
                "adminToken"
            );


            alert(
                data?.message ||
                "La sesión ya no es válida."
            );


            location.reload();

        }
    );


    // =================================================
    // ESTADO GENERAL
    // =================================================

    socket.on(
        "stateUpdate",
        (state) => {

            participants =
                state.participants || [];


            currentRotation =
                state.rotation || 0;


            actualizarParticipantesDemo();

            renderParticipants();

            crearAdminRuleta();


            adminWheel.style.transition =
                "none";


            adminWheel.style.transform =
                `rotate(${currentRotation}deg)`;

        }
    );


    // =================================================
    // CUENTA REGRESIVA
    // =================================================

    socket.on(
        "wheelCountdown",
        (data) => {

            if (!countdown) {
                return;
            }


            mostrarNumeroCuenta(
                data.number
            );

        }
    );


    // =================================================
    // GIRO SINCRONIZADO
    // =================================================

    socket.on(
        "wheelSpin",
        (data) => {

            console.log(
                "🎡 GIRO RECIBIDO:",
                data
            );


            const targetRotation =
                data.rotation;


            const duration =
                data.duration;


            const startAt =
                Number(data.startAt) ||
                Date.now();


            // Cancelar cualquier giro pendiente
            if (window.adminSpinTimer) {

                clearTimeout(
                    window.adminSpinTimer
                );

            }


            // Mantener la ruleta exactamente
            // en su posición actual
            adminWheel.style.transition =
                "none";


            adminWheel.style.transform =
                `rotate(${currentRotation}deg)`;


            // Forzar al navegador a aplicar
            // la posición antes del giro
            void adminWheel.offsetWidth;


            const delay =
                Math.max(
                    0,
                    startAt - Date.now()
                );


            window.adminSpinTimer =
                setTimeout(
                    () => {

                        console.log(
                            "🎡 INICIANDO GIRO ADMIN"
                        );


                        adminWheel.style.transition =
                            `transform ${duration}ms cubic-bezier(0.05, 0.65, 0.1, 1)`;


                        adminWheel.style.transform =
                            `rotate(${targetRotation}deg)`;


                        currentRotation =
                            targetRotation;

                    },
                    delay
                );

        }
    );


    // =================================================
    // RESULTADO
    // =================================================

    socket.on(
        "wheelResult",
        (data) => {

            spinButton.disabled =
                false;


            const winner =
                data?.winner;


            if (!winner) {
                return;
            }


            console.log(
                "🏆 GANADOR RECIBIDO:",
                winner.name
            );


            mostrarAdminWinner(
                winner.name
            );

        }
    );


    // =================================================
    // ERROR ADMIN
    // =================================================

    socket.on(
        "adminError",
        (data) => {

            mostrarMensaje(
                data.message
            );


            spinButton.disabled =
                false;

        }
    );


    // =================================================
    // MENSAJE ADMIN
    // =================================================

    socket.on(
        "adminMessage",
        (data) => {

            mostrarMensaje(
                data.message
            );

        }
    );

}


// =====================================================
// AGREGAR PARTICIPANTE
// =====================================================

addParticipant.addEventListener(
    "click",
    () => {

        const name =
            newName.value.trim();


        const color =
            newColor.value;


        if (!name) {

            mostrarMensaje(
                "Escribe un nombre."
            );

            return;

        }


        if (!socket) {

            mostrarMensaje(
                "No hay conexión con el servidor."
            );

            return;

        }


        socket.emit(
            "adminAddParticipant",
            {
                name,
                color
            }
        );


        newName.value =
            "";

    }
);


// =====================================================
// RENDER PARTICIPANTES
// =====================================================

function renderParticipants() {

    participantsList.innerHTML =
        "";


    participantCount.textContent =
        participants.length;


    if (participants.length === 0) {

        participantsList.innerHTML =
            `<div class="empty">
                No hay participantes registrados.
             </div>`;

        return;

    }


    participants.forEach(
        (participant, index) => {

            const row =
                document.createElement("div");


            row.className =
                "participant-row";


            const number =
                document.createElement("span");


            number.className =
                "participant-number";


            number.textContent =
                index + 1;


            const name =
                document.createElement("input");


            name.type =
                "text";


            name.value =
                participant.name;


            name.maxLength =
                30;


            name.className =
                "participant-name";


            const color =
                document.createElement("input");


            color.type =
                "color";


            color.value =
                participant.color;


            color.className =
                "participant-color";


            const save =
                document.createElement("button");


            save.textContent =
                "💾";


            save.className =
                "small-button";


            save.addEventListener(
                "click",
                () => {

                    if (!socket) {
                        return;
                    }


                    socket.emit(
                        "adminEditParticipant",
                        {
                            id:
                                participant.id,

                            name:
                                name.value.trim(),

                            color:
                                color.value
                        }
                    );

                }
            );


            const remove =
                document.createElement("button");


            remove.textContent =
                "🗑️";


            remove.className =
                "small-button delete";


            remove.addEventListener(
                "click",
                () => {

                    const confirmar =
                        confirm(
                            `¿Eliminar a ${participant.name}?`
                        );


                    if (!confirmar) {
                        return;
                    }


                    if (!socket) {
                        return;
                    }


                    socket.emit(
                        "adminDeleteParticipant",
                        {
                            id:
                                participant.id
                        }
                    );

                }
            );


            row.appendChild(number);

            row.appendChild(name);

            row.appendChild(color);

            row.appendChild(save);

            row.appendChild(remove);


            participantsList.appendChild(
                row
            );

        }
    );

}


// =====================================================
// RULETA ADMIN
// =====================================================

function crearAdminRuleta() {

    adminWheel.innerHTML =
        "";


    if (participants.length === 0) {

        adminWheel.style.background =
            "#333";

        return;

    }


    const total =
        participants.length;


    const angle =
        360 / total;


    const radius =
        Math.max(
            90,
            Math.min(
                adminWheel.clientWidth,
                adminWheel.clientHeight
            ) * 0.34
        );


    let gradient =
        "conic-gradient(";


    participants.forEach(
        (participant, index) => {

            const start =
                index * angle;


            const end =
                (index + 1) * angle;


            gradient +=
                `${participant.color} ${start}deg ${end}deg`;


            if (
                index <
                participants.length - 1
            ) {

                gradient +=
                    ", ";

            }

        }
    );


    gradient +=
        ")";


    adminWheel.style.background =
        gradient;


    participants.forEach(
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


            adminWheel.appendChild(
                label
            );

        }
    );

}


// =====================================================
// ACTUALIZAR RULETA AL CAMBIAR TAMAÑO
// =====================================================

window.addEventListener(
    "resize",
    () => {

        crearAdminRuleta();


        adminWheel.style.transform =
            `rotate(${currentRotation}deg)`;

    }
);


// =====================================================
// CONTROLAR PARTICIPANTES
// =====================================================

function actualizarParticipantesDemo() {

    if (!demoParticipant) {
        return;
    }


    const previousValue =
        demoParticipant.value;


    demoParticipant.innerHTML =
        "";


    const defaultOption =
        document.createElement("option");


    defaultOption.value =
        "";


    defaultOption.textContent =
        "Selecciona un participante";


    demoParticipant.appendChild(
        defaultOption
    );


    participants.forEach(
        (participant) => {

            const option =
                document.createElement("option");


            option.value =
                participant.id;


            option.textContent =
                participant.name;


            demoParticipant.appendChild(
                option
            );

        }
    );


    const stillExists =
        participants.some(
            participant =>
                String(participant.id) ===
                String(previousValue)
        );


    if (stillExists) {

        demoParticipant.value =
            previousValue;

    }


    if (controlParticipantCount) {

        controlParticipantCount.textContent =
            participants.length;

    }

}


// =====================================================
// GIRAR RULETA
// =====================================================

spinButton.addEventListener(
    "click",
    () => {

        if (!socket) {
            return;
        }


        if (spinButton.disabled) {
            return;
        }


        spinButton.disabled =
            true;


        socket.emit(
            "adminStartCountdown"
        );

    }
);


// =====================================================
// CUENTA REGRESIVA
// =====================================================

function mostrarNumeroCuenta(numero) {

    if (!countdown) {
        return;
    }


    countdown.classList.remove(
        "hidden"
    );


    countdown.textContent =
        numero;


    countdown.style.animation =
        "none";


    void countdown.offsetWidth;


    countdown.style.animation =
        "countdownPulse 0.8s ease";


    if (numero === "START!") {

        setTimeout(
            () => {

                countdown.classList.add(
                    "hidden"
                );

            },
            700
        );

    }

}


// =====================================================
// GANADOR
// =====================================================

function mostrarAdminWinner(name) {

    adminWinner.innerHTML =
        `<span>🏆 GANADOR</span>
         <strong>${escapeHTML(name)}</strong>`;

}


// =====================================================
// MENSAJE
// =====================================================

function mostrarMensaje(text) {

    adminMessage.textContent =
        text;


    setTimeout(
        () => {

            adminMessage.textContent =
                "";

        },
        4000
    );

}


// =====================================================
// SEGURIDAD
// =====================================================

function escapeHTML(text) {

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// SESIÓN ADMIN
// =====================================================

const savedAdminToken =
    localStorage.getItem(
        "adminToken"
    );


if (savedAdminToken) {

    entrarAlPanel(
        savedAdminToken
    );

}


// =====================================================
// ACTUALIZAR
// =====================================================

const refreshButton =
    document.getElementById(
        "refreshButton"
    );


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
    document.getElementById(
        "logoutButton"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "adminToken"
            );


            if (socket) {

                socket.disconnect();

            }


            location.href =
                "/admin.html";

        }
    );

}


// =====================================================
// CAMBIAR CLAVE DE ACCESO
// =====================================================

const resetKeyButton =
    document.getElementById(
        "resetKeyButton"
    );


if (resetKeyButton) {

    resetKeyButton.addEventListener(
        "click",
        () => {

            if (!socket) {

                mostrarMensaje(
                    "No hay conexión con el servidor."
                );

                return;

            }


            const confirmar =
                confirm(
                    "¿Seguro que deseas cambiar la clave de acceso?\n\n" +
                    "La clave anterior dejará de funcionar."
                );


            if (!confirmar) {
                return;
            }


            resetKeyButton.disabled =
                true;


            socket.emit(
                "adminResetAccessKey"
            );


            setTimeout(
                () => {

                    resetKeyButton.disabled =
                        false;

                },
                1000
            );

        }
    );

}