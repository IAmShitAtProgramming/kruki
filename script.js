// Inicjalizacja pól nazw przy starcie
window.onload = function() {
    initPlayerList();
    setGameMode('local'); // Domyślny tryb

    // Ładowanie zapisanego motywu
    const savedTheme = localStorage.getItem('kruki-theme');
    if (savedTheme) {
        // Upewnij się, że element istnieje przed nałożeniem klasy (choć onload gwarantuje DOM)
        setTimeout(() => {
            changeTheme(savedTheme);
        }, 0);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = savedTheme;
    }

    // Awaryjne przypisanie przycisków (gdyby onclick w HTML nie zadziałał)
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        const txt = btn.innerText.toLowerCase().trim();
        
        if (txt.includes('rozpocznij')) btn.onclick = window.startGame;
        if (txt.includes('ustaw stół')) btn.onclick = window.enterLayoutMode;
        if (txt.includes('zakończ grę')) btn.onclick = window.resetGame;
        
        // Obsługa przycisków Online
        if (txt.includes('załóż grę')) btn.onclick = () => window.setupOnline('host');
        if (txt.includes('dołącz (join)')) btn.onclick = () => window.setupOnline('join');
        if (txt === 'połącz') btn.onclick = window.connectToHost;
        if (txt.includes('jedno urządzenie')) btn.onclick = () => window.setGameMode('local');
        if (txt.includes('online') && txt.includes('wiele')) btn.onclick = () => window.setGameMode('online');
        
        // Dodaj gracza
        if (txt.includes('dodaj gracza')) btn.onclick = () => window.addPlayer();
        
        // Inne przyciski
        if (txt.includes('zakończ rundę')) btn.onclick = window.showPenaltyControls;
        if (txt.includes('zapisz układ')) btn.onclick = window.saveLayout;
        if (txt === 'anuluj' && btn.parentElement.id === 'layout-controls') btn.onclick = window.cancelLayout;
    });

    // Zabezpieczenie przed przypadkowym zamknięciem/odświeżeniem
    window.addEventListener('beforeunload', function (e) {
        // Jeśli gra trwa (plansza jest widoczna), wyświetl ostrzeżenie
        if (document.getElementById('game-board').style.display !== 'none') {
            e.preventDefault();
            e.returnValue = '';
        }
    });
};

function initPlayerList() {
    const container = document.getElementById('player-names-container');
    container.innerHTML = '';
    // Domyślnie 3 graczy
    addPlayer("Gracz 1");
    addPlayer("Gracz 2");
    addPlayer("Gracz 3");
}

function setGameMode(mode) {
    const localBtn = document.getElementById('btn-mode-local');
    const onlineBtn = document.getElementById('btn-mode-online');
    
    const gameConfig = document.getElementById('game-config');
    const startButtons = document.getElementById('start-buttons');
    const onlineStart = document.getElementById('online-start');
    const onlineUI = document.getElementById('online-ui');

    if (mode === 'local') {
        localBtn.classList.add('active');
        onlineBtn.classList.remove('active');
        
        gameConfig.style.display = 'block';
        startButtons.style.display = 'block';
        onlineStart.style.display = 'none';
        onlineUI.style.display = 'none';
    } else {
        localBtn.classList.remove('active');
        onlineBtn.classList.add('active');
        
        gameConfig.style.display = 'none'; // Ukryj, dopóki nie wybierze Host/Join
        startButtons.style.display = 'none';
        onlineStart.style.display = 'block';
        onlineUI.style.display = 'none';
    }
}

function addPlayer(name = "", isLocked = false) {
    const container = document.getElementById('player-names-container');
    const count = container.children.length + 1;
    const playerName = name || `Gracz ${count}`;
    
    const div = document.createElement('div');
    div.className = 'player-row';
    
    const readonlyAttr = isLocked ? 'readonly style="background-color: #3a3a3a; color: #aaa; cursor: not-allowed;"' : '';

    div.innerHTML = `
        <input type="text" class="name-input" value="${playerName}" placeholder="Imię gracza" ${readonlyAttr}>
        <button class="btn-secondary btn-icon" onclick="movePlayer(this, -1)" title="W górę">↑</button>
        <button class="btn-secondary btn-icon" onclick="movePlayer(this, 1)" title="W dół">↓</button>
        <button class="btn-secondary btn-icon" onclick="removePlayer(this)" title="Usuń" style="background: #800;">✕</button>
    `;
    container.appendChild(div);
}

function removePlayer(btn) {
    const container = document.getElementById('player-names-container');
    if (container.children.length <= 2) {
        alert("Musi być co najmniej 2 graczy!");
        return;
    }
    btn.parentElement.remove();
}

function movePlayer(btn, direction) {
    const row = btn.parentElement;
    const container = row.parentElement;
    const siblings = Array.from(container.children);
    const index = siblings.indexOf(row);

    if (direction === -1 && index > 0) {
        container.insertBefore(row, siblings[index - 1]);
    } else if (direction === 1 && index < siblings.length - 1) {
        container.insertBefore(row, siblings[index + 1].nextSibling);
    }
}

// Eksport funkcji dla HTML onclick
window.addPlayer = addPlayer;
window.removePlayer = removePlayer;
window.movePlayer = movePlayer;
window.setGameMode = setGameMode;