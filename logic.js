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

function takePile(playerIdx) {
    const player = gameState.players[playerIdx];
    // Dodaj karty ze stosu na spód talii gracza
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

function resetGame() {
    document.getElementById('game-setup').style.display = 'block';
    document.getElementById('game-board').style.display = 'none';
    document.getElementById('last-card-container').innerHTML = '<span style="color: #444;">STOS</span>';
}