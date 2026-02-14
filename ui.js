// --- UI FUNCTIONS ---
function renderBoard() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';

    gameState.players.forEach((player, idx) => {
        const deck = document.createElement('div');
        deck.id = `player-deck-${idx}`;
        // Jeśli currentPlayer to -1, podświetlamy wszystkich (każdy może zacząć)
        const isActive = (gameState.mode === 'learning') && (gameState.currentPlayer === -1 || idx === gameState.currentPlayer);
        deck.className = `player-deck ${isActive ? 'active' : ''}`;
        deck.innerHTML = `
            <small>${player.name}</small>
            <strong style="font-size: 1.5rem">${player.cards.length}</strong>
            <small>KART</small>
        `;
        deck.onclick = () => playCard(idx);
        container.appendChild(deck);
    });

    const infoDiv = document.getElementById('current-info');
    if (gameState.mode === 'learning') {
        if (!document.getElementById('game-board').classList.contains('layout-mode')) {
            infoDiv.style.visibility = 'visible';
        }
        document.getElementById('active-player-name').innerText = gameState.currentPlayer === -1 ? "Dowolny" : gameState.players[gameState.currentPlayer].name;
        document.getElementById('direction-info').innerText = gameState.direction === 1 ? "Kierunek: ↺ (W lewo)" : "Kierunek: ↻ (W prawo)";
    } else {
        infoDiv.style.visibility = 'hidden';
    }

    if (gameState.savedLayout) {
        applySavedLayout();
    }

    // ONLINE: Ukryj przycisk "Zakończ grę" dla klientów
    const resetContainer = document.getElementById('btn-reset-container');
    if (gameState.online.active && !gameState.online.isHost) {
        resetContainer.style.display = 'none';
    } else {
        resetContainer.style.display = 'block';
    }
}

function updateActionText(text) {
    document.getElementById('action-text').innerText = text;
}

function showPenaltyControls() {
    const container = document.getElementById('penalty-buttons');
    container.innerHTML = '';

    // ONLINE: Klient wybiera gracza do zgłoszenia
    if (gameState.online.active && !gameState.online.isHost) {
        const p = document.createElement('p');
        p.innerText = "Wybierz gracza, który popełnił błąd:";
        p.style.color = "#cfb53b";
        p.style.margin = "5px 0";
        container.appendChild(p);

        gameState.players.forEach(p => {
            const btn = document.createElement('button');
            btn.innerText = p.name;
            btn.onclick = () => reportPenalty(p.id);
            btn.style.margin = "5px";
            container.appendChild(btn);
        });
    } else {
        // HOST lub LOCAL: Pełne sterowanie
    gameState.players.forEach(p => {
        const btn = document.createElement('button');
        btn.innerText = p.name;
        btn.onclick = () => takePile(p.id);
        btn.style.margin = "5px";
        container.appendChild(btn);
    });

    // Przycisk Wojny
    const warBtn = document.createElement('button');
    warBtn.innerText = "⚔️ Wojna";
    warBtn.onclick = setupWarUI;
    warBtn.style.margin = "5px";
    warBtn.style.backgroundColor = "#b8860b"; // Ciemne złoto
    container.appendChild(warBtn);
    }
    
    // Przycisk Anuluj (gdyby zgłoszono pomyłkowo)
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = "Anuluj";
    cancelBtn.onclick = () => {
        document.getElementById('penalty-area').style.display = 'none';
        document.getElementById('slap-alert').style.display = 'none';
    };
    cancelBtn.style.margin = "5px";
    cancelBtn.style.backgroundColor = "#555";
    container.appendChild(cancelBtn);

    // Przycisk "Kruczek Prawny" dostępny zawsze pod planszą, ale tutaj w kontekście przegranej
    document.getElementById('penalty-area').style.display = 'block';
}

function showErrorModal(playerIdx, message) {
    const modal = document.getElementById('error-modal');
    const msg = document.getElementById('error-message');
    msg.innerText = message || `${gameState.players[playerIdx].name} zagrał poza kolejnością!`;
    
    const btnUndo = document.getElementById('btn-undo');
    const btnPenalty = document.getElementById('btn-penalty');

    // ONLINE: Klient nie może cofać ruchów ani zatwierdzać kar z modala błędu
    if (gameState.online.active && !gameState.online.isHost) {
        btnUndo.style.display = 'none';
        btnPenalty.style.display = 'none';
    } else {
        btnUndo.style.display = 'inline-block';
        btnPenalty.style.display = 'inline-block';
        
        btnUndo.onclick = () => { modal.style.display = 'none'; };
        btnPenalty.onclick = () => { modal.style.display = 'none'; takePile(playerIdx); };
    }
    
    modal.style.display = 'flex';
}

function showInfoModal(title, message, callback) {
    document.getElementById('info-title').innerText = title;
    document.getElementById('info-message').innerText = message;
    
    const modal = document.getElementById('info-modal');
    const btn = document.getElementById('btn-info-ok');
    
    // Klonowanie przycisku, aby usunąć stare event listenery
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.onclick = () => {
        modal.style.display = 'none';
        if (callback) callback();
    };
    
    modal.style.display = 'flex';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        const board = document.getElementById('game-board');
        if (board) board.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
}

function handleResize() {
    const board = document.getElementById('game-board');
    if (!board) return;

    if (document.fullscreenElement) {
        // Bazowa rozdzielczość np. 1280x720 - skalujemy względem niej
        const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
        board.style.setProperty('--board-scale', scale);
    } else {
        board.style.setProperty('--board-scale', 1);
    }
}
window.addEventListener('resize', handleResize);

function animatePileToPlayer(playerIdx, cardData) {
    const centerElem = document.getElementById('last-card-container');
    const deckElem = document.getElementById(`player-deck-${playerIdx}`);
    
    if (!centerElem || !deckElem) return;

    const flyingCard = document.createElement('div');
    flyingCard.className = `card ${cardData ? cardData.color : ''}`;
    
    if (cardData) {
        flyingCard.innerHTML = `<div>${cardData.val}</div><div class="suit">${cardData.suit}</div>`;
    } else {
        flyingCard.style.background = '#fff';
    }

    const centerRect = centerElem.getBoundingClientRect();
    const deckRect = deckElem.getBoundingClientRect();

    flyingCard.style.position = 'fixed';
    flyingCard.style.left = centerRect.left + 'px';
    flyingCard.style.top = centerRect.top + 'px';
    flyingCard.style.width = '150px'; // Rozmiar zgodny z CSS .card
    flyingCard.style.height = '210px';
    flyingCard.style.zIndex = '2000';
    flyingCard.style.transition = 'all 0.6s cubic-bezier(0.5, 0, 0, 1)';
    flyingCard.style.transformOrigin = 'center center';
    
    document.body.appendChild(flyingCard);

    requestAnimationFrame(() => {
        flyingCard.style.left = deckRect.left + 'px';
        flyingCard.style.top = deckRect.top + 'px';
        flyingCard.style.transform = 'scale(0.2) rotate(360deg)';
        flyingCard.style.opacity = '0.5';
    });

    setTimeout(() => {
        flyingCard.remove();
    }, 600);
}

// Eksport funkcji do zakresu globalnego
window.renderBoard = renderBoard;
window.toggleFullscreen = toggleFullscreen;
window.updateActionText = updateActionText;
window.showPenaltyControls = showPenaltyControls;
window.showErrorModal = showErrorModal;
window.showInfoModal = showInfoModal;
window.animatePileToPlayer = animatePileToPlayer;