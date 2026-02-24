// Inicjalizacja pól nazw przy starcie
window.onload = function() {
    // Wstrzyknięcie stylów dla list rozwijanych (select), aby pasowały do ciemnego motywu
    const style = document.createElement('style');
    style.textContent = `
        select {
            background-color: #2d3339;
            color: #fff;
            border: 1px solid #555;
            padding: 5px;
            border-radius: 4px;
        }
        option { background-color: #2d3339; color: #fff; }
    `;
    document.head.appendChild(style);

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

    setupAuthorsAndFooter();
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
    updatePlayerArrows();
}

function removePlayer(btn) {
    const container = document.getElementById('player-names-container');
    if (container.children.length <= 2) {
        alert("Musi być co najmniej 2 graczy!");
        return;
    }
    btn.parentElement.remove();
    updatePlayerArrows();
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
    updatePlayerArrows();
}

function updatePlayerArrows() {
    const rows = document.querySelectorAll('#player-names-container .player-row');
    rows.forEach((row, index) => {
        const upBtn = row.querySelector('button[title="W górę"]');
        const downBtn = row.querySelector('button[title="W dół"]');
        
        if (upBtn) {
            upBtn.style.visibility = 'visible';
            const isFirst = index === 0;
            upBtn.disabled = isFirst;
            upBtn.style.opacity = isFirst ? '0.3' : '1';
            upBtn.style.cursor = isFirst ? 'default' : 'pointer';
        }

        if (downBtn) {
            downBtn.style.visibility = 'visible';
            const isLast = index === rows.length - 1;
            downBtn.disabled = isLast;
            downBtn.style.opacity = isLast ? '0.3' : '1';
            downBtn.style.cursor = isLast ? 'default' : 'pointer';
        }
    });
}

// Eksport funkcji dla HTML onclick
window.addPlayer = addPlayer;
window.removePlayer = removePlayer;
window.movePlayer = movePlayer;
window.setGameMode = setGameMode;

function setupAuthorsAndFooter() {
    const footer = document.querySelector('footer');
    const header = document.querySelector('header');
    const h1 = header ? header.querySelector('h1') : null;

    if (footer && h1) {
        const authorsText = footer.innerText.trim();
        if (authorsText) {
            const subtitle = document.createElement('div');
            subtitle.className = 'game-subtitle';
            subtitle.innerText = authorsText;
            h1.parentNode.insertBefore(subtitle, h1.nextSibling);
        }
        
        footer.innerHTML = `<a href="https://github.com/IAmShitAtProgramming/kruki" target="_blank" class="github-link">
            GitHub Repo
        </a>`;
    }
}