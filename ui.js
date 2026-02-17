// --- UI FUNCTIONS ---

// Prosty syntezator dźwięków (Web Audio API), aby działało bez zewnętrznych plików
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let noiseBuffer = null;

function initAudio() {
    if (!audioCtx) return;
    // Generowanie bufora szumu (biały szum) dla efektów kart
    const bufferSize = audioCtx.sampleRate * 2; // 2 sekundy
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
}

// Inicjalizacja przy pierwszym kliknięciu (wymagane przez przeglądarki, aby odblokować AudioContext)
window.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!noiseBuffer) initAudio();
}, { once: true });

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!noiseBuffer) initAudio();
    
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'card' || type === 'shuffle') {
        // Dźwięki oparte na szumie (symulacja papieru)
        const source = audioCtx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        
        source.connect(filter);
        filter.connect(gainNode);

        if (type === 'card') {
            // Efekt "Snap/Flip" - szybki, wysoki szum (uderzenie karty)
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2500, now);
            
            gainNode.gain.setValueAtTime(0.6, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            
            source.start(now);
            source.stop(now + 0.1);
        } else if (type === 'shuffle') {
            // Efekt "Szurania" - niższy, dłuższy szum
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
            
            source.start(now);
            source.stop(now + 0.3);
        }
    } else {
        // Dźwięki tonalne (syntezator) dla interfejsu
        const oscillator = audioCtx.createOscillator();
        oscillator.connect(gainNode);

        if (type === 'error') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.linearRampToValueAtTime(100, now + 0.3);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } else if (type === 'slap') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.setValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } else if (type === 'win') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.linearRampToValueAtTime(800, now + 0.3);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        }
    }
}

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
    playSound('error');
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

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const isPortrait = winH > winW;

    if (document.fullscreenElement) {
        // Tryb pełnoekranowy - maksymalne wykorzystanie przestrzeni
        board.style.width = '100vw';
        board.style.height = '100vh';
        board.style.aspectRatio = 'unset';
        board.style.margin = '0';
        board.style.borderRadius = '0';
        board.style.border = 'none'; // Usuwamy ramkę, aby zyskać miejsce

        // Skalowanie zawartości (bazowy obszar roboczy 1200x800)
        // W trybie portretowym (mobilnym) zmniejszamy bazową szerokość, aby zwiększyć skalę
        const baseW = isPortrait ? 480 : 1200;
        const baseH = isPortrait ? 850 : 800;
        // Obliczamy skalę tak, aby wszystko się zmieściło (contain)
        const scale = Math.min(winW / baseW, winH / baseH);
        board.style.setProperty('--board-scale', scale * 0.95); // 0.95 marginesu bezpieczeństwa
    } else {
        // Tryb okienkowy - proporcje ekranu
        const ratio = winW / winH;
        board.style.aspectRatio = `${ratio}`;
        board.style.width = '90%';
        board.style.height = 'auto';
        board.style.margin = '20px auto';
        
        // Przywracamy ramkę
        board.style.border = '15px solid #25282c';
        board.style.borderRadius = '20px';

        // Skalowanie wewnątrz ramki (uwzględniamy padding 40px + border 15px = ~110px)
        const rect = board.getBoundingClientRect();
        const availableW = rect.width - 120;
        const availableH = rect.height - 120;
        
        const baseW = isPortrait ? 480 : 1200;
        const baseH = isPortrait ? 850 : 800;
        const scale = Math.min(availableW / baseW, availableH / baseH);
        board.style.setProperty('--board-scale', Math.max(0.4, scale));
    }
}
window.addEventListener('resize', handleResize);
document.addEventListener('fullscreenchange', handleResize);

function animatePileToPlayer(playerIdx, cardData) {
    const centerElem = document.getElementById('last-card-container');
    const deckElem = document.getElementById(`player-deck-${playerIdx}`);
    
    if (!centerElem || !deckElem) return;
    
    playSound('shuffle'); // Dźwięk "szurania" przy animacji

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

function changeTheme(themeName) {
    const board = document.getElementById('game-board');
    const preview = document.getElementById('theme-preview');
    const themes = ['theme-casino', 'theme-wood', 'theme-ocean'];

    if (board) board.classList.remove(...themes);
    if (preview) preview.classList.remove(...themes);

    if (themeName !== 'default') {
        if (board) board.classList.add(`theme-${themeName}`);
        if (preview) preview.classList.add(`theme-${themeName}`);
    }
    localStorage.setItem('kruki-theme', themeName);
}

// Eksport funkcji do zakresu globalnego
window.renderBoard = renderBoard;
window.toggleFullscreen = toggleFullscreen;
window.updateActionText = updateActionText;
window.showPenaltyControls = showPenaltyControls;
window.showErrorModal = showErrorModal;
window.showInfoModal = showInfoModal;
window.animatePileToPlayer = animatePileToPlayer;
window.changeTheme = changeTheme;
window.playSound = playSound;