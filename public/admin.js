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


// =====================================================
// LOGIN ADMIN
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

        adminLoginButton.disabled = true;

        try {

            const response =
                await fetch("/api/admin/login", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        password
                    })
                });

            const data =
                await response.json();

            if (!data.ok) {

                adminLoginMessage.textContent =
                    data.message;

                adminLoginButton.disabled = false;

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

            adminLoginMessage.textContent =
                "Error al conectar.";

            adminLoginButton.disabled = false;
        }

    }
);


// =====================================================
// ENTRAR AL PANEL
// =====================================================

function entrarAlPanel(token) {

    adminLogin.classList.add("hidden");

    adminPanel.classList.remove("hidden");

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


    socket.on("connect", () => {

        socket.emit("authenticate");

    });


    socket.on("authenticated", (data) => {

        console.log(
            "Administrador autenticado"
        );

    });


    socket.on("serverKey", (data) => {

        serverKey.textContent =
            data.key;

    });


    socket.on("authError", () => {

        localStorage.removeItem(
            "adminToken"
        );

        location.reload();

    });


    socket.on("stateUpdate", (state) => {

        participants =
            state.participants || [];

        currentRotation =
            state.rotation || 0;

        renderParticipants();

        crearAdminRuleta();

        adminWheel.style.transform =
            `rotate(${currentRotation}deg)`;


        if (state.winner) {

            mostrarAdminWinner(
                state.winner.name
            );

        }

    });


    socket.on("wheelSpin", (data) => {

        spinButton.disabled = true;

        adminWheel.style.transition =
            `transform ${data.duration}ms cubic-bezier(0.12, 0.8, 0.18, 1)`;

        adminWheel.style.transform =
            `rotate(${data.rotation}deg)`;

        adminWinner.innerHTML =
            "🎡 GIRANDO...";

    });


    socket.on("wheelResult", (winner) => {

        spinButton.disabled = false;

        mostrarAdminWinner(
            winner.name
        );

    });


    socket.on("adminError", (data) => {

        mostrarMensaje(
            data.message
        );

        spinButton.disabled = false;

    });
    socket.on("adminMessage", (data) => {

    mostrarMensaje(
        data.message
    );

});

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

        socket.emit(
            "adminAddParticipant",
            {
                name,
                color
            }
        );

        newName.value = "";

    }
);


// =====================================================
// RENDER PARTICIPANTES
// =====================================================

function renderParticipants() {

    participantsList.innerHTML = "";

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

            name.type = "text";

            name.value =
                participant.name;

            name.maxLength = 30;

            name.className =
                "participant-name";


            const color =
                document.createElement("input");

            color.type = "color";

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

                    socket.emit(
                        "adminEditParticipant",
                        {
                            id: participant.id,
                            name: name.value.trim(),
                            color: color.value
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

                    socket.emit(
                        "adminDeleteParticipant",
                        {
                            id: participant.id
                        }
                    );

                }
            );


            row.appendChild(number);

            row.appendChild(name);

            row.appendChild(color);

            row.appendChild(save);

            row.appendChild(remove);

            participantsList.appendChild(row);

        }
    );
}


// =====================================================
// RULETA ADMIN
// =====================================================

function crearAdminRuleta() {

    adminWheel.innerHTML = "";

    if (participants.length === 0) {

        adminWheel.style.background =
            "#333";

        return;
    }


    const total =
        participants.length;

    const angle =
        360 / total;


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

            if (index <
                participants.length - 1) {

                gradient += ", ";
            }

        }
    );


    gradient += ")";

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


window.addEventListener("resize", () => {
    crearAdminRuleta();
});

            label.style.transform =
                `rotate(${centerAngle}deg)
                 translateY(-${radius}px)
                 rotate(-${centerAngle}deg)`;


            adminWheel.appendChild(label);

        }
    );
}


// =====================================================
// GIRAR
// =====================================================

spinButton.addEventListener(
    "click",
    () => {

        if (!socket) {
            return;
        }

        spinButton.disabled = true;

        socket.emit(
            "adminSpin"
        );

    }
);


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

    setTimeout(() => {

        adminMessage.textContent =
            "";

    }, 4000);

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
                "adminToken"
            );

            if (socket) {
                socket.disconnect();
            }

            location.href = "/admin.html";

        }
    );

}
// =====================================================
// CAMBIAR CLAVE DE ACCESO
// =====================================================

const resetKeyButton =
    document.getElementById("resetKeyButton");

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

            resetKeyButton.disabled = true;

            socket.emit(
                "adminResetAccessKey"
            );

            setTimeout(() => {
                resetKeyButton.disabled = false;
            }, 1000);

        }
    );

}
