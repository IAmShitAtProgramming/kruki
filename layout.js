// --- LAYOUT & DRAG-DROP FUNCTIONS ---
let selectedElement = null;

function enterLayoutMode() {
    const nameInputs = document.querySelectorAll('#player-names-container .name-input');
    const pCount = nameInputs.length || 3;
    
    // Oblicz szacowaną liczbę kart na gracza
    const decksInput = document.getElementById('decks-count');
    const dCount = decksInput ? (parseInt(decksInput.value) || 1) : 1;
    const cardsPerPlayer = Math.floor((dCount * 52) / pCount);

    // Tymczasowi gracze do wizualizacji
    gameState.players = Array.from({ length: pCount }, (_, i) => {
        const inputName = nameInputs[i] ? nameInputs[i].value : '';
        return {
            id: i,
            name: inputName || `Gracz ${i+1}`,
            cards: Array(cardsPerPlayer).fill(0) // Atrapa kart
        };
    });
    
    // Nie ukrywamy game-setup, bo layout ma być modalem
    const board = document.getElementById('game-board');
    board.style.display = 'flex'; // Tymczasowo, zaraz nadpisze to klasa custom-layout
    board.classList.remove('custom-layout');
    board.classList.remove('layout-mode');
    
    document.getElementById('layout-controls').style.display = 'flex';
    
    // Dodaj panel sterowania transformacją (jeśli nie istnieje)
    let transformControls = document.getElementById('transform-controls');
    if (!transformControls) {
        transformControls = document.createElement('div');
        transformControls.id = 'transform-controls';
        transformControls.style.display = 'flex';
        transformControls.style.gap = '15px';
        transformControls.style.alignItems = 'center';
        transformControls.style.background = '#2d3339';
        transformControls.style.padding = '10px';
        transformControls.style.borderRadius = '8px';
        transformControls.innerHTML = `
            <button id="btn-rotate" style="padding: 5px 10px; font-size: 0.9rem; margin-right: 10px;">↻ 90°</button>
            <label>Skala: <input type="range" id="scale-slider" min="0.5" max="2.0" step="0.1" value="1.0"></label>
        `;
        document.getElementById('layout-controls').prepend(transformControls);
        setupTransformListeners();
    }
    
    renderBoard();

    // Wymuś przeliczenie układu (reflow), aby getBoundingClientRect zwrócił poprawne wartości
    void board.offsetHeight;

    initializeLayoutPositions();

    board.classList.add('custom-layout');
    board.classList.add('layout-mode');

    // Ukryj elementy niepotrzebne przy ustawianiu
    document.getElementById('current-info').style.visibility = 'hidden';
    document.getElementById('penalty-area').style.display = 'none';

    // Pokaż obszar wskazówek (tylko w trybie nauki)
    const actionArea = document.getElementById('action-area');
    const modeSelect = document.getElementById('game-mode');
    const isLearning = modeSelect ? modeSelect.value === 'learning' : true;

    if (isLearning) {
        actionArea.style.visibility = 'visible';
        actionArea.style.border = '2px dashed #7a8c99';
        actionArea.style.backgroundColor = 'rgba(0,0,0,0.5)';
        actionArea.style.padding = '10px';
        actionArea.style.borderRadius = '8px';
        document.getElementById('action-text').innerText = "WSKAZÓWKI";
    } else {
        actionArea.style.visibility = 'hidden';
    }

    enableDraggables();

    // Zablokuj przyciski w kontenerach na stole
    document.querySelectorAll('#btn-end-round-container button, #btn-reset-container button').forEach(btn => {
        btn.disabled = true;
        btn.style.pointerEvents = 'none'; // Umożliwia chwytanie kontenera przez przycisk
    });
}

function setupTransformListeners() {
    const rotBtn = document.getElementById('btn-rotate');
    const scaleSlider = document.getElementById('scale-slider');

    rotBtn.onclick = function() {
        if (selectedElement) {
            const currentRot = parseInt(selectedElement.dataset.rotation || 0);
            selectedElement.dataset.rotation = (currentRot + 90) % 360;
            updateElementTransform(selectedElement);
            constrainElement(selectedElement);
        }
    };

    scaleSlider.oninput = function() {
        if (selectedElement) {
            selectedElement.dataset.scale = this.value;
            updateElementTransform(selectedElement);
            constrainElement(selectedElement);
        }
    };
}

function updateElementTransform(el) {
    const rot = el.dataset.rotation || 0;
    const scale = el.dataset.scale || 1;
    el.style.transform = `rotate(${rot}deg) scale(${scale})`;
}

function saveLayout() {
    gameState.savedLayout = {};
    const elements = document.querySelectorAll('.custom-layout .player-deck, #table-center, #btn-end-round-container, #btn-reset-container, #action-area');
    const board = document.getElementById('game-board');
    const w = board.offsetWidth;
    const h = board.offsetHeight;
    
    elements.forEach(el => {
        // Konwersja na procenty dla responsywności
        gameState.savedLayout[el.id] = {
            left: el.style.left.includes('%') ? el.style.left : (parseFloat(el.style.left) / w * 100) + '%',
            top: el.style.top.includes('%') ? el.style.top : (parseFloat(el.style.top) / h * 100) + '%',
            rotation: el.dataset.rotation || 0,
            scale: el.dataset.scale || 1
        };
    });

    cancelLayout(); // Wychodzimy z trybu, ale layout zostaje w pamięci
}

function cancelLayout() {
    const board = document.getElementById('game-board');
    board.style.display = 'none';
    board.classList.remove('custom-layout');
    board.classList.remove('layout-mode');
    document.getElementById('layout-controls').style.display = 'none';
    
    // Przywróć widoczność
    document.getElementById('action-area').style.visibility = 'visible';
    if (gameState.mode === 'learning') {
        document.getElementById('current-info').style.visibility = 'visible';
    }

    // Reset stylów obszaru komunikatów
    const actionArea = document.getElementById('action-area');
    actionArea.style.border = '';
    actionArea.style.backgroundColor = '';
    actionArea.style.padding = '';
    document.getElementById('action-text').innerText = '';

    // Usuń zaznaczenie
    if (selectedElement) {
        selectedElement.classList.remove('selected-element');
        selectedElement = null;
    }

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

    const setPos = (id, x, y) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.left = (x / width * 100) + '%';
            el.style.top = (y / height * 100) + '%';
            // Reset transformacji dla domyślnego układu (jeśli nie ma zapisu)
            if (!gameState.savedLayout) resetElementTransform(el);
        }
    };

    if (gameState.savedLayout) {
        for (const [id, pos] of Object.entries(gameState.savedLayout)) {
            const el = document.getElementById(id);
            if (el) {
                el.style.left = pos.left;
                el.style.top = pos.top;
                el.dataset.rotation = pos.rotation || 0;
                el.dataset.scale = pos.scale || 1;
                updateElementTransform(el);
            }
        }
        return;
    }

    // Domyślny układ (taki jak w grze) - pobieramy aktualne pozycje
    const boardRect = board.getBoundingClientRect();
    const style = window.getComputedStyle(board);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;

    const ids = ['table-center', 'action-area', 'btn-end-round-container', 'btn-reset-container'];
    gameState.players.forEach((_, i) => ids.push(`player-deck-${i}`));

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const rect = el.getBoundingClientRect();
            const x = rect.left - boardRect.left - borderLeft;
            const y = rect.top - boardRect.top - borderTop;
            setPos(id, x, y);
        }
    });
}

function resetElementTransform(el) {
    el.dataset.rotation = 0;
    el.dataset.scale = 1;
    el.style.transform = 'rotate(0deg) scale(1)';
}

function enableDraggables() {
    const elements = document.querySelectorAll('.custom-layout .player-deck, #table-center, #btn-end-round-container, #btn-reset-container, #action-area');
    elements.forEach(el => {
        el.classList.add('draggable');
        dragElement(el);
    });
}

function selectElement(el) {
    if (selectedElement) {
        selectedElement.classList.remove('selected-element');
    }
    selectedElement = el;
    selectedElement.classList.add('selected-element');

    // Aktualizuj suwaki
    const scale = selectedElement.dataset.scale || 1;
    
    const scaleSlider = document.getElementById('scale-slider');
    if (scaleSlider) scaleSlider.value = scale;
}

function dragElement(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    elmnt.onmousedown = dragStart;
    elmnt.ontouchstart = dragStart; // Obsługa dotyku

    function dragStart(e) {
        // Blokada przesuwania, jeśli nie jesteśmy w trybie edycji
        if (!document.getElementById('game-board').classList.contains('layout-mode')) return;

        // Zaznacz element przy kliknięciu
        selectElement(elmnt);

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

        const deltaX = clientX - pos3;
        const deltaY = clientY - pos4;
        pos3 = clientX;
        pos4 = clientY;
        
        const parent = elmnt.offsetParent || document.body;
        
        const deltaXPerc = (deltaX / parent.offsetWidth) * 100;
        const deltaYPerc = (deltaY / parent.offsetHeight) * 100;

        elmnt.style.left = ((parseFloat(elmnt.style.left) || 0) + deltaXPerc) + "%";
        elmnt.style.top = ((parseFloat(elmnt.style.top) || 0) + deltaYPerc) + "%";
        
        constrainElement(elmnt);
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
                el.dataset.rotation = pos.rotation || 0;
                el.dataset.scale = pos.scale || 1;
                updateElementTransform(el);
            }
        }
    }
}

function constrainElement(el) {
    const board = document.getElementById('game-board');
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    
    // Pobierz aktualne pozycje w %
    let leftPerc = parseFloat(el.style.left) || 0;
    let topPerc = parseFloat(el.style.top) || 0;
    
    // Konwersja wymiarów elementu na % planszy
    const elWidthPerc = (elRect.width / boardRect.width) * 100;
    const elHeightPerc = (elRect.height / boardRect.height) * 100;
    
    // Sprawdź poziom
    if (leftPerc < 0) leftPerc = 0;
    if (leftPerc + elWidthPerc > 100) leftPerc = 100 - elWidthPerc;
    
    // Sprawdź pion
    if (topPerc < 0) topPerc = 0;
    if (topPerc + elHeightPerc > 100) topPerc = 100 - elHeightPerc;
    
    el.style.left = leftPerc + '%';
    el.style.top = topPerc + '%';
}

// Eksport funkcji do zakresu globalnego
window.enterLayoutMode = enterLayoutMode;
window.saveLayout = saveLayout;
window.cancelLayout = cancelLayout;
window.applySavedLayout = applySavedLayout;
window.initializeLayoutPositions = initializeLayoutPositions;
window.enableDraggables = enableDraggables;