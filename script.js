let gameState = {
    players: [],
    centerPile: [],
    currentPlayer: 0,
    direction: 1, // 1 = domyślnie (przeciwnie do wskazówek zegara w logice gry)
    silentMode: false, // Cicha Czwórka
    thumpingMode: false, // Dudniąca Piątka
    mode: 'learning', // 'learning' lub 'competitive'
    slapActive: false, // Czy na stole jest sytuacja "Ręce na stos"
    savedLayout: null // Zapisany układ stołu { id: {left, top} }
};

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♣', '♥', '♦'];

// Inicjalizacja pól nazw przy starcie
window.onload = function() {
    updateNameInputs();
};

function updateNameInputs() {
    const pCount = parseInt(document.getElementById('players-count').value) || 3;
    const container = document.getElementById('player-names-container');
    
    // Zachowaj obecne imiona, jeśli istnieją
    const currentNames = [];
    const existingInputs = container.getElementsByClassName('name-input');
    for (let input of existingInputs) {
        currentNames.push(input.value);
    }

    let html = '';
    for (let i = 0; i < pCount; i++) {
        const val = currentNames[i] || `Gracz ${i + 1}`;
        html += `<input type="text" class="name-input" id="pname-${i}" value="${val}" placeholder="Imię gracza ${i + 1}">`;
    }
    container.innerHTML = html;
}

function startGame() {
    const pCount = parseInt(document.getElementById('players-count').value);
    const dCount = parseInt(document.getElementById('decks-count').value);
    const modeSelect = document.getElementById('game-mode');
    
    // Generowanie talii
    let fullDeck = [];
    for (let i = 0; i < dCount; i++) {
        SUITS.forEach(suit => {
            VALUES.forEach(val => {
                fullDeck.push({
                    val,
                    suit,
                    color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
                });
            });
        });
    }

    // Tasowanie (Fisher-Yates)
    for (let i = fullDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
    }

    // Rozdawanie
    gameState.players = Array.from({ length: pCount }, (_, i) => {
        const nameInput = document.getElementById(`pname-${i}`);
        return {
            id: i,
            name: nameInput ? nameInput.value : `Gracz ${i + 1}`,
            cards: []
        };
    });

    let p = 0;
    while (fullDeck.length > 0) {
        gameState.players[p].cards.push(fullDeck.pop());
        p = (p + 1) % pCount;
    }

    gameState.currentPlayer = -1; // -1 oznacza, że rozpoczyna dowolny gracz
    gameState.centerPile = [];
    gameState.direction = 1;
    gameState.silentMode = false;
    gameState.thumpingMode = false;
    gameState.mode = modeSelect ? modeSelect.value : 'learning';
    gameState.slapActive = false;

    document.getElementById('game-setup').style.display = 'none';
    document.getElementById('game-board').style.display = 'flex';
    document.getElementById('penalty-area').style.display = 'none';
    document.getElementById('slap-alert').style.display = 'none';

    // Dodanie przycisku pełnego ekranu
    if (!document.getElementById('btn-fullscreen')) {
        const fsBtn = document.createElement('button');
        fsBtn.id = 'btn-fullscreen';
        fsBtn.innerText = "⛶";
        fsBtn.title = "Pełny ekran";
        fsBtn.style.position = "absolute";
        fsBtn.style.top = "20px";
        fsBtn.style.right = "20px";
        fsBtn.style.zIndex = "2000";
        fsBtn.onclick = toggleFullscreen;
        document.getElementById('game-board').appendChild(fsBtn);
    }

    renderBoard();
    
    if (gameState.savedLayout) {
        applySavedLayout();
    }

    updateActionText(gameState.mode === 'learning' ? "Rozpoczyna dowolny gracz" : "Gra rozpoczęta");
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

function playCard(playerIdx) {
    if (document.getElementById('game-board').classList.contains('layout-mode')) return;

    const player = gameState.players[playerIdx];
    if (player.cards.length === 0) {
        showInfoModal("Brak kart", `${player.name} nie ma już kart!`);
        return;
    }

    // Blokada wykładania kart, gdy na stole jest "Ręce na stos"
    if (gameState.slapActive) {
        showErrorModal(playerIdx, "Na stole jest 'Ręce na stos'! Nie wolno wykładać kart.");
        return;
    }

    // Sprawdzenie kolejności (jeśli currentPlayer == -1, to pierwszy ruch jest zawsze poprawny)
    if (gameState.currentPlayer !== -1 && playerIdx !== gameState.currentPlayer) {
        showErrorModal(playerIdx);
        return;
    }

    // Jeśli to pierwszy ruch, ustawiamy bieżącego gracza na tego, który właśnie zagrał
    if (gameState.currentPlayer === -1) {
        gameState.currentPlayer = playerIdx;
    }

    const card = player.cards.pop();
    const previousCard = gameState.centerPile[gameState.centerPile.length - 1];
    gameState.centerPile.push(card);
    
    const cardValue = getCardValue(card.val);
    const pileCount = gameState.centerPile.length;
    const moduloVal = pileCount % 13 === 0 ? 13 : pileCount % 13;

    // Obliczanie pozycji startowej animacji (od talii gracza do środka)
    const deckElem = document.getElementById(`player-deck-${playerIdx}`);
    const centerElem = document.getElementById('last-card-container');
    let animStyle = '';
    
    if (deckElem && centerElem) {
        const deckRect = deckElem.getBoundingClientRect();
        const centerRect = centerElem.getBoundingClientRect();
        
        const startX = (deckRect.left + deckRect.width / 2) - (centerRect.left + centerRect.width / 2);
        const startY = (deckRect.top + deckRect.height / 2) - (centerRect.top + centerRect.height / 2);
        
        animStyle = `--start-x: ${startX}px; --start-y: ${startY}px;`;
    }

    // Wyświetlanie powiększonej karty na środku
    const center = document.getElementById('last-card-container');
    center.innerHTML = `
        <div class="card ${card.color} card-animate" style="${animStyle}">
            <div>${card.val}</div>
            <div class="suit">${card.suit}</div>
        </div>
    `;

    // --- Logika Ręce na Stos ---
    let slap = false;
    // 1. Ta sama karta (para)
    if (previousCard && getCardValue(previousCard.val) === cardValue) {
        slap = true;
    }
    // 2. Modulo 13 (Nominał == Liczba kart)
    if (cardValue === moduloVal) {
        slap = true;
    }

    const slapAlert = document.getElementById('slap-alert');
    if (slap) {
        gameState.slapActive = true;
        // W trybie kompetetywnym nie pokazujemy wielkiego napisu ani menu wyboru przegranego
        if (gameState.mode !== 'competitive') {
            slapAlert.style.display = 'block';
            slapAlert.innerText = "RĘCE NA STOS!";
            showPenaltyControls();
        }
    } else {
        slapAlert.style.display = 'none';
        document.getElementById('penalty-area').style.display = 'none';
    }

    // --- Akcje i Instrukcje ---
    if (gameState.mode === 'learning') {
        let actionMsg = [];

        // Narrator (zawsze, chyba że Cicha Czwórka)
        if (!gameState.silentMode) {
            actionMsg.push(`Powiedz: "${moduloVal}"`);
        } else {
            actionMsg.push(`(Cisza)`);
        }

        // Dudniąca Piątka (trwa)
        if (gameState.thumpingMode) {
            actionMsg.push("Uderz w stół!");
        }

        // Logika kart specjalnych (tylko komunikaty)
        switch (cardValue) {
            case 1: actionMsg.push("Zakracz: KRA!"); break;
            case 4: actionMsg.push(gameState.silentMode ? "Koniec Cichej Czwórki!" : "Start Cichej Czwórki!"); break; // Logika zmiany stanu poniżej
            case 5: actionMsg.push(gameState.thumpingMode ? "Koniec Dudniącej Piątki!" : "Start Dudniącej Piątki!"); break;
            case 7: actionMsg.push("Grasz jeszcze raz!"); break;
            case 8: actionMsg.push("Fala! Następny: 2 ręce, Ty: popraw."); break;
            case 11: actionMsg.push("Zmiana kierunku!"); break;
            case 12: actionMsg.push("Uderz w Damę!"); break;
            case 13: actionMsg.push("Poprzedni gracz (w kolejności) mówi: BONG!"); break;
        }
        
        updateActionText(actionMsg.join(" | "));
    } else {
        updateActionText("");
    }

    // Logika zmiany stanu gry (musi działać w obu trybach)
    // Działa również dla pierwszej karty (np. As, 7, 8, Walet)
    let nextPlayerOffset = gameState.direction;

    switch (cardValue) {
        case 4: // Cicha Czwórka
            gameState.silentMode = !gameState.silentMode; // Przełączanie trybu
            break;
        case 5: // Dudniąca Piątka
            gameState.thumpingMode = !gameState.thumpingMode;
            break;
        case 7: // Szczęśliwa Siódemka
            nextPlayerOffset = 0;
            break;
        case 8: // Falista Ósemka - pomija następnego gracza (bo on robi falę)
            nextPlayerOffset = gameState.direction * 2;
            break;
        case 11: // Walet
            gameState.direction *= -1;
            nextPlayerOffset = gameState.direction; // Aktualizacja offsetu po zmianie
            break;
    }

    // Reset Cichej Czwórki po zakończeniu cyklu (13 kart) - zgodnie z zasadami
    if (moduloVal === 13) {
        gameState.silentMode = false;
    }

    // Następny gracz
    const pCount = gameState.players.length;
    gameState.currentPlayer = (gameState.currentPlayer + nextPlayerOffset + pCount) % pCount;

    renderBoard();
}

function getCardValue(val) {
    if (val === 'A') return 1;
    if (val === 'J') return 11;
    if (val === 'Q') return 12;
    if (val === 'K') return 13;
    return parseInt(val);
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

function setupWarUI() {
    const container = document.getElementById('penalty-buttons');
    container.innerHTML = '<p style="margin: 5px 0;">Wybierz graczy do wojny:</p>';
    
    const checkboxContainer = document.createElement('div');
    gameState.players.forEach(p => {
        const label = document.createElement('label');
        label.style.display = 'inline-block';
        label.style.margin = '5px 10px';
        label.style.cursor = 'pointer';
        label.innerHTML = `
            <input type="checkbox" value="${p.id}" class="war-checkbox"> ${p.name}
        `;
        checkboxContainer.appendChild(label);
    });
    container.appendChild(checkboxContainer);

    const confirmBtn = document.createElement('button');
    confirmBtn.innerText = "Walcz!";
    confirmBtn.onclick = () => {
        const checkboxes = document.querySelectorAll('.war-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
        if (selectedIds.length < 2) {
            showInfoModal("Błąd", "Wybierz przynajmniej 2 graczy.");
            return;
        }
        resolveWar(selectedIds);
    };
    confirmBtn.style.margin = "5px";
    container.appendChild(confirmBtn);

    const backBtn = document.createElement('button');
    backBtn.innerText = "Wróć";
    backBtn.onclick = showPenaltyControls;
    backBtn.style.margin = "5px";
    backBtn.style.backgroundColor = "#555";
    container.appendChild(backBtn);
}

function resolveWar(playerIds) {
    let warLog = "Wynik Wojny:\n";
    let cardsPlayed = [];
    
    // Pobranie kart od graczy
    playerIds.forEach(id => {
        const player = gameState.players[id];
        if (player.cards.length > 0) {
            const card = player.cards.pop();
            gameState.centerPile.push(card); // Karta trafia na stos (przegrany bierze wszystko)
            const val = getCardValue(card.val);
            cardsPlayed.push({ id, val, cardStr: `${card.val}${card.suit}` });
            warLog += `${player.name}: ${card.val}${card.suit}\n`;
        } else {
            cardsPlayed.push({ id, val: 0, cardStr: "(Brak kart)" });
            warLog += `${player.name}: Brak kart\n`;
        }
    });

    renderBoard(); // Aktualizacja liczby kart
    

    // Szukanie przegranego (najniższa karta)
    const minVal = Math.min(...cardsPlayed.map(c => c.val));
    const losers = cardsPlayed.filter(c => c.val === minVal);

    if (losers.length === 1) {
        // Jeden przegrany
        showInfoModal("Wynik Wojny", warLog, () => takePile(losers[0].id));
    } else {
        // Remis wśród przegrywających - dogrywka
        if (minVal === 0) {
             showInfoModal("Wynik Wojny", warLog + "\n(Brak kart u przegranych)", () => takePile(losers[0].id));
             return;
        }
        const loserIds = losers.map(l => l.id);
        showInfoModal("Wynik Wojny", warLog + `\nRemis między: ${loserIds.map(id => gameState.players[id].name).join(', ')}. Dogrywka!`, () => {
            resolveWar(loserIds);
        });
    }
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

function takePile(playerIdx) {
    const player = gameState.players[playerIdx];
    // Dodaj karty ze stosu na spód talii gracza
    // (unshift dodaje na początek tablicy, co symuluje spód talii w tym modelu, 
    // zakładając że pop() bierze z góry)
    // Ale w playCard robimy push/pop. pop() to góra. unshift() to dół.
    
    // Tasowanie stosu przed oddaniem? Zasady mówią "dokłada je na dół". 
    // Zwykle w takich grach kolejność karnych kart nie ma znaczenia, ale wrzućmy je.
    while (gameState.centerPile.length > 0) {
        player.cards.unshift(gameState.centerPile.pop());
    }

    // Reset stanów rundy
    gameState.centerPile = [];
    gameState.silentMode = false;
    gameState.thumpingMode = false;
    gameState.slapActive = false;
    
    // Przegrany zaczyna
    gameState.currentPlayer = playerIdx;

    document.getElementById('last-card-container').innerHTML = '<span style="color: #444;">STOS</span>';
    document.getElementById('slap-alert').style.display = 'none';
    document.getElementById('penalty-area').style.display = 'none';
    updateActionText("Nowa runda");
    renderBoard();

    showInfoModal("Koniec rundy", `${player.name} zbiera karty i rozpoczyna nową rundę!`);
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

function resetGame() {
    document.getElementById('game-setup').style.display = 'block';
    document.getElementById('game-board').style.display = 'none';
    document.getElementById('last-card-container').innerHTML = '<span style="color: #444;">STOS</span>';
}

// --- LOGIKA USTAWIANIA STOŁU ---

function enterLayoutMode() {
    const pCount = parseInt(document.getElementById('players-count').value) || 3;
    
    // Tymczasowi gracze do wizualizacji
    gameState.players = Array.from({ length: pCount }, (_, i) => ({
        id: i,
        name: `Gracz ${i+1}`,
        cards: Array(5).fill(0) // Atrapa kart
    }));
    
    document.getElementById('game-setup').style.display = 'none';
    const board = document.getElementById('game-board');
    board.style.display = 'flex'; // Tymczasowo, zaraz nadpisze to klasa custom-layout
    board.classList.add('custom-layout');
    board.classList.add('layout-mode');
    
    document.getElementById('layout-controls').style.display = 'flex';
    
    // Ukryj elementy niepotrzebne przy ustawianiu
    document.getElementById('action-area').style.visibility = 'hidden';
    document.getElementById('current-info').style.visibility = 'hidden';
    document.getElementById('penalty-area').style.display = 'none';

    renderBoard();
    initializeLayoutPositions();
    enableDraggables();

    // Zablokuj przyciski w kontenerach na stole
    document.querySelectorAll('#btn-end-round-container button, #btn-reset-container button').forEach(btn => {
        btn.disabled = true;
        btn.style.pointerEvents = 'none'; // Umożliwia chwytanie kontenera przez przycisk
    });
}

function saveLayout() {
    gameState.savedLayout = {};
    const elements = document.querySelectorAll('.custom-layout .player-deck, #table-center, #btn-end-round-container, #btn-reset-container');
    
    elements.forEach(el => {
        gameState.savedLayout[el.id] = {
            left: el.style.left,
            top: el.style.top
        };
    });

    cancelLayout(); // Wychodzimy z trybu, ale layout zostaje w pamięci
}

function cancelLayout() {
    document.getElementById('game-setup').style.display = 'block';
    const board = document.getElementById('game-board');
    board.style.display = 'none';
    board.classList.remove('custom-layout');
    board.classList.remove('layout-mode');
    document.getElementById('layout-controls').style.display = 'none';
    
    // Przywróć widoczność
    document.getElementById('action-area').style.visibility = 'visible';
    document.getElementById('current-info').style.visibility = 'visible';

    // Odblokuj przyciski
    document.querySelectorAll('#btn-end-round-container button, #btn-reset-container button').forEach(btn => {
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
    });
}

function initializeLayoutPositions() {
    const board = document.getElementById('game-board');
    const width = board.offsetWidth;
    const height = board.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    const setPos = (id, x, y) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.left = x + 'px';
            el.style.top = y + 'px';
        }
    };

    if (gameState.savedLayout) {
        for (const [id, pos] of Object.entries(gameState.savedLayout)) {
            const el = document.getElementById(id);
            if (el) {
                el.style.left = pos.left;
                el.style.top = pos.top;
            }
        }
        return;
    }

    // Domyślny układ (okrąg)
    setPos('table-center', centerX - 80, centerY - 110); // 160x220 center
    setPos('btn-end-round-container', centerX - 100, centerY + 150);
    setPos('btn-reset-container', centerX - 80, centerY + 200);

    const players = gameState.players;
    const radius = Math.min(width, height) / 2 - 100;
    players.forEach((p, i) => {
        const angle = (i / players.length) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - 50; // 100px width
        const y = centerY + radius * Math.sin(angle) - 70; // 140px height
        setPos(`player-deck-${i}`, x, y);
    });
}

function enableDraggables() {
    const elements = document.querySelectorAll('.custom-layout .player-deck, #table-center, #btn-end-round-container, #btn-reset-container');
    elements.forEach(el => {
        el.classList.add('draggable');
        dragElement(el);
    });
}

function dragElement(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        elmnt.style.zIndex = 1000; // Na wierzch podczas przeciągania
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        elmnt.style.zIndex = ''; // Reset z-index
    }
}

function applySavedLayout() {
    const board = document.getElementById('game-board');
    board.classList.add('custom-layout');
    
    if (gameState.savedLayout) {
        for (const [id, pos] of Object.entries(gameState.savedLayout)) {
            const el = document.getElementById(id);
            if (el) {
                el.style.left = pos.left;
                el.style.top = pos.top;
            }
        }
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
}