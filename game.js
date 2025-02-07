let players = [];
let currentTurn = 0;
let lives = {};
let usedWords = new Set();
let wordPairs = ["sh", "oc", "so", "tr", "ex", "un", "al", "in"];
let currentPair;
let timer;

function startGame() {
    let playerCount = document.getElementById("player-count").value;
    players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
    lives = Object.fromEntries(players.map(player => [player, 3]));
    document.getElementById("start-container").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    nextTurn();
}

function nextTurn() {
    if (players.length === 0) {
        alert("Game Over!");
        return;
    }
    
    currentPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    document.getElementById("word-prompt").textContent = `Find a word containing: ${currentPair}`;
    document.getElementById("status").textContent = `${players[currentTurn]}'s turn!`;
    resetTimer();
}

function resetTimer() {
    clearTimeout(timer);
    let timeLimit = Math.floor(Math.random() * 5) + 5;
    timer = setTimeout(() => loseLife(players[currentTurn]), timeLimit * 1000);
}

function submitWord() {
    let input = document.getElementById("word-input").value.toLowerCase();
    if (!input.includes(currentPair) || usedWords.has(input)) {
        alert("Invalid word or word already used!");
        return;
    }
    usedWords.add(input);
    nextPlayer();
}

function nextPlayer() {
    currentTurn = (currentTurn + 1) % players.length;
    nextTurn();
}

function loseLife(player) {
    lives[player]--;
    if (lives[player] <= 0) {
        players = players.filter(p => p !== player);
    }
    nextPlayer();
}
