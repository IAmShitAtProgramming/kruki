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
    
    elmnt.onmousedown = dragStart;
    elmnt.ontouchstart = dragStart; // Obsługa dotyku

    function dragStart(e) {
        // Pobierz koordynaty (mysz lub dotyk)
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Zapobiegaj przewijaniu strony podczas przesuwania elementu na mobile
        if (e.type === 'touchstart') {
            // Opcjonalnie e.preventDefault(), ale może blokować kliknięcia. 
            // W trybie layoutu chcemy przesuwać, więc zazwyczaj warto zablokować scroll.
        } else {
            e.preventDefault();
        }

        pos3 = clientX;
        pos4 = clientY;
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        
        // Listenery dla dotyku na dokumencie
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementDrag;
        
        elmnt.style.zIndex = 1000; // Na wierzch podczas przeciągania
    }

    function elementDrag(e) {
        // Zapobiegaj przewijaniu strony (kluczowe dla mobile)
        if (e.cancelable) e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;
        
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
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

// Eksport funkcji do zakresu globalnego
window.enterLayoutMode = enterLayoutMode;
window.saveLayout = saveLayout;
window.cancelLayout = cancelLayout;