// --- LOGIKA SIECIOWA (PEERJS) ---

function setupOnline(role) {
    document.getElementById('online-start').style.display = 'none';
    gameState.online.active = true;
    gameState.online.isHost = (role === 'host');
    gameState.online.myPlayerIdx = (role === 'host') ? 0 : 1;
    if (role === 'host') gameState.online.conns = []; // Lista połączeń dla Hosta

    const statusDiv = document.getElementById('online-status');
    statusDiv.innerText = "Inicjalizacja połączenia...";

    document.getElementById('online-ui').style.display = 'block';

    // Inicjalizacja PeerJS
    if (role === 'host') {
        const shortId = generateShortId();
        gameState.online.peer = new Peer(shortId);
    } else {
        gameState.online.peer = new Peer();
    }

    gameState.online.peer.on('open', (id) => {
        if (role === 'host') {
            document.getElementById('host-ui').style.display = 'block';
            // Host widzi konfigurację gry
            document.getElementById('game-config').style.display = 'block';
            document.getElementById('start-buttons').style.display = 'block';
            
            document.getElementById('host-code').value = id;
            statusDiv.innerText = "Jesteś Hostem. Czekam na gracza...";
        } else {
            document.getElementById('join-ui').style.display = 'block';
            // Klient NIE widzi konfiguracji
            statusDiv.innerText = "Wpisz kod hosta.";
        }
    });

    gameState.online.peer.on('connection', (conn) => {
        if (role === 'host') {
            // Host obsługuje wielu graczy
            gameState.online.conns.push(conn);
            setupConnectionHandlers(conn);
            document.getElementById('host-status').innerText = "Gracz dołączył! Możesz rozpocząć grę.";
            document.getElementById('host-status').style.color = "#00ff00";
        }
    });

    gameState.online.peer.on('error', (err) => {
        console.error(err);
        statusDiv.innerText = "Błąd połączenia: " + err.type;
    });
}

function connectToHost() {
    const name = document.getElementById('join-player-name').value;
    if (!name) {
        alert("Podaj swoje imię!");
        return;
    }
    const hostId = document.getElementById('join-code-input').value;
    if (!hostId) return;

    const conn = gameState.online.peer.connect(hostId);
    gameState.online.conn = conn;
    setupConnectionHandlers(conn, name);
    document.getElementById('online-status').innerText = "Łączenie...";
}

function setupConnectionHandlers(conn, myName = null) {
    conn.on('open', () => {
        document.getElementById('online-status').innerText = "Połączono!";
        document.getElementById('online-status').style.color = "#00ff00";
        
        // Jeśli to klient, ukrywamy przyciski startu (czeka na hosta)
        if (!gameState.online.isHost) {
             document.getElementById('start-buttons').style.display = 'none';
             document.getElementById('online-status').innerText += " Czekaj na rozpoczęcie gry przez Hosta.";
             
             // Wyślij prośbę o dołączenie z imieniem
             if (myName) {
                 conn.send({ type: 'JOIN_REQUEST', name: myName });
             }
        }
    });

    conn.on('data', (data) => {
        handleNetworkData(data);
    });

    conn.on('close', () => {
        alert("Połączenie przerwane!");
        location.reload();
    });
}

function broadcastGameState() {
    // Host wysyła do wszystkich połączonych
    if (gameState.online.isHost && gameState.online.conns) {
        gameState.online.conns.forEach(conn => {
            if (conn.open) sendStateToConn(conn);
        });
    }
}

function sendStateToConn(conn) {
    if (conn && conn.open) {
        // Wysyłamy kluczowe dane stanu
        const stateToSend = {
            type: 'STATE_UPDATE',
            players: gameState.players,
            centerPile: gameState.centerPile,
            currentPlayer: gameState.currentPlayer,
            direction: gameState.direction,
            silentMode: gameState.silentMode,
            thumpingMode: gameState.thumpingMode,
            mode: gameState.mode,
            slapActive: gameState.slapActive
        };
        conn.send(stateToSend);
    }
}

function sendAction(actionName, args) {
    if (gameState.online.conn && gameState.online.conn.open) {
        gameState.online.conn.send({
            type: 'ACTION',
            action: actionName,
            args: args
        });
    }
}

function handleNetworkData(data) {
    if (data.type === 'STATE_UPDATE') {
        const oldPlayers = gameState.players;
        const oldPile = gameState.centerPile;
        const oldPileLen = oldPile ? oldPile.length : 0;

        // Klient otrzymuje stan od Hosta
        const localOnline = gameState.online; // Zachowaj lokalny stan online (isHost, myPlayerIdx, peer)
        Object.assign(gameState, data); // Nadpisz stan lokalny
        gameState.online = localOnline; // Przywróć lokalny stan online
        
        // Wymuś przejście do widoku gry jeśli jeszcze w setupie
        if (document.getElementById('game-setup').style.display !== 'none') {
            document.getElementById('game-setup').style.display = 'none';
            document.getElementById('game-board').style.display = 'flex';
            document.getElementById('penalty-area').style.display = 'none';
            document.getElementById('slap-alert').style.display = 'none';
            
            // Dodaj przycisk fullscreen jeśli nie ma
            if (!document.getElementById('btn-fullscreen')) {
                const fsBtn = document.createElement('button');
                fsBtn.id = 'btn-fullscreen';
                fsBtn.innerText = "⛶";
                fsBtn.onclick = toggleFullscreen;
                // Style są w CSS lub inline w startGame, tutaj uproszczone
                fsBtn.style.position = "absolute"; fsBtn.style.top = "20px"; fsBtn.style.right = "20px"; fsBtn.style.zIndex = "2000";
                document.getElementById('game-board').appendChild(fsBtn);
            }
        }
        
        // Jeśli stos został wyczyszczony (koniec rundy), ukryj panel kar i alerty
        if (gameState.centerPile.length === 0) {
            document.getElementById('penalty-area').style.display = 'none';
            document.getElementById('slap-alert').style.display = 'none';
        }

        // Wykryj zebranie stosu (takePile) i uruchom animację
        if (gameState.centerPile.length === 0 && oldPileLen > 0) {
            let takerIdx = -1;
            if (oldPlayers && oldPlayers.length === gameState.players.length) {
                for (let i = 0; i < oldPlayers.length; i++) {
                    if (gameState.players[i].cards.length > oldPlayers[i].cards.length) {
                        takerIdx = i;
                        break;
                    }
                }
            }
            if (takerIdx !== -1) {
                const topCard = oldPile[oldPileLen - 1];
                animatePileToPlayer(takerIdx, topCard);
            }
        }

        // Aktualizacja wizualna stosu (dla klienta, który nie wykonuje playCard)
        const centerContainer = document.getElementById('last-card-container');
        let animStyle = '';
        let shouldAnimate = false;

        // Sprawdź czy doszła nowa karta i kto ją zagrał
        if (gameState.centerPile.length > oldPileLen) {
            let playerIdx = -1;
            if (oldPlayers && oldPlayers.length === gameState.players.length) {
                for (let i = 0; i < oldPlayers.length; i++) {
                    if (oldPlayers[i].cards.length > gameState.players[i].cards.length) {
                        playerIdx = i;
                        break;
                    }
                }
            }

            if (playerIdx !== -1) {
                const deckElem = document.getElementById(`player-deck-${playerIdx}`);
                const centerElem = document.getElementById('last-card-container');
                if (deckElem && centerElem) {
                    const deckRect = deckElem.getBoundingClientRect();
                    const centerRect = centerElem.getBoundingClientRect();
                    const startX = (deckRect.left + deckRect.width / 2) - (centerRect.left + centerRect.width / 2);
                    const startY = (deckRect.top + deckRect.height / 2) - (centerRect.top + centerRect.height / 2);
                    animStyle = `--start-x: ${startX}px; --start-y: ${startY}px;`;
                    shouldAnimate = true;
                }
            }
        }

        if (gameState.centerPile.length > 0) {
            const topCard = gameState.centerPile[gameState.centerPile.length - 1];
            const animateClass = shouldAnimate ? 'card-animate' : '';
            centerContainer.innerHTML = `
                <div class="card ${topCard.color} ${animateClass}" style="${animStyle}">
                    <div>${topCard.val}</div>
                    <div class="suit">${topCard.suit}</div>
                </div>
            `;
        } else {
            centerContainer.innerHTML = '<span style="color: #444;">STOS</span>';
        }

        renderBoard();
        
        // Aktualizacja tekstu akcji dla klienta
        const pileCount = gameState.centerPile.length;
        const moduloVal = pileCount % 13 === 0 ? 13 : pileCount % 13;
        if (gameState.mode === 'learning' && pileCount > 0) {
             // Prosta aktualizacja tekstu, pełna logika jest u Hosta
             updateActionText(`Karta: ${moduloVal}`);
        }

    } else if (data.type === 'ACTION') {
        // Host otrzymuje akcję od Klienta
        if (gameState.online.isHost) {
            const fn = window[data.action];
            if (typeof fn === 'function') {
                fn.apply(null, [...data.args, true]); // Dodaj flagę isRemote=true
            }
        }
    } else if (data.type === 'JOIN_REQUEST') {
        // Host otrzymuje prośbę o dołączenie
        if (gameState.online.isHost) {
            window.addPlayer(data.name, true);
            const status = document.getElementById('host-status');
            status.innerText = `Gracz ${data.name} dołączył!`;
        }
    }
}

// Eksport funkcji do zakresu globalnego
window.setupOnline = setupOnline;
window.connectToHost = connectToHost;
window.broadcastGameState = broadcastGameState;
window.sendAction = sendAction;

function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}