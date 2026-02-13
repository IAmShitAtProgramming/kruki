// Inicjalizacja pól nazw przy starcie
window.onload = function() {
    updateNameInputs();
    
    // Obsługa zmiany liczby graczy
    const pCountInput = document.getElementById('players-count');
    if (pCountInput) {
        pCountInput.addEventListener('input', updateNameInputs);
        pCountInput.addEventListener('change', updateNameInputs);
    }

    // Awaryjne przypisanie przycisków (gdyby onclick w HTML nie zadziałał)
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        const txt = btn.innerText.toLowerCase().trim();
        
        if (txt.includes('rozpocznij')) btn.onclick = window.startGame;
        if (txt.includes('ustaw stół')) btn.onclick = window.enterLayoutMode;
        if (txt.includes('resetuj')) btn.onclick = window.resetGame;
        
        // Obsługa przycisków Online
        if (txt.includes('załóż grę')) btn.onclick = () => window.setupOnline('host');
        if (txt.includes('dołącz (join)')) btn.onclick = () => window.setupOnline('join');
        if (txt === 'połącz') btn.onclick = window.connectToHost;
        
        // Inne przyciski
        if (txt.includes('zakończ rundę')) btn.onclick = window.showPenaltyControls;
        if (txt.includes('zapisz układ')) btn.onclick = window.saveLayout;
        if (txt === 'anuluj' && btn.parentElement.id === 'layout-controls') btn.onclick = window.cancelLayout;
    });
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