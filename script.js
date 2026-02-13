// Inicjalizacja pól nazw przy starcie
window.onload = function() {
    updateNameInputs();
    
    // Obsługa zmiany liczby graczy (naprawa braku aktualizacji pól)
    const pCountInput = document.getElementById('players-count');
    if (pCountInput) {
        pCountInput.addEventListener('input', updateNameInputs);
        pCountInput.addEventListener('change', updateNameInputs);
    }

    // Awaryjne przypisanie przycisków, jeśli HTML nie ma onclick lub funkcje nie są widoczne
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        const txt = btn.innerText.toLowerCase();
        if (txt.includes('rozpocznij') && typeof window.startGame === 'function') btn.onclick = window.startGame;
        if (txt.includes('ustaw stół') && typeof window.enterLayoutMode === 'function') btn.onclick = window.enterLayoutMode;
        if (txt.includes('resetuj') && typeof window.resetGame === 'function') btn.onclick = window.resetGame;
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