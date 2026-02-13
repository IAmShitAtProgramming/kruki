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