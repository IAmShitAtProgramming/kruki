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