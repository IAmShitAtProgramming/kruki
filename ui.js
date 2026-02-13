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

    if (gameState.mode === 'learning') {
        document.getElementById('active-player-name').innerText = gameState.currentPlayer === -1 ? "Dowolny" : gameState.players[gameState.currentPlayer].name;
        document.getElementById('direction-info').innerText = gameState.direction === 1 ? "Kierunek: Domyślny" : "Kierunek: Odwrócony";
    } else {
        document.getElementById('active-player-name').innerText = "???";
        document.getElementById('direction-info').innerText = "Kierunek: ???";
    }

    if (gameState.savedLayout) {
        applySavedLayout();
    }
}

function updateActionText(text) {
    document.getElementById('action-text').innerText = text;
}

function showPenaltyControls() {
    const container = document.getElementById('penalty-buttons');
    container.innerHTML = '';
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
    
    document.getElementById('btn-undo').onclick = () => {
        modal.style.display = 'none';
    };
    
    document.getElementById('btn-penalty').onclick = () => {
        modal.style.display = 'none';
        takePile(playerIdx);
    };
    
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
        document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
}