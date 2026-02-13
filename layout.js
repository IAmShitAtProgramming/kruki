// --- LAYOUT & DRAG-DROP FUNCTIONS ---
let selectedElement = null;

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
    
    // Ukryj elementy niepotrzebne przy ustawianiu
    document.getElementById('current-info').style.visibility = 'hidden';
    document.getElementById('penalty-area').style.display = 'none';

    // Pokaż obszar komunikatów do ustawienia
    const actionArea = document.getElementById('action-area');
    actionArea.style.visibility = 'visible';
    actionArea.style.border = '2px dashed #7a8c99';
    actionArea.style.backgroundColor = 'rgba(0,0,0,0.5)';
    actionArea.style.padding = '10px';
    actionArea.style.borderRadius = '8px';
    document.getElementById('action-text').innerText = "OBSZAR KOMUNIKATÓW";

    renderBoard();
    initializeLayoutPositions();
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
        }
    };

    scaleSlider.oninput = function() {
        if (selectedElement) {
            selectedElement.dataset.scale = this.value;
            updateElementTransform(selectedElement);
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
    
    elements.forEach(el => {
        gameState.savedLayout[el.id] = {
            left: el.style.left,
            top: el.style.top,
            rotation: el.dataset.rotation || 0,
            scale: el.dataset.scale || 1
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
    const centerX = width / 2;
    const centerY = height / 2;

    const setPos = (id, x, y) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.left = x + 'px';
            el.style.top = y + 'px';
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

    // Domyślny układ (okrąg)
    setPos('table-center', centerX - 80, centerY - 110); // 160x220 center
    setPos('action-area', centerX - 150, centerY + 120);
    setPos('btn-end-round-container', centerX - 100, centerY + 180);
    setPos('btn-reset-container', centerX - 80, centerY + 230);

    const players = gameState.players;
    const radius = Math.min(width, height) / 2 - 100;
    players.forEach((p, i) => {
        const angle = -(i / players.length) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - 50; // 100px width
        const y = centerY + radius * Math.sin(angle) - 70; // 140px height
        setPos(`player-deck-${i}`, x, y);
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
                el.dataset.rotation = pos.rotation || 0;
                el.dataset.scale = pos.scale || 1;
                updateElementTransform(el);
            }
        }
    }
}

// Eksport funkcji do zakresu globalnego
window.enterLayoutMode = enterLayoutMode;
window.saveLayout = saveLayout;
window.cancelLayout = cancelLayout;
window.applySavedLayout = applySavedLayout;
window.initializeLayoutPositions = initializeLayoutPositions;
window.enableDraggables = enableDraggables;